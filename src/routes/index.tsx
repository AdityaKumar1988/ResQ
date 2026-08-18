import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  LifeBuoy,
  Radio,
  Shield,
  Siren,
  Truck,
} from "lucide-react";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useAuth } from "@/lib/auth-context";
import { tokenStore } from "@/lib/token-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResQ — Emergency Operations Platform" },
      {
        name: "description",
        content:
          "Enterprise emergency medical dispatch platform. Real-time incident management, live fleet tracking, and SLA analytics for ambulance services.",
      },
      { property: "og:title", content: "ResQ — Emergency Operations Platform" },
      {
        property: "og:description",
        content:
          "Next-generation unified emergency medical dispatch, fleet tracking, and responder management.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [now, setNow] = useState<Date | null>(null);
  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { logout, isAuthenticated } = useAuth();

  // Invalidate stale portal session if user leaves portal to landing page
  useEffect(() => {
    if (isAuthenticated || tokenStore.getRefresh()) {
      logout();
    }
  }, [isAuthenticated, logout]);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeIncidents = incidents.filter(
    (i) => i.status !== "completed" && i.status !== "cancelled",
  );
  const availableUnits = drivers.filter((d) => d.status === "available").length;
  const onShiftUnits = drivers.filter((d) => d.status !== "offline").length;

  const displayIncidents = incidents.slice(0, 4);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Ambient backdrop glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-primary-glow/10 blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow text-primary-foreground">
            <Siren className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">ResQ</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Emergency Platform
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-2 sm:block transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/dispatch"
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-primary-glow px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-opacity"
          >
            Open command center
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-8 sm:pt-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-status-available" />
              </span>
              <span>LIVE OPERATIONS ACTIVE</span>
            </div>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl text-foreground">
              Emergency response, <span className="text-gradient">under a single console.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              ResQ unifies emergency intake, ambulance dispatch, driver routing, hospital handoff,
              and SLA analytics into one enterprise-grade platform. Built for operations centers
              where every second matters.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/dispatch"
                className="group flex items-center gap-2 rounded-md bg-gradient-to-br from-primary to-primary-glow px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.01]"
              >
                Launch dispatcher console
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/citizen"
                className="rounded-md border border-border-strong bg-surface-2 px-5 py-3 text-sm font-semibold hover:bg-surface-3 transition-colors"
              >
                Citizen emergency portal
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-surface-2/90 p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Active Alerts
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {activeIncidents.length}
                </div>
                <div className="text-[11px] text-muted-foreground">in operational queue</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/90 p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Available Units
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {availableUnits}
                </div>
                <div className="text-[11px] text-muted-foreground">ready for dispatch</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/90 p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Fleet on Shift
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {onShiftUnits}
                </div>
                <div className="text-[11px] text-muted-foreground">live GPS tracked</div>
              </div>
            </div>
          </div>

          {/* Hero panel preview */}
          <div className="relative">
            <div className="panel-elevated relative overflow-hidden rounded-xl border border-border p-4 shadow-2xl bg-surface/90">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-p1" />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-p1 font-bold">
                    Tactical Operations Feed
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {incidents.length} INCIDENTS RECORDED
                </span>
              </div>

              <div className="grid gap-2">
                {displayIncidents.length > 0 ? (
                  displayIncidents.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface-2/80 p-3"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded font-mono text-[10px] font-bold ${
                          i.priority === "P1"
                            ? "bg-p1 text-p1-foreground"
                            : i.priority === "P2"
                              ? "bg-p2 text-p2-foreground"
                              : "bg-p3 text-p3-foreground"
                        }`}
                      >
                        {i.priority}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate capitalize">{i.type}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {i.address}
                        </div>
                      </div>
                      <div className="font-mono text-xs font-semibold uppercase text-primary">
                        {i.status.replace("_", " ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    System standing by · All sectors normal
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface-2 p-2.5 text-[11px]">
                <Activity className="h-3.5 w-3.5 text-status-available" />
                <span className="text-muted-foreground">
                  {onShiftUnits} responders on shift · {availableUnits} available
                </span>
                <span className="ml-auto font-mono text-primary font-bold" suppressHydrationWarning>
                  {now ? now.toLocaleTimeString("en-US", { hour12: false }) : "--:--:--"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Role Cards Section */}
        <section className="mt-24">
          <div className="text-center">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Role-Based Portals
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Purpose-built for every responder
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RoleCard
              icon={LifeBuoy}
              title="Citizen"
              to="/citizen"
              desc="Report emergencies, share live location, and track ambulance arrival in real time."
            />
            <RoleCard
              icon={Radio}
              title="Dispatcher"
              to="/dispatch"
              desc="Command center with tactical live map, smart unit ranking, and SLA tracking."
            />
            <RoleCard
              icon={Truck}
              title="Driver"
              to="/driver"
              desc="Accept missions, navigate turn-by-turn, and manage patient transport stages."
            />
            <RoleCard
              icon={Shield}
              title="Admin"
              to="/admin"
              desc="User management, role assignment, fleet registry, and audit log inspection."
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-24 grid gap-4 md:grid-cols-3">
          <Feature
            icon={Siren}
            title="Smart Recommendation Engine"
            desc="Ranks closest ambulances by distance, availability, driver performance, and workload with full dispatcher override capability."
          />
          <Feature
            icon={BarChart3}
            title="Real-Time SLA Analytics"
            desc="Response time tracking, mission durations, fleet utilization, and heatmaps backed directly by live PostgreSQL data."
          />
          <Feature
            icon={Activity}
            title="Full-Duplex Socket.IO Telemetry"
            desc="Instant bidirectional event synchronization across dispatchers, drivers, and citizens with zero polling lag."
          />
        </section>
      </main>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  to,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  to: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:border-primary/60 hover:bg-surface-2 hover:shadow-glow hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>

      <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Launch Portal{" "}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
