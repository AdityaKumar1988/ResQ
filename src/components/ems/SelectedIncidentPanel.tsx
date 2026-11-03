import { useState, useMemo } from "react";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Navigation,
  Phone,
  Radio,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INCIDENT_STATUS_LABELS, EMERGENCY_LABELS, type IncidentStatus } from "@/lib/ems/types";
import { formatDuration, formatRelative, haversineKm, etaMinutes } from "@/lib/ems/geo";
import { priorityClasses } from "@/lib/ems/style";
import {
  useIncidents,
  useUpdateIncidentStatus,
  INCIDENT_STATUS_FLOW,
  useAssignDriver,
  useDispatchRecommendations,
} from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useVehicles } from "@/hooks/fleet/use-vehicles";

interface SelectedIncidentPanelProps {
  selectedId: string | null;
}

export function SelectedIncidentPanel({ selectedId }: SelectedIncidentPanelProps) {
  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const updateStatus = useUpdateIncidentStatus();
  const assignDriver = useAssignDriver();
  const [manualDriverId, setManualDriverId] = useState<string>("");

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

  if (!incident) {
    return (
      <div className="flex items-center justify-center gap-3 border-t border-border bg-surface/70 px-4 py-3 text-xs text-muted-foreground">
        <Radio className="h-4 w-4" />
        Select an incident from the feed to see live details.
      </div>
    );
  }

  const cls = priorityClasses(incident.priority);
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

  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-border bg-surface/70 px-4 py-3 backdrop-blur">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded font-mono text-sm font-bold",
          cls.solid,
        )}
      >
        {incident.priority}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{incident.code}</span>
          <span className="text-sm font-semibold">{EMERGENCY_LABELS[incident.type]}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {incident.citizenName}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {incident.citizenPhone}
          </span>
          <span>{incident.address}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[11px]">
        <div>
          <div className="text-[9px] uppercase text-muted-foreground">Reported</div>
          <div className="font-mono" suppressHydrationWarning>
            {formatRelative(incident.reportedAt)}
          </div>
        </div>
        <div className="h-6 w-px bg-border" />
        <div>
          <div className="text-[9px] uppercase text-muted-foreground">Mission</div>
          <div className="font-mono" suppressHydrationWarning>
            {formatDuration(missionSec)}
          </div>
        </div>
        {eta != null && (
          <>
            <div className="h-6 w-px bg-border" />
            <div>
              <div className="text-[9px] uppercase text-muted-foreground">ETA</div>
              <div className="font-mono text-primary">{eta}m</div>
            </div>
          </>
        )}
      </div>

      {driver && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-status-enroute/20 text-status-enroute">
            <Radio className="h-3.5 w-3.5" />
          </div>
          <div className="text-[11px]">
            <div className="font-mono font-semibold">{driver.callSign}</div>
            <div className="text-muted-foreground">{driver.name}</div>
          </div>
        </div>
      )}

      {incident.status === "reported" && (
        <div className="mt-2 w-full space-y-3 rounded-md border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Intelligent Dispatch Recommendations
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">Top 3 Units</span>
          </div>
          {isLoadingRecs ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Evaluating street routes, crew skills & equipment…
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid gap-2.5">
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
                      "rounded-lg border p-2.5 transition-all",
                      i === 0
                        ? "border-primary/40 bg-surface/90 shadow-sm"
                        : "border-border/60 bg-surface/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold",
                            i === 0
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface-3 text-muted-foreground",
                          )}
                        >
                          #{i + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold font-mono">{callSign}</span>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.2 font-mono text-[9px] font-bold border",
                                vehicleType === "MICU"
                                  ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                  : vehicleType === "ICU"
                                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                                    : vehicleType === "ALS"
                                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                              )}
                            >
                              {vehicleType}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {driverName ? `${driverName} · ` : ""}
                            {rec.vehicleModel ? `${rec.vehicleModel} · ` : ""}
                            <span className="text-foreground font-semibold">
                              ~{rec.etaMinutes} min
                            </span>{" "}
                            ({rec.distanceKm.toFixed(1)} km)
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                          Match {Math.round(rec.score)}%
                        </span>
                        <button
                          onClick={() =>
                            assignDriver.mutate({ incidentId: incident.id, driverId: rec.driverId })
                          }
                          disabled={assignDriver.isPending}
                          className="flex h-6 items-center gap-1 rounded bg-primary px-2.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {assignDriver.isPending ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            "Assign Unit"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Explainable Rationale */}
                    {rec.reasons && rec.reasons.length > 0 && (
                      <div className="mt-2 rounded bg-surface-2/60 p-1.5 text-[10px] text-muted-foreground">
                        <div className="font-semibold text-foreground/80 mb-0.5 text-[9px] uppercase tracking-wider">
                          Why this unit:
                        </div>
                        <ul className="space-y-0.5">
                          {rec.reasons.map((r, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1">
                              <span className="text-primary mt-0.5 font-bold">•</span>
                              <span className="leading-tight">{r}</span>
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
            <div className="text-xs text-muted-foreground py-1">
              No automatic recommendations available.
            </div>
          )}

          {/* Manual Driver Selection Fallback */}
          <div className="border-t border-border/50 pt-2.5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Manual Ambulance Selection
            </div>
            {availableDrivers.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No eligible available drivers in fleet.
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={manualDriverId}
                  onChange={(e) => setManualDriverId(e.target.value)}
                  className="flex-1 rounded border border-border bg-surface px-2.5 py-1 text-xs"
                >
                  <option value="">Select available driver…</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.callSign} — {d.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (manualDriverId) {
                      assignDriver.mutate({ incidentId: incident.id, driverId: manualDriverId });
                      setManualDriverId("");
                    }
                  }}
                  disabled={!manualDriverId || assignDriver.isPending}
                  className="flex h-7 items-center gap-1 rounded bg-primary px-3 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {assignDriver.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Confirm Assignment"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 w-full justify-end mt-2">
        <StatusPill status={incident.status} />
        {nextStatus && (
          <button
            onClick={() => updateStatus.mutate({ id: incident.id, status: nextStatus })}
            disabled={updateStatus.isPending}
            className="flex items-center gap-1 rounded-md bg-gradient-to-br from-primary to-primary-glow px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-60"
          >
            {updateStatus.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Advance → {INCIDENT_STATUS_LABELS[nextStatus]}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        {incident.status === "completed" && (
          <div className="flex items-center gap-1.5 rounded-md border border-status-available/40 bg-status-available/10 px-3 py-1.5 text-xs font-semibold text-status-available">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mission complete
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: IncidentStatus }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[11px]">
      <Clock className="h-3 w-3 text-muted-foreground" />
      <span className="font-mono uppercase tracking-wider">{INCIDENT_STATUS_LABELS[status]}</span>
    </div>
  );
}
