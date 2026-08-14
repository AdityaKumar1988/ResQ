import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Radio,
  Search,
  Shield,
  Siren,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NotificationCenter } from "@/components/ems/NotificationCenter";
import { useAuth } from "@/lib/auth-context";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useNotifications } from "@/hooks/notifications/use-notifications";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: ("dispatcher" | "citizen" | "driver" | "admin")[];
  badge?: (count: { active: number; available: number }) => string | number | null;
}

const NAV: NavItem[] = [
  { to: "/dispatch", label: "Command Center", icon: LayoutDashboard, allowedRoles: ["dispatcher", "admin"], badge: (c) => c.active || null },
  { to: "/incidents", label: "Incidents", icon: Siren, allowedRoles: ["dispatcher", "admin"] },
  { to: "/fleet", label: "Fleet", icon: Truck, allowedRoles: ["dispatcher", "admin"], badge: (c) => `${c.available}` },
  { to: "/analytics", label: "Analytics", icon: BarChart3, allowedRoles: ["dispatcher", "admin"] },
  { to: "/citizen", label: "Citizen Portal", icon: LifeBuoy, allowedRoles: ["citizen", "admin"] },
  { to: "/driver", label: "Driver App", icon: Radio, allowedRoles: ["driver", "admin"] },
  { to: "/admin", label: "Admin", icon: Shield, allowedRoles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: notifData } = useNotifications();
  const { user, logout, can } = useAuth();
  const [now, setNow] = useState<Date | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeIncidents = incidents.filter((i) => i.status !== "completed" && i.status !== "cancelled");
  const availableUnits = drivers.filter((d) => d.status === "available").length;
  const enrouteUnits = drivers.filter((d) => d.status === "en_route").length;
  const unreadCount = notifData?.unreadCount ?? 0;

  const opsNav = NAV.slice(0, 4).filter((item) => can(item.allowedRoles));
  const roleNav = NAV.slice(4).filter((item) => can(item.allowedRoles));

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Siren className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Smart EMS</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Ops Console
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          {opsNav.length > 0 && (
            <NavGroup label="Operations">
              {opsNav.map((item) => (
                <NavLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  badge={item.badge?.({ active: activeIncidents.length, available: availableUnits })}
                />
              ))}
            </NavGroup>
          )}
          {roleNav.length > 0 && (
            <NavGroup label="Roles">
              {roleNav.map((item) => (
                <NavLink key={item.to} item={item} pathname={pathname} />
              ))}
            </NavGroup>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md bg-sidebar-accent p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="text-sm font-bold uppercase">{user?.name?.[0] ?? "?"}</span>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-medium">{user?.name ?? "Unknown"}</div>
              <div className="truncate text-[10px] text-muted-foreground capitalize">{user?.role ?? "—"}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top status bar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface/70 px-4 backdrop-blur">
          <div className="flex items-center gap-2 md:hidden">
            <Siren className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Smart EMS</span>
          </div>

          <div className="hidden flex-1 items-center gap-1 md:flex">
            <StatChip label="Active" value={activeIncidents.length} accent="primary" />
            <StatChip label="En route" value={enrouteUnits} accent="enroute" />
            <StatChip label="Available" value={availableUnits} accent="available" />
          </div>

          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground lg:flex">
            <Search className="h-3.5 w-3.5" />
            <span>Search incidents, drivers, vehicles…</span>
            <kbd className="ml-auto rounded border border-border bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-status-available" />
              </span>
              LIVE · <span suppressHydrationWarning>{now ? now.toLocaleTimeString("en-US", { hour12: false }) : "--:--:--"}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 hover:bg-accent"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  badge,
}: {
  item: NavItem;
  pathname: string;
  badge?: string | number | null;
}) {
  const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="truncate">{item.label}</span>
      {badge != null && badge !== "" && (
        <span
          className={cn(
            "ml-auto rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold",
            active
              ? "bg-primary/20 text-primary"
              : "bg-surface-3 text-muted-foreground group-hover:text-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "primary" | "enroute" | "available" | "success";
}) {
  const dot =
    accent === "primary"
      ? "bg-primary"
      : accent === "enroute"
        ? "bg-status-enroute"
        : accent === "available"
          ? "bg-status-available"
          : "bg-status-available";
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/60 px-2.5 py-1.5">
      <Activity className="h-3 w-3 text-muted-foreground" />
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
    </div>
  );
}
