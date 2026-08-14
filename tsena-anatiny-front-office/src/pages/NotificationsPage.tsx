import { useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  RefreshCw,
  ShoppingCart,
  Trash2
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { PageLoader } from "../components/Spinner";
import { Page } from "../components/Page";
import { cn, formatAr, formatDate } from "../lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "En cours",
  confirmed: "Confirmée",
  delivered: "Livrée",
  cancelled: "Annulée"
};

const formatTime = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

export function NotificationsPage() {
  const history = useHistory();
  const { customer, isBooting } = useAuth();
  const { notifications, unreadCount, isLoading, refresh, markAllRead, clear } =
    useNotifications();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (isBooting) {
    return (
      <Page>
        <PageLoader />
      </Page>
    );
  }

  if (!customer) {
    return (
      <Page>
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center sm:px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-brand-soft shadow-card">
            <Bell className="h-10 w-10 text-brand" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink">
              Connectez-vous
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Suivez l'évolution de vos commandes.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Link
              to="/connexion"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:bg-ink/90 active:scale-[0.98]"
            >
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/inscription"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-[0.98]"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mx-auto max-w-3xl px-4 py-6 pb-12 sm:px-6">
        <div className="animate-fade-up flex flex-col gap-5">
          <section className="rounded-[2rem] border border-border bg-panel p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
                  <Bell className="h-5 w-5 text-brand" />
                </span>
                <div>
                  <h1 className="font-display text-lg font-bold text-ink">
                    Mes notifications
                  </h1>
                  <p className="text-xs text-muted">
                    {unreadCount > 0
                      ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                      : "Tout est à jour"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={notifications.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand transition hover:bg-brand/15 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout marquer comme lu
                </button>
                <button
                  type="button"
                  onClick={() => void clear()}
                  disabled={notifications.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-panel px-3 py-2 text-xs font-bold text-muted transition hover:bg-bg hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Effacer
                </button>
              </div>
            </div>

            {isLoading && notifications.length === 0 ? (
              <div className="mt-6 space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-24 rounded-3xl" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-[1.5rem] border border-border bg-bg/50 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <Bell className="h-7 w-7 text-brand" />
                </div>
                <p className="font-semibold text-ink">
                  Aucune notification pour le moment.
                </p>
                <p className="max-w-sm text-sm text-muted">
                  Les changements de statut de vos commandes apparaîtront ici.
                </p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {notifications.map((notification) => {
                  const isNewOrder = notification.type === "order.created";
                  const previousLabel = notification.previous_status
                    ? STATUS_LABELS[notification.previous_status]
                    : undefined;
                  const nextLabel = notification.status
                    ? STATUS_LABELS[notification.status]
                    : notification.status;
                  const reference = notification.order_number
                    ? `#${notification.order_number}`
                    : notification.order_id
                      ? `#${notification.order_id}`
                      : "";
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() =>
                          notification.order_id &&
                          history.push(`/succes/${notification.order_id}`)
                        }
                        disabled={!notification.order_id}
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-3xl border p-4 text-left transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70 sm:p-5",
                          notification.read
                            ? "border-border bg-panel shadow-card hover:border-brand/30 hover:shadow-lift"
                            : "border-brand/30 bg-brand-soft/60 shadow-lift"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            isNewOrder
                              ? "bg-brand/15 text-brand"
                              : "bg-warning/15 text-warning"
                          )}
                        >
                          {isNewOrder ? (
                            <ShoppingCart className="h-5 w-5" />
                          ) : (
                            <RefreshCw className="h-5 w-5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-bold text-ink">
                              {isNewOrder
                                ? "Nouvelle commande"
                                : "Statut modifié"}
                            </span>
                            {!notification.read && (
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-muted">
                            {reference}
                            {notification.customer_name
                              ? ` · ${notification.customer_name}`
                              : ""}
                          </span>
                          <span className="mt-1 block text-sm font-medium text-ink">
                            {isNewOrder
                              ? `${nextLabel ?? ""} · ${formatAr(
                                  notification.total ?? 0
                                )}`
                              : previousLabel && nextLabel
                                ? `${previousLabel} → ${nextLabel}`
                                : (nextLabel ?? "")}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted">
                            {formatDate(notification.created_at ?? undefined)}{" "}
                            {formatTime(notification.created_at)}
                          </span>
                        </span>
                        {notification.order_id && (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}
