import { DateTime } from "luxon";

import { Keyring } from "~/lib/keyring";
import { KV } from "~/lib/kv";

import { GoogleAccountNotLinkedError } from "./errors";

enum KeyringService {
  AccessToken = "Google.access_token",
  RefreshToken = "Google.refresh_token",
  ExpiryTimestamp = "Google.expiry_timestamp",
}

export async function getAccessToken(): Promise<string | undefined> {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    return undefined;
  }

  const result = await Keyring.getSecret(KeyringService.AccessToken, email);
  if (!result) {
    return undefined;
  }

  return new TextDecoder().decode(result);
}

export async function setAccessToken({ accessToken }: { accessToken: string }): Promise<void> {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    throw new GoogleAccountNotLinkedError();
  }

  await Keyring.setSecret(KeyringService.AccessToken, email, new TextEncoder().encode(accessToken));
}

export async function deleteAccessToken(): Promise<void> {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    throw new GoogleAccountNotLinkedError();
  }

  try {
    await Keyring.deleteSecret(KeyringService.AccessToken, email);
  } catch {
    /* nothing */
  }
}

export async function getRefreshToken(): Promise<string | undefined> {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    return undefined;
  }

  const result = await Keyring.getSecret(KeyringService.RefreshToken, email);
  if (!result) {
    return undefined;
  }

  return new TextDecoder().decode(result);
}

export async function setRefreshToken({ refreshToken }: { refreshToken: string }) {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    throw new GoogleAccountNotLinkedError();
  }

  await Keyring.setSecret(KeyringService.RefreshToken, email, new TextEncoder().encode(refreshToken));
}

export async function deleteRefreshToken() {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    throw new GoogleAccountNotLinkedError();
  }

  try {
    await Keyring.deleteSecret(KeyringService.RefreshToken, email);
  } catch {
    /* nothing */
  }
}

export async function getExpiryTimestamp(): Promise<DateTime | undefined> {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    return undefined;
  }

  const result = await Keyring.getSecret(KeyringService.ExpiryTimestamp, email);
  if (!result) {
    return undefined;
  }

  return DateTime.fromISO(new TextDecoder().decode(result), { zone: "utc" });
}

export async function setExpiryTimestamp({ expiryTimestamp }: { expiryTimestamp: DateTime }): Promise<void> {
  if (!expiryTimestamp.isValid) {
    throw new Error("invalid expiry timestamp", { cause: new Error(expiryTimestamp.invalidExplanation!) });
  }

  const email = await KV.get(KV.Name.email);
  if (!email) {
    throw new GoogleAccountNotLinkedError();
  }

  await Keyring.setSecret(
    KeyringService.ExpiryTimestamp,
    email,
    new TextEncoder().encode(expiryTimestamp.toUTC().toISO()!),
  );
}

export async function deleteExpiryTimestamp(): Promise<void> {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    throw new GoogleAccountNotLinkedError();
  }

  try {
    await Keyring.deleteSecret(KeyringService.ExpiryTimestamp, email);
  } catch {
    /* nothing */
  }
}
