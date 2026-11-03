import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { db } from "../../db.js";
import { calculateRouteEta, isValidCoordinate } from "../../utils/routing.js";
import { getTopAmbulanceRecommendations } from "./recommendation.js";

const router = Router();

// ── Citizen & Public Safe Pre-Dispatch Estimate ──────────────────────────────

router.get(
  "/estimate",
  authenticate,
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!isValidCoordinate({ lat, lng })) {
      return res.status(400).json({
        isAvailable: false,
        etaMinutes: null,
        distanceKm: null,
        message: "Invalid or missing emergency coordinates",
      });
    }

    const drivers = await db("drivers")
      .join("vehicles", "vehicles.id", "drivers.vehicle_id")
      .where("drivers.status", "available")
      .where("vehicles.status", "available")
      .whereNotNull("drivers.location_lat")
      .whereNotNull("drivers.location_lng")
      .select("drivers.location_lat", "drivers.location_lng");

    const validDrivers = drivers.filter((d) =>
      isValidCoordinate({ lat: Number(d.location_lat), lng: Number(d.location_lng) }),
    );

    if (validDrivers.length === 0) {
      return res.json({
        isAvailable: false,
        etaMinutes: null,
        distanceKm: null,
        message: "No ambulances are currently available in your sector",
      });
    }

    // Evaluate road routes to find the fastest responder
    const citizenLoc = { lat, lng };
    let best = null;

    for (const d of validDrivers) {
      const driverLoc = { lat: Number(d.location_lat), lng: Number(d.location_lng) };
      const route = await calculateRouteEta(driverLoc, citizenLoc, { includeGeometry: false });

      if (route.etaMinutes != null) {
        if (!best || route.etaMinutes < best.etaMinutes) {
          best = route;
        }
      }
    }

    if (!best) {
      return res.json({
        isAvailable: false,
        etaMinutes: null,
        distanceKm: null,
        message: "No ambulances are currently reachable",
      });
    }

    res.json({
      isAvailable: true,
      etaMinutes: best.etaMinutes,
      distanceKm: best.distanceKm,
      provider: best.provider,
    });
  }),
);

// ── Live Road Route Geometry Service ──────────────────────────────────────────

router.get(
  "/route",
  authenticate,
  asyncHandler(async (req, res) => {
    const from = { lat: Number(req.query.fromLat), lng: Number(req.query.fromLng) };
    const to = { lat: Number(req.query.toLat), lng: Number(req.query.toLng) };

    if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
      return res.status(400).json({
        distanceKm: null,
        etaMinutes: null,
        polyline: null,
        message: "Invalid or missing start/end coordinates",
      });
    }

    const route = await calculateRouteEta(from, to, { includeGeometry: true });
    res.json(route);
  }),
);

// ── Intelligent Multi-Factor Dispatch Recommendation Engine ──────────────────

router.get(
  "/recommend/:incidentId",
  authenticate,
  requireRole("dispatcher", "admin"),
  asyncHandler(async (req, res) => {
    const recommendations = await getTopAmbulanceRecommendations(db, req.params.incidentId, 3);
    res.json({ recommendations });
  }),
);

export default router;
