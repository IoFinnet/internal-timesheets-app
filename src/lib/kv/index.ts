import { useAtomValue } from "jotai";

import * as KV from "./index.internal";
import { atomFamily__kv } from "./store";

export * as KV from "./index.internal";

export function useKV(name: KV.Name) {
  return useAtomValue(atomFamily__kv(name));
}
