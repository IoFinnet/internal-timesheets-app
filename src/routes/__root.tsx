import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "./__root.css";

import {
  ActionIcon,
  AppShell,
  Avatar,
  Group,
  MantineProvider,
  Menu,
  ScrollArea,
  Space,
  Text,
  Title,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconAlarmAverage, IconHome, IconMinus, IconSquare, IconX } from "@tabler/icons-react";
import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { setDockVisibility } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

import { BambooHrModal } from "~/components/bamboohr-modal";
import { CurrentWindow } from "~/lib/current-window";
import { useGenerateEncryptionKeyEffect } from "~/lib/encryption-key";
import { useGoogleAuth } from "~/lib/google";
import { KV, useKV } from "~/lib/kv";
import { useNotificationsEffect } from "~/lib/notifications";
import { Processing } from "~/lib/processing";
import { useAppMenuEffect, useMinimizeToSystemTrayEffect } from "~/lib/system-menu";
import { useUpdateEffect } from "~/lib/update";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <>
      <MantineProvider defaultColorScheme="auto">
        <Notifications />
        <Shell />
      </MantineProvider>

      <TanStackRouterDevtools />
    </>
  );
}

function Shell() {
  const isMac = navigator.userAgent.includes("Mac");

  const titleBarHeight = useAtomValue(CurrentWindow.atom__titleBarHeight);
  const isFullscreen = useAtomValue(CurrentWindow.atom__fullscreen);
  const isVisible = useAtomValue(CurrentWindow.atom__visible);
  const picture = useKV(KV.Name.picture);
  const router = useRouter();
  const { email } = useGoogleAuth();
  const isProcessing = Processing.useIsProcessing();

  useEffect(() => {
    setDockVisibility(isVisible);
  }, [isVisible]);

  useGenerateEncryptionKeyEffect();
  useAppMenuEffect();
  useMinimizeToSystemTrayEffect();
  useNotificationsEffect();
  useUpdateEffect();

  return (
    <AppShell padding="md" header={{ height: titleBarHeight }}>
      <AppShell.Header
        data-tauri-drag-region
        pl={
          isMac && !isFullscreen ? CurrentWindow.trafficLightsPosition.x * 2 + CurrentWindow.trafficLightsWidth : "lg"
        }
        pr="lg"
      >
        <Group data-tauri-drag-region h="100%" w="100%">
          <ActionIcon
            data-header-clickable
            variant="subtle"
            size="sm"
            onClick={() => router.navigate({ to: "/" })}
            aria-label="Go to home"
          >
            <IconHome size={14} />
          </ActionIcon>

          <Title order={1} size="h6" fw={600} onClick={() => router.navigate({ to: "/" })}>
            io.timesheets
          </Title>

          <Space flex={1} />

          <ActionIcon
            data-header-clickable
            variant="subtle"
            size="sm"
            aria-label="Generate recent timesheets"
            title="Generate recent timesheets"
            onClick={() => Processing.safeCheckTimesheets()}
            loading={isProcessing}
          >
            <IconAlarmAverage />
          </ActionIcon>

          <Menu data-header-clickable position="bottom-end">
            <Menu.Target>
              <Group>
                <Text c="dimmed" size="xs">
                  {email}
                </Text>
                <Avatar size="sm" src={picture ?? ""} alt="User Picture" />
              </Group>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => router.navigate({ to: "/settings" })}>Settings</Menu.Item>
            </Menu.Dropdown>
          </Menu>

          {/* Window controls for Windows/Linux */}
          {!isMac && (
            <Group gap={4}>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => getCurrentWindow().minimize()}
                aria-label="Minimize"
              >
                <IconMinus size={14} style={{ alignSelf: "flex-end" }} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => getCurrentWindow().maximize()}
                aria-label="Maximize"
              >
                <IconSquare size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => getCurrentWindow().close()}
                aria-label="Close"
                color="red"
              >
                <IconX size={14} />
              </ActionIcon>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <ScrollArea>
          <Outlet />
        </ScrollArea>
      </AppShell.Main>

      <BambooHrModal />
    </AppShell>
  );
}
