import { client } from "./client";
import type { AnalyticsOverview, AnalyticsSla } from "@/types/analytics";

export const analyticsApi = {
  overview: () => client.get<AnalyticsOverview>("/analytics/overview"),

  sla: () => client.get<AnalyticsSla>("/analytics/sla"),
};
