import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { incidentsApi } from "@/lib/api/incidents";
import type { IncidentFilters } from "@/lib/api/incidents";
import { queryKeys } from "@/lib/queryKeys";
import type { Incident, IncidentStatus } from "@/types/incident";
import { ApiError } from "@/types/api";

// ── List Incidents ────────────────────────────────────────────────────────────

export function useIncidents(filters?: IncidentFilters) {
  const query = useQuery({
    queryKey: queryKeys.incidents.list(filters),
    queryFn: () => incidentsApi.list(filters),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    select: (data) =>
      data.incidents.map((i) => ({
        ...i,
        // Ensure location GeoPoint is always present (API client normalizes snake_case but let's be safe)
        location: {
          lat: i.lat ?? (i as unknown as Record<string, Record<string, number>>).location?.lat ?? 0,
          lng: i.lng ?? (i as unknown as Record<string, Record<string, number>>).location?.lng ?? 0,
        },
        timeline: i.timeline ?? [],
      })),
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}

// ── Single Incident ───────────────────────────────────────────────────────────

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: queryKeys.incidents.detail(id!),
    queryFn: () => incidentsApi.get(id!),
    enabled: !!id,
    staleTime: 5_000,
  });
}

// ── Create Incident ───────────────────────────────────────────────────────────

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: incidentsApi.create,
    onSuccess: (data) => {
      // Prepend new incident to all list caches
      queryClient.setQueriesData(
        { queryKey: queryKeys.incidents.all() },
        (old: { incidents: Incident[] } | undefined) =>
          old ? { incidents: [data.incident, ...old.incidents] } : old,
      );
      toast.success(`${data.incident.code} created`, {
        description: `Priority ${data.incident.priority} · ${data.incident.type}`,
      });
    },
    onError: (err: ApiError) => toast.error(err.message),
  });
}

// ── Assign Driver ─────────────────────────────────────────────────────────────

export function useAssignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: incidentsApi.assign,
    onSuccess: (data, { incidentId }) => {
      // Update detail cache
      queryClient.setQueryData(queryKeys.incidents.detail(incidentId), data);
      // Invalidate list + drivers (driver status changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
      toast.success(`Driver assigned to ${data.incident.code}`);
    },
    onError: (err: ApiError) => {
      // Invalidate queries immediately so UI reflects updated availability
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all() });

      if (err.status === 409 || err.message?.toLowerCase().includes("no longer available")) {
        toast.error("Ambulance is no longer available. Another dispatcher may have assigned it.");
      } else {
        toast.error(`Assignment failed: ${err.message}`);
      }
    },
  });
}

// ── Update Incident Status ────────────────────────────────────────────────────

export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: incidentsApi.updateStatus,
    // Optimistic update
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.incidents.detail(id) });
      const snapshot = queryClient.getQueryData(queryKeys.incidents.detail(id));
      queryClient.setQueryData(
        queryKeys.incidents.detail(id),
        (old: { incident: Incident } | undefined) =>
          old ? { ...old, incident: { ...old.incident, status } } : old,
      );
      return { snapshot, id };
    },
    onError: (err: ApiError, _vars, ctx) => {
      if (ctx) {
        queryClient.setQueryData(queryKeys.incidents.detail(ctx.id), ctx.snapshot);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
      toast.error(err.message || "Status update failed");
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all() });
    },
  });
}

// ── Dispatch Recommendations ──────────────────────────────────────────────────

export function useDispatchRecommendations(incidentId: string | null) {
  return useQuery({
    queryKey: queryKeys.dispatch.recommendations(incidentId!),
    queryFn: async () => {
      const res = await import("@/lib/api/dispatch").then((m) =>
        m.dispatchApi.recommend(incidentId!),
      );
      return res;
    },
    enabled: !!incidentId,
    staleTime: 30_000,
    select: (data) => data.recommendations,
  });
}

// ── Active Incidents (convenience) ───────────────────────────────────────────

export function useActiveIncidents() {
  return useIncidents();
}

// ── Incident Status helpers ───────────────────────────────────────────────────

export const INCIDENT_STATUS_FLOW: Partial<Record<IncidentStatus, IncidentStatus>> = {
  assigned: "accepted",
  accepted: "en_route",
  en_route: "arrived",
  arrived: "patient_loaded",
  patient_loaded: "at_hospital",
  at_hospital: "completed",
};
