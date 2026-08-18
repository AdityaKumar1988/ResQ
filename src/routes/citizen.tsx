import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { CitizenPortal } from "@/components/ems/citizen/CitizenPortal";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen Portal · ResQ" },
      {
        name: "description",
        content:
          "Request an ambulance, track its live location and ETA in real time, and review your incident history.",
      },
      { property: "og:title", content: "Citizen Portal · ResQ" },
      {
        property: "og:description",
        content: "One-tap emergency requests with live ambulance tracking.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["citizen"]}>
      <AppShell>
        <CitizenPortal />
      </AppShell>
    </ProtectedRoute>
  ),
});
