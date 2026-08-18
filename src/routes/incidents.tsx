import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ems/AppShell";
import { Construction } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/incidents")({
  head: () => ({ meta: [{ title: "Incidents · Smart EMS" }] }),
  component: () => (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell>
        <ComingSoon
          title="Incident registry"
          note="Full incident timeline, filters, exports — shipping in the next module."
        />
      </AppShell>
    </ProtectedRoute>
  ),
});

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-2 text-primary">
        <Construction className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
