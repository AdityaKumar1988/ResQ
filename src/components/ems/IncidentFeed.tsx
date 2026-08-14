import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Loader2, MapPin, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMERGENCY_LABELS, PRIORITY_META, type Priority } from "@/lib/ems/types";
import { formatRelative } from "@/lib/ems/geo";
import { priorityClasses } from "@/lib/ems/style";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import type { Incident } from "@/types/incident";

const PRIORITY_FILTERS: Array<Priority | "ALL"> = ["ALL", "P1", "P2", "P3", "P4"];
interface IncidentFeedProps {
  onCreate: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function IncidentFeed({ onCreate, selectedId, onSelect }: IncidentFeedProps) {
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
  const [filter, setFilter] = useState<Priority | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = incidents.filter((i) => i.status !== "completed" && i.status !== "cancelled");
  const filtered = active.filter((i) => {
    if (filter !== "ALL" && i.priority !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        i.code.toLowerCase().includes(q) ||
        i.address.toLowerCase().includes(q) ||
        (i.citizenName ?? "").toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-col panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Live feed
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Active incidents</h2>
            <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {filtered.length}
            </span>
          </div>
        </div>
        <button
          onClick={onCreate}
          className="rounded-md bg-gradient-to-br from-primary to-primary-glow px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
        >
          + New incident
        </button>
      </div>

      <div className="space-y-2 border-b border-border px-4 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search feed…"
            className="w-full rounded-md border border-border bg-surface-2 py-1.5 pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn(
                "flex-1 rounded px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors",
                filter === p
                  ? "bg-primary/20 text-primary shadow-[inset_0_0_0_1px_var(--primary)]"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div className="text-xs">Loading incidents…</div>
          </div>
        )}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div className="text-xs text-muted-foreground">Failed to load incidents</div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs hover:bg-surface-3"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <AlertTriangle className="h-6 w-6 opacity-40" />
            <div className="text-xs">No incidents match this filter.</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((i) => (
              <IncidentCard
                key={i.id}
                incident={i}
                selected={i.id === selectedId}
                now={now}
                onSelect={() => onSelect(i.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  selected,
  now,
  onSelect,
}: {
  incident: Incident;
  selected: boolean;
  now: number;
  onSelect: () => void;
}) {
  const cls = priorityClasses(incident.priority);
  const meta = PRIORITY_META[incident.priority];
  const elapsedSec = now
    ? Math.max(0, Math.floor((now - new Date(incident.reportedAt).getTime()) / 1000))
    : 0;
  const remaining = meta.slaSec - elapsedSec;
  const slaPct = Math.min(100, (elapsedSec / meta.slaSec) * 100);
  const slaCritical = now > 0 && remaining < 60;
  const slaWarn = now > 0 && remaining < meta.slaSec * 0.3;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group w-full rounded-md border p-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_var(--primary)]"
          : "border-border bg-surface-2 hover:border-border-strong hover:bg-surface-3",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold",
            cls.solid,
          )}
        >
          {incident.priority}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
              {incident.code}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatRelative(incident.reportedAt, now)}
            </span>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">
            {EMERGENCY_LABELS[incident.type]}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{incident.address}</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn(
                  "h-1 transition-all",
                  slaCritical ? "bg-p1" : slaWarn ? "bg-p2" : "bg-status-available",
                )}
                style={{ width: `${slaPct}%` }}
              />
            </div>
            <div
              className={cn(
                "flex items-center gap-1 font-mono text-[10px] tabular-nums",
                slaCritical ? "text-p1" : slaWarn ? "text-p2" : "text-muted-foreground",
              )}
            >
              <Clock className="h-3 w-3" />
              {remaining > 0
                ? `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, "0")}`
                : "OVERDUE"}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
