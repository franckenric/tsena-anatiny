import { apiFetch } from "./api";
import type {
  Notification,
  NotificationListResponse
} from "../types/notification";

export const notificationsService = {
  async list(customerId?: number): Promise<NotificationListResponse> {
    const qs = customerId ? `?customer_id=${customerId}` : "";
    return apiFetch<NotificationListResponse>(`/notifications/${qs}`);
  },

  async markAllRead(customerId?: number): Promise<{ success: boolean }> {
    const qs = customerId ? `?customer_id=${customerId}` : "";
    return apiFetch(`/notifications/read-all${qs}`, { method: "POST" });
  },

  async clear(customerId?: number): Promise<{ success: boolean }> {
    const qs = customerId ? `?customer_id=${customerId}` : "";
    return apiFetch(`/notifications/${qs}`, { method: "DELETE" });
  }
};

export type { Notification, NotificationListResponse };
