import os from "node:os";
import path from "node:path";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/lib/db/drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "sqlite",
  casing: "snake_case",
  dbCredentials: {
    url: `file:${path.join(os.homedir(), "/Library/Application Support/com.iofinnet.internal.timesheets/db.sqlite")}`,
  },
});
