import { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { cartItemsService } from "../services/operations.service";
import { PageLoader, Spinner } from "../components/Spinner";
import { Page } from "../components/Page";
import { formatAr, formatPhoneMadagascar } from "../lib/utils";

export function CheckoutPage() {
  const { customer, isBooting, apiUser } = useAuth();
  const { refresh } = useCart();
  const history = useHistory();

  const [items, setItems] = useState<Awaited<
    ReturnType<typeof cartItemsService.getCartItems>
  >>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(customer?.delivery_address ?? "");
  const [note, setNote] = useState("");

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
            err instanceof Error ? err.message : "Erreur chargement panier"
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

  const handleConfirm = async () => {
    if (!customer) return;
    if (items.length === 0) return;
    if (!apiUser) {
      setError("Session API invalide. Rechargez la page.");
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
        status: "confirmed",
        note: note.trim() || undefined
      });
      await refresh();
      history.push(`/succes/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la commande");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBooting || isLoading) {
    return (
      <Page>
        <PageLoader label="Préparation de la commande..." />
      </Page>
    );
  }

  if (!customer) return <Page />;

  if (items.length === 0) {
    return (
      <Page>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <p className="text-2xl font-bold text-ink">Votre panier est vide</p>
          <Link to="/" className="text-sm font-semibold text-brand">
            Voir la boutique
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
        Retour au panier
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">
        Finaliser la commande
      </h1>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-3xl border border-border bg-panel p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Livraison</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Client
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
                  Adresse de livraison
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
                  Note (optionnel)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Instructions de livraison..."
                  className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-panel p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Articles</h2>
            <ul className="mt-4 divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-semibold text-ink">
                      {item.product?.name ?? `Produit #${item.product_id}`}
                    </p>
                    <p className="text-xs text-muted">
                      {item.variant?.name ? `Variante: ${item.variant.name} · ` : ""}
                      Qté: {item.quantity}
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
          <h2 className="text-lg font-bold text-ink">Paiement</h2>
          <p className="mt-2 text-xs text-muted">
            Le paiement s'effectue à la livraison. En confirmant, votre commande
            est enregistrée et le stock est réservé.
          </p>
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
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                Enregistrement...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Confirmer la commande
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </Page>
  );
}
