import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock3, PackageCheck } from "lucide-react";
import { cartItemsService, ordersService } from "../services/operations.service";
import type { Order, OrderStatus } from "../types/operations";
import { PageLoader } from "../components/Spinner";
import { StatusBadge } from "../components/StatusBadge";
import { Page } from "../components/Page";
import { formatAr, formatDate } from "../lib/utils";
import {
  getOrderLineItems,
  getOrderLineItemsFromCart,
  getOrderOtherPriceReason,
  getOrderTotal,
  type OrderLineItem
} from "../lib/orders";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";

export function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { customer } = useAuth();
  const { t } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [fallbackItems, setFallbackItems] = useState<OrderLineItem[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      setError(t("order.notFound"));
      setIsLoading(false);
      return;
    }
    ordersService
      .getOrder(id)
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
        const directItems = data ? getOrderLineItems(data) : [];
        if (data && directItems.length === 0 && customer) {
          return cartItemsService
            .getCartItemsWithProducts(customer.id)
            .then((items) => {
              if (!cancelled) setFallbackItems(getOrderLineItemsFromCart(items));
            })
            .catch(() => {
              if (!cancelled) setFallbackItems([]);
            });
        }
        return undefined;
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("error.generic"));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, customer, t]);

  if (isLoading) {
    return (
      <Page>
        <PageLoader label={t("order.loading")} />
      </Page>
    );
  }

  if (error || !order) {
    return (
      <Page>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <p className="text-2xl font-bold text-ink">
            {error ?? t("order.notFound")}
          </p>
          <Link to="/" className="text-sm font-semibold text-brand">
            {t("common.backToShop")}
          </Link>
        </div>
      </Page>
    );
  }

  const items = fallbackItems ?? getOrderLineItems(order);
  const total = getOrderTotal(order, items);
  const productsTotal = items.reduce(
    (sum, line) => sum + line.quantity * line.unit_cost,
    0
  );
  const orderOtherPrice = Number(order.another_price || 0);
  const movementOtherPrice = items.reduce(
    (sum, line) => sum + line.another_price,
    0
  );
  const otherPrice = orderOtherPrice > 0 ? orderOtherPrice : movementOtherPrice;
  const discount = Number(order.discount || 0);
  const otherPriceReason = getOrderOtherPriceReason(order, items);
  const status = (order.status ?? "draft") as OrderStatus;
  const isConfirmed = status === "confirmed" || status === "delivered";

  return (
    <Page>
      <div className="mx-auto max-w-2xl px-4 py-12 pb-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-panel p-8 text-center shadow-card">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isConfirmed ? "bg-brand/10" : "bg-blue-100"
          }`}
        >
          {isConfirmed ? (
            <CheckCircle2 className="h-9 w-9 text-brand" />
          ) : (
            <Clock3 className="h-9 w-9 text-blue-600" />
          )}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {isConfirmed
            ? t("order.confirmedTitle")
            : t("order.createdTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t("order.cmd")}{" "}
          <span className="font-semibold text-ink">
            {order.order_number ?? `#${order.id}`}
          </span>{" "}
          {t("order.on")} {formatDate(order.created_at)}
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3">
          <StatusBadge status={status} />
          <p className="text-xs text-muted">
            {isConfirmed
              ? t("order.confirmedHint")
              : t("order.draftHint")}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-panel p-6 shadow-card">
        <h2 className="text-lg font-bold text-ink">{t("order.title")}</h2>
        <ul className="mt-4 divide-y divide-border">
          {items.length === 0 && (
            <li className="py-3 text-sm text-muted">
              {t("order.noItems")}
            </li>
          )}
          {items.map((item, index) => (
            <li
              key={item.variant_id ?? item.product_id ?? index}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="line-clamp-1 font-semibold text-ink">
                  {item.product_name}
                </p>
                <p className="text-xs text-muted">
                  {item.variant_name ? `${t("common.variant")}: ${item.variant_name} · ` : ""}
                  {t("common.quantity")}: {item.quantity}
                </p>
              </div>
              <span className="shrink-0 font-semibold text-ink">
                {formatAr(item.quantity * item.unit_cost)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t("common.subtotal")}</dt>
            <dd className="font-semibold text-ink">{formatAr(productsTotal)}</dd>
          </div>
          {otherPrice > 0 && (
            <div className="flex justify-between">
              <dt className="max-w-[60%] text-muted">
                {t("order.extraFees")}
                {otherPriceReason ? ` (${otherPriceReason})` : ""}
              </dt>
              <dd className="font-semibold text-ink">
                {formatAr(otherPrice)}
              </dd>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>{t("checkout.discount", { code: order.promo_code ?? "" })}</dt>
              <dd className="font-semibold">-{formatAr(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-3">
            <span className="font-bold text-ink">{t("common.total")}</span>
            <span className="text-xl font-bold text-brand">
              {formatAr(total)}
            </span>
          </div>
        </dl>
      </div>

      {order.customer?.delivery_address && (
        <div className="mt-6 rounded-3xl border border-border bg-panel p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">{t("order.delivery")}</h2>
          <p className="mt-2 text-sm text-muted">
            {order.customer.delivery_address}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          to="/compte"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90"
        >
          <PackageCheck className="h-4 w-4" />
          {t("order.track")}
        </Link>
        <Link to="/" className="text-sm font-semibold text-muted hover:text-brand">
          {t("order.continue")}
        </Link>
      </div>
      </div>
    </Page>
  );
}
