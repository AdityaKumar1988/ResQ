import type { AmbulanceStatus } from "./driver";

export type VehicleType = "ALS" | "BLS" | "ICU" | "MICU";

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: VehicleType;
  status: AmbulanceStatus;
  createdAt: string;
  updatedAt: string;
}
