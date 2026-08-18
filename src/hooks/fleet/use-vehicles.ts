import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vehiclesApi, type CreateVehicleInput } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.all(),
    queryFn: vehiclesApi.list,
    staleTime: 60_000,
    select: (data) => data.vehicles,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleInput) => vehiclesApi.create(data),
    onSuccess: (res) => {
      toast.success(`Vehicle ${res.vehicle.plate} added to fleet.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to add vehicle.";
      toast.error(msg);
    },
  });
}
