import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api/public";
import { queryKeys } from "@/lib/queryKeys";
import type { HealthResponse } from "@/types/public";

export function usePublicHealth() {
  return useQuery<HealthResponse>({
    queryKey: queryKeys.public.health(),
    queryFn: () => publicApi.getHealth(),
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}
