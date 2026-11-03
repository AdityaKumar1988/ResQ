import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api/public";
import { queryKeys } from "@/lib/queryKeys";
import type { PublicStats } from "@/types/public";

export function usePublicStats() {
  return useQuery<PublicStats>({
    queryKey: queryKeys.public.stats(),
    queryFn: () => publicApi.getStats(),
    refetchInterval: 30_000, // Background polling fallback
    staleTime: 10_000,
    retry: 2,
  });
}
