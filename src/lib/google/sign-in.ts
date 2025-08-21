import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { openUrl } from "@tauri-apps/plugin-opener";
import { atom } from "jotai";
import { DateTime } from "luxon";
import { z } from "zod";

import { Base64 } from "~/lib/base64";
import { atomStore } from "~/lib/jotai";

import { googleClientId, googleClientSecret } from "./env";
import { GoogleAccountNotLinkedError } from "./errors";
import { fetchUserInfo, persistUserInfo } from "./fetch-user-info";
import {
  getAccessToken,
  getExpiryTimestamp,
  getRefreshToken,
  setAccessToken,
  setExpiryTimestamp,
  setRefreshToken,
} from "./keyring";
import { logger } from "./logger";

export const atom__isSigningIn = atom(false);

export async function signIn({
  signal,
  router,
}: {
  signal?: AbortSignal;
  router: { invalidate: () => Promise<void> };
}) {
  if (atomStore.get(atom__isSigningIn)) {
    return;
  }

  atomStore.set(atom__isSigningIn, true);
  const abort = new AbortController();
  signal?.addEventListener("abort", () => {
    abort.abort(signal.reason);
  });

  setTimeout(() => abort.abort(), 300000);

  try {
    await signIn__internal({ signal: abort.signal });
  } finally {
    atomStore.set(atom__isSigningIn, false);
    await router.invalidate();
  }
}

async function signIn__internal({ signal }: { signal: AbortSignal }) {
  const window = getCurrentWebviewWindow();
  const unlisteners: UnlistenFn[] = [];
  try {
    const callbackUrl = z.url().parse(await invoke("start_auth_server"));
    logger.info({ callbackUrl }, "started local web server to handle Google OAuth callback");
    signal.throwIfAborted();

    const codeVerifier = crypto.getRandomValues(new Uint8Array(32));
    const codeVerifierString = Base64.encodeURL(btoa(String.fromCharCode(...codeVerifier)));

    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifierString);
    const codeChallenge = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    const codeChallengeString = Base64.encodeURL(btoa(String.fromCharCode(...codeChallenge)));

    const { promise, reject, resolve } = Promise.withResolvers<z.infer<typeof TokensResponse>>();
    unlisteners.push(
      await window.once<z.input<typeof SignInResponse>>("auth-callback", (evt) => {
        logger.debug({ evt }, "auth-callback event received");
        handleSignInResponse({ payload: evt.payload, callbackUrl, codeVerifierString, signal })
          .then(resolve)
          .catch(reject);
      }),
    );

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", googleClientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar.readonly",
      ].join(" "),
    );
    url.searchParams.set("redirect_uri", callbackUrl);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("code_challenge", codeChallengeString);
    url.searchParams.set("code_challenge_method", "S256");

    signal.throwIfAborted();
    logger.trace({ url }, "opening Google OAuth sign-in page");
    await openUrl(url.toString());
    logger.debug({ url }, "opened Google OAuth sign-in page");
    signal.throwIfAborted();

    const tokens = await promise;
    signal.throwIfAborted();
    logger.info({ tokens }, "received tokens from Google OAuth");

    const userInfo = await fetchUserInfo({ accessToken: tokens.access_token });
    signal.throwIfAborted();
    logger.info({ user: userInfo }, "got user info");

    await persistUserInfo(userInfo);
    await setAccessToken({ accessToken: tokens.access_token });
    await setRefreshToken({ refreshToken: tokens.refresh_token });
    await setExpiryTimestamp({ expiryTimestamp: DateTime.utc().plus({ seconds: tokens.expires_in }) });
  } catch (error) {
    logger.error({ error }, "failed to sign-in with Google");
    notifications.show({
      color: "red.5",
      title: "Could not sign in with Google",
      message: error instanceof Error ? error.message : String(error),
    });

    throw error;
  } finally {
    unlisteners.forEach((unlisten) => unlisten());
    await invoke("stop_auth_server").catch(() => {});
  }
}

const SignInResponse = z.object({ code: z.string() }, "invalid payload in auth-callback event");
const TokensResponse = z.object(
  { access_token: z.string(), refresh_token: z.string(), id_token: z.string(), expires_in: z.number() },
  "unexpected tokens response from Google",
);

async function handleSignInResponse({
  payload,
  callbackUrl,
  codeVerifierString,
  signal,
}: {
  payload: z.input<typeof SignInResponse>;
  callbackUrl: string;
  codeVerifierString: string;
  signal: AbortSignal;
}): Promise<z.infer<typeof TokensResponse>> {
  const { code } = SignInResponse.parse(payload);
  logger.debug({ code }, "received auth callback");

  // eslint-disable-next-line no-restricted-globals
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
      code_verifier: codeVerifierString,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`, { cause: new Error(errorText) });
  }

  return TokensResponse.parse(await response.json());
}

async function refreshTokens(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new GoogleAccountNotLinkedError();
  }

  // eslint-disable-next-line no-restricted-globals
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`, { cause: new Error(errorText) });
  }

  const tokens = TokensResponse.partial().parse(await response.json());

  if (tokens.access_token) {
    await setAccessToken({ accessToken: tokens.access_token });
  }

  if (tokens.expires_in) {
    await setExpiryTimestamp({ expiryTimestamp: DateTime.utc().plus({ seconds: tokens.expires_in }) });
  }

  if (tokens.refresh_token) {
    await setRefreshToken({ refreshToken: tokens.refresh_token });
  }
}

export async function getFreshAccessToken(): Promise<string> {
  const expiryTimestamp = (await getExpiryTimestamp())?.toMillis();
  const now = DateTime.utc().toMillis();

  if (!expiryTimestamp || now >= expiryTimestamp) {
    await refreshTokens();
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new GoogleAccountNotLinkedError();
  }

  return accessToken;
}
