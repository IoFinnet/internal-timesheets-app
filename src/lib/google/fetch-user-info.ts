import { z } from "zod";

import { Base64 } from "~/lib/base64";
import { KV } from "~/lib/kv";

import { logger } from "./logger";

const UserInfoResponse = z.object(
  {
    sub: z.string(),
    email: z.string(),
    name: z
      .string()
      .nullish()
      .transform((v) => v ?? undefined),
    given_name: z
      .string()
      .nullish()
      .transform((v) => v ?? undefined),
    family_name: z
      .string()
      .nullish()
      .transform((v) => v ?? undefined),
    picture: z
      .string()
      .nullish()
      .transform((v) => v ?? undefined),
  },
  "unexpected user info response from Google",
);

export async function fetchUserInfo({
  accessToken,
}: {
  accessToken: string;
}): Promise<z.infer<typeof UserInfoResponse>> {
  // eslint-disable-next-line no-restricted-globals
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`, {
      cause: new Error(errorText),
    });
  }

  const rawResponse = await response.json();
  logger.debug({ rawResponse }, "got user info from Google");

  const parsed = UserInfoResponse.parse(rawResponse);
  const picture = parsed.picture
    ? await convertPictureToBase64Url(parsed.picture).catch((error) => {
        logger.error({ error }, "failed to convert picture to base64");
        return undefined;
      })
    : undefined;

  return { ...parsed, picture };
}

async function convertPictureToBase64Url(pictureUrl: string): Promise<string | undefined> {
  if (!pictureUrl) return undefined;

  // eslint-disable-next-line no-restricted-globals
  const response = await fetch(pictureUrl);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch picture: ${response.status} ${errorText}`, {
      cause: new Error(errorText),
    });
  }

  const blob = await response.blob();
  return await Base64.fromBuffer(await blob.arrayBuffer(), blob.type || "image/jpeg");
}

export async function persistUserInfo(userInfo: z.infer<typeof UserInfoResponse>): Promise<void> {
  await Promise.all([
    KV.set(KV.Name.email, userInfo.email),
    KV.set(KV.Name.picture, userInfo.picture),
    KV.set(KV.Name.name, userInfo.name),
    KV.set(KV.Name.givenName, userInfo.given_name),
    KV.set(KV.Name.familyName, userInfo.family_name),
  ]);
}
