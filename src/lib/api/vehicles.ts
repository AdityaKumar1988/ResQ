import { client } from "./client";
import type { Vehicle } from "@/types/vehicle";

export interface VehiclesListResponse {
  vehicles: Vehicle[];
}

export interface CreateVehicleInput {
  plate: string;
  model: string;
  type: "ALS" | "BLS" | "ICU" | "MICU";
  status?: "available" | "en_route" | "busy" | "at_hospital" | "offline" | "maintenance";
}

export const vehiclesApi = {
  list: () => client.get<VehiclesListResponse>("/vehicles"),
  create: (data: CreateVehicleInput) => client.post<{ vehicle: Vehicle }>("/vehicles", data),
};
