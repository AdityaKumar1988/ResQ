import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Radio, Siren, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/ems/geo";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import { useIncidents } from "@/hooks/dispatch/use-incidents";

interface ActivityEvent {
  id: string;
  kind: "critical" | "warn" | "success" | "info";
  actor: "DISPATCH" | "SYSTEM" | "FIELD" | "INTAKE";
  message: string;
  timestamp: string;
}

/**
 * Activity Timeline — Standardized event stream with icon, time (tnum), and actor.
 * Fully responsive to vertical resizing from react-resizable-panels.
 */
export function ActivityTimeline({ isExpanded = false }: { isExpanded?: boolean }) {
  const { data: notifData } = useNotifications();
  const { data: incidents = [] } = useIncidents();
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // Standardize activity events from notifications and incidents
  const activity: ActivityEvent[] = [
    ...(notifData?.all ?? []).slice(0, 25).map((n) => {
      const isCritical = n.kind === "incident_created";
      const isCompleted = n.kind === "incident_completed";
      const isAssigned = n.kind === "incident_assigned";

      return {
        id: n.id,
        kind: isCritical
          ? ("critical" as const)
          : isCompleted
            ? ("success" as const)
            : isAssigned
              ? ("info" as const)
              : ("info" as const),
        actor: isCritical
          ? ("INTAKE" as const)
          : isAssigned
            ? ("DISPATCH" as const)
            : isCompleted
              ? ("FIELD" as const)
              : ("SYSTEM" as const),
        message: n.title + (n.body ? ` — ${n.body}` : ""),
        timestamp: n.createdAt,
      };
    }),
    ...incidents
      .filter((i) => i.priority === "P1" && i.status !== "completed" && i.status !== "cancelled")
      .slice(0, 5)
      .map((i) => ({
        id: `inc-${i.id}`,
        kind: "critical" as const,
        actor: "DISPATCH" as const,
        message: `${i.code} · P1 priority emergency intake at ${i.address}`,
        timestamp: i.reportedAt,
      })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* Header Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3.5 py-1.5 bg-surface-2/60 select-none">
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-2 rounded-full bg-primary shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Activity Stream
          </h3>
        </div>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs font-semibold tnum text-muted-foreground">
          {activity.length} events
        </span>
      </div>

      {/* Content Stream */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto p-2">
        {activity.length === 0 ? (
          <div className="flex h-full min-h-[50px] items-center justify-center text-xs text-muted-foreground">
            No recent activity recorded.
          </div>
        ) : isExpanded ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activity.map((e) => (
              <StandardizedEventRow key={e.id} event={e} now={now} />
            ))}
          </div>
        ) : (
          <div className="flex min-w-max gap-2">
            {activity.map((e) => (
              <StandardizedEventRow key={e.id} event={e} now={now} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StandardizedEventRow({ event, now }: { event: ActivityEvent; now: number }) {
  const Icon =
    event.kind === "critical"
      ? Siren
      : event.kind === "success"
        ? CheckCircle2
        : event.kind === "warn"
          ? AlertTriangle
          : event.actor === "FIELD"
            ? Truck
            : event.actor === "DISPATCH"
              ? Radio
              : Info;

  const iconColor =
    event.kind === "critical"
      ? "text-[var(--color-p1)]"
      : event.kind === "success"
        ? "text-status-available"
        : event.kind === "warn"
          ? "text-[var(--color-p2)]"
          : "text-primary";

  const actorBadgeColor =
    event.actor === "DISPATCH"
      ? "bg-primary/10 text-primary border-primary/30"
      : event.actor === "INTAKE"
        ? "bg-[var(--color-p1)]/10 text-[var(--color-p1)] border-[var(--color-p1)]/30"
        : event.actor === "FIELD"
          ? "bg-status-available/10 text-status-available border-status-available/30"
          : "bg-surface-3 text-muted-foreground border-border";

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface-2/60 px-3 py-1.5 text-xs transition-colors hover:border-border-strong hover:bg-surface-2 max-w-sm shrink-0">
      <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />

      <div className="min-w-0 flex-1 leading-snug">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.2 font-mono text-[11px] font-bold uppercase tracking-wider border",
              actorBadgeColor,
            )}
          >
            {event.actor}
          </span>
          <span
            className="font-mono text-xs tnum text-muted-foreground shrink-0"
            suppressHydrationWarning
          >
            {formatRelative(event.timestamp, now)}
          </span>
        </div>
        <p className="truncate text-foreground font-medium">{event.message}</p>
      </div>
    </div>
  );
}
