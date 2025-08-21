import pino from "pino";

/** @public */
export const appLogger = createLogger({ name: "global" });

export function createLogger({ name }: { name: string }): pino.Logger {
  return pino({ name, level: import.meta.env.VITE_LOG_LEVEL });
}
