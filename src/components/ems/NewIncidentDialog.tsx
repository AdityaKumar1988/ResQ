import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X, Sparkles, Star, MapPin, Clock, Loader2 } from "lucide-react";
import {
  EMERGENCY_LABELS,
  PRIORITY_META,
  type EmergencyType,
  type Priority,
} from "@/lib/ems/types";
import { OPS_CENTER } from "@/lib/ems/geo";
import { recommendDrivers } from "@/lib/ems/recommend";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useCreateIncident, useAssignDriver } from "@/hooks/dispatch/use-incidents";
import { priorityClasses } from "@/lib/ems/style";

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // ignore errors, stays null
      { enableHighAccuracy: true },
    );
  }, []);

  const recommendations = useMemo(
    () => (location ? recommendDrivers({ location, priority }, drivers, 3) : []),
    [location, priority, drivers],
  );

  async function handleSubmit(driverId?: string) {
    if (!name || !address) {
      toast.error("Caller name and address are required");
      return;
    }
    if (!location) {
      toast.error("Waiting for GPS location...");
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
        toast.success(`${incidentData.incident.code} dispatched to ${d?.callSign ?? "unit"}`);
      }
      onOpenChange(false);
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
    } catch {
      // Error already toasted by mutation handlers
    }
  }

  const isPending = createMutation.isPending || assignMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-border-strong bg-elevated p-0 [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-p1/20 text-p1">
              <span className="text-[11px] font-bold">911</span>
            </div>
            New incident intake
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="grid gap-0 md:grid-cols-[1fr_320px]">
          <div className="space-y-4 border-r border-border p-5">
            <div>
              <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRIORITIES.map((p) => {
                  const cls = priorityClasses(p);
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        "rounded-md border px-2 py-2 text-left transition-all",
                        active
                          ? `${cls.border} ${cls.bg}`
                          : "border-border bg-surface-2 hover:border-border-strong",
                      )}
                    >
                      <div className={cn("font-mono text-xs font-bold", cls.text)}>{p}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {PRIORITY_META[p].label} · {Math.floor(PRIORITY_META[p].slaSec / 60)}m SLA
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Emergency type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors",
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

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Caller name" value={name} onChange={setName} placeholder="Jane Doe" />
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 555…" />
            </div>
            <Field
              label="Address"
              value={address}
              onChange={setAddress}
              placeholder="123 Broadway"
            />
            <div>
              <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Patient conscious, chest pain radiating to left arm…"
                className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/50 px-3 py-2 text-[11px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {location
                ? `GPS locked · ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                : "Acquiring GPS…"}
            </div>
          </div>

          <div className="flex flex-col bg-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Recommended units
              </span>
            </div>
            <div className="flex-1 space-y-2">
              {recommendations.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No available units near this location.
                </div>
              )}
              {recommendations.map((r, i) => {
                const d = drivers.find((x) => x.id === r.driverId);
                const rating = Number(d?.rating ?? 4.7);
                const score = Number(r.score ?? 0);
                const distanceKm = Number(r.distanceKm ?? 0);
                return (
                  <button
                    key={r.driverId}
                    onClick={() => handleSubmit(r.driverId)}
                    className={cn(
                      "group w-full rounded-md border p-2.5 text-left transition-all",
                      i === 0
                        ? "border-primary/50 bg-primary/5 shadow-glow"
                        : "border-border bg-surface-2 hover:border-border-strong",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold">
                            {d?.callSign ?? "Unit"}
                          </span>
                          {i === 0 && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                              Best
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {d?.name ?? "Available Unit"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-primary">
                          {score.toFixed(0)}
                        </div>
                        <div className="text-[9px] uppercase text-muted-foreground">score</div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {distanceKm.toFixed(1)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ETA {Number(r.etaMinutes ?? 0)}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-p3 text-p3" />
                        {rating.toFixed(1)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
              <button
                onClick={() => handleSubmit()}
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-semibold hover:bg-surface-3 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Create without assigning
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Ranking uses distance, availability, rating, avg response, and workload.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
