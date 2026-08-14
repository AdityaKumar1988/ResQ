import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { driversApi } from "@/lib/api/drivers";
import { queryKeys } from "@/lib/queryKeys";
import type { Driver } from "@/types/driver";

// ── All Drivers (dispatcher/admin) ────────────────────────────────────────────

export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers.all(),
    queryFn: driversApi.list,
    staleTime: 30_000,
    refetchOnReconnect: true,
    select: (data) =>
      data.drivers.map((d) => {
        const raw = d as unknown as Record<string, unknown>;
        const existingLoc = raw.location as { lat?: number; lng?: number } | undefined;
        return {
          ...d,
          // Backend may send location_lat/location_lng (normalized to locationLat/locationLng)
          // or a nested location object — normalize to GeoPoint
          location: {
            lat: Number((raw.locationLat ?? existingLoc?.lat) ?? 0),
            lng: Number((raw.locationLng ?? existingLoc?.lng) ?? 0),
          },
        };
      }),
  });
}

// ── Current Driver's own record ───────────────────────────────────────────────

export function useDriverMe() {
  return useQuery({
    queryKey: queryKeys.drivers.me(),
    queryFn: driversApi.me,
    staleTime: 30_000,
    select: (data) => data.driver,
  });
}

// ── Update Location ───────────────────────────────────────────────────────────

export function useUpdateDriverLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: driversApi.updateLocation,
    onSuccess: (data) => {
      // Update driver in the all-drivers list cache
      queryClient.setQueryData(
        queryKeys.drivers.all(),
        (old: { drivers: Driver[] } | undefined) =>
          old
            ? {
                drivers: old.drivers.map((d) =>
                  d.id === data.driver.id ? { ...d, ...data.driver } : d,
                ),
              }
            : old,
      );
    },
  });
}

// ── Update Driver Status ──────────────────────────────────────────────────────

export function useUpdateDriverStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: driversApi.updateStatus,
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.drivers.all(),
        (old: { drivers: Driver[] } | undefined) =>
          old
            ? {
                drivers: old.drivers.map((d) =>
                  d.id === data.driver.id ? { ...d, status: data.driver.status } : d,
                ),
              }
            : old,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.me() });
    },
  });
}
