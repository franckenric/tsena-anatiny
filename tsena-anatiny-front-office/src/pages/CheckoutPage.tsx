import { useEffect, useMemo, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ArrowLeft, Lock, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { useCart } from "../contexts/CartContext";
import { useI18n } from "../contexts/I18nContext";
import { usePageTitle } from "../contexts/PageTitleContext";
import {
  cartItemsService,
  deliveryZonesService,
  promoCodesService
} from "../services/operations.service";
import { PageLoader, Spinner } from "../components/Spinner";
import { Page } from "../components/Page";
import { ProductImage } from "../components/ProductImage";
import { PhoneInput } from "../components/PhoneInput";
import {
  formatAr,
  formatPhoneMadagascar,
  isPhonePrefixOnly,
  normalizePhone,
  PHONE_FORMAT_REGEX,
  resolveImageUrl,
  toThumbUrl
} from "../lib/utils";
import {
  computeDiscountAmount,
  getAppliedPromo,
  isFreeShippingPromo,
  setAppliedPromo,
  type AppliedPromo
} from "../lib/promo";
import type { DeliveryZone } from "../types/operations";
import {
  setGuestOrderRef,
  setGuestPromo
} from "../lib/guestCart";

export function CheckoutPage() {
  const { customer, isBooting, apiUser } = useAuth();
  const { showLogin } = useAuthModal();
  const { items, clear, isGuest } = useCart();
  const { t } = useI18n();
  usePageTitle(t("checkout.title"));
  const history = useHistory();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(customer?.name ?? "");
  const [address, setAddress] = useState(customer?.delivery_address ?? "");
  const [phone, setPhone] = useState(
    customer?.phone ? formatPhoneMadagascar(customer.phone) : ""
  );
  const [note, setNote] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  // Pre-remplissage depuis la fiche client. Dependances completees : la saisie
  // d'un invite ne doit pas etre effacee par un rendu sans session.
  useEffect(() => {
    if (!customer) return;
    setName(customer.name ?? "");
    setAddress(customer.delivery_address ?? "");
    setPhone(customer.phone ? formatPhoneMadagascar(customer.phone) : "");
  }, [customer]);

  // Zones de livraison (endpoint public, sans auth). La premiere est
  // preselectionnee : le client voit tout de suite un tarif plutot qu'un
  // « a convenir », et peut changer de zone dans la liste.
  useEffect(() => {
    let cancelled = false;
    deliveryZonesService
      .getOptions()
      .then((list) => {
        if (cancelled) return;
        setZones(list);
        setZonesLoaded(true);
        setSelectedZoneId((prev) => prev ?? (list[0]?.id ?? null));
      })
      .catch(() => {
        // Pas de zone configuree : la livraison reste « a convenir ».
        if (!cancelled) setZonesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
        0
      ),
    [items]
  );

  // Les codes promo sont reserves aux comptes : l'eventuel code invite stocke
  // en local (avant cette regle) est purge, seul un connecte peut valider.
  useEffect(() => {
    if (isGuest) {
      setGuestPromo(null);
      setPromo(null);
      return;
    }
    const stored = getAppliedPromo();
    if (!stored || items.length === 0) return;
    // Un code « livraison offerte » depend de la zone : l'attendre evite de
    // l'ecarter faute de tarif connu pendant le chargement.
    if (stored.discount_type === "free_shipping" && !zonesLoaded) return;
    let cancelled = false;
    promoCodesService
      .validate(stored.code, subtotal, selectedZoneId ?? undefined)
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
  }, [items.length, subtotal, isGuest, selectedZoneId, zonesLoaded]);

  const discount = promo ? computeDiscountAmount(promo, subtotal) : 0;
  // Tarif de la zone choisie. Un code « livraison offerte » l'annule ici pour
  // l'aperçu ; le serveur refait le meme calcul au moment de la commande.
  const zoneFee = selectedZone ? Math.max(0, Number(selectedZone.fee) || 0) : 0;
  const freeDelivery = isFreeShippingPromo(promo);
  const deliveryFee = freeDelivery ? 0 : zoneFee;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const handleConfirm = async () => {
    if (items.length === 0) return;

    if (isPhonePrefixOnly(phone) || !PHONE_FORMAT_REGEX.test(phone)) {
      setError(t("checkout.invalidPhone"));
      return;
    }

    const cleanName = name.trim();
    if (isGuest && !cleanName) {
      setError(t("checkout.nameRequiredError"));
      return;
    }

    if (zones.length > 0 && !selectedZoneId) {
      setError(t("checkout.zoneRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      let order;
      if (customer && apiUser) {
        order = await cartItemsService.checkout(customer.id, {
          user_id: apiUser.id,
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: normalizePhone(phone),
          delivery_address: address.trim() || undefined,
          status: "draft",
          note: note.trim() || undefined,
          promo_code: promo?.code,
          delivery_zone_id: selectedZoneId ?? undefined
        });
      } else {
        order = await cartItemsService.checkoutGuest({
          customer_name: cleanName,
          customer_phone: normalizePhone(phone),
          delivery_address: address.trim() || undefined,
          items: items.map((line) => ({
            product_id: line.product_id,
            variant_id: line.variant_id,
            quantity: line.quantity
          })),
          status: "draft",
          note: note.trim() || undefined,
          // Pas de code promo sans compte : le serveur l'ignorerait (le champ
          // n'existe plus sur le schema invite), inutile de l'envoyer.
          delivery_zone_id: selectedZoneId ?? undefined
        });
        // Sans compte, la page de succes relit la commande via le lookup
        // public (numero + telephone) : on memorise la reference ici.
        setGuestOrderRef({
          order_id: order.id,
          order_number: order.order_number ?? `#${order.id}`,
          phone: normalizePhone(phone)
        });
      }
      clear();
      if (isGuest) setGuestPromo(null);
      else setAppliedPromo(null);
      history.push(`/succes/${order.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("checkout.errorOrder")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBooting) {
    return (
      <Page>
        <PageLoader label={t("checkout.prepare")} />
      </Page>
    );
  }

  if (items.length === 0) {
    return (
      <Page>
        <div className="page-shell flex flex-col items-center gap-4 py-20 text-center">
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
      <div className="page-shell py-10 pb-8">
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

      {isGuest && (
        <div className="mt-4 rounded-2xl border border-brand/25 bg-brand/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <UserRound className="h-4 w-4 text-brand" />
            {t("checkout.guestBadge")}
          </p>
          <p className="mt-1 text-xs text-muted">{t("checkout.guestHint")}</p>
          <button
            type="button"
            onClick={() => showLogin()}
            className="mt-2 text-xs font-semibold text-brand underline underline-offset-2"
          >
            {t("checkout.loginInstead")}
          </button>
        </div>
      )}

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
              {isGuest ? (
                <div>
                  <label
                    htmlFor="guest-name"
                    className="text-xs font-semibold uppercase tracking-widest text-muted"
                  >
                    {t("checkout.nameRequired")}
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder={t("checkout.namePlaceholder")}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="customer-name"
                    className="text-xs font-semibold uppercase tracking-widest text-muted"
                  >
                    {t("checkout.customer")}
                  </label>
                  <p id="customer-name" className="mt-1 text-sm font-semibold text-ink">
                    {customer?.name}
                  </p>
                </div>
              )}
              <div>
                <label
                  htmlFor="phone"
                  className="text-xs font-semibold uppercase tracking-widest text-muted"
                >
                  {t("checkout.phoneRequired")}
                </label>
                <div className="mt-2">
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={setPhone}
                    autoComplete="tel"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {t("checkout.phoneHint")}
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
              {zones.length > 0 && (
                <div>
                  <label
                    htmlFor="delivery-zone"
                    className="text-xs font-semibold uppercase tracking-widest text-muted"
                  >
                    {t("checkout.zone")}
                  </label>
                  <select
                    id="delivery-zone"
                    value={selectedZoneId ?? ""}
                    onChange={(e) =>
                      setSelectedZoneId(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">{t("checkout.zonePlaceholder")}</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {`${zone.name} — ${formatAr(Number(zone.fee) || 0)}`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">
                    {t("checkout.zoneHint")}
                  </p>
                </div>
              )}
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
              {items.map((item, index) => (
                <li
                  key={`${item.product_id}-${item.variant_id ?? 0}-${index}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductImage
                      src={toThumbUrl(resolveImageUrl(item.image ?? null))}
                      alt={item.product_name}
                      size="thumb"
                      className="border border-border/60"
                    />
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-semibold text-ink">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-muted">
                        {item.variant_name ? `${t("common.variant")}: ${item.variant_name} · ` : ""}
                        {t("common.quantity")}: {item.quantity}
                      </p>
                    </div>
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
              <dt className="text-muted">
                {freeDelivery && promo
                  ? t("checkout.freeDeliveryPromo", { code: promo.code })
                  : t("common.delivery")}
              </dt>
              {freeDelivery ? (
                <dd className="font-semibold text-success">
                  {zoneFee > 0 && (
                    <span className="mr-2 font-normal text-muted line-through">
                      {formatAr(zoneFee)}
                    </span>
                  )}
                  {t("checkout.freeDelivery")}
                </dd>
              ) : selectedZone ? (
                <dd className="font-semibold text-ink">
                  {formatAr(deliveryFee)}
                </dd>
              ) : (
                <dd className="font-semibold text-ink">
                  {t("common.toConvene")}
                </dd>
              )}
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