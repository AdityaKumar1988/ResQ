import { describe, it, expect, vi } from "vitest";

describe("Real-Time & Persistent Notifications Logic", () => {
  interface MockNotification {
    id: string;
    userId: string;
    kind: string;
    title: string;
    body: string | null;
    data: Record<string, unknown> | null;
    readAt: string | null;
    createdAt: string;
  }

  it("creates role/user scoped notifications for citizen and driver", () => {
    const notifications: MockNotification[] = [];

    function addNotification(params: Omit<MockNotification, "id" | "readAt" | "createdAt">) {
      const n: MockNotification = {
        id: `notif-${notifications.length + 1}`,
        userId: params.userId,
        kind: params.kind,
        title: params.title,
        body: params.body,
        data: params.data,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      notifications.push(n);
      return n;
    }

    // Citizen creates incident
    const citizenUserId = "user-citizen-1";
    const driverUserId = "user-driver-1";

    // 1. Citizen receives confirmation
    addNotification({
      userId: citizenUserId,
      kind: "incident_created",
      title: "Emergency Request Received",
      body: "Your emergency request has been received and sent to dispatch.",
      data: { code: "INC-2150" },
    });

    // 2. Dispatcher assigns ambulance -> Citizen and Driver notifications
    addNotification({
      userId: citizenUserId,
      kind: "incident_assigned",
      title: "Ambulance Assigned",
      body: "Ambulance MEDIC 410 has been assigned to your emergency.",
      data: { code: "INC-2150", callSign: "MEDIC 410" },
    });

    addNotification({
      userId: driverUserId,
      kind: "incident_assigned",
      title: "New Emergency Mission Assigned",
      body: "Mission INC-2150 (P1) · cardiac @ 123 Main St",
      data: { code: "INC-2150", priority: "P1" },
    });

    // Check citizen notifications
    const citizenNotifs = notifications.filter((n) => n.userId === citizenUserId);
    expect(citizenNotifs).toHaveLength(2);
    expect(citizenNotifs[0].title).toBe("Emergency Request Received");
    expect(citizenNotifs[1].title).toBe("Ambulance Assigned");

    // Check driver notifications
    const driverNotifs = notifications.filter((n) => n.userId === driverUserId);
    expect(driverNotifs).toHaveLength(1);
    expect(driverNotifs[0].title).toBe("New Emergency Mission Assigned");
  });

  it("marks individual and all notifications as read", () => {
    const notifications: MockNotification[] = [
      {
        id: "n-1",
        userId: "u-1",
        kind: "incident_created",
        title: "Test 1",
        body: null,
        data: null,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: "n-2",
        userId: "u-1",
        kind: "incident_assigned",
        title: "Test 2",
        body: null,
        data: null,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ];

    // Mark single
    notifications[0].readAt = new Date().toISOString();
    expect(notifications[0].readAt).not.toBeNull();
    expect(notifications[1].readAt).toBeNull();

    // Mark all read
    const now = new Date().toISOString();
    for (const n of notifications) {
      if (!n.readAt) n.readAt = now;
    }
    expect(notifications.every((n) => n.readAt !== null)).toBe(true);
  });
});
