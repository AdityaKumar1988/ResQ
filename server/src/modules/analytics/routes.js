import { Router } from "express";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authenticate, requireRole("admin", "dispatcher"));

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const { range } = req.query;

    let incidentQuery = db("incidents");
    if (range === "24h") {
      incidentQuery = incidentQuery.where(
        "reported_at",
        ">=",
        db.raw("NOW() - INTERVAL '24 HOURS'"),
      );
    } else if (range === "7d") {
      incidentQuery = incidentQuery.where("reported_at", ">=", db.raw("NOW() - INTERVAL '7 DAYS'"));
    } else if (range === "30d") {
      incidentQuery = incidentQuery.where(
        "reported_at",
        ">=",
        db.raw("NOW() - INTERVAL '30 DAYS'"),
      );
    } else if (range === "90d") {
      incidentQuery = incidentQuery.where(
        "reported_at",
        ">=",
        db.raw("NOW() - INTERVAL '90 DAYS'"),
      );
    }

    const [totals] = await incidentQuery.clone().count("id as total");
    const byStatus = await incidentQuery
      .clone()
      .select("status")
      .count("id as n")
      .groupBy("status");
    const byPriority = await incidentQuery
      .clone()
      .select("priority")
      .count("id as n")
      .groupBy("priority");
    const byType = await incidentQuery.clone().select("type").count("id as n").groupBy("type");

    const [activeRow] = await db("incidents")
      .whereNotIn("status", ["completed", "cancelled"])
      .count("id as total");

    const [respRow] = await db("incidents")
      .whereNotNull("assigned_at")
      .select(
        db.raw("AVG(EXTRACT(EPOCH FROM (assigned_at - reported_at))) as avg_resp_seconds"),
        db.raw(
          "COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (assigned_at - reported_at)) <= sla_seconds) as sla_met",
        ),
        db.raw("COUNT(*) as total_with_sla"),
      )
      .first();

    const driversCount = await db("drivers").count("id as n").first();
    const availableDrivers = await db("drivers")
      .where({ status: "available" })
      .count("id as n")
      .first();
    const onShiftDrivers = await db("drivers")
      .whereNot({ status: "offline" })
      .count("id as n")
      .first();

    const totalWithSla = Number(respRow?.total_with_sla || 0);
    const slaMet = Number(respRow?.sla_met || 0);
    const slaCompliance = totalWithSla > 0 ? Math.round((slaMet / totalWithSla) * 100) : 100;
    const avgResponseSec = Math.round(Number(respRow?.avg_resp_seconds || 0));

    res.json({
      totals: {
        incidents: Number(totals?.total || 0),
        active: Number(activeRow?.total || 0),
        drivers: Number(driversCount?.n || 0),
        available: Number(availableDrivers?.n || 0),
        onShift: Number(onShiftDrivers?.n || 0),
        avgResponseSec,
        slaCompliance,
      },
      byStatus,
      byPriority,
      byType,
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
