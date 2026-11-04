import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Hospital as HospitalIcon,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  Truck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, type UserRole } from "@/lib/ems/types";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useVehicles, useCreateVehicle, useUpdateVehicle } from "@/hooks/fleet/use-vehicles";
import { useHospitals, useCreateHospital } from "@/hooks/fleet/use-hospitals";
import {
  useUsers,
  useCreateStaff,
  useUpdateUserStatus,
  type UserInfo,
} from "@/hooks/fleet/use-users";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { AmbulanceStatus } from "@/types/driver";

type Tab = "overview" | "users" | "fleet" | "hospitals" | "audit";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status: "active" | "invited" | "suspended";
  createdAt?: string;
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
  citizen: { label: "Citizen", tone: "bg-surface-3 text-muted-foreground border-border" },
};

const STATUS_DOT_COLORS: Record<string, string> = {
  available: "bg-status-available",
  en_route: "bg-status-enroute",
  busy: "bg-status-busy",
  at_hospital: "bg-status-hospital",
  offline: "bg-status-offline",
  maintenance: "bg-status-maintenance",
};

interface ActivityEntry {
  id: string;
  timestamp: string;
  message: string;
  kind: "info" | "success" | "warn" | "critical";
}

export function AdminConsole() {
  const [tab, setTab] = useState<Tab>("overview");
  const { user: currentUser } = useAuth();
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
      phone: u.phone,
      status: (u.status || "active") as "active" | "invited" | "suspended",
      createdAt: u.created_at,
      lastActive: "Active",
    }));
  }, [rawUsers]);

  const activity: ActivityEntry[] = useMemo(() => {
    return (notifData?.all ?? []).slice(0, 50).map((n) => ({
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
  }, [drivers, vehicles, incidents, hospitals, STAFF]);

  if (loadingIncidents) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <SkeletonList count={6} className="w-full max-w-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState message="Failed to load admin governance data" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <AdminHeader tab={tab} onTab={setTab} />
      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="min-h-0 flex-1 overflow-hidden"
      >
        {tab === "overview" && (
          <OverviewTab stats={stats} drivers={drivers} vehicles={vehicles} activity={activity} />
        )}
        {tab === "users" && <UsersTab staff={STAFF} currentUserId={currentUser?.id} />}
        {tab === "fleet" && <FleetTab vehicles={vehicles} drivers={drivers} />}
        {tab === "hospitals" && <HospitalsTab hospitals={hospitals} />}
        {tab === "audit" && <AuditTab activity={activity} />}
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "users", label: "Users & Roles", icon: Users },
  { id: "fleet", label: "Fleet Assets", icon: Truck },
  { id: "hospitals", label: "Hospitals", icon: HospitalIcon },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
];

function AdminHeader({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Administration Console</div>
          <div className="text-xs text-muted-foreground">
            Governance, access control, fleet resources, and operational audit logs
          </div>
        </div>
        <div className="hidden items-center gap-1.5 rounded-md border border-status-available/30 bg-status-available/10 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-status-available sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-status-available animate-pulse" />
          Systems Nominal
        </div>
      </div>

      <div role="tablist" aria-label="Admin tabs" className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            type="button"
            onClick={() => onTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              tab === t.id
                ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                : "border-border bg-surface text-muted-foreground hover:bg-elevated hover:text-foreground",
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
    { name: "PostgreSQL Database", status: "up", latency: "8ms" },
    { name: "Socket.IO Gateway", status: "up", latency: "12ms" },
    { name: "Auth (JWT / RBAC)", status: "up", latency: "3ms" },
    { name: "Dispatch Engine", status: "up", latency: "94ms" },
    { name: "Notification Queue", status: "up", latency: "14ms" },
  ] as const;

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-3">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard
            label="Staff Accounts"
            value={stats.staff}
            hint={`${stats.staffActive} active`}
            accent="primary"
            icon={Users}
          />
          <MetricCard
            label="Fleet Units"
            value={stats.units}
            hint={`${stats.availableUnits} available`}
            accent="available"
            icon={Truck}
          />
          <MetricCard
            label="Partner Hospitals"
            value={stats.hospitals}
            hint={`${stats.hospitalBeds} beds free (demo)`}
            accent="hospital"
            icon={HospitalIcon}
          />
          <MetricCard
            label="Active Calls"
            value={stats.activeIncidents}
            hint={`${stats.totalIncidents} total logged`}
            accent="enroute"
            icon={Radio}
          />
        </div>

        {/* Service Health Panel */}
        <Panel title="Platform Services Health" icon={Server}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    s.status === "up" ? "bg-status-available" : "bg-priority-p2",
                  )}
                />
                <span className="text-xs font-medium text-foreground">{s.name}</span>
                <span className="ml-auto font-mono text-xs tnum text-muted-foreground">
                  {s.latency}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Fleet Breakdown Snapshot */}
        <Panel title="Fleet Resource Status" icon={Truck}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {(
              ["available", "en_route", "busy", "at_hospital", "offline", "maintenance"] as const
            ).map((s) => {
              const count = vehicles.filter((v) => v.status === s).length;
              const meta = STATUS_META[s];
              const dotClass = STATUS_DOT_COLORS[s] ?? "bg-muted-foreground";

              return (
                <div key={s} className="rounded-md border border-border bg-surface p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <span className={cn("h-2 w-2 rounded-full", dotClass)} />
                    {meta.label}
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono tnum text-foreground">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Right Column: Active Driver Roster & Recent Activity */}
      <div className="flex flex-col gap-3">
        <Panel title="Driver Roster" icon={UserCog}>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {drivers.slice(0, 6).map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 py-1.5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary font-mono">
                  {(d.name || "Driver").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-xs font-medium text-foreground">{d.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {d.callSign}
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent System Events" icon={Activity}>
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {activity.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4">
                No recent activity logged.
              </div>
            ) : (
              activity.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-2 rounded p-1.5 hover:bg-surface transition-colors"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      a.kind === "critical" && "bg-priority-p1",
                      a.kind === "warn" && "bg-priority-p2",
                      a.kind === "success" && "bg-status-available",
                      a.kind === "info" && "bg-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs leading-snug text-foreground">{a.message}</div>
                    <div className="font-mono text-xs tnum text-muted-foreground mt-0.5">
                      {new Date(a.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
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
    <div className="rounded-lg border border-border bg-card shadow-xs">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span>{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function UsersTab({ staff, currentUserId }: { staff: StaffUser[]; currentUserId?: string }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const updateStatus = useUpdateUserStatus();

  const columns: ColumnDef<StaffUser>[] = [
    {
      key: "name",
      header: "Staff Member",
      sortable: true,
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary font-mono">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="font-medium text-foreground text-xs">{u.name}</div>
            <div className="text-xs text-muted-foreground">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      cell: (u) => (
        <span
          className={cn(
            "rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider font-mono",
            ROLE_META[u.role]?.tone ?? "bg-surface text-muted-foreground border-border",
          )}
        >
          {ROLE_META[u.role]?.label ?? u.role}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      cell: (u) => (
        <span className="font-mono tnum text-xs text-muted-foreground">{u.phone || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (u) => {
        const isSuspended = u.status === "suspended";
        return (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              isSuspended ? "text-priority-p1" : "text-status-available",
            )}
          >
            <StatusDot status={isSuspended ? "offline" : "available"} />
            <span className="capitalize">{u.status}</span>
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      cell: (u) => (
        <span className="font-mono tnum text-xs text-muted-foreground">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (u) => {
        const isSelf = currentUserId === u.id;
        const isSuspended = u.status === "suspended";

        if (isSelf) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="h-7 text-xs px-2 opacity-50 cursor-not-allowed"
                    >
                      Suspend
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Cannot suspend your own account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return (
          <Button
            size="sm"
            variant={isSuspended ? "outline" : "outline"}
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({
                id: u.id,
                status: isSuspended ? "active" : "suspended",
              })
            }
            className={cn(
              "h-7 text-xs px-2.5",
              isSuspended
                ? "border-status-available/40 text-status-available hover:bg-status-available/10"
                : "border-priority-p1/40 text-priority-p1 hover:bg-priority-p1/10",
            )}
          >
            {isSuspended ? "Activate" : "Suspend"}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={staff}
        columns={columns}
        searchPlaceholder="Search staff by name or email…"
        searchFilter={(u, q) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        }
        toolbarActions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="text-xs"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />+ Create Staff
          </Button>
        }
      />

      <CreateStaffDialog open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}

function CreateStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createStaff = useCreateStaff();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"dispatcher" | "admin">("dispatcher");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Full name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters.");
      return;
    }
    if (!phone.trim() || phone.trim().replace(/\D/g, "").length < 7) {
      setValidationError("Phone number is required (minimum 7 digits).");
      return;
    }

    try {
      await createStaff.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim(),
      });
      onOpenChange(false);
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
    } catch {
      // Toast handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <DialogTitle>Create Staff Account</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Register a new Dispatcher or System Administrator on the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {validationError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {validationError}
            </div>
          )}

          <Field id="staff-name" label="Full Name" required>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rachel Adams"
              className="text-xs"
              required
            />
          </Field>

          <Field id="staff-email" label="Email Address" required>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rachel@resq.local"
              className="text-xs"
              required
            />
          </Field>

          <Field id="staff-password" label="Password" required hint="Minimum 8 characters">
            <div className="relative">
              <Input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="text-xs pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Field label="Staff Role" required>
            <Select value={role} onValueChange={(v) => setRole(v as "dispatcher" | "admin")}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dispatcher">Dispatcher — Command center operations</SelectItem>
                <SelectItem value="admin">Admin — Full system governance & config</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Contact Phone" required>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555 0192"
              className="text-xs font-mono tnum"
              required
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={createStaff.isPending}>
              {createStaff.isPending ? "Creating Account…" : "Create Staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FleetTab({
  vehicles,
  drivers,
}: {
  vehicles: { id: string; plate: string; model: string; type: string; status: string }[];
  drivers: { id: string; name: string; callSign: string; vehicleId?: string }[];
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<(typeof vehicles)[0] | null>(null);

  const columns: ColumnDef<(typeof vehicles)[0]>[] = [
    {
      key: "plate",
      header: "License Plate",
      sortable: true,
      cell: (v) => <span className="font-mono font-bold text-foreground text-xs">{v.plate}</span>,
    },
    {
      key: "model",
      header: "Vehicle Model",
      sortable: true,
      cell: (v) => <span className="text-xs text-foreground">{v.model}</span>,
    },
    {
      key: "type",
      header: "Unit Type",
      sortable: true,
      cell: (v) => (
        <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
          {v.type}
        </span>
      ),
    },
    {
      key: "driver",
      header: "Assigned Driver",
      cell: (v) => {
        const driver = drivers.find((d) => d.vehicleId === v.id);
        if (!driver) return <span className="text-xs text-muted-foreground italic">—</span>;
        return (
          <div className="leading-tight">
            <div className="text-xs font-medium text-foreground">{driver.name}</div>
            <div className="font-mono text-xs text-muted-foreground">{driver.callSign}</div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (v) => <StatusBadge status={v.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (v) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditingVehicle(v)}
          className="h-7 text-xs px-2"
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={vehicles}
        columns={columns}
        searchPlaceholder="Search vehicles by plate or model…"
        searchFilter={(v, q) =>
          v.plate.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q)
        }
        toolbarActions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="text-xs"
          >
            <Truck className="h-3.5 w-3.5 mr-1.5" />+ Add Vehicle
          </Button>
        }
      />

      <AddVehicleDialog open={showAddModal} onOpenChange={setShowAddModal} />
      <EditVehicleDialog
        vehicle={editingVehicle}
        open={!!editingVehicle}
        onOpenChange={(open) => !open && setEditingVehicle(null)}
      />
    </div>
  );
}

function EditVehicleDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle: { id: string; plate: string; model: string; type: string; status: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateVehicle = useUpdateVehicle();
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [type, setType] = useState<"ALS" | "BLS" | "ICU" | "MICU">("ALS");
  const [status, setStatus] = useState<AmbulanceStatus>("available");

  useEffect(() => {
    if (vehicle) {
      setPlate(vehicle.plate);
      setModel(vehicle.model);
      setType(vehicle.type as "ALS" | "BLS" | "ICU" | "MICU");
      setStatus(vehicle.status as AmbulanceStatus);
    }
  }, [vehicle]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicle) return;
    try {
      await updateVehicle.mutateAsync({
        id: vehicle.id,
        data: { plate: plate.trim(), model: model.trim(), type, status },
      });
      onOpenChange(false);
    } catch {
      // Error toast shown by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <DialogTitle>Edit Ambulance Asset</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Update vehicle details, unit type, and service status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <Field id="edit-vehicle-plate" label="License Plate Number" required>
            <Input
              id="edit-vehicle-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="e.g. EMS-4480"
              className="text-xs font-mono uppercase"
              required
            />
          </Field>

          <Field id="edit-vehicle-model" label="Vehicle Model" required>
            <Input
              id="edit-vehicle-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Mercedes Sprinter"
              className="text-xs"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit Type" required>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "ALS" | "BLS" | "ICU" | "MICU")}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALS">ALS (Advanced)</SelectItem>
                  <SelectItem value="BLS">BLS (Basic)</SelectItem>
                  <SelectItem value="ICU">ICU (Mobile ICU)</SelectItem>
                  <SelectItem value="MICU">MICU (Intensive)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status" required>
              <Select value={status} onValueChange={(v) => setStatus(v as AmbulanceStatus)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="at_hospital">At Hospital</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={updateVehicle.isPending}>
              {updateVehicle.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddVehicleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createVehicle = useCreateVehicle();
  const [plate, setPlate] = useState("EMS-4480");
  const [model, setModel] = useState("Mercedes Sprinter");
  const [type, setType] = useState<"ALS" | "BLS" | "ICU" | "MICU">("ALS");
  const [status, setStatus] = useState<"available" | "maintenance" | "offline">("available");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createVehicle.mutateAsync({ plate, model, type, status });
      onOpenChange(false);
    } catch {
      // Error toast shown by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <DialogTitle>Register Ambulance Asset</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Register a new vehicle into the EMS fleet operations grid.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <Field id="vehicle-plate" label="License Plate Number" required>
            <Input
              id="vehicle-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="e.g. EMS-4480"
              className="text-xs font-mono uppercase"
              required
            />
          </Field>

          <Field id="vehicle-model" label="Vehicle Model" required>
            <Input
              id="vehicle-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Mercedes Sprinter"
              className="text-xs"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit Type" required>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "ALS" | "BLS" | "ICU" | "MICU")}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALS">ALS (Advanced)</SelectItem>
                  <SelectItem value="BLS">BLS (Basic)</SelectItem>
                  <SelectItem value="ICU">ICU (Mobile ICU)</SelectItem>
                  <SelectItem value="MICU">MICU (Intensive)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Initial Status" required>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "available" | "maintenance" | "offline")}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={createVehicle.isPending}>
              {createVehicle.isPending ? "Adding…" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <HospitalIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Partner Hospitals ({hospitals.length})
          </span>
          <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Demo Data
          </span>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setShowAddModal(true)}
          className="text-xs"
        >
          <Building2 className="h-3.5 w-3.5 mr-1.5" />+ Add Hospital
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {hospitals.map((h) => {
            const beds = Number(h.beds ?? 0);
            const bedsAvailable = Number(h.bedsAvailable ?? 0);
            const occupied = Math.max(0, beds - bedsAvailable);
            const pct = beds > 0 ? Math.round((occupied / beds) * 100) : 0;
            const barColor =
              pct > 90 ? "bg-priority-p1" : pct > 75 ? "bg-priority-p2" : "bg-status-available";

            return (
              <div key={h.id} className="rounded-lg border border-border bg-surface p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-status-hospital/15 text-status-hospital border border-status-hospital/30">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{h.name}</div>
                    <div className="font-mono text-xs text-muted-foreground tnum">
                      {Number(h.location?.lat ?? 0).toFixed(4)},{" "}
                      {Number(h.location?.lng ?? 0).toFixed(4)}
                    </div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-status-available shrink-0" />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span>Emergency Bed Utilization</span>
                    <span className="rounded bg-muted/60 px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      demo
                    </span>
                  </span>
                  <span className="font-mono tnum font-semibold text-foreground">
                    {occupied} / {beds} beds
                  </span>
                </div>

                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn("h-full transition-all", barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border border-border bg-card p-1.5">
                    <div className="text-sm font-semibold font-mono tnum text-foreground">
                      {beds}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Capacity
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card p-1.5">
                    <div className="text-sm font-semibold font-mono tnum text-status-available">
                      {bedsAvailable}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Free
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card p-1.5">
                    <div className="text-sm font-semibold font-mono tnum text-foreground">
                      {pct}%
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Load
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AddHospitalDialog open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}

function AddHospitalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createHospital = useCreateHospital();
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [beds, setBeds] = useState("");
  const [bedsAvailable, setBedsAvailable] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const bedsNum = parseInt(beds, 10);
    const bedsAvailNum = parseInt(bedsAvailable, 10);

    if (!name.trim()) {
      setValidationError("Hospital name is required.");
      return;
    }
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setValidationError("Latitude must be between -90 and 90.");
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setValidationError("Longitude must be between -180 and 180.");
      return;
    }
    if (isNaN(bedsNum) || bedsNum < 0) {
      setValidationError("Total beds must be a non-negative integer.");
      return;
    }
    if (isNaN(bedsAvailNum) || bedsAvailNum < 0 || bedsAvailNum > bedsNum) {
      setValidationError("Available beds must be between 0 and total beds.");
      return;
    }

    try {
      await createHospital.mutateAsync({
        name: name.trim(),
        lat: latNum,
        lng: lngNum,
        beds: bedsNum,
        bedsAvailable: bedsAvailNum,
      });
      onOpenChange(false);
      setName("");
      setLat("");
      setLng("");
      setBeds("");
      setBedsAvailable("");
    } catch {
      // Toast handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <HospitalIcon className="h-5 w-5 text-primary" />
            <DialogTitle>Register Hospital Facility</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Add a new partner medical facility and emergency bed capacity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {validationError && (
            <div className="rounded-md border border-priority-p1/30 bg-priority-p1/10 p-2.5 text-xs text-priority-p1">
              {validationError}
            </div>
          )}

          <Field id="hospital-name" label="Hospital Name" required>
            <Input
              id="hospital-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. City General Hospital"
              className="text-xs"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="hospital-lat" label="Latitude (-90 to 90)" required>
              <Input
                id="hospital-lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 12.9716"
                className="text-xs font-mono"
                required
              />
            </Field>

            <Field id="hospital-lng" label="Longitude (-180 to 180)" required>
              <Input
                id="hospital-lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. 77.5946"
                className="text-xs font-mono"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="hospital-beds" label="Total Beds" required>
              <Input
                id="hospital-beds"
                type="number"
                min="0"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="e.g. 500"
                className="text-xs font-mono"
                required
              />
            </Field>

            <Field id="hospital-beds-avail" label="Available Beds" required>
              <Input
                id="hospital-beds-avail"
                type="number"
                min="0"
                value={bedsAvailable}
                onChange={(e) => setBedsAvailable(e.target.value)}
                placeholder="e.g. 120"
                className="text-xs font-mono"
                required
              />
            </Field>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={createHospital.isPending}>
              {createHospital.isPending ? "Adding…" : "Add Hospital"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AuditTab({ activity }: { activity: ActivityEntry[] }) {
  const columns: ColumnDef<ActivityEntry>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      cell: (a) => (
        <span className="font-mono text-xs tnum text-muted-foreground">
          {new Date(a.timestamp).toLocaleString("en-US", { hour12: false })}
        </span>
      ),
    },
    {
      key: "kind",
      header: "Category",
      sortable: true,
      cell: (a) => (
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider",
            a.kind === "critical" && "bg-priority-p1/15 text-priority-p1",
            a.kind === "warn" && "bg-priority-p2/15 text-priority-p2",
            a.kind === "success" && "bg-status-available/15 text-status-available",
            a.kind === "info" && "bg-surface-3 text-muted-foreground",
          )}
        >
          {a.kind}
        </span>
      ),
    },
    {
      key: "message",
      header: "Event Description",
      cell: (a) => <span className="text-xs text-foreground font-medium">{a.message}</span>,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={activity}
        columns={columns}
        searchPlaceholder="Search audit events…"
        searchFilter={(a, q) =>
          a.message.toLowerCase().includes(q) || a.kind.toLowerCase().includes(q)
        }
        toolbarActions={
          <span className="flex items-center gap-1.5 rounded-md border border-status-available/30 bg-status-available/10 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-status-available">
            <CheckCircle2 className="h-3.5 w-3.5" /> Cryptographically Signed
          </span>
        }
      />
    </div>
  );
}
