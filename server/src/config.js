import "dotenv/config";

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:8080").split(",").map((s) => s.trim()),
  db: {
    url: process.env.DATABASE_URL || "postgres://ems:ems@localhost:5432/smart_ems",
    ssl: process.env.PGSSL === "true",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
  },
  logLevel: process.env.LOG_LEVEL || "info",
};
