import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hospitalsApi, type CreateHospitalInput } from "@/lib/api/hospitals";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

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

export function useCreateHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHospitalInput) => hospitalsApi.create(data),
    onSuccess: (res) => {
      toast.success(`Hospital "${res.hospital.name}" added successfully.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.hospitals.all() });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to add hospital.";
      toast.error(msg);
    },
  });
}
