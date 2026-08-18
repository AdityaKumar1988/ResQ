import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { emit } from "../../socket.js";

const router = Router();
router.use(authenticate);

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const drivers = await db("drivers")
      .leftJoin("users", "users.id", "drivers.user_id")
      .select("drivers.*", "users.name as user_name", "users.phone as user_phone");
    res.json({ drivers });
  }),
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const driver = await db("drivers").where({ user_id: req.user.sub }).first();
    res.json({ driver });
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
      await emit.driverLocation(driver, { lat, lng, heading: heading ?? 0 });
      emit.driverStatusChanged(driver);
    }
    res.json({ driver });
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

    if (driver) emit.driverStatusChanged(driver);
    if (vehicle) emit.fleetUpdated(vehicle);

    res.json({ driver });
  }),
);

export default router;
