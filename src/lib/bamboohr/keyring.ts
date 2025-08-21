import { atom } from "jotai";
import { atomFamily, atomWithObservable } from "jotai/utils";
import { BehaviorSubject, switchMap } from "rxjs";

import { Google } from "~/lib/google";
import { Keyring } from "~/lib/keyring";

const trigger$ = new BehaviorSubject<void>(undefined);
export const atom__apiKey = atomFamily((email: string | null | undefined) => {
  if (email === null || email === undefined) {
    return atom(() => undefined);
  }

  return atomWithObservable(() => trigger$.pipe(switchMap(() => getApiKey())));
});

enum KeyringService {
  EmployeeId = "BambooHR.employee_id",
  ApiKey = "BambooHR.api_key",
}

export async function getEmployeeId(): Promise<string | undefined> {
  const email = await Google.getEmailMaybe();
  if (!email) {
    return undefined;
  }

  const result = await Keyring.getSecret(KeyringService.EmployeeId, email);
  if (!result) {
    return undefined;
  }

  return new TextDecoder().decode(result);
}

export async function setEmployeeId({ employeeId }: { employeeId: string }): Promise<void> {
  const email = await Google.getEmailOrThrow();
  await Keyring.setSecret(KeyringService.EmployeeId, email, new TextEncoder().encode(employeeId));
  trigger$.next();
}

export async function deleteEmployeeId(): Promise<void> {
  const email = await Google.getEmailOrThrow();
  await Keyring.deleteSecret(KeyringService.EmployeeId, email);
  trigger$.next();
}

export async function getApiKey(): Promise<string | undefined> {
  const email = await Google.getEmailMaybe();
  if (!email) {
    return undefined;
  }

  const result = await Keyring.getSecret(KeyringService.ApiKey, email);
  if (!result) {
    return undefined;
  }

  return new TextDecoder().decode(result);
}

export async function setApiKey({ apiKey }: { apiKey: string }): Promise<void> {
  const email = await Google.getEmailOrThrow();
  await Keyring.setSecret(KeyringService.ApiKey, email, new TextEncoder().encode(apiKey));
  trigger$.next();
}

export async function deleteApiKey(): Promise<void> {
  const email = await Google.getEmailOrThrow();
  await Keyring.deleteSecret(KeyringService.ApiKey, email);
  trigger$.next();
}
