import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { ComingSoon } from "./incidents";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/fleet")({
  head: () => ({ meta: [{ title: "Fleet · Smart EMS" }] }),
  component: () => (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell>
        <ComingSoon title="Fleet management" note="Vehicle CRUD, driver-vehicle assignments, and maintenance windows — coming next." />
      </AppShell>
    </ProtectedRoute>
  ),
});
