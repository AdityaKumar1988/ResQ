import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X, Sparkles, MapPin, Loader2, Phone, User, Radio, FileText } from "lucide-react";
import {
  EMERGENCY_LABELS,
  PRIORITY_META,
  type EmergencyType,
  type Priority,
} from "@/lib/ems/types";
import { recommendDrivers } from "@/lib/ems/recommend";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useCreateIncident, useAssignDriver } from "@/hooks/dispatch/use-incidents";
import { priorityClasses } from "@/lib/ems/style";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

export function NewIncidentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: drivers = [] } = useDrivers();
  const createMutation = useCreateIncident();
  const assignMutation = useAssignDriver();

  const [priority, setPriority] = useState<Priority>("P1");
  const [type, setType] = useState<EmergencyType>("cardiac");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const geoRequestedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      geoRequestedRef.current = false;
      return;
    }
    if (geoRequestedRef.current) return;
    geoRequestedRef.current = true;

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, [open]);

  // Preserve unit scoring algorithm
  const recommendations = useMemo(
    () => (location ? recommendDrivers({ location, priority }, drivers, 3) : []),
    [location, priority, drivers],
  );

  async function handleSubmit(driverId?: string) {
    if (!name.trim() || !address.trim()) {
      toast.error("Caller name and street address are required");
      return;
    }
    if (!location) {
      toast.error("Waiting for GPS coordinates lock...");
      return;
    }
    try {
      const incidentData = await createMutation.mutateAsync({
        priority,
        type,
        lat: location.lat,
        lng: location.lng,
        address,
        notes: notes || undefined,
        citizenName: name,
        citizenPhone: phone || "unknown",
      });

      if (driverId && incidentData.incident) {
        await assignMutation.mutateAsync({ incidentId: incidentData.incident.id, driverId });
        const d = drivers.find((x) => x.id === driverId);
        toast.success(`${incidentData.incident.code} dispatched to unit ${d?.callSign ?? ""}`);
      }

      onOpenChange(false);
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
    } catch {
      // Error toasted by mutation handler
    }
  }

  const isPending = createMutation.isPending || assignMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-border-strong bg-elevated p-0 shadow-2xl [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3.5 bg-surface-2/60">
          <DialogTitle className="font-heading flex items-center gap-2.5 text-base font-bold text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-p1)]/15 text-[var(--color-p1)] font-mono font-bold text-xs border border-[var(--color-p1)]/30">
              911
            </div>
            <span>New Emergency Intake & Dispatch</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Intake emergency caller details, determine triage level, and dispatch the closest
            recommended responder.
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Two-Column Layout on Desktop: Intake Form (Left) | Scored Units (Right) */}
        <div className="grid md:grid-cols-[1.1fr_0.9fr] max-h-[calc(85vh-56px)] overflow-y-auto">
          {/* Left Column: Intake Fields */}
          <div className="space-y-4 p-5 border-b md:border-b-0 md:border-r border-border">
            {/* Priority Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground/90 uppercase font-mono tracking-wider">
                Triage Priority <span className="text-p1 font-bold">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRIORITIES.map((p) => {
                  const meta = PRIORITY_META[p];
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "rounded-md border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                        active
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-surface-2 hover:border-border-strong",
                      )}
                    >
                      <div className="font-mono text-xs font-bold text-foreground">{p}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                        {Math.floor(meta.slaSec / 60)}m SLA
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emergency Type Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground/90 uppercase font-mono tracking-wider">
                Emergency Classification
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                      type === t
                        ? "border-primary bg-primary/15 text-primary font-semibold"
                        : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {EMERGENCY_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Caller Name & Phone */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="caller-name" label="Caller Name" required>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="caller-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="pl-9 h-10 text-xs bg-surface-2"
                  />
                </div>
              </Field>

              <Field id="caller-phone" label="Contact Phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="caller-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0192"
                    className="pl-9 h-10 text-xs bg-surface-2"
                  />
                </div>
              </Field>
            </div>

            {/* Street Address */}
            <Field id="incident-address" label="Incident Location" required>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="incident-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                  className="pl-9 h-10 text-xs bg-surface-2"
                />
              </div>
            </Field>

            {/* Clinical & Scene Notes */}
            <Field id="incident-notes" label="Clinical & Hazard Notes">
              <Textarea
                id="incident-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Patient conscious, chest pain radiating to left arm, stairs clear…"
                className="text-xs bg-surface-2 resize-none"
              />
            </Field>

            {/* GPS Telemetry Fix */}
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground font-mono">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {location
                  ? `GPS Locked · ${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`
                  : "Acquiring GPS fix…"}
              </span>
            </div>
          </div>

          {/* Right Column: Preserved Unit Recommendation & Instant Dispatch */}
          <div className="flex flex-col justify-between p-5 bg-surface-2/30">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Ranked Responders</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Real-time ETA</span>
              </div>

              {recommendations.length > 0 ? (
                <div className="space-y-2.5">
                  {recommendations.map((rec, i) => (
                    <div
                      key={rec.driverId}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        i === 0
                          ? "border-primary/50 bg-card shadow-sm"
                          : "border-border bg-card/70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {rec.callSign || "Ambulance"}
                            </span>
                            <span className="font-mono text-xs font-semibold text-primary rounded bg-primary/10 px-1.5 py-0.2 border border-primary/20">
                              Score {Math.round(rec.score)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {rec.driverName ? `${rec.driverName} · ` : ""}
                            <span className="text-foreground font-mono tnum font-semibold">
                              ~{rec.etaMinutes} min
                            </span>{" "}
                            ({rec.distanceKm.toFixed(1)} km)
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleSubmit(rec.driverId)}
                          className="h-7 text-xs font-semibold px-2.5"
                        >
                          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Dispatch"}
                        </Button>
                      </div>

                      {/* Rationale factors */}
                      {rec.reasons.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground pt-1.5 border-t border-border/50">
                          {rec.reasons.join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-4 text-center rounded border border-border bg-surface-2/60">
                  {location
                    ? "No available ambulances near this coordinate."
                    : "Acquiring GPS coordinates to score nearest fleet units."}
                </div>
              )}
            </div>

            {/* Manual Intake Submission Without Unit */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={isPending}
                onClick={() => handleSubmit()}
                className="w-full text-xs font-semibold gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Log to Queue (Dispatch Later)</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
