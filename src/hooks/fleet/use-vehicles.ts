import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vehiclesApi, type CreateVehicleInput, type UpdateVehicleInput } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function useVehicles() {
  const { user } = useAuth();
  const isAuthorized = user?.role === "dispatcher" || user?.role === "admin";
  return useQuery({
    queryKey: queryKeys.vehicles.all(),
    queryFn: vehiclesApi.list,
    enabled: isAuthorized,
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

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleInput }) =>
      vehiclesApi.update(id, data),
    onSuccess: (res) => {
      toast.success(`Vehicle ${res.vehicle.plate} updated.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update vehicle.";
      toast.error(msg);
    },
  });
}
