/**
 * In-memory token store.
 * Access token lives in memory only (XSS-safe).
 * Refresh token stored in sessionStorage (persists across tab refreshes but not
 * cross-tab or browser restarts — acceptable trade-off without HttpOnly cookies).
 */

const REFRESH_KEY = "ems_refresh_token";

let accessToken: string | null = null;
const subscribers = new Set<() => void>();

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  getRefresh(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },

  set(access: string, refresh: string): void {
    accessToken = access;
    try {
      sessionStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* sessionStorage unavailable (e.g. private browsing) */
    }
    subscribers.forEach((fn) => fn());
  },

  clear(): void {
    accessToken = null;
    try {
      sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignore */
    }
    subscribers.forEach((fn) => fn());
  },

  /** Subscribe to token change events (for auth context reactivity) */
  subscribe(fn: () => void): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
};
