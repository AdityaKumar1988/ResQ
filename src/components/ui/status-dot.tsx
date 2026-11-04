import React from "react";
import { cn } from "@/lib/utils";

export type StatusDotType =
  | "available"
  | "en_route"
  | "busy"
  | "at_hospital"
  | "offline"
  | "maintenance"
  | "p1"
  | "p2"
  | "p3"
  | "p4"
  | "operational"
  | "waking"
  | "degraded"
  | string;

const STATIC_DOT_CLASSES: Record<string, { dot: string; ping?: string }> = {
  available: { dot: "bg-status-available", ping: "bg-status-available" },
  en_route: { dot: "bg-status-enroute", ping: "bg-status-enroute" },
  busy: { dot: "bg-status-busy" },
  at_hospital: { dot: "bg-status-hospital" },
  offline: { dot: "bg-status-offline" },
  maintenance: { dot: "bg-status-maintenance" },
  p1: { dot: "bg-p1", ping: "bg-p1" },
  p2: { dot: "bg-p2" },
  p3: { dot: "bg-p3" },
  p4: { dot: "bg-p4" },
  operational: { dot: "bg-status-available", ping: "bg-status-available" },
  waking: { dot: "bg-amber-400", ping: "bg-amber-400" },
  degraded: { dot: "bg-orange-400" },
};

interface StatusDotProps {
  status: StatusDotType;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

export function StatusDot({
  status,
  pulse = false,
  size = "md",
  className,
  title,
}: StatusDotProps) {
  const norm = (status || "").toLowerCase();
  const config = STATIC_DOT_CLASSES[norm] || { dot: "bg-muted-foreground" };

  const dimensions = size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <span
      title={title}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        dimensions,
        className,
      )}
    >
      {pulse && config.ping && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            config.ping,
          )}
        />
      )}
      <span className={cn("relative inline-flex h-full w-full rounded-full", config.dot)} />
    </span>
  );
}
