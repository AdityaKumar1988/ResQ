import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { Driver, Hospital, Incident } from "@/lib/ems/types";

const DriverMap = lazy(() => import("./DriverMap"));

interface Props {
  driver: Driver;
  incident: Incident | null;
  hospital: Hospital | null;
}

export function DriverMapWrapper(props: Props) {
  return (
    <div className="relative isolate z-0 h-full w-full">
      <ClientOnly fallback={<Skeleton />}>
        <Suspense fallback={<Skeleton />}>
          <DriverMap {...props} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden rounded-lg border border-border bg-surface">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-2 via-surface to-surface-2" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div className="mt-2 text-xs text-muted-foreground">Loading nav…</div>
      </div>
    </div>
  );
}
