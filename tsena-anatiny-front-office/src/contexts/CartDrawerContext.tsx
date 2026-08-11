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
import { ArrowRight, ShoppingBag, Trash2, X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
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
      .getCartItems(customer.id)
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

  const handleRemove = async (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await cartItemsService.deleteCartItem(id);
      await refresh();
    } catch {
      if (customer) {
        const data = await cartItemsService.getCartItems(customer.id);
        setItems(data);
      }
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
            aria-label="Fermer le panier"
            onClick={closeCart}
            className="animate-fade-in absolute inset-0 h-full w-full bg-ink/40 backdrop-blur-sm"
          />
          <aside className="animate-slide-in-right absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-panel shadow-lift">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
                <ShoppingBag className="h-5 w-5 text-brand" />
                Mon panier
                {count > 0 && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                    {count}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-bg hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!customer ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <ShoppingBag className="h-10 w-10 text-muted" />
                  <p className="text-sm text-muted">
                    Connectez-vous pour voir votre panier.
                  </p>
                  <Link
                    to="/connexion"
                    onClick={closeCart}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand/90"
                  >
                    Se connecter
                  </Link>
                </div>
              ) : isLoading ? (
                <div className="space-y-4 py-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="skeleton h-16 w-16" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-3/4" />
                        <div className="skeleton h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <ShoppingBag className="h-10 w-10 text-muted" />
                  <p className="text-sm font-semibold text-ink">
                    Votre panier est vide
                  </p>
                  <Link
                    to="/"
                    onClick={closeCart}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Voir la boutique
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => {
                    const name =
                      item.product?.name ?? item.variant?.name ?? `Produit #${item.product_id}`;
                    const unitPrice = Number(item.unit_cost || 0);
                    const imageUrl = resolveImageUrl(
                      item.variant?.image || item.product?.image || null
                    );
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-3"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={name}
                            className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-panel text-muted/40">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-ink">
                            {name}
                          </p>
                          {item.variant?.name && (
                            <p className="mt-0.5 text-xs text-muted">
                              {item.variant.name}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted">
                            {item.quantity} × {formatAr(unitPrice)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-sm font-bold text-ink">
                            {formatAr(unitPrice * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            aria-label="Retirer"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {customer && items.length > 0 && (
              <div className="border-t border-border px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Sous-total</span>
                  <span className="text-xl font-bold text-brand">
                    {formatAr(subtotal)}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    to="/commande"
                    onClick={closeCart}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90"
                  >
                    Passer commande
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/panier"
                    onClick={closeCart}
                    className="flex w-full items-center justify-center rounded-2xl border border-ink px-6 py-3 text-sm font-bold text-ink transition hover:bg-ink hover:text-white"
                  >
                    Voir le panier
                  </Link>
                </div>
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
