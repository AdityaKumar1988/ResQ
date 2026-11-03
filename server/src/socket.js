import { Server } from "socket.io";
import { verifyAccess } from "./utils/jwt.js";
import { logger } from "./logger.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { fetchPublicStats } from "./modules/public/routes.js";
import { calculateRouteEta, isValidCoordinate } from "./utils/routing.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Unauthenticated visitor: grant restricted public feed access
      socket.user = { role: "public", sub: "anonymous" };
      return next();
    }
    try {
      socket.user = verifyAccess(token);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { role, sub } = socket.user;
    if (role === "public") {
      socket.join("public:feed");
      logger.info({ id: socket.id }, "public socket connected to public:feed");
    } else {
      socket.join(`role:${role}`);
      socket.join(`user:${sub}`);
      socket.join("public:feed");
      logger.info({ sub, role }, "socket connected");
    }

    socket.on("driver:location", async (payload) => {
      if (role !== "driver") return;
      if (!Number.isFinite(payload?.lat) || !Number.isFinite(payload?.lng)) return;

      try {
        const driver = await db("drivers").where({ user_id: sub }).first();
        if (driver) await emit.driverLocation(driver, payload);
      } catch (err) {
        logger.warn({ err, sub }, "driver location broadcast failed");
      }
    });

    socket.on("disconnect", () => logger.info({ sub, role }, "socket disconnected"));
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}

export const emit = {
  incidentCreated: (incident) => {
    io?.to("role:admin").to("role:dispatcher").emit("incident:created", incident);
    if (incident.citizen_user_id) {
      io?.to(`user:${incident.citizen_user_id}`).emit("incident:created", incident);
    }
    emit.publicStatsUpdate().catch((err) => logger.warn({ err }, "publicStatsUpdate error"));
  },
  incidentUpdated: (incident, driverUserId) => {
    io?.to("role:admin").to("role:dispatcher").emit("incident:updated", incident);
    if (incident.citizen_user_id) {
      io?.to(`user:${incident.citizen_user_id}`).emit("incident:updated", incident);
    }
    if (driverUserId) {
      io?.to(`user:${driverUserId}`).emit("incident:updated", incident);
    }
    emit.publicStatsUpdate().catch((err) => logger.warn({ err }, "publicStatsUpdate error"));
  },
  incidentAssigned: (incident, driverUserId) => {
    io?.to("role:admin").to("role:dispatcher").emit("incident:assigned", incident);
    if (incident.citizen_user_id) {
      io?.to(`user:${incident.citizen_user_id}`).emit("incident:assigned", incident);
    }
    if (driverUserId) {
      io?.to(`user:${driverUserId}`).emit("incident:assigned", incident);
      io?.to(`user:${driverUserId}`).emit("incident:new", incident);
    }
    emit.publicStatsUpdate().catch((err) => logger.warn({ err }, "publicStatsUpdate error"));
  },
  driverLocation: async (driver, location = {}) => {
    const lat = Number(location.lat ?? driver.location_lat);
    const lng = Number(location.lng ?? driver.location_lng);
    if (!isValidCoordinate({ lat, lng })) return;

    const basePayload = {
      driverId: driver.id,
      lat,
      lng,
      heading: Number(location.heading ?? driver.heading ?? 0),
      at: new Date().toISOString(),
    };
    io?.to("role:dispatcher").to("role:admin").emit("driver:location", basePayload);

    const activeIncidents = await db("incidents")
      .where({ driver_id: driver.id })
      .whereNotIn("status", ["completed", "cancelled"])
      .select("id", "citizen_user_id", "lat", "lng");

    for (const inc of activeIncidents) {
      let etaMinutes = null;
      let distanceKm = null;
      let polyline = null;
      const driverLoc = { lat, lng };
      const incLoc = { lat: Number(inc.lat), lng: Number(inc.lng) };

      if (isValidCoordinate(driverLoc) && isValidCoordinate(incLoc)) {
        const route = await calculateRouteEta(driverLoc, incLoc, { includeGeometry: true });
        etaMinutes = route.etaMinutes;
        distanceKm = route.distanceKm;
        polyline = route.polyline;
      }

      const enrichedPayload = {
        ...basePayload,
        incidentId: inc.id,
        etaMinutes,
        distanceKm,
        polyline,
      };

      if (inc.citizen_user_id) {
        io?.to(`user:${inc.citizen_user_id}`).emit("driver:location", enrichedPayload);
      }
      io?.to("role:dispatcher").to("role:admin").emit("incident:eta_update", enrichedPayload);
    }
  },
  fleetUpdated: (vehicle) => {
    io?.emit("fleet:updated", vehicle);
    emit.publicStatsUpdate().catch((err) => logger.warn({ err }, "publicStatsUpdate error"));
  },
  driverStatusChanged: (driver) => {
    io?.emit("driver:status", driver);
    emit.publicStatsUpdate().catch((err) => logger.warn({ err }, "publicStatsUpdate error"));
  },
  publicStatsUpdate: async () => {
    try {
      const stats = await fetchPublicStats();
      io?.to("public:feed").emit("public:stats_update", stats);
    } catch (err) {
      logger.warn({ err }, "failed to emit public:stats_update");
    }
  },
};
