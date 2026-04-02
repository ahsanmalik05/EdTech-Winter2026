import { randomUUID } from "node:crypto";
import type { Request } from "express";

type LogLevel = "INFO" | "WARN" | "ERROR";

function writeLog(
  level: LogLevel,
  event: string,
  details: Record<string, unknown> = {},
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const line = JSON.stringify(entry);
  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(event: string, details: Record<string, unknown> = {}) {
  writeLog("INFO", event, details);
}

export function logWarn(event: string, details: Record<string, unknown> = {}) {
  writeLog("WARN", event, details);
}

export function logError(
  event: string,
  error: unknown,
  details: Record<string, unknown> = {},
) {
  const errorDetails =
    error instanceof Error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
        }
      : {
          errorMessage: String(error),
        };

  writeLog("ERROR", event, {
    ...details,
    ...errorDetails,
  });
}

export function createRequestId(): string {
  return randomUUID();
}

export function getRequestMeta(req: Request): Record<string, unknown> {
  return {
    requestId: req.requestId ?? "unknown",
    method: req.method,
    path: req.originalUrl || req.url,
  };
}

export function hasApiKeyHeader(req: Request): boolean {
  const value = req.headers["x-api-key"];
  return typeof value === "string" && value.length > 0;
}

export function hasCookieHeader(req: Request): boolean {
  const value = req.headers.cookie;
  return typeof value === "string" && value.length > 0;
}

export function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}
