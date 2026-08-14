import { useCallback, useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ArrowRight, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { cartItemsService } from "../services/operations.service";
import type { CartItem } from "../types/operations";
import { PageLoader } from "../components/Spinner";
import { Page } from "../components/Page";
import { QuantityInput } from "../components/QuantityInput";
import { formatAr, resolveImageUrl } from "../lib/utils";

export function CartPage() {
  const { customer, isBooting } = useAuth();
  const { refresh } = useCart();
  const history = useHistory();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!customer) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await cartItemsService.getCartItemsWithProducts(customer.id);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement panier");
    } finally {
      setIsLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (isBooting) return;
    if (!customer) {
      setIsLoading(false);
      return;
    }
    void load();
  }, [isBooting, customer, load]);

  const handleQuantityChange = async (item: CartItem, next: number) => {
    if (next <= 0) {
      await handleRemove(item.id);
      return;
    }
    setIsUpdatingId(item.id);
    setError(null);
    const previous = item.quantity;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: next } : i))
    );
    try {
      await cartItemsService.updateCartItem(item.id, { quantity: next });
      await refresh();
    } catch (err) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: previous } : i))
      );
      setError(err instanceof Error ? err.message : "Erreur mise à jour");
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleRemove = async (id: number) => {
    setIsUpdatingId(id);
    setError(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await cartItemsService.deleteCartItem(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
      await load();
    } finally {
      setIsUpdatingId(null);
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
    0
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
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <ShoppingCart className="h-12 w-12 text-muted" />
          <h1 className="text-2xl font-bold text-ink">Votre panier est vide</h1>
          <p className="max-w-md text-muted">
            Connectez-vous ou créez un compte pour commencer vos achats.
          </p>
          <div className="flex gap-3">
            <Link
              to="/connexion"
              className="rounded-2xl bg-ink px-6 py-3 text-sm font-bold text-white transition hover:bg-ink/90"
            >
              Se connecter
            </Link>
            <Link
              to="/inscription"
              className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand/90"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page>
        <PageLoader label="Chargement du panier..." />
      </Page>
    );
  }

  if (items.length === 0) {
    return (
      <Page>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <ShoppingCart className="h-12 w-12 text-muted" />
          <h1 className="text-2xl font-bold text-ink">Votre panier est vide</h1>
          <p className="max-w-md text-muted">
            Parcourez la boutique et ajoutez des produits à votre panier.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90"
          >
            Voir la boutique
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-4 py-10 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Mon panier</h1>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const name =
              item.product?.name ?? item.variant?.name ?? `Produit #${item.product_id}`;
            const variantName = item.variant?.name;
            const unitPrice = Number(item.unit_cost || 0);
            const imageUrl = resolveImageUrl(
              item.variant?.image || item.product?.image || null
            );
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-panel p-4 shadow-card"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="h-20 w-20 shrink-0 rounded-2xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-bg text-muted/40">
                    <ShoppingCart className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/produit/${item.product_id}`}
                    className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand"
                  >
                    {name}
                  </Link>
                  {variantName && (
                    <p className="mt-0.5 text-xs text-muted">
                      Variante: {variantName}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-bold text-brand">
                    {formatAr(unitPrice)}
                  </p>
                </div>

                <QuantityInput
                  value={item.quantity}
                  onChange={(value) => handleQuantityChange(item, value)}
                  min={0}
                  disabled={isUpdatingId === item.id}
                />

                <p className="w-24 shrink-0 text-right text-sm font-bold text-ink">
                  {formatAr(unitPrice * item.quantity)}
                </p>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={isUpdatingId === item.id}
                  aria-label="Retirer du panier"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="h-fit rounded-3xl border border-border bg-panel p-6 shadow-card lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-ink">Récapitulatif</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Sous-total</dt>
              <dd className="font-semibold text-ink">{formatAr(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Livraison</dt>
              <dd className="font-semibold text-ink">À convenir</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <dt className="font-bold text-ink">Total</dt>
              <dd className="text-xl font-bold text-brand">
                {formatAr(subtotal)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => history.push("/commande")}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90"
          >
            Passer commande
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/"
            className="mt-3 block text-center text-sm font-semibold text-muted transition hover:text-brand"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
      </div>
    </Page>
  );
}
