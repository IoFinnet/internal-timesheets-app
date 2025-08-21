import { eq } from "drizzle-orm";
import { DateTime } from "luxon";

import { BambooHr } from "~/lib/bamboohr";
import { db, dbSchema } from "~/lib/db";
import { Google } from "~/lib/google";
import { createLogger } from "~/lib/logger";

import { checkTimesheetsForDay } from "./check-timesheets-for-day";

const __logger = createLogger({ name: "processing:check-timesheets" });

export async function internal__generateTimesheets({ signal }: { signal?: AbortSignal | null | undefined }) {
  signal?.throwIfAborted();

  const isBambooLinked = await BambooHr.isLinked();
  if (!isBambooLinked) {
    __logger.warn("skipping job because BambooHR account is not linked");
    return;
  }

  const primaryCalendar = await Google.Calendar.getPrimaryCalendar();
  signal?.throwIfAborted();

  const now = DateTime.now().setZone(primaryCalendar.timeZone) as DateTime<true>;
  const yesterday = now.minus({ days: 1 }).startOf("day");
  const firstDay = now.startOf("month").minus({ days: 1 }).startOf("month");
  const lastDay = yesterday;

  const days: DateTime<true>[] = [];
  let currentDay = firstDay;
  while (currentDay.startOf("day").toMillis() <= lastDay.startOf("day").toMillis()) {
    days.push(currentDay);
    currentDay = currentDay.plus({ days: 1 });
  }

  __logger.info({ firstDay: firstDay.toISODate(), lastDay: lastDay.toISODate() }, "job will start checking dates");

  const all = await Promise.allSettled(
    days.map(async (day) => {
      const dateStr = day.toISODate();
      const logger = __logger.child({ date: dateStr });

      const existing = await db
        .select()
        .from(dbSchema.timesheetsDone)
        .where(eq(dbSchema.timesheetsDone.date, dateStr))
        .then((rows) => rows.at(0));
      if (existing) {
        logger.info("timesheet was already marked as done in the DB");
        return;
      }

      await checkTimesheetsForDay({ day, signal });
    }),
  );

  const rejected = all.find((it) => it.status === "rejected");
  if (rejected) {
    throw rejected.reason instanceof Error ? rejected.reason : new Error(String(rejected.reason));
  }

  __logger.debug("internal__generateTimesheets() done");
}
