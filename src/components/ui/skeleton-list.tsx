import { cn } from "@/lib/utils";

interface SkeletonListProps {
  /** Number of skeleton items to render */
  count?: number;
  /** Height of each skeleton item (px or Tailwind class) */
  itemHeight?: string;
  /** Additional CSS classes on the wrapper */
  className?: string;
}

/**
 * Animated skeleton list for loading states.
 * Renders N pulsing placeholder cards.
 */
export function SkeletonList({ count = 4, itemHeight = "h-16", className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-2 p-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-md border border-border bg-surface-2", itemHeight)}
        >
          <div className="flex h-full items-center gap-3 px-3">
            <div className="h-8 w-8 shrink-0 rounded bg-surface-3" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-surface-3" />
              <div className="h-2.5 w-1/2 rounded bg-surface-3" />
            </div>
            <div className="h-4 w-10 rounded bg-surface-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
