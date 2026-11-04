import { useMemo, useState } from "react";
import { AlertTriangle, Search, Truck, User, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AmbulanceStatus } from "@/lib/ems/types";
import type { VehicleType } from "@/types/vehicle";
import { useVehicles } from "@/hooks/fleet/use-vehicles";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { ErrorState } from "@/components/ui/error-state";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function FleetRegistry() {
  const { data: vehicles = [], isLoading, isError, refetch } = useVehicles();
  const { data: drivers = [] } = useDrivers();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AmbulanceStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "ALL">("ALL");

  const vehicleDriverMap = useMemo(() => {
    const map = new Map<string, (typeof drivers)[0]>();
    drivers.forEach((d) => {
      if (d.vehicleId) {
        map.set(d.vehicleId, d);
      }
    });
    return map;
  }, [drivers]);

  // Real filtered fleet vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Status filter
      if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
      // Type filter
      if (typeFilter !== "ALL" && v.type !== typeFilter) return false;
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const plateMatch = (v.plate || "").toLowerCase().includes(q);
        const modelMatch = (v.model || "").toLowerCase().includes(q);
        const typeMatch = (v.type || "").toLowerCase().includes(q);
        const driver = vehicleDriverMap.get(v.id);
        const driverMatch = driver
          ? (driver.name || "").toLowerCase().includes(q) ||
            (driver.callSign || "").toLowerCase().includes(q) ||
            (driver.phone || "").toLowerCase().includes(q)
          : false;

        return plateMatch || modelMatch || typeMatch || driverMatch;
      }
      return true;
    });
  }, [vehicles, statusFilter, typeFilter, search, vehicleDriverMap]);

  const availableCount = vehicles.filter((v) => v.status === "available").length;
  const enrouteCount = vehicles.filter(
    (v) => v.status === "en_route" || v.status === "busy",
  ).length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <SkeletonList count={6} className="w-full max-w-4xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <ErrorState message="Failed to load fleet registry assets" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            <Truck className="h-4 w-4 text-primary" /> Ambulance Fleet & Asset Registry
          </div>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            Fleet Asset Management
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
            Total Fleet:{" "}
            <span className="font-bold font-mono tnum text-primary">{vehicles.length}</span>
          </span>
          <span className="rounded-md border border-status-available/30 bg-status-available/10 px-3 py-1 text-xs font-medium text-status-available">
            Available: <span className="font-bold font-mono tnum">{availableCount}</span>
          </span>
          <span className="rounded-md border border-status-enroute/30 bg-status-enroute/10 px-3 py-1 text-xs font-medium text-status-enroute">
            On Mission: <span className="font-bold font-mono tnum">{enrouteCount}</span>
          </span>
          {maintenanceCount > 0 && (
            <span className="rounded-md border border-priority-p2/30 bg-priority-p2/10 px-3 py-1 text-xs font-medium text-priority-p2">
              Maintenance: <span className="font-bold font-mono tnum">{maintenanceCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-6 py-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by license plate, model, vehicle type, or driver…"
            className="pl-9 text-xs h-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div
            className="flex items-center rounded-md border border-border bg-surface p-0.5"
            role="group"
            aria-label="Filter by vehicle status"
          >
            {(["ALL", "available", "en_route", "busy", "maintenance", "offline"] as const).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-mono capitalize transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                    statusFilter === s
                      ? "bg-elevated text-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "en_route" ? "En Route" : s}
                </button>
              ),
            )}
          </div>

          {/* Type Filter */}
          <div
            className="flex items-center rounded-md border border-border bg-surface p-0.5"
            role="group"
            aria-label="Filter by vehicle type"
          >
            {(["ALL", "ALS", "BLS", "ICU", "MICU"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  typeFilter === t
                    ? "bg-elevated text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {filteredVehicles.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            <Truck className="h-8 w-8 opacity-30 text-primary" />
            <div className="text-sm font-semibold text-foreground">No matching vehicles found</div>
            <p className="max-w-sm text-xs text-muted-foreground">
              {search || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "Try adjusting your search criteria or filter selections."
                : "No ambulance assets are currently registered in the fleet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => {
              if (!vehicle) return null;
              const driver = vehicleDriverMap.get(vehicle.id);
              const isMaintenance = vehicle.status === "maintenance";

              return (
                <div
                  key={vehicle.id}
                  className={cn(
                    "rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40",
                    isMaintenance && "border-priority-p2/40 bg-priority-p2/[0.02]",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {vehicle.plate || "—"}
                        </span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary border border-primary/20 uppercase">
                          {vehicle.type || "ALS"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {vehicle.model || "Ambulance"}
                      </div>
                    </div>

                    <StatusBadge status={vehicle.status} />
                  </div>

                  {/* Maintenance Notice if applicable */}
                  {isMaintenance && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-priority-p2/30 bg-priority-p2/10 p-2 text-xs text-priority-p2">
                      <Wrench className="h-3.5 w-3.5 shrink-0" />
                      <span>Scheduled maintenance · Offline for inspection</span>
                    </div>
                  )}

                  {/* Driver Linkage */}
                  <div className="mt-3.5 rounded-lg border border-border bg-surface p-2.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                      Assigned Crew
                    </div>
                    {driver ? (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs">
                            {driver.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {driver.name}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground truncate">
                              {driver.phone || "—"}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-primary shrink-0 ml-2">
                          {driver.callSign || "—"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                        <User className="h-3.5 w-3.5 opacity-40" />
                        <span>No crew assigned</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
