import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Leaflet touches window at import time — must be gated behind ClientOnly.
const LiveMap = lazy(() => import("./LiveMap"));

export function LiveMapWrapper({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <LiveMap selectedId={selectedId} onSelect={onSelect} />
      </Suspense>
    </ClientOnly>
  );
}

function MapSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-surface panel">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-2 via-surface to-surface-2" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div className="mt-2 text-xs text-muted-foreground">Initializing tactical map…</div>
      </div>
    </div>
  );
}
