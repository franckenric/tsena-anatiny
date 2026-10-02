import { apiFetch } from "./api";
import type {
  Notification,
  NotificationListResponse
} from "../types/notification";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/+$/,
  ""
);

/**
 * Evenements pousses par l'API (`/ws/notifications`). Le serveur ne diffuse
 * au client que les evenements qui le concernent : un client connecte avec
 * son propre jeton recoit ses changements de statut de commande.
 */
export type NotificationEvent = {
  type: "order.created" | "order.status_changed" | "account.created";
  data: Record<string, unknown>;
};

export function buildWebSocketUrl(token: string): string {
  let origin: string;
  if (/^https?:\/\//.test(API_BASE_URL)) {
    origin = API_BASE_URL.replace(/\/api\/v1$/i, "");
  } else {
    origin = `${window.location.protocol}//${window.location.host}`;
  }
  return `${origin.replace(/^http/, "ws")}/ws/notifications?token=${encodeURIComponent(
    token
  )}`;
}

export function parseNotificationEvent(raw: string): NotificationEvent | null {
  try {
    const payload = JSON.parse(raw) as NotificationEvent;
    if (
      !payload ||
      (payload.type !== "order.created" &&
        payload.type !== "order.status_changed" &&
        payload.type !== "account.created") ||
      !payload.data
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const notificationsService = {
  async list(customerId?: number): Promise<NotificationListResponse> {
    const qs = customerId ? `?customer_id=${customerId}` : "";
    return apiFetch<NotificationListResponse>(`/notifications${qs}`);
  },

  async markAllRead(customerId?: number): Promise<{ success: boolean }> {
    const qs = customerId ? `?customer_id=${customerId}` : "";
    return apiFetch(`/notifications/read-all${qs}`, { method: "POST" });
  },

  async clear(customerId?: number): Promise<{ success: boolean }> {
    const qs = customerId ? `?customer_id=${customerId}` : "";
    return apiFetch(`/notifications${qs}`, { method: "DELETE" });
  }
};

export type { Notification, NotificationListResponse };
