import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, LayoutDashboard, RotateCcw, Siren, Truck } from "lucide-react";
import { useGroupRef } from "react-resizable-panels";
import { AppShell } from "@/components/ems/AppShell";
import { IncidentFeed } from "@/components/ems/IncidentFeed";
import { FleetPanel } from "@/components/ems/FleetPanel";
import { ActivityTimeline } from "@/components/ems/ActivityTimeline";
import { LiveMapWrapper } from "@/components/ems/LiveMapWrapper";
import { NewIncidentDialog } from "@/components/ems/NewIncidentDialog";
import { SelectedIncidentPanel } from "@/components/ems/SelectedIncidentPanel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Command Center · ResQ" },
      {
        name: "description",
        content:
          "Real-time emergency dispatch console — live incident feed, tactical map, and ambulance fleet status.",
      },
      { property: "og:title", content: "Dispatch Command Center · ResQ" },
      {
        property: "og:description",
        content: "Enterprise dispatch console for emergency medical operations.",
      },
    ],
  }),
  component: DispatchPage,
});

type DispatchTab = "queue" | "map" | "fleet" | "activity";

const LAYOUT_STORAGE_KEY = "resq:dispatch:layout:v2";

interface StoredLayouts {
  vertical?: Record<string, number>;
  horizontal?: Record<string, number>;
}

function loadStoredLayouts(): StoredLayouts {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredLayout(groupKey: "vertical" | "horizontal", layout: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    const current = loadStoredLayouts();
    current[groupKey] = layout;
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

function DispatchPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<DispatchTab>("map");
  const [isDesktop, setIsDesktop] = useState(true);

  const verticalGroupRef = useGroupRef();
  const horizontalGroupRef = useGroupRef();
  const [savedLayouts] = useState<StoredLayouts>(() => loadStoredLayouts());

  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();

  const activeIncidentsCount = incidents.filter(
    (i) => i.status !== "completed" && i.status !== "cancelled",
  ).length;
  const readyDriversCount = drivers.filter((d) => d.status === "available").length;

  // Responsive layout detection (< 1024px vs >= 1024px)
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(media.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const handleResetLayout = () => {
    try {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
    try {
      verticalGroupRef.current?.setLayout({
        "dispatch-main-panel": 80,
        "dispatch-activity-panel": 20,
      });
      horizontalGroupRef.current?.setLayout({
        "dispatch-feed-panel": 22,
        "dispatch-map-panel": 56,
        "dispatch-fleet-panel": 22,
      });
    } catch (err) {
      console.error("Failed to reset layout", err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell
        headerActions={
          isDesktop ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetLayout}
              title="Reset panel widths and heights to default"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Reset layout</span>
            </Button>
          ) : null
        }
      >
        <div className="flex h-full w-full flex-col p-2 sm:p-2.5 overflow-hidden select-none">
          {/* Desktop Layout (>= 1024px): Resizable Panel System */}
          {isDesktop ? (
            <ResizablePanelGroup
              id="dispatch-vertical-group"
              groupRef={verticalGroupRef}
              defaultLayout={savedLayouts.vertical}
              onLayoutChanged={(layout, meta) => {
                if (meta?.isUserInteraction) saveStoredLayout("vertical", layout);
              }}
              orientation="vertical"
              direction="vertical"
              className="h-full w-full rounded-lg"
            >
              {/* Top Section: Feed | Map + Selected Incident | Fleet */}
              <ResizablePanel id="dispatch-main-panel" defaultSize="80%" minSize="60%">
                <ResizablePanelGroup
                  id="dispatch-horizontal-group"
                  groupRef={horizontalGroupRef}
                  defaultLayout={savedLayouts.horizontal}
                  onLayoutChanged={(layout, meta) => {
                    if (meta?.isUserInteraction) saveStoredLayout("horizontal", layout);
                  }}
                  orientation="horizontal"
                  direction="horizontal"
                  className="h-full w-full"
                >
                  {/* Left Column: Incident Feed */}
                  <ResizablePanel
                    id="dispatch-feed-panel"
                    defaultSize="22%"
                    minSize="18%"
                    maxSize="32%"
                  >
                    <IncidentFeed
                      onCreate={() => setDialogOpen(true)}
                      selectedId={selectedIncidentId}
                      onSelect={setSelectedIncidentId}
                    />
                  </ResizablePanel>

                  <ResizableHandle
                    withHandle
                    className="mx-1 bg-border/40 hover:bg-primary/40 transition-colors"
                  />

                  {/* Center Column: Tactical Map (persists permanently) + Fixed-Height Selected Incident Panel */}
                  <ResizablePanel id="dispatch-map-panel" defaultSize="56%" minSize="40%">
                    <div className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-card overflow-hidden">
                      <div className="min-h-0 flex-1 relative">
                        {/* Map stays permanently mounted with zero unmounting */}
                        <LiveMapWrapper
                          selectedId={selectedIncidentId}
                          onSelect={setSelectedIncidentId}
                          isVisible={true}
                        />
                      </div>
                      {/* Fixed height panel: zero map resize jitter when selecting incidents */}
                      <SelectedIncidentPanel selectedId={selectedIncidentId} />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle
                    withHandle
                    className="mx-1 bg-border/40 hover:bg-primary/40 transition-colors"
                  />

                  {/* Right Column: Fleet Panel */}
                  <ResizablePanel
                    id="dispatch-fleet-panel"
                    defaultSize="22%"
                    minSize="18%"
                    maxSize="30%"
                  >
                    <FleetPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle
                withHandle
                className="my-1 bg-border/40 hover:bg-primary/40 transition-colors"
              />

              {/* Bottom Section: Activity Timeline Stream */}
              <ResizablePanel
                id="dispatch-activity-panel"
                defaultSize="20%"
                minSize="8%"
                maxSize="40%"
              >
                <ActivityTimeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            /* Tablet & Mobile Layout (< 1024px): Scrollable Tabbed Structure */
            <div className="flex h-full w-full flex-col min-h-0 overflow-hidden">
              {/* Tab Selector Header */}
              <Tabs
                value={mobileTab}
                onValueChange={(val) => setMobileTab(val as DispatchTab)}
                className="w-full shrink-0 mb-2"
              >
                <TabsList className="grid grid-cols-4 h-10 w-full bg-surface-2 border border-border p-1">
                  <TabsTrigger
                    value="queue"
                    className="text-xs font-semibold data-[state=active]:bg-card"
                  >
                    <Siren className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span>Queue ({activeIncidentsCount})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="map"
                    className="text-xs font-semibold data-[state=active]:bg-card"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span>Map</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="fleet"
                    className="text-xs font-semibold data-[state=active]:bg-card"
                  >
                    <Truck className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span>Fleet ({readyDriversCount})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="text-xs font-semibold data-[state=active]:bg-card"
                  >
                    <Activity className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span>Activity</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Tab Panels: Keep Map mounted in DOM to prevent Leaflet destruction */}
              <div className="flex-1 min-h-0 overflow-hidden relative">
                {/* Tactical Map + Selected Incident Panel (Kept in DOM, toggled via visibility) */}
                <div
                  role="tabpanel"
                  aria-label="Dispatch Map"
                  className={`h-full flex-col rounded-lg border border-border bg-card overflow-hidden ${
                    mobileTab === "map" ? "flex" : "hidden"
                  }`}
                >
                  <div className="min-h-0 flex-1 relative">
                    <LiveMapWrapper
                      selectedId={selectedIncidentId}
                      onSelect={setSelectedIncidentId}
                      isVisible={mobileTab === "map"}
                    />
                  </div>
                  <SelectedIncidentPanel selectedId={selectedIncidentId} />
                </div>

                {/* Queue Tab */}
                {mobileTab === "queue" && (
                  <div
                    role="tabpanel"
                    aria-label="Incident Queue"
                    className="h-full overflow-y-auto"
                  >
                    <IncidentFeed
                      onCreate={() => setDialogOpen(true)}
                      selectedId={selectedIncidentId}
                      onSelect={(id) => {
                        setSelectedIncidentId(id);
                        setMobileTab("map");
                      }}
                    />
                  </div>
                )}

                {/* Fleet Tab */}
                {mobileTab === "fleet" && (
                  <div
                    role="tabpanel"
                    aria-label="Ambulance Fleet"
                    className="h-full overflow-y-auto"
                  >
                    <FleetPanel />
                  </div>
                )}

                {/* Activity Tab */}
                {mobileTab === "activity" && (
                  <div
                    role="tabpanel"
                    aria-label="Operational Activity Log"
                    className="h-full overflow-y-auto"
                  >
                    <ActivityTimeline isExpanded />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* New Incident Intake Modal (Translucent overlay, map visible/dimmed behind) */}
        <NewIncidentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </AppShell>
    </ProtectedRoute>
  );
}
