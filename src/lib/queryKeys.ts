import type { IncidentFilters } from "@/lib/api/incidents";

/**
 * Centralized query key factory.
 * Never hardcode query key strings anywhere else in the codebase.
 * All keys are const-typed for maximum type safety with invalidateQueries.
 */
export const queryKeys = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  me: () => ["auth", "me"] as const,

  // ── Incidents ─────────────────────────────────────────────────────────────
  incidents: {
    all: () => ["incidents"] as const,
    list: (filters?: IncidentFilters) => ["incidents", "list", filters ?? {}] as const,
    detail: (id: string) => ["incidents", "detail", id] as const,
    timeline: (id: string) => ["incidents", "timeline", id] as const,
  },

  // ── Drivers ───────────────────────────────────────────────────────────────
  drivers: {
    all: () => ["drivers"] as const,
    me: () => ["drivers", "me"] as const,
  },

  // ── Vehicles ──────────────────────────────────────────────────────────────
  vehicles: {
    all: () => ["vehicles"] as const,
  },

  // ── Hospitals ─────────────────────────────────────────────────────────────
  hospitals: {
    all: () => ["hospitals"] as const,
  },

  // ── Dispatch ──────────────────────────────────────────────────────────────
  dispatch: {
    recommendations: (incidentId: string) => ["dispatch", "recommend", incidentId] as const,
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: {
    all: () => ["analytics"] as const,
    overview: () => ["analytics", "overview"] as const,
    sla: () => ["analytics", "sla"] as const,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    all: () => ["notifications"] as const,
  },

  // ── Users (admin) ─────────────────────────────────────────────────────────
  users: {
    all: () => ["users"] as const,
  },
} as const;
