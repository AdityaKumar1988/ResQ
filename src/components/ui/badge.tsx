import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm",
        primary: "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary: "border-transparent bg-surface-2 text-foreground border-border",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: "border-border-strong text-foreground bg-transparent",
        subtle: "border-primary/30 bg-primary-subtle text-primary",
      },
      size: {
        default: "px-2 py-0.5 text-xs",
        sm: "px-1.5 py-0.2 text-[11px] font-mono uppercase tracking-wider",
        lg: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/* =========================================================================
   STATIC CLASS MAPS FOR PRIORITY AND STATUS BADGES
   Guarantees 100% extraction in Tailwind v4 — NO dynamic string interpolation!
   ========================================================================= */

export type PriorityLevel = "P1" | "P2" | "P3" | "P4";

export const PRIORITY_BADGE_CLASSES: Record<
  PriorityLevel,
  { solid: string; subtle: string; border: string; text: string; label: string }
> = {
  P1: {
    solid: "bg-p1 text-p1-foreground border-transparent shadow-sm",
    subtle: "bg-p1-subtle text-p1 border-p1/30",
    border: "border-p1/40 text-p1 bg-transparent",
    text: "text-p1",
    label: "Critical",
  },
  P2: {
    solid: "bg-p2 text-p2-foreground border-transparent shadow-sm",
    subtle: "bg-p2-subtle text-p2 border-p2/30",
    border: "border-p2/40 text-p2 bg-transparent",
    text: "text-p2",
    label: "Urgent",
  },
  P3: {
    solid: "bg-p3 text-p3-foreground border-transparent shadow-sm",
    subtle: "bg-p3-subtle text-p3 border-p3/30",
    border: "border-p3/40 text-p3 bg-transparent",
    text: "text-p3",
    label: "Serious",
  },
  P4: {
    solid: "bg-p4 text-p4-foreground border-transparent shadow-sm",
    subtle: "bg-p4-subtle text-p4 border-p4/30",
    border: "border-p4/40 text-p4 bg-transparent",
    text: "text-p4",
    label: "Non-critical",
  },
};

export interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: PriorityLevel | string;
  variant?: "solid" | "subtle" | "border";
  showLabel?: boolean;
}

export function PriorityBadge({
  priority,
  variant = "subtle",
  showLabel = false,
  className,
  ...props
}: PriorityBadgeProps) {
  const key =
    (priority.toUpperCase() as PriorityLevel) in PRIORITY_BADGE_CLASSES
      ? (priority.toUpperCase() as PriorityLevel)
      : "P4";
  const meta = PRIORITY_BADGE_CLASSES[key];
  const variantClass = meta[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-xs font-bold leading-none select-none",
        variantClass,
        className,
      )}
      {...props}
    >
      <span>{key}</span>
      {showLabel && <span className="font-sans font-normal opacity-90">· {meta.label}</span>}
    </span>
  );
}

export type StatusType =
  | "available"
  | "en_route"
  | "busy"
  | "at_hospital"
  | "offline"
  | "maintenance"
  | "reported"
  | "assigned"
  | "accepted"
  | "arrived"
  | "patient_loaded"
  | "completed"
  | "cancelled"
  | string;

export const STATUS_BADGE_CLASSES: Record<
  string,
  { solid: string; subtle: string; border: string; dot: string; text: string; label: string }
> = {
  available: {
    solid: "bg-status-available text-background border-transparent font-bold",
    subtle: "bg-status-available-subtle text-status-available border-status-available/30",
    border: "border-status-available/40 text-status-available bg-transparent",
    dot: "bg-status-available",
    text: "text-status-available",
    label: "Available",
  },
  en_route: {
    solid: "bg-status-enroute text-background border-transparent font-bold",
    subtle: "bg-status-enroute-subtle text-status-enroute border-status-enroute/30",
    border: "border-status-enroute/40 text-status-enroute bg-transparent",
    dot: "bg-status-enroute",
    text: "text-status-enroute",
    label: "En Route",
  },
  busy: {
    solid: "bg-status-busy text-background border-transparent font-bold",
    subtle: "bg-status-busy-subtle text-status-busy border-status-busy/30",
    border: "border-status-busy/40 text-status-busy bg-transparent",
    dot: "bg-status-busy",
    text: "text-status-busy",
    label: "On Scene",
  },
  at_hospital: {
    solid: "bg-status-hospital text-background border-transparent font-bold",
    subtle: "bg-status-hospital-subtle text-status-hospital border-status-hospital/30",
    border: "border-status-hospital/40 text-status-hospital bg-transparent",
    dot: "bg-status-hospital",
    text: "text-status-hospital",
    label: "At Hospital",
  },
  offline: {
    solid: "bg-status-offline text-background border-transparent font-medium",
    subtle: "bg-surface-2 text-muted-foreground border-border",
    border: "border-border text-muted-foreground bg-transparent",
    dot: "bg-status-offline",
    text: "text-muted-foreground",
    label: "Offline",
  },
  maintenance: {
    solid: "bg-status-maintenance text-background border-transparent font-bold",
    subtle: "bg-status-maintenance-subtle text-status-maintenance border-status-maintenance/30",
    border: "border-status-maintenance/40 text-status-maintenance bg-transparent",
    dot: "bg-status-maintenance",
    text: "text-status-maintenance",
    label: "Maintenance",
  },
  reported: {
    solid: "bg-p1 text-p1-foreground border-transparent font-bold",
    subtle: "bg-p1-subtle text-p1 border-p1/30",
    border: "border-p1/40 text-p1 bg-transparent",
    dot: "bg-p1",
    text: "text-p1",
    label: "Reported",
  },
  assigned: {
    solid: "bg-p2 text-p2-foreground border-transparent font-bold",
    subtle: "bg-p2-subtle text-p2 border-p2/30",
    border: "border-p2/40 text-p2 bg-transparent",
    dot: "bg-p2",
    text: "text-p2",
    label: "Assigned",
  },
  accepted: {
    solid: "bg-primary text-primary-foreground border-transparent font-bold",
    subtle: "bg-primary-subtle text-primary border-primary/30",
    border: "border-primary/40 text-primary bg-transparent",
    dot: "bg-primary",
    text: "text-primary",
    label: "Accepted",
  },
  arrived: {
    solid: "bg-status-busy text-background border-transparent font-bold",
    subtle: "bg-status-busy-subtle text-status-busy border-status-busy/30",
    border: "border-status-busy/40 text-status-busy bg-transparent",
    dot: "bg-status-busy",
    text: "text-status-busy",
    label: "On Scene",
  },
  patient_loaded: {
    solid: "bg-status-busy text-background border-transparent font-bold",
    subtle: "bg-status-busy-subtle text-status-busy border-status-busy/30",
    border: "border-status-busy/40 text-status-busy bg-transparent",
    dot: "bg-status-busy",
    text: "text-status-busy",
    label: "Patient Loaded",
  },
  completed: {
    solid: "bg-status-available text-background border-transparent font-bold",
    subtle: "bg-status-available-subtle text-status-available border-status-available/30",
    border: "border-status-available/40 text-status-available bg-transparent",
    dot: "bg-status-available",
    text: "text-status-available",
    label: "Completed",
  },
  cancelled: {
    solid: "bg-surface-3 text-muted-foreground border-transparent font-medium",
    subtle: "bg-surface-2 text-muted-foreground border-border",
    border: "border-border text-muted-foreground bg-transparent",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    label: "Cancelled",
  },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  variant?: "solid" | "subtle" | "border";
  dot?: boolean;
  labelOverride?: string;
}

export function StatusBadge({
  status,
  variant = "subtle",
  dot = true,
  labelOverride,
  className,
  ...props
}: StatusBadgeProps) {
  const norm = (status || "").toLowerCase();
  const meta = STATUS_BADGE_CLASSES[norm] || {
    solid: "bg-surface-3 text-foreground border-transparent",
    subtle: "bg-surface-2 text-foreground border-border",
    border: "border-border text-foreground bg-transparent",
    dot: "bg-muted-foreground",
    text: "text-foreground",
    label: status,
  };

  const variantClass = meta[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wider select-none",
        variantClass,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />}
      <span>{labelOverride || meta.label}</span>
    </span>
  );
}

export { Badge, badgeVariants };
