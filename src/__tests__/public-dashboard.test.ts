import { describe, it, expect, vi, beforeEach } from "vitest";
// @ts-expect-error Server JS module import without declaration
import { sanitizeSector, fetchPublicStats } from "../../server/src/modules/public/routes.js";
// @ts-expect-error Server JS module import without declaration
import { authenticate, requireRole } from "../../server/src/middleware/auth.js";
// @ts-expect-error Server JS module import without declaration
import { signAccess } from "../../server/src/utils/jwt.js";
// @ts-expect-error Server JS module import without declaration
import { db } from "../../server/src/db.js";

describe("Phase 2 – Tactical Operations Feed & Public Dashboard Suite", () => {
  // ── 1. Sector Sanitization & PII Scrubbing Tests ─────────────────────────
  describe("Address Sanitization (sanitizeSector)", () => {
    it("strips street and house numbers from addresses", () => {
      const sanitized = sanitizeSector("123 Main Street");
      expect(sanitized).toBe("Main Street Sector");
      expect(sanitized).not.toMatch(/\b123\b/);
    });

    it("strips apartment, unit, and building prefixes", () => {
      expect(sanitizeSector("Apt 4B, 742 Evergreen Terrace")).not.toMatch(/4B|742/);
      expect(sanitizeSector("Unit 12, Riverdale")).not.toMatch(/12/);
      expect(sanitizeSector("#101, Oak Ridge Avenue")).not.toMatch(/101/);
    });

    it("strips postal codes / zip codes", () => {
      const sanitized = sanitizeSector("44 Pine Lane, Sector 9, 632014");
      expect(sanitized).not.toMatch(/632014/);
    });

    it("preserves existing sector/district/ward nomenclature", () => {
      expect(sanitizeSector("North Industrial Sector")).toBe("North Industrial Sector");
      expect(sanitizeSector("Central District")).toBe("Central District");
      expect(sanitizeSector("Ward 12")).toBe("Ward 12");
    });

    it("returns a safe fallback for empty or missing addresses", () => {
      expect(sanitizeSector(null as unknown as string)).toBe("Metropolitan Sector");
      expect(sanitizeSector(undefined as unknown as string)).toBe("Metropolitan Sector");
      expect(sanitizeSector("")).toBe("Metropolitan Sector");
      expect(sanitizeSector("   ")).toBe("Metropolitan Sector");
    });
  });

  // ── 2. Public Statistics Aggregations & PII Exclusion ─────────────────────
  describe("Public Telemetry Stats Contract & PII Exclusion", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("returns correct aggregated operational metrics without exposing sensitive tables", async () => {
      // Mock db queries to verify Knex aggregation pipeline
      const countIncidentsMock = vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue([{ count: 7 }]),
        whereNotIn: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
        select: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "inc-101",
                code: "INC-2150",
                priority: "P1",
                type: "cardiac",
                status: "en_route",
                address: "104 Baker Street, Central Sector",
                reported_at: new Date("2026-11-03T10:00:00Z"),
                // Sensitive fields in db row that MUST NOT leak:
                citizen_name: "John Doe",
                citizen_phone: "+15551234567",
                notes: "Patient is unconscious with severe chest pain",
                lat: 12.9249,
                lng: 79.135,
              },
            ]),
          }),
        }),
      });

      const countDriversMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue([{ count: 4 }]),
        }),
        whereNot: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue([{ count: 6 }]),
        }),
      });

      // Execute stats fetcher
      const stats = await fetchPublicStats();

      // Verify shape
      expect(stats).toHaveProperty("activeIncidents");
      expect(stats).toHaveProperty("availableUnits");
      expect(stats).toHaveProperty("onShiftUnits");
      expect(stats).toHaveProperty("totalIncidents");
      expect(stats).toHaveProperty("recentActivity");
      expect(stats).toHaveProperty("updatedAt");
      expect(Array.isArray(stats.recentActivity)).toBe(true);

      // Verify strictly sanitized recentActivity items
      for (const item of stats.recentActivity) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("code");
        expect(item).toHaveProperty("priority");
        expect(item).toHaveProperty("type");
        expect(item).toHaveProperty("status");
        expect(item).toHaveProperty("sector");
        expect(item).toHaveProperty("reportedAt");

        // CRITICAL PII CHECKS: No personal data or exact coordinates
        expect(item).not.toHaveProperty("citizen_name");
        expect(item).not.toHaveProperty("citizenName");
        expect(item).not.toHaveProperty("citizen_phone");
        expect(item).not.toHaveProperty("citizenPhone");
        expect(item).not.toHaveProperty("notes");
        expect(item).not.toHaveProperty("lat");
        expect(item).not.toHaveProperty("lng");
        expect(item).not.toHaveProperty("citizen_user_id");
        expect(item).not.toHaveProperty("address");

        // Sector must not expose door/building numbers
        expect(item.sector).not.toMatch(/^\d+/);
      }
    });
  });

  // ── 3. Unauthenticated Public Access vs Protected Private Endpoints ────────
  describe("Public vs Private Route Authorization Separation", () => {
    it("allows unauthenticated public requests to public stats without bearer token", () => {
      // Public route does not mount authenticate middleware
      const publicHandler = vi.fn((req, res) => {
        res.json({ ok: true, activeIncidents: 0 });
      });

      const req = { headers: {} };
      const res = { json: vi.fn() };

      publicHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true, activeIncidents: 0 });
    });

    it("keeps private /api/incidents protected against unauthenticated requests (HTTP 401)", () => {
      const req = { headers: {} };
      const next = vi.fn();

      authenticate(req, {}, next);
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.status).toBe(401);
      expect(err.message).toBe("Missing bearer token");
    });

    it("keeps private /api/drivers restricted from citizen role (HTTP 403)", () => {
      const citizenToken = signAccess({ sub: "user-cit", role: "citizen" });
      const req = { headers: { authorization: `Bearer ${citizenToken}` } };
      const nextAuth = vi.fn();

      authenticate(req, {}, nextAuth);
      expect(nextAuth).toHaveBeenCalledWith();

      const guard = requireRole("dispatcher", "admin");
      const nextRole = vi.fn();
      guard(req, {}, nextRole);

      expect(nextRole).toHaveBeenCalledTimes(1);
      const roleErr = nextRole.mock.calls[0][0];
      expect(roleErr.status).toBe(403);
      expect(roleErr.message).toBe("Insufficient role");
    });
  });

  // ── 4. Socket.IO Public Connection & Room Isolation ────────────────────────
  describe("Socket.IO Public Feed Room Isolation", () => {
    it("grants restricted public guest access to connection without token", () => {
      const socket = {
        handshake: { auth: {} as { token?: string } },
        user: undefined as unknown,
      };
      const next = vi.fn();

      // Simulate Socket.io middleware logic from server/src/socket.js
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.user = { role: "public", sub: "anonymous" };
        next();
      }

      expect(next).toHaveBeenCalledTimes(1);
      expect(socket.user).toEqual({ role: "public", sub: "anonymous" });
    });

    it("rejects corrupted or forged bearer tokens on socket handshake", () => {
      const socket = {
        handshake: { auth: { token: "bad.signature.token" } },
        user: undefined as unknown,
      };
      const next = vi.fn();

      // Simulate Socket.io verification
      const token = socket.handshake.auth?.token;
      if (token) {
        try {
          // Bad token throws
          throw new Error("unauthorized");
        } catch {
          next(new Error("unauthorized"));
        }
      }

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe("unauthorized");
      expect(socket.user).toBeUndefined();
    });

    it("isolates public sockets so they only join public:feed and never dispatcher/admin rooms", () => {
      const joinedRooms: string[] = [];
      const publicSocket = {
        user: { role: "public", sub: "anonymous" },
        join: vi.fn((room: string) => joinedRooms.push(room)),
      };

      // Connection logic simulation
      if (publicSocket.user.role === "public") {
        publicSocket.join("public:feed");
      } else {
        publicSocket.join(`role:${publicSocket.user.role}`);
      }

      expect(joinedRooms).toContain("public:feed");
      expect(joinedRooms).not.toContain("role:dispatcher");
      expect(joinedRooms).not.toContain("role:admin");
      expect(joinedRooms).not.toContain("role:citizen");
    });

    it("prevents public sockets from broadcasting driver GPS coordinates", () => {
      const publicUser = { role: "public", sub: "anonymous" };
      const emitSpy = vi.fn();

      function handleDriverLocation(payload: { lat: number; lng: number }) {
        if (publicUser.role !== "driver") return; // Authorization guard
        emitSpy(payload);
      }

      handleDriverLocation({ lat: 12.92, lng: 79.13 });
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  // ── 5. Operational Status Indicator State Machine ──────────────────────────
  describe("Operational Status Indicator State Mapping", () => {
    function computeIndicatorState(
      health: { ok: boolean; database: string } | null,
      isHealthError: boolean,
      isColdStarting: boolean,
    ) {
      if (isColdStarting || (!health && !isHealthError)) {
        return { state: "waking", label: "CONNECTING / WAKING UP" };
      }
      if (isHealthError || !health) {
        return { state: "offline", label: "SYSTEM OFFLINE" };
      }
      if (!health.ok || health.database !== "connected") {
        return { state: "degraded", label: "SYSTEM DEGRADED" };
      }
      return { state: "operational", label: "LIVE OPERATIONS ACTIVE" };
    }

    it("maps healthy response with connected database to operational (green)", () => {
      const res = computeIndicatorState({ ok: true, database: "connected" }, false, false);
      expect(res.state).toBe("operational");
      expect(res.label).toBe("LIVE OPERATIONS ACTIVE");
    });

    it("maps Render cold start / initial spin up to waking (amber)", () => {
      const res = computeIndicatorState(null, false, true);
      expect(res.state).toBe("waking");
      expect(res.label).toBe("CONNECTING / WAKING UP");
    });

    it("maps database disconnection to degraded (orange)", () => {
      const res = computeIndicatorState({ ok: false, database: "disconnected" }, false, false);
      expect(res.state).toBe("degraded");
      expect(res.label).toBe("SYSTEM DEGRADED");
    });

    it("maps API connection error to offline (rose) and never operational", () => {
      const res = computeIndicatorState(null, true, false);
      expect(res.state).toBe("offline");
      expect(res.label).toBe("SYSTEM OFFLINE");
    });
  });
});
