import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { signAccess, signRefresh, verifyRefresh } from "../../utils/jwt.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["citizen", "dispatcher", "driver", "admin"]).default("citizen"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function tokensFor(user) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh({ sub: user.id }),
  };
}

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role, phone } = req.body;

    const existing = await db("users").where({ email }).first();
    if (existing) throw new HttpError(409, "Email already registered");

    const user = await db.transaction(async (trx) => {
      const [insertedUser] = await trx("users")
        .insert({
          email,
          password_hash: await hashPassword(password),
          name,
          role,
          phone,
        })
        .returning(["id", "email", "name", "role", "phone", "created_at"]);

      // Create driver profile if registering as a driver
      if (role === "driver") {
        // Pick the first vehicle with status 'available' not already assigned to an existing driver
        const assignedVehicleIds = trx("drivers")
          .whereNotNull("vehicle_id")
          .select("vehicle_id");
        const vehicle = await trx("vehicles")
          .where("status", "available")
          .whereNotIn("id", assignedVehicleIds)
          .first("id");

        if (!vehicle) {
          throw new HttpError(
            400,
            "No available ambulance vehicle for registration. Please contact the dispatcher to add another ambulance."
          );
        }

        // Generate unique call sign to prevent constraint collisions
        const existingCallSigns = new Set(await trx("drivers").pluck("call_sign"));
        let num = Math.floor(100 + Math.random() * 900);
        while (existingCallSigns.has(`MEDIC ${num}`)) {
          num = Math.floor(100 + Math.random() * 900);
        }

        await trx("drivers").insert({
          user_id: insertedUser.id,
          vehicle_id: vehicle.id,
          call_sign: `MEDIC ${num}`,
          rating: 5.0,
          missions_completed: 0,
          missions_active: 0,
          avg_response_sec: 300,
          status: "available",
          // No hardcoded coords — location is null until driver sends first GPS ping
          location_lat: null,
          location_lng: null,
          heading: 0,
          last_ping_at: trx.fn.now(),
        });
      }

      return insertedUser;
    });

    res.status(201).json({
      user,
      ...tokensFor(user),
    });
  }),
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await db("users").where({ email }).first();
    if (!user) throw new HttpError(401, "Invalid credentials");
    if (!(await verifyPassword(password, user.password_hash)))
      throw new HttpError(401, "Invalid credentials");
    const { password_hash, ...safe } = user;
    res.json({ user: safe, ...tokensFor(user) });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.body?.refreshToken;
    if (!token) throw new HttpError(400, "refreshToken required");
    let decoded;
    try {
      decoded = verifyRefresh(token);
    } catch {
      throw new HttpError(401, "Invalid refresh token");
    }
    const user = await db("users").where({ id: decoded.sub }).first();
    if (!user) throw new HttpError(401, "User not found");
    res.json(tokensFor(user));
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await db("users")
      .where({ id: req.user.sub })
      .select("id", "email", "name", "role", "phone", "created_at")
      .first();
    res.json({ user });
  }),
);

export default router;
