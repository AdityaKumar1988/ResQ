import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  Radio,
  Settings2,
  ShieldAlert,
  Siren,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/notifications/use-notifications";
import { formatRelative } from "@/lib/ems/geo";
import type { Notification } from "@/types/notification";
import { useAuth } from "@/lib/auth-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NotificationCategory = "all" | "urgent" | "dispatch" | "system";

const CHIME_STORAGE_KEY = "resq_p1_chime_enabled";

/**
 * Web Audio API synthesized medical chime (880Hz -> 1046Hz)
 * Plays only after explicit user gesture activation
 */
function playP1Chime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: 880Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Tone 2: 1046.5Hz (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.16);
    gain2.gain.setValueAtTime(0.18, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.35);
  } catch {
    // Audio autoplay blocked or unsupported
  }
}

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: notifData, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<NotificationCategory>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Optional P1 Chime Setting (default off, persisted in localStorage)
  const [chimeEnabled, setChimeEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(CHIME_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Track responsive screen size for mobile sheet vs desktop popover
  useEffect(() => {
    function checkSize() {
      setIsMobile(window.innerWidth < 768);
    }
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Keyboard Esc dismissal on desktop
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const allNotifications = useMemo(() => notifData?.all ?? [], [notifData?.all]);
  const unreadCount = notifData?.unreadCount ?? 0;

  // Categorize notifications into Urgent / Dispatch / System
  const categorized = useMemo(() => {
    return allNotifications.map((n) => {
      const k = (n.kind || "").toLowerCase();
      const isUrgent =
        k === "incident_created" ||
        k.includes("breach") ||
        k.includes("p1") ||
        k.includes("urgent") ||
        n.data?.priority === "P1" ||
        n.data?.priority === "P2";

      const isDispatch =
        k.includes("assigned") ||
        k.includes("completed") ||
        k.includes("enroute") ||
        k.includes("driver") ||
        k.includes("incident");

      let group: "urgent" | "dispatch" | "system" = "system";
      if (isUrgent) group = "urgent";
      else if (isDispatch) group = "dispatch";

      return { ...n, group };
    });
  }, [allNotifications]);

  // Filtered by category and unread toggle
  const displayedNotifications = useMemo(() => {
    return categorized.filter((n) => {
      if (unreadOnly && n.readAt) return false;
      if (category === "all") return true;
      return n.group === category;
    });
  }, [categorized, category, unreadOnly]);

  // Empty state title and message matching the current filter
  const emptyState = useMemo(() => {
    const labels: Record<NotificationCategory, string> = {
      all: "notifications",
      urgent: "urgent alerts",
      dispatch: "dispatch events",
      system: "system alerts",
    };
    const current = labels[category];

    if (unreadOnly) {
      return {
        title: category === "all" ? "No unread notifications" : `No unread ${current}`,
        description: `You are all caught up on ${category === "all" ? "operational alerts" : current}. Turn off 'Unread only' to view event history.`,
      };
    }

    return {
      title: category === "all" ? "No notifications recorded" : `No ${current} recorded`,
      description: `Operational alerts for ${category === "all" ? "the grid" : current} will populate here as emergency events occur.`,
    };
  }, [category, unreadOnly]);

  function toggleChime() {
    const next = !chimeEnabled;
    setChimeEnabled(next);
    try {
      localStorage.setItem(CHIME_STORAGE_KEY, String(next));
    } catch {
      // localStorage sandboxed
    }
    if (next) {
      playP1Chime(); // User gesture confirms audio permission
    }
  }

  function handleNotificationClick(n: Notification) {
    if (!n.readAt) {
      markRead.mutate(n.id);
    }

    // Role-aware click-through navigation
    const role = user?.role;
    if (role === "dispatcher") {
      navigate({ to: "/dispatch" });
    } else if (role === "driver") {
      navigate({ to: "/driver" });
    } else if (role === "citizen") {
      navigate({ to: "/citizen" });
    } else if (role === "admin") {
      navigate({ to: "/admin" });
    }

    onClose();
  }

  if (!open) return null;

  const content = (
    <div className="flex h-full flex-col overflow-hidden bg-elevated">
      {/* Header Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-priority-p1/15 px-2 py-0.5 text-xs font-mono font-bold text-priority-p1">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* P1 Chime Audio Toggle */}
          <button
            type="button"
            onClick={toggleChime}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground",
              chimeEnabled && "border-primary/40 bg-primary/10 text-primary",
            )}
            title={
              chimeEnabled
                ? "P1 audio chime enabled (click to disable)"
                : "Enable P1 audio chime alert"
            }
            aria-label={chimeEnabled ? "Disable P1 chime" : "Enable P1 chime"}
          >
            {chimeEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <CheckCheck className="h-3.5 w-3.5 text-primary" />
              <span>Mark all read</span>
            </button>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips & Unread Toggle */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface/70 px-3 py-2 overflow-x-auto">
        <div
          className="flex items-center gap-1 shrink-0"
          role="tablist"
          aria-label="Notification categories"
        >
          {(
            [
              { id: "all", label: "All" },
              { id: "urgent", label: "Urgent" },
              { id: "dispatch", label: "Dispatch" },
              { id: "system", label: "System" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors min-h-[28px] shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                category === c.id
                  ? "bg-elevated text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={unreadOnly}
          aria-label="Toggle unread notifications only"
          onClick={() => setUnreadOnly((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors border shrink-0 min-h-[28px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
            unreadOnly
              ? "bg-primary/15 text-primary border-primary/40 font-semibold"
              : "bg-surface-2 text-muted-foreground border-border hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              unreadOnly ? "bg-primary" : "bg-muted-foreground/40",
            )}
          />
          <span>Unread only</span>
        </button>
      </div>

      {/* Scrollable Notification List */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/60">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs">Loading operational alerts…</span>
          </div>
        )}

        {!isLoading && displayedNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <Inbox className="h-7 w-7 opacity-30 text-muted-foreground" />
            <div className="text-xs font-semibold text-foreground">{emptyState.title}</div>
            <p className="text-xs text-muted-foreground max-w-[240px]">{emptyState.description}</p>
          </div>
        )}

        {!isLoading &&
          displayedNotifications.slice(0, 50).map((n) => {
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                  isUnread ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-surface",
                )}
              >
                {/* Category Icon */}
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    n.group === "urgent"
                      ? "bg-priority-p1/15 text-priority-p1 border border-priority-p1/30"
                      : n.group === "dispatch"
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-surface-2 text-muted-foreground border border-border",
                  )}
                >
                  {n.group === "urgent" ? (
                    <Siren className="h-3.5 w-3.5" />
                  ) : n.group === "dispatch" ? (
                    <Radio className="h-3.5 w-3.5" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <span
                        className={cn(
                          "truncate text-xs",
                          isUnread
                            ? "font-bold text-foreground"
                            : "font-medium text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </span>
                    </div>

                    <span className="shrink-0 font-mono text-xs tnum text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>

                  {n.body && (
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.body}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  // Mobile Render: Full-Width Sheet (< 768px)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Render: Positioned Popover (>= 768px)
  return (
    <>
      <div className="fixed inset-0 z-[200] bg-transparent" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-full z-[220] mt-2 flex w-[380px] flex-col rounded-xl border border-border bg-elevated shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 max-h-[min(520px,calc(100vh-5rem))] overflow-hidden">
        {content}
      </div>
    </>
  );
}
