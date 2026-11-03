import { Router } from "express";
import { z } from "zod";
import { db } from "../../db.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { emit } from "../../socket.js";
import { createAndEmitNotification, notifyRole } from "../notifications/service.js";
import { calculateRouteEta, isValidCoordinate } from "../../utils/routing.js";

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

import {
  ALLOWED_TRANSITIONS,
  NEXT_STATUS,
  DRIVER_STATUS_FOR_INCIDENT_STATUS,
} from "./constants.js";

async function nextIncidentCode(trx) {
  const row = await trx("incidents").count("id as c").first();
  const n = 2150 + Number(row?.c || 0);
  return `INC-${n}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, priority, limit = 100 } = req.query;
    const q = db("incidents")
      .leftJoin("drivers", "drivers.id", "incidents.driver_id")
      .leftJoin("users as driver_users", "driver_users.id", "drivers.user_id")
      .select(
        "incidents.*",
        "drivers.call_sign as driver_call_sign",
        "drivers.rating as driver_rating",
        "drivers.missions_completed as driver_missions_completed",
        "drivers.location_lat as driver_location_lat",
        "drivers.location_lng as driver_location_lng",
        "drivers.heading as driver_heading",
        "drivers.status as driver_status",
        "driver_users.name as driver_name",
        "driver_users.phone as driver_phone",
      )
      .orderBy("incidents.reported_at", "desc")
      .limit(Number(limit));
    if (req.user.role === "citizen") q.where("incidents.citizen_user_id", req.user.sub);
    if (req.user.role === "driver") {
      const driver = await db("drivers").where({ user_id: req.user.sub }).first("id");
      if (!driver) return res.json({ incidents: [] });
      q.where("incidents.driver_id", driver.id);
    }
    if (status) q.where("incidents.status", status);
    if (priority) q.where("incidents.priority", priority);

    const rows = await q;
    const incidents = await Promise.all(
      rows.map(async (row) => {
        let driver = null;
        let eta_minutes = null;
        let distance_km = null;

        if (row.driver_id) {
          driver = {
            id: row.driver_id,
            call_sign: row.driver_call_sign,
            name: row.driver_name || "Ambulance Driver",
            phone: row.driver_phone || null,
            rating: Number(row.driver_rating != null ? row.driver_rating : 4.7),
            missions_completed: Number(row.driver_missions_completed || 0),
            status: row.driver_status || "busy",
            location_lat: row.driver_location_lat != null ? Number(row.driver_location_lat) : null,
            location_lng: row.driver_location_lng != null ? Number(row.driver_location_lng) : null,
            heading: Number(row.driver_heading || 0),
          };

          const dLoc = { lat: Number(driver.location_lat), lng: Number(driver.location_lng) };
          const iLoc = { lat: Number(row.lat), lng: Number(row.lng) };

          if (
            isValidCoordinate(dLoc) &&
            isValidCoordinate(iLoc) &&
            row.status !== "completed" &&
            row.status !== "cancelled"
          ) {
            const route = await calculateRouteEta(dLoc, iLoc);
            eta_minutes = route.etaMinutes;
            distance_km = route.distanceKm;
          }
        }
        return {
          ...row,
          driver,
          eta_minutes,
          distance_km,
        };
      }),
    );
    res.json({ incidents });
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

    let driver = null;
    let eta_minutes = null;
    let distance_km = null;

    if (incident.driver_id) {
      const d = await db("drivers")
        .leftJoin("users", "users.id", "drivers.user_id")
        .where("drivers.id", incident.driver_id)
        .select("drivers.*", "users.name as user_name", "users.phone as user_phone")
        .first();
      if (d) {
        driver = {
          id: d.id,
          call_sign: d.call_sign,
          name: d.user_name || d.name || "Ambulance Driver",
          phone: d.user_phone || d.phone || null,
          rating: Number(d.rating != null ? d.rating : 4.7),
          missions_completed: Number(d.missions_completed != null ? d.missions_completed : 0),
          status: d.status || "busy",
          location_lat: d.location_lat != null ? Number(d.location_lat) : null,
          location_lng: d.location_lng != null ? Number(d.location_lng) : null,
          heading: Number(d.heading != null ? d.heading : 0),
        };

        const dLoc = { lat: Number(driver.location_lat), lng: Number(driver.location_lng) };
        const iLoc = { lat: Number(incident.lat), lng: Number(incident.lng) };

        let polyline = null;
        if (
          isValidCoordinate(dLoc) &&
          isValidCoordinate(iLoc) &&
          incident.status !== "completed" &&
          incident.status !== "cancelled"
        ) {
          const route = await calculateRouteEta(dLoc, iLoc, { includeGeometry: true });
          eta_minutes = route.etaMinutes;
          distance_km = route.distanceKm;
          polyline = route.polyline;
        }
      }
    }
    res.json({
      incident: { ...incident, driver, eta_minutes, distance_km, polyline },
      timeline,
    });
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

    // Scoped persistent + real-time notification for citizen
    if (incident.citizen_user_id) {
      await createAndEmitNotification({
        userId: incident.citizen_user_id,
        kind: "incident_created",
        title: "Emergency Request Received",
        body: "Your emergency request has been received and sent to dispatch.",
        data: { incidentId: incident.id, code: incident.code },
      });
    }

    // Scoped persistent + real-time notification for dispatchers
    await notifyRole({
      role: "dispatcher",
      kind: "incident_created",
      title: `New ${incident.priority} Emergency Reported`,
      body: `${incident.code} (${incident.priority}) · ${incident.type} @ ${incident.address}`,
      data: { incidentId: incident.id, code: incident.code },
    });

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
      // Row-level lock on incident
      const incident = await trx("incidents").where({ id: req.params.id }).forUpdate().first();
      if (!incident) throw new HttpError(404, "Incident not found");

      // Verify incident is in reported state and has no assigned driver
      if (incident.status !== "reported" || incident.driver_id) {
        throw new HttpError(
          409,
          "Incident has already been assigned or is no longer dispatchable",
          null,
          "INCIDENT_ALREADY_ASSIGNED",
        );
      }

      // Row-level lock on driver
      const driver = await trx("drivers").where({ id: driverId }).forUpdate().first();
      if (!driver) throw new HttpError(404, "Driver not found");

      // Verify driver is available and has no active missions
      if (driver.status !== "available" || Number(driver.missions_active || 0) > 0) {
        throw new HttpError(
          409,
          "Ambulance is no longer available.",
          null,
          "AMBULANCE_UNAVAILABLE",
        );
      }
      if (!driver.vehicle_id) {
        throw new HttpError(409, "Driver has no assigned vehicle", null, "DRIVER_NO_VEHICLE");
      }

      // Row-level lock on vehicle
      const vehicle = await trx("vehicles").where({ id: driver.vehicle_id }).forUpdate().first();
      if (!vehicle || vehicle.status !== "available") {
        throw new HttpError(
          409,
          "Ambulance is no longer available.",
          null,
          "AMBULANCE_UNAVAILABLE",
        );
      }

      // Double-check no active incident currently has this driver or vehicle assigned
      const activeExisting = await trx("incidents")
        .where((builder) => {
          builder.where("driver_id", driver.id).orWhere("vehicle_id", driver.vehicle_id);
        })
        .whereNotIn("status", ["completed", "cancelled"])
        .first();

      if (activeExisting) {
        throw new HttpError(
          409,
          "Ambulance is no longer available.",
          null,
          "AMBULANCE_UNAVAILABLE",
        );
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
        callSign: driver.call_sign,
      };
    });

    const driverUser = await db("users").where({ id: assignment.driverUserId }).first();
    const driverObj = {
      id: assignment.driver.id,
      call_sign: assignment.driver.call_sign,
      name: driverUser?.name || "Ambulance Driver",
      phone: driverUser?.phone || null,
      rating: Number(assignment.driver.rating != null ? assignment.driver.rating : 4.7),
      missions_completed: Number(assignment.driver.missions_completed || 0),
      status: "busy",
      location_lat:
        assignment.driver.location_lat != null ? Number(assignment.driver.location_lat) : null,
      location_lng:
        assignment.driver.location_lng != null ? Number(assignment.driver.location_lng) : null,
      heading: Number(assignment.driver.heading || 0),
    };

    let initialEta = null;
    let initialDistance = null;
    let initialPolyline = null;
    const dLoc = { lat: driverObj.location_lat, lng: driverObj.location_lng };
    const iLoc = { lat: Number(assignment.incident.lat), lng: Number(assignment.incident.lng) };

    if (isValidCoordinate(dLoc) && isValidCoordinate(iLoc)) {
      const route = await calculateRouteEta(dLoc, iLoc, { includeGeometry: true });
      initialEta = route.etaMinutes;
      initialDistance = route.distanceKm;
      initialPolyline = route.polyline;
    }

    const enrichedIncident = {
      ...assignment.incident,
      driver: driverObj,
      eta_minutes: initialEta,
      distance_km: initialDistance,
      polyline: initialPolyline,
    };

    emit.incidentAssigned(enrichedIncident, assignment.driverUserId);
    emit.driverStatusChanged(assignment.driver);
    emit.fleetUpdated(assignment.vehicle);

    // Scoped notification for Citizen
    if (assignment.incident.citizen_user_id) {
      await createAndEmitNotification({
        userId: assignment.incident.citizen_user_id,
        kind: "incident_assigned",
        title: "Ambulance Assigned",
        body: `Ambulance ${assignment.callSign} has been assigned to your emergency.`,
        data: {
          incidentId: assignment.incident.id,
          code: assignment.incident.code,
          callSign: assignment.callSign,
        },
      });
    }

    // Scoped notification for Driver
    if (assignment.driverUserId) {
      await createAndEmitNotification({
        userId: assignment.driverUserId,
        kind: "incident_assigned",
        title: "New Emergency Mission Assigned",
        body: `Mission ${assignment.incident.code} (${assignment.incident.priority}) · ${assignment.incident.type} @ ${assignment.incident.address}`,
        data: {
          incidentId: assignment.incident.id,
          code: assignment.incident.code,
          priority: assignment.incident.priority,
          address: assignment.incident.address,
        },
      });
    }

    // Scoped persistent + realtime notification for Dispatchers
    await notifyRole({
      role: "dispatcher",
      kind: "incident_assigned",
      title: `Ambulance ${assignment.callSign} Assigned`,
      body: `Unit ${assignment.callSign} assigned to incident ${assignment.incident.code} (${assignment.incident.priority}).`,
      data: {
        incidentId: assignment.incident.id,
        code: assignment.incident.code,
        callSign: assignment.callSign,
      },
    });

    res.json({ incident: enrichedIncident });
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

      // Verify terminal states cannot be changed
      if (current.status === "completed" || current.status === "cancelled") {
        throw new HttpError(
          409,
          `Cannot change status of an incident in terminal '${current.status}' state`,
          null,
          "TERMINAL_STATE",
        );
      }

      // Check authoritative state transition matrix
      const allowedNext = ALLOWED_TRANSITIONS[current.status] || [];
      if (!allowedNext.includes(status)) {
        throw new HttpError(
          409,
          `Invalid incident transition from ${current.status} to ${status}`,
          null,
          "INVALID_STATE_TRANSITION",
        );
      }

      let driver = null;
      if (current.driver_id) {
        driver = await trx("drivers").where({ id: current.driver_id }).forUpdate().first();
      }

      // RBAC state ownership
      if (req.user.role === "driver") {
        const authenticatedDriver = await trx("drivers").where({ user_id: req.user.sub }).first();
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
            ...(status === "completed"
              ? { missions_completed: trx.raw("missions_completed + 1") }
              : {}),
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
        driverCallSign: driver?.call_sign,
      };
    });

    emit.incidentUpdated(update.incident, update.driverUserId);
    if (update.driver) emit.driverStatusChanged(update.driver);
    if (update.vehicle) emit.fleetUpdated(update.vehicle);

    // Scoped Citizen notifications based on mission status
    if (update.incident.citizen_user_id) {
      let citizenTitle = null;
      let citizenBody = null;
      const callSign = update.driverCallSign || "Ambulance";

      switch (status) {
        case "accepted":
          citizenTitle = "Mission Accepted";
          citizenBody = `Your ambulance driver (${callSign}) has accepted the mission.`;
          break;
        case "en_route":
          citizenTitle = "Ambulance On The Way";
          citizenBody = `Your ambulance (${callSign}) is on the way.`;
          break;
        case "arrived":
          citizenTitle = "Ambulance Arrived";
          citizenBody = `Your ambulance (${callSign}) has arrived on scene.`;
          break;
        case "patient_loaded":
          citizenTitle = "Patient Loaded";
          citizenBody = "Patient loaded. Transporting to hospital.";
          break;
        case "at_hospital":
          citizenTitle = "Arrived at Hospital";
          citizenBody = "You have arrived at the hospital facility.";
          break;
        case "completed":
          citizenTitle = "Mission Completed";
          citizenBody = "Emergency mission completed.";
          break;
        case "cancelled":
          citizenTitle = "Emergency Mission Cancelled";
          citizenBody = "The emergency mission was cancelled.";
          break;
      }

      if (citizenTitle) {
        await createAndEmitNotification({
          userId: update.incident.citizen_user_id,
          kind: `status_${status}`,
          title: citizenTitle,
          body: citizenBody,
          data: { incidentId: update.incident.id, code: update.incident.code, status },
        });
      }
    }

    // Driver notification if mission was cancelled by dispatcher
    if (status === "cancelled" && update.driverUserId) {
      await createAndEmitNotification({
        userId: update.driverUserId,
        kind: "mission_cancelled",
        title: "Emergency Mission Cancelled",
        body: `Mission ${update.incident.code} was cancelled.`,
        data: { incidentId: update.incident.id, code: update.incident.code },
      });
    }

    // Dispatcher notifications on all mission lifecycle transitions
    const dispatcherCallSign = update.driverCallSign || "Ambulance";
    let dispatcherTitle = null;
    let dispatcherBody = null;

    switch (status) {
      case "accepted":
        dispatcherTitle = "Mission Accepted";
        dispatcherBody = `${dispatcherCallSign} accepted mission ${update.incident.code}.`;
        break;
      case "en_route":
        dispatcherTitle = "Ambulance En Route";
        dispatcherBody = `${dispatcherCallSign} is en route to ${update.incident.address} for ${update.incident.code}.`;
        break;
      case "arrived":
        dispatcherTitle = "Ambulance Arrived on Scene";
        dispatcherBody = `${dispatcherCallSign} arrived on scene at incident ${update.incident.code}.`;
        break;
      case "patient_loaded":
        dispatcherTitle = "Patient Loaded";
        dispatcherBody = `${dispatcherCallSign} loaded patient for ${update.incident.code} — transporting to hospital.`;
        break;
      case "at_hospital":
        dispatcherTitle = "Arrived at Hospital";
        dispatcherBody = `${dispatcherCallSign} arrived at hospital with patient for ${update.incident.code}.`;
        break;
      case "completed":
        dispatcherTitle = "Mission Completed · Patient Handover Complete";
        dispatcherBody = `Mission ${update.incident.code} completed and patient handed over by ${dispatcherCallSign}. Ambulance returned to available fleet.`;
        break;
      case "cancelled":
        dispatcherTitle = "Emergency Mission Cancelled";
        dispatcherBody = `Incident ${update.incident.code} was cancelled.`;
        break;
    }

    if (dispatcherTitle) {
      await notifyRole({
        role: "dispatcher",
        kind: status === "completed" ? "incident_completed" : `status_${status}`,
        title: dispatcherTitle,
        body: dispatcherBody,
        data: { incidentId: update.incident.id, code: update.incident.code, status },
      });
    }

    res.json({ incident: update.incident });
  }),
);

export default router;
