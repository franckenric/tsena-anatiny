import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useAuth } from "./AuthContext";
import {
  buildWebSocketUrl,
  clearNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  parseNotificationEvent,
  type AccountCreatedData,
  type NotificationKind,
  type OrderNotificationData,
  type RestNotification
} from "../services/notifications.service";
import { sendSms } from "../services/sms.service";

export type NotificationItem =
  | {
      id: string;
      kind: "order.created" | "order.status_changed";
      data: OrderNotificationData;
      read: boolean;
      receivedAt: string;
    }
  | {
      id: string;
      kind: "account.created";
      data: AccountCreatedData;
      read: boolean;
      receivedAt: string;
    };

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  orderRefreshKey: number;
  markAllRead: () => void;
  clear: () => void;
};

const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

const MAX_NOTIFICATIONS = 50;
const RECONNECT_DELAY_MS = 3000;

function mapRestNotification(notification: RestNotification): NotificationItem {
  if (notification.type === "account.created") {
    const data: AccountCreatedData = {
      account_id: notification.order_id ?? notification.id,
      customer_name: notification.customer_name,
      customer_phone: notification.customer_phone,
      otp: "",
      created_at: notification.created_at
    };
    return {
      id: `rest-${notification.id}`,
      kind: "account.created",
      data,
      read: notification.read,
      receivedAt: notification.created_at ?? new Date().toISOString()
    };
  }
  return {
    id: `rest-${notification.id}`,
    kind: notification.type,
    data: {
      order_id: notification.order_id ?? notification.id,
      order_number: notification.order_number,
      status: notification.status,
      previous_status: notification.previous_status,
      customer_name: notification.customer_name,
      customer_phone: notification.customer_phone,
      total: notification.total ?? 0,
      created_at: notification.created_at
    },
    read: notification.read,
    receivedAt: notification.created_at ?? new Date().toISOString()
  };
}

function mergeItems(
  current: NotificationItem[],
  incoming: NotificationItem[]
): NotificationItem[] {
  const seen = new Set(current.map((item) => item.id));
  const additions = incoming.filter((item) => !seen.has(item.id));
  return [...current, ...additions]
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    )
    .slice(0, MAX_NOTIFICATIONS);
}

export function NotificationsProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [orderRefreshKey, setOrderRefreshKey] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    const seedFromRest = () => {
      fetchNotifications()
        .then((payload) => {
          if (cancelled) return;
          const incoming = (payload.data ?? []).map(mapRestNotification);
          setNotifications((prev) => mergeItems(prev, incoming));
        })
        .catch(() => {
          // API indisponible: on reste sur l'état courant
        });
    };

    seedFromRest();

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(buildWebSocketUrl(token));
      socketRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setIsConnected(true);
        seedFromRest();
      };

      ws.onmessage = (event) => {
        const payload = parseNotificationEvent(event.data as string);
        if (!payload) return;

        if (payload.type === "account.created") {
          const data = payload.data;
          const item: NotificationItem = {
            id: `account-${data.account_id}-${Date.now()}`,
            kind: "account.created",
            data,
            read: false,
            receivedAt: new Date().toISOString()
          };
          setNotifications((prev) =>
            [item, ...prev].slice(0, MAX_NOTIFICATIONS)
          );
          // Envoi automatique de l'OTP par SMS depuis la SIM du téléphone
          // où le back-office est installé.
          if (data.customer_phone && data.otp) {
            void sendSms(
              data.customer_phone,
              `Tsena Anatiny : votre code de verification est ${data.otp}`
            );
          }
          return;
        }

        const kind: NotificationKind =
          payload.type === "order.status_changed"
            ? "order.status_changed"
            : "order.created";
        setNotifications((prev) =>
          [
            {
              id: `${payload.data.order_id}-${payload.type}-${Date.now()}`,
              kind,
              data: payload.data,
              read: false,
              receivedAt: new Date().toISOString()
            },
            ...prev
          ].slice(0, MAX_NOTIFICATIONS)
        );
        setOrderRefreshKey((key) => key + 1);
      };

      ws.onclose = () => {
        socketRef.current = null;
        if (cancelled) return;
        setIsConnected(false);
        reconnectTimer.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  const unreadCount = useMemo(
    () => notifications.reduce((sum, n) => sum + (n.read ? 0 : 1), 0),
    [notifications]
  );

  const markAllRead = useCallback(() => {
    markAllNotificationsRead().catch(() => {
      // API indisponible: la mise à jour reste locale
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    clearNotifications().catch(() => {
      // API indisponible: la suppression reste locale
    });
    setNotifications([]);
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isConnected,
      orderRefreshKey,
      markAllRead,
      clear
    }),
    [
      notifications,
      unreadCount,
      isConnected,
      orderRefreshKey,
      markAllRead,
      clear
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  }
  return context;
}
