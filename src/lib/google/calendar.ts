import { DateTime } from "luxon";
import { z } from "zod";

import { rustFetch } from "~/lib/rust-fetch";

import { GoogleAccountNotLinkedError } from "./errors";
import { getAccessToken } from "./keyring";
import { getFreshAccessToken } from "./sign-in";

const TimestampSchema = z
  .unknown()
  .transform((v): DateTime | unknown => {
    if (v instanceof Date) {
      return DateTime.fromJSDate(v);
    }

    if (DateTime.isDateTime(v)) {
      return v;
    }

    if (typeof v === "string") {
      return DateTime.fromISO(v);
    }

    if (typeof v === "number") {
      return DateTime.fromMillis(v);
    }

    if (typeof v === "object" && v && "dateTime" in v && typeof v.dateTime === "string") {
      return DateTime.fromISO(v.dateTime);
    }

    return v;
  })
  .refine((v): v is DateTime<true> => DateTime.isDateTime(v) && v.isValid, { error: "parsed timestamp is invalid" })
  .transform((v) => v as DateTime<true>);

const CalendarInfoSchema = z.object({
  id: z.string(),
  primary: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  timeZone: z.string().refine((it) => DateTime.local().setZone(it).isValid),
});

const EventAttendeeSchema = z.object({
  self: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  email: z.email(),
  responseStatus: z.enum(["accepted", "declined", "tentative", "needsAction"]),
});

const EventSchema = z.object({
  id: z.string(),
  eventType: z.union([z.literal("default"), z.literal("outOfOffice")]),
  status: z.enum(["confirmed", "tentative", "cancelled"]),
  start: TimestampSchema,
  end: TimestampSchema,
  summary: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  description: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  attendees: z
    .array(EventAttendeeSchema.optional().catch(undefined))
    .nullish()
    .transform((v) => v ?? [])
    .transform((v) => v.filter((it) => it !== undefined)),
});

export async function getPrimaryCalendar(): Promise<z.infer<typeof CalendarInfoSchema>> {
  const token = await getFreshAccessToken();
  if (!token) {
    throw new GoogleAccountNotLinkedError();
  }

  const response = await rustFetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar list: ${response.status} ${response.statusText}`);
  }

  const data = z
    .object({
      items: z
        .array(CalendarInfoSchema.optional().catch(undefined))
        .transform((v) => v.filter((it) => it !== undefined)),
    })
    .parse(await response.json());

  const primaryCalendar = data.items.find((it) => it.primary);
  if (!primaryCalendar) {
    throw new Error("failed to find primary calendar");
  }

  return primaryCalendar;
}

export async function getEventList({
  primaryCalendar,
  between,
}: {
  primaryCalendar: { id: string };
  between: [DateTime<true>, DateTime<true>];
}): Promise<readonly z.infer<typeof EventSchema>[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new GoogleAccountNotLinkedError();
  }

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(primaryCalendar.id)}/events`,
  );
  url.searchParams.set("timeMin", between[0].toISO());
  url.searchParams.set("timeMax", between[1].toISO());

  const response = await rustFetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
  }

  const data = z
    .object({
      items: z
        .array(EventSchema.optional().catch(undefined))
        .nullish()
        .transform((v) => v ?? [])
        .transform((v) => v.filter((it) => it !== undefined)),
    })
    .parse(await response.json());

  return data.items;
}
