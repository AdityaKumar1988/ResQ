import { describe, it, expect, vi, beforeEach } from "vitest";
// @ts-expect-error Server JS module import without declaration
import { authenticate, requireRole } from "../../server/src/middleware/auth.js";
// @ts-expect-error Server JS module import without declaration
import { signAccess } from "../../server/src/utils/jwt.js";
// @ts-expect-error Server JS module import without declaration
import { HttpError } from "../../server/src/utils/httpError.js";

describe("Phase 1 Security & RBAC Authorization Suite", () => {
  const citizenPayload = { sub: "user-cit-001", role: "citizen", email: "citizen@test.local" };
  const driverPayload = { sub: "user-drv-002", role: "driver", email: "driver@test.local" };
  const dispatcherPayload = {
    sub: "user-dsp-003",
    role: "dispatcher",
    email: "dispatch@test.local",
  };
  const adminPayload = { sub: "user-adm-004", role: "admin", email: "admin@test.local" };

  let citizenToken: string;
  let driverToken: string;
  let dispatcherToken: string;
  let adminToken: string;

  beforeEach(() => {
    citizenToken = signAccess(citizenPayload);
    driverToken = signAccess(driverPayload);
    dispatcherToken = signAccess(dispatcherPayload);
    adminToken = signAccess(adminPayload);
  });

  // ── Authentication Middleware Tests ──────────────────────────────────────────

  describe("Authentication Gate (authenticate)", () => {
    it("rejects unauthenticated requests without authorization header (HTTP 401)", () => {
      const req = { headers: {} };
      const next = vi.fn();

      authenticate(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(401);
      expect(err.message).toBe("Missing bearer token");
    });

    it("rejects requests with malformed or invalid token (HTTP 401)", () => {
      const req = { headers: { authorization: "Bearer invalid.token.garbage" } };
      const next = vi.fn();

      authenticate(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(401);
      expect(err.message).toBe("Invalid or expired token");
    });

    it("accepts valid bearer token and injects user identity into req.user", () => {
      const req = { headers: { authorization: `Bearer ${dispatcherToken}` } };
      const next = vi.fn();

      authenticate(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(req).toHaveProperty("user");
      expect((req as unknown as { user: { role: string; sub: string } }).user.role).toBe(
        "dispatcher",
      );
      expect((req as unknown as { user: { role: string; sub: string } }).user.sub).toBe(
        "user-dsp-003",
      );
    });
  });

  // ── Driver Directory Authorization Tests ─────────────────────────────────────

  describe("Driver Directory RBAC (GET /api/drivers)", () => {
    const driverDirectoryGuard = requireRole("dispatcher", "admin");

    it("blocks Citizen role from accessing the driver directory (HTTP 403 Forbidden)", () => {
      const req = { user: citizenPayload };
      const next = vi.fn();

      driverDirectoryGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(403);
      expect(err.message).toBe("Insufficient role");
    });

    it("blocks Driver role from accessing administrative driver directory (HTTP 403 Forbidden)", () => {
      const req = { user: driverPayload };
      const next = vi.fn();

      driverDirectoryGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(403);
      expect(err.message).toBe("Insufficient role");
    });

    it("allows Dispatcher role to access driver directory (HTTP 200 OK)", () => {
      const req = { user: dispatcherPayload };
      const next = vi.fn();

      driverDirectoryGuard(req, {}, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("allows Admin role to access driver directory (HTTP 200 OK)", () => {
      const req = { user: adminPayload };
      const next = vi.fn();

      driverDirectoryGuard(req, {}, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("blocks unauthenticated access before role check (HTTP 401)", () => {
      const req = { user: undefined };
      const next = vi.fn();

      driverDirectoryGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(401);
      expect(err.message).toBe("Unauthenticated");
    });
  });

  // ── Driver Self-Management Tests ─────────────────────────────────────────────

  describe("Driver Self-Management RBAC (/api/drivers/me)", () => {
    const driverSelfGuard = requireRole("driver");

    it("permits Driver role to access their own profile (GET /api/drivers/me)", () => {
      const req = { user: driverPayload };
      const next = vi.fn();

      driverSelfGuard(req, {}, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("blocks Citizen role from driver self-management endpoints (HTTP 403 Forbidden)", () => {
      const req = { user: citizenPayload };
      const next = vi.fn();

      driverSelfGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(403);
      expect(err.message).toBe("Insufficient role");
    });

    it("blocks Citizen role from posting driver GPS coordinates (POST /me/location -> 403)", () => {
      const req = { user: citizenPayload };
      const next = vi.fn();

      driverSelfGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
    });

    it("blocks Citizen role from patching driver status (PATCH /me/status -> 403)", () => {
      const req = { user: citizenPayload };
      const next = vi.fn();

      driverSelfGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
    });
  });

  // ── Fleet Vehicles Authorization Tests ───────────────────────────────────────

  describe("Vehicle Fleet RBAC (GET /api/vehicles)", () => {
    const vehicleFleetGuard = requireRole("admin", "dispatcher");

    it("blocks Citizen from querying full vehicle fleet (HTTP 403 Forbidden)", () => {
      const req = { user: citizenPayload };
      const next = vi.fn();

      vehicleFleetGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
    });

    it("blocks Driver from querying full vehicle fleet (HTTP 403 Forbidden)", () => {
      const req = { user: driverPayload };
      const next = vi.fn();

      vehicleFleetGuard(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
    });

    it("allows Dispatcher to query vehicle fleet", () => {
      const req = { user: dispatcherPayload };
      const next = vi.fn();

      vehicleFleetGuard(req, {}, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("allows Admin to query vehicle fleet", () => {
      const req = { user: adminPayload };
      const next = vi.fn();

      vehicleFleetGuard(req, {}, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  // ── End-to-End Pipeline Simulated Chain ──────────────────────────────────────

  describe("End-to-End Middleware Pipeline Simulation", () => {
    const driverDirectoryPipeline = [authenticate, requireRole("dispatcher", "admin")];

    it("complete pipeline: unauthenticated request -> 401 Unauthorized", () => {
      const req = { headers: {} };
      let finalReached = false;
      let errorThrown: HttpError | null = null;

      const next = (err?: HttpError) => {
        if (err) {
          errorThrown = err;
          return;
        }
        driverDirectoryPipeline[1](req, {}, (err2?: HttpError) => {
          if (err2) errorThrown = err2;
          else finalReached = true;
        });
      };

      driverDirectoryPipeline[0](req, {}, next);

      expect(finalReached).toBe(false);
      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.status).toBe(401);
    });

    it("complete pipeline: Citizen request with valid token -> 403 Forbidden", () => {
      const req = { headers: { authorization: `Bearer ${citizenToken}` } };
      let finalReached = false;
      let errorThrown: HttpError | null = null;

      const next = (err?: HttpError) => {
        if (err) {
          errorThrown = err;
          return;
        }
        driverDirectoryPipeline[1](req, {}, (err2?: HttpError) => {
          if (err2) errorThrown = err2;
          else finalReached = true;
        });
      };

      driverDirectoryPipeline[0](req, {}, next);

      expect(finalReached).toBe(false);
      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.status).toBe(403);
    });

    it("complete pipeline: Dispatcher request with valid token -> passes all guards", () => {
      const req = { headers: { authorization: `Bearer ${dispatcherToken}` } };
      let finalReached = false;
      let errorThrown: HttpError | null = null;

      const next = (err?: HttpError) => {
        if (err) {
          errorThrown = err;
          return;
        }
        driverDirectoryPipeline[1](req, {}, (err2?: HttpError) => {
          if (err2) errorThrown = err2;
          else finalReached = true;
        });
      };

      driverDirectoryPipeline[0](req, {}, next);

      expect(finalReached).toBe(true);
      expect(errorThrown).toBeNull();
    });
  });
});
