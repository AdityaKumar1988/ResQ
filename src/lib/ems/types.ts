// Shared domain types. These mirror the Express/Postgres schema in /server so
// the mock service layer can be swapped for real API calls with no shape changes.

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

export type AmbulanceStatus =
  | "available"
  | "en_route"
  | "busy"
  | "at_hospital"
  | "offline"
  | "maintenance";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Citizen {
  id: string;
  name: string;
  phone: string;
  location: GeoPoint;
  address: string;
}

export interface Driver {
  id: string;
  name: string;
  callSign: string;
  phone?: string;
  rating: number;
  missionsCompleted: number;
  avgResponseSec: number;
  status: AmbulanceStatus;
  location: GeoPoint;
  heading: number;
  vehicleId?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: "ALS" | "BLS" | "ICU" | "MICU";
  status: AmbulanceStatus;
}

export interface Hospital {
  id: string;
  name: string;
  location: GeoPoint;
  beds: number;
  bedsAvailable: number;
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

export interface Incident {
  id: string;
  code: string; // human-readable e.g. INC-2145
  priority: Priority;
  type: EmergencyType;
  status: IncidentStatus;
  location: GeoPoint;
  address: string;
  citizenName: string;
  citizenPhone: string;
  citizenUserId?: string;
  driverId?: string;
  vehicleId?: string;
  hospitalId?: string;
  slaSeconds: number; // e.g. P1 = 480 (8min)
  reportedAt: string;
  assignedAt?: string;
  completedAt?: string;
  notes?: string;
  timeline?: TimelineEvent[];
}

export interface DispatchRecommendation {
  driverId: string;
  score: number;
  distanceKm: number;
  etaMinutes: number;
  reasons: string[];
}

export type UserRole = "citizen" | "dispatcher" | "driver" | "admin";

export const PRIORITY_META: Record<Priority, { label: string; slaSec: number; token: string }> = {
  P1: { label: "Critical", slaSec: 480, token: "p1" },
  P2: { label: "Urgent", slaSec: 900, token: "p2" },
  P3: { label: "Serious", slaSec: 1800, token: "p3" },
  P4: { label: "Non-critical", slaSec: 3600, token: "p4" },
};

export const STATUS_META: Record<AmbulanceStatus, { label: string; token: string }> = {
  available: { label: "Available", token: "status-available" },
  en_route: { label: "En route", token: "status-enroute" },
  busy: { label: "On scene", token: "status-busy" },
  at_hospital: { label: "At hospital", token: "status-hospital" },
  offline: { label: "Offline", token: "status-offline" },
  maintenance: { label: "Maintenance", token: "status-maintenance" },
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
