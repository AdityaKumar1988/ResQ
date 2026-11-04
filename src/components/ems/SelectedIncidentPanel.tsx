import { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Navigation,
  Phone,
  Radio,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INCIDENT_STATUS_LABELS, EMERGENCY_LABELS, type IncidentStatus } from "@/lib/ems/types";
import { formatDuration, formatRelative, haversineKm, etaMinutes } from "@/lib/ems/geo";
import {
  useIncidents,
  useUpdateIncidentStatus,
  INCIDENT_STATUS_FLOW,
  useAssignDriver,
  useDispatchRecommendations,
} from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useVehicles } from "@/hooks/fleet/use-vehicles";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface SelectedIncidentPanelProps {
  selectedId: string | null;
}

export function SelectedIncidentPanel({ selectedId }: SelectedIncidentPanelProps) {
  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const updateStatus = useUpdateIncidentStatus();
  const assignDriver = useAssignDriver();

  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const [manualDriverId, setManualDriverId] = useState<string>("");
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(media.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const incident = selectedId ? (incidents.find((item) => item.id === selectedId) ?? null) : null;

  const { data: recommendations = [], isLoading: isLoadingRecs } = useDispatchRecommendations(
    incident?.status === "reported" ? incident.id : null,
  );

  const availableDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (d.status !== "available") return false;
      if (!d.vehicleId) return false;
      const v = vehicles.find((veh) => veh.id === d.vehicleId);
      return v ? v.status === "available" : true;
    });
  }, [drivers, vehicles]);

  // If no incident selected: render a fixed-height standby bar
  if (!incident) {
    return (
      <div className="flex h-[76px] items-center justify-between px-4 border-t border-border bg-card text-muted-foreground select-none">
        <div className="flex items-center gap-2.5 text-xs">
          <Radio className="h-4 w-4 text-muted-foreground/60" />
          <span>No incident selected · Select an incident from the queue or map to inspect</span>
        </div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          Telemetry Ready
        </div>
      </div>
    );
  }

  const isLive = incident.status !== "completed" && incident.status !== "cancelled";
  const driver = incident.driverId
    ? (incident.driver ?? drivers.find((d) => d.id === incident.driverId) ?? null)
    : null;
  const nextStatus = INCIDENT_STATUS_FLOW[incident.status] ?? null;

  const hasValidDriverLoc =
    driver?.location &&
    Number.isFinite(driver.location.lat) &&
    Number.isFinite(driver.location.lng) &&
    !(Math.abs(driver.location.lat) < 0.0001 && Math.abs(driver.location.lng) < 0.0001);

  const hasValidIncidentLoc =
    incident?.location &&
    Number.isFinite(incident.location.lat) &&
    Number.isFinite(incident.location.lng) &&
    !(Math.abs(incident.location.lat) < 0.0001 && Math.abs(incident.location.lng) < 0.0001);

  const distance =
    incident.distanceKm ??
    (hasValidDriverLoc && hasValidIncidentLoc && isLive
      ? haversineKm(driver!.location, incident.location)
      : null);
  const eta = incident.etaMinutes ?? (distance != null ? etaMinutes(distance) : null);
  const missionSec = incident.reportedAt
    ? Math.floor((Date.now() - new Date(incident.reportedAt).getTime()) / 1000)
    : 0;

  const handleAssign = (driverId: string) => {
    assignDriver.mutate(
      { incidentId: incident.id, driverId },
      {
        onSuccess: () => {
          setRecommendationsOpen(false);
          setManualDriverId("");
        },
      },
    );
  };

  return (
    <>
      {/* Fixed-Height Selected Incident Header Panel (Zero Map Resize) */}
      <div className="flex h-[76px] items-center justify-between gap-3 border-t border-border bg-card px-4 select-none">
        {/* Left: Priority, Code, Type, Caller info */}
        <div className="flex items-center gap-3 min-w-0">
          <PriorityBadge priority={incident.priority} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground tnum">
                {incident.code}
              </span>
              <span className="text-xs font-semibold text-foreground truncate">
                {EMERGENCY_LABELS[incident.type] || incident.type}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground truncate mt-0.5">
              <span className="truncate">{incident.address}</span>
              {incident.citizenName && (
                <>
                  <span className="text-border-strong select-none">·</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <User className="h-3 w-3" />
                    {incident.citizenName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Mission Duration & ETA */}
        <div className="hidden lg:flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-1 text-xs">
          <div>
            <div className="text-[11px] font-mono uppercase text-muted-foreground">Elapsed</div>
            <div className="font-mono tnum text-foreground" suppressHydrationWarning>
              {formatDuration(missionSec)}
            </div>
          </div>
          {eta != null && (
            <>
              <div className="h-5 w-px bg-border" />
              <div>
                <div className="text-[11px] font-mono uppercase text-muted-foreground">Est ETA</div>
                <div className="font-mono tnum font-semibold text-primary">{eta} min</div>
              </div>
            </>
          )}
          {driver && (
            <>
              <div className="h-5 w-px bg-border" />
              <div>
                <div className="text-[11px] font-mono uppercase text-muted-foreground">Unit</div>
                <div className="font-mono font-semibold text-foreground">{driver.callSign}</div>
              </div>
            </>
          )}
        </div>

        {/* Right: Primary Action (Dispatch Unit / Advance Status) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* If reported: Show AI Recommendations Sheet Trigger */}
          {incident.status === "reported" && (
            <Button
              type="button"
              variant="emergency"
              size="md"
              onClick={() => setRecommendationsOpen(true)}
              className="gap-1.5 font-semibold"
            >
              <Zap className="h-4 w-4" />
              <span>Assign Unit</span>
            </Button>
          )}

          {/* If assigned and in progress: Advance status action */}
          {nextStatus && (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: incident.id, status: nextStatus })}
              className="gap-1 font-semibold"
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span>Advance → {INCIDENT_STATUS_LABELS[nextStatus]}</span>
              )}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {incident.status === "completed" && (
            <div className="flex items-center gap-1.5 rounded-md border border-status-available/40 bg-status-available/10 px-2.5 py-1 text-xs font-semibold text-status-available">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Resolved</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendation & Manual Override Sheet (Slide-over drawer that never resizes map) */}
      <Sheet modal={!isDesktop} open={recommendationsOpen} onOpenChange={setRecommendationsOpen}>
        <SheetContent
          hideOverlay={isDesktop}
          className="w-full sm:max-w-md p-0 flex flex-col bg-elevated border-l border-border-strong"
        >
          <SheetHeader className="p-4 border-b border-border bg-surface-2/60">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold">Dispatch Unit Allocation</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {incident.code} · {incident.priority} {EMERGENCY_LABELS[incident.type]}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable Recommendations Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center justify-between">
                <span>Algorithmic Recommendations</span>
                <span className="text-xs font-mono text-primary font-semibold">Top 3 Units</span>
              </div>

              {isLoadingRecs ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Calculating traffic distances and crew availability…</span>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-2.5">
                  {recommendations.slice(0, 3).map((rec, i) => {
                    const callSign =
                      rec.callSign ||
                      drivers.find((d) => d.id === rec.driverId)?.callSign ||
                      "Ambulance";
                    const driverName =
                      rec.driverName || drivers.find((d) => d.id === rec.driverId)?.name;
                    const vehicleType = rec.vehicleType || "ALS";

                    return (
                      <div
                        key={rec.driverId}
                        className={cn(
                          "rounded-lg border p-3 transition-colors",
                          i === 0
                            ? "border-primary/50 bg-surface-2 shadow-sm"
                            : "border-border bg-surface-2/60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded font-mono text-xs font-bold",
                                i === 0
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-surface-3 text-muted-foreground",
                              )}
                            >
                              #{i + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold font-mono text-foreground">
                                  {callSign}
                                </span>
                                <span className="rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold uppercase border border-border bg-surface-3 text-foreground">
                                  {vehicleType}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {driverName ? `${driverName} · ` : ""}
                                <strong className="text-foreground font-mono tnum">
                                  ~{rec.etaMinutes} min
                                </strong>{" "}
                                ({rec.distanceKm.toFixed(1)} km)
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary tnum">
                              Match {Math.round(rec.score)}%
                            </span>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={assignDriver.isPending}
                              onClick={() => handleAssign(rec.driverId)}
                              className="h-7 text-xs font-semibold px-2.5"
                            >
                              {assignDriver.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Dispatch"
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Explainable Rationale */}
                        {rec.reasons && rec.reasons.length > 0 && (
                          <div className="mt-2.5 rounded bg-surface-3/60 p-2 text-xs text-muted-foreground border border-border/40">
                            <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-foreground/80 mb-1">
                              Match Factors:
                            </div>
                            <ul className="space-y-1">
                              {rec.reasons.map((r, rIdx) => (
                                <li key={rIdx} className="flex items-start gap-1.5 leading-tight">
                                  <span className="text-primary font-bold">•</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center rounded border border-border bg-surface-2/40">
                  No automated recommendations available for this quadrant.
                </div>
              )}
            </div>

            {/* Manual Driver Override Section */}
            <div className="pt-4 border-t border-border">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Manual Override Selection
              </div>

              {availableDrivers.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  No ready ambulances currently on shift.
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={manualDriverId}
                    onChange={(e) => setManualDriverId(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select ready driver unit…</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.callSign} — {d.name} ({d.status.replace("_", " ")})
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={!manualDriverId || assignDriver.isPending}
                    onClick={() => {
                      if (manualDriverId) handleAssign(manualDriverId);
                    }}
                    className="w-full text-xs font-semibold"
                  >
                    {assignDriver.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Confirm Manual Override"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
