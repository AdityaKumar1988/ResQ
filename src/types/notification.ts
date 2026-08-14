export interface Notification {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}
