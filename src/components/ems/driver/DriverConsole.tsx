import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Hospital as HospitalIcon,
  Loader2,
  MapPin,
  MoreVertical,
  Navigation,
  PhoneCall,
  Power,
  Star,
  Truck,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMERGENCY_LABELS,
  INCIDENT_STATUS_LABELS,
  type IncidentStatus,
  type Incident,
} from "@/lib/ems/types";
import { etaMinutes, formatRelative, haversineKm } from "@/lib/ems/geo";
import {
  useDriverMe,
  useUpdateDriverLocation,
  useUpdateDriverStatus,
} from "@/hooks/fleet/use-drivers";
import { useIncidents, useUpdateIncidentStatus } from "@/hooks/dispatch/use-incidents";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { DriverMapWrapper } from "./DriverMapWrapper";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NEXT_ACTION: Record<
  IncidentStatus,
  { next: IncidentStatus; label: string; tone: "primary" | "warn" | "success" } | null
> = {
  reported: { next: "assigned", label: "Accept incident", tone: "primary" },
  assigned: { next: "accepted", label: "Accept assignment", tone: "primary" },
  accepted: { next: "en_route", label: "Roll out — en route to scene", tone: "primary" },
  en_route: { next: "arrived", label: "Arrived on scene", tone: "warn" },
  arrived: { next: "patient_loaded", label: "Patient loaded into ambulance", tone: "warn" },
  patient_loaded: { next: "at_hospital", label: "Arrived at destination hospital", tone: "warn" },
  at_hospital: { next: "completed", label: "Complete hospital handoff", tone: "success" },
  completed: null,
  cancelled: null,
};

const CANCELLATION_REASONS = [
  "Vehicle breakdown / mechanical issue",
  "Scene inaccessible / impassable route",
  "Patient not found at pickup address",
  "Redirected by emergency dispatch",
  "Duplicate call / false alarm",
  "Other operational reason",
];

export function DriverConsole() {
  const { data: driverMe, isLoading, isError, refetch } = useDriverMe();
  const { data: incidents = [] } = useIncidents();
  const { data: hospitals = [] } = useHospitals();
  const updateLocation = useUpdateDriverLocation();
  const updateDriverStatus = useUpdateDriverStatus();
  const updateIncidentStatus = useUpdateIncidentStatus();
  const queryClient = useQueryClient();

  const driver = driverMe ?? null;
  const driverId = driver?.id ?? null;

  const activeIncidents = useMemo(
    () =>
      incidents.filter(
        (i) => i.driverId === driverId && i.status !== "completed" && i.status !== "cancelled",
      ),
    [incidents, driverId],
  );

  const history = useMemo(
    () =>
      incidents
        .filter(
          (i) => i.driverId === driverId && (i.status === "completed" || i.status === "cancelled"),
        )
        .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()),
    [incidents, driverId],
  );

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Geolocation watcher: continuous live coordinate telemetry
  useEffect(() => {
    if (!driver) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading } = pos.coords;
        updateLocation.mutate({ lat, lng, heading: heading ?? undefined });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <SkeletonList count={4} className="w-full max-w-sm" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState message="Failed to load driver console telemetry" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={<Truck className="h-5 w-5" />}
          message="No driver profile found"
          description="Please ensure your account has the driver role assigned and is authenticated."
        />
      </div>
    );
  }

  const incident = activeIncidents[0] ?? null;
  const hospital = incident?.hospitalId
    ? (hospitals.find((h) => h.id === incident.hospitalId) ?? null)
    : null;

  const onShift = driver.status !== "offline";

  function handleAdvance(status: IncidentStatus, note?: string) {
    if (!incident) return;
    updateIncidentStatus.mutate(
      { id: incident.id, status, note },
      {
        onSuccess: () => {
          if (status === "completed") {
            queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            toast.success("Mission completed and patient transferred");
          } else if (status === "cancelled") {
            toast.info("Mission cancelled — incident returned to dispatch");
          } else {
            toast.success(`Mission advanced to: ${INCIDENT_STATUS_LABELS[status]}`);
          }
        },
      },
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     COCKPIT MODE A: ACTIVE MISSION COCKPIT
     When an active mission is assigned, secondary stats (ratings, runs, queue)
     are strictly hidden to reduce driver distraction. The dominant map and large
     arm's-length scannable action area take full focus.
     ────────────────────────────────────────────────────────────────────────── */
  if (incident) {
    return (
      <div className="flex h-full min-h-0 flex-col lg:flex-row gap-3 p-3">
        {/* Dominant Navigation Map (Dominant in tablet landscape & phone portrait) */}
        <div className="min-h-[45vh] lg:min-h-0 flex-1 relative rounded-lg overflow-hidden border border-border">
          <DriverMapWrapper driver={driver} incident={incident} hospital={hospital} />
        </div>

        {/* Dedicated Active Mission Cockpit Panel (Arm's-length touch targets) */}
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col justify-between">
          <ActiveMissionCockpit
            driver={driver}
            incident={incident}
            hospital={hospital}
            hospitals={hospitals}
            driverLoc={driver.location}
            now={now}
            onAdvance={handleAdvance}
            isPending={updateIncidentStatus.isPending}
          />
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     COCKPIT MODE B: STANDBY / IDLE CONSOLE
     When no active mission is underway, show driver profile, shift toggle,
     today's metrics, standing map, and mission history.
     ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[340px_1fr_320px]">
      {/* Left Column: Driver Shift & Active Queue */}
      <div className="flex min-h-0 flex-col gap-3">
        <DriverProfileCard
          driver={driver}
          onShift={onShift}
          onToggleShift={() =>
            updateDriverStatus.mutate({ status: onShift ? "offline" : "available" })
          }
        />

        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Truck className="h-4 w-4 text-primary" />
              <span>Assigned queue</span>
            </div>
            <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold tnum text-muted-foreground">
              0
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
            <Activity className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-xs font-medium text-foreground">
              {onShift ? "Standing by for emergency dispatch" : "Currently off duty"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
              {onShift
                ? "Vehicle telemetry is actively reporting to central grid."
                : "Switch to on shift to receive sector dispatch assignments."}
            </p>
          </div>
        </div>
      </div>

      {/* Center: Standing Sector Map */}
      <div className="flex min-h-[300px] lg:min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1 relative rounded-lg overflow-hidden border border-border">
          <DriverMapWrapper driver={driver} incident={null} hospital={null} />
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                onShift ? "bg-status-available" : "bg-status-offline",
              )}
            />
            <span className="font-semibold text-foreground">
              {onShift ? "Telemetry active · On standby" : "Offline · Geolocation paused"}
            </span>
          </div>
          <span className="font-mono tnum text-xs text-muted-foreground">
            {driver.location.lat.toFixed(4)}, {driver.location.lng.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Right Column: Today's Metrics & Mission History */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Runs" value={history.length} icon={CheckCircle2} variant="chip" />
          <MetricCard
            label="Rating"
            value={Number(driver.rating ?? 0).toFixed(1)}
            icon={Star}
            variant="chip"
          />
          <MetricCard
            label="Avg Resp"
            value={`${Math.round(driver.avgResponseSec / 60)}m`}
            icon={Clock}
            variant="chip"
          />
          <MetricCard
            label="Status"
            value={onShift ? "Available" : "Offline"}
            icon={Activity}
            variant="chip"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card shadow-xs">
          <div className="border-b border-border px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Mission Log
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {history.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No completed missions recorded today.
              </div>
            ) : (
              history.slice(0, 10).map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-transparent p-2 hover:border-border hover:bg-surface transition-colors"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-mono font-semibold text-foreground tnum">
                      {i.code}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {EMERGENCY_LABELS[i.type]}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <PriorityBadge priority={i.priority} />
                    <div
                      className="mt-0.5 text-xs font-mono tnum text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatRelative(i.completedAt ?? i.reportedAt, now ?? Date.now())}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ACTIVE MISSION COCKPIT COMPONENT
   Optimized for arm's-length interaction, large typography, high-contrast,
   and zero secondary distraction.
   ────────────────────────────────────────────────────────────────────────── */
function ActiveMissionCockpit({
  driver,
  incident,
  hospital,
  hospitals,
  driverLoc,
  now,
  onAdvance,
  isPending,
}: {
  driver: import("@/lib/ems/types").Driver;
  incident: Incident;
  hospital: { id: string; name: string } | null;
  hospitals: { id: string; name: string; location: { lat: number; lng: number } }[];
  driverLoc: { lat: number; lng: number };
  now: number | null;
  onAdvance: (status: IncidentStatus, note?: string) => void;
  isPending: boolean;
}) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);

  const action = NEXT_ACTION[incident.status];

  const target =
    incident.status === "patient_loaded" && incident.hospitalId
      ? (hospitals.find((h) => h.id === incident.hospitalId)?.location ?? incident.location)
      : incident.location;

  const dist = haversineKm(driverLoc, target);
  const eta = etaMinutes(dist);

  function confirmCancel() {
    // BACKEND DEPENDENCY NOTE: The backend statusSchema accepts optional 'note' but does not have a dedicated 'cancellationReason' enum field. The selected reason is passed in 'note'.
    onAdvance("cancelled", cancelReason);
    setCancelDialogOpen(false);
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Top Section: Header & Mission Summary */}
      <div className="space-y-3">
        {/* Unit & Incident Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary tnum">{driver.callSign}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs text-muted-foreground tnum">{incident.code}</span>
          </div>

          <div className="flex items-center gap-2">
            <PriorityBadge priority={incident.priority} />
            <StatusBadge status={incident.status} />

            {/* Overflow Cancel Action (Step 1 of 2 deliberate steps) */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCancelDialogOpen(true)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              title="Mission options"
              aria-label="Mission options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Emergency Type & Patient Identification (Large & High-contrast) */}
        <div>
          <div className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {EMERGENCY_LABELS[incident.type]}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Reported {now ? formatRelative(incident.reportedAt, now) : "…"}</span>
          </div>
        </div>

        {/* Location / Pickup Address */}
        <div className="rounded-md border border-border bg-surface p-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-priority-p1 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                {incident.status === "patient_loaded" ? "Destination Hospital" : "Pickup Location"}
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5 leading-snug">
                {incident.status === "patient_loaded" && hospital
                  ? hospital.name
                  : incident.address}
              </div>
            </div>
          </div>
        </div>

        {/* Large Scannable Navigation Metrics (Arm's-length readable) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-md border border-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span>Distance</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tnum text-foreground">
              {dist.toFixed(1)}{" "}
              <span className="text-xs font-normal text-muted-foreground">km</span>
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>ETA</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tnum text-primary">
              {eta} <span className="text-xs font-normal text-muted-foreground">min</span>
            </div>
          </div>
        </div>

        {/* Patient / Hospital Contact Strip */}
        <div className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              {incident.status === "patient_loaded" ? "Receiving Facility" : "Patient Contact"}
            </div>
            <div className="text-sm font-semibold text-foreground truncate mt-0.5">
              {incident.status === "patient_loaded" && hospital
                ? hospital.name
                : incident.citizenName || "Emergency Caller"}
            </div>
          </div>

          {incident.citizenPhone && incident.status !== "patient_loaded" && (
            <a
              href={`tel:${incident.citizenPhone.replace(/\D/g, "")}`}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-elevated hover:text-primary transition-colors min-h-[44px] min-w-[44px]"
              aria-label="Call patient"
            >
              <PhoneCall className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Scene Notes Callout (if present) */}
        {incident.notes && (
          <div className="rounded-md border border-border bg-surface p-2.5 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Notes: </span>“{incident.notes}”
          </div>
        )}
      </div>

      {/* Bottom Section: Primary Full-Width Action Button (≥ 56px height) */}
      <div className="mt-4 pt-3 border-t border-border space-y-2">
        {action ? (
          <button
            type="button"
            onClick={() => onAdvance(action.next)}
            disabled={isPending}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-4 min-h-[56px] text-base sm:text-lg font-bold transition-all shadow-sm active:scale-[0.99] disabled:opacity-60",
              action.tone === "primary" &&
                "bg-primary text-primary-foreground hover:brightness-105",
              action.tone === "warn" && "bg-status-enroute text-slate-950 hover:brightness-105",
              action.tone === "success" &&
                "bg-status-available text-slate-950 hover:brightness-105",
            )}
          >
            {isPending && <Loader2 className="h-5 w-5 animate-spin mr-1" />}
            <span>{action.label}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <div className="text-center py-3 text-xs text-muted-foreground font-semibold">
            Mission stage completed
          </div>
        )}

        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>Tap to advance next operational milestone</span>
          <button
            type="button"
            onClick={() => setCancelDialogOpen(true)}
            className="hover:underline hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive rounded"
          >
            Cancel mission…
          </button>
        </div>
      </div>

      {/* Confirmation Dialog: Step 2 of 2 deliberate steps to cancel */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Cancel Assigned Mission?</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Cancelling will detach your unit from incident{" "}
              <span className="font-mono font-semibold text-foreground">{incident.code}</span> and
              notify central dispatchers to reassign the call.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground block">
              Reason for mission cancellation (mandatory):
            </label>
            <div className="space-y-1.5">
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border p-2.5 text-xs cursor-pointer transition-colors",
                    cancelReason === reason
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-surface text-muted-foreground hover:bg-elevated",
                  )}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                    className="h-4 w-4 text-primary"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Mission
            </Button>
            <Button type="button" variant="destructive" onClick={confirmCancel}>
              Confirm Mission Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   DRIVER PROFILE & SHIFT COMPONENT (STANDBY MODE)
   ────────────────────────────────────────────────────────────────────────── */
function DriverProfileCard({
  driver,
  onShift,
  onToggleShift,
}: {
  driver: import("@/lib/ems/types").Driver;
  onShift: boolean;
  onToggleShift: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/20">
          <UserCircle2 className="h-6 w-6" />
          <span
            className={cn(
              "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-card",
              onShift ? "bg-status-available" : "bg-status-offline",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{driver.name}</div>
          <div className="truncate text-xs text-muted-foreground mt-0.5">
            <span className="font-mono font-semibold text-primary">{driver.callSign}</span> ·{" "}
            <span className="uppercase tracking-wider">{onShift ? "On Shift" : "Off Duty"}</span>
          </div>
        </div>
      </div>

      {!driver.vehicleId && (
        <div className="mt-3 rounded-md border border-priority-p2/40 bg-priority-p2/10 p-2.5 text-xs text-foreground">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-priority-p2 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-snug">
              <span className="font-semibold text-priority-p2">No Ambulance Linked</span>
              <p className="text-muted-foreground">
                No ambulance asset linked to crew profile. Contact fleet dispatcher to assign a
                vehicle.
              </p>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant={onShift ? "outline" : "primary"}
        onClick={onToggleShift}
        className={cn(
          "mt-3.5 w-full min-h-[44px] text-xs font-semibold uppercase tracking-wider",
          onShift && "border-destructive/40 text-destructive hover:bg-destructive/10",
        )}
      >
        <Power className="h-3.5 w-3.5 mr-2" />
        {onShift ? "Go off shift" : "Go on shift"}
      </Button>
    </div>
  );
}
