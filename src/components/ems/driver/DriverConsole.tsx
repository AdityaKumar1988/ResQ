import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Hospital as HospitalIcon,
  Loader2,
  MapPin,
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
  PRIORITY_META,
  type IncidentStatus,
  type Incident,
} from "@/lib/ems/types";
import { etaMinutes, formatRelative, haversineKm } from "@/lib/ems/geo";
import {
  useDrivers,
  useUpdateDriverLocation,
  useUpdateDriverStatus,
} from "@/hooks/fleet/use-drivers";
import { useIncidents, useUpdateIncidentStatus } from "@/hooks/dispatch/use-incidents";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { useAuth } from "@/lib/auth-context";
import { DriverMapWrapper } from "./DriverMapWrapper";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";

const NEXT_ACTION: Record<
  IncidentStatus,
  { next: IncidentStatus; label: string; tone: "primary" | "warn" | "success" } | null
> = {
  reported: { next: "assigned", label: "Accept", tone: "primary" },
  assigned: { next: "accepted", label: "Accept assignment", tone: "primary" },
  accepted: { next: "en_route", label: "Roll out — en route", tone: "primary" },
  en_route: { next: "arrived", label: "Arrived on scene", tone: "warn" },
  arrived: { next: "patient_loaded", label: "Patient loaded", tone: "warn" },
  patient_loaded: { next: "at_hospital", label: "Arrived at hospital", tone: "warn" },
  at_hospital: { next: "completed", label: "Complete handoff", tone: "success" },
  completed: null,
  cancelled: null,
};

export function DriverConsole() {
  const { user } = useAuth();
  const { data: drivers = [], isLoading, isError, refetch } = useDrivers();
  const { data: incidents = [] } = useIncidents();
  const { data: hospitals = [] } = useHospitals();
  const updateLocation = useUpdateDriverLocation();
  const updateDriverStatus = useUpdateDriverStatus();
  const updateIncidentStatus = useUpdateIncidentStatus();
  const queryClient = useQueryClient();

  // In real mode, the driver is the currently logged-in user
  // Fallback: first driver in the list for demo purposes
  const driver = useMemo(() => drivers.find((d) => d.userId === user?.id) ?? null, [drivers, user]);
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

  // Real geolocation watcher — sends location to backend
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
      <div className="flex h-full items-center justify-center">
        <SkeletonList count={4} className="w-full max-w-sm" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState message="Failed to load driver data" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        No driver profile found. Ensure you are logged in as a driver.
      </div>
    );
  }

  const incident = activeIncidents[0] ?? null;
  const hospital = incident?.hospitalId
    ? (hospitals.find((h) => h.id === incident.hospitalId) ?? null)
    : null;

  const onShift = driver.status !== "offline";

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[360px_1fr_340px]">
      {/* Left column: driver identity + shift + queue */}
      <div className="flex min-h-0 flex-col gap-3">
        <DriverCard
          driver={driver}
          drivers={drivers}
          onPick={() => {}} // In real mode, driver is always the logged-in user
          onToggleShift={() =>
            updateDriverStatus.mutate({ status: onShift ? "offline" : "available" })
          }
          onShift={onShift}
        />
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface panel">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              Active queue
            </div>
            <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {activeIncidents.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {activeIncidents.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {onShift ? "Standing by for dispatch." : "You are off-shift."}
              </div>
            ) : (
              activeIncidents.map((i) => (
                <QueueRow key={i.id} incident={i} driverLoc={driver.location} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center: map + active mission */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1">
          <DriverMapWrapper driver={driver} incident={incident} hospital={hospital} />
        </div>
        <MissionPanel
          incident={incident}
          hospitals={hospitals}
          driverLoc={driver.location}
          now={now}
          onAdvance={(status) => {
            updateIncidentStatus.mutate({ id: incident!.id, status });
            if (status === "completed") {
              queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
            }
          }}
          isPending={updateIncidentStatus.isPending}
        />
      </div>

      {/* Right: metrics + mission log */}
      <div className="flex min-h-0 flex-col gap-3">
        <MetricsPanel driver={driver} completed={history.length} />
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface panel">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mission log
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {history.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No completed runs yet.
              </div>
            ) : (
              history.slice(0, 12).map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-mono">{i.code}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {EMERGENCY_LABELS[i.type]}
                    </div>
                  </div>
                  <div className="text-right">
                    <PriorityDot priority={i.priority} />
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
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

function DriverCard({
  driver,
  drivers,
  onPick,
  onToggleShift,
  onShift,
}: {
  driver: import("@/lib/ems/types").Driver;
  drivers: import("@/lib/ems/types").Driver[];
  onPick: (id: string) => void;
  onToggleShift: () => void;
  onShift: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-surface p-3 panel">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/70 to-primary text-primary-foreground shadow-glow">
          <UserCircle2 className="h-6 w-6" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface",
              onShift ? "bg-status-available" : "bg-status-offline",
            )}
          />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{driver.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            <span className="font-mono">{driver.callSign}</span> ·{" "}
            <span className="uppercase tracking-wider">{onShift ? "on shift" : "off shift"}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-[11px] font-medium hover:bg-accent"
        >
          Switch <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {open && (
        <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-surface-2 p-1 shadow-xl">
          {drivers.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                onPick(d.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent",
                d.id === driver.id && "bg-accent",
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground">{d.callSign}</span>
              <span className="truncate">{d.name}</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                {d.status.replace("_", " ")}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat icon={Star} label="Rating" value={Number(driver.rating ?? 0).toFixed(1)} />
        <MiniStat icon={CheckCircle2} label="Runs" value={driver.missionsCompleted} />
        <MiniStat
          icon={Clock}
          label="Avg resp"
          value={`${Math.round(driver.avgResponseSec / 60)}m`}
        />
      </div>

      <button
        type="button"
        onClick={onToggleShift}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
          onShift
            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "border-status-available/40 bg-status-available/10 text-status-available hover:bg-status-available/20",
        )}
      >
        <Power className="h-3.5 w-3.5" />
        {onShift ? "Go off shift" : "Go on shift"}
      </button>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-1 py-1.5">
      <Icon className="mx-auto h-3 w-3 text-muted-foreground" />
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function QueueRow({
  incident,
  driverLoc,
}: {
  incident: Incident;
  driverLoc: { lat: number; lng: number };
}) {
  const dist = haversineKm(driverLoc, incident.location);
  const meta = PRIORITY_META[incident.priority];
  return (
    <div className="mb-1.5 rounded-md border border-border bg-surface-2/60 p-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
            `bg-priority-${meta.token}/15 text-priority-${meta.token}`,
          )}
        >
          {incident.priority}
        </span>
        <span className="font-mono text-[11px]">{incident.code}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {INCIDENT_STATUS_LABELS[incident.status]}
        </span>
      </div>
      <div className="mt-1 truncate text-xs">{EMERGENCY_LABELS[incident.type]}</div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span className="truncate">{incident.address}</span>
        <span className="ml-auto shrink-0 tabular-nums">
          {dist.toFixed(1)} km · {etaMinutes(dist)}m
        </span>
      </div>
    </div>
  );
}

function MissionPanel({
  incident,
  hospitals,
  driverLoc,
  now,
  onAdvance,
  isPending,
}: {
  incident: Incident | null;
  hospitals: { id: string; name: string; location: { lat: number; lng: number } }[];
  driverLoc: { lat: number; lng: number };
  now: number | null;
  onAdvance: (status: IncidentStatus) => void;
  isPending: boolean;
}) {
  if (!incident) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface/60 px-4 py-3 text-xs text-muted-foreground">
        <Activity className="h-4 w-4" />
        Awaiting dispatch. Keep radio channel open.
      </div>
    );
  }
  const action = NEXT_ACTION[incident.status];
  const meta = PRIORITY_META[incident.priority];
  const target =
    incident.status === "patient_loaded" && incident.hospitalId
      ? (hospitals.find((h) => h.id === incident.hospitalId)?.location ?? incident.location)
      : incident.location;
  const dist = haversineKm(driverLoc, target);
  const eta = etaMinutes(dist);

  return (
    <div className="rounded-lg border border-border bg-surface p-3 panel">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold",
            `bg-priority-${meta.token}/15 text-priority-${meta.token}`,
          )}
        >
          {incident.priority}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{incident.code}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {INCIDENT_STATUS_LABELS[incident.status]}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              reported {formatRelative(incident.reportedAt, now ?? Date.now())}
            </span>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">
            {EMERGENCY_LABELS[incident.type]}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{incident.address}</span>
          </div>
          {incident.notes && (
            <div className="mt-1 rounded border border-border bg-surface-2 p-1.5 text-[11px] text-muted-foreground">
              “{incident.notes}”
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <NavStat icon={Navigation} label="Distance" value={`${dist.toFixed(1)} km`} />
        <NavStat icon={Clock} label="ETA" value={`${eta} min`} />
        <NavStat
          icon={incident.status === "patient_loaded" ? HospitalIcon : UserCircle2}
          label={incident.status === "patient_loaded" ? "To hospital" : "Patient"}
          value={
            incident.status === "patient_loaded"
              ? (hospitals.find((h) => h.id === incident.hospitalId)?.name.split(" ")[0] ?? "—")
              : (incident.citizenName ?? "—").split(" ")[0]
          }
        />
        <NavStat
          icon={PhoneCall}
          label="Contact"
          value={(incident.citizenPhone ?? "—").slice(-4)}
        />
      </div>

      {action && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdvance(action.next)}
            disabled={isPending}
            className={cn(
              "flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
              action.tone === "primary" &&
                "bg-primary text-primary-foreground shadow-glow hover:opacity-90",
              action.tone === "warn" && "bg-status-enroute text-background hover:opacity-90",
              action.tone === "success" && "bg-status-available text-background hover:opacity-90",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => onAdvance("cancelled")}
            disabled={isPending}
            className="rounded-md border border-border bg-surface-2 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function NavStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function MetricsPanel({
  driver,
  completed,
}: {
  driver: import("@/lib/ems/types").Driver;
  completed: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 panel">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Today
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <MiniStat icon={CheckCircle2} label="Runs" value={completed} />
        <MiniStat icon={Star} label="Rating" value={Number(driver.rating ?? 0).toFixed(2)} />
        <MiniStat
          icon={Clock}
          label="Avg resp"
          value={`${Math.round(driver.avgResponseSec / 60)}m`}
        />
        <MiniStat icon={Activity} label="Status" value={driver.status.replace("_", " ")} />
      </div>
    </div>
  );
}

function PriorityDot({ priority }: { priority: keyof typeof PRIORITY_META }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 font-mono text-[9px] font-bold",
        `bg-priority-${meta.token}/15 text-priority-${meta.token}`,
      )}
    >
      {priority}
    </span>
  );
}
