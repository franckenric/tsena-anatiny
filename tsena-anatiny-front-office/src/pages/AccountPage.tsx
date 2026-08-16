import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MapPin,
  PackageCheck,
  PackageSearch,
  ShoppingCart,
  Sparkles,
  UserRound
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { ordersService } from "../services/operations.service";
import type { Order, OrderStatus } from "../types/operations";
import { PageLoader } from "../components/Spinner";
import { StatusBadge } from "../components/StatusBadge";
import { Page } from "../components/Page";
import { formatAr, formatDate, formatPhoneMadagascar } from "../lib/utils";
import { getOrderLineItems, getOrderTotal } from "../lib/orders";

const ORDERS_PAGE_SIZE = 10;

function paginationItems(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const candidates = [1, total, current - 1, current, current + 1];
  const sorted = [...new Set(candidates)]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push("ellipsis");
    items.push(p);
    prev = p;
  }
  return items;
}

export function AccountPage() {
  const { customer, isBooting, logout } = useAuth();
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (targetPage: number) => {
      if (!customer) return;
      try {
        setIsLoadingOrders(true);
        setError(null);
        const data = await ordersService.getOrdersByCustomer(
          customer.id,
          targetPage,
          ORDERS_PAGE_SIZE
        );
        setOrders(data.items);
        setTotalOrders(data.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("account.errorOrders")
        );
      } finally {
        setIsLoadingOrders(false);
      }
    },
    [customer, t]
  );

  const loadAllOrders = useCallback(async () => {
    if (!customer) return;
    try {
      const data = await ordersService.getOrdersByCustomer(customer.id, 1, 500);
      setAllOrders(data.items);
    } catch {
      // les statistiques restent partielles
    }
  }, [customer]);

  useEffect(() => {
    if (!isBooting && customer) {
      void loadOrders(1);
      void loadAllOrders();
    }
  }, [isBooting, customer, loadOrders, loadAllOrders]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1) return;
      setPage(targetPage);
      void loadOrders(targetPage);
    },
    [loadOrders]
  );

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
            <UserRound className="h-10 w-10 text-brand" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink">
              {t("account.loginTitle")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("account.loginSub")}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Link
              to="/connexion"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:bg-ink/90 active:scale-[0.98]"
            >
              {t("nav.login")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/inscription"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-[0.98]"
            >
              {t("nav.createAccount")}
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  const orderedOrders = [...orders].sort((a, b) => {
    const aTime = new Date(a.created_at ?? 0).getTime();
    const bTime = new Date(b.created_at ?? 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return (b.id ?? 0) - (a.id ?? 0);
  });

  const orderTotal = (order: Order): number => getOrderTotal(order);

  const totalSpent = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + orderTotal(o), 0);

  const inProgressCount = allOrders.filter(
    (o) => o.status === "confirmed" || o.status === "draft"
  ).length;

  const totalPages = Math.max(1, Math.ceil(totalOrders / ORDERS_PAGE_SIZE));
  const startIndex = (page - 1) * ORDERS_PAGE_SIZE + 1;
  const endIndex = Math.min(startIndex + ORDERS_PAGE_SIZE - 1, totalOrders);

  const initials = (customer.name || "?").trim().charAt(0).toUpperCase();
  const firstName = (customer.name ?? "").trim().split(" ")[0] ?? "";

  const stats = [
    {
      label: t("account.orders"),
      value: String(totalOrders),
      icon: ShoppingCart,
      className: "text-brand bg-brand/10"
    },
    {
      label: t("account.inProgress"),
      value: String(inProgressCount),
      icon: PackageSearch,
      className: "text-sky-600 bg-sky-100"
    },
    {
      label: t("account.totalSpent"),
      value: formatAr(totalSpent),
      icon: Banknote,
      className: "text-success bg-success/10",
      wide: true
    }
  ];

  return (
    <Page>
      <div className="mx-auto max-w-5xl px-4 py-6 pb-12 sm:px-6">
        <div className="animate-fade-up flex flex-col gap-5">
          {/* Profil */}
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#7c2d12] via-brand to-[hsl(16_85%_14%)] p-5 text-white shadow-glow sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute right-8 top-8 h-14 w-14 rounded-full border border-white/15" />
            <div className="pointer-events-none absolute right-16 top-16 h-8 w-8 rounded-full border border-white/10" />

            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold ring-1 ring-white/20 backdrop-blur-sm sm:h-20 sm:w-20 sm:text-3xl">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("account.profile")}
                  </p>
                  <h1 className="truncate text-xl font-bold sm:text-2xl">
                    {firstName}
                  </h1>
                  <p className="truncate text-sm text-white/85">
                    {formatPhoneMadagascar(customer.phone)}
                  </p>
                </div>
              </div>

              {customer.delivery_address && (
                <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white/10 px-3.5 py-3 text-sm leading-relaxed text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="min-w-0">{customer.delivery_address}</span>
                </p>
              )}

              <button
                type="button"
                onClick={logout}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-brand shadow-lg transition hover:bg-white/90 active:scale-[0.98] sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </button>
            </div>
          </section>

          {/* Statistiques */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, className, wide }) => (
              <div
                key={label}
                className={`flex flex-col gap-2.5 rounded-3xl border border-border bg-panel p-4 shadow-card sm:p-5 ${
                  wide ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    {label}
                  </span>
                </div>
                <p className="truncate text-lg font-extrabold text-ink sm:text-xl">
                  {value}
                </p>
              </div>
            ))}
          </section>

          {/* Commandes */}
          <section className="rounded-[2rem] border border-border bg-panel p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-soft">
                  <PackageCheck className="h-4 w-4 text-brand" />
                </span>
                {t("account.myOrders")}
              </h2>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-2.5 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/15 active:scale-95"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {t("account.newOrder")}
              </Link>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {isLoadingOrders ? (
              <div className="mt-6 space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-24 rounded-3xl" />
                ))}
              </div>
            ) : orderedOrders.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-[1.5rem] border border-border bg-bg/50 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <PackageSearch className="h-7 w-7 text-brand" />
                </div>
                <p className="font-semibold text-ink">
                  {t("account.noOrders")}
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-95"
                >
                  {t("common.discoverShop")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {orderedOrders.map((order) => {
                  const lines = getOrderLineItems(order);
                  const total = orderTotal(order);
                  const orderOtherPrice = Number(order.another_price || 0);
                  const otherPriceReason = (order.other_price_reason || "").trim();
                  const hasOtherPrice =
                    orderOtherPrice > 0 ||
                    lines.some((line) => Number(line.another_price || 0) > 0);
                  const firstProduct =
                    lines[0]?.product_name ?? t("account.orderFallback");
                  const firstVariant = lines[0]?.variant_name;
                  const extraCount = lines.length - 1;
                  const reference = order.order_number ?? `#${order.id}`;
                  return (
                    <li key={order.id}>
                      <Link
                        to={`/succes/${order.id}`}
                        className="group block rounded-3xl border border-border bg-panel p-4 shadow-card transition hover:border-brand/30 hover:shadow-lift active:scale-[0.99] sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-ink">
                              {reference}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted">
                              {firstProduct}
                              {firstVariant ? ` — ${firstVariant}` : ""}
                              {extraCount > 0 &&
                                t("account.extra", { count: extraCount })}
                            </p>
                          </div>
                          <StatusBadge
                            status={(order.status ?? "draft") as OrderStatus}
                          />
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                              {formatDate(order.created_at)}
                            </p>
                            {hasOtherPrice && (
                              <p className="mt-0.5 text-[11px] font-semibold text-accent">
                                {otherPriceReason
                                  ? t("account.extraFees", {
                                      reason: otherPriceReason
                                    })
                                  : t("account.extraFeesIncluded")}
                              </p>
                            )}
                            <p className="mt-0.5 text-base font-extrabold text-brand">
                              {formatAr(total)}
                            </p>
                          </div>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {totalOrders > 0 && (
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted">
                  {t("account.showing", {
                    start: startIndex,
                    end: endIndex,
                    total: totalOrders
                  })}
                </p>
                <nav className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    aria-label={t("account.prevPage")}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-panel text-ink transition hover:border-brand/40 hover:text-brand active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {paginationItems(page, totalPages).map((item, idx) =>
                    item === "ellipsis" ? (
                      <span
                        key={`e-${idx}`}
                        className="px-1 text-sm font-semibold text-muted"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => goToPage(item)}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold transition active:scale-95 ${
                          item === page
                            ? "bg-brand text-white shadow-glow"
                            : "border border-border bg-panel text-muted hover:border-brand/40 hover:text-brand"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    aria-label={t("account.nextPage")}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-panel text-ink transition hover:border-brand/40 hover:text-brand active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              </div>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}
