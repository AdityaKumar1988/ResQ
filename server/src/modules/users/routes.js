import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
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

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await db("users")
      .select("id", "email", "name", "role", "phone", "created_at")
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
      })
      .returning(["id", "email", "name", "role", "phone", "created_at"]);

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
      .returning(["id", "email", "name", "role", "phone", "created_at"]);
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user });
  }),
);

export default router;
