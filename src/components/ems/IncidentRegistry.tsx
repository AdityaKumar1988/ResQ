import { useMemo, useState } from "react";
import { Clock, MapPin, Phone, Search, Siren, Truck, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INCIDENT_STATUS_LABELS,
  EMERGENCY_LABELS,
  type Priority,
  type IncidentStatus,
} from "@/lib/ems/types";
import type { Incident } from "@/types/incident";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { formatRelative } from "@/lib/ems/geo";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { ErrorState } from "@/components/ui/error-state";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
        <SkeletonList count={8} className="w-full max-w-4xl" />
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
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            <Siren className="h-4 w-4 text-primary" /> Incident Registry & Operations Log
          </div>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            Emergency Incident Records
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
            Total: <span className="font-bold font-mono tnum text-primary">{incidents.length}</span>
          </span>
          <span className="rounded-md border border-priority-p1/30 bg-priority-p1/10 px-3 py-1 text-xs font-medium text-priority-p1">
            P1 Critical: <span className="font-bold font-mono tnum">{p1Count}</span>
          </span>
          <span className="rounded-md border border-status-available/30 bg-status-available/10 px-3 py-1 text-xs font-medium text-status-available">
            Active: <span className="font-bold font-mono tnum">{activeCount}</span>
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-6 py-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, type, address, citizen, or driver…"
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <div
            className="flex items-center rounded-md border border-border bg-surface p-0.5"
            role="group"
            aria-label="Filter by priority"
          >
            {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  priorityFilter === p
                    ? "bg-elevated text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div
            className="flex items-center rounded-md border border-border bg-surface p-0.5"
            role="group"
            aria-label="Filter by status"
          >
            {(["ALL", "reported", "assigned", "en_route", "completed"] as const).map((s) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Desktop Table (>= 768px) and Mobile Cards (< 768px) */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {filteredIncidents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            <Siren className="h-8 w-8 opacity-30 text-primary" />
            <div className="text-sm font-semibold text-foreground">No matching incidents found</div>
            <p className="max-w-sm text-xs text-muted-foreground">
              {search || priorityFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try adjusting your search query or severity filters."
                : "No emergency incidents have been recorded in the database yet."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block rounded-lg border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader className="bg-surface">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="px-4 py-3">Priority</TableHead>
                    <TableHead className="px-4 py-3">Incident Code</TableHead>
                    <TableHead className="px-4 py-3">Category</TableHead>
                    <TableHead className="px-4 py-3">Pickup Address</TableHead>
                    <TableHead className="px-4 py-3">Caller</TableHead>
                    <TableHead className="px-4 py-3">Assigned Unit</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3">Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {filteredIncidents.map((inc) => {
                    const driver = inc.driverId ? driverMap.get(inc.driverId) : null;
                    return (
                      <TableRow
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className="hover:bg-elevated/70 transition-colors cursor-pointer border-b border-border/40"
                      >
                        <TableCell className="px-4 py-3">
                          <PriorityBadge priority={inc.priority} />
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono font-bold text-primary tnum">
                          {inc.code}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-medium text-foreground">
                          {EMERGENCY_LABELS[inc.type] ?? inc.type}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                          {inc.address}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="text-foreground font-medium">
                            {inc.citizenName || "Citizen"}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground tnum">
                            {inc.citizenPhone || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {driver ? (
                            <div className="leading-tight">
                              <span className="font-mono font-bold text-foreground">
                                {driver.callSign}
                              </span>
                              <div className="text-xs text-muted-foreground">{driver.name}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <StatusBadge status={inc.status} />
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground tnum">
                          {formatRelative(inc.reportedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="md:hidden space-y-3">
              {filteredIncidents.map((inc) => {
                const driver = inc.driverId ? driverMap.get(inc.driverId) : null;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 active:bg-elevated cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={inc.priority} />
                        <span className="font-mono text-xs font-bold text-primary tnum">
                          {inc.code}
                        </span>
                      </div>
                      <StatusBadge status={inc.status} />
                    </div>

                    <div className="text-sm font-semibold text-foreground">
                      {EMERGENCY_LABELS[inc.type] ?? inc.type}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-priority-p1 shrink-0" />
                      <span className="truncate">{inc.address}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                      {driver ? (
                        <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                          <Truck className="h-3.5 w-3.5 text-primary" />
                          <span className="font-bold text-foreground">{driver.callSign}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Unassigned</span>
                      )}

                      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground tnum">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelative(inc.reportedAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Accessible Radix Dialog for Incident Details */}
      <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        {selectedIncident && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={selectedIncident.priority} />
                <DialogTitle className="font-mono text-base font-bold text-foreground">
                  {selectedIncident.code}
                </DialogTitle>
                <StatusBadge status={selectedIncident.status} />
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                {EMERGENCY_LABELS[selectedIncident.type] ?? selectedIncident.type} · Reported{" "}
                {new Date(selectedIncident.reportedAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pickup Address:</span>
                  <span className="font-medium text-foreground text-right">
                    {selectedIncident.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <span className="font-mono tnum text-muted-foreground">
                    {Number(selectedIncident.location.lat).toFixed(4)}° N,{" "}
                    {Number(selectedIncident.location.lng).toFixed(4)}° E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SLA Window:</span>
                  <span className="font-mono tnum font-semibold text-primary">
                    {Math.round(selectedIncident.slaSeconds / 60)} minutes
                  </span>
                </div>
              </div>

              {/* Citizen Details */}
              <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
                <div className="font-semibold text-foreground text-xs">Caller Information</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Citizen Name:</span>
                  <span className="font-medium text-foreground">
                    {selectedIncident.citizenName || "Anonymous"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number:</span>
                  <span className="font-mono tnum text-foreground">
                    {selectedIncident.citizenPhone || "—"}
                  </span>
                </div>
              </div>

              {/* Scene Notes */}
              {selectedIncident.notes && (
                <div className="rounded-lg border border-border bg-surface p-3">
                  <span className="font-semibold text-foreground text-xs block mb-1">
                    Scene Notes:
                  </span>
                  <p className="text-muted-foreground italic leading-relaxed">
                    {selectedIncident.notes}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setSelectedIncident(null)}>
                Close Details
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
