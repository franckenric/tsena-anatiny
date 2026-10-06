import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  RefreshCw,
  ShoppingCart,
  Trash2
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useI18n } from "../contexts/I18nContext";
import { usePageTitle } from "../contexts/PageTitleContext";
import { PageLoader } from "../components/Spinner";
import { Page } from "../components/Page";
import { cn, formatAr, formatDate } from "../lib/utils";

const STATUS_KEYS: Record<string, string> = {
  draft: "status.draft",
  confirmed: "status.confirmed",
  delivered: "status.delivered",
  cancelled: "status.cancelled"
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
  const { t } = useI18n();
  usePageTitle(t("notifications.title"));
  const { customer, isBooting } = useAuth();
  const { showLogin, showRegister } = useAuthModal();
  const { notifications, unreadCount, isLoading, refresh, markRead, markAllRead, clear } =
    useNotifications();

  // Un seul chargement a l'ouverture de la page : le WebSocket du contexte
  // rafraichit la liste quand un evenement arrive.
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
              {t("notifications.loginTitle")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("notifications.loginSub")}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={() => showLogin()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:bg-ink/90 active:scale-[0.98]"
            >
              {t("nav.login")}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => showRegister()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-[0.98]"
            >
              {t("nav.createAccount")}
            </button>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {/* `w-full` est indispensable : ce div est un `flex item` en colonne (Page).
            Avec `mx-auto` seul, les marges automatiques coupent l'alignement
            `stretch` et la largeur retombe sur la largeur min-content du
            contenu (~410px sur 320px de viewport). La carte deborde alors hors
            de l'ecran et `overflow-x: hidden` sur html/body la rogne sans
            possibilité de scroller. `page-shell` (index.css) fait de meme. */}
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-12 sm:px-6">
        <div className="animate-fade-up flex flex-col gap-5">
          {/* Meme strategie que le back-office (`Card`) : un en-tete a part
              avec son propre padding, puis une liste `divide-y` pleine largeur
              qui n'est plus enchastee dans des cartes a bordures. Chaque ligne
              garde ainsi toute la largeur de l'ecran sur mobile. */}
          <section className="overflow-hidden rounded-[2rem] border border-border bg-panel shadow-card">
            <div className="border-b border-border/50 bg-bg/40 p-5 sm:p-6">
              {/* `flex-wrap` est indispensable : sans lui, le groupe de gauche est
                    plafonne a sa largeur min-content et le compteur se fait
                    ecraser a 0px sur petit ecran (mesure : 0% de "12 tsy
                    voavaky" visible a 320px). Avec le retour a la ligne, le
                    compteur garde sa largeur naturelle ; `sm:shrink-0` le
                    protege aussi sur tablette. */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Le titre "Mes notifications" n'est plus affiche ici : il est
                    desormais dans l'en-tete (usePageTitle + Header). On garde
                    seulement l'icone et le compteur de non-lues. */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                      <Bell className="h-5 w-5 text-brand" />
                    </span>
                    <p className="truncate text-sm font-semibold text-ink sm:shrink-0">
                      {unreadCount > 0
                        ? t("notifications.unread", { count: unreadCount })
                        : t("notifications.upToDate")}
                    </p>
                  </div>
                {/* Libelles courts sous `sm` : les libelles FR/MG complets sont
                    plus larges que la colonne et faisaient deborder la carte
                    (`overflow-x: hidden` sur html/body rognait "Effacer"). */}
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    disabled={notifications.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand transition hover:bg-brand/15 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">
                      {t("notifications.markAllRead")}
                    </span>
                    <span className="sm:hidden">
                      {t("notifications.markRead")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void clear()}
                    disabled={notifications.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-panel px-3 py-2 text-xs font-bold text-muted transition hover:bg-bg hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="sm:hidden">
                      {t("notifications.clear")}
                    </span>
                    <span className="hidden sm:inline">
                      {t("notifications.clearAll")}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {isLoading && notifications.length === 0 ? (
              <div className="space-y-2 p-5 sm:p-6">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-20 rounded-2xl" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <Bell className="h-7 w-7 text-brand" />
                </div>
                <p className="font-semibold text-ink">
                  {t("notifications.empty")}
                </p>
                <p className="max-w-sm text-sm text-muted">
                  {t("notifications.emptyHint")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {notifications.map((notification) => {
                  const isNewOrder = notification.type === "order.created";
                  const previousLabel = notification.previous_status
                    ? t(STATUS_KEYS[notification.previous_status] ?? "status.draft")
                    : undefined;
                  const nextLabel = notification.status
                    ? t(STATUS_KEYS[notification.status] ?? "status.draft")
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
                        onClick={() => {
                          // Ouvrir la notification la marque comme lue :
                          // sans cet appel, le point « non lue » restait
                          // allumé indefiniment.
                          void markRead(notification.id);
                          if (notification.order_id) {
                            history.push(`/succes/${notification.order_id}`);
                          }
                        }}
                        disabled={!notification.order_id}
                        className={cn(
                          "group flex w-full items-start gap-3 px-4 py-3.5 text-left transition sm:gap-4 sm:px-5 sm:py-4",
                          "active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70",
                          notification.read
                            ? "hover:bg-brand/5"
                            : "bg-brand-soft/60"
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
                              {isNewOrder
                                ? t("notifications.newOrder")
                                : t("notifications.statusChanged")}
                            </span>
                            {!notification.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted sm:text-xs">
                            {reference}
                            {notification.customer_name
                              ? ` · ${notification.customer_name}`
                              : ""}
                          </span>
                          <span className="mt-0.5 block break-words text-[13px] font-medium text-ink sm:text-sm">
                            {isNewOrder
                              ? `${nextLabel ?? ""} · ${formatAr(
                                  notification.total ?? 0
                                )}`
                              : previousLabel && nextLabel
                                ? `${previousLabel} → ${nextLabel}`
                                : (nextLabel ?? "")}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted sm:text-[11px]">
                            {formatDate(notification.created_at ?? undefined)}{" "}
                            {formatTime(notification.created_at)}
                          </span>
                        </span>
                        {/* La fleche consomme 36px sur mobile : on la masque
                            sous `sm`, comme dans le back-office. */}
                        {notification.order_id && (
                          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white sm:flex">
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
