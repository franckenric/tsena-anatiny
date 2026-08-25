import { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useI18n } from "../contexts/I18nContext";
import {
  cartItemsService,
  promoCodesService
} from "../services/operations.service";
import { PageLoader, Spinner } from "../components/Spinner";
import { Page } from "../components/Page";
import { formatAr, formatPhoneMadagascar } from "../lib/utils";
import { computeDiscountAmount, getAppliedPromo, setAppliedPromo, type AppliedPromo } from "../lib/promo";

export function CheckoutPage() {
  const { customer, isBooting, apiUser } = useAuth();
  const { clear } = useCart();
  const { t } = useI18n();
  const history = useHistory();

  const [items, setItems] = useState<Awaited<
    ReturnType<typeof cartItemsService.getCartItems>
  >>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(customer?.delivery_address ?? "");
  const [note, setNote] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);

  useEffect(() => {
    if (isBooting) return;
    if (!customer) {
      history.push("/connexion", { from: "/commande" });
      return;
    }
    setAddress(customer.delivery_address ?? "");
    let cancelled = false;
    cartItemsService
      .getCartItems(customer.id)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("error.loadCart")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBooting, customer?.id]);

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
    0
  );

  // Revalidate the applied promo code against the real cart subtotal.
  useEffect(() => {
    const stored = getAppliedPromo();
    if (!stored || items.length === 0) return;
    let cancelled = false;
    promoCodesService
      .validate(stored.code, subtotal)
      .then(() => {
        if (!cancelled) setPromo(stored);
      })
      .catch(() => {
        setAppliedPromo(null);
        if (!cancelled) setPromo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [items.length, subtotal]);

  const discount = promo ? computeDiscountAmount(promo, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);

  const handleConfirm = async () => {
    if (!customer) return;
    if (items.length === 0) return;
    if (!apiUser) {
      setError(t("checkout.sessionInvalid"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const order = await cartItemsService.checkout(customer.id, {
        user_id: apiUser.id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        delivery_address: address.trim() || undefined,
        status: "draft",
        note: note.trim() || undefined,
        promo_code: promo?.code
      });
      clear();
      setAppliedPromo(null);
      history.push(`/succes/${order.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("checkout.errorOrder")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBooting || isLoading) {
    return (
      <Page>
        <PageLoader label={t("checkout.prepare")} />
      </Page>
    );
  }

  if (!customer) return <Page />;

  if (items.length === 0) {
    return (
      <Page>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <p className="text-2xl font-bold text-ink">{t("cart.empty")}</p>
          <Link to="/" className="text-sm font-semibold text-brand">
            {t("common.seeShop")}
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-4 py-10 pb-12 sm:px-6">
      <Link
        to="/panier"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("checkout.backToCart")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">
        {t("checkout.title")}
      </h1>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-3xl border border-border bg-panel p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">
              {t("checkout.delivery")}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t("checkout.customer")}
                </label>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {customer.name}
                </p>
                <p className="text-sm text-muted">
                  {formatPhoneMadagascar(customer.phone)}
                </p>
              </div>
              <div>
                <label
                  htmlFor="address"
                  className="text-xs font-semibold uppercase tracking-widest text-muted"
                >
                  {t("checkout.address")}
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Lot II A 25, Antananarivo"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="note"
                  className="text-xs font-semibold uppercase tracking-widest text-muted"
                >
                  {t("checkout.note")}
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={t("checkout.notePlaceholder")}
                  className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-panel p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">
              {t("checkout.items")}
            </h2>
            <ul className="mt-4 divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-semibold text-ink">
                      {item.product?.name ?? `Produit #${item.product_id}`}
                    </p>
                    <p className="text-xs text-muted">
                      {item.variant?.name ? `${t("common.variant")}: ${item.variant.name} · ` : ""}
                      {t("common.quantity")}: {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-ink">
                    {formatAr(Number(item.quantity) * Number(item.unit_cost || 0))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="h-fit rounded-3xl border border-border bg-panel p-6 shadow-card lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-ink">
            {t("checkout.payment")}
          </h2>
          <p className="mt-2 text-xs text-muted">
            {t("checkout.paymentHint")}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t("common.subtotal")}</dt>
              <dd className="font-semibold text-ink">{formatAr(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t("common.delivery")}</dt>
              <dd className="font-semibold text-ink">
                {t("common.toConvene")}
              </dd>
            </div>
            {discount > 0 && promo && (
              <div className="flex justify-between text-success">
                <dt>{t("checkout.discount", { code: promo.code })}</dt>
                <dd className="font-semibold">-{formatAr(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3">
              <dt className="font-bold text-ink">{t("common.total")}</dt>
              <dd className="text-xl font-bold text-brand">
                {formatAr(total)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                {t("checkout.saving")}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {t("checkout.confirm")}
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </Page>
  );
}
