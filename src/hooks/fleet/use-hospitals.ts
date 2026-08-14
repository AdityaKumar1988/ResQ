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
        location: { lat: Number(h.lat), lng: Number(h.lng) },
      })),
  });
}
