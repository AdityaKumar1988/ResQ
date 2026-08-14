import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  Clock,
  Download,
  Flame,
  Gauge,
  MapPin,
  Siren,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_META, EMERGENCY_LABELS } from "@/lib/ems/types";
import type { Driver, Incident, Priority } from "@/lib/ems/types";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";

type Range = "24h" | "7d" | "30d" | "90d";

const RANGE_LABEL: Record<Range, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last quarter",
};
const RANGE_POINTS: Record<Range, number> = { "24h": 24, "7d": 7, "30d": 30, "90d": 12 };
const RANGE_UNIT: Record<Range, string> = { "24h": "h", "7d": "d", "30d": "d", "90d": "w" };

// Deterministic pseudo-noise so trends look consistent across renders.
function noise(seed: number) {
  let t = seed + 0x9e3779b9;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function buildTrend(range: Range, incidents: Incident[]) {
  const n = RANGE_POINTS[range];
  const unit = RANGE_UNIT[range];
  const totalReal = incidents.length;
  return Array.from({ length: n }, (_, i) => {
    const idx = n - 1 - i;
    const seedBase = idx * 7 + range.length * 13;
    const base = 22 + Math.sin(idx / 3) * 6;
    const p1 = Math.max(0, Math.round(base * 0.18 + noise(seedBase) * 4));
    const p2 = Math.max(0, Math.round(base * 0.32 + noise(seedBase + 1) * 5));
    const p3 = Math.max(0, Math.round(base * 0.28 + noise(seedBase + 2) * 4));
    const p4 = Math.max(0, Math.round(base * 0.22 + noise(seedBase + 3) * 3));
    const total = p1 + p2 + p3 + p4;
    const avgResp = Math.round(360 + noise(seedBase + 4) * 240);
    const sla = Math.max(72, Math.min(99, Math.round(88 + noise(seedBase + 5) * 12)));
    const label =
      unit === "h" ? `${idx}h` : unit === "w" ? `W${n - idx}` : `D${n - idx}`;
    // For the very last bucket, blend in the real counts to feel "live".
    const bump = i === n - 1 ? Math.min(6, Math.round(totalReal / 3)) : 0;
    return {
      label,
      P1: p1,
      P2: p2,
      P3: p3,
      P4: p4,
      total: total + bump,
      avgResp,
      sla,
    };
  });
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AnalyticsDashboard() {
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: hospitals = [] } = useHospitals();
  const [range, setRange] = useState<Range>("7d");

  const trend = useMemo(() => buildTrend(range, incidents), [range, incidents]);

  const totals = useMemo(() => {
    const total = trend.reduce((s, d) => s + d.total, 0);
    const avgResp = Math.round(
      trend.reduce((s, d) => s + d.avgResp, 0) / trend.length,
    );
    const sla = Math.round(trend.reduce((s, d) => s + d.sla, 0) / trend.length);
    const active = incidents.filter(
      (i) => i.status !== "completed" && i.status !== "cancelled",
    ).length;
    return { total, avgResp, sla, active };
  }, [trend, incidents]);

  const priorityMix = useMemo(() => {
    const acc: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    trend.forEach((d) => {
      acc.P1 += d.P1;
      acc.P2 += d.P2;
      acc.P3 += d.P3;
      acc.P4 += d.P4;
    });
    return (Object.keys(acc) as Priority[]).map((k) => ({
      name: k,
      value: acc[k],
      color: `var(--${PRIORITY_META[k].token})`,
      label: PRIORITY_META[k].label,
    }));
  }, [trend]);

  const emergencyMix = useMemo(() => {
    const counts = new Map<string, number>();
    incidents.forEach((i) =>
      counts.set(i.type, (counts.get(i.type) ?? 0) + 1),
    );
    // Add synthetic history so the bar chart is populated for demo weight.
    const boosters: Record<string, number> = {
      cardiac: 42, trauma: 58, stroke: 31, respiratory: 28,
      obstetric: 14, pediatric: 19, psychiatric: 22, burn: 9, other: 11,
    };
    Object.entries(boosters).forEach(([k, v]) =>
      counts.set(k, (counts.get(k) ?? 0) + v),
    );
    return Array.from(counts.entries())
      .map(([type, count]) => ({
        type,
        label: EMERGENCY_LABELS[type as keyof typeof EMERGENCY_LABELS] ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  const hospitalLoad = useMemo(
    () =>
      hospitals.map((h) => {
        const util = h.beds > 0 ? Math.round(((h.beds - h.bedsAvailable) / h.beds) * 100) : 0;
        return {
          name: h.name.replace(/ Medical Center| Trauma/, ""),
          util,
          available: h.bedsAvailable,
          beds: h.beds,
          fill:
            util >= 92
              ? "var(--destructive)"
              : util >= 80
                ? "var(--p2)"
                : "var(--primary)",
        };
      }).sort((a, b) => b.util - a.util),
    [hospitals],
  );

  const leaderboard = useMemo(() => {
    return [...drivers]
      .map((d) => ({
        ...d,
        score:
          d.rating * 20 +
          (600 / Math.max(1, d.avgResponseSec)) * 12 +
          Math.log10(d.missionsCompleted + 1) * 15,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [drivers]);

  const heatmap = useMemo(() => {
    // 7 x 24 grid: day x hour
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((d, di) => ({
      day: d,
      hours: Array.from({ length: 24 }, (_, h) => {
        const base =
          Math.sin((h - 8) / 3) * 0.4 +
          (h >= 17 && h <= 22 ? 0.6 : 0.25) +
          (di === 5 || di === 6 ? 0.25 : 0) +
          noise(di * 100 + h) * 0.35;
        return Math.max(0, Math.min(1, base));
      }),
    }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <SkeletonList count={6} itemHeight="h-24" className="w-full max-w-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState message="Failed to load analytics data" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/40 px-6 py-4 backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <Gauge className="h-3 w-3" /> Operations analytics
          </div>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight">
            Performance intelligence · {RANGE_LABEL[range]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-surface-2 p-0.5">
            {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors",
                  r === range
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium hover:bg-accent">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 p-6 pb-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Siren}
          label="Total incidents"
          value={totals.total.toLocaleString()}
          delta={+8.4}
          hint={`${totals.active} active now`}
          accent="primary"
        />
        <KpiCard
          icon={Timer}
          label="Avg response"
          value={fmtDuration(totals.avgResp)}
          delta={-4.1}
          hint="Dispatch → on-scene"
          accent="enroute"
        />
        <KpiCard
          icon={TrendingUp}
          label="SLA compliance"
          value={`${totals.sla}%`}
          delta={+1.2}
          hint="P1 target < 8 min"
          accent="available"
        />
        <KpiCard
          icon={Users}
          label="Units on shift"
          value={`${drivers.filter((d) => d.status !== "offline").length}/${drivers.length}`}
          delta={0}
          hint={`${drivers.filter((d) => d.status === "available").length} available`}
          accent="p2"
        />
      </div>

      {/* Row 1: Trend + Priority mix */}
      <div className="grid grid-cols-1 gap-3 px-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Incident volume by priority" subtitle="Stacked P1–P4 over window">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => (
                  <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`var(--${PRIORITY_META[p].token})`} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={`var(--${PRIORITY_META[p].token})`} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              {(["P4", "P3", "P2", "P1"] as Priority[]).map((p) => (
                <Area
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stackId="1"
                  stroke={`var(--${PRIORITY_META[p].token})`}
                  fill={`url(#grad-${p})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Priority mix" subtitle="Distribution across window">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={priorityMix}
                dataKey="value"
                nameKey="label"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {priorityMix.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2: Response time + SLA */}
      <div className="grid grid-cols-1 gap-3 px-6 pt-3 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Response time & SLA" subtitle="Rolling averages">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={30} />
              <YAxis yAxisId="r" orientation="right" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={30} domain={[60, 100]} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Line yAxisId="l" type="monotone" dataKey="avgResp" name="Avg response (s)" stroke="var(--status-enroute)" strokeWidth={2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="sla" name="SLA %" stroke="var(--status-available)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="SLA by priority" subtitle="% within target">
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart
              innerRadius="30%"
              outerRadius="100%"
              data={[
                { name: "P1", value: 94, fill: "var(--p1)" },
                { name: "P2", value: 91, fill: "var(--p2)" },
                { name: "P3", value: 97, fill: "var(--p3)" },
                { name: "P4", value: 99, fill: "var(--p4)" },
              ]}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar background dataKey="value" cornerRadius={6} />
              <Tooltip content={<ChartTip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 3: Emergency types + Hospital load */}
      <div className="grid grid-cols-1 gap-3 px-6 pt-3 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Emergency types" subtitle="Case volume by category">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={emergencyMix} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} height={50} textAnchor="end" />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {emergencyMix.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      i === 0
                        ? "var(--p1)"
                        : i === 1
                          ? "var(--p2)"
                          : "var(--primary)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Hospital capacity" subtitle="Live bed utilization">
          <div className="space-y-3">
            {hospitalLoad.map((h) => (
              <div key={h.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{h.name}</span>
                  <span className="font-mono text-muted-foreground">
                    {h.beds - h.available}/{h.beds}
                    <span
                      className={cn(
                        "ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        h.util >= 92
                          ? "bg-destructive/15 text-destructive"
                          : h.util >= 80
                            ? "bg-p2/15 text-p2"
                            : "bg-primary/15 text-primary",
                      )}
                    >
                      {h.util}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${h.util}%`, background: h.fill }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4: Leaderboard + Heatmap */}
      <div className="grid grid-cols-1 gap-3 px-6 py-3 xl:grid-cols-3">
        <Card title="Top performers" subtitle="Composite score" className="xl:col-span-1">
          <div className="space-y-2">
            {leaderboard.map((d, i) => (
              <LeaderRow key={d.id} rank={i + 1} driver={d} />
            ))}
          </div>
        </Card>

        <Card
          className="xl:col-span-2"
          title="Demand heatmap"
          subtitle="Incidents by day × hour"
        >
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="mb-1 grid grid-cols-[42px_repeat(24,minmax(0,1fr))] gap-[3px] pl-[2px] text-[9px] font-mono text-muted-foreground">
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-center">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {heatmap.map((row) => (
                <div
                  key={row.day}
                  className="grid grid-cols-[42px_repeat(24,minmax(0,1fr))] gap-[3px] pb-[3px]"
                >
                  <div className="pt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {row.day}
                  </div>
                  {row.hours.map((v, h) => (
                    <div
                      key={h}
                      title={`${row.day} ${h}:00 · ${Math.round(v * 30)} incidents`}
                      className="aspect-square rounded-[3px] border border-border/40"
                      style={{
                        background: `color-mix(in oklab, var(--primary) ${Math.round(v * 92)}%, var(--surface-2))`,
                      }}
                    />
                  ))}
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3 w-3" /> Peak load:
                <span className="text-foreground">Fri 18:00–22:00</span>
                <span className="ml-auto flex items-center gap-1">
                  Low
                  <span className="h-2 w-16 rounded-sm" style={{ background: "linear-gradient(90deg, var(--surface-2), var(--primary))" }} />
                  High
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------- helpers -------- */

function Card({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-border bg-surface p-4 shadow-card",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: number;
  hint: string;
  accent: "primary" | "enroute" | "available" | "p2";
}) {
  const accentBg = {
    primary: "bg-primary/15 text-primary",
    enroute: "bg-status-enroute/15 text-status-enroute",
    available: "bg-status-available/15 text-status-available",
    p2: "bg-p2/15 text-p2",
  }[accent];
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <div className="flex items-start justify-between rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <Icon className="h-3 w-3" /> {label}
        </div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
          {!flat && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono font-semibold",
                up
                  ? "bg-status-available/15 text-status-available"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          <span className="truncate text-muted-foreground">{hint}</span>
        </div>
      </div>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", accentBg)}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function LeaderRow({ rank, driver }: { rank: number; driver: Driver & { score: number } }) {
  const medal =
    rank === 1
      ? "bg-p2/20 text-p2"
      : rank === 2
        ? "bg-primary/20 text-primary"
        : rank === 3
          ? "bg-status-enroute/20 text-status-enroute"
          : "bg-surface-3 text-muted-foreground";
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 p-2.5">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-md font-mono text-xs font-semibold", medal)}>
        {rank === 1 ? <Award className="h-4 w-4" /> : `#${rank}`}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{driver.name}</span>
          <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {driver.callSign}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{Number(driver.rating ?? 0).toFixed(1)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDuration(driver.avgResponseSec)}</span>
          <span>{driver.missionsCompleted} runs</span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-semibold tabular-nums">{driver.score.toFixed(1)}</div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">score</div>
      </div>
    </div>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      {label != null && (
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-mono tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
