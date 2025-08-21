import { eq, sql } from "drizzle-orm";

import { db, dbSchema } from "~/lib/db";

import { trigger$ } from "./trigger$";

export enum Name {
  email = "google.email",
  picture = "google.picture",
  name = "google.name",
  givenName = "google.given_name",
  familyName = "google.family_name",
  workingHours = "settings.working_hours",
  directReports = "settings.direct_reports",
  processInBackground = "settings.process_in_bg",
}

export async function set__internal(key: Name, value: string | null | undefined): Promise<void> {
  if (value === null || value === undefined) {
    await db.delete(dbSchema.settings).where(eq(dbSchema.settings.key, key));
    trigger$.next();
  } else {
    await db
      .insert(dbSchema.settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: dbSchema.settings.key,
        targetWhere: eq(dbSchema.settings.key, key),
        set: { value: sql.raw(`excluded.${dbSchema.settings.value.name}`) },
      });
    trigger$.next();
  }
}

export async function get__internal(key: Name): Promise<string | undefined> {
  const result = await db
    .select()
    .from(dbSchema.settings)
    .where(eq(dbSchema.settings.key, key))
    .then((rows) => rows.at(0)?.value);

  return result ?? undefined;
}
