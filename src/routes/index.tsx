import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart EMS — Emergency Operations Platform" },
      {
        name: "description",
        content:
          "Enterprise emergency medical dispatch platform. Real-time incident management, live fleet tracking, and SLA analytics for ambulance services.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* backdrop glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-primary-glow/10 blur-[120px]" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Siren className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold">Smart EMS</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Operations Platform
            </div>
          </div>
        </div>
        <Link
          to="/dispatch"
          className="flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-primary-glow px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95"
        >
          Open command center
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-available" />
              </span>
              Live · v1.0
            </div>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Emergency response,{" "}
              <span className="text-gradient">under a single console.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Smart EMS unifies 911 intake, ambulance dispatch, driver workflow, hospital handoff,
              and analytics into one enterprise-grade platform. Built for operations centers where
              every second matters.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/dispatch"
                className="group flex items-center gap-2 rounded-md bg-gradient-to-br from-primary to-primary-glow px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Launch dispatcher console
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/citizen"
                className="rounded-md border border-border-strong bg-surface-2 px-5 py-3 text-sm font-semibold hover:bg-surface-3"
              >
                Citizen portal
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { k: "Response", v: "6.2m", sub: "avg P1" },
                { k: "SLA", v: "96%", sub: "compliance" },
                { k: "Units", v: "24/7", sub: "live tracking" },
              ].map((s) => (
                <div key={s.k} className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {s.k}
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{s.v}</div>
                  <div className="text-[11px] text-muted-foreground">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero panel preview */}
          <div className="relative">
            <div className="panel-elevated relative overflow-hidden rounded-xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-p1" />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-p1">
                    P1 · Live incident
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">INC-2149</span>
              </div>
              <div className="grid gap-2">
                {[
                  { p: "P1", type: "Cardiac", status: "En route", eta: "3m" },
                  { p: "P2", type: "Trauma", status: "Assigned", eta: "7m" },
                  { p: "P1", type: "Stroke", status: "Reported", eta: "—" },
                  { p: "P3", type: "Respiratory", status: "At hospital", eta: "✓" },
                ].map((i, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded font-mono text-[10px] font-bold ${
                        i.p === "P1"
                          ? "bg-p1 text-p1-foreground"
                          : i.p === "P2"
                            ? "bg-p2 text-p2-foreground"
                            : "bg-p3 text-p3-foreground"
                      }`}
                    >
                      {i.p}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{i.type}</div>
                      <div className="text-[10px] text-muted-foreground">{i.status}</div>
                    </div>
                    <div className="font-mono text-xs text-primary">{i.eta}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface-2 p-2.5 text-[11px]">
                <Activity className="h-3.5 w-3.5 text-status-available" />
                <span className="text-muted-foreground">6 units on shift · 3 en route</span>
                <span className="ml-auto font-mono text-primary">18:42:07</span>
              </div>
            </div>
          </div>
        </section>

        {/* Role cards */}
        <section className="mt-24">
          <div className="text-center">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Role-based workspaces
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Purpose-built for every responder
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RoleCard
              icon={LifeBuoy}
              title="Citizen"
              to="/citizen"
              desc="Report emergencies, share live location, track your ambulance."
            />
            <RoleCard
              icon={Radio}
              title="Dispatcher"
              to="/dispatch"
              desc="Command center with live map, smart recommendations, SLA tracking."
              featured
            />
            <RoleCard
              icon={Truck}
              title="Driver"
              to="/driver"
              desc="Accept missions, navigate turn-by-turn, update patient status."
            />
            <RoleCard
              icon={Shield}
              title="Admin"
              to="/admin"
              desc="Users, roles, fleet, audit logs, system health."
            />
          </div>
        </section>

        <section className="mt-24 grid gap-4 md:grid-cols-3">
          <Feature icon={Siren} title="Smart recommendation engine" desc="Ranks top-3 ambulances by distance, availability, driver performance, SLA history, and workload — dispatcher can override." />
          <Feature icon={BarChart3} title="Live SLA analytics" desc="Response time, mission duration, fleet utilization, heatmaps, and driver leaderboards — filterable by day, week, month, year." />
          <Feature icon={Activity} title="Realtime everywhere" desc="Socket.IO powered fleet tracking, incident escalations, and hospital handoffs across every screen." />
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
  featured,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  to: string;
  desc: string;
  featured?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-xl border p-5 transition-all ${
        featured
          ? "border-primary/50 bg-gradient-to-br from-primary/10 to-transparent shadow-glow"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-2"
      }`}
    >
      <Icon className={`h-6 w-6 ${featured ? "text-primary" : "text-muted-foreground"}`} />
      <div className="mt-3 flex items-center gap-1.5">
        <h3 className="text-base font-semibold">{title}</h3>
        {featured && (
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-mono uppercase text-primary">
            Live
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Enter <ArrowRight className="h-3 w-3" />
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
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
