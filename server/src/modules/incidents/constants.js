/**
 * Authoritative state machine transition map for incidents.
 * Defines valid status transitions in Smart EMS.
 */
export const ALLOWED_TRANSITIONS = {
  reported: ["assigned", "cancelled"],
  assigned: ["accepted", "cancelled"],
  accepted: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"],
  arrived: ["patient_loaded", "cancelled"],
  patient_loaded: ["at_hospital", "cancelled"],
  at_hospital: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const NEXT_STATUS = {
  assigned: "accepted",
  accepted: "en_route",
  en_route: "arrived",
  arrived: "patient_loaded",
  patient_loaded: "at_hospital",
  at_hospital: "completed",
};

export const DRIVER_STATUS_FOR_INCIDENT_STATUS = {
  accepted: "busy",
  en_route: "en_route",
  arrived: "busy",
  patient_loaded: "busy",
  at_hospital: "at_hospital",
  completed: "available",
  cancelled: "available",
};
