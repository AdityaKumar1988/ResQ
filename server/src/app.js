import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./modules/auth/routes.js";
import userRoutes from "./modules/users/routes.js";
import driverRoutes from "./modules/drivers/routes.js";
import vehicleRoutes from "./modules/vehicles/routes.js";
import hospitalRoutes from "./modules/hospitals/routes.js";
import incidentRoutes from "./modules/incidents/routes.js";
import dispatchRoutes from "./modules/dispatch/routes.js";
import analyticsRoutes from "./modules/analytics/routes.js";
import notificationRoutes from "./modules/notifications/routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(config.env === "development" ? "dev" : "combined"));
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_req, res) =>
    res.json({ ok: true, env: config.env, at: new Date().toISOString() }),
  );

  // Stricter rate limit for auth endpoints (brute-force protection)
  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth requests, please try again later" },
  });
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/hospitals", hospitalRoutes);
  app.use("/api/incidents", incidentRoutes);
  app.use("/api/dispatch", dispatchRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/notifications", notificationRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
