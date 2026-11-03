import { calculateRouteEta, isValidCoordinate } from "../../utils/routing.js";

export const VEHICLE_CAPABILITIES = {
  MICU: {
    label: "Mobile Intensive Care Unit",
    capabilities: [
      "ICU Transport Ventilator",
      "Advanced Cardiac Defibrillator",
      "Multiparameter Vital Monitor",
      "Infusion Pumps",
      "Critical Care Pharmacopeia",
      "Advanced Airway & Intubation Kit",
    ],
    tier: 4,
  },
  ICU: {
    label: "Intensive Care Unit",
    capabilities: [
      "Transport Ventilator",
      "Cardiac Monitor / Defibrillator",
      "Suction Unit & IV Infusion",
      "Advanced Airway Kit",
      "Emergency Resuscitation Drugs",
    ],
    tier: 3,
  },
  ALS: {
    label: "Advanced Life Support",
    capabilities: [
      "Cardiac Monitor & Defibrillator",
      "Advanced Airway & Intubation Kit",
      "Emergency Cardiac Medications",
      "IV Therapy Kit",
      "Pulse Oximetry & Capnography",
    ],
    tier: 2,
  },
  BLS: {
    label: "Basic Life Support",
    capabilities: [
      "Automated External Defibrillator (AED)",
      "Oxygen Delivery & BVM Resuscitator",
      "Spinal Immobilization & Splints",
      "Vital Signs Monitor",
      "Basic Trauma & Hemorrhage Kit",
    ],
    tier: 1,
  },
};

/**
 * Validates whether an ambulance meets mandatory medical equipment criteria for an incident.
 * P1 Critical incidents (cardiac arrest, respiratory failure, stroke, polytrauma) MANDATE ALS, ICU, or MICU.
 * BLS units lack advanced cardiac life support and intubation capabilities required for P1.
 */
export function meetsMandatoryCapabilities(vehicleType, priority, emergencyType) {
  const type = (vehicleType || "").toUpperCase();
  const meta = VEHICLE_CAPABILITIES[type];
  if (!meta) return false;

  if (priority === "P1") {
    // P1 Critical demands minimum Tier 2 (ALS, ICU, or MICU)
    return meta.tier >= 2;
  }

  // P2, P3, P4 can be safely served by any valid registered emergency vehicle
  return true;
}

/**
 * Calculates capability match score and rationale based on incident priority and vehicle type.
 */
function scoreCapability(vehicleType, priority) {
  const type = (vehicleType || "").toUpperCase();
  const meta = VEHICLE_CAPABILITIES[type] || VEHICLE_CAPABILITIES.BLS;
  let score = 0;
  let rationale = "";

  if (priority === "P1") {
    if (type === "MICU") {
      score = 25;
      rationale =
        "Mobile ICU: Maximum critical care capability with ventilator & advanced defibrillator";
    } else if (type === "ICU") {
      score = 24;
      rationale =
        "ICU Unit: Fully equipped for high-acuity resuscitation and critical airway management";
    } else if (type === "ALS") {
      score = 23;
      rationale =
        "ALS Certified: Advanced cardiac life support, telemetry monitor & emergency medications";
    } else {
      score = 0;
      rationale =
        "BLS Unit: Lacks required advanced life support equipment for critical P1 condition";
    }
  } else if (priority === "P2") {
    if (type === "ALS") {
      score = 25;
      rationale = "Optimal ALS capability match for urgent intervention";
    } else if (type === "ICU" || type === "MICU") {
      score = 23;
      rationale = "Advanced high-acuity unit available for urgent dispatch";
    } else {
      score = 14;
      rationale = "BLS Unit: Equipped for rapid stabilization and emergency transport";
    }
  } else if (priority === "P3") {
    if (type === "BLS") {
      score = 25;
      rationale = "Optimal BLS match: Full basic trauma and AED coverage while reserving ALS units";
    } else if (type === "ALS") {
      score = 20;
      rationale = "ALS capability provides surplus safety margin for serious condition";
    } else {
      score = 15;
      rationale = "Specialized intensive care unit assigned to serious condition";
    }
  } else {
    // P4 Non-critical
    if (type === "BLS") {
      score = 25;
      rationale = "Optimal resource allocation: BLS provides ideal basic care";
    } else {
      score = 12;
      rationale = "Surplus medical capability; suitable for non-critical transport";
    }
  }

  return { score, rationale, capabilities: meta.capabilities, label: meta.label };
}

/**
 * Evaluates and scores an eligible ambulance driver against an active incident.
 */
export async function scoreAmbulanceRecommendation(driver, incident) {
  const driverLoc = {
    lat: Number(driver.location_lat),
    lng: Number(driver.location_lng),
  };
  const incidentLoc = {
    lat: Number(incident.lat),
    lng: Number(incident.lng),
  };

  // 1. Calculate road routing with geometry
  const route = await calculateRouteEta(driverLoc, incidentLoc, { includeGeometry: true });
  const distanceKm = route.distanceKm ?? 0;
  const etaMinutes = route.etaMinutes ?? 15;

  // 2. ETA & Proximity Score (45 points max)
  // 2 min => 40.5 pts; 5 min => 33.75 pts; 10 min => 22.5 pts; 20+ min => 0 pts
  const etaScore = Math.max(0, 45 - etaMinutes * 2.25);

  // 3. Medical Capability Score (25 points max)
  const vehicleType = driver.vehicle_type || "BLS";
  const cap = scoreCapability(vehicleType, incident.priority);

  // 4. Crew Rating & Experience Score (15 points max)
  const rating = Number(driver.rating != null ? driver.rating : 4.5);
  const ratingScore = Math.min(10, Math.max(0, ((rating - 4.0) / 1.0) * 10));
  const missionsCompleted = Number(driver.missions_completed || 0);
  const experienceScore = Math.min(5, (missionsCompleted / 20) * 5);
  const crewScore = Number((ratingScore + experienceScore).toFixed(1));

  // 5. GPS Freshness & Telemetry Score (10 points max)
  let gpsScore = 10;
  let gpsFreshnessText = "Live GPS verified";
  if (driver.last_ping_at) {
    const ageSeconds = Math.max(0, (Date.now() - new Date(driver.last_ping_at).getTime()) / 1000);
    if (ageSeconds < 60) {
      gpsScore = 10;
      gpsFreshnessText = `Fresh telemetry (GPS pinged ${Math.round(ageSeconds)}s ago)`;
    } else if (ageSeconds < 180) {
      gpsScore = 8;
      gpsFreshnessText = `Telemetry updated ${Math.round(ageSeconds / 60)}m ago`;
    } else if (ageSeconds < 600) {
      gpsScore = 4;
      gpsFreshnessText = `Telemetry aging (${Math.round(ageSeconds / 60)}m ago)`;
    } else {
      gpsScore = 1;
      gpsFreshnessText = "Stale telemetry (> 10m ago)";
    }
  }

  // 6. Workload & Availability Score (5 points max)
  const activeMissions = Number(driver.missions_active || 0);
  const workloadScore = activeMissions === 0 ? 5 : 0;

  // Total composite score (0 - 100)
  const totalScore = Number(
    Math.min(100, etaScore + cap.score + crewScore + gpsScore + workloadScore).toFixed(1),
  );

  // Explainable rationale bullets
  const reasons = [
    `Road ETA ~${etaMinutes} min (${distanceKm.toFixed(1)} km via street network)`,
    cap.rationale,
    `Crew performance: ${rating.toFixed(2)}★ rating · ${missionsCompleted} missions completed`,
    gpsFreshnessText,
  ];

  return {
    driverId: driver.id,
    driverName: driver.user_name || driver.name || "Ambulance Driver",
    callSign: driver.call_sign,
    vehicleId: driver.vehicle_id,
    vehiclePlate: driver.vehicle_plate || driver.plate,
    vehicleModel: driver.vehicle_model || driver.model,
    vehicleType,
    vehicleLabel: cap.label,
    capabilities: cap.capabilities,
    score: totalScore,
    distanceKm,
    etaMinutes,
    polyline: route.polyline,
    provider: route.provider,
    reasons,
    location: driverLoc,
    heading: Number(driver.heading || 0),
  };
}

/**
 * Intelligent recommendation engine: finds and ranks the top available ambulances for an incident.
 */
export async function getTopAmbulanceRecommendations(db, incidentId, topN = 3) {
  const incident = await db("incidents").where({ id: incidentId }).first();
  if (!incident) return [];

  const incidentLoc = { lat: Number(incident.lat), lng: Number(incident.lng) };
  if (!isValidCoordinate(incidentLoc)) return [];

  // Query available drivers with available vehicles
  const drivers = await db("drivers")
    .join("vehicles", "vehicles.id", "drivers.vehicle_id")
    .leftJoin("users", "users.id", "drivers.user_id")
    .where("drivers.status", "available")
    .where("vehicles.status", "available")
    .whereNotNull("drivers.location_lat")
    .whereNotNull("drivers.location_lng")
    .select(
      "drivers.*",
      "vehicles.plate as vehicle_plate",
      "vehicles.model as vehicle_model",
      "vehicles.type as vehicle_type",
      "users.name as user_name",
      "users.phone as user_phone",
    );

  // Filter 1: Valid GPS coordinates (no Null Island, no NaNs)
  // Filter 2: Mandatory capability criteria for incident priority
  const candidates = drivers.filter((d) => {
    const loc = { lat: Number(d.location_lat), lng: Number(d.location_lng) };
    if (!isValidCoordinate(loc)) return false;

    // Check mandatory medical capability (e.g. Disqualify BLS for P1)
    if (!meetsMandatoryCapabilities(d.vehicle_type, incident.priority, incident.type)) {
      return false;
    }

    // Filter out severely stale GPS (> 15 minutes old)
    if (d.last_ping_at) {
      const ageMin = (Date.now() - new Date(d.last_ping_at).getTime()) / 60000;
      if (ageMin > 15) return false;
    }

    return true;
  });

  if (candidates.length === 0) return [];

  // Score candidates concurrently
  const scored = await Promise.all(
    candidates.map((d) => scoreAmbulanceRecommendation(d, incident)),
  );

  // Rank by score descending and return top N
  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
