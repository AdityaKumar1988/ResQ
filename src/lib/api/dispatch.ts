import { client } from "./client";
import type { DispatchRecommendation } from "@/types/driver";

export interface DispatchRecommendationsResponse {
  recommendations: DispatchRecommendation[];
}

export interface DispatchEstimateResponse {
  isAvailable: boolean;
  etaMinutes: number | null;
  distanceKm: number | null;
  message?: string;
  provider?: string;
}

export interface RouteResponse {
  distanceKm: number | null;
  etaMinutes: number | null;
  polyline: [number, number][] | null;
  provider: string;
}

export const dispatchApi = {
  recommend: (incidentId: string) =>
    client.get<DispatchRecommendationsResponse>(`/dispatch/recommend/${incidentId}`),
  estimate: (params: { lat: number; lng: number; priority?: string }) =>
    client.get<DispatchEstimateResponse>("/dispatch/estimate", { params }),
  getRoute: (params: { fromLat: number; fromLng: number; toLat: number; toLng: number }) =>
    client.get<RouteResponse>("/dispatch/route", { params }),
};
