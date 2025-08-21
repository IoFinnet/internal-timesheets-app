import { KV } from "~/lib/kv";

import { deleteAccessToken, deleteExpiryTimestamp, deleteRefreshToken } from "./keyring";

export async function signOut({
  signal,
  router,
}: {
  signal?: AbortSignal;
  router: { invalidate: () => Promise<void> };
}): Promise<void> {
  signal?.throwIfAborted();

  try {
    await deleteAccessToken();
    await deleteRefreshToken();
    await deleteExpiryTimestamp();
    await Promise.all([
      KV.set(KV.Name.email, null),
      KV.set(KV.Name.familyName, null),
      KV.set(KV.Name.givenName, null),
      KV.set(KV.Name.name, null),
      KV.set(KV.Name.picture, null),
    ]);
  } finally {
    await router.invalidate();
  }
}
