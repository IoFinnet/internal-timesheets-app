import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { useAtomValue } from "jotai";
import { atomWithObservable } from "jotai/utils";
import { useEffect } from "react";
import { defer, switchMap } from "rxjs";

import { fromTauri } from "~/lib/rx-tauri";

const atom__notificationsPermission = atomWithObservable(() =>
  fromTauri((l) => listen("tauri://focus", l)).pipe(switchMap(() => defer(async () => isPermissionGranted()))),
);

export function useAreNotificationsGranted(): boolean {
  return useAtomValue(atom__notificationsPermission);
}

export function useNotificationsEffect() {
  const areNotificationsGranted = useAtomValue(atom__notificationsPermission);

  useEffect(() => {
    if (areNotificationsGranted) {
      return;
    }

    const unlisteners: (() => void)[] = [];

    run();
    async function run() {
      unlisteners.push(await listen("tauri://focus", () => requestIfNeeded()));
      requestIfNeeded();
    }

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [areNotificationsGranted]);
}

async function requestIfNeeded() {
  const areGranted = await isPermissionGranted();
  if (areGranted) {
    return;
  }

  await requestPermission();
}
