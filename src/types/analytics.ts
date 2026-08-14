import type { Priority, IncidentStatus } from "./incident";

// ── Analytics Overview ───────────────────────────────────────────────────────

export interface AnalyticsTotals {
  incidents: number;
  drivers: number;
  available: number;
}

export interface AnalyticsByStatus {
  status: IncidentStatus;
  n: string; // Postgres COUNT returns string
}

export interface AnalyticsByPriority {
  priority: Priority;
  n: string; // Postgres COUNT returns string
}

export interface AnalyticsOverview {
  totals: AnalyticsTotals;
  byStatus: AnalyticsByStatus[];
  byPriority: AnalyticsByPriority[];
}

// ── SLA Analytics ────────────────────────────────────────────────────────────

export interface SlaRow {
  priority: Priority;
  avg_dispatch_seconds: string; // Postgres AVG returns string
  n: string;
}

export interface AnalyticsSla {
  sla: SlaRow[];
}
