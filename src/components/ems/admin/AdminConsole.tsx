import { useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  Hospital as HospitalIcon,
  Radio,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, type UserRole } from "@/lib/ems/types";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useVehicles } from "@/hooks/fleet/use-vehicles";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { useUsers, type UserInfo } from "@/hooks/fleet/use-users";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { AmbulanceStatus } from "@/types/driver";

type Tab = "overview" | "users" | "fleet" | "hospitals" | "audit";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "suspended";
  lastActive: string;
}



const ROLE_META: Record<UserRole, { label: string; tone: string }> = {
  admin: { label: "Admin", tone: "bg-primary/15 text-primary border-primary/30" },
  dispatcher: {
    label: "Dispatcher",
    tone: "bg-status-enroute/15 text-status-enroute border-status-enroute/30",
  },
  driver: {
    label: "Driver",
    tone: "bg-status-available/15 text-status-available border-status-available/30",
  },
  citizen: { label: "Citizen", tone: "bg-muted text-muted-foreground border-border" },
};

const STATUS_TONE: Record<StaffUser["status"], string> = {
  active: "bg-status-available/15 text-status-available",
  invited: "bg-status-enroute/15 text-status-enroute",
  suspended: "bg-destructive/15 text-destructive",
};

interface ActivityEntry {
  id: string;
  timestamp: string;
  message: string;
  kind: "info" | "success" | "warn" | "critical";
}

export function AdminConsole() {
  const [tab, setTab] = useState<Tab>("overview");
  const { data: rawUsers = [] } = useUsers();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: incidents = [], isLoading: loadingIncidents, isError, refetch } = useIncidents();
  const { data: hospitals = [] } = useHospitals();
  const { data: notifData } = useNotifications();

  const STAFF: StaffUser[] = useMemo(() => {
    return rawUsers.map((u: UserInfo) => ({
      id: u.id,
      name: u.name || "Unknown User",
      email: u.email,
      role: u.role,
      status: "active", // hardcoded until API supports status
      lastActive: "just now", // hardcoded until API supports last active
    }));
  }, [rawUsers]);

  // Build activity from notifications (replaces selectActivity from store)
  const activity: ActivityEntry[] = useMemo(() => {
    return (notifData?.all ?? []).slice(0, 30).map((n) => ({
      id: n.id,
      kind:
        n.kind === "incident_created"
          ? "critical"
          : n.kind === "incident_assigned"
            ? "info"
            : n.kind === "incident_completed"
              ? "success"
              : ("info" as ActivityEntry["kind"]),
      message: n.title + (n.body ? ` — ${n.body}` : ""),
      timestamp: n.createdAt,
    }));
  }, [notifData]);

  const stats = useMemo(() => {
    const activeIncidents = incidents.filter(
      (i) => i.status !== "completed" && i.status !== "cancelled",
    ).length;
    const availableUnits = drivers.filter((d) => d.status === "available").length;
    const maintenance = vehicles.filter((v) => v.status === "maintenance").length;
    return {
      staff: STAFF.length,
      staffActive: STAFF.filter((s) => s.status === "active").length,
      units: vehicles.length,
      availableUnits,
      maintenance,
      hospitals: hospitals.length,
      hospitalBeds: hospitals.reduce((a, h) => a + h.bedsAvailable, 0),
      activeIncidents,
      totalIncidents: incidents.length,
    };
  }, [drivers, vehicles, incidents, hospitals]);

  if (loadingIncidents) {
    return (
      <div className="flex h-full items-center justify-center">
        <SkeletonList count={6} className="w-full max-w-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState message="Failed to load admin data" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <AdminHeader tab={tab} onTab={setTab} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "overview" && (
          <OverviewTab stats={stats} drivers={drivers} vehicles={vehicles} activity={activity} />
        )}
        {tab === "users" && <UsersTab staff={STAFF} />}
        {tab === "fleet" && <FleetTab vehicles={vehicles} drivers={drivers} />}
        {tab === "hospitals" && <HospitalsTab hospitals={hospitals} />}
        {tab === "audit" && <AuditTab activity={activity} />}
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users & roles", icon: Users },
  { id: "fleet", label: "Fleet", icon: Truck },
  { id: "hospitals", label: "Hospitals", icon: HospitalIcon },
  { id: "audit", label: "Audit log", icon: ClipboardList },
];

function AdminHeader({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 panel">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/70 to-primary text-primary-foreground shadow-glow">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Administration Console</div>
          <div className="text-[11px] text-muted-foreground">
            Governance, access control and operational integrity
          </div>
        </div>
        <div className="hidden items-center gap-1.5 rounded-md border border-status-available/30 bg-status-available/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-status-available sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-status-available animate-pulse" />
          Systems nominal
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-surface-2 text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({
  stats,
  drivers,
  vehicles,
  activity,
}: {
  stats: {
    staff: number;
    staffActive: number;
    units: number;
    availableUnits: number;
    maintenance: number;
    hospitals: number;
    hospitalBeds: number;
    activeIncidents: number;
    totalIncidents: number;
  };
  drivers: { id: string; name: string; callSign: string; status: string }[];
  vehicles: { id: string; status: string }[];
  activity: ActivityEntry[];
}) {
  const services = [
    { name: "API Gateway", status: "up", latency: "42ms" },
    { name: "PostgreSQL", status: "up", latency: "8ms" },
    { name: "Socket.IO", status: "up", latency: "12ms" },
    { name: "Auth (JWT)", status: "up", latency: "3ms" },
    { name: "Dispatch Engine", status: "up", latency: "94ms" },
    { name: "Notifications", status: "degraded", latency: "310ms" },
  ] as const;

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Staff"
            value={stats.staff}
            sub={`${stats.staffActive} active`}
            tone="primary"
          />
          <KpiCard
            icon={Truck}
            label="Fleet"
            value={stats.units}
            sub={`${stats.availableUnits} available`}
            tone="available"
          />
          <KpiCard
            icon={HospitalIcon}
            label="Hospitals"
            value={stats.hospitals}
            sub={`${stats.hospitalBeds} beds free`}
            tone="hospital"
          />
          <KpiCard
            icon={Radio}
            label="Incidents"
            value={stats.activeIncidents}
            sub={`${stats.totalIncidents} total`}
            tone="enroute"
          />
        </div>

        <Panel title="Service health" icon={Server}>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5"
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    s.status === "up" ? "bg-status-available" : "bg-status-enroute",
                  )}
                />
                <span className="text-xs font-medium">{s.name}</span>
                <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
                  {s.latency}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Fleet snapshot" icon={Truck}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(
              ["available", "en_route", "busy", "at_hospital", "offline", "maintenance"] as const
            ).map((s) => {
              const count = vehicles.filter((v) => v.status === s).length;
              const meta = STATUS_META[s];
              return (
                <div key={s} className="rounded-md border border-border bg-surface-2 p-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${meta.token}`)} />
                    {meta.label}
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{count}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-3">
        <Panel title="Active roster" icon={UserCog}>
          <div className="space-y-1">
            {drivers.slice(0, 6).map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-1.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                  {(d.name ?? "Unknown")
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-xs font-medium">{d.name ?? "Unknown Driver"}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {d.callSign}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                    `bg-${STATUS_META[d.status as AmbulanceStatus].token}/15 text-${STATUS_META[d.status as AmbulanceStatus].token}`,
                  )}
                >
                  {STATUS_META[d.status as AmbulanceStatus].label}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent activity" icon={Activity}>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {activity.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                No recent activity
              </div>
            )}
            {activity.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-start gap-2 rounded px-1 py-1">
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    a.kind === "critical" && "bg-destructive",
                    a.kind === "warn" && "bg-status-enroute",
                    a.kind === "success" && "bg-status-available",
                    a.kind === "info" && "bg-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] leading-snug">{a.message}</div>
                  <div className="font-mono text-[9px] text-muted-foreground">
                    {new Date(a.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub: string;
  tone: "primary" | "available" | "enroute" | "hospital";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "available"
        ? "text-status-available"
        : tone === "enroute"
          ? "text-status-enroute"
          : "text-status-hospital";
  return (
    <div className="rounded-lg border border-border bg-surface p-3 panel">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", toneClass)} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function UsersTab({ staff }: { staff: StaffUser[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const filtered = useMemo(
    () =>
      staff.filter(
        (u) =>
          (role === "all" || u.role === role) &&
          (query === "" ||
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, role, staff],
  );
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            className="w-40 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "admin", "dispatcher", "driver"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider",
                role === r
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface-2 text-muted-foreground hover:bg-accent",
              )}
            >
              {r === "all" ? "All roles" : ROLE_META[r].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90"
        >
          + Invite user
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Last active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-surface-2/60">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                      {u.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="leading-tight">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-[10px] text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      ROLE_META[u.role].tone,
                    )}
                  >
                    {ROLE_META[u.role].label}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      STATUS_TONE[u.status],
                    )}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                  {u.lastActive}
                </td>
                <td className="px-3 py-2 text-right">
                  <button className="rounded border border-border bg-surface-2 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FleetTab({
  vehicles,
  drivers,
}: {
  vehicles: { id: string; plate: string; model: string; type: string; status: string }[];
  drivers: { id: string; name: string; callSign: string; vehicleId?: string }[];
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Vehicles ({vehicles.length})
        </span>
        <button className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90">
          + Add vehicle
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Plate</th>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Assigned driver</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const driver = drivers.find((d) => d.vehicleId === v.id);
              const meta = STATUS_META[v.status as keyof typeof STATUS_META];
              return (
                <tr key={v.id} className="border-t border-border hover:bg-surface-2/60">
                  <td className="px-3 py-2 font-mono">{v.plate}</td>
                  <td className="px-3 py-2">{v.model}</td>
                  <td className="px-3 py-2">
                    <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                      {v.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {driver ? (
                      <div className="leading-tight">
                        <div className="text-xs">{driver.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {driver.callSign}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {meta && (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                          `bg-${meta.token}/15 text-${meta.token}`,
                        )}
                      >
                        {meta.label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button className="rounded border border-border bg-surface-2 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HospitalsTab({
  hospitals,
}: {
  hospitals: {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    beds: number;
    bedsAvailable: number;
  }[];
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <HospitalIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Partner hospitals ({hospitals.length})
        </span>
        <button className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90">
          + Add hospital
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {hospitals.map((h) => {
            const util = h.beds > 0 ? 1 - h.bedsAvailable / h.beds : 0;
            const pct = Math.round(util * 100);
            const tone =
              pct > 90 ? "destructive" : pct > 75 ? "status-enroute" : "status-available";
            return (
              <div key={h.id} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-hospital/15 text-status-hospital">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{h.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {h.location.lat.toFixed(4)}, {h.location.lng.toFixed(4)}
                    </div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-status-available" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Bed utilization</span>
                  <span className="font-mono tabular-nums">
                    {h.beds - h.bedsAvailable} / {h.beds}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn("h-full transition-all", `bg-${tone}`)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                  <MiniField label="Capacity" value={String(h.beds)} />
                  <MiniField label="Available" value={String(h.bedsAvailable)} />
                  <MiniField label="Load" value={`${pct}%`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-1 py-1.5">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function AuditTab({ activity }: { activity: ActivityEntry[] }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audit log ({activity.length})
        </span>
        <span className="ml-auto flex items-center gap-1 rounded-md border border-status-available/30 bg-status-available/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-status-available">
          <CheckCircle2 className="h-3 w-3" /> Signed
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Kind</th>
              <th className="px-3 py-2 font-medium">Event</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-surface-2/60">
                <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                  {new Date(a.timestamp).toLocaleString("en-US", { hour12: false })}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      a.kind === "critical" && "bg-destructive/15 text-destructive",
                      a.kind === "warn" && "bg-status-enroute/15 text-status-enroute",
                      a.kind === "success" && "bg-status-available/15 text-status-available",
                      a.kind === "info" && "bg-surface-3 text-muted-foreground",
                    )}
                  >
                    {a.kind}
                  </span>
                </td>
                <td className="px-3 py-2">{a.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
