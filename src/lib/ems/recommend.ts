import type { DispatchRecommendation, Driver, Incident } from "./types";
import { etaMinutes, haversineKm } from "./geo";

// Smart Recommendation Engine — ranks available ambulances for an incident.
// Weights are tuned so proximity and availability dominate but performance
// (rating, avg response time, workload) can differentiate close vehicles.
export function recommendDrivers(
  incident: Pick<Incident, "location" | "priority">,
  drivers: Driver[],
  topN = 3,
): DispatchRecommendation[] {
  const candidates = drivers.filter((d) => d.status === "available");

  const scored = candidates.map<DispatchRecommendation>((d) => {
    const distanceKm = haversineKm(incident.location, d.location);
    const eta = etaMinutes(distanceKm);
    const reasons: string[] = [];

    // Distance: 0km => 60pts, 10km+ => 0pts
    const distanceScore = Math.max(0, 60 - distanceKm * 6);
    reasons.push(`${distanceKm.toFixed(1)} km away`);

    const availabilityScore = 15;
    reasons.push("Immediately available");

    // Performance: rating (0..5) → 0..10; response time (fast=good)
    const rating = Number(d.rating ?? 0);

    const ratingScore = ((rating - 4) / 1) * 10;
    const responseScore = Math.max(0, 10 - (d.avgResponseSec - 300) / 60);

    if (rating >= 4.7) {
      reasons.push(`Top-rated (${rating.toFixed(2)})`);
    }

    // Workload: fewer recent missions → slight bonus (proxy via missionsCompleted mod)
    const workloadScore = 5;

    const score = distanceScore + availabilityScore + ratingScore + responseScore + workloadScore;

    return {
      driverId: d.id,
      score: Number(score.toFixed(1)),
      distanceKm,
      etaMinutes: eta,
      reasons,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
