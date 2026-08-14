import { Router } from "express";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authenticate, requireRole("admin"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await db("users")
      .select("id", "email", "name", "role", "phone", "created_at")
      .orderBy("created_at", "desc");
    res.json({ users });
  }),
);

router.patch(
  "/:id/role",
  asyncHandler(async (req, res) => {
    const [user] = await db("users")
      .where({ id: req.params.id })
      .update({ role: req.body.role })
      .returning(["id", "email", "name", "role"]);
    res.json({ user });
  }),
);

export default router;
