import { useState } from "react";
import { Bell, Check, CheckCheck, Clock, Loader2, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/notifications/use-notifications";
import { formatRelative } from "@/lib/ems/geo";
import type { Notification } from "@/types/notification";

/**
 * NotificationCenter — dropdown panel toggled from the Bell icon in AppShell.
 * Shows a list of real notifications with read/unread states and mark-all-read.
 */
export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: notifData, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!open) return null;

  const notifications = notifData?.all ?? [];
  const unreadCount = notifData?.unreadCount ?? 0;

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border-strong bg-elevated shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
              <Bell className="h-5 w-5 opacity-40" />
              <span className="text-xs">No notifications yet</span>
            </div>
          )}

          {!isLoading &&
            notifications
              .slice(0, 30)
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
    <button
      onClick={isUnread ? onMarkRead : undefined}
      className={cn(
        "flex w-full items-start gap-2.5 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0",
        isUnread ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-surface-2",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded",
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
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-xs font-medium",
              isUnread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {n.title}
          </span>
          {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
        </div>
        {n.body && (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.body}</div>
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <Clock className="h-2.5 w-2.5" />
          {formatRelative(n.createdAt)}
        </div>
      </div>
    </button>
  );
}
