export interface PublicIncidentActivity {
  id: string;
  code: string;
  priority: "P1" | "P2" | "P3" | "P4";
  type: string;
  status: string;
  sector: string;
  reportedAt: string;
}

export interface PublicStats {
  activeIncidents: number;
  availableUnits: number;
  onShiftUnits: number;
  totalIncidents: number;
  recentActivity: PublicIncidentActivity[];
  updatedAt: string;
}

export type OperationalHealthStatus = "operational" | "waking" | "degraded" | "offline";

export interface HealthResponse {
  status: "operational" | "healthy" | "degraded" | "unhealthy";
  database: "connected" | "disconnected";
  ok: boolean;
  timestamp?: string;
  env?: string;
  at?: string;
}
