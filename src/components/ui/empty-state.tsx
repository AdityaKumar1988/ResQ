import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Main title / message, e.g. "No active incidents" */
  message?: string;
  /** Optional secondary description */
  description?: string;
  /** Optional icon override (defaults to Inbox) */
  icon?: ReactNode;
  /** Optional call-to-action button or element */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable empty-data placeholder.
 * Shows a muted icon, headline, optional description, and call-to-action.
 */
export function EmptyState({
  message = "Nothing here yet",
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2.5 p-6 text-center", className)}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-muted-foreground/70 ring-1 ring-border/50">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
