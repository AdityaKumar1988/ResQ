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

const vehicleSchema = z.object({
  plate: z.string().min(1, "Plate number is required"),
  model: z.string().min(1, "Model is required"),
  type: z.enum(["ALS", "BLS", "ICU", "MICU"]),
  status: z
    .enum(["available", "en_route", "busy", "at_hospital", "offline", "maintenance"])
    .default("available"),
});

router.get(
  "/",
  requireRole("admin", "dispatcher"),
  asyncHandler(async (_req, res) => {
    const vehicles = await db("vehicles").select("*").orderBy("plate");
    res.json({ vehicles });
  }),
);

router.post(
  "/",
  requireRole("admin", "dispatcher"),
  validate(vehicleSchema),
  asyncHandler(async (req, res) => {
    const existing = await db("vehicles").where({ plate: req.body.plate }).first();
    if (existing) {
      throw new HttpError(409, `Vehicle with plate "${req.body.plate}" already exists`);
    }
    const [v] = await db("vehicles").insert(req.body).returning("*");
    emit.fleetUpdated(v);
    res.status(201).json({ vehicle: v });
  }),
);

router.patch(
  "/:id",
  requireRole("admin", "dispatcher"),
  asyncHandler(async (req, res) => {
    const [v] = await db("vehicles")
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning("*");
    emit.fleetUpdated(v);
    res.json({ vehicle: v });
  }),
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    await db("vehicles").where({ id: req.params.id }).del();
    res.status(204).end();
  }),
);

export default router;
