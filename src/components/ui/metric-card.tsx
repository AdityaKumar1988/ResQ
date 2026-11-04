import React from "react";
import { cn } from "@/lib/utils";

export type MetricAccent =
  "primary" | "available" | "enroute" | "p1" | "p2" | "p3" | "p4" | "hospital" | "muted";

const ACCENT_STYLES: Record<
  MetricAccent,
  { text: string; bg: string; dot: string; border: string }
> = {
  primary: {
    text: "text-primary",
    bg: "bg-primary-subtle",
    dot: "bg-primary",
    border: "border-primary/30",
  },
  available: {
    text: "text-status-available",
    bg: "bg-status-available-subtle",
    dot: "bg-status-available",
    border: "border-status-available/30",
  },
  enroute: {
    text: "text-status-enroute",
    bg: "bg-status-enroute-subtle",
    dot: "bg-status-enroute",
    border: "border-status-enroute/30",
  },
  p1: {
    text: "text-p1",
    bg: "bg-p1-subtle",
    dot: "bg-p1",
    border: "border-p1/30",
  },
  p2: {
    text: "text-p2",
    bg: "bg-p2-subtle",
    dot: "bg-p2",
    border: "border-p2/30",
  },
  p3: {
    text: "text-p3",
    bg: "bg-p3-subtle",
    dot: "bg-p3",
    border: "border-p3/30",
  },
  p4: {
    text: "text-p4",
    bg: "bg-p4-subtle",
    dot: "bg-p4",
    border: "border-p4/30",
  },
  hospital: {
    text: "text-status-hospital",
    bg: "bg-status-hospital-subtle",
    dot: "bg-status-hospital",
    border: "border-status-hospital/30",
  },
  muted: {
    text: "text-muted-foreground",
    bg: "bg-surface-3",
    dot: "bg-muted-foreground",
    border: "border-border",
  },
};

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: MetricAccent;
  variant?: "card" | "chip" | "panel";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
  variant = "card",
  size = "md",
  className,
  onClick,
}: MetricCardProps) {
  const accentTheme = ACCENT_STYLES[accent] || ACCENT_STYLES.primary;

  // Chip style (horizontal compact strip used in headers)
  if (variant === "chip") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 transition-colors select-none",
          onClick && "cursor-pointer hover:bg-surface-3",
          className,
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-heading text-sm font-semibold text-foreground [font-feature-settings:'tnum'] [font-variant-numeric:tabular-nums]">
          {value}
        </span>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accentTheme.dot)} />
      </div>
    );
  }

  // Small compact stat (used in telemetry grids and driver cockpits)
  if (size === "sm") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "rounded-md border border-border bg-surface-2 p-2 transition-colors",
          onClick && "cursor-pointer hover:bg-surface-3",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <span className="truncate">{label}</span>
          {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", accentTheme.text)} />}
        </div>
        <div
          className={cn(
            "mt-1 font-heading text-base font-semibold leading-none [font-feature-settings:'tnum'] [font-variant-numeric:tabular-nums]",
            accentTheme.text,
          )}
        >
          {value}
        </div>
        {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
      </div>
    );
  }

  // Standard or Large Card
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border bg-surface-2 p-3.5 shadow-card transition-all",
        onClick && "cursor-pointer hover:bg-hover active:scale-[0.99]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              accentTheme.bg,
              accentTheme.text,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground [font-feature-settings:'tnum'] [font-variant-numeric:tabular-nums]">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground leading-snug">{hint}</div>}
    </div>
  );
}
