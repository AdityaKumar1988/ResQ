import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Radio,
  Shield,
  Siren,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NotificationCenter } from "@/components/ems/NotificationCenter";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useAuth } from "@/lib/auth-context";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useNotifications } from "@/hooks/notifications/use-notifications";

interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: ("dispatcher" | "citizen" | "driver" | "admin")[];
  badge?: (count: { active: number; available: number }) => string | number | null;
}

const NAV: NavItem[] = [
  {
    to: "/dispatch",
    label: "Command Center",
    shortLabel: "Command",
    icon: LayoutDashboard,
    allowedRoles: ["dispatcher"],
    badge: (c) => c.active || null,
  },
  {
    to: "/incidents",
    label: "Incidents",
    shortLabel: "Incidents",
    icon: Siren,
    allowedRoles: ["dispatcher", "admin"],
  },
  {
    to: "/fleet",
    label: "Fleet Management",
    shortLabel: "Fleet",
    icon: Truck,
    allowedRoles: ["dispatcher", "admin"],
    badge: (c) => `${c.available}`,
  },
  {
    to: "/analytics",
    label: "Analytics",
    shortLabel: "Analytics",
    icon: BarChart3,
    allowedRoles: ["dispatcher", "admin"],
  },
  {
    to: "/citizen",
    label: "Citizen Portal",
    shortLabel: "Citizen",
    icon: LifeBuoy,
    allowedRoles: ["citizen"],
  },
  {
    to: "/driver",
    label: "Driver Console",
    shortLabel: "Driver",
    icon: Radio,
    allowedRoles: ["driver"],
  },
  {
    to: "/admin",
    label: "Admin Console",
    shortLabel: "Admin",
    icon: Shield,
    allowedRoles: ["admin"],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  "/dispatch": "Command Center",
  "/incidents": "Incident Registry",
  "/fleet": "Fleet Management",
  "/analytics": "Operational Analytics",
  "/citizen": "Citizen Emergency Portal",
  "/driver": "Driver Mission Console",
  "/admin": "Admin Console",
};

export function AppShell({
  children,
  headerActions,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: notifData } = useNotifications();
  const { user, logout, can } = useAuth();
  const [now, setNow] = useState<Date | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeIncidents = incidents.filter(
    (i) => i.status !== "completed" && i.status !== "cancelled",
  );
  const availableUnits = drivers.filter((d) => d.status === "available").length;
  const enrouteUnits = drivers.filter((d) => d.status === "en_route").length;
  const unreadCount = notifData?.unreadCount ?? 0;

  // Role filtered navigation items
  const opsNav = NAV.slice(0, 4).filter((item) => can(item.allowedRoles));
  const roleNav = NAV.slice(4).filter((item) => can(item.allowedRoles));
  const allAllowedNav = NAV.filter((item) => can(item.allowedRoles));
  const bottomNavItems = allAllowedNav.slice(0, 5);

  const currentTitle = ROUTE_TITLES[pathname] ?? "Operations Console";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Collapsible Sidebar (>= 768px) */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:flex",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
        aria-label="Primary Navigation"
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md",
              sidebarCollapsed && "justify-center w-full",
            )}
            title="ResQ Emergency Operations Platform"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 border border-border text-primary">
              <Siren className="h-4 w-4" strokeWidth={2.2} />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-bold tracking-tight text-foreground">ResQ</span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
                  Ops Console
                </span>
              </div>
            )}
          </Link>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Trigger Button */}
        {sidebarCollapsed && (
          <div className="flex justify-center border-b border-sidebar-border/60 py-2">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 space-y-6 overflow-y-auto p-2.5">
          {opsNav.length > 0 && (
            <NavGroup label={sidebarCollapsed ? "" : "Operations"}>
              {opsNav.map((item) => (
                <DesktopNavLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  collapsed={sidebarCollapsed}
                  badge={item.badge?.({
                    active: activeIncidents.length,
                    available: availableUnits,
                  })}
                />
              ))}
            </NavGroup>
          )}
          {roleNav.length > 0 && (
            <NavGroup label={sidebarCollapsed ? "" : "Portals"}>
              {roleNav.map((item) => (
                <DesktopNavLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </NavGroup>
          )}
        </nav>

        {/* User Card with Sign-out */}
        <div className="border-t border-sidebar-border p-2">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-foreground border border-border"
                title={`${user?.name ?? "User"} (${user?.role ?? "Responder"})`}
              >
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-md p-2 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-surface-2/60 p-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-foreground border border-border">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-semibold text-foreground">
                  {user?.name ?? "Unknown"}
                </div>
                <div className="truncate text-[11px] uppercase font-mono tracking-wider text-muted-foreground">
                  {user?.role ?? "responder"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="relative z-[100] flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/90 px-3 sm:px-4 backdrop-blur-md">
          {/* Left: Mobile hamburger & Page Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-foreground hover:bg-surface-3 md:hidden transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="font-heading font-semibold text-sm sm:text-base tracking-tight text-foreground truncate">
                {currentTitle}
              </span>
            </div>
          </div>

          {/* Center: Unified Compact Live-Status Group (Single telemetry pill) */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface-2/90 px-3.5 py-1 text-xs font-mono tnum text-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-status-available shrink-0" />
              <span>
                <strong className="text-foreground">{activeIncidents.length}</strong> active
              </span>
              <span className="text-border-strong select-none">/</span>
              <span>
                <strong className="text-foreground">{enrouteUnits}</strong> en route
              </span>
              <span className="text-border-strong select-none">/</span>
              <span>
                <strong className="text-foreground">{availableUnits}</strong> ready
              </span>
            </div>
          </div>

          {/* Right: Clock, NotificationCenter, ThemeToggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Clock */}
            <div
              className="hidden sm:flex items-center text-xs font-mono tnum text-muted-foreground px-2 py-1 rounded bg-surface-2/60 border border-border/50"
              title="UTC Dispatch Wall Clock"
            >
              <span suppressHydrationWarning>
                {now ? now.toLocaleTimeString("en-US", { hour12: false }) : "--:--:--"}
              </span>
            </div>

            {/* Optional Header Actions */}
            {headerActions}

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label={`Notifications (${unreadCount} unread)`}
                className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-foreground hover:bg-surface-3 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-mono font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle size="sm" />
          </div>
        </header>

        {/* Content area with bottom padding on mobile for bottom navigation */}
        <main className="min-h-0 flex-1 overflow-hidden pb-16 md:pb-0">{children}</main>
      </div>

      {/* Mobile Drawer (Below 768px Hamburger) */}
      <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent className="p-4 max-h-[85vh]">
          <DrawerHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 border border-border text-primary">
                <Siren className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-base font-bold">ResQ Navigation</DrawerTitle>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close navigation"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2"
            >
              <X className="h-4 w-4" />
            </button>
          </DrawerHeader>

          {/* Drawer Navigation List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {opsNav.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground px-1">
                  Operations
                </div>
                <div className="space-y-1">
                  {opsNav.map((item) => (
                    <MobileDrawerLink
                      key={item.to}
                      item={item}
                      pathname={pathname}
                      onClick={() => setMobileDrawerOpen(false)}
                      badge={item.badge?.({
                        active: activeIncidents.length,
                        available: availableUnits,
                      })}
                    />
                  ))}
                </div>
              </div>
            )}

            {roleNav.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground px-1">
                  Portals & Roles
                </div>
                <div className="space-y-1">
                  {roleNav.map((item) => (
                    <MobileDrawerLink
                      key={item.to}
                      item={item}
                      pathname={pathname}
                      onClick={() => setMobileDrawerOpen(false)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Drawer Footer User Card */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-foreground border border-border">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-semibold text-foreground">
                  {user?.name ?? "User"}
                </div>
                <div className="truncate text-[11px] uppercase font-mono text-muted-foreground">
                  {user?.role ?? "responder"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/15 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile Fixed Bottom Navigation Bar (< 768px, at most 5 items) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-[100] flex h-14 items-center justify-around border-t border-border bg-surface/95 px-1 backdrop-blur-md md:hidden"
      >
        {bottomNavItems.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-center transition-colors",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")}
                />
                {item.badge && (
                  <span className="absolute -right-2 -top-1 flex h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-xs leading-tight truncate max-w-[72px]">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      {label && (
        <div className="mb-1 px-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DesktopNavLink({
  item,
  pathname,
  collapsed,
  badge,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  badge?: string | number | null;
}) {
  const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md transition-colors",
        collapsed ? "justify-center p-2.5" : "px-2.5 py-2 text-sm font-medium",
        active
          ? "bg-surface-2 text-foreground font-semibold shadow-[inset_0_0_0_1px_var(--border-strong)]"
          : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {badge != null && badge !== "" && (
            <span
              className={cn(
                "ml-auto rounded px-1.5 py-0.5 text-xs font-mono tnum font-semibold",
                active
                  ? "bg-primary/20 text-primary"
                  : "bg-surface-3 text-muted-foreground group-hover:text-foreground",
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function MobileDrawerLink({
  item,
  pathname,
  badge,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  badge?: string | number | null;
  onClick: () => void;
}) {
  const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-surface-2 text-foreground font-semibold shadow-[inset_0_0_0_1px_var(--border-strong)]"
          : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="truncate">{item.label}</span>
      {badge != null && badge !== "" && (
        <span
          className={cn(
            "ml-auto rounded px-2 py-0.5 text-xs font-mono tnum font-semibold",
            active ? "bg-primary/20 text-primary" : "bg-surface-3 text-muted-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
