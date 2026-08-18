import { useQuery } from "@tanstack/react-query";
import { hospitalsApi } from "@/lib/api/hospitals";
import { queryKeys } from "@/lib/queryKeys";

export function useHospitals() {
  return useQuery({
    queryKey: queryKeys.hospitals.all(),
    queryFn: hospitalsApi.list,
    staleTime: 5 * 60_000,
    select: (data) =>
      data.hospitals.map((h) => ({
        ...h,
        beds: Number(h.beds ?? 0),
        bedsAvailable: Number(h.bedsAvailable ?? 0),
        location: { lat: Number(h.lat), lng: Number(h.lng) },
      })),
  });
}
