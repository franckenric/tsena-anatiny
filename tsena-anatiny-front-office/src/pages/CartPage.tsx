import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ArrowRight, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { useCart } from "../contexts/CartContext";
import { useI18n } from "../contexts/I18nContext";
import { usePageTitle } from "../contexts/PageTitleContext";
import {
  cartItemsService,
  promoCodesService
} from "../services/operations.service";
import { PageLoader } from "../components/Spinner";
import { Page } from "../components/Page";
import { QuantityInput } from "../components/QuantityInput";
import { ProductImage } from "../components/ProductImage";
import { formatAr, resolveImageUrl } from "../lib/utils";
import {
  computeDiscountAmount,
  getAppliedPromo,
  setAppliedPromo,
  type AppliedPromo
} from "../lib/promo";
import {
  getGuestPromo,
  removeFromGuestCart,
  setGuestPromo,
  updateGuestCartQuantity
} from "../lib/guestCart";

export function CartPage() {
  const { isBooting } = useAuth();
  const { showLogin } = useAuthModal();
  const { items, isGuest, refresh } = useCart();
  const { t } = useI18n();
  usePageTitle(t("cart.myCart"));
  const history = useHistory();

  const [isUpdatingKey, setIsUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);

  // Les quantites sont mises a jour en place par le contexte pour les deux
  // sources de panier : une simple relecture suffit apres validation serveur.
  useEffect(() => {
    setPromo(isGuest ? getGuestPromo() : getAppliedPromo());
  }, [isGuest, items.length]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
        0
      ),
    [items]
  );

  useEffect(() => {
    const stored = isGuest ? getGuestPromo() : getAppliedPromo();
    if (!stored || items.length === 0) return;
    let cancelled = false;
    promoCodesService
      .validate(stored.code, subtotal)
      .then(() => {
        if (!cancelled) setPromo(stored);
      })
      .catch(() => {
        if (isGuest) setGuestPromo(null);
        else setAppliedPromo(null);
        if (!cancelled) setPromo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [items.length, subtotal, isGuest]);

  const discount = promo ? computeDiscountAmount(promo, subtotal) : 0;

  const handleQuantityChange = useCallback(
    async (
      key: string,
      productId: number,
      variantId: number | null,
      lineId: number,
      next: number
    ) => {
      setIsUpdatingKey(key);
      setError(null);
      try {
        if (isGuest) {
          updateGuestCartQuantity(productId, variantId, next);
        } else {
          if (next <= 0) {
            await cartItemsService.deleteCartItem(lineId);
          } else {
            await cartItemsService.updateCartItem(lineId, { quantity: next });
          }
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error.update"));
        await refresh();
      } finally {
        setIsUpdatingKey(null);
      }
    },
    [isGuest, refresh, t]
  );

  const handleRemove = useCallback(
    async (key: string, productId: number, variantId: number | null, lineId: number) => {
      setIsUpdatingKey(key);
      setError(null);
      try {
        if (isGuest) {
          removeFromGuestCart(productId, variantId);
        } else {
          await cartItemsService.deleteCartItem(lineId);
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error.delete"));
        await refresh();
      } finally {
        setIsUpdatingKey(null);
      }
    },
    [isGuest, refresh, t]
  );

  if (isBooting) {
    return (
      <Page>
        <PageLoader />
      </Page>
    );
  }

  if (items.length === 0) {
    return (
      <Page>
        <div className="page-shell flex flex-col items-center gap-4 py-20 text-center">
          <ShoppingCart className="h-12 w-12 text-muted" />
          <h1 className="text-2xl font-bold text-ink">{t("cart.empty")}</h1>
          <p className="max-w-md text-muted">{t("cart.browseHint")}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90"
          >
            {t("common.seeShop")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="page-shell py-10 pb-12">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">
        {t("cart.myCart")}
      </h1>

      {isGuest && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-panel px-4 py-3">
          <p className="text-sm text-muted">{t("cart.guestHint")}</p>
          <button
            type="button"
            onClick={() => showLogin()}
            className="text-sm font-semibold text-brand underline underline-offset-2"
          >
            {t("cart.loginToSave")}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item, index) => {
            const key = `${item.product_id}-${item.variant_id ?? 0}-${index}`;
            const unitPrice = Number(item.unit_cost || 0);
            const imageUrl = resolveImageUrl(item.image ?? null);
            const busy = isUpdatingKey === key;
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-panel p-4 shadow-card"
              >
                <ProductImage
                  src={imageUrl}
                  alt={item.product_name}
                  size="xs"
                  className="border border-border"
                />

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/produit/${item.product_id}`}
                    className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand"
                  >
                    {item.product_name}
                  </Link>
                  {item.variant_name && (
                    <p className="mt-0.5 text-xs text-muted">
                      {t("common.variant")}: {item.variant_name}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-bold text-brand">
                    {formatAr(unitPrice)}
                  </p>
                </div>

                <QuantityInput
                  value={item.quantity}
                  onChange={(value) =>
                    handleQuantityChange(
                      key,
                      item.product_id,
                      item.variant_id,
                      item.id ?? 0,
                      value
                    )
                  }
                  min={0}
                  disabled={busy}
                />

                <p className="w-24 shrink-0 text-right text-sm font-bold text-ink">
                  {formatAr(unitPrice * item.quantity)}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    handleRemove(
                      key,
                      item.product_id,
                      item.variant_id,
                      item.id ?? 0
                    )
                  }
                  disabled={busy}
                  aria-label={t("cart.remove")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="h-fit rounded-3xl border border-border bg-panel p-6 shadow-card lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-ink">
            {t("order.title")}
          </h2>
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
                {formatAr(Math.max(0, subtotal - discount))}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => history.push("/commande")}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90"
          >
            {t("cart.checkout")}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/"
            className="mt-3 block text-center text-sm font-semibold text-muted transition hover:text-brand"
          >
            {t("common.continueShopping")}
          </Link>
        </div>
      </div>
      </div>
    </Page>
  );
}