import { useAtomValue } from "jotai";

import { KV, useKV } from "~/lib/kv";

import * as Google from "./index.internal";
import { atom__isSigningIn } from "./sign-in";
export * as Google from "./index.internal";

export function useGoogleAuth() {
  const email = useKV(KV.Name.email);
  const isSigningIn = useAtomValue(atom__isSigningIn);
  if (email) {
    return { isSigningIn: false, signIn: Google.signIn, signOut: Google.signOut, isSignedIn: true, email };
  }

  return { isSigningIn, signIn: Google.signIn, signOut: Google.signOut, isSignedIn: false, email: undefined };
}
