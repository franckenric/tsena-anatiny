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
  EMPTY_PRESENCE,
  fetchNotifications,
  fetchPresence,
  markAllNotificationsRead,
  markNotificationRead,
  parseNotificationEvent,
  type AccountCreatedData,
  type OrderNotificationData,
  type PresenceStats,
  type RestNotification,
  type RestNotificationsResponse
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
  /** Live counters of the users connected to the front-office. */
  presence: PresenceStats;
  markAllRead: () => Promise<void>;
  /** Marque une notification comme lue (localement + sur l'API). */
  markRead: (id: string) => Promise<void>;
  clear: () => Promise<void>;
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

/**
 * Fusionne la derniere reponse REST dans l'etat local.
 *
 * La reponse serveur fait foi : une notification deja connue est remplacee
 * par sa version serveur, et notamment par son etat `read`. Sans cela, un
 * marquage lu effectue depuis un autre onglet (ou par « Tout lu ») ne
 * remonterait jamais ici et le badge restait faux jusqu'au rechargement.
 * Les entrees locales absentes de la reponse (les plus anciennes, au dela
 * de la fenetre de 50) sont conservees.
 */
function mergeItems(
  current: NotificationItem[],
  incoming: NotificationItem[]
): NotificationItem[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, item);
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    )
    .slice(0, MAX_NOTIFICATIONS);
}

/**
 * `rest-42` -> 42. Seules les entrees issues de l'API ont un identifiant
 * serveur : elles seules peuvent etre marquees lu (`PATCH .../read`).
 */
function parseRestId(id: string): number | null {
  if (!id.startsWith("rest-")) return null;
  const parsed = Number(id.slice("rest-".length));
  return Number.isInteger(parsed) ? parsed : null;
}

export function NotificationsProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [orderRefreshKey, setOrderRefreshKey] = useState(0);
  const [presence, setPresence] = useState<PresenceStats>(EMPTY_PRESENCE);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  /**
   * Compteur d'invalidation : toute reponse REST recue AVANT une action
   * locale (marquage lu, effacement) est ignoree, sous peine de voir un
   * ancien compteur non-lu revenir par-dessus la mise a jour optimiste.
   */
  const mutationSeq = useRef(0);

  const applyRest = useCallback((payload: RestNotificationsResponse) => {
    const incoming = (payload.data ?? []).map(mapRestNotification);
    setNotifications((prev) => mergeItems(prev, incoming));
    // Le compteur serveur fait foi (il couvre aussi les notifications au
    // dela des 50 dernieres que la liste ne contient pas).
    const serverUnread = Number(payload.unread_count);
    setUnreadCount(
      Number.isFinite(serverUnread)
        ? serverUnread
        : incoming.filter((item) => !item.read).length
    );
  }, []);

  const syncFromRest = useCallback(async () => {
    const seq = mutationSeq.current;
    const payload = await fetchNotifications();
    if (seq !== mutationSeq.current) return;
    applyRest(payload);
  }, [applyRest]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    const seedFromRest = () => {
      const seq = mutationSeq.current;
      fetchNotifications()
        .then((payload) => {
          if (cancelled || seq !== mutationSeq.current) return;
          applyRest(payload);
        })
        .catch(() => {
          // API indisponible: on reste sur l'état courant
        });
    };

    // Snapshot initial: le WebSocket n'envoie un événement qu'au prochain
    // changement, il faut donc amorcer les compteurs au chargement.
    const seedPresence = () => {
      fetchPresence()
        .then((payload) => {
          if (cancelled) return;
          setPresence(payload);
        })
        .catch(() => {
          // API indisponible: on garde le dernier compteur connu
        });
    };

    seedFromRest();
    seedPresence();

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(buildWebSocketUrl(token));
      socketRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setIsConnected(true);
        seedFromRest();
        seedPresence();
      };

      ws.onmessage = (event) => {
        const payload = parseNotificationEvent(event.data as string);
        if (!payload) return;

        if (payload.type === "presence.updated") {
          setPresence(payload.data);
          return;
        }

        if (payload.type === "account.created") {
          const data = payload.data;
          // Envoi automatique de l'OTP par SMS depuis la SIM du téléphone
          // où le back-office est installé.
          if (data.customer_phone && data.otp) {
            void sendSms(
              data.customer_phone,
              `Tsena Anatiny : votre code de verification est ${data.otp}`
            );
          }
          // Le serveur persiste la notification AVANT de diffuser : relire
          // la liste donne l'element avec son identifiant serveur (necessaire
          // pour le marquage « lu ») et evite une copie locale qui serait
          // dupliquee au prochain rafraichissement.
          seedFromRest();
          return;
        }

        seedFromRest();
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
  }, [token, applyRest]);

  const markAllRead = useCallback(async () => {
    // Mise à jour optimiste immédiate, invalidée côté serveur juste après :
    // si l'API echoue, on resynchronise plutot que de laisser un compteur
    // « 0 » qui reviendrait au prochain rechargement.
    mutationSeq.current += 1;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      await syncFromRest().catch(() => {
        // API toujours indisponible: on garde l'état local
      });
    }
  }, [syncFromRest]);

  const markRead = useCallback(
    async (id: string) => {
      const target = notifications.find((item) => item.id === id);
      // Déjà lu (ou entrée sans identifiant serveur) : rien à faire.
      if (!target || target.read) return;

      mutationSeq.current += 1;
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      const serverId = parseRestId(id);
      if (serverId === null) return;
      try {
        await markNotificationRead(serverId);
      } catch {
        await syncFromRest().catch(() => {
          // API indisponible: on garde l'état local
        });
      }
    },
    [notifications, syncFromRest]
  );

  const clear = useCallback(async () => {
    mutationSeq.current += 1;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearNotifications();
    } catch {
      await syncFromRest().catch(() => {
        // API indisponible: la suppression reste locale
      });
    }
  }, [syncFromRest]);

  // Sans session, les compteurs ne sont plus rafraîchis: on les remet à zéro
  // plutôt que d'afficher une valeur figée.
  const livePresence = token ? presence : EMPTY_PRESENCE;
  // Même logique pour la liste et le badge : hors session, ils afficheraient
  // le dernier état connu sans jamais être resynchronisés.
  const liveNotifications = useMemo(
    () => (token ? notifications : []),
    [token, notifications]
  );
  const liveUnreadCount = token ? unreadCount : 0;

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications: liveNotifications,
      unreadCount: liveUnreadCount,
      isConnected,
      orderRefreshKey,
      presence: livePresence,
      markAllRead,
      markRead,
      clear
    }),
    [
      liveNotifications,
      liveUnreadCount,
      isConnected,
      orderRefreshKey,
      livePresence,
      markAllRead,
      markRead,
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
