import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  LifeBuoy,
  Radio,
  RefreshCw,
  Server,
  Shield,
  Siren,
  Truck,
} from "lucide-react";
import { usePublicStats } from "@/hooks/public/use-public-stats";
import { usePublicHealth } from "@/hooks/public/use-public-health";
import { useAuth } from "@/lib/auth-context";

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
  const [isColdStarting, setIsColdStarting] = useState(false);

  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = usePublicStats();

  const { data: health, isLoading: isHealthLoading, isError: isHealthError } = usePublicHealth();

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect Render cold starts (free tier web services sleep after 15m inactivity)
  useEffect(() => {
    if (isStatsLoading || isHealthLoading) {
      const timer = setTimeout(() => setIsColdStarting(true), 3500);
      return () => clearTimeout(timer);
    }
    setIsColdStarting(false);
  }, [isStatsLoading, isHealthLoading]);

  // Operational indicator state determination
  type IndicatorState = "operational" | "waking" | "degraded" | "offline";
  let indicatorState: IndicatorState = "offline";
  let indicatorLabel = "SYSTEM OFFLINE";
  let indicatorTooltip = "Telemetry cluster unreachable";

  if (isColdStarting || (isHealthLoading && !health)) {
    indicatorState = "waking";
    indicatorLabel = "CONNECTING / WAKING UP";
    indicatorTooltip = "Spinning up cloud operations cluster";
  } else if (isHealthError || !health) {
    indicatorState = "offline";
    indicatorLabel = "SYSTEM OFFLINE";
    indicatorTooltip = "Backend operations cluster unreachable";
  } else if (!health.ok || health.database !== "connected") {
    indicatorState = "degraded";
    indicatorLabel = "SYSTEM DEGRADED";
    indicatorTooltip = "Cluster online · Database telemetry degraded";
  } else {
    indicatorState = "operational";
    indicatorLabel = "LIVE OPERATIONS ACTIVE";
    indicatorTooltip = "Operations cluster healthy · Database connected";
  }

  const activeIncidentsCount = stats?.activeIncidents ?? 0;
  const availableUnitsCount = stats?.availableUnits ?? 0;
  const onShiftUnitsCount = stats?.onShiftUnits ?? 0;
  const totalIncidentsCount = stats?.totalIncidents ?? 0;
  const displayIncidents = stats?.recentActivity ?? [];

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
          {!isAuthenticated && (
            <Link
              to="/login"
              className="hidden rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-2 sm:block transition-colors"
            >
              Sign in
            </Link>
          )}
          <Link
            to={
              user?.role === "citizen"
                ? "/citizen"
                : user?.role === "driver"
                  ? "/driver"
                  : user?.role === "admin"
                    ? "/admin"
                    : "/dispatch"
            }
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-primary-glow px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-opacity"
          >
            {isAuthenticated
              ? user?.role === "citizen"
                ? "Open citizen portal"
                : user?.role === "driver"
                  ? "Open driver console"
                  : user?.role === "admin"
                    ? "Open admin console"
                    : "Open command center"
              : "Open command center"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-8 sm:pt-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            {/* Dynamic Operational Health Indicator */}
            <div
              title={indicatorTooltip}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground cursor-help"
            >
              <span className="relative flex h-2 w-2">
                {indicatorState === "operational" && (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-status-available" />
                  </>
                )}
                {indicatorState === "waking" && (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </>
                )}
                {indicatorState === "degraded" && (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                )}
                {indicatorState === "offline" && (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                )}
              </span>
              <span
                className={
                  indicatorState === "operational"
                    ? "text-foreground font-semibold"
                    : indicatorState === "waking"
                      ? "text-amber-400 font-semibold"
                      : indicatorState === "degraded"
                        ? "text-orange-400 font-semibold"
                        : "text-rose-400 font-semibold"
                }
              >
                {indicatorLabel}
              </span>
            </div>

            {/* Non-intrusive Render cold start banner */}
            {isColdStarting && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <Server className="h-4 w-4 animate-pulse text-amber-400 shrink-0" />
                <span>
                  Waking cloud operations cluster (Render free tier spin-up)... Telemetry will
                  populate shortly.
                </span>
              </div>
            )}

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

            {/* Live Operational Statistics */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {/* Active Alerts */}
              <div className="rounded-lg border border-border bg-surface-2/90 p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Active Alerts
                </div>
                {isStatsLoading ? (
                  <div className="my-1.5 h-7 w-12 animate-pulse rounded bg-surface-3" />
                ) : isStatsError ? (
                  <div className="mt-1 text-sm font-semibold text-rose-400">Offline</div>
                ) : (
                  <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {activeIncidentsCount}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">in operational queue</div>
              </div>

              {/* Available Units */}
              <div className="rounded-lg border border-border bg-surface-2/90 p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Available Units
                </div>
                {isStatsLoading ? (
                  <div className="my-1.5 h-7 w-12 animate-pulse rounded bg-surface-3" />
                ) : isStatsError ? (
                  <div className="mt-1 text-sm font-semibold text-rose-400">Offline</div>
                ) : (
                  <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {availableUnitsCount}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">ready for dispatch</div>
              </div>

              {/* Fleet on Shift */}
              <div className="rounded-lg border border-border bg-surface-2/90 p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Fleet on Shift
                </div>
                {isStatsLoading ? (
                  <div className="my-1.5 h-7 w-12 animate-pulse rounded bg-surface-3" />
                ) : isStatsError ? (
                  <div className="mt-1 text-sm font-semibold text-rose-400">Offline</div>
                ) : (
                  <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {onShiftUnitsCount}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">live GPS tracked</div>
              </div>

              {/* Error banner with retry */}
              {isStatsError && (
                <div className="col-span-3 mt-1 flex items-center justify-between rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                    Failed to connect to live operations telemetry
                  </span>
                  <button
                    onClick={() => refetchStats()}
                    className="flex items-center gap-1 font-semibold text-primary hover:underline transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry Connection
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hero panel preview */}
          <div className="relative">
            <div className="panel-elevated relative overflow-hidden rounded-xl border border-border p-4 shadow-2xl bg-surface/90">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      indicatorState === "operational"
                        ? "bg-p1 animate-pulse"
                        : indicatorState === "waking"
                          ? "bg-amber-400 animate-pulse"
                          : indicatorState === "degraded"
                            ? "bg-orange-400"
                            : "bg-rose-500"
                    }`}
                  />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-p1 font-bold">
                    Tactical Operations Feed
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {isStatsLoading
                    ? "SYNCING TELEMETRY..."
                    : isStatsError
                      ? "FEED OFFLINE"
                      : `${totalIncidentsCount} INCIDENTS RECORDED`}
                </span>
              </div>

              <div className="grid gap-2">
                {isStatsLoading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface-2/60 p-3 animate-pulse"
                    >
                      <div className="h-8 w-8 rounded bg-surface-3" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-24 rounded bg-surface-3" />
                        <div className="h-2.5 w-40 rounded bg-surface-3" />
                      </div>
                      <div className="h-3 w-16 rounded bg-surface-3" />
                    </div>
                  ))
                ) : isStatsError ? (
                  <div className="py-8 text-center text-xs text-rose-300/80">
                    <AlertCircle className="mx-auto h-5 w-5 text-rose-400 mb-2" />
                    Tactical operations feed unavailable.
                    <div className="mt-2">
                      <button
                        onClick={() => refetchStats()}
                        className="inline-flex items-center gap-1 rounded bg-surface-3 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry Link
                      </button>
                    </div>
                  </div>
                ) : displayIncidents.length > 0 ? (
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
                        <div className="text-[10px] text-muted-foreground truncate">{i.sector}</div>
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
                <Activity
                  className={`h-3.5 w-3.5 ${
                    indicatorState === "operational"
                      ? "text-status-available"
                      : indicatorState === "waking"
                        ? "text-amber-400"
                        : indicatorState === "degraded"
                          ? "text-orange-400"
                          : "text-rose-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  {isStatsLoading
                    ? "Synchronizing fleet telemetry..."
                    : isStatsError
                      ? "Telemetry link disconnected"
                      : `${onShiftUnitsCount} responders on shift · ${availableUnitsCount} available`}
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
