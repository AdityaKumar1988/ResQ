import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Clock,
  History,
  LifeBuoy,
  Loader2,
  MapPin,
  Phone,
  Send,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMERGENCY_LABELS,
  INCIDENT_STATUS_LABELS,
  PRIORITY_META,
  type EmergencyType,
  type Priority,
} from "@/lib/ems/types";
import type { Incident } from "@/types/incident";
import type { Driver } from "@/types/driver";
import { recommendDrivers } from "@/lib/ems/recommend";
import { etaMinutes, formatRelative, haversineKm } from "@/lib/ems/geo";
import { priorityClasses } from "@/lib/ems/style";
import { useCitizenIdentity } from "@/lib/ems/citizen-identity";
import { useIncidents, useCreateIncident, useAssignDriver } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { useAuth } from "@/lib/auth-context";
import { CitizenMapWrapper } from "./CitizenMapWrapper";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";

type Tab = "report" | "track" | "history";

const TYPES: EmergencyType[] = [
  "cardiac",
  "trauma",
  "stroke",
  "respiratory",
  "obstetric",
  "pediatric",
  "psychiatric",
  "burn",
  "other",
];
const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

const TYPE_TO_PRIORITY: Record<EmergencyType, Priority> = {
  cardiac: "P1",
  stroke: "P1",
  trauma: "P2",
  respiratory: "P2",
  obstetric: "P2",
  burn: "P2",
  pediatric: "P3",
  psychiatric: "P3",
  other: "P4",
};

export function CitizenPortal() {
  const [citizen, updateCitizen] = useCitizenIdentity();
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("report");
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const myIncidents = useMemo(
    () =>
      incidents.filter(
        (i) => i.citizenUserId === user?.id,
      ),
    [incidents, user],
  );
  const activeIncident: Incident | null = useMemo(() => {
    if (activeIncidentId) return incidents.find((i) => i.id === activeIncidentId) ?? null;
    const active = myIncidents.find((i) => i.status !== "completed" && i.status !== "cancelled");
    return active ?? null;
  }, [activeIncidentId, incidents, myIncidents]);
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <SkeletonList count={3} className="w-full max-w-md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState message="Failed to load data. Please try again." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <CitizenHeader citizen={citizen} onUpdate={updateCitizen} />

      <div className="flex gap-1 rounded-md border border-border bg-surface-2/60 p-1 self-start">
        <TabBtn
          active={tab === "report"}
          onClick={() => setTab("report")}
          icon={<AlertCircle className="h-3.5 w-3.5" />}
        >
          Report emergency
        </TabBtn>
        <TabBtn
          active={tab === "track"}
          onClick={() => setTab("track")}
          icon={<LifeBuoy className="h-3.5 w-3.5" />}
        >
          Live tracking
          {activeIncident && (
            <span className="ml-1 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary">
              LIVE
            </span>
          )}
        </TabBtn>
        <TabBtn
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={<History className="h-3.5 w-3.5" />}
        >
          History
          <span className="ml-1 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            {myIncidents.length}
          </span>
        </TabBtn>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "report" && (
          <ReportForm
            citizen={citizen}
            onDispatched={(id) => {
              setActiveIncidentId(id);
              setTab("track");
            }}
          />
        )}
        {tab === "track" && (
          <TrackPanel
            incident={activeIncident}
            citizen={citizen}
            drivers={drivers}
            now={now}
            onReport={() => setTab("report")}
          />
        )}
        {tab === "history" && (
          <HistoryList
            incidents={myIncidents}
            onSelect={(id) => {
              setActiveIncidentId(id);
              setTab("track");
            }}
          />
        )}
      </div>
    </div>
  );
}

function CitizenHeader({
  citizen,
  onUpdate,
}: {
  citizen: ReturnType<typeof useCitizenIdentity>[0];
  onUpdate: (patch: Partial<typeof citizen>) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface panel px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="grid gap-1.5 sm:grid-cols-3">
            <input
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
              value={citizen.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Name"
            />
            <input
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
              value={citizen.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="Phone"
            />
            <input
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
              value={citizen.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
              placeholder="Address"
            />
          </div>
        ) : (
          <>
            <div className="truncate text-sm font-semibold">{citizen.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {citizen.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {citizen.address}
              </span>
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => setEditing((v) => !v)}
        className="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] hover:bg-surface-3"
      >
        {editing ? "Done" : "Edit profile"}
      </button>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-surface-3 text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ReportForm({
  citizen,
  onDispatched,
}: {
  citizen: ReturnType<typeof useCitizenIdentity>[0];
  onDispatched: (id: string) => void;
}) {
  const { user } = useAuth();
  const { data: drivers = [] } = useDrivers();
  const createMutation = useCreateIncident();
  const assignMutation = useAssignDriver();
  const [type, setType] = useState<EmergencyType>("cardiac");
  const [priority, setPriority] = useState<Priority>(TYPE_TO_PRIORITY.cardiac);
  const [address, setAddress] = useState(citizen.address);
  const [notes, setNotes] = useState("");

  const [location, setLocation] = useState(citizen.location);

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        toast.error("Unable to access your location.");
      },
      {
        enableHighAccuracy: true,
      },
    );
  }, []);
  const recs = useMemo(
    () => recommendDrivers({ location, priority }, drivers, 1),
    [location, priority, drivers],
  );
  const best = recs[0];
  const bestDriver = best ? drivers.find((d) => d.id === best.driverId) : null;

  function handleType(t: EmergencyType) {
    setType(t);
    setPriority(TYPE_TO_PRIORITY[t]);
  }

  async function handleSubmit() {
    if (!address) {
      toast.error("Please confirm your address");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        priority,
        type,
        lat: location.lat,
        lng: location.lng,
        address,
        notes: notes || undefined,
        citizenName: citizen.name || user?.name || "Citizen",
        citizenPhone: citizen.phone || user?.phone || "",
      });
      toast.success("Emergency reported — dispatchers notified");
      onDispatched(result.incident.id);
    } catch {
      // Error already toasted by mutation handler
    }
  }

  const isPending = createMutation.isPending || assignMutation.isPending;
  const cls = priorityClasses(priority);

  return (
    <div className="grid h-full min-h-0 gap-3 md:grid-cols-[1fr_320px]">
      <div className="min-h-0 space-y-4 overflow-y-auto rounded-lg border border-border bg-surface panel p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-p1/20 text-p1">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Request emergency response</h2>
            <p className="text-[11px] text-muted-foreground">
              A dispatcher and the nearest ambulance are notified immediately.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            What's happening?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => handleType(t)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                  type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {EMERGENCY_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Severity <span className="opacity-60">· auto-suggested</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORITIES.map((p) => {
              const c = priorityClasses(p);
              const active = priority === p;
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-left transition-all",
                    active
                      ? `${c.border} ${c.bg}`
                      : "border-border bg-surface-2 hover:border-border-strong",
                  )}
                >
                  <div className={cn("font-mono text-xs font-bold", c.text)}>{p}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {PRIORITY_META[p].label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Address (where the ambulance should go)
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            What should responders know? (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Patient is conscious, chest pain started 10 minutes ago…"
            className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/50 px-3 py-2 text-[11px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          GPS locked · {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <div className={cn("rounded-lg border p-4", cls.border, cls.bg)}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Estimated response
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold tabular-nums", cls.text)}>
              {best ? best.etaMinutes : "—"}
            </span>
            <span className="text-xs text-muted-foreground">minutes</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Priority {priority} · target under {Math.floor(PRIORITY_META[priority].slaSec / 60)} min
          </div>
          {bestDriver && (
            <div className="mt-3 rounded-md border border-border bg-surface/60 p-2.5">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs font-bold">{bestDriver.callSign}</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="h-3 w-3 fill-p3 text-p3" />
                  {Number(bestDriver.rating ?? 0).toFixed(1)}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">{bestDriver.name}</div>
              <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                <span>{best?.distanceKm.toFixed(1)} km away</span>
                <span>{bestDriver.missionsCompleted} missions</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-md bg-p1 px-4 py-3 text-sm font-semibold text-p1-foreground shadow-glow transition-all hover:brightness-110 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" />
          Request ambulance now
        </button>
        <p className="text-center text-[10px] text-muted-foreground">
          By requesting, you confirm this is a real emergency. Misuse is a criminal offence.
        </p>
      </div>
    </div>
  );
}

function TrackPanel({
  incident,
  citizen,
  drivers,
  now,
  onReport,
}: {
  incident: Incident | null;
  citizen: ReturnType<typeof useCitizenIdentity>[0];
  drivers: Driver[];
  now: number | null;
  onReport: () => void;
}) {
  const { data: hospitals = [] } = useHospitals();
  const driver = incident?.driverId
    ? (drivers.find((d) => d.id === incident.driverId) ?? null)
    : null;
  const hospital = useMemo(() => {
    if (!incident) return null;
    if (incident.hospitalId) return hospitals.find((h) => h.id === incident.hospitalId) ?? null;
    // nearest with beds
    const options = hospitals.filter((h) => h.bedsAvailable > 0);
    return (
      options.sort(
        (a, b) =>
          haversineKm(a.location, incident.location) - haversineKm(b.location, incident.location),
      )[0] ?? null
    );
  }, [incident, hospitals]);

  if (!incident) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-2 text-primary">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold">No active emergency</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          When you request an ambulance, its live position, ETA, and status will appear here.
        </p>
        <button
          onClick={onReport}
          className="mt-2 rounded-md bg-p1 px-4 py-2 text-xs font-semibold text-p1-foreground shadow-glow hover:brightness-110"
        >
          Report emergency
        </button>
      </div>
    );
  }

  const distanceKm = driver ? haversineKm(driver.location, incident.location) : null;
  const eta = distanceKm != null ? etaMinutes(distanceKm) : null;
  const arrived = distanceKm != null && distanceKm < 0.08;
  const cls = priorityClasses(incident.priority);

  return (
    <div className="grid h-full min-h-0 gap-3 md:grid-cols-[1fr_360px]">
      <div className="min-h-0">
        <CitizenMapWrapper
          incident={incident}
          driver={driver}
          hospital={hospital}
          citizenLocation={citizen.location}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="rounded-lg border border-border bg-surface panel p-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs text-muted-foreground">{incident.code}</div>
            <span className={cn("rounded px-2 py-0.5 font-mono text-[10px] font-bold", cls.solid)}>
              {incident.priority}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold">{EMERGENCY_LABELS[incident.type]}</div>
          <div className="mt-2 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
            <span className={cn("h-2 w-2 animate-pulse rounded-full", cls.solid)} />
            <span className="text-xs font-medium">{INCIDENT_STATUS_LABELS[incident.status]}</span>
          </div>
        </div>

        {driver ? (
          <div className="rounded-lg border border-border bg-surface panel p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-status-enroute/20 text-status-enroute">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{driver.callSign}</div>
                <div className="truncate text-[11px] text-muted-foreground">{driver.name}</div>
              </div>
              <a
                href={`tel:${(driver.phone ?? "").replace(/\D/g, "")}`}
                className="rounded-md border border-border bg-surface-2 p-2 hover:bg-surface-3"
                aria-label="Call driver"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat
                label="ETA"
                value={arrived ? "Arriving" : eta != null ? `${eta} min` : "—"}
                accent
              />
              <Stat
                label="Distance"
                value={distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
              />
              <Stat label="Rating" value={Number(driver.rating ?? 0).toFixed(1)} />
              <Stat label="Missions" value={driver.missionsCompleted} />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface panel p-4 text-center text-xs text-muted-foreground">
            Waiting for the closest available unit…
          </div>
        )}

        {hospital && (
          <div className="rounded-lg border border-border bg-surface panel p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Destination hospital
            </div>
            <div className="mt-1 text-sm font-semibold">{hospital.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {hospital.bedsAvailable} of {hospital.beds} beds available
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface panel p-4">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Timeline
          </div>
          <ol className="space-y-2">
            {(incident.timeline ?? []).map((ev) => (
              <li key={ev.id} className="flex gap-2.5">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{INCIDENT_STATUS_LABELS[ev.status]}</div>
                  <div className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                    {now ? formatRelative(ev.timestamp, now) : "…"}
                    {ev.note ? ` · ${ev.note}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-2">
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", accent && "text-primary")}>
        {value}
      </div>
    </div>
  );
}

function HistoryList({
  incidents,
  onSelect,
}: {
  incidents: Incident[];
  onSelect: (id: string) => void;
}) {
  if (incidents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
        <History className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No previous incidents yet.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-2 overflow-y-auto rounded-lg border border-border bg-surface panel p-3">
      {incidents.map((i) => {
        const cls = priorityClasses(i.priority);
        return (
          <button
            key={i.id}
            onClick={() => onSelect(i.id)}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border bg-surface-2 p-3 text-left transition-colors hover:border-border-strong"
          >
            <span className={cn("rounded px-2 py-0.5 font-mono text-[10px] font-bold", cls.solid)}>
              {i.priority}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {EMERGENCY_LABELS[i.type]} · {i.code}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">{i.address}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium">{INCIDENT_STATUS_LABELS[i.status]}</div>
              <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span suppressHydrationWarning>{formatRelative(i.reportedAt)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
