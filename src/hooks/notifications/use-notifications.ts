import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications";
import { queryKeys } from "@/lib/queryKeys";
import type { Notification } from "@/types/notification";

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: notificationsApi.list,
    staleTime: 30_000,
    select: (data) => ({
      all: data.notifications,
      unread: data.notifications.filter((n) => !n.readAt),
      unreadCount: data.notifications.filter((n) => !n.readAt).length,
    }),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
      const snapshot = queryClient.getQueryData(queryKeys.notifications.all());
      queryClient.setQueryData(
        queryKeys.notifications.all(),
        (old: { notifications: Notification[] } | undefined) =>
          old
            ? {
                notifications: old.notifications.map((n) =>
                  n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
                ),
              }
            : old,
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(queryKeys.notifications.all(), ctx.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
      const snapshot = queryClient.getQueryData(queryKeys.notifications.all());
      const now = new Date().toISOString();
      queryClient.setQueryData(
        queryKeys.notifications.all(),
        (old: { notifications: Notification[] } | undefined) =>
          old
            ? {
                notifications: old.notifications.map((n) =>
                  !n.readAt ? { ...n, readAt: now } : n,
                ),
              }
            : old,
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(queryKeys.notifications.all(), ctx.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}
