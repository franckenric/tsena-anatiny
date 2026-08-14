import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { Bell, CheckCheck, ChevronRight, RefreshCw, ShoppingCart, X } from "lucide-react";
import { useNotifications } from "../contexts/NotificationsContext";
import { cn } from "../lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "En cours",
  confirmed: "Confirmée",
  delivered: "Livrée",
  cancelled: "Annulée"
};

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatAr = (value: number) =>
  `${Number(value || 0).toLocaleString("fr-FR")} Ar`;

export function NotificationsBell() {
  const history = useHistory();
  const {
    notifications,
    unreadCount,
    isConnected,
    markAllRead,
    clear
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const openOrder = (orderId: number) => {
    setOpen(false);
    history.push("/orders", { openOrderId: orderId });
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-bg hover:text-ink active:scale-95"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span
          className={cn(
            "absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full",
            isConnected ? "bg-success" : "bg-muted"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 flex max-h-[70vh] w-[min(calc(100vw-4.5rem),22rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-panel shadow-2xl shadow-black/10">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5">
            <p className="text-sm font-bold text-ink">Notifications</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-bg hover:text-ink"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout lu
              </button>
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-bg hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
                Effacer
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                Aucune notification pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {notifications.map((notification) => {
                  const isNewOrder = notification.kind === "order.created";
                  const previousLabel = notification.data.previous_status
                    ? STATUS_LABELS[notification.data.previous_status]
                    : undefined;
                  const nextLabel = notification.data.status
                    ? STATUS_LABELS[notification.data.status]
                    : notification.data.status;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => openOrder(notification.data.order_id)}
                        className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-brand/5"
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            isNewOrder
                              ? "bg-brand/15 text-brand"
                              : "bg-warning/15 text-warning"
                          )}
                        >
                          {isNewOrder ? (
                            <ShoppingCart className="h-4 w-4" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-ink">
                              {isNewOrder ? "Nouvelle commande" : "Statut modifié"}
                            </span>
                            {!notification.read && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {notification.data.order_number
                              ? `#${notification.data.order_number}`
                              : `#${notification.data.order_id}`}
                            {notification.data.customer_name
                              ? ` · ${notification.data.customer_name}`
                              : ""}
                          </span>
                          <span className="mt-0.5 block text-xs font-medium text-ink">
                            {isNewOrder
                              ? `${nextLabel ?? ""} · ${formatAr(notification.data.total)}`
                              : previousLabel && nextLabel
                                ? `${previousLabel} → ${nextLabel}`
                                : (nextLabel ?? "")}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted">
                            {formatTime(notification.receivedAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              history.push("/notifications");
            }}
            className="flex w-full items-center justify-center gap-1 border-t border-border/50 px-3 py-2.5 text-xs font-bold text-brand transition hover:bg-brand/5"
          >
            Tout voir
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
