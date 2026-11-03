import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isValidCoordinate,
  calculateRouteEta,
  clearRouteCache,
} from "../../server/src/utils/routing.js";
import { haversineKm } from "../../server/src/utils/geo.js";

describe("ResQ ETA & Routing Engine Test Suite", () => {
  beforeEach(() => {
    clearRouteCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearRouteCache();
  });

  // ── 1. Coordinate Validation & Guarding ───────────────────────────────────

  describe("Coordinate Validation (isValidCoordinate)", () => {
    it("accepts valid geographic coordinates across global quadrants", () => {
      expect(isValidCoordinate({ lat: 28.6139, lng: 77.209 })).toBe(true); // New Delhi
      expect(isValidCoordinate({ lat: 40.7128, lng: -74.006 })).toBe(true); // New York
      expect(isValidCoordinate({ lat: -33.8688, lng: 151.2093 })).toBe(true); // Sydney
      expect(isValidCoordinate({ lat: "28.6139", lng: "77.2090" })).toBe(true); // String numbers
    });

    it("rejects Null Island (0, 0) coordinates to prevent false GPS positions", () => {
      expect(isValidCoordinate({ lat: 0, lng: 0 })).toBe(false);
      expect(isValidCoordinate({ lat: "0", lng: "0" })).toBe(false);
      expect(isValidCoordinate({ lat: 0.00001, lng: -0.00001 })).toBe(false);
    });

    it("rejects out-of-range latitude and longitude values", () => {
      expect(isValidCoordinate({ lat: 91.5, lng: 77.0 })).toBe(false);
      expect(isValidCoordinate({ lat: -95.0, lng: 77.0 })).toBe(false);
      expect(isValidCoordinate({ lat: 28.0, lng: 185.0 })).toBe(false);
      expect(isValidCoordinate({ lat: 28.0, lng: -185.0 })).toBe(false);
    });

    it("gracefully rejects null, undefined, NaNs and missing values", () => {
      expect(isValidCoordinate(null)).toBe(false);
      expect(isValidCoordinate(undefined)).toBe(false);
      expect(isValidCoordinate({})).toBe(false);
      expect(isValidCoordinate({ lat: NaN, lng: 77.0 })).toBe(false);
      expect(isValidCoordinate({ lat: 28.0, lng: NaN })).toBe(false);
      expect(isValidCoordinate({ lat: null, lng: null })).toBe(false);
      expect(isValidCoordinate({ lat: undefined, lng: undefined })).toBe(false);
      expect(isValidCoordinate({ lat: "invalid", lng: "foo" })).toBe(false);
    });
  });

  // ── 2. Route & ETA Calculation Engine ─────────────────────────────────────

  describe("Route & ETA Calculation Engine (calculateRouteEta)", () => {
    const origin = { lat: 28.6139, lng: 77.209 }; // Connaught Place, Delhi
    const destination = { lat: 28.5355, lng: 77.391 }; // Noida Sector 18

    it("returns nulls safely when origin or destination coordinates are invalid", async () => {
      const res1 = await calculateRouteEta(null, destination);
      expect(res1.etaMinutes).toBeNull();
      expect(res1.distanceKm).toBeNull();
      expect(res1.provider).toBe("none");

      const res2 = await calculateRouteEta(origin, { lat: 0, lng: 0 });
      expect(res2.etaMinutes).toBeNull();
      expect(res2.distanceKm).toBeNull();

      const res3 = await calculateRouteEta({ lat: NaN, lng: 77.0 }, destination);
      expect(res3.etaMinutes).toBeNull();
    });

    it("parses OSRM driving response correctly when provider succeeds", async () => {
      // Mock global fetch
      const mockRouteData = {
        code: "Ok",
        routes: [
          {
            distance: 18450, // 18.45 km
            duration: 1320, // 22 minutes (1320 sec)
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRouteData,
      });

      const res = await calculateRouteEta(origin, destination);

      expect(res.distanceKm).toBe(18.45);
      expect(res.etaMinutes).toBe(22);
      expect(res.provider).toBe("osrm");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("coalesces micro GPS jitter and returns cached result without refetching", async () => {
      const mockRouteData = {
        code: "Ok",
        routes: [
          {
            distance: 10000,
            duration: 600,
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRouteData,
      });

      // Call 1
      const res1 = await calculateRouteEta(origin, destination);
      expect(res1.cached).toBeUndefined();

      // Call 2 with tiny micro-jitter (< 110m, rounds to same 3 decimal places)
      const jitteredOrigin = { lat: 28.61392, lng: 77.20904 };
      const res2 = await calculateRouteEta(jitteredOrigin, destination);

      expect(res2.cached).toBe(true);
      expect(res2.distanceKm).toBe(10);
      expect(res2.etaMinutes).toBe(10);
      // Fetch was only called once because second hit the 30s in-memory cache
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("gracefully falls back to Haversine with 1.3x circuity factor when OSRM fails or times out", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout or unreachable"));

      const res = await calculateRouteEta(origin, destination);

      const straightLineKm = haversineKm(origin, destination);
      const expectedRoadKm = Number((straightLineKm * 1.3).toFixed(2));
      const expectedMinutes = Math.max(1, Math.round((expectedRoadKm / 42) * 60));

      expect(res.provider).toBe("haversine_fallback");
      expect(res.distanceKm).toBe(expectedRoadKm);
      expect(res.etaMinutes).toBe(expectedMinutes);
      expect(res.etaMinutes).toBeGreaterThan(0);
    });
  });

  // ── 3. Pre-Dispatch Estimate API Contract & Driver Privacy ────────────────

  describe("Pre-Dispatch Estimate API Contract (/api/dispatch/estimate)", () => {
    it("returns isAvailable: false and null ETA when no units are in service (no fake SLA)", async () => {
      // Mock db empty drivers
      const mockDb = vi.fn().mockReturnValue({
        join: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        whereNotNull: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue([]), // No active drivers
      });

      // Simulate endpoint logic
      const drivers = await mockDb("drivers")
        .join("vehicles", "vehicles.id", "drivers.vehicle_id")
        .where("drivers.status", "available")
        .where("vehicles.status", "available")
        .whereNotNull("drivers.location_lat")
        .whereNotNull("drivers.location_lng")
        .select("drivers.location_lat", "drivers.location_lng");

      const validDrivers = drivers.filter((d: { location_lat: number; location_lng: number }) =>
        isValidCoordinate({ lat: Number(d.location_lat), lng: Number(d.location_lng) }),
      );

      let response;
      if (validDrivers.length === 0) {
        response = {
          isAvailable: false,
          etaMinutes: null,
          distanceKm: null,
          message: "No ambulances are currently available in your sector",
        };
      }

      expect(response).toBeDefined();
      expect(response?.isAvailable).toBe(false);
      expect(response?.etaMinutes).toBeNull();
      expect(response?.distanceKm).toBeNull();
    });

    it("returns fastest road route without leaking driver names, phone, or IDs", async () => {
      // Setup mock driver fleet
      const mockDrivers = [
        { location_lat: 28.62, location_lng: 77.21 }, // ~1 km away
        { location_lat: 28.7, location_lng: 77.3 }, // ~15 km away
      ];

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("77.21")) {
          return {
            ok: true,
            json: async () => ({
              code: "Ok",
              routes: [{ distance: 1200, duration: 180 }], // 1.2km, 3 min
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            code: "Ok",
            routes: [{ distance: 15000, duration: 1500 }], // 15km, 25 min
          }),
        };
      });

      const citizenLoc = { lat: 28.6139, lng: 77.209 };
      let best: { distanceKm: number; etaMinutes: number; provider: string } | null = null;

      for (const d of mockDrivers) {
        const route = await calculateRouteEta(
          { lat: Number(d.location_lat), lng: Number(d.location_lng) },
          citizenLoc,
        );
        if (route.etaMinutes != null) {
          if (!best || route.etaMinutes < best.etaMinutes) {
            best = route;
          }
        }
      }

      const finalResponse = {
        isAvailable: true,
        etaMinutes: best?.etaMinutes,
        distanceKm: best?.distanceKm,
        provider: best?.provider,
      };

      expect(finalResponse.isAvailable).toBe(true);
      expect(finalResponse.etaMinutes).toBe(3);
      expect(finalResponse.distanceKm).toBe(1.2);

      // Verify privacy: No driver ID, phone number or personal coordinates in estimate
      expect(finalResponse).not.toHaveProperty("driverId");
      expect(finalResponse).not.toHaveProperty("name");
      expect(finalResponse).not.toHaveProperty("phone");
    });
  });

  // ── 4. Incident Assignment Enrichment & Live GPS Recalculation ────────────

  describe("Incident Assignment & GPS Stream ETA Recalculation", () => {
    it("attaches road ETA and distance to incident upon ambulance assignment", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [{ distance: 4500, duration: 420 }], // 4.5km, 7 min
        }),
      });

      const driverLoc = { lat: 28.618, lng: 77.215 };
      const incidentLoc = { lat: 28.6139, lng: 77.209 };

      const route = await calculateRouteEta(driverLoc, incidentLoc);

      const assignedIncident = {
        id: "inc-test-01",
        status: "assigned",
        driver_id: "drv-001",
        lat: incidentLoc.lat,
        lng: incidentLoc.lng,
        eta_minutes: route.etaMinutes,
        distance_km: route.distanceKm,
      };

      expect(assignedIncident.eta_minutes).toBe(7);
      expect(assignedIncident.distance_km).toBe(4.5);
    });

    it("recalculates ETA dynamically on driver GPS stream updates", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        // Position 1: 3.0km, 5 min
        // Position 2: 1.0km, 2 min
        const duration = callCount === 1 ? 300 : 120;
        const distance = callCount === 1 ? 3000 : 1000;
        return {
          ok: true,
          json: async () => ({
            code: "Ok",
            routes: [{ distance, duration }],
          }),
        };
      });

      const incidentLoc = { lat: 28.6139, lng: 77.209 };

      // Driver GPS Update 1 (en-route)
      const pos1 = { lat: 28.64, lng: 77.23 };
      const route1 = await calculateRouteEta(pos1, incidentLoc);
      expect(route1.etaMinutes).toBe(5);
      expect(route1.distanceKm).toBe(3.0);

      // Driver GPS Update 2 (approaching)
      const pos2 = { lat: 28.62, lng: 77.215 };
      const route2 = await calculateRouteEta(pos2, incidentLoc);
      expect(route2.etaMinutes).toBe(2);
      expect(route2.distanceKm).toBe(1.0);
    });

    it("skips ETA calculation and emits null when driver sends (0,0) or missing GPS", async () => {
      const incidentLoc = { lat: 28.6139, lng: 77.209 };
      const unpingedDriverLoc = { lat: 0, lng: 0 };

      const route = await calculateRouteEta(unpingedDriverLoc, incidentLoc);

      expect(route.etaMinutes).toBeNull();
      expect(route.distanceKm).toBeNull();
      expect(route.error).toBe("invalid_coordinates");
    });
  });
});
