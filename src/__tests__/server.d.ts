/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "*/server/src/utils/routing.js" {
  export function isValidCoordinate(coord: any): boolean;
  export function calculateRouteEta(from: any, to: any, options?: any): Promise<any>;
  export function geojsonToLeaflet(coordinates: any): [number, number][];
  export function hasSignificantMovement(a: any, b: any, thresholdMeters?: number): boolean;
  export function isDeviatedFromRoute(loc: any, polyline: any, thresholdMeters?: number): boolean;
  export function distanceMeters(a: any, b: any): number;
  export function clearRouteCache(): void;
}

declare module "*/server/src/modules/dispatch/recommendation.js" {
  export function meetsMandatoryCapabilities(
    type: any,
    priority: any,
    emergencyType?: any,
  ): boolean;
  export function scoreAmbulanceRecommendation(driver: any, incident: any): Promise<any>;
  export function getTopAmbulanceRecommendations(
    db: any,
    incidentId: any,
    topN?: number,
  ): Promise<any>;
  export const VEHICLE_CAPABILITIES: Record<
    string,
    { label: string; capabilities: string[]; tier: number }
  >;
}

declare module "*/server/src/utils/geo.js" {
  export function haversineKm(a: any, b: any): number;
}
