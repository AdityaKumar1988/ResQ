import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { emit } from "../../socket.js";

const router = Router();
router.use(authenticate);

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
});

function normalizeDriver(d) {
  if (!d) return null;
  return {
    ...d,
    name: d.user_name || d.name || d.call_sign || "Driver",
    phone: d.user_phone || d.phone || null,
    rating: Number(d.rating != null ? d.rating : 4.7),
    missions_completed: Number(d.missions_completed != null ? d.missions_completed : 0),
    missions_active: Number(d.missions_active != null ? d.missions_active : 0),
    avg_response_sec: Number(d.avg_response_sec != null ? d.avg_response_sec : 480),
    location_lat: d.location_lat != null ? Number(d.location_lat) : null,
    location_lng: d.location_lng != null ? Number(d.location_lng) : null,
    heading: Number(d.heading != null ? d.heading : 0),
  };
}

// Operational driver directory: accessible ONLY to dispatchers and administrators
router.get(
  "/",
  requireRole("dispatcher", "admin"),
  asyncHandler(async (_req, res) => {
    const drivers = await db("drivers")
      .leftJoin("users", "users.id", "drivers.user_id")
      .select("drivers.*", "users.name as user_name", "users.phone as user_phone");
    res.json({ drivers: drivers.map(normalizeDriver) });
  }),
);

// Driver's own profile: accessible ONLY to the authenticated driver
router.get(
  "/me",
  requireRole("driver"),
  asyncHandler(async (req, res) => {
    const driver = await db("drivers")
      .leftJoin("users", "users.id", "drivers.user_id")
      .where({ "drivers.user_id": req.user.sub })
      .select("drivers.*", "users.name as user_name", "users.phone as user_phone")
      .first();
    res.json({ driver: normalizeDriver(driver) });
  }),
);

// Single driver lookup with strict RBAC scoping:
// Dispatcher/Admin: full lookup.
// Driver: self only.
// Citizen: only if the driver is assigned to an active emergency belonging to the citizen.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.user.role === "dispatcher" || req.user.role === "admin") {
      const driver = await db("drivers")
        .leftJoin("users", "users.id", "drivers.user_id")
        .where("drivers.id", req.params.id)
        .select("drivers.*", "users.name as user_name", "users.phone as user_phone")
        .first();
      if (!driver) throw new HttpError(404, "Driver not found");
      return res.json({ driver: normalizeDriver(driver) });
    }

    if (req.user.role === "driver") {
      const driver = await db("drivers")
        .leftJoin("users", "users.id", "drivers.user_id")
        .where({ "drivers.id": req.params.id, "drivers.user_id": req.user.sub })
        .select("drivers.*", "users.name as user_name", "users.phone as user_phone")
        .first();
      if (!driver) throw new HttpError(403, "Access denied");
      return res.json({ driver: normalizeDriver(driver) });
    }

    if (req.user.role === "citizen") {
      const assignedIncident = await db("incidents")
        .where({
          driver_id: req.params.id,
          citizen_user_id: req.user.sub,
        })
        .whereNotIn("status", ["completed", "cancelled"])
        .first();
      if (!assignedIncident) throw new HttpError(403, "Access denied");

      const driver = await db("drivers")
        .leftJoin("users", "users.id", "drivers.user_id")
        .where("drivers.id", req.params.id)
        .select("drivers.*", "users.name as user_name", "users.phone as user_phone")
        .first();
      if (!driver) throw new HttpError(404, "Driver not found");
      return res.json({ driver: normalizeDriver(driver) });
    }

    throw new HttpError(403, "Forbidden");
  }),
);

router.post(
  "/me/location",
  requireRole("driver"),
  validate(locationSchema),
  asyncHandler(async (req, res) => {
    const { lat, lng, heading } = req.body;
    const [driver] = await db("drivers")
      .where({ user_id: req.user.sub })
      .update({
        location_lat: lat,
        location_lng: lng,
        heading: heading ?? 0,
        last_ping_at: db.fn.now(),
      })
      .returning("*");
    if (driver) {
      await db("driver_locations").insert({
        driver_id: driver.id,
        lat,
        lng,
        heading: heading ?? 0,
      });
      const user = await db("users").where({ id: req.user.sub }).first();
      const norm = normalizeDriver({
        ...driver,
        user_name: user?.name,
        user_phone: user?.phone,
      });
      await emit.driverLocation(norm, { lat, lng, heading: heading ?? 0 });
      emit.driverStatusChanged(norm);
      return res.json({ driver: norm });
    }
    res.json({ driver: null });
  }),
);

router.patch(
  "/me/status",
  requireRole("driver"),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { driver, vehicle } = await db.transaction(async (trx) => {
      const existingDriver = await trx("drivers")
        .where({ user_id: req.user.sub })
        .forUpdate()
        .first();
      if (!existingDriver) return { driver: null, vehicle: null };

      const [updatedDriver] = await trx("drivers")
        .where({ id: existingDriver.id })
        .update({
          status,
          updated_at: trx.fn.now(),
        })
        .returning("*");

      let updatedVehicle = null;
      if (existingDriver.vehicle_id) {
        const existingVehicle = await trx("vehicles")
          .where({ id: existingDriver.vehicle_id })
          .forUpdate()
          .first();
        if (existingVehicle && existingVehicle.status !== "maintenance") {
          [updatedVehicle] = await trx("vehicles")
            .where({ id: existingVehicle.id })
            .update({
              status,
              updated_at: trx.fn.now(),
            })
            .returning("*");
        }
      }

      return { driver: updatedDriver, vehicle: updatedVehicle };
    });

    if (driver) {
      const user = await db("users").where({ id: req.user.sub }).first();
      const norm = normalizeDriver({
        ...driver,
        user_name: user?.name,
        user_phone: user?.phone,
      });
      emit.driverStatusChanged(norm);
      if (vehicle) emit.fleetUpdated(vehicle);
      return res.json({ driver: norm });
    }
    res.json({ driver: null });
  }),
);

export default router;
