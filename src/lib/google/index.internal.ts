import { KV } from "~/lib/kv";

import { GoogleAccountNotLinkedError } from "./errors";

export { signIn } from "./sign-in";
export { signOut } from "./sign-out";
export * as Calendar from "./calendar";

export async function getEmailOrThrow(): Promise<string> {
  const email = await KV.get(KV.Name.email);
  if (!email) {
    throw new GoogleAccountNotLinkedError();
  }

  return email;
}

export async function getEmailMaybe(): Promise<string | undefined> {
  return await KV.get(KV.Name.email);
}

export async function isSignedIn(): Promise<boolean> {
  const email = await getEmailMaybe();
  return !!email;
}
