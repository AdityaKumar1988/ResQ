import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { AdminConsole } from "@/components/ems/admin/AdminConsole";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console · Smart EMS" },
      {
        name: "description",
        content:
          "Administration console — manage staff and roles, fleet, hospitals, service health and audit logs for the Smart EMS platform.",
      },
      { property: "og:title", content: "Admin console · Smart EMS" },
      {
        property: "og:description",
        content: "Governance and access control for the Smart EMS platform.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell>
        <AdminConsole />
      </AppShell>
    </ProtectedRoute>
  ),
});
