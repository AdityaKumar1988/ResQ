import { client } from "./client";
import type { DispatchRecommendation } from "@/types/driver";

export interface DispatchRecommendationsResponse {
  recommendations: DispatchRecommendation[];
}

export const dispatchApi = {
  recommend: (incidentId: string) =>
    client.get<DispatchRecommendationsResponse>(`/dispatch/recommend/${incidentId}`),
};
