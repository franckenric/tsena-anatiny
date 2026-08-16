import { useHistory } from "react-router-dom";
import {
  BellOff,
  CheckCheck,
  ChevronRight,
  RefreshCw,
  ShoppingCart,
  Trash2,
  UserPlus
} from "lucide-react";
import { useNotifications } from "../contexts/NotificationsContext";
import { Button, Card, Layout } from "../components/index";
import { cn } from "../lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "En cours",
  confirmed: "Confirmée",
  delivered: "Livrée",
  cancelled: "Annulée"
};

const formatAr = (value: number) =>
  `${Number(value || 0).toLocaleString("fr-FR")} Ar`;

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export function NotificationsPage() {
  const history = useHistory();
  const { notifications, unreadCount, isConnected, markAllRead, clear } =
    useNotifications();

  const openOrder = (orderId: number) => {
    history.push("/orders", { openOrderId: orderId });
  };

  return (
    <Layout title="Notifications">
      <Card
        title="Notifications"
        description={
          isConnected
            ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""} sur ${notifications.length}`
            : "Connexion temps réel indisponible"
        }
        headerAction={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={markAllRead}
              disabled={notifications.length === 0}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Tout marquer comme lu</span>
              <span className="sm:hidden">Tout lu</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={notifications.length === 0}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Tout effacer</span>
              <span className="sm:hidden">Effacer</span>
            </Button>
          </>
        }
        bodyClassName="p-0 sm:p-0"
      >
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <BellOff className="h-7 w-7 text-brand" />
            </div>
            <p className="font-semibold text-ink">
              Aucune notification pour le moment.
            </p>
            <p className="max-w-sm text-sm text-muted">
              Les nouvelles commandes et les changements de statut apparaîtront
              ici en temps réel.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {notifications.map((notification) => {
              if (notification.kind === "account.created") {
                const account = notification.data;
                return (
                  <li key={notification.id}>
                    <div
                      className={cn(
                        "flex w-full items-start gap-3 px-2.5 py-3 sm:gap-4 sm:px-3 sm:py-4 md:px-6",
                        !notification.read && "bg-brand/5"
                      )}
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand sm:h-10 sm:w-10">
                        <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2 sm:gap-3">
                          <span className="truncate text-[13px] font-bold text-ink sm:text-sm">
                            Nouveau compte client
                          </span>
                          {!notification.read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted sm:text-xs">
                          {account.customer_name ?? "Client"}
                          {account.customer_phone
                            ? ` · ${account.customer_phone}`
                            : ""}
                        </span>
                        <span className="mt-0.5 block text-[13px] font-medium text-ink sm:text-sm">
                          OTP envoyé par SMS
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted sm:text-[11px]">
                          {formatDateTime(notification.receivedAt)}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              }
              const isNewOrder = notification.kind === "order.created";
              const previousLabel = notification.data.previous_status
                ? STATUS_LABELS[notification.data.previous_status]
                : undefined;
              const nextLabel = notification.data.status
                ? STATUS_LABELS[notification.data.status]
                : notification.data.status;
              const reference = notification.data.order_number
                ? `#${notification.data.order_number}`
                : `#${notification.data.order_id}`;
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openOrder(notification.data.order_id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-2.5 py-3 text-left transition hover:bg-brand/5 sm:gap-4 sm:px-3 sm:py-4 md:px-6",
                      !notification.read && "bg-brand/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10",
                        isNewOrder
                          ? "bg-brand/15 text-brand"
                          : "bg-warning/15 text-warning"
                      )}
                    >
                      {isNewOrder ? (
                        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2 sm:gap-3">
                        <span className="truncate text-[13px] font-bold text-ink sm:text-sm">
                          {isNewOrder ? "Nouvelle commande" : "Statut modifié"}
                        </span>
                        {!notification.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted sm:text-xs">
                        {reference}
                        {notification.data.customer_name
                          ? ` · ${notification.data.customer_name}`
                          : ""}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-medium text-ink sm:text-sm">
                        {isNewOrder
                          ? `${nextLabel ?? ""} · ${formatAr(
                              notification.data.total
                            )}`
                          : previousLabel && nextLabel
                            ? `${previousLabel} → ${nextLabel}`
                            : (nextLabel ?? "")}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted sm:text-[11px]">
                        {formatDateTime(notification.receivedAt)}
                      </span>
                    </span>
                    <span className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Layout>
  );
}
