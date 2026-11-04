import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Leaflet touches window at import time — must be gated behind ClientOnly.
const LiveMap = lazy(() => import("./LiveMap"));

export function LiveMapWrapper({
  selectedId,
  onSelect,
  isVisible = true,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  isVisible?: boolean;
}) {
  return (
    <div className="relative isolate z-0 h-full w-full">
      <ClientOnly fallback={<MapSkeleton />}>
        <Suspense fallback={<MapSkeleton />}>
          <LiveMap selectedId={selectedId} onSelect={onSelect} isVisible={isVisible} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      <div className="absolute inset-0 animate-pulse bg-surface-2" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div className="mt-2 text-xs text-muted-foreground font-mono">
          Initializing tactical map…
        </div>
      </div>
    </div>
  );
}
