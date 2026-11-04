import { client } from "./client";
import type { Hospital } from "@/types/hospital";

export interface HospitalsListResponse {
  hospitals: Hospital[];
}

export interface HospitalResponse {
  hospital: Hospital;
}

export interface CreateHospitalInput {
  name: string;
  lat: number;
  lng: number;
  beds: number;
  beds_available?: number;
  bedsAvailable?: number;
}

export const hospitalsApi = {
  list: () => client.get<HospitalsListResponse>("/hospitals"),

  create: (data: CreateHospitalInput) => client.post<HospitalResponse>("/hospitals", data),

  updateBeds: (id: string, bedsAvailable: number) =>
    client.patch<HospitalResponse>(`/hospitals/${id}/beds`, { bedsAvailable }),
};
