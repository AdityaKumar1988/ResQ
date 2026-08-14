import { client } from "./client";
import type { Driver, UpdateLocationInput, UpdateDriverStatusInput } from "@/types/driver";

export interface DriversListResponse {
  drivers: Driver[];
}

export interface DriverResponse {
  driver: Driver;
}

export const driversApi = {
  list: () => client.get<DriversListResponse>("/drivers"),

  me: () => client.get<DriverResponse>("/drivers/me"),

  updateLocation: (data: UpdateLocationInput) =>
    client.post<DriverResponse>("/drivers/me/location", data),

  updateStatus: (data: UpdateDriverStatusInput) =>
    client.patch<DriverResponse>("/drivers/me/status", data),
};
