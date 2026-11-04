import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { Download, Gauge, Inbox, Siren, Timer, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_META, EMERGENCY_LABELS } from "@/lib/ems/types";
import type { Priority } from "@/lib/ems/types";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/ThemeProvider";

type Range = "24h" | "7d" | "30d" | "90d";

const RANGE_LABEL: Record<Range, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

/**
 * Direction 3 Resolved Chart Palette
 * Resolved hex values ensure SVG charts render reliably across canvas/browsers in both themes
 * without broken CSS var() bindings.
 */
export const CHART_PALETTE = {
  P1: "#EF4444",
  P2: "#F97316",
  P3: "#FBBF24",
  P4: "#60A5FA",
  primary: "#38BDF8",
  available: "#22C55E",
  enroute: "#38BDF8",
  hospital: "#A855F7",
  destructive: "#EF4444",
  gridDark: "rgba(255, 255, 255, 0.08)",
  gridLight: "rgba(0, 0, 0, 0.08)",
  axisDark: "#94A3B8",
  axisLight: "#64748B",
};

function fmtDuration(sec: unknown) {
  const num = Number(sec);
  if (!Number.isFinite(num) || num <= 0) return "—";
  const m = Math.floor(num / 60);
  const s = Math.round(num % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AnalyticsDashboard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: hospitals = [] } = useHospitals();
  const [range, setRange] = useState<Range>("7d");

  // Real filtered incidents based on selected range
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
      bucketsCount = 10;
      unitLabel = (i) => `D-${(10 - i) * 3}`;
    } else if (range === "90d") {
      rangeDurationMs = 90 * 24 * 3600 * 1000;
      bucketsCount = 12;
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
      color: CHART_PALETTE[k],
      label: PRIORITY_META[k].label,
    }));
  }, [filteredIncidents]);

  // Real Emergency Category Breakdown
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
            fill:
              util >= 90
                ? CHART_PALETTE.destructive
                : util >= 75
                  ? CHART_PALETTE.P2
                  : CHART_PALETTE.primary,
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

  // Real 7x24 Incident Demand Heatmap
  const heatmap = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
        <SkeletonList count={6} className="w-full max-w-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <ErrorState message="Failed to load live operations analytics" onRetry={() => refetch()} />
      </div>
    );
  }

  const gridStroke = isDark ? CHART_PALETTE.gridDark : CHART_PALETTE.gridLight;
  const axisStroke = isDark ? CHART_PALETTE.axisDark : CHART_PALETTE.axisLight;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            <Gauge className="h-4 w-4 text-primary" /> Operations Performance Analytics
          </div>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            Operational Intelligence · {RANGE_LABEL[range]}
          </h1>
        </div>

        {/* Range Switcher & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
            {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors",
                  r === range
                    ? "bg-elevated text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
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
            className="text-xs h-8"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Data
          </Button>
        </div>
      </div>

      {/* KPI MetricCards Row */}
      <div className="grid grid-cols-1 gap-3 p-6 pb-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Siren}
          label="Total Incidents"
          value={rangeStats.total.toLocaleString()}
          hint={`${rangeStats.active} active · ${rangeStats.completed} resolved`}
          accent="primary"
        />
        <MetricCard
          icon={Timer}
          label="Avg Response"
          value={fmtDuration(rangeStats.avgResp)}
          hint="Dispatch intake → crew allocation"
          accent="enroute"
        />
        <MetricCard
          icon={TrendingUp}
          label="SLA Compliance"
          value={`${rangeStats.sla}%`}
          hint="Met clinical time threshold"
          accent="available"
        />
        <MetricCard
          icon={Users}
          label="Active Crew Shift"
          value={`${drivers.filter((d) => d.status !== "offline").length}/${drivers.length}`}
          hint={`${drivers.filter((d) => d.status === "available").length} available units`}
          accent="p2"
        />
      </div>

      {/* Main Charts: Volume Trend & Priority Mix */}
      <div className="grid grid-cols-1 gap-3 px-6 xl:grid-cols-3">
        <ChartPanel
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
                      <stop offset="0%" stopColor={CHART_PALETTE[p]} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART_PALETTE[p]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke={gridStroke} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={axisStroke}
                  fontSize={11}
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
                    stroke={CHART_PALETTE[p]}
                    fill={`url(#grad-${p})`}
                    strokeWidth={1.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel title="Priority Breakdown" subtitle="Distribution by severity level">
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
                  paddingAngle={3}
                  stroke={isDark ? "#171E2B" : "#FFFFFF"}
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
        </ChartPanel>
      </div>

      {/* Row 2: Response Time Trajectory & Emergency Categories */}
      <div className="grid grid-cols-1 gap-3 px-6 pt-3 xl:grid-cols-3">
        <ChartPanel
          className="xl:col-span-2"
          title="Response Time & SLA Trajectory"
          subtitle="Derived from real intake and assignment timestamps"
        >
          {rangeStats.total === 0 ? (
            <EmptyChartState message="No response time data logged." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="l"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  domain={[0, 100]}
                />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="avgResp"
                  name="Avg Response (s)"
                  stroke={CHART_PALETTE.primary}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="r"
                  type="monotone"
                  dataKey="sla"
                  name="SLA Compliance %"
                  stroke={CHART_PALETTE.available}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* Emergency Categories Breakdown */}
        <ChartPanel title="Emergency Categories" subtitle="Classified by medical incident type">
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
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="font-mono text-muted-foreground tnum">
                        {item.count} <span className="text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
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
        </ChartPanel>
      </div>

      {/* Row 3: Demand Heatmap, Hospital Utilization & Driver Leaderboard */}
      <div className="grid grid-cols-1 gap-3 p-6 pt-3 xl:grid-cols-3">
        {/* Real 7x24 Demand Heatmap */}
        <ChartPanel
          title="Incident Demand Heatmap"
          subtitle="Hourly density by Day of Week (00:00–23:00)"
        >
          <div className="space-y-1.5 pt-2">
            {heatmap.map((row) => (
              <div key={row.day} className="flex items-center gap-1.5">
                <span className="w-8 font-mono text-xs text-muted-foreground">{row.day}</span>
                <div className="grid flex-1 grid-cols-24 gap-0.5">
                  {row.hours.map((val, h) => (
                    <div
                      key={h}
                      title={`${row.day} at ${h}:00 — ${row.rawCounts[h]} incidents`}
                      className="h-3.5 rounded-[2px] transition-colors"
                      style={{
                        backgroundColor:
                          val > 0
                            ? `rgba(56, 189, 248, ${Math.max(0.25, val)})`
                            : isDark
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(0,0,0,0.05)",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>00:00 (Midnight)</span>
            <span>12:00 (Noon)</span>
            <span>23:00 (Night)</span>
          </div>
        </ChartPanel>

        {/* Real Hospital Bed Load */}
        <ChartPanel
          title={
            <span className="flex items-center gap-2">
              <span>Hospital Bed Utilization</span>
              <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-normal">
                Demo Data
              </span>
            </span>
          }
          subtitle="Capacity across partner facilities (demo availability)"
        >
          {hospitalLoad.length === 0 ? (
            <EmptyChartState message="No hospital records found." />
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {hospitalLoad.map((h) => (
                <div
                  key={h.name}
                  className="space-y-1 rounded-md border border-border bg-surface p-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[160px]">
                      {h.name}
                    </span>
                    <span className="font-mono text-xs font-bold tnum" style={{ color: h.fill }}>
                      {h.util}% Load
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${h.util}%`, backgroundColor: h.fill }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-mono tnum">
                    <span>
                      {h.available} beds free <span className="text-[10px] opacity-75">(demo)</span>
                    </span>
                    <span>{h.beds} capacity</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartPanel>

        {/* Real Driver Leaderboard */}
        <ChartPanel
          title="Crew Performance Leaderboard"
          subtitle="Runs completed, average response time & rating"
        >
          {leaderboard.length === 0 ? (
            <EmptyChartState message="No active driver profiles registered." />
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {leaderboard.map((d, rank) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2.5 rounded-md border border-border bg-surface p-2"
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold",
                      rank === 0
                        ? "bg-amber-500/20 text-amber-500"
                        : rank === 1
                          ? "bg-slate-400/20 text-slate-300"
                          : rank === 2
                            ? "bg-amber-700/20 text-amber-600"
                            : "bg-surface-2 text-muted-foreground",
                    )}
                  >
                    #{rank + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate text-foreground">{d.name}</span>
                      <span className="font-mono text-primary">{d.callSign}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono tnum">
                      <span>★ {Number(d.rating != null ? d.rating : 0).toFixed(1)}</span>
                      <span>{Number(d.missionsCompleted || 0)} runs</span>
                      <span>{fmtDuration(d.avgResponseSec)} avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 shadow-xs", className)}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
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
    <div className="rounded-md border border-border bg-elevated p-2 shadow-lg text-xs">
      <div className="font-mono font-semibold text-foreground mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            {entry.name}:
          </span>
          <span className="font-mono font-bold text-foreground tnum">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
