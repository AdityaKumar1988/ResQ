import { useQuery } from "@tanstack/react-query";
import { vehiclesApi } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/queryKeys";

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.all(),
    queryFn: vehiclesApi.list,
    staleTime: 60_000,
    select: (data) => data.vehicles,
  });
}
