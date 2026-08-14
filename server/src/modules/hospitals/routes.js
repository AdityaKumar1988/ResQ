import { Router } from "express";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const hospitals = await db("hospitals").select("*").orderBy("name");
    res.json({ hospitals });
  }),
);

router.patch(
  "/:id/beds",
  requireRole("admin", "dispatcher"),
  asyncHandler(async (req, res) => {
    const [h] = await db("hospitals")
      .where({ id: req.params.id })
      .update({
        beds_available: req.body.bedsAvailable,
        updated_at: db.fn.now(),
      })
      .returning("*");
    res.json({ hospital: h });
  }),
);

export default router;
