import { client } from "./client";
import type { Vehicle } from "@/types/vehicle";

export interface VehiclesListResponse {
  vehicles: Vehicle[];
}

export const vehiclesApi = {
  list: () => client.get<VehiclesListResponse>("/vehicles"),
};
