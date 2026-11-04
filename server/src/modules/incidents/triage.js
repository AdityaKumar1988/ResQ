/**
 * Emergency medical triage classification module.
 *
 * NOTE: clinical rules need clinical review
 */

export const SLA = {
  P1: 480, // 8 minutes
  P2: 900, // 15 minutes
  P3: 1800, // 30 minutes
  P4: 3600, // 60 minutes
};

/**
 * Maps an emergency medical category to a conservative priority level and response SLA.
 *
 * clinical rules need clinical review
 *
 * Mapping:
 *  - cardiac, stroke, respiratory -> P1 (Critical)
 *  - trauma, obstetric, burn, pediatric, psychiatric -> P2 (Urgent)
 *  - other -> P3 (Serious)
 *
 * @param {string} type Emergency type category
 * @returns {{ priority: 'P1'|'P2'|'P3'|'P4', slaSeconds: number }}
 */
export function triageEmergency(type) {
  // clinical rules need clinical review
  switch (type) {
    case "cardiac":
    case "stroke":
    case "respiratory":
      return { priority: "P1", slaSeconds: SLA.P1 };

    case "trauma":
    case "obstetric":
    case "burn":
    case "pediatric":
    case "psychiatric":
      return { priority: "P2", slaSeconds: SLA.P2 };

    case "other":
    default:
      return { priority: "P3", slaSeconds: SLA.P3 };
  }
}
