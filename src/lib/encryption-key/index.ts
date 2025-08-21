import { atom } from "jotai";
import { useEffect } from "react";

import { atomStore } from "~/lib/jotai";
import { Keyring } from "~/lib/keyring";

const KEY = "encryption_key";

export function useGenerateEncryptionKeyEffect(): void {
  useEffect(() => {
    atomStore.get(atom__encryptionKey);
  }, []);
}

const atom__encryptionKey = atom(async () => {
  const key = await Keyring.getSecret(KEY, "");
  if (!key) {
    const key = await generateKey();
    await Keyring.setSecret(KEY, "", key);
    return key;
  }

  return key;
});

async function generateKey(): Promise<Uint8Array<ArrayBufferLike>> {
  const newKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const exportedKey = await crypto.subtle.exportKey("raw", newKey);
  return new Uint8Array(exportedKey);
}
