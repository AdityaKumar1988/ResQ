import { client } from "./client";
import type { Notification } from "@/types/notification";

export interface NotificationsListResponse {
  notifications: Notification[];
}

export const notificationsApi = {
  list: () => client.get<NotificationsListResponse>("/notifications"),

  markRead: (id: string) => client.post<void>(`/notifications/${id}/read`),

  markAllRead: () => client.post<void>("/notifications/read-all"),
};
