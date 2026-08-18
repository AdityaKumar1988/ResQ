import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Clock, Inbox, Loader2, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/notifications/use-notifications";
import { formatRelative } from "@/lib/ems/geo";
import type { Notification } from "@/types/notification";

/**
 * NotificationCenter — professional notification popover anchored to the notification bell.
 * - Sized proportionally (w-80 to w-96, max-h 460px) to prevent covering the operational map/feed.
 * - Internal scroll container for notification items.
 * - Accessible Esc key listener and outside click dismissal.
 */
export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: notifData, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [tab, setTab] = useState<"unread" | "all">("unread");

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const allNotifications = notifData?.all ?? [];
  const unreadNotifications = notifData?.unread ?? [];
  const unreadCount = notifData?.unreadCount ?? 0;

  const displayedNotifications = tab === "unread" ? unreadNotifications : allNotifications;

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <>
      {/* Invisible backdrop for outside click dismiss */}
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} aria-hidden="true" />

      {/* Popover anchored to the notification bell */}
      <div className="absolute right-0 top-full z-50 mt-2 flex w-[340px] sm:w-[380px] max-w-[calc(100vw-1.5rem)] flex-col rounded-xl border border-border-strong bg-elevated shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 max-h-[min(480px,calc(100vh-5rem))] overflow-hidden">
        {/* Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-2/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex shrink-0 border-b border-border bg-surface-2/60 px-3 py-1.5 gap-2">
          <button
            onClick={() => setTab("unread")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              tab === "unread"
                ? "bg-surface-3 text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("all")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              tab === "all"
                ? "bg-surface-3 text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>All History</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              ({allNotifications.length})
            </span>
          </button>
        </div>

        {/* Scrollable Notification List */}
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/60">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs">Loading notifications…</span>
            </div>
          )}

          {!isLoading && displayedNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
              <Inbox className="h-7 w-7 opacity-30 text-muted-foreground" />
              <div className="text-xs font-medium text-foreground/80">
                {tab === "unread" ? "No unread notifications" : "No notifications yet"}
              </div>
              <p className="text-[11px] text-muted-foreground max-w-[220px]">
                {tab === "unread"
                  ? "You're all caught up! Switch to 'All History' to see previous alerts."
                  : "Operational alerts will appear here as incidents are dispatched."}
              </p>
            </div>
          )}

          {!isLoading &&
            displayedNotifications
              .slice(0, 40)
              .map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={() => markRead.mutate(n.id)}
                />
              ))}
        </div>
      </div>
    </>
  );
}

function NotificationItem({
  notification: n,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: () => void;
}) {
  const isUnread = !n.readAt;
  const iconClass =
    n.kind === "incident_created"
      ? "bg-p1/20 text-p1"
      : n.kind === "incident_completed"
        ? "bg-status-available/20 text-status-available"
        : "bg-primary/20 text-primary";

  return (
    <div
      onClick={isUnread ? onMarkRead : undefined}
      className={cn(
        "group flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors",
        isUnread
          ? "cursor-pointer bg-primary/[0.04] hover:bg-primary/[0.08]"
          : "hover:bg-surface-2/60",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs",
          iconClass,
        )}
      >
        {n.kind === "incident_created" ? (
          <Siren className="h-3 w-3" />
        ) : n.kind === "incident_completed" ? (
          <Check className="h-3 w-3" />
        ) : (
          <Bell className="h-3 w-3" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={cn(
              "truncate text-xs font-semibold",
              isUnread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {n.title}
          </span>
          {isUnread ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              title="Mark as read"
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors shrink-0"
            >
              <Check className="h-3 w-3" />
              <span>Read</span>
            </button>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">Read</span>
          )}
        </div>
        {n.body && (
          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {n.body}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70">
          <Clock className="h-2.5 w-2.5" />
          {formatRelative(n.createdAt)}
        </div>
      </div>
    </div>
  );
}
