/**
 * Smart EMS — Core API Client
 *
 * Features:
 *  - Native fetch (no axios)
 *  - Bearer token injection from token-store (in-memory)
 *  - Automatic 401 → refresh → retry once
 *  - Refresh queue (concurrent requests wait for single refresh)
 *  - Request timeout (15s via AbortController)
 *  - Typed responses via generic request<T>()
 *  - Dev-only request/response logging
 *  - Snake_case → camelCase normalizer for all responses
 */

import { env } from "@/lib/env";
import { tokenStore } from "@/lib/token-store";
import { mapHttpError, NetworkError, UnauthorizedError } from "@/types/api";

// ── Timeout helper ────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout(signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);
  signal?.addEventListener("abort", () => {
    clearTimeout(timeout);
    controller.abort(signal.reason);
  });
  return controller.signal;
}

// ── Snake_case → camelCase normalizer ────────────────────────────────────────

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function normalizeToCamel<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(normalizeToCamel) as T;
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamel(key)] = normalizeToCamel(val);
    }
    return result as T;
  }
  return obj as T;
}

// ── Refresh queue ─────────────────────────────────────────────────────────────

let isRefreshing = false;
type RefreshCallback = (newToken: string | null) => void;
const refreshQueue: RefreshCallback[] = [];

function processQueue(newToken: string | null) {
  refreshQueue.splice(0).forEach((cb) => cb(newToken));
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: withTimeout(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

// ── Dev logger ────────────────────────────────────────────────────────────────

function logRequest(method: string, url: string, status: number, ms: number) {
  if (!env.isDev) return;
  const style = status >= 400 ? "color:#f87171" : "color:#4ade80";
  console.log(`%c[API] ${method} ${url} → ${status} (${ms}ms)`, style);
}

// ── Core request ──────────────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  /** Skip auth injection (used for refresh calls) */
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, skipAuth = false, signal, ...rest } = options;

  // Build URL with query params
  const url = new URL(`${env.apiUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const token = skipAuth ? null : tokenStore.get();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  };

  const init: RequestInit = {
    ...rest,
    headers,
    signal: withTimeout(signal ?? undefined),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const start = Date.now();
  let res: Response;

  try {
    res = await fetch(url.toString(), init);
  } catch (err) {
    throw new NetworkError(err instanceof Error ? err.message : "Network failure");
  }

  const elapsed = Date.now() - start;
  logRequest(options.method ?? "GET", url.pathname, res.status, elapsed);

  // ── 401 handling with refresh queue ────────────────────────────────────────
  if (res.status === 401 && !skipAuth) {
    if (isRefreshing) {
      // Queue this request until the ongoing refresh completes
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push(async (newToken) => {
          if (!newToken) return reject(new UnauthorizedError());
          try {
            resolve(await request<T>(path, options));
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    processQueue(newToken);

    if (!newToken) throw new UnauthorizedError();
    return request<T>(path, options); // Retry once with new token
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string };
      message = err.message ?? message;
    } catch {
      /* ignore parse errors */
    }
    throw mapHttpError(res.status, message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const json = await res.json();
  return normalizeToCamel<T>(json);
}

// ── Public HTTP methods ───────────────────────────────────────────────────────

export const client = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
