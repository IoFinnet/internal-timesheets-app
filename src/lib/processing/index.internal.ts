import { notifications } from "@mantine/notifications";
import { sendNotification, Visibility } from "@tauri-apps/plugin-notification";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";

import { createLogger } from "~/lib/logger";

import { internal__generateTimesheets } from "./internal-generate-timesheets";
import { internal__removeTimesheets } from "./internal-remove-timesheets";
import { queue } from "./queue";

const logger = createLogger({ name: "processing:start" });

export async function safeCheckTimesheets({
  signal,
  startDate,
  endDate,
}: {
  signal?: AbortSignal | null | undefined;
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
} = {}): Promise<void> {
  try {
    await queue
      .add(() => internal__generateTimesheets({ signal, start: startDate, end: endDate }))
      .then(() => {
        const title = "Timesheets processed";
        const message = "All timesheets have been processed successfully.";

        notifications.show({ color: "green.5", title, message });

        if (import.meta.env.DEV) {
          sendNotification({
            title,
            body: message,
            visibility: Visibility.Public,
            silent: true,
            autoCancel: true,
          });
        }
      })
      .catch((error) => {
        logger.error({ error }, "failed to add task to queue");

        const title = "Failed to process timesheets";
        const message = error instanceof Error ? error.message : String(error);

        notifications.show({ color: "red.5", title, message });
        sendNotification({ title, body: message, visibility: Visibility.Public });
      });
  } catch {
    /* nothing */
  }
}

export async function safeRemoveTimesheets({
  endDate,
  startDate,
  includeNonGeneratedOnes,
  signal,
}: {
  signal?: AbortSignal | null | undefined;
  startDate: string;
  endDate: string;
  includeNonGeneratedOnes?: boolean | null | undefined;
}): Promise<void> {
  try {
    const dates: string[] = [];

    for (
      let current = DateTime.fromISO(startDate);
      current.toISODate() !== endDate;
      current = current.plus({ days: 1 })
    ) {
      dates.push(current.toISODate()!);
    }

    dates.push(endDate);

    await queue
      .add(() => internal__removeTimesheets({ dates, includeNonGeneratedOnes, signal }))
      .catch((error) => {
        logger.error({ error }, "failed to remove timesheets");
        notifications.show({
          color: "red.5",
          title: "Failed to remove timesheets",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  } catch {
    /* nothing */
  }
}

export function useIsProcessing(): boolean {
  const [isProcessing, setProcessing] = useState(queue.size + queue.pending > 0);

  useEffect(() => {
    const listener = () => setProcessing(queue.size + queue.pending > 0);
    queue.addListener("active", listener);
    queue.addListener("add", listener);
    queue.addListener("completed", listener);
    queue.addListener("empty", listener);
    queue.addListener("error", listener);
    queue.addListener("idle", listener);
    queue.addListener("next", listener);

    return () => {
      queue.removeListener("active", listener);
      queue.removeListener("add", listener);
      queue.removeListener("completed", listener);
      queue.removeListener("empty", listener);
      queue.removeListener("error", listener);
      queue.removeListener("idle", listener);
      queue.removeListener("next", listener);
    };
  }, []);

  return isProcessing;
}
