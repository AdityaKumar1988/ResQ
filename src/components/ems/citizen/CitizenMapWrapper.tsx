import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { Driver, Hospital, Incident } from "@/lib/ems/types";

const CitizenMap = lazy(() => import("./CitizenMap"));

interface Props {
  incident: Incident | null;
  driver: Driver | null;
  hospital: Hospital | null;
  citizenLocation: { lat: number; lng: number };
}

export function CitizenMapWrapper(props: Props) {
  return (
    <ClientOnly fallback={<Skeleton />}>
      <Suspense fallback={<Skeleton />}>
        <CitizenMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}

function Skeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-surface">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-2 via-surface to-surface-2" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div className="mt-2 text-xs text-muted-foreground">Loading map…</div>
      </div>
    </div>
  );
}
