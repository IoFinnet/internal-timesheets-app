import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { useAtomValue } from "jotai";
import { atomWithObservable } from "jotai/utils";
import { BehaviorSubject, switchMap, timer } from "rxjs";

const trigger$ = new BehaviorSubject<void>(undefined);
const atom__isOpenAtStartup = atomWithObservable(() =>
  timer(0, 1000)
    .pipe(switchMap(() => trigger$))
    .pipe(switchMap(() => isEnabled())),
);

export function useOpenAtStartup() {
  const isEnabled = useAtomValue(atom__isOpenAtStartup);
  return { isEnabled };
}

export async function enableOpenAtStartup() {
  await enable();
  trigger$.next();
}

export async function disableOpenAtStartup() {
  await disable();
  trigger$.next();
}
