import { getIdentifier } from "@tauri-apps/api/app";
// eslint-disable-next-line no-restricted-imports
import * as tauri from "tauri-plugin-keyring-api";

export async function getSecret(key: string, user: string) {
  return tauri.getSecret(await buildKey(key), user);
}

export async function setSecret(key: string, user: string, value: Uint8Array) {
  return tauri.setSecret(await buildKey(key), user, value);
}

export async function deleteSecret(key: string, user: string) {
  return tauri.deleteSecret(await buildKey(key), user);
}

/** @public */
export async function getPassword(key: string, user: string) {
  return tauri.getPassword(await buildKey(key), user);
}

/** @public */
export async function setPassword(key: string, user: string, value: string) {
  return tauri.setPassword(await buildKey(key), user, value);
}

/** @public */
export async function deletePassword(key: string, user: string) {
  return tauri.deletePassword(await buildKey(key), user);
}

async function buildKey(key: string) {
  return [await getPrefix(), key].join(".");
}

async function getPrefix() {
  const identifier = await getIdentifier();
  return `${identifier}`;
}
