import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

import type { KV } from "~/lib/kv";

export const settings = sqliteTable("settings", {
  key: text("key").$type<KV.Name>().notNull().primaryKey(),
  value: text("value"),
});

export const timesheetsDone = sqliteTable("timesheets_done", {
  date: text("date", { length: 10 }).notNull().primaryKey(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
});
