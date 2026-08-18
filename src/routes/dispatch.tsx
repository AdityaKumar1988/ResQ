import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal } from "lucide-react";
import { AppShell } from "@/components/ems/AppShell";
import { IncidentFeed } from "@/components/ems/IncidentFeed";
import { FleetPanel } from "@/components/ems/FleetPanel";
import { ActivityTimeline } from "@/components/ems/ActivityTimeline";
import { LiveMapWrapper } from "@/components/ems/LiveMapWrapper";
import { NewIncidentDialog } from "@/components/ems/NewIncidentDialog";
import { SelectedIncidentPanel } from "@/components/ems/SelectedIncidentPanel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Command Center · ResQ" },
      {
        name: "description",
        content:
          "Real-time emergency dispatch console — live incident feed, tactical map, and ambulance fleet status.",
      },
      { property: "og:title", content: "Dispatch Command Center · ResQ" },
      {
        property: "og:description",
        content: "Enterprise dispatch console for emergency medical operations.",
      },
    ],
  }),
  component: DispatchPage,
});

const MIN_HEIGHT = 72;
const MAX_HEIGHT = 380;
const DEFAULT_HEIGHT = 110;

function DispatchPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [timelineHeight, setTimelineHeight] = useState<number>(DEFAULT_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(DEFAULT_HEIGHT);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startYRef.current = e.clientY;
      startHeightRef.current = timelineHeight;
    },
    [timelineHeight],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        startYRef.current = e.touches[0].clientY;
        startHeightRef.current = timelineHeight;
      }
    },
    [timelineHeight],
  );

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const deltaY = startYRef.current - e.clientY;
      const nextHeight = Math.max(
        MIN_HEIGHT,
        Math.min(MAX_HEIGHT, startHeightRef.current + deltaY),
      );
      setTimelineHeight(nextHeight);
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 1) {
        const deltaY = startYRef.current - e.touches[0].clientY;
        const nextHeight = Math.max(
          MIN_HEIGHT,
          Math.min(MAX_HEIGHT, startHeightRef.current + deltaY),
        );
        setTimelineHeight(nextHeight);
      }
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const handleDoubleClick = () => {
    setTimelineHeight((prev) => (prev > 140 ? DEFAULT_HEIGHT : 240));
  };

  return (
    <ProtectedRoute allowedRoles={["dispatcher", "admin"]}>
      <AppShell>
        <div className="flex h-full flex-col gap-2.5 p-3 select-none">
          {/* Main 3-column ops grid */}
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[320px_1fr_320px]">
            <div className="min-h-0">
              <IncidentFeed
                onCreate={() => setDialogOpen(true)}
                selectedId={selectedIncidentId}
                onSelect={setSelectedIncidentId}
              />
            </div>
            <div className="flex min-h-0 flex-col gap-3">
              <div className="min-h-0 flex-1">
                {!dialogOpen && (
                  <LiveMapWrapper
                    selectedId={selectedIncidentId}
                    onSelect={setSelectedIncidentId}
                  />
                )}
              </div>
              <div className="rounded-lg border border-border bg-surface panel">
                <SelectedIncidentPanel selectedId={selectedIncidentId} />
              </div>
            </div>
            <div className="min-h-0">
              <FleetPanel />
            </div>
          </div>

          {/* Resizable Activity Timeline Container */}
          <div
            style={{ height: `${timelineHeight}px` }}
            className="group relative shrink-0 transition-[height] duration-75 ease-out flex flex-col"
          >
            {/* Draggable Top Handle */}
            <div
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onDoubleClick={handleDoubleClick}
              role="separator"
              aria-label="Resize activity stream"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") setTimelineHeight((h) => Math.min(MAX_HEIGHT, h + 20));
                if (e.key === "ArrowDown") setTimelineHeight((h) => Math.max(MIN_HEIGHT, h - 20));
              }}
              title="Drag to resize activity stream (Double-click to toggle expand)"
              className={`absolute -top-2.5 left-0 right-0 z-20 flex h-4 cursor-row-resize items-center justify-center focus:outline-none ${
                isDragging ? "cursor-row-resize opacity-100" : "opacity-70 hover:opacity-100"
              }`}
            >
              <div
                className={`flex h-1.5 w-16 items-center justify-center rounded-full transition-all ${
                  isDragging
                    ? "bg-primary w-24 h-2 shadow-glow"
                    : "bg-border-strong group-hover:bg-primary/70 group-hover:w-20"
                }`}
              >
                <GripHorizontal className="h-2.5 w-2.5 text-background" />
              </div>
            </div>

            <ActivityTimeline isExpanded={timelineHeight > 150} />
          </div>
        </div>
        <NewIncidentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </AppShell>
    </ProtectedRoute>
  );
}
