import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/ems/geo";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import { useIncidents } from "@/hooks/dispatch/use-incidents";

interface ActivityEvent {
  id: string;
  kind: "critical" | "warn" | "success" | "info";
  message: string;
  timestamp: string;
}

/**
 * Activity Timeline — shows real notifications + recent incident events.
 * Replaces the old mock `selectActivity` from store.ts.
 */
export function ActivityTimeline() {
  const { data: notifData } = useNotifications();
  const { data: incidents = [] } = useIncidents();
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // Build activity events from real notifications + recent incident status changes
  const activity: ActivityEvent[] = [
    ...(notifData?.all ?? []).slice(0, 15).map((n) => ({
      id: n.id,
      kind:
        n.kind === "incident_created"
          ? "critical"
          : n.kind === "incident_assigned"
            ? "info"
            : n.kind === "incident_completed"
              ? "success"
              : ("info" as ActivityEvent["kind"]),
      message: n.title + (n.body ? ` — ${n.body}` : ""),
      timestamp: n.createdAt,
    })),
    // Also synthesize events from recent P1 incidents not yet in notifications
    ...incidents
      .filter((i) => i.priority === "P1" && i.status !== "completed" && i.status !== "cancelled")
      .slice(0, 5)
      .map((i) => ({
        id: `inc-${i.id}`,
        kind: "critical" as const,
        message: `${i.code} · P1 ${i.type} @ ${i.address}`,
        timestamp: i.reportedAt,
      })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return (
    <div className="flex h-full min-h-0 flex-col panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wider">Activity stream</h3>
        </div>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {activity.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex min-w-max gap-2 p-3">
          {activity.length === 0 && (
            <div className="flex min-w-[220px] items-center justify-center text-xs text-muted-foreground">
              No activity yet.
            </div>
          )}
          {activity.map((e) => (
            <div
              key={e.id}
              className={cn(
                "flex min-w-[220px] max-w-[280px] items-start gap-2 rounded-md border p-2.5",
                e.kind === "critical"
                  ? "border-p1/40 bg-p1/5"
                  : e.kind === "warn"
                    ? "border-p2/40 bg-p2/5"
                    : e.kind === "success"
                      ? "border-status-available/40 bg-status-available/5"
                      : "border-border bg-surface-2",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded",
                  e.kind === "critical"
                    ? "bg-p1/20 text-p1"
                    : e.kind === "warn"
                      ? "bg-p2/20 text-p2"
                      : e.kind === "success"
                        ? "bg-status-available/20 text-status-available"
                        : "bg-surface-3 text-muted-foreground",
                )}
              >
                {e.kind === "critical" ? (
                  <Siren className="h-3.5 w-3.5" />
                ) : e.kind === "warn" ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : e.kind === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Info className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium leading-snug">{e.message}</div>
                <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                  {formatRelative(e.timestamp, now)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
