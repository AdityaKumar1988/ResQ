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

const SLA = { P1: 480, P2: 900, P3: 1800, P4: 3600 };

const createSchema = z.object({
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  type: z.enum([
    "cardiac",
    "trauma",
    "stroke",
    "respiratory",
    "obstetric",
    "pediatric",
    "psychiatric",
    "burn",
    "other",
  ]),
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  notes: z.string().optional(),
  citizenName: z.string(),
  citizenPhone: z.string(),
});

const statusSchema = z.object({
  status: z.enum([
    "reported",
    "assigned",
    "accepted",
    "en_route",
    "arrived",
    "patient_loaded",
    "at_hospital",
    "completed",
    "cancelled",
  ]),
  note: z.string().optional(),
});

const assignSchema = z.object({
  driverId: z.string().uuid(),
});

const NEXT_STATUS = {
  assigned: "accepted",
  accepted: "en_route",
  en_route: "arrived",
  arrived: "patient_loaded",
  patient_loaded: "at_hospital",
  at_hospital: "completed",
};

const DRIVER_STATUS_FOR_INCIDENT_STATUS = {
  accepted: "busy",
  en_route: "en_route",
  arrived: "busy",
  patient_loaded: "busy",
  at_hospital: "at_hospital",
  completed: "available",
  cancelled: "available",
};

async function nextIncidentCode(trx) {
  const row = await trx("incidents").count("id as c").first();
  const n = 2150 + Number(row?.c || 0);
  return `INC-${n}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, priority, limit = 100 } = req.query;
    const q = db("incidents").orderBy("reported_at", "desc").limit(Number(limit));
    if (req.user.role === "citizen") q.where("citizen_user_id", req.user.sub);
    if (req.user.role === "driver") {
      const driver = await db("drivers").where({ user_id: req.user.sub }).first("id");
      if (!driver) return res.json({ incidents: [] });
      q.where("driver_id", driver.id);
    }
    if (status) q.where("status", status);
    if (priority) q.where("priority", priority);
    res.json({ incidents: await q });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const incident = await db("incidents").where({ id: req.params.id }).first();
    if (!incident) throw new HttpError(404, "Incident not found");
    if (req.user.role === "citizen" && incident.citizen_user_id !== req.user.sub) {
      throw new HttpError(403, "Access denied");
    }
    if (req.user.role === "driver") {
      const driver = await db("drivers").where({ user_id: req.user.sub }).first("id");
      if (!driver || incident.driver_id !== driver.id) throw new HttpError(403, "Access denied");
    }
    const timeline = await db("incident_events")
      .select("*", "created_at as timestamp")
      .where({ incident_id: incident.id })
      .orderBy("created_at", "asc");
    res.json({ incident, timeline });
  }),
);

router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body;
    const incident = await db.transaction(async (trx) => {
      const code = await nextIncidentCode(trx);
      const [row] = await trx("incidents")
        .insert({
          code,
          priority: body.priority,
          type: body.type,
          status: "reported",
          lat: body.lat,
          lng: body.lng,
          address: body.address,
          notes: body.notes || null,
          citizen_name: body.citizenName,
          citizen_phone: body.citizenPhone,
          citizen_user_id: req.user.sub,
          sla_seconds: SLA[body.priority],
          reported_at: trx.fn.now(),
        })
        .returning("*");
      await trx("incident_events").insert({
        incident_id: row.id,
        status: "reported",
        actor_name: body.citizenName,
      });
      return row;
    });
    emit.incidentCreated(incident);
    res.status(201).json({ incident });
  }),
);

router.post(
  "/:id/assign",
  requireRole("dispatcher", "admin"),
  validate(assignSchema),
  asyncHandler(async (req, res) => {
    const { driverId } = req.body;
    const assignment = await db.transaction(async (trx) => {
      const incident = await trx("incidents").where({ id: req.params.id }).forUpdate().first();
      if (!incident) throw new HttpError(404, "Incident not found");
      if (incident.status !== "reported" || incident.driver_id) {
        throw new HttpError(409, "Incident has already been assigned or is no longer dispatchable");
      }

      const driver = await trx("drivers").where({ id: driverId }).forUpdate().first();
      if (!driver) throw new HttpError(404, "Driver not found");
      if (driver.status !== "available") throw new HttpError(409, "Driver is not available");
      if (!driver.vehicle_id) throw new HttpError(409, "Driver has no assigned vehicle");

      const vehicle = await trx("vehicles").where({ id: driver.vehicle_id }).forUpdate().first();
      if (!vehicle || vehicle.status !== "available") {
        throw new HttpError(409, "Driver vehicle is not available");
      }

      const [row] = await trx("incidents")
        .where({ id: req.params.id })
        .update({
          driver_id: driver.id,
          vehicle_id: driver.vehicle_id,
          status: "assigned",
          assigned_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning("*");
      await trx("incident_events").insert({
        incident_id: row.id,
        status: "assigned",
        actor_name: "Dispatcher",
        note: `Driver ${driver.call_sign} assigned`,
      });
      const [updatedDriver] = await trx("drivers")
        .where({ id: driver.id })
        .update({
          status: "busy",
          missions_active: trx.raw("missions_active + 1"),
          updated_at: trx.fn.now(),
        })
        .returning("*");
      const [updatedVehicle] = await trx("vehicles")
        .where({ id: vehicle.id })
        .update({
          status: "busy",
          updated_at: trx.fn.now(),
        })
        .returning("*");
      return {
        incident: row,
        driver: updatedDriver,
        vehicle: updatedVehicle,
        driverUserId: driver.user_id,
      };
    });
    emit.incidentAssigned(assignment.incident, assignment.driverUserId);
    emit.driverStatusChanged(assignment.driver);
    emit.fleetUpdated(assignment.vehicle);
    res.json({ incident: assignment.incident });
  }),
);

router.patch(
  "/:id/status",
  requireRole("admin", "dispatcher", "driver"),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const update = await db.transaction(async (trx) => {
      const current = await trx("incidents").where({ id: req.params.id }).forUpdate().first();
      if (!current) throw new HttpError(404, "Incident not found");
      if (status !== "cancelled" && NEXT_STATUS[current.status] !== status) {
        throw new HttpError(409, `Invalid incident transition from ${current.status} to ${status}`);
      }

      let driver = null;
      if (current.driver_id) {
        driver = await trx("drivers").where({ id: current.driver_id }).forUpdate().first();
      }
      if (req.user.role === "driver") {
        const authenticatedDriver = await trx("drivers")
          .where({ user_id: req.user.sub })
          .first();
        if (!authenticatedDriver || authenticatedDriver.id !== current.driver_id) {
          throw new HttpError(403, "Drivers may update only their assigned incidents");
        }
      }

      const patch = { status, updated_at: trx.fn.now() };
      if (status === "completed") patch.completed_at = trx.fn.now();
      const [row] = await trx("incidents")
        .where({ id: req.params.id })
        .update(patch)
        .returning("*");
      await trx("incident_events").insert({
        incident_id: row.id,
        status,
        actor_id: req.user.sub,
        actor_name: req.user.email,
        note,
      });

      const driverStatus = DRIVER_STATUS_FOR_INCIDENT_STATUS[status];
      let updatedDriver = null;
      let updatedVehicle = null;
      if (driver && driverStatus) {
        const isTerminal = status === "completed" || status === "cancelled";
        [updatedDriver] = await trx("drivers")
          .where({ id: row.driver_id })
          .update({
            status: driverStatus,
            ...(isTerminal ? { missions_active: trx.raw("GREATEST(missions_active - 1, 0)") } : {}),
            ...(status === "completed" ? { missions_completed: trx.raw("missions_completed + 1") } : {}),
            updated_at: trx.fn.now(),
          })
          .returning("*");
        if (driver.vehicle_id) {
          const vObj = await trx("vehicles").where({ id: driver.vehicle_id }).first();
          if (vObj && vObj.status !== "maintenance") {
            [updatedVehicle] = await trx("vehicles")
              .where({ id: driver.vehicle_id })
              .update({
                status: driverStatus,
                updated_at: trx.fn.now(),
              })
              .returning("*");
          }
        }
      }

      return {
        incident: row,
        driver: updatedDriver,
        vehicle: updatedVehicle,
        driverUserId: driver?.user_id,
      };
    });
    emit.incidentUpdated(update.incident, update.driverUserId);
    if (update.driver) emit.driverStatusChanged(update.driver);
    if (update.vehicle) emit.fleetUpdated(update.vehicle);
    res.json({ incident: update.incident });
  }),
);

export default router;
