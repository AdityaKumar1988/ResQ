import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  LifeBuoy,
  Lock,
  Radio,
  RefreshCw,
  Server,
  Shield,
  Siren,
  Timer,
  Truck,
  Zap,
} from "lucide-react";
import { usePublicStats } from "@/hooks/public/use-public-stats";
import { usePublicHealth } from "@/hooks/public/use-public-health";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResQ — Emergency Medical Dispatch & Fleet Orchestration" },
      {
        name: "description",
        content:
          "Enterprise emergency medical dispatch platform. Real-time incident management, live fleet tracking, and SLA analytics for ambulance networks.",
      },
      { property: "og:title", content: "ResQ — Emergency Operations Platform" },
      {
        property: "og:description",
        content:
          "Mission-critical emergency medical dispatch, fleet tracking, and responder management.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
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

  // Detect server cold starts on free tiers gracefully
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
  let indicatorDescription = "Operations cluster unreachable";

  if (isColdStarting || (isHealthLoading && !health)) {
    indicatorState = "waking";
    indicatorLabel = "INITIALIZING TELEMETRY";
    indicatorDescription = "Connecting to operations cluster";
  } else if (isHealthError || !health) {
    indicatorState = "offline";
    indicatorLabel = "SYSTEM OFFLINE";
    indicatorDescription = "Backend operations cluster unreachable";
  } else if (!health.ok || health.database !== "connected") {
    indicatorState = "degraded";
    indicatorLabel = "TELEMETRY DEGRADED";
    indicatorDescription = "Cluster online · Database telemetry degraded";
  } else {
    indicatorState = "operational";
    indicatorLabel = "OPERATIONS ACTIVE";
    indicatorDescription = "Cluster nominal · Real-time socket connected";
  }

  const activeIncidentsCount = stats?.activeIncidents ?? 0;
  const availableUnitsCount = stats?.availableUnits ?? 0;
  const onShiftUnitsCount = stats?.onShiftUnits ?? 0;
  const totalIncidentsCount = stats?.totalIncidents ?? 0;
  const displayIncidents = stats?.recentActivity ?? [];

  // Route resolvers for authenticated vs unauthenticated users
  const getRoleDestination = (targetRoute: string) => {
    if (!isAuthenticated) return `/login?redirect=${encodeURIComponent(targetRoute)}`;
    return targetRoute;
  };

  const getPrimaryAction = () => {
    if (!isAuthenticated) {
      return {
        to: "/login?redirect=/dispatch",
        label: "Open Command Center",
      };
    }
    if (user?.role === "citizen") return { to: "/citizen", label: "Open Citizen Portal" };
    if (user?.role === "driver") return { to: "/driver", label: "Open Driver Console" };
    if (user?.role === "admin") return { to: "/admin", label: "Open Admin Console" };
    return { to: "/dispatch", label: "Open Command Center" };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="ResQ Emergency Platform Home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
              <Siren className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-foreground">ResQ</span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Emergency Grid
              </span>
            </div>
          </Link>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle size="sm" />

            {!isAuthenticated ? (
              <Link
                to="/login"
                className="inline-flex min-h-[36px] items-center rounded-md border border-border bg-surface-2 px-3.5 text-xs font-semibold text-foreground hover:bg-surface-3 transition-colors"
              >
                Sign in
              </Link>
            ) : (
              <Link
                to={primaryAction.to}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <span>Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Flow */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative border-b border-border py-12 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              {/* Left: Headline, Subcopy, CTAs, Real Live Stats */}
              <div>
                {/* Calm Status Pill (Replacing loud CONNECTING banner) */}
                <div
                  title={indicatorDescription}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      indicatorState === "operational"
                        ? "bg-status-available"
                        : indicatorState === "waking"
                          ? "bg-amber-400"
                          : indicatorState === "degraded"
                            ? "bg-orange-400"
                            : "bg-destructive"
                    }`}
                  />
                  <span className="text-foreground font-semibold">{indicatorLabel}</span>
                  <span className="text-border-strong select-none">·</span>
                  <span className="text-muted-foreground truncate">{indicatorDescription}</span>
                </div>

                {/* Optional subtle cold start notice */}
                {isColdStarting && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                    <Server className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Synchronizing cold operations worker... Telemetry will refresh momentarily.
                    </span>
                  </div>
                )}

                {/* Primary Heading */}
                <h1 className="font-heading mt-6 text-3xl font-extrabold tracking-[-0.02em] sm:text-5xl lg:text-6xl text-foreground leading-[1.1]">
                  Emergency Medical Dispatch & Fleet Orchestration
                </h1>

                {/* Subcopy */}
                <p className="mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-muted-foreground">
                  Mission-critical emergency intake, algorithmic ambulance routing, in-vehicle
                  responder telemetry, and hospital handoffs. Engineered for high-concurrency public
                  safety networks where every second counts.
                </p>

                {/* Two Action CTAs */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button asChild variant="primary" size="lg" className="font-semibold gap-2">
                    <Link to={primaryAction.to}>
                      <span>{primaryAction.label}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button asChild variant="secondary" size="lg" className="font-semibold">
                    <Link to={getRoleDestination("/citizen")}>Citizen Emergency Portal</Link>
                  </Button>
                </div>

                {/* Real Live Statistics Widget */}
                <div className="mt-10 pt-8 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                      Live Telemetry Stream
                    </div>
                    {isStatsError && (
                      <button
                        type="button"
                        onClick={() => refetchStats()}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry Link
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Active Incidents */}
                    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        Active Triage
                      </div>
                      {isStatsLoading ? (
                        <Skeleton className="my-2 h-7 w-12" />
                      ) : isStatsError ? (
                        <div className="mt-1 text-base font-semibold text-destructive">Offline</div>
                      ) : (
                        <div className="mt-1 text-2xl font-bold font-mono tnum text-foreground">
                          {activeIncidentsCount}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">in active queue</div>
                    </div>

                    {/* Available Units */}
                    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        Ready Units
                      </div>
                      {isStatsLoading ? (
                        <Skeleton className="my-2 h-7 w-12" />
                      ) : isStatsError ? (
                        <div className="mt-1 text-base font-semibold text-destructive">Offline</div>
                      ) : (
                        <div className="mt-1 text-2xl font-bold font-mono tnum text-foreground">
                          {availableUnitsCount}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">
                        ready for dispatch
                      </div>
                    </div>

                    {/* Fleet on Shift */}
                    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        Active Crew
                      </div>
                      {isStatsLoading ? (
                        <Skeleton className="my-2 h-7 w-12" />
                      ) : isStatsError ? (
                        <div className="mt-1 text-base font-semibold text-destructive">Offline</div>
                      ) : (
                        <div className="mt-1 text-2xl font-bold font-mono tnum text-foreground">
                          {onShiftUnitsCount}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">on duty shift</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: CSS/SVG Product Preview of the Dispatch Console (Clearly labeled "preview") */}
              <div className="relative">
                <div className="overflow-hidden rounded-xl border border-border-strong bg-card shadow-2xl">
                  {/* Console Preview Header Ribbon */}
                  <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                        <div className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                        <div className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                      </div>
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                        PREVIEW · DISPATCH COMMAND CENTER
                      </span>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-primary tnum font-semibold">
                      CAD GRID 104-B
                    </span>
                  </div>

                  {/* Static Architectural Vector Schematic */}
                  <div className="relative aspect-[16/10] w-full bg-canvas p-4 select-none">
                    {/* SVG Map Schematic */}
                    <svg
                      className="absolute inset-0 h-full w-full opacity-40"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <defs>
                        <pattern
                          id="grid-pattern"
                          width="40"
                          height="40"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 40 0 L 0 0 0 40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.8"
                            className="text-border"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                      {/* Arterial Transit Routes */}
                      <path
                        d="M 30 180 Q 150 120 280 140 T 520 80"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-border-strong"
                      />
                      <path
                        d="M 120 30 Q 180 160 320 200 T 480 260"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-border-strong"
                      />
                      {/* Active Dispatch Route Vector */}
                      <path
                        d="M 140 130 L 260 170 L 380 120"
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                      />
                    </svg>

                    {/* Tactical Overlays (Static, clean preview) */}
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      {/* Top Metric Strip */}
                      <div className="flex items-center justify-between rounded border border-border bg-surface/90 px-2.5 py-1.5 text-xs font-mono">
                        <span className="text-muted-foreground">SECTOR 04 · URBAN CORE</span>
                        <span className="text-foreground font-semibold tnum">
                          AVG RESP: 05:42 MIN
                        </span>
                      </div>

                      {/* Map Pins & Responders (Static Preview) */}
                      <div className="relative flex-1">
                        {/* Incident Marker P1 */}
                        <div className="absolute left-[35%] top-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded border border-[var(--color-p1)]/60 bg-surface/95 px-2 py-1 shadow-md">
                          <span className="h-2 w-2 rounded-full bg-[var(--color-p1)]" />
                          <span className="font-mono text-xs font-bold text-[var(--color-p1)]">
                            P1 CARDIAC
                          </span>
                        </div>

                        {/* Ambulance AMB-02 */}
                        <div className="absolute left-[65%] top-[30%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded border border-primary/60 bg-surface/95 px-2 py-1 shadow-md">
                          <Truck className="h-3 w-3 text-primary" />
                          <span className="font-mono text-xs font-semibold text-foreground">
                            AMB-02 (EN ROUTE)
                          </span>
                        </div>

                        {/* General Hospital Station */}
                        <div className="absolute left-[78%] top-[70%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded border border-border bg-surface/95 px-2 py-1">
                          <span className="h-2 w-2 rounded-full bg-status-available" />
                          <span className="font-mono text-xs text-muted-foreground">
                            METRO TRAUMA CENTER
                          </span>
                        </div>
                      </div>

                      {/* Bottom Status Feed */}
                      <div className="flex items-center justify-between rounded border border-border bg-surface/90 px-2.5 py-1.5 text-xs font-mono">
                        <span className="text-primary">SOCKET SYNC: ONLINE</span>
                        <span className="text-muted-foreground tnum">
                          {now ? now.toLocaleTimeString("en-US", { hour12: false }) : "12:00:00"}{" "}
                          UTC
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real Feed Summary Snippet */}
                  <div className="border-t border-border bg-surface-2/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
                        Telemetry Activity
                      </span>
                      <span className="font-mono text-xs tnum">
                        {isStatsLoading ? "SYNCING..." : `${totalIncidentsCount} LOGGED TOTAL`}
                      </span>
                    </div>

                    {isStatsLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : displayIncidents.length > 0 ? (
                      <div className="flex items-center justify-between rounded border border-border bg-card px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-xs font-bold text-primary">
                            {displayIncidents[0].priority}
                          </span>
                          <span className="truncate font-medium text-foreground capitalize">
                            {displayIncidents[0].type}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] uppercase text-muted-foreground shrink-0 ml-2">
                          {displayIncidents[0].sector}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground text-center">
                        All dispatch queues operational
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Workflow Strip: Report -> Dispatch -> Respond -> Handoff */}
        <section className="border-b border-border py-14 sm:py-20 bg-surface/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Operational Lifecycle
              </div>
              <h2 className="font-heading mt-2 text-2xl sm:text-3xl font-bold tracking-[-0.01em] text-foreground">
                End-to-End Emergency Workflow
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                Seamless coordination from the first 911 distress signal through critical care bed
                transfer.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Step 1 */}
              <div className="relative rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-primary tracking-widest">
                    STEP 01
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-primary">
                    <LifeBuoy className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">Report</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Citizens or emergency operators log symptoms, patient count, and auto-resolved GPS
                  coordinates with instant priority triage.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-primary tracking-widest">
                    STEP 02
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-primary">
                    <Radio className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">Dispatch</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Recommendation algorithm ranks ambulances by road distance, paramedic equipment
                  tier, and driver load with manual override controls.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-primary tracking-widest">
                    STEP 03
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-primary">
                    <Truck className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">Respond</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  In-vehicle driver console receives mission coordinates, turn-by-turn routing, and
                  live patient vitals updates in real time.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-primary tracking-widest">
                    STEP 04
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-primary">
                    <Shield className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">Handoff</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Receiving trauma centers receive automated ETA telemetry, reserve emergency beds,
                  and confirm digital clinical transfer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Role Cards Section (Links unauthenticated visitors to /login) */}
        <section className="border-b border-border py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Role-Based Consoles
              </div>
              <h2 className="font-heading mt-2 text-2xl sm:text-3xl font-bold tracking-[-0.01em] text-foreground">
                Purpose-Built for Every Responder
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                Tailored interfaces designed specifically for cognitive load reduction in
                high-stress roles.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Citizen Card */}
              <RoleCard
                icon={LifeBuoy}
                title="Citizen"
                destination={getRoleDestination("/citizen")}
                desc="Fast emergency intake, continuous location sharing, and transparent ambulance ETA tracking."
              />

              {/* Dispatcher Card */}
              <RoleCard
                icon={Radio}
                title="Dispatcher"
                destination={getRoleDestination("/dispatch")}
                desc="Tactical live map, automated ambulance recommendation, and incident queue management."
              />

              {/* Driver Card */}
              <RoleCard
                icon={Truck}
                title="Driver"
                destination={getRoleDestination("/driver")}
                desc="One-tap mission acceptance, turn-by-turn guidance, and transport stage telemetry."
              />

              {/* Admin Card */}
              <RoleCard
                icon={Shield}
                title="Admin"
                destination={getRoleDestination("/admin")}
                desc="Personnel credentials, role permissions, fleet registry, and audit log inspection."
              />
            </div>
          </div>
        </section>

        {/* Capability Section (From existing 3 features) */}
        <section className="border-b border-border py-14 sm:py-20 bg-surface/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Core Architecture
              </div>
              <h2 className="font-heading mt-2 text-2xl sm:text-3xl font-bold tracking-[-0.01em] text-foreground">
                Built for High Reliability Under Pressure
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary mb-4">
                  <Siren className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Smart Recommendation Engine
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Calculates vehicle-to-incident distances, crew availability, driver performance
                  records, and active sector workload—with immediate human dispatcher override.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary mb-4">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Real-Time SLA Analytics
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Continuous tracking of response times, scene durations, hospital turnarounds, and
                  fleet utilization rates backed directly by relational PostgreSQL data.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary mb-4">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Full-Duplex Socket.IO Telemetry
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Instant bidirectional event synchronization across dispatchers, drivers, and
                  citizens with real-time updates via WebSockets without manual polling.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Row (Strictly true claims) */}
        <section className="border-b border-border py-10 bg-surface-2/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary shrink-0" />
                <span>PostgreSQL Audited Incident Ledger</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <span>Real-Time Socket.IO Telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary shrink-0" />
                <span>Role-Based Access Control (RBAC)</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary shrink-0" />
                <span>Triage SLA Tracking Engine</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Production Footer */}
      <footer className="border-t border-border bg-surface py-10 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-surface-2 border border-border text-primary">
              <Siren className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-foreground">ResQ Emergency Operations Grid</span>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Responder Sign In
            </Link>
            <span className="text-border-strong">·</span>
            <span>Accessible Design</span>
            <span className="text-border-strong">·</span>
            <span>© {new Date().getFullYear()} ResQ Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  destination,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  destination: string;
  desc: string;
}) {
  return (
    <Link
      to={destination}
      className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[180px]"
    >
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 border border-border/80 text-foreground group-hover:text-primary transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-heading mt-4 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>

      <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-primary pt-2 border-t border-border/50">
        <span>Launch Portal</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
