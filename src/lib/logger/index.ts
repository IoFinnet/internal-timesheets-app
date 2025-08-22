import pino from "pino";
import { z } from "zod";

/** @public */
export const appLogger = createLogger({ name: "global" });

export function createLogger({ name }: { name: string }): pino.Logger {
  return pino({
    name,
    level:
      z
        .enum(["debug", "info", "warn", "error"], "invalid log level")
        .optional()
        .parse(import.meta.env.VITE_LOG_LEVEL) ?? "info",
  });
}
