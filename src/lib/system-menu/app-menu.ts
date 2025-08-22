import { useRouter, AnyRouter } from "@tanstack/react-router";
import { Menu, Submenu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { platform } from "@tauri-apps/plugin-os";
import { atom } from "jotai";
import { useEffect } from "react";

import { atomStore } from "~/lib/jotai";

enum MenuItemId {
  Settings = "settings",
}

const atom__menu = atom<Menu>(await Menu.new({ items: await (await Menu.default()).items() }));
await atomStore.get(atom__menu).setAsAppMenu();

export function useAppMenuEffect() {
  const router = useRouter();

  useEffect(() => {
    const abort = new AbortController();

    extendMenu({ signal: abort.signal, router }).catch(() => {});

    return () => {
      abort.abort();
    };
  }, [router]);
}

async function extendMenu({ signal, router }: { signal: AbortSignal; router: AnyRouter }) {
  const isMac = platform() === "macos";
  const menu = atomStore.get(atom__menu);
  const items = await menu.items();
  signal.throwIfAborted();

  let fileMenu: Submenu | undefined;
  for (const menu of items) {
    if ((await menu.text()) === "File") {
      fileMenu = menu as Submenu;
    }
  }

  const settingsParent = isMac ? items.at(0) : fileMenu;
  if (!(settingsParent instanceof Submenu)) {
    throw new Error("failed to find About menu");
  }

  if (await shouldAdd(MenuItemId.Settings, settingsParent)) {
    signal.throwIfAborted();
    await settingsParent.insert(
      [
        await PredefinedMenuItem.new({ item: "Separator" }),
        await MenuItem.new({
          id: MenuItemId.Settings,
          text: "Settings",
          accelerator: isMac ? "Cmd+," : "Ctrl+Shift+S",
          action: () => {
            router.navigate({ to: "/settings" });
          },
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
      ],
      2,
    );
  }
}

async function shouldAdd(id: MenuItemId, menu: Submenu) {
  return !(await menu.get(id));
}
