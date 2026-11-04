import { db } from "../db.js";
import { logger } from "../logger.js";

export async function logAudit(req, action, target) {
  try {
    await db("audit_logs").insert({
      actor_id: req.user?.sub || req.user?.id || null,
      actor_role: req.user?.role || null,
      action,
      target: target || `${req.method} ${req.originalUrl}`,
      ip: req.ip || req.socket?.remoteAddress || null,
    });
  } catch (e) {
    logger.warn({ err: e }, "audit insert failed");
  }
}

export function audit(action) {
  return async (req, _res, next) => {
    await logAudit(req, action);
    next();
  };
}
