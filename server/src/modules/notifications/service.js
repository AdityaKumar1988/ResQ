import { db } from "../../db.js";
import { getIO } from "../../socket.js";
import { logger } from "../../logger.js";

/**
 * Creates and persists a notification in the database,
 * and emits a Socket.IO event to the recipient in real-time.
 */
export async function createAndEmitNotification({
  userId,
  kind,
  title,
  body = null,
  data = null,
  trx = null,
}) {
  if (!userId) return null;

  const dbClient = trx || db;
  try {
    const [notification] = await dbClient("notifications")
      .insert({
        user_id: userId,
        kind,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      })
      .returning("*");

    // Emit real-time notification to the user's socket room
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit("notification:created", notification);
      }
    } catch {
      // Socket may not be initialized in test environments; fail silently
    }

    return notification;
  } catch (err) {
    logger.warn({ err, userId, kind }, "Failed to create/emit notification");
    return null;
  }
}

/**
 * Broadcasts a notification to all users matching a specific role.
 */
export async function notifyRole({ role, kind, title, body = null, data = null, trx = null }) {
  const dbClient = trx || db;
  try {
    const users = await dbClient("users").where({ role }).select("id");
    const notifications = [];

    for (const user of users) {
      const n = await createAndEmitNotification({
        userId: user.id,
        kind,
        title,
        body,
        data,
        trx,
      });
      if (n) notifications.push(n);
    }

    // Also emit to role room for any connected clients in that room
    try {
      const io = getIO();
      if (io) {
        io.to(`role:${role}`).emit("role:notification", { kind, title, body, data });
      }
    } catch {
      // Ignore socket errors in tests
    }

    return notifications;
  } catch (err) {
    logger.warn({ err, role, kind }, "Failed to notify role");
    return [];
  }
}
