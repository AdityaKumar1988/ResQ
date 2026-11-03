import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isValidCoordinate,
  calculateRouteEta,
  geojsonToLeaflet,
  hasSignificantMovement,
  isDeviatedFromRoute,
  distanceMeters,
  clearRouteCache,
} from "../../server/src/utils/routing.js";
import {
  meetsMandatoryCapabilities,
  scoreAmbulanceRecommendation,
  getTopAmbulanceRecommendations,
  VEHICLE_CAPABILITIES,
} from "../../server/src/modules/dispatch/recommendation.js";

describe("ResQ Phase 4 – Road-Level Navigation & Intelligent Dispatch Suite", () => {
  beforeEach(() => {
    clearRouteCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearRouteCache();
  });

  // ── 1. Road Geometry & Leaflet Conversion ─────────────────────────────────

  describe("Road Route Geometry & Coordinate Ordering", () => {
    it("converts GeoJSON [lng, lat] LineString into Leaflet [lat, lng] format", () => {
      // GeoJSON order is [longitude, latitude]
      const geojsonLine = [
        [77.209, 28.6139],
        [77.215, 28.618],
        [77.221, 28.622],
      ];

      const leafletPolyline = geojsonToLeaflet(geojsonLine);

      expect(leafletPolyline).toHaveLength(3);
      // In Leaflet format: index 0 is latitude, index 1 is longitude
      expect(leafletPolyline[0]).toEqual([28.6139, 77.209]);
      expect(leafletPolyline[1]).toEqual([28.618, 77.215]);
      expect(leafletPolyline[2]).toEqual([28.622, 77.221]);
    });

    it("filters out invalid nodes and Null Island coordinates in GeoJSON input", () => {
      const dirtyGeojson = [
        [77.209, 28.6139],
        [0, 0], // Null Island
        [NaN, 28.618], // NaN
        [77.221, 28.622],
      ];

      const cleanPolyline = geojsonToLeaflet(dirtyGeojson);
      expect(cleanPolyline).toHaveLength(2);
      expect(cleanPolyline[0]).toEqual([28.6139, 77.209]);
      expect(cleanPolyline[1]).toEqual([28.622, 77.221]);
    });

    it("parses OSRM driving response into distance, duration, and road polyline", async () => {
      const mockOsrmResponse = {
        code: "Ok",
        routes: [
          {
            distance: 4200, // 4.2 km
            duration: 360, // 6 minutes (360s)
            geometry: {
              type: "LineString",
              coordinates: [
                [77.209, 28.6139],
                [77.212, 28.615],
                [77.218, 28.619],
                [77.224, 28.625],
              ],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOsrmResponse,
      });

      const origin = { lat: 28.6139, lng: 77.209 };
      const dest = { lat: 28.625, lng: 77.224 };

      const res = await calculateRouteEta(origin, dest, { includeGeometry: true });

      expect(res.provider).toBe("osrm");
      expect(res.distanceKm).toBe(4.2);
      expect(res.etaMinutes).toBe(6);
      expect(res.polyline).toBeDefined();
      expect(res.polyline).toHaveLength(4);
      // First point is [lat, lng]
      expect(res.polyline[0]).toEqual([28.6139, 77.209]);
      expect(res.polyline[3]).toEqual([28.625, 77.224]);
    });

    it("never returns a fake straight-line road route when OSRM fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("OSRM service unreachable"));

      const origin = { lat: 28.6139, lng: 77.209 };
      const dest = { lat: 28.625, lng: 77.224 };

      const res = await calculateRouteEta(origin, dest, { includeGeometry: true });

      expect(res.provider).toBe("haversine_fallback");
      expect(res.etaMinutes).toBeGreaterThan(0);
      expect(res.distanceKm).toBeGreaterThan(0);
      // Per specification: Must NOT generate fake straight-line polyline!
      expect(res.polyline).toBeNull();
    });
  });

  // ── 2. Movement Thresholds & Route Recalculation ───────────────────────────

  describe("Movement Thresholds & Deviation Checking", () => {
    it("hasSignificantMovement detects movement above 35 meters", () => {
      const locA = { lat: 28.6139, lng: 77.209 };
      // Move ~10 meters (0.0001 deg lat is ~11.1 meters)
      const locSmall = { lat: 28.61398, lng: 77.209 };
      expect(hasSignificantMovement(locA, locSmall, 35)).toBe(false);

      // Move ~60 meters
      const locLarge = { lat: 28.61445, lng: 77.209 };
      expect(hasSignificantMovement(locA, locLarge, 35)).toBe(true);
    });

    it("isDeviatedFromRoute detects when ambulance has veered off road path", () => {
      const routePolyline = [
        [28.6139, 77.209],
        [28.615, 77.212],
        [28.619, 77.218],
      ];

      // Point directly on/near the road route (~5m away)
      const onRoute = { lat: 28.61502, lng: 77.21202 };
      expect(isDeviatedFromRoute(onRoute, routePolyline, 80)).toBe(false);

      // Point far away from route (~300m away)
      const offRoute = { lat: 28.618, lng: 77.205 };
      expect(isDeviatedFromRoute(offRoute, routePolyline, 80)).toBe(true);
    });
  });

  // ── 3. Intelligent Dispatch Recommendation Engine ─────────────────────────

  describe("Intelligent Multi-Factor Dispatch Optimization", () => {
    it("enforces mandatory medical capabilities (BLS rejected for P1 Critical)", () => {
      // P1 Critical demands minimum Tier 2 (ALS, ICU, or MICU)
      expect(meetsMandatoryCapabilities("MICU", "P1")).toBe(true);
      expect(meetsMandatoryCapabilities("ICU", "P1")).toBe(true);
      expect(meetsMandatoryCapabilities("ALS", "P1")).toBe(true);
      // BLS cannot handle P1 cardiac / severe trauma
      expect(meetsMandatoryCapabilities("BLS", "P1")).toBe(false);

      // P2, P3, P4 allow BLS
      expect(meetsMandatoryCapabilities("BLS", "P2")).toBe(true);
      expect(meetsMandatoryCapabilities("BLS", "P3")).toBe(true);
      expect(meetsMandatoryCapabilities("BLS", "P4")).toBe(true);
    });

    it("calculates multi-factor score and explainable rationale", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [
            {
              distance: 2500, // 2.5 km
              duration: 240, // 4 min
              geometry: {
                type: "LineString",
                coordinates: [
                  [77.209, 28.6139],
                  [77.22, 28.625],
                ],
              },
            },
          ],
        }),
      });

      const driver = {
        id: "drv-101",
        name: "Officer Smith",
        call_sign: "AMB-101",
        vehicle_id: "veh-101",
        vehicle_plate: "EMS-9901",
        vehicle_model: "Sprinter",
        vehicle_type: "ALS",
        rating: 4.85,
        missions_completed: 40,
        missions_active: 0,
        location_lat: 28.6139,
        location_lng: 77.209,
        last_ping_at: new Date(Date.now() - 30_000).toISOString(), // 30s ago
      };

      const incident = {
        id: "inc-101",
        priority: "P1",
        type: "cardiac",
        lat: 28.625,
        lng: 77.22,
      };

      const rec = await scoreAmbulanceRecommendation(driver, incident);

      expect(rec.driverId).toBe("drv-101");
      expect(rec.vehicleType).toBe("ALS");
      expect(rec.etaMinutes).toBe(4);
      expect(rec.distanceKm).toBe(2.5);
      expect(rec.score).toBeGreaterThan(80);
      expect(rec.polyline).toBeDefined();

      // Check explainable rationale
      expect(rec.reasons).toHaveLength(4);
      expect(rec.reasons[0]).toContain("Road ETA ~4 min");
      expect(rec.reasons[1]).toContain("ALS Certified");
      expect(rec.reasons[2]).toContain("4.85★");
      expect(rec.reasons[3]).toContain("Fresh telemetry");
    });

    it("ranks available ambulances and excludes busy or stale units", async () => {
      // Mock db implementation
      const incidentId = "inc-p1-test";
      const mockIncident = {
        id: incidentId,
        priority: "P1",
        type: "cardiac",
        lat: 28.62,
        lng: 77.22,
      };

      const mockDriversInDb = [
        {
          id: "drv-als-close",
          status: "available",
          vehicle_type: "ALS",
          location_lat: 28.621,
          location_lng: 77.221, // ~200m away
          rating: 4.9,
          missions_completed: 50,
          missions_active: 0,
          last_ping_at: new Date(Date.now() - 20_000).toISOString(),
        },
        {
          id: "drv-micu-mid",
          status: "available",
          vehicle_type: "MICU",
          location_lat: 28.63,
          location_lng: 77.23, // ~2km away
          rating: 4.7,
          missions_completed: 30,
          missions_active: 0,
          last_ping_at: new Date(Date.now() - 40_000).toISOString(),
        },
        {
          id: "drv-bls-close",
          status: "available",
          vehicle_type: "BLS", // BLS is disqualified for P1 cardiac!
          location_lat: 28.6205,
          location_lng: 77.2205,
          rating: 5.0,
          missions_completed: 100,
          last_ping_at: new Date().toISOString(),
        },
        {
          id: "drv-stale-gps",
          status: "available",
          vehicle_type: "ALS",
          location_lat: 28.622,
          location_lng: 77.222,
          last_ping_at: new Date(Date.now() - 25 * 60_000).toISOString(), // 25 min stale!
        },
      ];

      const mockDb = vi.fn().mockImplementation((table: string) => {
        if (table === "incidents") {
          return {
            where: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockIncident),
            }),
          };
        }
        if (table === "drivers") {
          return {
            join: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            whereNotNull: vi.fn().mockReturnThis(),
            select: vi.fn().mockResolvedValue(mockDriversInDb),
          };
        }
        return {};
      });

      // Route mock
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [
            { distance: 1500, duration: 180, geometry: { type: "LineString", coordinates: [] } },
          ],
        }),
      });

      const recs = await getTopAmbulanceRecommendations(mockDb, incidentId, 3);

      // BLS was disqualified for P1; stale unit was disqualified; exactly 2 qualify
      expect(recs).toHaveLength(2);
      expect(recs.map((r: { driverId: string }) => r.driverId)).toContain("drv-als-close");
      expect(recs.map((r: { driverId: string }) => r.driverId)).toContain("drv-micu-mid");
      expect(recs.map((r: { driverId: string }) => r.driverId)).not.toContain("drv-bls-close");
      expect(recs.map((r: { driverId: string }) => r.driverId)).not.toContain("drv-stale-gps");
    });
  });
});
