export type OrderNotificationData = {
  order_id: number;
  order_number: string | null;
  status: string | null;
  previous_status?: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  created_at: string | null;
};

export type AccountCreatedData = {
  account_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  otp: string;
  created_at: string | null;
};

export type NotificationData = OrderNotificationData | AccountCreatedData;

export type OrderNotificationEvent =
  | { type: "order.created"; data: OrderNotificationData }
  | { type: "order.status_changed"; data: OrderNotificationData }
  | { type: "account.created"; data: AccountCreatedData };

export type NotificationKind =
  | "order.created"
  | "order.status_changed"
  | "account.created";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/+$/,
  ""
);

export function buildWebSocketUrl(token: string): string {
  let origin: string;
  if (/^https?:\/\//.test(API_BASE_URL)) {
    origin = API_BASE_URL.replace(/\/api\/v1$/i, "");
  } else {
    origin = `${window.location.protocol}//${window.location.host}`;
  }
  const wsUrl = origin.replace(/^http/, "ws");
  return `${wsUrl}/ws/notifications?token=${encodeURIComponent(token)}`;
}

export function parseNotificationEvent(
  raw: string
): OrderNotificationEvent | null {
  try {
    const payload = JSON.parse(raw) as OrderNotificationEvent;
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

// ---------------------------------------------------------------------------
// Persisted notifications (REST)
// ---------------------------------------------------------------------------

export type RestNotification = {
  id: number;
  user_id: number;
  type: NotificationKind;
  order_id: number | null;
  order_number: string | null;
  title: string | null;
  message: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number | null;
  previous_status: string | null;
  status: string | null;
  read: boolean;
  created_at: string | null;
};

export type RestNotificationsResponse = {
  count: number;
  unread_count: number;
  data: RestNotification[] | null;
};

const getToken = () => localStorage.getItem("tsena.auth.token");

async function restFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === "string" ? err.detail : `Erreur ${response.status}`
    );
  }
  return (await response.json()) as T;
}

export function fetchNotifications(): Promise<RestNotificationsResponse> {
  return restFetch("/notifications/");
}

export function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return restFetch("/notifications/read-all", { method: "POST" });
}

export function clearNotifications(): Promise<{ success: boolean }> {
  return restFetch("/notifications/", { method: "DELETE" });
}
