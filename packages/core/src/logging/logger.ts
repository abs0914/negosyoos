import { getServerEnvironment } from "../config/env";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, error?: unknown, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api[-_]?key/i;

export function sanitizeLogValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeLogValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitizeLogValue(nestedValue),
      ]),
    );
  }

  return value;
}

function write(level: LogLevel, message: string, fields: LogFields): void {
  const configuredLevel = (() => {
    try {
      return getServerEnvironment().LOG_LEVEL;
    } catch {
      return "info" as const;
    }
  })();

  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[configuredLevel]) {
    return;
  }

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeLogValue(fields) as Record<string, unknown>,
  });

  const output = level === "debug" ? "debug" : level;
  console[output](entry);
}

export function createLogger(context: LogFields = {}): Logger {
  return {
    debug: (message, fields = {}) => write("debug", message, { ...context, ...fields }),
    info: (message, fields = {}) => write("info", message, { ...context, ...fields }),
    warn: (message, fields = {}) => write("warn", message, { ...context, ...fields }),
    error: (message, error, fields = {}) =>
      write("error", message, { ...context, ...fields, error }),
    child: (fields) => createLogger({ ...context, ...fields }),
  };
}

export const logger = createLogger({ service: "negosyo-os-web" });
