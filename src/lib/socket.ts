/**
 * Socket.io client singleton.
 *
 * Key design decisions:
 * - Auth token is read dynamically on each connection attempt, not at module load.
 * - The socket is lazy — it only connects when connectSocket() is called.
 * - Disconnection is clean: all listeners are removed by the SocketProvider cleanup.
 */

import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import { tokenStore } from "@/lib/token-store";
import { logger } from "@/lib/logger";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.socketUrl, {
      autoConnect: false,
      // Dynamic auth: token is re-read on each (re)connect attempt
      auth: (cb) => {
        const token = tokenStore.get();
        logger.socket("auth handshake", { hasToken: !!token });
        cb({ token });
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    // Global lifecycle logging
    socket.on("connect", () => logger.socket("connected", { id: socket?.id }));
    socket.on("disconnect", (reason) => logger.socket("disconnected", reason));
    socket.on("connect_error", (err) => logger.warn("[socket] connect_error:", err.message));
    socket.on("reconnect_attempt", (n) => logger.socket("reconnect_attempt", n));
    socket.on("reconnect_failed", () => logger.error("[socket] reconnect failed after all attempts"));
  }

  return socket;
}

export function connectSocket(): Socket {
  return getSocket().connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  // Don't null out — preserve the singleton so reconnect works
}

/** Emit a driver location update to the backend (driver role only) */
export function emitDriverLocation(lat: number, lng: number, heading?: number): void {
  getSocket().emit("driver:location", { lat, lng, heading: heading ?? 0 });
}
