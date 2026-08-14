import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { DriverConsole } from "@/components/ems/driver/DriverConsole";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver console · Smart EMS" },
      {
        name: "description",
        content:
          "Ambulance driver console — accept assignments, live turn-by-turn navigation, patient handoff and hospital transfer.",
      },
      { property: "og:title", content: "Driver console · Smart EMS" },
      {
        property: "og:description",
        content: "Field responder console with live nav and mission workflow.",
      },
    ],
  }),
  component: DriverPage,
});

function DriverPage() {
  return (
    <ProtectedRoute allowedRoles={["driver", "admin"]}>
      <AppShell>
        <DriverConsole />
      </AppShell>
    </ProtectedRoute>
  );
}
