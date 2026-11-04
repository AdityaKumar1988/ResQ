import { useEffect, useState } from "react";
import { Clock, MapPin, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMERGENCY_LABELS, PRIORITY_META, type Priority } from "@/lib/ems/types";
import { formatRelative } from "@/lib/ems/geo";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
            Operational Queue
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="text-sm font-bold text-foreground">Active Incidents</h2>
            <span className="rounded bg-surface-2 border border-border px-1.5 py-0.5 text-xs font-mono tnum text-muted-foreground font-semibold">
              {filtered.length}
            </span>
          </div>
        </div>
        <Button
          type="button"
          onClick={onCreate}
          variant="primary"
          size="sm"
          className="gap-1 font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Incident</span>
        </Button>
      </div>

      {/* Search & Priority Filter Controls */}
      <div className="space-y-2 border-b border-border px-3.5 py-2.5 bg-surface/50">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, street, symptoms…"
            className="h-8 pl-8 pr-2.5 text-xs"
            aria-label="Filter incidents"
          />
        </div>

        {/* Priority Filter with Accessible Tablist Semantics */}
        <div
          role="tablist"
          aria-label="Priority filters"
          className="grid grid-cols-5 gap-1 rounded-md bg-surface-2/80 p-0.5 border border-border/60"
        >
          {PRIORITY_FILTERS.map((p) => {
            const isSelected = filter === p;
            return (
              <button
                key={p}
                role="tab"
                aria-selected={isSelected}
                aria-label={`Show ${p} priority incidents`}
                type="button"
                onClick={() => setFilter(p)}
                className={cn(
                  "rounded py-1 text-center font-mono text-[11px] uppercase font-semibold tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  isSelected
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incident List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && <SkeletonList count={4} itemHeight="h-20" />}

        {isError && !isLoading && (
          <ErrorState message="Failed to load incident feed" onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            message="No active incidents"
            description={
              query || filter !== "ALL"
                ? "No active triage tickets match the search query or priority filter."
                : "All reported emergency incidents have been resolved or handed over."
            }
          />
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="space-y-1.5" role="feed" aria-label="Incident feed list">
            {filtered.map((i) => (
              <IncidentCompactRow
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

function IncidentCompactRow({
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
  const meta = PRIORITY_META[incident.priority];
  const elapsedSec = now
    ? Math.max(0, Math.floor((now - new Date(incident.reportedAt).getTime()) / 1000))
    : 0;
  const remaining = meta.slaSec - elapsedSec;
  const isOverdue = remaining <= 0;
  const slaPct = Math.min(100, Math.max(0, (elapsedSec / meta.slaSec) * 100));

  // SLA Bar Rule: Render SLA bar only on P1/P2 or breached
  const showSlaBar = incident.priority === "P1" || incident.priority === "P2" || isOverdue;

  // Pulsing Rule: Pulse ONLY for P1 under 2 minutes SLA (< 120s remaining)
  const shouldPulse = incident.priority === "P1" && remaining > 0 && remaining < 120;

  const priorityColorClass =
    incident.priority === "P1"
      ? "bg-[var(--color-p1)]"
      : incident.priority === "P2"
        ? "bg-[var(--color-p2)]"
        : incident.priority === "P3"
          ? "bg-[var(--color-p3)]"
          : "bg-[var(--color-p4)]";

  const priorityTextClass =
    incident.priority === "P1"
      ? "text-[var(--color-p1)]"
      : incident.priority === "P2"
        ? "text-[var(--color-p2)]"
        : incident.priority === "P3"
          ? "text-[var(--color-p3)]"
          : "text-[var(--color-p4)]";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full text-left rounded-md border transition-colors overflow-hidden p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "border-primary bg-surface-2 shadow-sm"
          : "border-border bg-surface-2/60 hover:border-border-strong hover:bg-surface-2",
        shouldPulse && "animate-pulse ring-1 ring-[var(--color-p1)]",
      )}
    >
      {/* Priority Bar Indicator */}
      <span
        className={cn("absolute left-0 top-0 bottom-0 w-1", priorityColorClass)}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0 pl-1.5">
        {/* Row 1: Code, Priority, Elapsed time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className={cn("font-mono text-xs font-bold shrink-0", priorityTextClass)}>
              {incident.priority}
            </span>
            <span className="font-mono text-xs text-foreground font-semibold truncate tnum">
              {incident.code}
            </span>
          </div>
          <span
            className="font-mono text-xs tnum text-muted-foreground shrink-0"
            suppressHydrationWarning
          >
            {formatRelative(incident.reportedAt, now)}
          </span>
        </div>

        {/* Row 2: Emergency Type */}
        <div className="mt-0.5 text-xs font-semibold text-foreground truncate">
          {EMERGENCY_LABELS[incident.type] || incident.type}
        </div>

        {/* Row 3: Address */}
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{incident.address}</span>
        </div>

        {/* Optional Row 4: SLA bar only on P1/P2 or breached */}
        {showSlaBar && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-full bg-surface-3 h-1.5">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  isOverdue
                    ? "bg-[var(--color-p1)]"
                    : remaining < 120
                      ? "bg-[var(--color-p1)]"
                      : "bg-[var(--color-p2)]",
                )}
                style={{ width: `${slaPct}%` }}
              />
            </div>
            <div
              className={cn(
                "flex items-center gap-1 font-mono text-xs tnum shrink-0 font-medium",
                isOverdue
                  ? "text-[var(--color-p1)] font-bold"
                  : remaining < 120
                    ? "text-[var(--color-p1)]"
                    : "text-muted-foreground",
              )}
            >
              <Clock className="h-3 w-3 shrink-0" />
              <span>
                {isOverdue
                  ? "BREACHED"
                  : `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, "0")}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
