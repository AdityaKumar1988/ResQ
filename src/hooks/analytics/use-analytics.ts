import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import { queryKeys } from "@/lib/queryKeys";

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: queryKeys.analytics.overview(),
    queryFn: analyticsApi.overview,
    staleTime: 60_000,
    refetchInterval: 60_000, // background refetch every minute
  });
}

export function useAnalyticsSla() {
  return useQuery({
    queryKey: queryKeys.analytics.sla(),
    queryFn: analyticsApi.sla,
    staleTime: 60_000,
    select: (data) =>
      data.sla.map((row) => ({
        ...row,
        avgDispatchSeconds: Number(row.avg_dispatch_seconds ?? 0),
        count: Number(row.n),
      })),
  });
}
