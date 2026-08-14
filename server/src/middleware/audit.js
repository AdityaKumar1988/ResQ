import { db } from "../db.js";
import { logger } from "../logger.js";

export function audit(action) {
  return async (req, _res, next) => {
    try {
      await db("audit_logs").insert({
        actor_id: req.user?.sub || null,
        actor_role: req.user?.role || null,
        action,
        target: `${req.method} ${req.originalUrl}`,
        ip: req.ip,
      });
    } catch (e) {
      logger.warn({ err: e }, "audit insert failed");
    }
    next();
  };
}
