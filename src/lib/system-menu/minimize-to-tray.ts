import { defaultWindowIcon, setDockVisibility } from "@tauri-apps/api/app";
import { Menu, PredefinedMenuItem } from "@tauri-apps/api/menu";
import * as path from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as fs from "@tauri-apps/plugin-fs";
import { exit } from "@tauri-apps/plugin-process";
import { atom } from "jotai";
import Queue from "p-queue";
import { useEffect } from "react";
import { concat, defer, startWith, switchMap } from "rxjs";

import { atomStore } from "~/lib/jotai";
import { appLogger, createLogger } from "~/lib/logger";
import { fromTauri } from "~/lib/rx-tauri";

const atom__isVisible = atom<boolean>(await getCurrentWindow().isVisible());
const atom__tray = atom<TrayIcon | undefined>(undefined);
const logger = createLogger({ name: "minimize-to-tray" });
const queue = new Queue({ concurrency: 1 });

export function useMinimizeToSystemTrayEffect() {
  useEffect(() => {
    const subscription = concat(fromTauri((l) => getCurrentWindow().onFocusChanged(l)))
      .pipe(startWith(null))
      .pipe(switchMap(() => defer(async () => handleChange())))
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}

async function handleAppNowVisible() {
  logger.debug("app is now visible");
  await Promise.allSettled([setDockVisibility(true), atomStore.get(atom__tray)?.close()]);
}

async function handleAppNowHidden() {
  logger.debug("app is now hidden");
  await Promise.allSettled([setDockVisibility(false), atomStore.get(atom__tray)?.close()]);

  const menu = await Menu.new({
    items: [
      {
        id: "show",
        text: "Open io.timesheets",
        action: async () => {
          await atomStore.get(atom__tray)?.close();
          await setDockVisibility(true);
          await getCurrentWindow().show();
          await getCurrentWindow().setFocus();
        },
      },
      await PredefinedMenuItem.new({ item: "Separator" }),
      {
        id: "quit",
        text: "Quit",
        accelerator: "CmdOrCtrl+Q",
        action: async () => {
          await exit(0);
        },
      },
    ],
  });

  const tray = await TrayIcon.new({ menu });

  try {
    const trayIconPath = await getTrayIconPath();
    appLogger.info({ trayIconPath }, "loading tray icon from resource dir");

    tray.setIcon(trayIconPath);
    tray.setIconAsTemplate(true);
  } catch (err) {
    appLogger.error({ err }, "failed to load tray icon");
    tray.setIcon(await defaultWindowIcon());
    tray.setIconAsTemplate(false);
  }

  atomStore.set(atom__tray, tray);
}

async function handleChange() {
  await queue.add(async () => {
    try {
      const window = getCurrentWindow();
      const isVisible = await window.isVisible();

      const previous = atomStore.get(atom__isVisible);
      atomStore.set(atom__isVisible, isVisible);

      if (isVisible && !previous) {
        await handleAppNowVisible();
      } else if (!isVisible && previous) {
        await handleAppNowHidden();
      }
    } catch (error) {
      logger.error({ error }, "failed while running handleChange()");
    }
  });
}

async function getTrayIconPath(): Promise<string> {
  if (import.meta.env.DEV) {
    appLogger.debug("will load tray icon from project dir");
    return "icons/tray.png";
  }

  appLogger.debug("will load tray icon from resource dir");

  const resourceDir = await path.resourceDir();
  appLogger.debug({ resourceDir }, "got resource dir path from Tauri");

  const dir = await path.join(resourceDir, "icons/tray.png");

  if (await fs.exists(dir)) {
    return dir;
  }

  throw new Error(`tray icon not found: ${dir}`);
}
