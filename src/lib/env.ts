/**
 * Centralized, typed environment variable accessor.
 * Throws at boot if any required variable is missing — fail fast, never silently.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `[ResQ] Missing required environment variable: ${key}. ` +
        `Copy .env.example to .env and fill in all values.`,
    );
  }
  return value;
}

export const env = {
  apiUrl: requireEnv("VITE_API_URL"),
  socketUrl: requireEnv("VITE_SOCKET_URL"),
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) ?? "ResQ",
  isDev: (import.meta.env.VITE_ENV ?? import.meta.env.MODE) === "development",
} as const;
