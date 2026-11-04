import * as React from "react";
import { AlertTriangle, RefreshCw, ServerCrash, ShieldAlert, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ErrorStateType = "403" | "500" | "offline" | "generic";

interface ErrorStateProps {
  /** Error category to display tailored iconography and guidance */
  type?: ErrorStateType;
  /** Primary headline for the error */
  title?: string;
  /** Detailed error message or instructions */
  message?: string;
  /** Optional retry handler — renders a Retry button when provided */
  onRetry?: () => void;
  /** Optional custom action node (e.g. navigation link) */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const ERROR_CONFIG: Record<
  ErrorStateType,
  {
    icon: React.ComponentType<{ className?: string }>;
    defaultTitle: string;
    defaultMessage: string;
    iconBgClass: string;
    iconClass: string;
  }
> = {
  "403": {
    icon: ShieldAlert,
    defaultTitle: "Access Restricted",
    defaultMessage: "You do not have permission to view or manage this resource.",
    iconBgClass: "bg-[var(--color-p2)]/10 ring-1 ring-[var(--color-p2)]/30",
    iconClass: "text-[var(--color-p2)]",
  },
  "500": {
    icon: ServerCrash,
    defaultTitle: "System Service Unavailable",
    defaultMessage: "The server encountered an error processing your request. Please try again.",
    iconBgClass: "bg-destructive/10 ring-1 ring-destructive/30",
    iconClass: "text-destructive",
  },
  offline: {
    icon: WifiOff,
    defaultTitle: "Connection Lost",
    defaultMessage:
      "Unable to reach dispatch network. Check your connection to resume live telemetry.",
    iconBgClass: "bg-[var(--color-p2)]/10 ring-1 ring-[var(--color-p2)]/30",
    iconClass: "text-[var(--color-p2)]",
  },
  generic: {
    icon: AlertTriangle,
    defaultTitle: "Something went wrong",
    defaultMessage: "An unexpected error occurred while loading this view.",
    iconBgClass: "bg-destructive/10 ring-1 ring-destructive/30",
    iconClass: "text-destructive",
  },
};

/**
 * Reusable error state panel.
 * Categorizes errors (403, 500, offline, generic) with clear recovery paths.
 */
export function ErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  const config = ERROR_CONFIG[type] ?? ERROR_CONFIG.generic;
  const Icon = config.icon;

  const displayTitle =
    title ??
    (message && message !== config.defaultMessage ? config.defaultTitle : config.defaultTitle);
  const displayMessage = message ?? config.defaultMessage;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in-50 duration-150",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
          config.iconBgClass,
        )}
      >
        <Icon className={cn("h-5 w-5", config.iconClass)} />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold tracking-tight text-foreground">{displayTitle}</h4>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{displayMessage}</p>
      </div>

      {(onRetry || action) && (
        <div className="mt-1 flex items-center gap-2">
          {onRetry && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
