import { Router } from "express";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { haversineKm, etaMinutes } from "../../utils/geo.js";

const router = Router();
router.use(authenticate, requireRole("dispatcher", "admin"));

// Smart recommendation: rank available drivers for an incident.
router.get(
  "/recommend/:incidentId",
  asyncHandler(async (req, res) => {
    const incident = await db("incidents").where({ id: req.params.incidentId }).first();
    if (!incident) throw new HttpError(404, "Incident not found");

    const drivers = await db("drivers")
      .join("vehicles", "vehicles.id", "drivers.vehicle_id")
      .where("drivers.status", "available")
      .where("vehicles.status", "available")
      .whereNotNull("drivers.location_lat")
      .select("drivers.*");

    const scored = drivers
      .map((d) => {
        const distanceKm = haversineKm(
          { lat: Number(d.location_lat), lng: Number(d.location_lng) },
          { lat: Number(incident.lat), lng: Number(incident.lng) },
        );
        const eta = etaMinutes(distanceKm);
        // Composite score: closer + higher rating + lower workload = better.
        const workload = Number(d.missions_active || 0);
        const rating = Number(d.rating || 4.5);
        const score = 100 - distanceKm * 8 - workload * 5 + (rating - 4.5) * 20 - eta * 1.5;
        const reasons = [
          `${distanceKm.toFixed(1)} km away`,
          `ETA ~${eta} min`,
          `Rating ${rating.toFixed(2)}`,
        ];
        return {
          driverId: d.id,
          score: Number(score.toFixed(2)),
          distanceKm: Number(distanceKm.toFixed(2)),
          etaMinutes: eta,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({ recommendations: scored });
  }),
);

export default router;
