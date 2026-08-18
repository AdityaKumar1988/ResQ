import { Router } from "express";
import { db } from "../../db.js";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await db("notifications")
      .where({ user_id: req.user.sub })
      .orderBy("created_at", "desc")
      .limit(50);
    res.json({ notifications: rows });
  }),
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await db("notifications")
      .where({ user_id: req.user.sub })
      .whereNull("read_at")
      .update({ read_at: db.fn.now() });
    res.status(204).end();
  }),
);

router.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await db("notifications")
      .where({ id: req.params.id, user_id: req.user.sub })
      .update({ read_at: db.fn.now() });
    res.status(204).end();
  }),
);

export default router;
