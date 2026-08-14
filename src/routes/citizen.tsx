import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { CitizenPortal } from "@/components/ems/citizen/CitizenPortal";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen Portal · Smart EMS" },
      {
        name: "description",
        content:
          "Request an ambulance, track its live location and ETA in real time, and review your incident history.",
      },
      { property: "og:title", content: "Citizen Portal · Smart EMS" },
      {
        property: "og:description",
        content: "One-tap emergency requests with live ambulance tracking.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["citizen", "admin"]}>
      <AppShell>
        <CitizenPortal />
      </AppShell>
    </ProtectedRoute>
  ),
});
