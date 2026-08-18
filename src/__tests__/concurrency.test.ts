import { describe, it, expect, vi } from "vitest";

describe("Multi-Dispatcher Concurrency Protection Logic", () => {
  interface MockDriver {
    id: string;
    callSign: string;
    status: "available" | "busy" | "offline";
    missionsActive: number;
    vehicleId: string | null;
  }

  interface MockVehicle {
    id: string;
    plate: string;
    status: "available" | "busy" | "maintenance";
  }

  interface MockIncident {
    id: string;
    code: string;
    status: "reported" | "assigned" | "accepted" | "completed" | "cancelled";
    driverId: string | null;
    vehicleId: string | null;
  }

  function simulateAssignment({
    incident,
    driver,
    vehicle,
  }: {
    incident: MockIncident;
    driver: MockDriver;
    vehicle: MockVehicle;
  }) {
    // Atomic check: re-verify locks and availability
    if (incident.status !== "reported" || incident.driverId) {
      return {
        success: false,
        status: 409,
        code: "INCIDENT_ALREADY_ASSIGNED",
        error: "Incident has already been assigned or is no longer dispatchable",
      };
    }

    if (driver.status !== "available" || driver.missionsActive > 0) {
      return {
        success: false,
        status: 409,
        code: "AMBULANCE_UNAVAILABLE",
        error: "Ambulance is no longer available.",
      };
    }

    if (!driver.vehicleId || vehicle.status !== "available") {
      return {
        success: false,
        status: 409,
        code: "AMBULANCE_UNAVAILABLE",
        error: "Ambulance is no longer available.",
      };
    }

    // Mutate state under lock
    incident.status = "assigned";
    incident.driverId = driver.id;
    incident.vehicleId = vehicle.id;
    driver.status = "busy";
    driver.missionsActive += 1;
    vehicle.status = "busy";

    return {
      success: true,
      status: 200,
      incident,
      driver,
      vehicle,
    };
  }

  it("handles two dispatchers assigning the same ambulance to different incidents", () => {
    const driver: MockDriver = {
      id: "drv-1",
      callSign: "MEDIC 410",
      status: "available",
      missionsActive: 0,
      vehicleId: "veh-1",
    };
    const vehicle: MockVehicle = {
      id: "veh-1",
      plate: "EMS-4471",
      status: "available",
    };
    const inc1: MockIncident = {
      id: "inc-100",
      code: "INC-100",
      status: "reported",
      driverId: null,
      vehicleId: null,
    };
    const inc2: MockIncident = {
      id: "inc-101",
      code: "INC-101",
      status: "reported",
      driverId: null,
      vehicleId: null,
    };

    // Dispatcher A assigns first
    const resA = simulateAssignment({ incident: inc1, driver, vehicle });
    expect(resA.success).toBe(true);
    expect(resA.status).toBe(200);
    expect(driver.status).toBe("busy");
    expect(driver.missionsActive).toBe(1);

    // Dispatcher B attempts assignment immediately after
    const resB = simulateAssignment({ incident: inc2, driver, vehicle });
    expect(resB.success).toBe(false);
    expect(resB.status).toBe(409);
    expect(resB.code).toBe("AMBULANCE_UNAVAILABLE");
    expect(resB.error).toBe("Ambulance is no longer available.");
    expect(inc2.driverId).toBeNull();
  });

  it("handles two dispatchers assigning different ambulances to the same incident", () => {
    const inc: MockIncident = {
      id: "inc-200",
      code: "INC-200",
      status: "reported",
      driverId: null,
      vehicleId: null,
    };
    const driverA: MockDriver = {
      id: "drv-A",
      callSign: "MEDIC 101",
      status: "available",
      missionsActive: 0,
      vehicleId: "veh-A",
    };
    const vehicleA: MockVehicle = { id: "veh-A", plate: "EMS-01", status: "available" };

    const driverB: MockDriver = {
      id: "drv-B",
      callSign: "MEDIC 102",
      status: "available",
      missionsActive: 0,
      vehicleId: "veh-B",
    };
    const vehicleB: MockVehicle = { id: "veh-B", plate: "EMS-02", status: "available" };

    // Dispatcher A assigns first
    const resA = simulateAssignment({ incident: inc, driver: driverA, vehicle: vehicleA });
    expect(resA.success).toBe(true);
    expect(inc.driverId).toBe("drv-A");

    // Dispatcher B tries to assign driver B to the same incident
    const resB = simulateAssignment({ incident: inc, driver: driverB, vehicle: vehicleB });
    expect(resB.success).toBe(false);
    expect(resB.status).toBe(409);
    expect(resB.code).toBe("INCIDENT_ALREADY_ASSIGNED");
    expect(driverB.status).toBe("available"); // Driver B remains available
  });

  it("safely rejects duplicate assignment network retries", () => {
    const inc: MockIncident = {
      id: "inc-300",
      code: "INC-300",
      status: "reported",
      driverId: null,
      vehicleId: null,
    };
    const driver: MockDriver = {
      id: "drv-1",
      callSign: "MEDIC 410",
      status: "available",
      missionsActive: 0,
      vehicleId: "veh-1",
    };
    const vehicle: MockVehicle = { id: "veh-1", plate: "EMS-4471", status: "available" };

    const firstTry = simulateAssignment({ incident: inc, driver, vehicle });
    expect(firstTry.success).toBe(true);

    const retry = simulateAssignment({ incident: inc, driver, vehicle });
    expect(retry.success).toBe(false);
    expect(retry.status).toBe(409);
  });
});
