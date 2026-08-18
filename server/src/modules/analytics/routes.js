import { Router } from "express";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authenticate, requireRole("admin", "dispatcher"));

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [totals] = await db("incidents").count("id as total");
    const byStatus = await db("incidents").select("status").count("id as n").groupBy("status");
    const byPriority = await db("incidents")
      .select("priority")
      .count("id as n")
      .groupBy("priority");
    const drivers = await db("drivers").count("id as n").first();
    const available = await db("drivers").where({ status: "available" }).count("id as n").first();
    res.json({
      totals: {
        incidents: Number(totals.total),
        drivers: Number(drivers.n),
        available: Number(available.n),
      },
      byStatus,
      byPriority,
    });
  }),
);

router.get(
  "/sla",
  asyncHandler(async (_req, res) => {
    const rows = await db("incidents")
      .whereNotNull("assigned_at")
      .select(
        "priority",
        db.raw("AVG(EXTRACT(EPOCH FROM (assigned_at - reported_at))) as avg_dispatch_seconds"),
        db.raw("COUNT(*) as n"),
      )
      .groupBy("priority");
    res.json({ sla: rows });
  }),
);

export default router;
