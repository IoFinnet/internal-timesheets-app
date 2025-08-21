import { DateTime } from "luxon";

import { BambooHr } from "~/lib/bamboohr";
import { db, dbSchema } from "~/lib/db";
import { createLogger } from "~/lib/logger";

import { generateTimesheets } from "./generate-timesheets";

const __logger = createLogger({ name: "processing:check-timesheets-for-day" });

export async function checkTimesheetsForDay({
  day,
  signal,
}: {
  day: DateTime<true>;
  signal?: AbortSignal | null | undefined;
}): Promise<void> {
  signal?.throwIfAborted();
  const start = day.startOf("day");
  const end = day.endOf("day");
  const dateStr = start.toISODate();
  const logger = __logger.child({ date: dateStr });

  if (start.isWeekend) {
    logger.debug("skipping weekend day");
    return;
  }

  logger.info("job will start checking if timesheets entries exist on BambooHR");

  signal?.throwIfAborted();
  const timesheetEntries = await BambooHr.Api.getTimesheetEntries({ end, start });
  signal?.throwIfAborted();

  logger.debug({ timesheetEntries }, "got existing timesheets");
  if (timesheetEntries.some((entry) => entry.dateStr === dateStr)) {
    logger.info("BambooHR already has timesheet info");
    await db.insert(dbSchema.timesheetsDone).values({ date: dateStr }).onConflictDoNothing();
    return;
  }

  await generateTimesheets({ start, end });

  logger.debug("checkTimesheetsForDay() done");
}
