import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  buildWebSocketUrl,
  notificationsService,
  parseNotificationEvent
} from "../services/notifications.service";
import { getStoredApiToken } from "../services/api";
import { useAuth } from "./AuthContext";
import type { Notification } from "../types/notification";

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  /** Le client est connecte au WebSocket de l'API. */
  isLive: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  clear: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

const RECONNECT_DELAY_MS = 5000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (!customer) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    if (inflight.current) return;
    inflight.current = true;
    try {
      const payload = await notificationsService.list(customer.id);
      const items = Array.isArray(payload?.data) ? payload.data : [];
      setNotifications(items);
      setUnreadCount(Number(payload?.unread_count) || 0);
    } catch {
      // API indisponible: on garde l'état actuel
    } finally {
      inflight.current = false;
      setIsLoading(false);
    }
  }, [customer]);

  // Un seul appel a la connexion du client : la liste n'est plus rechargée en
  // arriere-plan, c'est le WebSocket qui signale les nouveaux evenements.
  useEffect(() => {
    setIsLoading(true);
    void refresh();
  }, [refresh]);

  // Push temps reel : on ne recharge la liste que lorsqu'un evenement arrive.
  useEffect(() => {
    const token = getStoredApiToken();
    if (!customer || !token) {
      setIsLive(false);
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        socket = new WebSocket(buildWebSocketUrl(token));
      } catch {
        socket = null;
      }

      socket?.addEventListener("open", () => {
        if (!closed) setIsLive(true);
      });

      socket?.addEventListener("message", (event) => {
        const payload = parseNotificationEvent(event.data as string);
        if (!payload) return;
        void refresh();
      });

      socket?.addEventListener("close", () => {
        if (closed) return;
        setIsLive(false);
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      });

      socket?.addEventListener("error", () => {
        socket?.close();
      });
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
      setIsLive(false);
    };
  }, [customer, refresh]);

  const markAllRead = useCallback(async () => {
    if (!customer) return;
    try {
      await notificationsService.markAllRead(customer.id);
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch {
      // ignore
    }
  }, [customer]);

  const clear = useCallback(async () => {
    if (!customer) return;
    try {
      await notificationsService.clear(customer.id);
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, [customer]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isLive,
      refresh,
      markAllRead,
      clear
    }),
    [notifications, unreadCount, isLoading, isLive, refresh, markAllRead, clear]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications doit être utilisé dans <NotificationsProvider>"
    );
  return ctx;
}
