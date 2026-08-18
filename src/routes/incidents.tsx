import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { IncidentRegistry } from "@/components/ems/IncidentRegistry";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents · ResQ" },
      {
        name: "description",
        content: "Search, filter, and audit emergency incident records across the ResQ platform.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell>
        <IncidentRegistry />
      </AppShell>
    </ProtectedRoute>
  ),
});
