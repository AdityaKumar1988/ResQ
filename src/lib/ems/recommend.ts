import type { DispatchRecommendation, Driver, Incident } from "./types";
import { etaMinutes, haversineKm } from "./geo";

// Medical capability tiers for multi-factor dispatch ranking
export const VEHICLE_TIERS: Record<string, number> = {
  MICU: 4,
  ICU: 3,
  ALS: 2,
  BLS: 1,
};

export function meetsMandatoryCapabilities(vehicleType = "BLS", priority = "P2"): boolean {
  const type = vehicleType.toUpperCase();
  const tier = VEHICLE_TIERS[type] || 1;
  if (priority === "P1") {
    // P1 Critical requires minimum ALS (Tier 2), ICU (Tier 3), or MICU (Tier 4)
    return tier >= 2;
  }
  return true;
}

// Multi-Factor Recommendation Engine — ranks available ambulances for an incident.
export function recommendDrivers(
  incident: Pick<Incident, "location" | "priority"> & { type?: string },
  drivers: (Driver & { vehicleType?: "ALS" | "BLS" | "ICU" | "MICU"; vehicleModel?: string })[],
  topN = 3,
): DispatchRecommendation[] {
  // Disqualify unavailable, busy, or invalid GPS drivers
  const candidates = drivers.filter((d) => {
    if (d.status !== "available") return false;
    if (!d.location || (d.location.lat === 0 && d.location.lng === 0)) return false;
    if (!meetsMandatoryCapabilities(d.vehicleType, incident.priority)) return false;
    return true;
  });

  const scored = candidates.map<DispatchRecommendation>((d) => {
    const distanceKm = Number(haversineKm(incident.location, d.location).toFixed(2));
    const eta = etaMinutes(distanceKm);
    const reasons: string[] = [];

    // 1. Proximity & ETA Score (45 pts max)
    const etaScore = Math.max(0, 45 - eta * 2.25);
    reasons.push(`Estimated arrival ~${eta} min (${distanceKm.toFixed(1)} km)`);

    // 2. Capability Score (25 pts max)
    const vType = (d.vehicleType || "ALS").toUpperCase() as "ALS" | "BLS" | "ICU" | "MICU";
    let capScore = 20;
    if (incident.priority === "P1") {
      if (vType === "MICU") {
        capScore = 25;
        reasons.push("Mobile ICU with advanced transport ventilator and defibrillator");
      } else if (vType === "ICU") {
        capScore = 24;
        reasons.push("ICU Unit: Resuscitation and critical airway management");
      } else {
        capScore = 23;
        reasons.push("ALS Certified: Cardiac telemetry and emergency airway kit");
      }
    } else {
      reasons.push(`${vType} unit matched to incident protocol`);
    }

    // 3. Crew Performance & Rating (15 pts max)
    const rating = Number(d.rating ?? 4.5);
    const ratingScore = Math.min(10, Math.max(0, ((rating - 4) / 1) * 10));
    const missionsScore = Math.min(5, (Number(d.missionsCompleted || 0) / 20) * 5);
    const crewScore = ratingScore + missionsScore;
    if (rating >= 4.7) {
      reasons.push(`High crew rating (${rating.toFixed(2)}★)`);
    }

    // 4. GPS & Availability Score (15 pts max)
    const availabilityScore = 15;
    reasons.push("Verified available for immediate dispatch");

    const totalScore = Number((etaScore + capScore + crewScore + availabilityScore).toFixed(1));

    return {
      driverId: d.id,
      driverName: d.name,
      callSign: d.callSign,
      vehicleType: vType,
      score: totalScore,
      distanceKm,
      etaMinutes: eta,
      reasons,
      location: d.location,
      heading: d.heading,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
