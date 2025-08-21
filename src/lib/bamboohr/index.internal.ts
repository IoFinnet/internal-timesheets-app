import { useAtomValue } from "jotai";

import { KV, useKV } from "~/lib/kv";

import { assertIsValid } from "./api";
import { atom__apiKey, deleteApiKey, deleteEmployeeId, getApiKey, setApiKey, setEmployeeId } from "./keyring";

export { useModal, openModal } from "./store";
export * as Api from "./api";

export function useAuth() {
  const email = useKV(KV.Name.email);
  const apiKey = useAtomValue(atom__apiKey(email));

  return { apiKey, isSetUp: !!apiKey };
}

export async function unlink(): Promise<void> {
  await Promise.all([deleteApiKey(), deleteEmployeeId()]);
}

export async function link({ apiKey, employeeId }: { employeeId: string; apiKey: string }): Promise<void> {
  await assertIsValid({ bambooEmployeeId: employeeId, bambooApiKey: apiKey });
  await Promise.all([setApiKey({ apiKey }), setEmployeeId({ employeeId })]);
}

export async function isLinked(): Promise<boolean> {
  const apiKey = await getApiKey();
  return !!apiKey;
}
