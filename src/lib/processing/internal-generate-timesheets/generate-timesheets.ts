import escapeHTML from "escape-html";
import { DateTime } from "luxon";
import { z } from "zod";

import { BambooHr } from "~/lib/bamboohr";
import { db, dbSchema } from "~/lib/db";
import { Google } from "~/lib/google";
import { KV } from "~/lib/kv";
import { createLogger } from "~/lib/logger";

const __logger = createLogger({ name: "processing:generate-timesheets" });

export async function generateTimesheets({
  start,
  end,
}: {
  start: DateTime<true>;
  end: DateTime<true>;
}): Promise<void> {
  const logger = __logger.child({ date: start.toISODate() });
  if (!start.isValid) {
    throw new Error(`invalid start date: ${start}`);
  }

  if (!end.isValid) {
    throw new Error(`invalid end date: ${end}`);
  }

  const directReports =
    (await KV.get(KV.Name.directReports))
      ?.split(",")
      .map((it) => it.trim())
      .filter((it) => !!it) ?? [];
  const email = await Google.getEmailOrThrow();

  const date = start;
  const isBambooLinked = await BambooHr.isLinked();
  if (!isBambooLinked) {
    logger.warn("skipping job because BambooHR account is not linked");
    return;
  }

  const timesheetEntries = await BambooHr.Api.getTimesheetEntries({ end, start });
  if (timesheetEntries.length > 0) {
    logger.info("timesheets already exist for this day, skipping");
    return;
  }

  logger.info("job will start generating timesheets");
  const primaryCalendar = await Google.Calendar.getPrimaryCalendar();
  const now = DateTime.utc().setZone(primaryCalendar.timeZone);
  if (!now.isValid) {
    throw new Error(`current time is invalid: ${now}`);
  }

  const events = await Google.Calendar.getEventList({ primaryCalendar, between: [start, end] });
  logger.debug({ events: events.length }, "got calendar events");

  let hourCount = 0;
  const entries: z.input<typeof BambooHr.Api.TimesheetEntryInput>[] = [];
  for (const event of events) {
    if (event.eventType !== "default") {
      logger.trace({ event }, "skipping non-default event");
      continue;
    }

    if (event.status !== "confirmed") {
      logger.debug({ event }, "skipping event because it is not confirmed");
      continue;
    }

    if (event.attendees && event.attendees.some((it) => it.self === true && it.responseStatus !== "accepted")) {
      logger.debug({ event }, "skipping event because user has not accepted it");
      continue;
    }

    const isOneOnOne =
      event.attendees.length === 2 &&
      event.attendees.every((it) => email === it.email || directReports.includes(it.email));

    const hours = Math.abs(event.start.diff(event.end).as("hours"));
    const parsed = BambooHr.Api.TimesheetEntryInput.safeParse({
      date,
      hours,
      taskId: isOneOnOne ? BambooHr.Api.BambooTaskId.OneOnOnes : BambooHr.Api.BambooTaskId.Meetings,
      note: event.summary ? escapeHTML(event.summary) : undefined,
    });

    if (!parsed.success) {
      logger.warn({ error: parsed.error }, "failed to parse timesheet entry");
      continue;
    }

    hourCount += hours;
    entries.push(parsed.data);
    logger.debug({ entry: parsed.data }, "prepared timesheet entry to be added");
  }

  entries.push({
    date,
    hours: 8 - hourCount,
    taskId: BambooHr.Api.BambooTaskId.Dev,
  });

  await BambooHr.Api.addTimesheetEntries({ entries });
  await db
    .insert(dbSchema.timesheetsDone)
    .values({ date: date.toISODate(), completedAt: now.toUTC().toJSDate() })
    .onConflictDoUpdate({
      target: dbSchema.timesheetsDone.date,
      set: { completedAt: now.toUTC().toJSDate() },
    });

  logger.debug("generateTimesheets() done");
}
