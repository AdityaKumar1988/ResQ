// Re-export all API modules as a unified object.
export { client } from "./client";
export { authApi } from "./auth";
export { incidentsApi } from "./incidents";
export { driversApi } from "./drivers";
export { hospitalsApi } from "./hospitals";
export { vehiclesApi } from "./vehicles";
export { analyticsApi } from "./analytics";
export { notificationsApi } from "./notifications";
export { dispatchApi } from "./dispatch";
export { usersApi } from "./users";

export type {
  IncidentFilters,
  IncidentsListResponse,
  IncidentDetailResponse,
  IncidentResponse,
} from "./incidents";
export type { DriversListResponse, DriverResponse } from "./drivers";
export type { HospitalsListResponse, HospitalResponse } from "./hospitals";
export type { DispatchRecommendationsResponse } from "./dispatch";
export type { UserInfo, CreateStaffInput } from "./users";
