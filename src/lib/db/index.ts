import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { z } from "zod";

import { createLogger } from "~/lib/logger";
import { createUuid } from "~/lib/uuid";

import * as schema from "./schema";
export * as dbSchema from "./schema";

const logger = createLogger({ name: "db" });

const rawDb = await Database.load("sqlite:db.sqlite");

const ExecuteResultSchema = z.object(
  {
    lastInsertId: z.number(),
    rowsAffected: z.number(),
  },
  "unexpected data returned by execute() from @tauri-apps/plugin-sql",
);
const RowArraySchema = z.array(z.record(z.string(), z.any()), "unexpected data from @tauri-apps/plugin-sql");

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    const requestId = createUuid();
    logger.trace({ requestId, sql, params, method }, "received database operation request");

    try {
      if (method === "run") {
        const rows = await rawDb.execute(sql, params);
        logger.trace({ requestId, method, rows }, "got result (RUN)");

        const parsed = ExecuteResultSchema.parse(rows, { reportInput: true });
        return { rows: [], ...parsed };
      } else {
        const rows = await rawDb.select(sql, params);
        logger.trace({ requestId, method, rows }, "got result");

        const parsed = RowArraySchema.parse(rows, { reportInput: true }).map((row) => Object.values(row));
        return { rows: method === "get" ? (parsed.at(0) ?? []) : parsed };
      }
    } catch (err) {
      logger.error({ requestId, err }, "database operation failed");
      const error = new Error(`database operation failed: ${err instanceof Error ? err.message : String(err)}`);
      throw error;
    }
  },
  { schema, logger: logger.levelVal <= 10, casing: "snake_case" },
);
