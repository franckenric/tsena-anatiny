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
import { notificationsService } from "../services/notifications.service";
import { useAuth } from "./AuthContext";
import type { Notification } from "../types/notification";

const POLL_INTERVAL_MS = 15000;

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  clear: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    setIsLoading(true);
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

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
      refresh,
      markAllRead,
      clear
    }),
    [notifications, unreadCount, isLoading, refresh, markAllRead, clear]
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
