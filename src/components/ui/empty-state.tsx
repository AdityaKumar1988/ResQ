import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Main message, e.g. "No active incidents" */
  message?: string;
  /** Optional icon override (defaults to Inbox) */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable empty-data placeholder.
 * Shows a muted icon and message when a list or panel has no items.
 */
export function EmptyState({ message = "Nothing here yet", icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2 p-6 text-center", className)}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-muted-foreground/60">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
