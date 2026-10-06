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
  /** Marque une notification comme lue (localement + sur l'API). */
  markRead: (id: number) => Promise<void>;
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
  /** Un rafraîchissement demandé pendant qu'un autre est en vol. */
  const pendingRefresh = useRef(false);
  /**
   * Compteur d'invalidation : toute reponse REST recue AVANT une action
   * locale (marquage lu, effacement) est ignoree, sous peine de voir un
   * ancien compteur de non-lues revenir par-dessus la mise a jour.
   */
  const mutationSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!customer) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    // Un evenement WebSocket arrive pendant une requete en vol : on le
    // met en file plutot que de l'ignorer (sinon la liste restait stale
    // jusqu'au prochain evenement).
    pendingRefresh.current = true;
    if (inflight.current) return;
    inflight.current = true;
    try {
      while (pendingRefresh.current) {
        pendingRefresh.current = false;
        const seq = mutationSeq.current;
        try {
          const payload = await notificationsService.list(customer.id);
          // Une action locale a eu lieu pendant la requete : reponse obsolete.
          if (seq !== mutationSeq.current) continue;
          const items = Array.isArray(payload?.data) ? payload.data : [];
          setNotifications(items);
          const serverUnread = Number(payload?.unread_count);
          setUnreadCount(
            Number.isFinite(serverUnread)
              ? serverUnread
              : items.filter((item) => !item.read).length
          );
        } catch {
          // API indisponible: on garde l'état actuel
        }
      }
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
    // Mise à jour optimiste immédiate : si l'API echoue on resynchronise
    // plutot que de laisser un compteur a 0 qui « revient » au rechargement.
    mutationSeq.current += 1;
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsService.markAllRead(customer.id);
    } catch {
      await refresh();
    }
  }, [customer, refresh]);

  const markRead = useCallback(
    async (id: number) => {
      if (!customer) return;
      const target = notifications.find((n) => n.id === id);
      // Déjà lu : aucune requête inutile.
      if (target?.read) return;

      mutationSeq.current += 1;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        await notificationsService.markRead(id, customer.id);
      } catch {
        // L'API refuse (404, jeton expire...) : on resynchronise pour que
        // l'etat affiche corresponde au serveur.
        await refresh();
      }
    },
    [customer, notifications, refresh]
  );

  const clear = useCallback(async () => {
    if (!customer) return;
    mutationSeq.current += 1;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await notificationsService.clear(customer.id);
    } catch {
      await refresh();
    }
  }, [customer, refresh]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isLive,
      refresh,
      markRead,
      markAllRead,
      clear
    }),
    [notifications, unreadCount, isLoading, isLive, refresh, markRead, markAllRead, clear]
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
