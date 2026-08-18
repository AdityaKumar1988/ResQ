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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Award,
  Clock,
  Download,
  Gauge,
  MapPin,
  Siren,
  Timer,
  TrendingUp,
  Users,
  Inbox,
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
  "90d": "Last 90 days",
};

function fmtDuration(sec: unknown) {
  const num = Number(sec);
  if (!Number.isFinite(num) || num <= 0) return "—";
  const m = Math.floor(num / 60);
  const s = Math.round(num % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AnalyticsDashboard() {
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: hospitals = [] } = useHospitals();
  const [range, setRange] = useState<Range>("7d");

  // Real filtered incidents based on range
  const { filteredIncidents, trendData, rangeStats } = useMemo(() => {
    const now = Date.now();
    let rangeDurationMs = 7 * 24 * 3600 * 1000;
    let bucketsCount = 7;
    let unitLabel: (index: number) => string = (i) => `Day ${i + 1}`;

    if (range === "24h") {
      rangeDurationMs = 24 * 3600 * 1000;
      bucketsCount = 24;
      unitLabel = (i) => `${i}:00`;
    } else if (range === "7d") {
      rangeDurationMs = 7 * 24 * 3600 * 1000;
      bucketsCount = 7;
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      unitLabel = (i) => {
        const d = new Date(now - (6 - i) * 24 * 3600 * 1000);
        return days[d.getDay()];
      };
    } else if (range === "30d") {
      rangeDurationMs = 30 * 24 * 3600 * 1000;
      bucketsCount = 10; // 3-day intervals
      unitLabel = (i) => `D-${(10 - i) * 3}`;
    } else if (range === "90d") {
      rangeDurationMs = 90 * 24 * 3600 * 1000;
      bucketsCount = 12; // weeks
      unitLabel = (i) => `W${i + 1}`;
    }

    const cutoff = now - rangeDurationMs;
    const filtered = incidents.filter((i) => new Date(i.reportedAt).getTime() >= cutoff);

    // Build timeline buckets from REAL incident timestamps
    const bucketDurationMs = rangeDurationMs / bucketsCount;
    const buckets = Array.from({ length: bucketsCount }, (_, idx) => {
      const bucketStart = cutoff + idx * bucketDurationMs;
      const bucketEnd = bucketStart + bucketDurationMs;

      const inBucket = filtered.filter((i) => {
        const t = new Date(i.reportedAt).getTime();
        return t >= bucketStart && t < bucketEnd;
      });

      const p1 = inBucket.filter((i) => i.priority === "P1").length;
      const p2 = inBucket.filter((i) => i.priority === "P2").length;
      const p3 = inBucket.filter((i) => i.priority === "P3").length;
      const p4 = inBucket.filter((i) => i.priority === "P4").length;

      const withResp = inBucket.filter((i) => i.assignedAt);
      const avgResp =
        withResp.length > 0
          ? Math.round(
              withResp.reduce((acc, i) => {
                const diff =
                  (new Date(i.assignedAt!).getTime() - new Date(i.reportedAt).getTime()) / 1000;
                return acc + Math.max(0, diff);
              }, 0) / withResp.length,
            )
          : 0;

      const metSla = withResp.filter((i) => {
        const diff = (new Date(i.assignedAt!).getTime() - new Date(i.reportedAt).getTime()) / 1000;
        return diff <= Number(i.slaSeconds || 480);
      }).length;

      const sla = withResp.length > 0 ? Math.round((metSla / withResp.length) * 100) : 100;

      return {
        label: unitLabel(idx),
        P1: p1,
        P2: p2,
        P3: p3,
        P4: p4,
        total: inBucket.length,
        avgResp: avgResp || 0,
        sla,
      };
    });

    // Compute range totals
    const active = filtered.filter(
      (i) => i.status !== "completed" && i.status !== "cancelled",
    ).length;
    const completed = filtered.filter((i) => i.status === "completed").length;

    const allWithResp = filtered.filter((i) => i.assignedAt);
    const overallAvgResp =
      allWithResp.length > 0
        ? Math.round(
            allWithResp.reduce((acc, i) => {
              const diff =
                (new Date(i.assignedAt!).getTime() - new Date(i.reportedAt).getTime()) / 1000;
              return acc + Math.max(0, diff);
            }, 0) / allWithResp.length,
          )
        : 0;

    const allMetSla = allWithResp.filter((i) => {
      const diff = (new Date(i.assignedAt!).getTime() - new Date(i.reportedAt).getTime()) / 1000;
      return diff <= Number(i.slaSeconds || 480);
    }).length;

    const overallSla =
      allWithResp.length > 0 ? Math.round((allMetSla / allWithResp.length) * 100) : 100;

    return {
      filteredIncidents: filtered,
      trendData: buckets,
      rangeStats: {
        total: filtered.length,
        active,
        completed,
        avgResp: overallAvgResp,
        sla: overallSla,
      },
    };
  }, [incidents, range]);

  // Real Priority Breakdown
  const priorityMix = useMemo(() => {
    const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    filteredIncidents.forEach((i) => {
      if (counts[i.priority] !== undefined) {
        counts[i.priority]++;
      }
    });

    return (Object.keys(counts) as Priority[]).map((k) => ({
      name: k,
      value: counts[k],
      color: `var(--${PRIORITY_META[k].token})`,
      label: PRIORITY_META[k].label,
    }));
  }, [filteredIncidents]);

  // Real Emergency Type Breakdown
  const emergencyMix = useMemo(() => {
    const counts = new Map<string, number>();
    filteredIncidents.forEach((i) => {
      counts.set(i.type, (counts.get(i.type) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([type, count]) => ({
        type,
        label: EMERGENCY_LABELS[type as keyof typeof EMERGENCY_LABELS] ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredIncidents]);

  // Real Hospital Bed Load
  const hospitalLoad = useMemo(
    () =>
      hospitals
        .map((h) => {
          const beds = Number(h.beds ?? 0);
          const available = Number(h.bedsAvailable ?? 0);
          const util = beds > 0 ? Math.round(((beds - available) / beds) * 100) : 0;
          return {
            name: (h.name || "Hospital").replace(/ Medical Center| Trauma Center| Hospital/, ""),
            util: Number.isFinite(util) ? Math.max(0, Math.min(100, util)) : 0,
            available: Number.isFinite(available) ? available : 0,
            beds: Number.isFinite(beds) ? beds : 0,
            fill: util >= 90 ? "var(--destructive)" : util >= 75 ? "var(--p2)" : "var(--primary)",
          };
        })
        .sort((a, b) => b.util - a.util),
    [hospitals],
  );

  // Real Driver Leaderboard
  const leaderboard = useMemo(() => {
    return [...drivers]
      .map((d) => {
        const rating = Number(d.rating != null ? d.rating : 4.7);
        const avgResp = Number(d.avgResponseSec != null ? d.avgResponseSec : 480);
        const missions = Number(d.missionsCompleted != null ? d.missionsCompleted : 0);
        const safeRating = Number.isFinite(rating) ? rating : 4.7;
        const safeAvgResp = Number.isFinite(avgResp) ? avgResp : 480;
        const safeMissions = Number.isFinite(missions) ? missions : 0;

        return {
          ...d,
          rating: safeRating,
          avgResponseSec: safeAvgResp,
          missionsCompleted: safeMissions,
          score: Math.round(
            safeRating * 20 +
              (safeAvgResp > 0 ? Math.min(30, (600 / safeAvgResp) * 10) : 15) +
              Math.min(50, safeMissions * 5),
          ),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [drivers]);

  // Real 7x24 Incident Heatmap
  const heatmap = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // matrix[day][hour]
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    filteredIncidents.forEach((i) => {
      const d = new Date(i.reportedAt);
      const day = d.getDay();
      const hour = d.getHours();
      if (matrix[day] && matrix[day][hour] !== undefined) {
        matrix[day][hour]++;
      }
    });

    const maxVal = Math.max(1, ...matrix.flat());

    return days.map((d, di) => ({
      day: d,
      hours: matrix[di].map((count) => count / maxVal),
      rawCounts: matrix[di],
    }));
  }, [filteredIncidents]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <SkeletonList count={6} itemHeight="h-24" className="w-full max-w-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <ErrorState message="Failed to load live analytics data" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/40 px-6 py-4 backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <Gauge className="h-3.5 w-3.5 text-primary" /> Operations Performance Analytics
          </div>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            Operational Intelligence · {RANGE_LABEL[range]}
          </h1>
        </div>

        {/* Range Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-surface-2 p-0.5">
            {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors",
                  r === range
                    ? "bg-primary/20 text-primary font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const dataStr =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(filteredIncidents, null, 2));
              const downloadAnchor = document.createElement("a");
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `resq-analytics-${range}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium hover:bg-surface-3 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export Data
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-3 p-6 pb-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Siren}
          label="Total Incidents"
          value={rangeStats.total.toLocaleString()}
          hint={`${rangeStats.active} active · ${rangeStats.completed} resolved`}
          accent="primary"
        />
        <KpiCard
          icon={Timer}
          label="Avg Response"
          value={fmtDuration(rangeStats.avgResp)}
          hint="Dispatch intake → assignment"
          accent="enroute"
        />
        <KpiCard
          icon={TrendingUp}
          label="SLA Compliance"
          value={`${rangeStats.sla}%`}
          hint="Within priority target threshold"
          accent="available"
        />
        <KpiCard
          icon={Users}
          label="Fleet Shift Status"
          value={`${drivers.filter((d) => d.status !== "offline").length}/${drivers.length}`}
          hint={`${drivers.filter((d) => d.status === "available").length} available units`}
          accent="p2"
        />
      </div>

      {/* Main Charts: Volume Trend & Priority Mix */}
      <div className="grid grid-cols-1 gap-3 px-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Incident Volume by Priority"
          subtitle={`Timeline distribution across ${RANGE_LABEL[range].toLowerCase()}`}
        >
          {rangeStats.total === 0 ? (
            <EmptyChartState message="No incident records found in this time range." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => (
                    <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={`var(--${PRIORITY_META[p].token})`}
                        stopOpacity={0.55}
                      />
                      <stop
                        offset="100%"
                        stopColor={`var(--${PRIORITY_META[p].token})`}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  allowDecimals={false}
                />
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
          )}
        </Card>

        <Card title="Priority Breakdown" subtitle="Distribution by severity level">
          {rangeStats.total === 0 ? (
            <EmptyChartState message="No incident records to display." />
          ) : (
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
          )}
        </Card>
      </div>

      {/* Row 2: Response Time & SLA Performance */}
      <div className="grid grid-cols-1 gap-3 px-6 pt-3 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Response Time & SLA Trajectory"
          subtitle="Calculated from real assignment timestamps"
        >
          {rangeStats.total === 0 ? (
            <EmptyChartState message="No response time data logged." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="l"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  domain={[0, 100]}
                />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="avgResp"
                  name="Avg Response (s)"
                  stroke="var(--status-enroute)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="r"
                  type="monotone"
                  dataKey="sla"
                  name="SLA Compliance %"
                  stroke="var(--status-available)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Emergency Type Breakdown */}
        <Card title="Emergency Categories" subtitle="Classified by medical condition">
          {emergencyMix.length === 0 ? (
            <EmptyChartState message="No categorized emergencies." />
          ) : (
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {emergencyMix.map((item) => {
                const pct =
                  rangeStats.total > 0 ? Math.round((item.count / rangeStats.total) * 100) : 0;
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize text-foreground/90">
                        {item.label}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {item.count} <span className="text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Heatmap, Hospital Load & Driver Leaderboard */}
      <div className="grid grid-cols-1 gap-3 p-6 pt-3 xl:grid-cols-3">
        {/* Real 7x24 Heatmap */}
        <Card
          title="Incident Demand Heatmap"
          subtitle="Density by Day of Week & Hour (00:00–23:00)"
        >
          <div className="space-y-1.5 pt-2">
            {heatmap.map((row) => (
              <div key={row.day} className="flex items-center gap-1.5">
                <span className="w-7 font-mono text-[10px] text-muted-foreground">{row.day}</span>
                <div className="grid flex-1 grid-cols-24 gap-0.5">
                  {row.hours.map((val, h) => (
                    <div
                      key={h}
                      title={`${row.day} at ${h}:00 — ${row.rawCounts[h]} incidents`}
                      className="h-3.5 rounded-[2px] transition-colors"
                      style={{
                        backgroundColor:
                          val > 0
                            ? `rgba(var(--primary-rgb, 14, 165, 233), ${Math.max(0.2, val)})`
                            : "var(--surface-3)",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>00:00 (Midnight)</span>
            <span>12:00 (Noon)</span>
            <span>23:00 (Night)</span>
          </div>
        </Card>

        {/* Real Hospital Bed Load */}
        <Card
          title="Hospital Capacity & Utilization"
          subtitle="Real-time emergency bed availability"
        >
          {hospitalLoad.length === 0 ? (
            <EmptyChartState message="No hospital records found." />
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {hospitalLoad.map((h) => (
                <div
                  key={h.name}
                  className="space-y-1 rounded-md border border-border bg-surface-2/60 p-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground/90 truncate max-w-[160px]">
                      {h.name}
                    </span>
                    <span className="font-mono text-xs font-bold" style={{ color: h.fill }}>
                      {h.util}% capacity
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${h.util}%`, backgroundColor: h.fill }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{h.available} beds open</span>
                    <span>{h.beds} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Real Driver Leaderboard */}
        <Card
          title="Driver Performance Leaderboard"
          subtitle="Missions, average response time & rating"
        >
          {leaderboard.length === 0 ? (
            <EmptyChartState message="No active driver profiles registered." />
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {leaderboard.map((d, rank) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2.5 rounded-md border border-border bg-surface-2/60 p-2"
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold",
                      rank === 0
                        ? "bg-amber-500/20 text-amber-400"
                        : rank === 1
                          ? "bg-slate-400/20 text-slate-300"
                          : rank === 2
                            ? "bg-amber-700/20 text-amber-600"
                            : "bg-surface-3 text-muted-foreground",
                    )}
                  >
                    #{rank + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate">{d.name}</span>
                      <span className="font-mono text-primary">{d.callSign}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                      <span>⭐ {Number(d.rating != null ? d.rating : 0).toFixed(1)}</span>
                      <span>{Number(d.missionsCompleted || 0)} missions</span>
                      <span>{fmtDuration(d.avgResponseSec)} avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accent: "primary" | "enroute" | "available" | "p2";
}) {
  const accentColor =
    accent === "primary"
      ? "text-primary"
      : accent === "enroute"
        ? "text-status-enroute"
        : accent === "available"
          ? "text-status-available"
          : "text-p2";

  return (
    <div className="rounded-lg border border-border bg-surface-2/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md bg-surface-3",
            accentColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm", className)}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
      <Inbox className="h-6 w-6 opacity-30" />
      <span className="text-xs">{message}</span>
    </div>
  );
}

interface TooltipPayloadItem {
  color?: string;
  fill?: string;
  name?: string;
  value?: number | string;
}

interface ChartTipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ChartTip({ active, payload, label }: ChartTipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md border border-border-strong bg-elevated p-2 shadow-lg text-xs">
      <div className="font-mono font-semibold text-foreground mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            {entry.name}:
          </span>
          <span className="font-mono font-bold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
