import { Server } from "socket.io";
import { verifyAccess } from "./utils/jwt.js";
import { logger } from "./logger.js";
import { config } from "./config.js";
import { db } from "./db.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("unauthorized"));
    try {
      socket.user = verifyAccess(token);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { role, sub } = socket.user;
    socket.join(`role:${role}`);
    socket.join(`user:${sub}`);
    logger.info({ sub, role }, "socket connected");

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

    socket.on("disconnect", () => logger.info({ sub }, "socket disconnected"));
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
  },
  incidentUpdated: (incident, driverUserId) => {
    io?.to("role:admin").to("role:dispatcher").emit("incident:updated", incident);
    if (incident.citizen_user_id) {
      io?.to(`user:${incident.citizen_user_id}`).emit("incident:updated", incident);
    }
    if (driverUserId) {
      io?.to(`user:${driverUserId}`).emit("incident:updated", incident);
    }
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
  },
  driverLocation: async (driver, location = {}) => {
    const lat = Number(location.lat ?? driver.location_lat);
    const lng = Number(location.lng ?? driver.location_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const payload = {
      driverId: driver.id,
      lat,
      lng,
      heading: Number(location.heading ?? driver.heading ?? 0),
      at: new Date().toISOString(),
    };
    io?.to("role:dispatcher").to("role:admin").emit("driver:location", payload);

    const citizenIds = await db("incidents")
      .where({ driver_id: driver.id })
      .whereNotIn("status", ["completed", "cancelled"])
      .whereNotNull("citizen_user_id")
      .pluck("citizen_user_id");
    for (const citizenUserId of new Set(citizenIds)) {
      io?.to(`user:${citizenUserId}`).emit("driver:location", payload);
    }
  },
  fleetUpdated: (vehicle) => io?.emit("fleet:updated", vehicle),
  driverStatusChanged: (driver) => io?.emit("driver:status", driver),
};
