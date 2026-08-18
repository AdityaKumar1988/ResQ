import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { AdminConsole } from "@/components/ems/admin/AdminConsole";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console · ResQ" },
      {
        name: "description",
        content:
          "Administration console — manage staff and roles, fleet, hospitals, service health and audit logs for the ResQ platform.",
      },
      { property: "og:title", content: "Admin Console · ResQ" },
      {
        property: "og:description",
        content: "Governance and access control for the ResQ platform.",
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
