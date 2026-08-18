import { useState } from "react";
import { Star, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, type AmbulanceStatus } from "@/lib/ems/types";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useVehicles } from "@/hooks/fleet/use-vehicles";
import { statusClasses } from "@/lib/ems/style";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";

const GROUPS: AmbulanceStatus[] = [
  "available",
  "en_route",
  "busy",
  "at_hospital",
  "maintenance",
  "offline",
];

export function FleetPanel() {
  const { data: drivers = [], isLoading, isError, refetch } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    available: true,
    en_route: true,
    busy: true,
  });

  const byStatus = GROUPS.map((status) => ({
    status,
    drivers: drivers.filter((d) => d.status === status),
  }));

  return (
    <div className="flex h-full min-h-0 flex-col panel">
      <div className="border-b border-border px-4 py-3">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Fleet
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <h2 className="text-sm font-semibold">Ambulance status</h2>
          <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {drivers.length}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <MiniStat
            label="Ready"
            value={drivers.filter((d) => d.status === "available").length}
            accent="available"
          />
          <MiniStat
            label="Active"
            value={drivers.filter((d) => d.status === "en_route" || d.status === "busy").length}
            accent="enroute"
          />
          <MiniStat
            label="Down"
            value={
              drivers.filter((d) => d.status === "offline" || d.status === "maintenance").length
            }
            accent="offline"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && <SkeletonList count={5} />}
        {isError && !isLoading && (
          <ErrorState message="Failed to load fleet data" onRetry={() => refetch()} />
        )}
        {!isLoading && !isError && (
          <div className="space-y-2">
            {byStatus.map(({ status, drivers: list }) => {
              if (list.length === 0) return null;
              const meta = STATUS_META[status];
              const cls = statusClasses(status);
              const open = openGroups[status] ?? false;
              return (
                <div key={status}>
                  <button
                    onClick={() => setOpenGroups((g) => ({ ...g, [status]: !open }))}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-surface-2"
                  >
                    <span className={cn("h-2 w-2 rounded-full", cls.dot)} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="ml-auto rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {list.length}
                    </span>
                  </button>
                  {open && (
                    <div className="mt-1 space-y-1 pl-2">
                      {list.map((d) => {
                        const vehicle = vehicles.find((v) => v.id === d.vehicleId);
                        return (
                          <div
                            key={d.id}
                            className="group flex items-center gap-2.5 rounded-md border border-border bg-surface-2 p-2 hover:border-border-strong"
                          >
                            <div
                              className={cn(
                                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded",
                                cls.bg,
                              )}
                            >
                              <Truck className={cn("h-4 w-4", cls.text)} />
                              {status === "en_route" && (
                                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-status-enroute pulse-dot pulse-ring text-status-enroute" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-semibold">
                                  {d.callSign}
                                </span>
                                {vehicle && (
                                  <span className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                                    {vehicle.type}
                                  </span>
                                )}
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {d.name} · {vehicle?.plate}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Star className="h-3 w-3 fill-p3 text-p3" />
                              <span className="tabular-nums">
                                {Number(d.rating ?? 0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "available" | "enroute" | "offline";
}) {
  const dot =
    accent === "available"
      ? "bg-status-available"
      : accent === "enroute"
        ? "bg-status-enroute"
        : "bg-status-offline";
  return (
    <div className="rounded-md border border-border bg-surface-2 p-2">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
