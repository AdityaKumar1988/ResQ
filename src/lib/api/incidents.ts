import { client } from "./client";
import type {
  AssignDriverInput,
  CreateIncidentInput,
  Incident,
  IncidentStatus,
  TimelineEvent,
} from "@/types/incident";

export interface IncidentFilters {
  status?: IncidentStatus;
  priority?: string;
  limit?: number;
}

export interface IncidentsListResponse {
  incidents: Incident[];
}

export interface IncidentDetailResponse {
  incident: Incident;
  timeline: TimelineEvent[];
}

export interface IncidentResponse {
  incident: Incident;
}

export const incidentsApi = {
  list: (filters?: IncidentFilters) =>
    client.get<IncidentsListResponse>("/incidents", {
      params: {
        status: filters?.status,
        priority: filters?.priority,
        limit: filters?.limit,
      },
    }),

  get: (id: string) => client.get<IncidentDetailResponse>(`/incidents/${id}`),

  create: (data: CreateIncidentInput) =>
    client.post<IncidentResponse>("/incidents", data),

  assign: ({ incidentId, driverId }: AssignDriverInput) =>
    client.post<IncidentResponse>(`/incidents/${incidentId}/assign`, { driverId }),

  updateStatus: ({ id, status, note }: { id: string; status: IncidentStatus; note?: string }) =>
    client.patch<IncidentResponse>(`/incidents/${id}/status`, { status, note }),
};
