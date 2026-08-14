import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/ems/AppShell";
import { IncidentFeed } from "@/components/ems/IncidentFeed";
import { FleetPanel } from "@/components/ems/FleetPanel";
import { ActivityTimeline } from "@/components/ems/ActivityTimeline";
import { LiveMapWrapper } from "@/components/ems/LiveMapWrapper";
import { NewIncidentDialog } from "@/components/ems/NewIncidentDialog";
import { SelectedIncidentPanel } from "@/components/ems/SelectedIncidentPanel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Command Center · Smart EMS" },
      {
        name: "description",
        content:
          "Real-time emergency dispatch console — live incident feed, tactical map, and ambulance fleet status.",
      },
      { property: "og:title", content: "Dispatch Command Center · Smart EMS" },
      {
        property: "og:description",
        content: "Enterprise dispatch console for emergency medical operations.",
      },
    ],
  }),
  component: DispatchPage,
});

function DispatchPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  return (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell>
        <div className="flex h-full flex-col gap-3 p-3">
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[320px_1fr_320px]">
            <div className="min-h-0">
              <IncidentFeed
    onCreate={() => setDialogOpen(true)}
    selectedId={selectedIncidentId}
    onSelect={setSelectedIncidentId}
/>
            </div>
            <div className="flex min-h-0 flex-col gap-3">
              <div className="min-h-0 flex-1">{!dialogOpen && <LiveMapWrapper selectedId={selectedIncidentId} onSelect={setSelectedIncidentId} />}</div>
              <div className="rounded-lg border border-border bg-surface panel">
                <SelectedIncidentPanel
    selectedId={selectedIncidentId}
/>
              </div>
            </div>
            <div className="min-h-0">
              <FleetPanel />
            </div>
          </div>
          <div className="h-[92px] shrink-0">
            <ActivityTimeline />
          </div>
        </div>
        <NewIncidentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </AppShell>
    </ProtectedRoute>
  );
}
