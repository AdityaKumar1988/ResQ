import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** Main error message displayed to the user */
  message?: string;
  /** Optional retry handler — shows a Retry button when provided */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable error state panel.
 * Shows an alert icon, a user-friendly message, and an optional Retry button.
 */
export function ErrorState({
  message = "Something went wrong",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 p-6 text-center", className)}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-3"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
