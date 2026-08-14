import { env } from "@/lib/env";

/**
 * Structured logger — verbose in development, silent in production.
 * Use this instead of raw console.log/warn/error everywhere.
 */
export const logger = {
  api: (method: string, url: string, status: number, ms: number) => {
    if (!env.isDev) return;
    const style = status >= 400 ? "color:#f87171;font-weight:bold" : "color:#4ade80";
    console.log(`%c[API] ${method} ${url} → ${status} (${ms}ms)`, style);
  },

  socket: (event: string, payload?: unknown) => {
    if (!env.isDev) return;
    console.log("%c[SOCKET] " + event, "color:#a78bfa;font-weight:bold", payload ?? "");
  },

  info: (...args: unknown[]) => {
    if (!env.isDev) return;
    console.log("%c[INFO]", "color:#60a5fa", ...args);
  },

  warn: (...args: unknown[]) => {
    if (!env.isDev) return;
    console.warn("%c[WARN]", "color:#fbbf24", ...args);
  },

  error: (...args: unknown[]) => {
    // Errors always logged regardless of environment
    console.error("%c[ERROR]", "color:#f87171;font-weight:bold", ...args);
  },

  perf: (label: string, ms: number) => {
    if (!env.isDev) return;
    const style = ms > 1000 ? "color:#f87171" : ms > 300 ? "color:#fbbf24" : "color:#4ade80";
    console.log(`%c[PERF] ${label}: ${ms.toFixed(1)}ms`, style);
  },
};
