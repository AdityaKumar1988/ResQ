import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Baby,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Crosshair,
  Edit2,
  Flame,
  HeartPulse,
  History,
  LifeBuoy,
  Loader2,
  MapPin,
  Phone,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  Users,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EMERGENCY_LABELS, INCIDENT_STATUS_LABELS, type EmergencyType } from "@/lib/ems/types";
import type { Incident } from "@/types/incident";
import { etaMinutes, formatRelative, haversineKm } from "@/lib/ems/geo";
import { useCitizenIdentity } from "@/lib/ems/citizen-identity";
import {
  useIncidents,
  useCreateIncident,
  useDispatchEstimate,
} from "@/hooks/dispatch/use-incidents";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { useAuth } from "@/lib/auth-context";
import { CitizenMapWrapper } from "./CitizenMapWrapper";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Tab = "report" | "track" | "history";

const EMERGENCY_TILES: {
  type: EmergencyType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "cardiac", label: "Cardiac Arrest", hint: "Chest pain / heart", icon: HeartPulse },
  { type: "trauma", label: "Trauma / Accident", hint: "Severe injury / crash", icon: ShieldAlert },
  { type: "stroke", label: "Stroke Symptoms", hint: "Facial droop / numbness", icon: Brain },
  { type: "respiratory", label: "Respiratory", hint: "Severe breathing distress", icon: Wind },
  { type: "obstetric", label: "Obstetric", hint: "Labor / pregnancy issue", icon: Baby },
  { type: "pediatric", label: "Pediatric", hint: "Child medical emergency", icon: Users },
  { type: "psychiatric", label: "Psychiatric", hint: "Acute distress / crisis", icon: Sparkles },
  { type: "burn", label: "Burn Injury", hint: "Thermal / chemical burn", icon: Flame },
  { type: "other", label: "Other Emergency", hint: "General acute distress", icon: AlertCircle },
];

export function CitizenPortal() {
  const [citizen, updateCitizen] = useCitizenIdentity();
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
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
    () => incidents.filter((i) => i.citizenUserId === user?.id),
    [incidents, user],
  );

  const activeIncident: Incident | null = useMemo(() => {
    if (activeIncidentId) return incidents.find((i) => i.id === activeIncidentId) ?? null;
    const active = myIncidents.find((i) => i.status !== "completed" && i.status !== "cancelled");
    return active ?? null;
  }, [activeIncidentId, incidents, myIncidents]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <SkeletonList count={3} className="w-full max-w-md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState
          message="Failed to load emergency data. Please retry."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3 max-w-6xl mx-auto w-full">
      <CitizenHeader citizen={citizen} onUpdate={updateCitizen} />

      {/* Accessible Navigation Tablist */}
      <div
        role="tablist"
        aria-label="Citizen portal navigation"
        className="flex gap-1 rounded-lg border border-border bg-card p-1 self-start shadow-xs"
      >
        <button
          role="tab"
          id="tab-report"
          aria-selected={tab === "report"}
          aria-controls="panel-report"
          tabIndex={tab === "report" ? 0 : -1}
          onClick={() => setTab("report")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors min-h-[44px]",
            tab === "report"
              ? "bg-elevated text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AlertCircle className="h-4 w-4 text-priority-p1" />
          <span>Request ambulance</span>
        </button>

        <button
          role="tab"
          id="tab-track"
          aria-selected={tab === "track"}
          aria-controls="panel-track"
          tabIndex={tab === "track" ? 0 : -1}
          onClick={() => setTab("track")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors min-h-[44px]",
            tab === "track"
              ? "bg-elevated text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Radio className="h-4 w-4 text-primary" />
          <span>Live tracking</span>
          {activeIncident && (
            <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase text-primary">
              LIVE
            </span>
          )}
        </button>

        <button
          role="tab"
          id="tab-history"
          aria-selected={tab === "history"}
          aria-controls="panel-history"
          tabIndex={tab === "history" ? 0 : -1}
          onClick={() => setTab("history")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition-colors min-h-[44px]",
            tab === "history"
              ? "bg-elevated text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <History className="h-4 w-4" />
          <span>History</span>
          <span className="ml-1 rounded bg-surface px-1.5 py-0.5 font-mono text-xs tnum text-muted-foreground">
            {myIncidents.length}
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "report" && (
          <div role="tabpanel" id="panel-report" aria-labelledby="tab-report" className="h-full">
            <ReportForm
              citizen={citizen}
              onDispatched={(id) => {
                setActiveIncidentId(id);
                setTab("track");
              }}
            />
          </div>
        )}
        {tab === "track" && (
          <div role="tabpanel" id="panel-track" aria-labelledby="tab-track" className="h-full">
            <TrackPanel
              incident={activeIncident}
              citizen={citizen}
              now={now}
              onReport={() => setTab("report")}
            />
          </div>
        )}
        {tab === "history" && (
          <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" className="h-full">
            <HistoryList
              incidents={myIncidents}
              onSelect={(id) => {
                setActiveIncidentId(id);
                setTab("track");
              }}
            />
          </div>
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
  const [name, setName] = useState(citizen.name);
  const [phone, setPhone] = useState(citizen.phone);
  const [address, setAddress] = useState(citizen.address);

  function handleSave() {
    onUpdate({ name, phone, address });
    setEditing(false);
    toast.success("Profile updated");
  }

  return (
    <header className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
            />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contact phone"
              aria-label="Contact phone"
            />
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Home address"
              aria-label="Home address"
            />
          </div>
        ) : (
          <>
            <div className="truncate text-sm font-semibold text-foreground">{citizen.name}</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono tnum">{citizen.phone}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-priority-p1" />
                <span className="truncate">{citizen.address}</span>
              </span>
            </div>
          </>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            Edit profile
          </Button>
        )}
      </div>
    </header>
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
  const createMutation = useCreateIncident();
  const [type, setType] = useState<EmergencyType>("cardiac");
  const [address, setAddress] = useState(citizen.address);
  const [phone, setPhone] = useState(citizen.phone || user?.phone || "");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState(citizen.location);
  const [gpsStatus, setGpsStatus] = useState<"acquiring" | "locked" | "unavailable">("acquiring");
  const hasRequestedGpsRef = useRef(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      toast.error("Geolocation is not supported by your browser.", { id: "gps-error" });
      return;
    }

    setGpsStatus("acquiring");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsStatus("locked");
        toast.success("Current GPS location acquired", { id: "gps-acquired" });
      },
      () => {
        setGpsStatus("unavailable");
        toast.error("Unable to read GPS location. Please verify your address manually.", {
          id: "gps-error",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (hasRequestedGpsRef.current) return;
    hasRequestedGpsRef.current = true;
    detectLocation();
  }, []);

  const { data: estimate, isLoading: isLoadingEstimate } = useDispatchEstimate({
    lat: location.lat,
    lng: location.lng,
  });

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!address.trim()) {
      toast.error("Please provide or confirm the emergency address");
      return;
    }

    if (
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number" ||
      isNaN(location.lat) ||
      isNaN(location.lng) ||
      (location.lat === 0 && location.lng === 0)
    ) {
      toast.error(
        "Valid GPS coordinates are required to dispatch emergency units. Please click 'Refresh GPS' or enable browser location services.",
      );
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        type,
        lat: location.lat,
        lng: location.lng,
        address: address.trim(),
        notes: notes.trim() || undefined,
        citizenName: citizen.name || user?.name || "Citizen",
        citizenPhone: phone.trim() || citizen.phone || user?.phone || "",
      });
      toast.success("Emergency dispatched — units notified");
      onDispatched(result.incident.id);
    } catch {
      // Error handled by mutation
    }
  }

  const isPending = createMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_340px] overflow-y-auto"
    >
      {/* Primary Flow: Category -> Location -> Optional Details */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-xs">
        {/* Step 1: Emergency Type Grid (Large 44px+ Icon Tiles) */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              1. What is the emergency?
            </label>
            <span className="text-xs text-muted-foreground">Select one category</span>
          </div>

          <div
            role="radiogroup"
            aria-label="Emergency category"
            className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
          >
            {EMERGENCY_TILES.map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setType(t.type)}
                  className={cn(
                    "flex flex-col items-start justify-center rounded-lg border p-3 text-left transition-colors min-h-[68px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 font-semibold"
                      : "border-border bg-surface text-foreground hover:bg-elevated hover:border-border-strong",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="text-xs font-semibold leading-tight">{t.label}</span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground leading-tight line-clamp-1">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Location Auto-detection & Address Confirmation */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              2. Emergency Location
            </label>
            <div className="flex items-center gap-2">
              {gpsStatus === "acquiring" && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  Acquiring GPS…
                </span>
              )}
              {gpsStatus === "locked" && (
                <span className="flex items-center gap-1.5 text-xs text-status-available font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  GPS locked (
                  <span className="font-mono tnum">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                  )
                </span>
              )}
              {gpsStatus === "unavailable" && (
                <span className="text-xs text-priority-p2">Manual address required</span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={detectLocation}
                className="h-7 text-xs px-2"
              >
                <Crosshair className="h-3 w-3 mr-1" />
                Refresh GPS
              </Button>
            </div>
          </div>

          <Field
            id="citizen-address"
            label="Street address or landmark"
            hint="Enter the exact building, gate, or intersection where the ambulance should arrive."
          >
            <Input
              id="citizen-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 450 Health Ave, Building B, Gate 2"
              className="text-sm font-medium"
              required
            />
          </Field>
        </div>

        {/* Step 3: Optional Scene Notes and Phone */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border">
          <Field
            id="citizen-phone"
            label="Callback phone number (optional)"
            hint="For dispatchers to call if needed"
          >
            <Input
              id="citizen-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="font-mono tnum text-xs"
            />
          </Field>

          <Field
            id="citizen-notes"
            label="Scene notes (optional)"
            hint="Floor, access code, or patient condition"
          >
            <Textarea
              id="citizen-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. 3rd floor, buzzer #402, patient is awake"
              className="text-xs resize-none"
            />
          </Field>
        </div>
      </div>

      {/* Right Column: Estimated Response & Immediate Submit Button */}
      <div className="flex flex-col gap-3">
        {/* Estimated Telemetry Banner */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Estimated Unit Response
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            {isLoadingEstimate ? (
              <span className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Calculating road telemetry…
              </span>
            ) : estimate?.isAvailable && estimate.etaMinutes != null ? (
              <>
                <span className="text-3xl font-bold font-mono tnum text-primary">
                  {estimate.etaMinutes}
                </span>
                <span className="text-xs text-muted-foreground font-medium">minutes</span>
              </>
            ) : estimate && !estimate.isAvailable ? (
              <span className="text-xs font-semibold text-priority-p2">All units responding</span>
            ) : (
              <span className="text-2xl font-bold font-mono tnum text-muted-foreground">—</span>
            )}
          </div>

          <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {estimate?.isAvailable && estimate.distanceKm != null ? (
              <span>
                Nearest sector unit is ~
                <span className="font-mono tnum">{estimate.distanceKm.toFixed(1)} km</span> away.
              </span>
            ) : (
              <span>
                Units standing by. Dispatchers will allocate the closest crew immediately upon
                request.
              </span>
            )}
          </div>

          {estimate && !estimate.isAvailable && (
            <div className="mt-3 rounded-md border border-priority-p2/20 bg-priority-p2/10 p-2.5 text-xs text-priority-p2">
              Sector units are responding to urgent calls. Your request will enter top-priority
              queue automatically.
            </div>
          )}
        </div>

        {/* Single High-Visibility Full-Width Submit Button (≥ 56px touch target) */}
        <Button
          type="submit"
          variant="emergency"
          size="xl"
          disabled={isPending}
          className="w-full min-h-[56px] text-base font-semibold shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Dispatching ambulance…
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Request ambulance now
            </>
          )}
        </Button>

        {/* Reassurance helper note */}
        <p className="text-center text-xs text-muted-foreground px-2 leading-tight">
          Dispatchers and the nearest available ambulance crew are notified immediately.
        </p>
      </div>
    </form>
  );
}

function TrackPanel({
  incident,
  citizen,
  now,
  onReport,
}: {
  incident: Incident | null;
  citizen: ReturnType<typeof useCitizenIdentity>[0];
  now: number | null;
  onReport: () => void;
}) {
  const { data: hospitals = [] } = useHospitals();
  const driver = incident?.driver ?? null;

  const hospital = useMemo(() => {
    if (!incident) return null;
    if (incident.hospitalId) return hospitals.find((h) => h.id === incident.hospitalId) ?? null;
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
      <EmptyState
        icon={<LifeBuoy className="h-5 w-5" />}
        message="No active emergency request"
        description="When you request an ambulance, live vehicle telemetry, ETA, and status milestones will appear here in real time."
        action={
          <Button variant="emergency" size="md" onClick={onReport} className="min-h-[44px]">
            <AlertCircle className="h-4 w-4 mr-1.5" />
            Request ambulance
          </Button>
        }
      />
    );
  }

  const isCompleted = incident.status === "completed";
  const isCancelled = incident.status === "cancelled";
  const isLive = !isCompleted && !isCancelled;

  const hasValidDriverLoc =
    driver?.location &&
    typeof driver.location.lat === "number" &&
    typeof driver.location.lng === "number" &&
    !isNaN(driver.location.lat) &&
    !isNaN(driver.location.lng) &&
    (driver.location.lat !== 0 || driver.location.lng !== 0);

  const hasValidIncidentLoc =
    incident?.location &&
    typeof incident.location.lat === "number" &&
    typeof incident.location.lng === "number" &&
    !isNaN(incident.location.lat) &&
    !isNaN(incident.location.lng) &&
    (incident.location.lat !== 0 || incident.location.lng !== 0);

  const distanceKm =
    incident.distanceKm != null
      ? incident.distanceKm
      : driver && hasValidDriverLoc && hasValidIncidentLoc && isLive
        ? haversineKm(driver.location, incident.location)
        : null;

  const eta =
    incident.etaMinutes != null
      ? incident.etaMinutes
      : distanceKm != null
        ? etaMinutes(distanceKm)
        : null;

  const arrived = incident.status === "arrived" || (distanceKm != null && distanceKm < 0.08);

  // Milestone Stepper
  const milestones: { key: string; label: string; done: boolean; active: boolean }[] = [
    {
      key: "received",
      label: "Request received",
      done: true,
      active: incident.status === "reported",
    },
    {
      key: "assigned",
      label: "Unit assigned",
      done: incident.status !== "reported",
      active: incident.status === "assigned" || incident.status === "accepted",
    },
    {
      key: "en_route",
      label: "Ambulance en route",
      done: ["en_route", "arrived", "patient_loaded", "at_hospital", "completed"].includes(
        incident.status,
      ),
      active: incident.status === "en_route",
    },
    {
      key: "arrived",
      label: "Arrived on scene",
      done: ["arrived", "patient_loaded", "at_hospital", "completed"].includes(incident.status),
      active: incident.status === "arrived",
    },
  ];

  return (
    <div className="grid h-full min-h-0 gap-4 md:grid-cols-[1fr_360px]">
      {/* Live Map Area */}
      <div className="min-h-[340px] md:min-h-0 flex-1">
        <CitizenMapWrapper
          incident={incident}
          driver={driver}
          hospital={hospital}
          citizenLocation={citizen.location}
        />
      </div>

      {/* Side Status & Telemetry Panel */}
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        {/* Incident Summary Card */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-muted-foreground tnum">
              {incident.code}
            </span>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={incident.status} />
            </div>
          </div>
          <div className="mt-2 text-base font-semibold text-foreground">
            {EMERGENCY_LABELS[incident.type]}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-priority-p1" />
            <span className="truncate">{incident.address}</span>
          </div>

          {/* Reassurance copy */}
          <div className="mt-3 rounded-md border border-border bg-surface p-2.5 text-xs text-muted-foreground leading-relaxed">
            Stay where you are and keep your phone nearby. Responders have your location and
            dispatchers are monitoring this call.
          </div>
        </div>

        {/* Milestone Progression Stepper */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Response Progress
          </div>
          <div className="space-y-3">
            {milestones.map((m, idx) => (
              <div key={m.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    m.done
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-muted-foreground",
                  )}
                >
                  {m.done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      m.active
                        ? "text-primary font-semibold"
                        : m.done
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {m.label}
                  </div>
                </div>
                {m.active && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              </div>
            ))}
          </div>
        </div>

        {/* Driver Assigned Card */}
        {driver ? (
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-status-enroute/15 text-status-enroute border border-status-enroute/30">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground font-mono">
                  {driver.callSign}
                </div>
                <div className="truncate text-xs text-muted-foreground">{driver.name}</div>
              </div>
              {isLive && driver.phone && (
                <a
                  href={`tel:${driver.phone.replace(/\D/g, "")}`}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-elevated hover:text-primary min-h-[44px] min-w-[44px]"
                  aria-label="Call emergency driver"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>

            {isLive ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border bg-surface p-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Estimated Arrival
                  </div>
                  <div className="mt-0.5 text-xl font-bold font-mono tnum text-primary">
                    {arrived ? "Arriving" : eta != null ? `${eta} min` : "—"}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Distance
                  </div>
                  <div className="mt-0.5 text-xl font-bold font-mono tnum text-foreground">
                    {distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
                  </div>
                </div>
              </div>
            ) : isCompleted ? (
              <div className="mt-3 rounded-md border border-status-available/30 bg-status-available/10 p-2.5 text-center text-xs font-semibold text-status-available">
                Mission Completed · Patient Handover Complete
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-center text-xs text-muted-foreground shadow-xs">
            <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto mb-2" />
            Allocating nearest sector ambulance crew…
          </div>
        )}

        {/* Destination Hospital */}
        {hospital && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Destination Hospital
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{hospital.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono tnum">{hospital.bedsAvailable}</span> of{" "}
              <span className="font-mono tnum">{hospital.beds}</span> emergency beds available
            </div>
          </div>
        )}

        {/* Timeline Events */}
        {incident.timeline && incident.timeline.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Activity Log
            </div>
            <ol className="space-y-2">
              {incident.timeline.map((ev) => (
                <li key={ev.id} className="flex gap-2.5 text-xs">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">
                      {INCIDENT_STATUS_LABELS[ev.status]}
                    </span>
                    <span
                      className="ml-1.5 text-muted-foreground font-mono tnum"
                      suppressHydrationWarning
                    >
                      {now ? formatRelative(ev.timestamp, now) : "…"}
                    </span>
                    {ev.note && <p className="text-xs text-muted-foreground mt-0.5">{ev.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
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
      <EmptyState
        icon={<History className="h-5 w-5" />}
        message="No previous incident records"
        description="Your past emergency requests and call records will be documented here."
      />
    );
  }

  return (
    <div className="grid gap-2.5 overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-xs">
      {incidents.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => onSelect(i.id)}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-elevated min-h-[44px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {EMERGENCY_LABELS[i.type]} ·{" "}
                <span className="font-mono tnum text-muted-foreground">{i.code}</span>
              </div>
              <div className="truncate text-xs text-muted-foreground mt-0.5">{i.address}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto text-right">
            <StatusBadge status={i.status} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono tnum">
              <Clock className="h-3.5 w-3.5" />
              <span suppressHydrationWarning>{formatRelative(i.reportedAt)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
