import type { GeoPoint } from "./incident";

// ── Ambulance / Driver status ────────────────────────────────────────────────

export type AmbulanceStatus =
  | "available"
  | "en_route"
  | "busy"
  | "at_hospital"
  | "offline"
  | "maintenance";

// ── Driver ───────────────────────────────────────────────────────────────────

/**
 * Frontend-normalized Driver shape.
 * The backend joins drivers + users and returns snake_case fields.
 * The API client normalizes to camelCase before this type is used.
 */
export interface Driver {
  id: string;
  userId: string;
  vehicleId?: string;
  callSign: string;
  rating: number;
  missionsCompleted: number;
  missionsActive: number;
  avgResponseSec: number;
  status: AmbulanceStatus;
  location: GeoPoint;
  heading: number;
  lastPingAt?: string;
  // Joined from users table
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export const STATUS_META: Record<AmbulanceStatus, { label: string; token: string }> = {
  available: { label: "Available", token: "status-available" },
  en_route: { label: "En route", token: "status-enroute" },
  busy: { label: "On scene", token: "status-busy" },
  at_hospital: { label: "At hospital", token: "status-hospital" },
  offline: { label: "Offline", token: "status-offline" },
  maintenance: { label: "Maintenance", token: "status-maintenance" },
};

// ── API payloads ─────────────────────────────────────────────────────────────

export interface UpdateLocationInput {
  lat: number;
  lng: number;
  heading?: number;
}

export interface UpdateDriverStatusInput {
  status: AmbulanceStatus;
}

// ── Dispatch recommendation ───────────────────────────────────────────────────

export interface DispatchRecommendation {
  driverId: string;
  score: number;
  distanceKm: number;
  etaMinutes: number;
  reasons: string[];
}
