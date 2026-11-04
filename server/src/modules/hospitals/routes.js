import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { logAudit } from "../../middleware/audit.js";

const router = Router();
router.use(authenticate);

const createHospitalSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    lat: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    lng: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
    beds: z.number().int("Total beds must be an integer").min(0, "Total beds must be >= 0"),
    beds_available: z
      .number()
      .int("Available beds must be an integer")
      .min(0, "Available beds must be >= 0")
      .optional(),
    bedsAvailable: z
      .number()
      .int("Available beds must be an integer")
      .min(0, "Available beds must be >= 0")
      .optional(),
  })
  .refine(
    (data) => {
      const avail = data.beds_available ?? data.bedsAvailable;
      return avail === undefined || (avail >= 0 && avail <= data.beds);
    },
    {
      message: "beds_available must be an integer between 0 and beds",
      path: ["beds_available"],
    },
  );

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const hospitals = await db("hospitals").select("*").orderBy("name");
    res.json({ hospitals });
  }),
);

router.post(
  "/",
  requireRole("admin"),
  validate(createHospitalSchema),
  asyncHandler(async (req, res) => {
    const { name, lat, lng, beds } = req.body;
    const beds_available = req.body.beds_available ?? req.body.bedsAvailable ?? 0;

    const existing = await db("hospitals")
      .where({
        name: name.trim(),
        lat,
        lng,
      })
      .first();

    if (existing) {
      throw new HttpError(409, `Hospital "${name}" at coordinates (${lat}, ${lng}) already exists`);
    }

    try {
      const [hospital] = await db("hospitals")
        .insert({
          name: name.trim(),
          lat,
          lng,
          beds,
          beds_available,
          beds_source: "demo",
          beds_note: "total: estimate (admin portal)",
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");

      await logAudit(req, "create_hospital", hospital.id);

      res.status(201).json({ hospital });
    } catch (err) {
      if (err.code === "23505") {
        throw new HttpError(
          409,
          `Hospital "${name}" at coordinates (${lat}, ${lng}) already exists`,
        );
      }
      throw err;
    }
  }),
);

router.patch(
  "/:id/beds",
  requireRole("admin", "dispatcher"),
  asyncHandler(async (req, res) => {
    const [h] = await db("hospitals")
      .where({ id: req.params.id })
      .update({
        beds_available: req.body.bedsAvailable ?? req.body.beds_available,
        updated_at: db.fn.now(),
      })
      .returning("*");
    if (!h) throw new HttpError(404, "Hospital not found");
    res.json({ hospital: h });
  }),
);

export default router;
