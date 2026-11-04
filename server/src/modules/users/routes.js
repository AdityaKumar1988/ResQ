import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword } from "../../utils/password.js";
import { isValidPhone } from "../../utils/phone.js";
import { notifyRole } from "../notifications/service.js";

const router = Router();
router.use(authenticate, requireRole("admin"));

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "dispatcher"], {
    errorMap: () => ({ message: "Staff role must be either 'admin' or 'dispatcher'" }),
  }),
  phone: z
    .string({ required_error: "Phone number is required." })
    .min(1, "Phone number is required.")
    .refine(isValidPhone, "Please enter a valid phone number."),
});

const updateRoleSchema = z.object({
  role: z.enum(["citizen", "dispatcher", "driver", "admin"]),
});

const updateStatusSchema = z.object({
  status: z.enum(["invited", "active", "suspended"], {
    errorMap: () => ({ message: "Status must be 'invited', 'active', or 'suspended'" }),
  }),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await db("users")
      .select("id", "email", "name", "role", "phone", "status", "created_at")
      .orderBy("created_at", "desc");
    res.json({ users });
  }),
);

router.post(
  "/",
  validate(createStaffSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role, phone } = req.body;

    const existing = await db("users").where({ email }).first();
    if (existing) {
      throw new HttpError(409, "Email already registered");
    }

    const [user] = await db("users")
      .insert({
        email,
        password_hash: await hashPassword(password),
        name,
        role,
        phone,
        status: "active",
      })
      .returning(["id", "email", "name", "role", "phone", "status", "created_at"]);

    await logAudit(req, "create_staff_user", `Staff ${user.email} (${user.id}) created as ${role}`);

    await notifyRole({
      role: "admin",
      kind: "staff_created",
      title: `New ${role === "admin" ? "Admin" : "Dispatcher"} Created`,
      body: `${user.name} was added as ${role}.`,
      data: { userId: user.id, role },
    });

    res.status(201).json({ user });
  }),
);

router.patch(
  "/:id/role",
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const [user] = await db("users")
      .where({ id: req.params.id })
      .update({ role: req.body.role, updated_at: db.fn.now() })
      .returning(["id", "email", "name", "role", "phone", "status", "created_at"]);
    if (!user) throw new HttpError(404, "User not found");

    await logAudit(
      req,
      "update_user_role",
      `User ${user.email} (${user.id}) role changed to ${req.body.role}`,
    );

    res.json({ user });
  }),
);

router.patch(
  "/:id/status",
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const currentUserId = req.user.sub || req.user.id;

    if (id === currentUserId && status === "suspended") {
      throw new HttpError(400, "Admins cannot suspend their own account");
    }

    const targetUser = await db("users").where({ id }).first();
    if (!targetUser) {
      throw new HttpError(404, "User not found");
    }

    const [user] = await db("users")
      .where({ id })
      .update({
        status,
        updated_at: db.fn.now(),
      })
      .returning(["id", "email", "name", "role", "phone", "status", "created_at", "updated_at"]);

    await logAudit(req, "update_user_status", user.id);

    res.json({ user });
  }),
);

export default router;
