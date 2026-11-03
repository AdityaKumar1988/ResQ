import { Router } from "express";
import { db } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

/**
 * Sanitizes street addresses into generalized sector names to prevent PII exposure.
 * Strips door, apartment, building numbers and postal codes.
 */
export function sanitizeSector(address) {
  if (!address || typeof address !== "string") return "Metropolitan Sector";

  // 1. Strip unit/apartment/suite/flat prefixes: e.g. "Apt 4B", "Unit 12", "Flat 3", "No. 5"
  let cleaned = address
    .replace(/\b(?:apt|unit|suite|flat|no)\b\.?\s*[\w\d-]+,?\s*/gi, "")
    .replace(/#[a-z0-9-]+,?\s*/gi, "")
    .replace(/\b\d{5,6}\b/g, "") // strip 5-6 digit zip codes
    .trim();

  // 2. Strip leading street/house number from whole string if present (e.g. "123 Main St" -> "Main St")
  cleaned = cleaned.replace(/^\d+[-\w/]*\s*,?\s*/, "").trim();

  const parts = cleaned
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let target = "";
  if (parts.length > 1) {
    // If multiple parts, prioritize parts that explicitly mention Sector, Zone, Ward, District
    const sectorPart = parts.find((p) => /sector|zone|district|area|ward|region/i.test(p));
    if (sectorPart) {
      target = sectorPart;
    } else {
      // Otherwise take the last 1 or 2 high-level locality parts
      target = parts.slice(-2).join(", ");
    }
  } else if (parts.length === 1) {
    target = parts[0];
  }

  // Strip any remaining leading house number on the target segment
  target = target
    .replace(/^\d+[-\w/]*\s*,?\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!target) return "Metropolitan Sector";

  // If target already contains administrative zone keywords, keep as-is
  if (/sector|zone|district|area|ward|region/i.test(target)) {
    return target;
  }

  return `${target} Sector`;
}

/**
 * Queries database aggregates for public telemetry feed.
 * Does not expose any citizen personal data, contact numbers, exact addresses, or private notes.
 */
export async function fetchPublicStats() {
  const [activeRow] = await db("incidents")
    .whereNotIn("status", ["completed", "cancelled"])
    .count("id as count");

  const [totalRow] = await db("incidents").count("id as count");

  const [availableUnitsRow] = await db("drivers").where("status", "available").count("id as count");

  const [onShiftUnitsRow] = await db("drivers").whereNot("status", "offline").count("id as count");

  const recentIncidents = await db("incidents")
    .select("id", "code", "priority", "type", "status", "address", "reported_at")
    .orderBy("reported_at", "desc")
    .limit(4);

  const recentActivity = recentIncidents.map((incident) => ({
    id: incident.id,
    code: incident.code,
    priority: incident.priority,
    type: incident.type,
    status: incident.status,
    sector: sanitizeSector(incident.address),
    reportedAt: incident.reported_at
      ? new Date(incident.reported_at).toISOString()
      : new Date().toISOString(),
  }));

  return {
    activeIncidents: Number(activeRow?.count || 0),
    availableUnits: Number(availableUnitsRow?.count || 0),
    onShiftUnits: Number(onShiftUnitsRow?.count || 0),
    totalIncidents: Number(totalRow?.count || 0),
    recentActivity,
    updatedAt: new Date().toISOString(),
  };
}

// ── Public Routes ─────────────────────────────────────────────────────────────

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const stats = await fetchPublicStats();
    res.json(stats);
  }),
);

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    try {
      await db.raw("SELECT 1");
      res.json({
        status: "operational",
        database: "connected",
        ok: true,
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: "degraded",
        database: "disconnected",
        ok: false,
        timestamp: new Date().toISOString(),
      });
    }
  }),
);

export default router;
