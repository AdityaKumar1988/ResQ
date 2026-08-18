import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { driversApi } from "@/lib/api/drivers";
import { queryKeys } from "@/lib/queryKeys";
import type { Driver } from "@/types/driver";

function normalizeDriverClient(d: Driver): Driver {
  if (!d) return d;
  const raw = d as unknown as Record<string, unknown>;
  const existingLoc = raw.location as { lat?: number | string; lng?: number | string } | undefined;
  const name = String(raw.userName ?? raw.name ?? d.name ?? d.callSign ?? "Driver");
  const phone = (raw.userPhone ?? raw.phone ?? d.phone) as string | undefined;
  const ratingNum = Number(raw.rating ?? d.rating ?? 0);
  const missionsCompletedNum = Number(raw.missionsCompleted ?? d.missionsCompleted ?? 0);
  const missionsActiveNum = Number(raw.missionsActive ?? d.missionsActive ?? 0);
  const avgResponseSecNum = Number(raw.avgResponseSec ?? d.avgResponseSec ?? 480);
  const headingNum = Number(raw.heading ?? d.heading ?? 0);

  return {
    ...d,
    name,
    phone: phone ? String(phone) : undefined,
    rating: Number.isFinite(ratingNum) ? ratingNum : 4.7,
    missionsCompleted: Number.isFinite(missionsCompletedNum) ? missionsCompletedNum : 0,
    missionsActive: Number.isFinite(missionsActiveNum) ? missionsActiveNum : 0,
    avgResponseSec: Number.isFinite(avgResponseSecNum) ? avgResponseSecNum : 480,
    heading: Number.isFinite(headingNum) ? headingNum : 0,
    location: {
      lat: Number(raw.locationLat ?? existingLoc?.lat ?? 0),
      lng: Number(raw.locationLng ?? existingLoc?.lng ?? 0),
    },
  };
}

// ── All Drivers (dispatcher/admin) ────────────────────────────────────────────

export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers.all(),
    queryFn: driversApi.list,
    staleTime: 30_000,
    refetchOnReconnect: true,
    select: (data) => data.drivers.map(normalizeDriverClient),
  });
}

// ── Current Driver's own record ───────────────────────────────────────────────

export function useDriverMe() {
  return useQuery({
    queryKey: queryKeys.drivers.me(),
    queryFn: driversApi.me,
    staleTime: 30_000,
    select: (data) => (data.driver ? normalizeDriverClient(data.driver) : null),
  });
}

// ── Update Location ───────────────────────────────────────────────────────────

export function useUpdateDriverLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: driversApi.updateLocation,
    onSuccess: (data) => {
      // Update driver in the all-drivers list cache
      queryClient.setQueryData(queryKeys.drivers.all(), (old: { drivers: Driver[] } | undefined) =>
        old
          ? {
              drivers: old.drivers.map((d) =>
                d.id === data.driver.id ? normalizeDriverClient({ ...d, ...data.driver }) : d,
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
      queryClient.setQueryData(queryKeys.drivers.all(), (old: { drivers: Driver[] } | undefined) =>
        old
          ? {
              drivers: old.drivers.map((d) =>
                d.id === data.driver.id
                  ? normalizeDriverClient({ ...d, status: data.driver.status })
                  : d,
              ),
            }
          : old,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.me() });
    },
  });
}
