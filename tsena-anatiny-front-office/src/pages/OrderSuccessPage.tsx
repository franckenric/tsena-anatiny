import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { ordersService } from "../services/operations.service";
import type { Order } from "../types/operations";
import { PageLoader } from "../components/Spinner";
import { StatusBadge } from "../components/StatusBadge";
import { Page } from "../components/Page";
import { formatAr, formatDate } from "../lib/utils";

export function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      setError("Commande introuvable");
      setIsLoading(false);
      return;
    }
    ordersService
      .getOrder(id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur chargement");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <Page>
        <PageLoader label="Chargement de la commande..." />
      </Page>
    );
  }

  if (error || !order) {
    return (
      <Page>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <p className="text-2xl font-bold text-ink">
            {error ?? "Commande introuvable"}
          </p>
          <Link to="/" className="text-sm font-semibold text-brand">
            Retour à la boutique
          </Link>
        </div>
      </Page>
    );
  }

  const movements = order.stock_movements ?? [];
  const total = movements.reduce(
    (sum, m) => sum + Number(m.quantity || 0) * Number(m.unit_cost || 0),
    0
  );

  return (
    <Page>
      <div className="mx-auto max-w-2xl px-4 py-12 pb-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-panel p-8 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <CheckCircle2 className="h-9 w-9 text-brand" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          Merci, votre commande est confirmée !
        </h1>
        <p className="mt-2 text-sm text-muted">
          Commande{" "}
          <span className="font-semibold text-ink">
            {order.order_number ?? `#${order.id}`}
          </span>{" "}
          du {formatDate(order.created_at)}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <StatusBadge status={order.status} />
          <p className="text-xs text-muted">
            Le paiement s'effectue à la livraison.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-panel p-6 shadow-card">
        <h2 className="text-lg font-bold text-ink">Récapitulatif</h2>
        <ul className="mt-4 divide-y divide-border">
          {movements.map((m, index) => (
            <li
              key={m.variant_id ?? m.product_id ?? index}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="line-clamp-1 font-semibold text-ink">
                  {m.product?.name ?? "Produit"}
                </p>
                <p className="text-xs text-muted">
                  {m.variant?.name ? `Variante: ${m.variant.name} · ` : ""}
                  Qté: {m.quantity}
                </p>
              </div>
              <span className="shrink-0 font-semibold text-ink">
                {formatAr(Number(m.quantity) * Number(m.unit_cost || 0))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-border pt-4">
          <span className="font-bold text-ink">Total</span>
          <span className="text-xl font-bold text-brand">{formatAr(total)}</span>
        </div>
      </div>

      {order.customer?.delivery_address && (
        <div className="mt-6 rounded-3xl border border-border bg-panel p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">Livraison</h2>
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
          Suivre mes commandes
        </Link>
        <Link to="/" className="text-sm font-semibold text-muted hover:text-brand">
          Continuer mes achats
        </Link>
      </div>
      </div>
    </Page>
  );
}
