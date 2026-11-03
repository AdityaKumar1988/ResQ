import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { reconnectSocket } from "@/lib/socket";
import { logger } from "@/lib/logger";
import { queryKeys } from "@/lib/queryKeys";
import { normalizeToCamel } from "@/lib/api/client";
import type { Incident } from "@/types/incident";
import type { Driver } from "@/types/driver";
import type { Notification } from "@/types/notification";
import type { Vehicle } from "@/types/vehicle";
import type { PublicStats } from "@/types/public";

// Location update throttle: update cache at most once every 2s per driver
const LOCATION_THROTTLE_MS = 2_000;
const lastLocationUpdate = new Map<string, number>();

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Reconnect socket so handshake re-runs with current auth state (or anonymous public role)
    const socket = reconnectSocket();

    // ── Public: Telemetry Stats Update ────────────────────────────────────────
    function onPublicStatsUpdate(raw: unknown) {
      const stats = normalizeToCamel<PublicStats>(raw);
      logger.socket("public:stats_update", stats);
      queryClient.setQueryData(queryKeys.public.stats(), stats);
    }
    socket.on("public:stats_update", onPublicStatsUpdate);

    // ── Incident: Created ─────────────────────────────────────────────────────
    function onIncidentCreated(raw: unknown) {
      const incident = normalizeToCamel<Incident>(raw);
      logger.socket("incident:created", incident.code);
      queryClient.setQueriesData(
        { queryKey: queryKeys.incidents.all() },
        (old: { incidents: Incident[] } | undefined) =>
          old
            ? {
                incidents: [
                  {
                    ...incident,
                    location: {
                      lat: Number(incident.lat),
                      lng: Number(incident.lng),
                    },
                  },
                  ...old.incidents,
                ],
              }
            : old,
      );
      if (role === "dispatcher" || role === "admin") {
        toast.info(`New incident: ${incident.code}`, {
          description: `${incident.priority} · ${incident.type} @ ${incident.address}`,
        });
      }
    }

    // ── Incident: Assigned ────────────────────────────────────────────────────
    function onIncidentAssigned(raw: unknown) {
      const incident = normalizeToCamel<Incident>(raw);
      logger.socket("incident:assigned", incident.code);
      queryClient.setQueryData(
        queryKeys.incidents.detail(incident.id),
        (old: { incident: Incident } | undefined) =>
          old ? { ...old, incident: { ...old.incident, ...incident } } : old,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all() });
    }

    // ── Incident: Updated ─────────────────────────────────────────────────────
    function onIncidentUpdated(raw: unknown) {
      const incident = normalizeToCamel<Incident>(raw);
      logger.socket("incident:updated", { id: incident.id, status: incident.status });
      // Update detail cache
      queryClient.setQueryData(
        queryKeys.incidents.detail(incident.id),
        (old: { incident: Incident } | undefined) =>
          old ? { ...old, incident: { ...old.incident, ...incident } } : old,
      );
      // Update in list cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.incidents.all() },
        (old: { incidents: Incident[] } | undefined) =>
          old
            ? {
                incidents: old.incidents.map((i) =>
                  i.id === incident.id ? { ...i, ...incident } : i,
                ),
              }
            : old,
      );
    }

    // ── Driver: Location & Live Telemetry ────────────────────────────────────
    function onDriverLocation(payload: {
      driverId: string;
      incidentId?: string;
      lat: number;
      lng: number;
      heading?: number;
      etaMinutes?: number | null;
      distanceKm?: number | null;
      polyline?: [number, number][] | null;
      at: string;
    }) {
      const now = Date.now();
      const last = lastLocationUpdate.get(payload.driverId) ?? 0;
      if (now - last < LOCATION_THROTTLE_MS) return; // throttle
      lastLocationUpdate.set(payload.driverId, now);

      logger.socket("driver:location", {
        driverId: payload.driverId,
        lat: payload.lat,
        lng: payload.lng,
        etaMinutes: payload.etaMinutes,
      });

      queryClient.setQueryData(queryKeys.drivers.all(), (old: { drivers: Driver[] } | undefined) =>
        old
          ? {
              drivers: old.drivers.map((d) =>
                d.id === payload.driverId
                  ? {
                      ...d,
                      location: { lat: payload.lat, lng: payload.lng },
                      heading: payload.heading ?? d.heading,
                    }
                  : d,
              ),
            }
          : old,
      );

      // Update driver.me cache if the current user is this driver
      queryClient.setQueryData(queryKeys.drivers.me(), (old: { driver: Driver } | undefined) =>
        old && old.driver?.id === payload.driverId
          ? {
              driver: {
                ...old.driver,
                location: { lat: payload.lat, lng: payload.lng },
                heading: payload.heading ?? old.driver.heading,
              },
            }
          : old,
      );

      // Update assigned driver's location and live ETA on incident caches
      queryClient.setQueriesData(
        { queryKey: queryKeys.incidents.all() },
        (old: { incidents: Incident[] } | undefined) =>
          old
            ? {
                incidents: old.incidents.map((i) => {
                  if (i.driverId === payload.driverId) {
                    const existingDriver = i.driver ?? {
                      id: payload.driverId,
                      callSign: "Assigned Unit",
                      name: "Ambulance Driver",
                      rating: 4.7,
                      missionsCompleted: 0,
                      status: "en_route",
                      location: { lat: payload.lat, lng: payload.lng },
                      heading: payload.heading ?? 0,
                    };
                    return {
                      ...i,
                      etaMinutes:
                        payload.etaMinutes !== undefined ? payload.etaMinutes : i.etaMinutes,
                      distanceKm:
                        payload.distanceKm !== undefined ? payload.distanceKm : i.distanceKm,
                      polyline: payload.polyline !== undefined ? payload.polyline : i.polyline,
                      driver: {
                        ...existingDriver,
                        location: { lat: payload.lat, lng: payload.lng },
                        heading: payload.heading ?? existingDriver.heading,
                      },
                    };
                  }
                  return i;
                }),
              }
            : old,
      );

      // If specific incidentId is present, also update detail cache
      if (payload.incidentId) {
        queryClient.setQueryData(
          queryKeys.incidents.detail(payload.incidentId),
          (old: { incident: Incident } | undefined) =>
            old
              ? {
                  ...old,
                  incident: {
                    ...old.incident,
                    etaMinutes:
                      payload.etaMinutes !== undefined
                        ? payload.etaMinutes
                        : old.incident.etaMinutes,
                    distanceKm:
                      payload.distanceKm !== undefined
                        ? payload.distanceKm
                        : old.incident.distanceKm,
                    polyline:
                      payload.polyline !== undefined ? payload.polyline : old.incident.polyline,
                    driver: old.incident.driver
                      ? {
                          ...old.incident.driver,
                          location: { lat: payload.lat, lng: payload.lng },
                          heading: payload.heading ?? old.incident.driver.heading,
                        }
                      : undefined,
                  },
                }
              : old,
        );
      }
    }

    function onIncidentEtaUpdate(payload: {
      driverId: string;
      incidentId?: string;
      lat: number;
      lng: number;
      heading?: number;
      etaMinutes?: number | null;
      distanceKm?: number | null;
      polyline?: [number, number][] | null;
      at: string;
    }) {
      onDriverLocation(payload);
    }

    // ── Driver: Status Changed ────────────────────────────────────────────────
    function onDriverStatus(raw: unknown) {
      const driver = normalizeToCamel<Driver>(raw);
      if (!driver) return;

      logger.socket("driver:status", { id: driver.id, status: driver.status });
      const rawDriver = driver as unknown as {
        locationLat?: number | string;
        locationLng?: number | string;
        userName?: string;
        userPhone?: string;
      };
      queryClient.setQueryData(queryKeys.drivers.all(), (old: { drivers: Driver[] } | undefined) =>
        old
          ? {
              drivers: old.drivers.map((current) =>
                current.id === driver.id
                  ? {
                      ...current,
                      ...driver,
                      name: rawDriver.userName ?? current.name,
                      phone: rawDriver.userPhone ?? current.phone,
                      location: {
                        lat: Number(rawDriver.locationLat ?? current.location.lat),
                        lng: Number(rawDriver.locationLng ?? current.location.lng),
                      },
                    }
                  : current,
              ),
            }
          : old,
      );
    }

    function onFleetUpdated(raw: unknown) {
      const vehicle = normalizeToCamel<Vehicle>(raw);
      if (!vehicle) return;
      queryClient.setQueryData(
        queryKeys.vehicles.all(),
        (old: { vehicles: Vehicle[] } | undefined) =>
          old
            ? {
                vehicles: old.vehicles.map((current) =>
                  current.id === vehicle.id ? { ...current, ...vehicle } : current,
                ),
              }
            : old,
      );
    }

    // ── Notification: Created ─────────────────────────────────────────────────
    function onNotificationCreated(raw: unknown) {
      const notification = normalizeToCamel<Notification>(raw);
      logger.socket("notification:created", notification.title);
      queryClient.setQueryData(
        queryKeys.notifications.all(),
        (old: { notifications: Notification[] } | undefined) =>
          old
            ? {
                notifications: [
                  notification,
                  ...old.notifications.filter((n) => n.id !== notification.id),
                ],
              }
            : { notifications: [notification] },
      );
      toast.info(notification.title, { description: notification.body });
    }

    function onRoleNotification(payload: { kind: string; title: string; body?: string }) {
      if (!payload?.title) return;
      toast.info(payload.title, { description: payload.body });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    }

    // ── Incident: New (assigned to this driver) ───────────────────────────────
    function onIncidentNew(raw: unknown) {
      const incident = normalizeToCamel<Incident>(raw);
      if (role === "driver") {
        toast.success(`New mission assigned: ${incident.code}`, {
          description: `${incident.priority} · ${incident.address}`,
          duration: 8000,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      }
    }

    // Register all listeners
    socket.on("incident:created", onIncidentCreated);
    socket.on("incident:assigned", onIncidentAssigned);
    socket.on("incident:updated", onIncidentUpdated);
    socket.on("driver:location", onDriverLocation);
    socket.on("incident:eta_update", onIncidentEtaUpdate);
    socket.on("driver:status", onDriverStatus);
    socket.on("fleet:updated", onFleetUpdated);
    socket.on("notification:created", onNotificationCreated);
    socket.on("role:notification", onRoleNotification);
    socket.on("incident:new", onIncidentNew);

    // Cleanup
    cleanupRef.current = () => {
      socket.off("public:stats_update", onPublicStatsUpdate);
      socket.off("incident:created", onIncidentCreated);
      socket.off("incident:assigned", onIncidentAssigned);
      socket.off("incident:updated", onIncidentUpdated);
      socket.off("driver:location", onDriverLocation);
      socket.off("incident:eta_update", onIncidentEtaUpdate);
      socket.off("driver:status", onDriverStatus);
      socket.off("fleet:updated", onFleetUpdated);
      socket.off("notification:created", onNotificationCreated);
      socket.off("role:notification", onRoleNotification);
      socket.off("incident:new", onIncidentNew);
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isAuthenticated, role, queryClient]);

  return <>{children}</>;
}
