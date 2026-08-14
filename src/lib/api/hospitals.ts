import { client } from "./client";
import type { Hospital } from "@/types/hospital";

export interface HospitalsListResponse {
  hospitals: Hospital[];
}

export interface HospitalResponse {
  hospital: Hospital;
}

export const hospitalsApi = {
  list: () => client.get<HospitalsListResponse>("/hospitals"),

  updateBeds: (id: string, bedsAvailable: number) =>
    client.patch<HospitalResponse>(`/hospitals/${id}/beds`, { bedsAvailable }),
};
