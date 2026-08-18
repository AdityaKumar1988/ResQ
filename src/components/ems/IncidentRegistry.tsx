import { useMemo, useState } from "react";
import { Clock, MapPin, Phone, Search, Siren, Truck, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_META, INCIDENT_STATUS_LABELS, EMERGENCY_LABELS } from "@/lib/ems/types";
import type { Incident, Priority, IncidentStatus } from "@/lib/ems/types";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { formatRelative } from "@/lib/ems/geo";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { ErrorState } from "@/components/ui/error-state";

export function IncidentRegistry() {
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
  const { data: drivers = [] } = useDrivers();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">("ALL");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const driverMap = useMemo(() => {
    return new Map(drivers.map((d) => [d.id, d]));
  }, [drivers]);

  // Real filtered incident list
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Priority filter
      if (priorityFilter !== "ALL" && inc.priority !== priorityFilter) return false;
      // Status filter
      if (statusFilter !== "ALL" && inc.status !== statusFilter) return false;
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const codeMatch = inc.code.toLowerCase().includes(q);
        const typeMatch = inc.type.toLowerCase().includes(q);
        const addrMatch = inc.address.toLowerCase().includes(q);
        const citizenMatch = inc.citizenName?.toLowerCase().includes(q) || false;
        const phoneMatch = inc.citizenPhone?.toLowerCase().includes(q) || false;
        const driver = inc.driverId ? driverMap.get(inc.driverId) : null;
        const driverMatch = driver
          ? driver.name.toLowerCase().includes(q) || driver.callSign.toLowerCase().includes(q)
          : false;

        return codeMatch || typeMatch || addrMatch || citizenMatch || phoneMatch || driverMatch;
      }
      return true;
    });
  }, [incidents, priorityFilter, statusFilter, search, driverMap]);

  const activeCount = incidents.filter(
    (i) => i.status !== "completed" && i.status !== "cancelled",
  ).length;
  const p1Count = incidents.filter((i) => i.priority === "P1").length;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <SkeletonList count={8} itemHeight="h-16" className="w-full max-w-4xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <ErrorState message="Failed to load incident registry" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/50 px-6 py-4 backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <Siren className="h-3.5 w-3.5 text-primary" /> Incident Registry & Operations Log
          </div>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            Emergency Incident Records
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-foreground">
            Total: <span className="font-bold font-mono text-primary">{incidents.length}</span>
          </span>
          <span className="rounded-md border border-p1/30 bg-p1/10 px-3 py-1 text-xs font-medium text-p1">
            P1 Critical: <span className="font-bold font-mono">{p1Count}</span>
          </span>
          <span className="rounded-md border border-status-available/30 bg-status-available/10 px-3 py-1 text-xs font-medium text-status-available">
            Active: <span className="font-bold font-mono">{activeCount}</span>
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/40 px-6 py-3">
        {/* Real search input */}
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, type, address, citizen, or driver…"
            className="input-base pl-9 text-xs w-full py-1.5"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Priority & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <div className="flex items-center rounded-md border border-border bg-surface-2 p-0.5">
            {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={cn(
                  "rounded-sm px-2 py-1 text-[11px] font-mono font-medium transition-colors",
                  priorityFilter === p
                    ? p === "P1"
                      ? "bg-p1 text-p1-foreground font-bold shadow-sm"
                      : "bg-surface-3 text-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center rounded-md border border-border bg-surface-2 p-0.5">
            {(["ALL", "reported", "assigned", "en_route", "completed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-sm px-2 py-1 text-[11px] font-mono capitalize transition-colors",
                  statusFilter === s
                    ? "bg-primary/20 text-primary font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "en_route" ? "En Route" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident List Table / Cards */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {filteredIncidents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/30 p-8 text-center text-muted-foreground">
            <Siren className="h-8 w-8 opacity-30 text-primary" />
            <div className="text-sm font-semibold text-foreground">No matching incidents found</div>
            <p className="max-w-sm text-xs text-muted-foreground">
              {search || priorityFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try adjusting your search terms or filters."
                : "No emergency incidents have been recorded in the database yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredIncidents.map((inc) => {
              const driver = inc.driverId ? driverMap.get(inc.driverId) : null;
              const statusLabel = INCIDENT_STATUS_LABELS[inc.status] ?? inc.status;

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm transition-all hover:border-primary/50 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold",
                        inc.priority === "P1"
                          ? "bg-p1 text-p1-foreground"
                          : inc.priority === "P2"
                            ? "bg-p2 text-p2-foreground"
                            : "bg-p3 text-p3-foreground",
                      )}
                    >
                      {inc.priority}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{inc.code}</span>
                        <span className="text-xs font-semibold capitalize text-foreground">
                          {EMERGENCY_LABELS[inc.type as keyof typeof EMERGENCY_LABELS] ?? inc.type}
                        </span>
                        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold text-muted-foreground">
                          {statusLabel}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary/70" />
                          <span className="truncate max-w-[260px]">{inc.address}</span>
                        </span>
                        {inc.citizenName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{inc.citizenName}</span>
                          </span>
                        )}
                        {inc.citizenPhone && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{inc.citizenPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border/50 pt-2 sm:border-0 sm:pt-0">
                    {driver ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Truck className="h-3.5 w-3.5 text-status-available" />
                        <div className="text-right">
                          <div className="font-mono font-semibold text-foreground">
                            {driver.callSign}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{driver.name}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-muted-foreground italic">
                        Unassigned
                      </span>
                    )}

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelative(inc.reportedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-xl border border-border-strong bg-elevated p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute right-4 top-4 rounded p-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span
                className={cn(
                  "rounded px-2 py-0.5 font-mono text-xs font-bold",
                  selectedIncident.priority === "P1"
                    ? "bg-p1 text-p1-foreground"
                    : "bg-p2 text-p2-foreground",
                )}
              >
                {selectedIncident.priority}
              </span>
              <h2 className="text-base font-bold text-foreground">{selectedIncident.code}</h2>
              <span className="text-xs text-muted-foreground capitalize">
                ·{" "}
                {EMERGENCY_LABELS[selectedIncident.type as keyof typeof EMERGENCY_LABELS] ??
                  selectedIncident.type}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold uppercase text-primary">
                    {selectedIncident.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium text-foreground text-right">
                    {selectedIncident.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <span className="font-mono text-muted-foreground">
                    {Number(selectedIncident.location.lat).toFixed(4)}° N,{" "}
                    {Number(selectedIncident.location.lng).toFixed(4)}° E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reported At:</span>
                  <span className="font-mono">
                    {new Date(selectedIncident.reportedAt).toLocaleString()}
                  </span>
                </div>
                {selectedIncident.notes && (
                  <div className="border-t border-border pt-1.5 mt-1.5">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-0.5 text-foreground italic">{selectedIncident.notes}</p>
                  </div>
                )}
              </div>

              {/* Citizen Details */}
              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                <div className="font-semibold text-foreground mb-1">Citizen Information</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{selectedIncident.citizenName ?? "Anonymous"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-mono">{selectedIncident.citizenPhone ?? "—"}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="rounded-md border border-border bg-surface-2 px-4 py-1.5 text-xs font-semibold hover:bg-surface-3"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
