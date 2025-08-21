import { notifications } from "@mantine/notifications";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";

export function useUpdateEffect() {
  useEffect(() => {
    runUpdate();
  }, []);
}

async function runUpdate() {
  const update = await check();
  if (!update) {
    return;
  }

  await update.downloadAndInstall();
  notifications.show({
    title: "App updated",
    message: "The application has been updated. Restart the app to apply the changes.",
    autoClose: false,
    onClick: () => relaunch(),
  });
}
