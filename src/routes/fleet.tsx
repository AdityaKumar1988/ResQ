import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { FleetRegistry } from "@/components/ems/FleetRegistry";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet · ResQ" },
      {
        name: "description",
        content: "Manage ambulances, paramedic unit allocations, and vehicle assets on ResQ.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell>
        <FleetRegistry />
      </AppShell>
    </ProtectedRoute>
  ),
});
