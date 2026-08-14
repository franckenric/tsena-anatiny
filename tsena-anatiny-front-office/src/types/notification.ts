export type NotificationType = "order.created" | "order.status_changed";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  order_id?: number | null;
  order_number?: string | null;
  title?: string | null;
  message?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total?: number;
  previous_status?: string | null;
  status?: string | null;
  read: boolean;
  created_at?: string | null;
}

export interface NotificationListResponse {
  count: number;
  unread_count: number;
  data?: Notification[] | null;
}
