import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { useI18n } from "../contexts/I18nContext";
import { cartItemsService } from "../services/operations.service";
import type { CartItem } from "../types/operations";
import { formatAr, resolveImageUrl } from "../lib/utils";

interface CartDrawerContextValue {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const { count, refresh } = useCart();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen || !customer) return;
    let cancelled = false;
    setIsLoading(true);
    cartItemsService
      .getCartItemsWithProducts(customer.id)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, customer, count]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, closeCart]);

  const reloadItems = useCallback(async () => {
    if (!customer) return;
    try {
      const data = await cartItemsService.getCartItemsWithProducts(customer.id);
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [customer]);

  const handleRemove = async (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await cartItemsService.deleteCartItem(id);
      await refresh();
    } catch {
      await reloadItems();
    }
  };

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
    try {
      await cartItemsService.updateCartItem(id, { quantity });
      await refresh();
    } catch {
      await reloadItems();
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
    0
  );

  const value = useMemo(
    () => ({ isOpen, openCart, closeCart }),
    [isOpen, openCart, closeCart]
  );

  return (
    <CartDrawerContext.Provider value={value}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t("cart.close")}
            onClick={closeCart}
            className="animate-fade-in absolute inset-0 h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.2),rgba(0,0,0,0.55))] backdrop-blur-sm"
          />
          <aside className="animate-slide-in-left absolute left-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden border-r border-border/70 bg-panel/95 shadow-[0_30px_70px_-30px_rgba(7,18,32,0.65)] backdrop-blur">
            {/* En-tête */}
            <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-bg/35 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                  <ShoppingBag className="h-5 w-5 text-brand" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-semibold text-ink">
                    {t("cart.myCart")}
                  </h2>
                  {count > 0 && (
                    <p className="text-xs text-muted">
                      {t("common.article", { count })}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label={t("common.close")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-panel text-muted transition hover:border-brand/35 hover:bg-brand/10 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {!customer ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10">
                    <ShoppingBag className="h-8 w-8 text-brand" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">
                      {t("cart.loginTitle")}
                    </p>
                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">
                      {t("cart.loginSub")}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    <Link
                      to="/connexion"
                      onClick={closeCart}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-brand/35 transition duration-200 hover:-translate-y-0.5 hover:bg-brand/90"
                    >
                      {t("nav.login")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/inscription"
                      onClick={closeCart}
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-panel/80 px-5 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-panel"
                    >
                      {t("nav.createAccount")}
                    </Link>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="space-y-4 py-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="skeleton h-20 w-20 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-3/4 rounded-lg" />
                        <div className="skeleton h-3 w-1/2 rounded-lg" />
                        <div className="skeleton h-8 w-24 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10">
                    <ShoppingBag className="h-8 w-8 text-brand" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">
                      {t("cart.empty")}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {t("cart.emptySub")}
                    </p>
                  </div>
                  <Link
                    to="/"
                    onClick={closeCart}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-brand/35 transition duration-200 hover:-translate-y-0.5 hover:bg-brand/90"
                  >
                    {t("common.discoverShop")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => {
                    const name =
                      item.product?.name ??
                      item.variant?.name ??
                      `Produit #${item.product_id}`;
                    const unitPrice = Number(item.unit_cost || 0);
                    const imageUrl = resolveImageUrl(
                      item.variant?.image || item.product?.image || null
                    );
                    const quantity = Number(item.quantity || 1);
                    return (
                      <li
                        key={item.id}
                        className="group flex gap-3 rounded-2xl border border-border/70 bg-panel/80 p-3 transition duration-200 hover:border-brand/35"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={name}
                            className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand/5 text-brand/40">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-ink">
                              {name}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.id)}
                              aria-label={t("cart.removeShort")}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-warning/10 hover:text-warning"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {item.variant?.name && (
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {item.variant.name}
                            </p>
                          )}

                          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                            <div className="flex items-center gap-1 rounded-xl border border-border bg-panel/80 p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, quantity - 1)
                                }
                                disabled={quantity <= 1}
                                aria-label={t("cart.decreaseQty")}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-brand/10 hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-8 text-center text-xs font-bold text-ink">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, quantity + 1)
                                }
                                aria-label={t("cart.increaseQty")}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-brand/10 hover:text-brand"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-ink">
                                {formatAr(unitPrice * quantity)}
                              </p>
                              <p className="text-[11px] text-muted">
                                {formatAr(unitPrice)} {t("cart.perUnit")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {customer && items.length > 0 && (
              <div className="border-t border-border/50 bg-bg/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-panel/80 px-4 py-3">
                  <span className="text-sm font-semibold text-muted">
                    {t("common.subtotal")}
                  </span>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-brand">
                      {formatAr(subtotal)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {t("cart.deliveryNote")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    to="/commande"
                    onClick={closeCart}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-brand/35 transition duration-200 hover:-translate-y-0.5 hover:bg-brand/90"
                  >
                    {t("cart.checkout")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/panier"
                    onClick={closeCart}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-panel/80 px-5 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-panel"
                  >
                    {t("cart.seeCart")}
                  </Link>
                </div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                  <Lock className="h-3 w-3" />
                  {t("cart.secure")}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer(): CartDrawerContextValue {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer doit être utilisé dans <CartDrawerProvider>");
  return ctx;
}
