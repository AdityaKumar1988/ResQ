import type { UserRole } from "./auth";
import type { Driver } from "./driver";

// ── Primitives ──────────────────────────────────────────────────────────────

export type Priority = "P1" | "P2" | "P3" | "P4";

export type EmergencyType =
  | "cardiac"
  | "trauma"
  | "stroke"
  | "respiratory"
  | "obstetric"
  | "pediatric"
  | "psychiatric"
  | "burn"
  | "other";

export type IncidentStatus =
  | "reported"
  | "assigned"
  | "accepted"
  | "en_route"
  | "arrived"
  | "patient_loaded"
  | "at_hospital"
  | "completed"
  | "cancelled";

// ── Domain models (frontend-normalized — camelCase) ─────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  timestamp: string; // ISO
  actorId?: string;
  actorName?: string;
  note?: string;
}

/**
 * Frontend-normalized Incident shape.
 * The API client transforms snake_case DB fields into camelCase here
 * so all UI components work identically to the old mock store shape.
 */
export interface Incident {
  id: string;
  code: string;
  priority: Priority;
  type: EmergencyType;
  status: IncidentStatus;
  lat: number;
  lng: number;
  /** Convenience getter — identical coordinates as a GeoPoint */
  location: GeoPoint;
  address: string;
  notes?: string;
  citizenName: string;
  citizenPhone: string;
  citizenUserId?: string;
  driverId?: string;
  vehicleId?: string;
  hospitalId?: string;
  slaSeconds: number;
  reportedAt: string;
  assignedAt?: string;
  completedAt?: string;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  polyline?: [number, number][] | null;
  driver?: Driver;
  timeline?: TimelineEvent[];
}

// ── Metadata constants ───────────────────────────────────────────────────────

export const PRIORITY_META: Record<Priority, { label: string; slaSec: number; token: string }> = {
  P1: { label: "Critical", slaSec: 480, token: "p1" },
  P2: { label: "Urgent", slaSec: 900, token: "p2" },
  P3: { label: "Serious", slaSec: 1800, token: "p3" },
  P4: { label: "Non-critical", slaSec: 3600, token: "p4" },
};

export const EMERGENCY_LABELS: Record<EmergencyType, string> = {
  cardiac: "Cardiac arrest",
  trauma: "Trauma / accident",
  stroke: "Stroke",
  respiratory: "Respiratory",
  obstetric: "Obstetric",
  pediatric: "Pediatric",
  psychiatric: "Psychiatric",
  burn: "Burn injury",
  other: "Other",
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: "Reported",
  assigned: "Assigned",
  accepted: "Accepted",
  en_route: "En route",
  arrived: "On scene",
  patient_loaded: "Patient loaded",
  at_hospital: "At hospital",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ── API payloads ─────────────────────────────────────────────────────────────

export interface CreateIncidentInput {
  priority: Priority;
  type: EmergencyType;
  lat: number;
  lng: number;
  address: string;
  notes?: string;
  citizenName: string;
  citizenPhone: string;
}

export interface AssignDriverInput {
  incidentId: string;
  driverId: string;
}

export interface UpdateIncidentStatusInput {
  id: string;
  status: IncidentStatus;
  note?: string;
}
