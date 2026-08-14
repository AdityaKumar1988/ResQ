import type { GeoPoint } from "./incident";

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Convenience GeoPoint — same as lat/lng */
  location: GeoPoint;
  beds: number;
  bedsAvailable: number;
  createdAt: string;
  updatedAt: string;
}
