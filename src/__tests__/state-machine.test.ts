import { describe, it, expect } from "vitest";
// @ts-expect-error Server JS module import without declaration
import { ALLOWED_TRANSITIONS } from "../../server/src/modules/incidents/constants.js";

describe("Authoritative Incident State Machine", () => {
  it("allows standard emergency progression", () => {
    expect(ALLOWED_TRANSITIONS.reported).toContain("assigned");
    expect(ALLOWED_TRANSITIONS.assigned).toContain("accepted");
    expect(ALLOWED_TRANSITIONS.accepted).toContain("en_route");
    expect(ALLOWED_TRANSITIONS.en_route).toContain("arrived");
    expect(ALLOWED_TRANSITIONS.arrived).toContain("patient_loaded");
    expect(ALLOWED_TRANSITIONS.patient_loaded).toContain("at_hospital");
    expect(ALLOWED_TRANSITIONS.at_hospital).toContain("completed");
  });

  it("allows cancellation from all non-terminal active states", () => {
    const activeStates = [
      "reported",
      "assigned",
      "accepted",
      "en_route",
      "arrived",
      "patient_loaded",
      "at_hospital",
    ] as const;

    for (const st of activeStates) {
      expect(ALLOWED_TRANSITIONS[st]).toContain("cancelled");
    }
  });

  it("blocks transitions from terminal states (completed / cancelled)", () => {
    expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });

  it("rejects invalid forward/backward jump transitions", () => {
    // Cannot skip directly from reported to completed or en_route
    expect(ALLOWED_TRANSITIONS.reported).not.toContain("completed");
    expect(ALLOWED_TRANSITIONS.reported).not.toContain("en_route");
    expect(ALLOWED_TRANSITIONS.reported).not.toContain("patient_loaded");

    // Cannot jump backwards from completed or arrived to en_route
    expect(ALLOWED_TRANSITIONS.completed).not.toContain("en_route");
    expect(ALLOWED_TRANSITIONS.arrived).not.toContain("en_route");

    // Cannot resume from cancelled
    expect(ALLOWED_TRANSITIONS.cancelled).not.toContain("accepted");
    expect(ALLOWED_TRANSITIONS.cancelled).not.toContain("en_route");
  });

  it("validates transition helper logic", () => {
    function isValidTransition(from: keyof typeof ALLOWED_TRANSITIONS, to: string): boolean {
      const allowed = ALLOWED_TRANSITIONS[from] || [];
      return allowed.includes(to);
    }

    expect(isValidTransition("reported", "assigned")).toBe(true);
    expect(isValidTransition("assigned", "accepted")).toBe(true);
    expect(isValidTransition("accepted", "en_route")).toBe(true);
    expect(isValidTransition("en_route", "arrived")).toBe(true);
    expect(isValidTransition("arrived", "patient_loaded")).toBe(true);
    expect(isValidTransition("patient_loaded", "at_hospital")).toBe(true);
    expect(isValidTransition("at_hospital", "completed")).toBe(true);

    // Invalid transitions
    expect(isValidTransition("completed", "en_route")).toBe(false);
    expect(isValidTransition("cancelled", "accepted")).toBe(false);
    expect(isValidTransition("reported", "completed")).toBe(false);
    expect(isValidTransition("assigned", "at_hospital")).toBe(false);
  });
});
