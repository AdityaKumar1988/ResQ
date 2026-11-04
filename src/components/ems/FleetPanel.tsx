import { useState } from "react";
import { ChevronDown, ChevronRight, Star, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, type AmbulanceStatus } from "@/lib/ems/types";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useVehicles } from "@/hooks/fleet/use-vehicles";
import { StatusDot } from "@/components/ui/status-dot";
import { MetricCard } from "@/components/ui/metric-card";
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
    at_hospital: true,
  });

  const byStatus = GROUPS.map((status) => ({
    status,
    drivers: drivers.filter((d) => d.status === status),
  }));

  const readyCount = drivers.filter((d) => d.status === "available").length;
  const enRouteCount = drivers.filter((d) => d.status === "en_route").length;
  const activeCount = drivers.filter(
    (d) => d.status === "busy" || d.status === "at_hospital",
  ).length;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Fleet Header */}
      <div className="border-b border-border px-3.5 py-2.5">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
          Fleet Registry
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <h2 className="text-sm font-bold text-foreground">Ambulance Units</h2>
          <span className="rounded bg-surface-2 border border-border px-1.5 py-0.5 text-xs font-mono tnum text-muted-foreground font-semibold">
            {drivers.length} total
          </span>
        </div>

        {/* MetricCard Summary Header */}
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <MetricCard
            variant="chip"
            label="Ready"
            value={readyCount}
            className="p-2 border-border/70"
          />
          <MetricCard
            variant="chip"
            label="En Route"
            value={enRouteCount}
            className="p-2 border-border/70"
          />
          <MetricCard
            variant="chip"
            label="At Scene"
            value={activeCount}
            className="p-2 border-border/70"
          />
        </div>
      </div>

      {/* Driver List Grouped by Status */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && <SkeletonList count={4} itemHeight="h-16" />}

        {isError && !isLoading && (
          <ErrorState message="Failed to load fleet data" onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && (
          <div className="space-y-2">
            {byStatus.map(({ status, drivers: list }) => {
              if (list.length === 0) return null;
              const meta = STATUS_META[status];
              const isOpen = openGroups[status] ?? false;

              return (
                <div
                  key={status}
                  className="rounded-md border border-border/60 bg-surface-2/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenGroups((g) => ({ ...g, [status]: !isOpen }))}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} size="md" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs font-semibold tnum text-muted-foreground">
                        {list.length}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/40 p-1.5 space-y-1">
                      {list.map((d) => {
                        const vehicle = vehicles.find((v) => v.id === d.vehicleId);

                        return (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-2.5 rounded-md border border-border/50 bg-card p-2 hover:border-border transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-2 border border-border text-foreground font-mono text-xs font-bold">
                                <Truck className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-foreground">
                                    {d.callSign}
                                  </span>
                                  {vehicle && (
                                    <span className="rounded px-1.5 py-0.2 text-[11px] font-mono uppercase bg-surface-3 text-muted-foreground border border-border/50 font-semibold">
                                      {vehicle.type}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {d.name}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-xs font-mono tnum text-muted-foreground">
                              <Star className="h-3 w-3 fill-amber-400/80 text-amber-400" />
                              <span>{d.rating.toFixed(1)}</span>
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
