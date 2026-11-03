import { client } from "@/lib/api/client";
import type { PublicStats, HealthResponse } from "@/types/public";

export const publicApi = {
  getStats: () => client.get<PublicStats>("/public/stats", { skipAuth: true }),
  getHealth: () => client.get<HealthResponse>("/public/health", { skipAuth: true }),
};
