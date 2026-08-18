import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { AnalyticsDashboard } from "@/components/ems/analytics/AnalyticsDashboard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · ResQ" },
      {
        name: "description",
        content:
          "Response-time trends, SLA compliance, incident heatmaps, and driver performance leaderboards for ResQ emergency operations.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell>
        <AnalyticsDashboard />
      </AppShell>
    </ProtectedRoute>
  ),
});
