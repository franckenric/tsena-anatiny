import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LogOut,
  PackageCheck,
  ShoppingCart,
  UserRound,
  MapPin
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ordersService } from "../services/operations.service";
import type { Order } from "../types/operations";
import { PageLoader } from "../components/Spinner";
import { StatusBadge } from "../components/StatusBadge";
import { Page } from "../components/Page";
import { formatAr, formatDate, formatPhoneMadagascar } from "../lib/utils";

export function AccountPage() {
  const { customer, isBooting, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!customer) return;
    try {
      setIsLoadingOrders(true);
      setError(null);
      const data = await ordersService.getOrdersByCustomer(customer.id, 1, 50);
      setOrders(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement commandes");
    } finally {
      setIsLoadingOrders(false);
    }
  }, [customer]);

  useEffect(() => {
    if (!isBooting && customer) void loadOrders();
  }, [isBooting, customer, loadOrders]);

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
          <UserRound className="h-12 w-12 text-muted" />
          <h1 className="text-2xl font-bold text-ink">Connectez-vous</h1>
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

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce(
      (sum, o) =>
        sum +
        (o.stock_movements ?? []).reduce(
          (s, m) => s + Number(m.quantity || 0) * Number(m.unit_cost || 0),
          0
        ),
      0
    );

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-4 py-10 pb-12 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-panel p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-xl font-bold text-brand">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-ink">
                  {customer.name}
                </h1>
                <p className="text-sm text-muted">{formatPhoneMadagascar(customer.phone)}</p>
              </div>
            </div>
            {customer.delivery_address && (
              <p className="mt-4 flex items-start gap-2 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {customer.delivery_address}
              </p>
            )}
            <button
              type="button"
              onClick={logout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-6 py-3 text-sm font-bold text-muted transition hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </section>

          <section className="rounded-3xl border border-border bg-panel p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Mes statistiques</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-muted">Commandes</dt>
                <dd className="font-semibold text-ink">{orders.length}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-muted">Total dépensé</dt>
                <dd className="font-semibold text-brand">{formatAr(totalSpent)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="rounded-3xl border border-border bg-panel p-6 shadow-card lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              <PackageCheck className="h-5 w-5 shrink-0 text-brand" />
              Mes commandes
            </h2>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <ShoppingCart className="h-4 w-4" />
              Nouvelle commande
            </Link>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          {isLoadingOrders ? (
            <p className="mt-8 text-center text-sm text-muted">
              Chargement...
            </p>
          ) : orders.length === 0 ? (
            <div className="mt-10 text-center">
              <p className="text-sm text-muted">
                Vous n'avez pas encore de commande.
              </p>
              <Link
                to="/"
                className="mt-3 inline-block text-sm font-bold text-brand hover:underline"
              >
                Découvrir la boutique
              </Link>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {orders.map((order) => {
                const movements = order.stock_movements ?? [];
                const total = movements.reduce(
                  (sum, m) =>
                    sum + Number(m.quantity || 0) * Number(m.unit_cost || 0),
                  0
                );
                const firstProduct = movements[0]?.product?.name ?? "Commande";
                const extraCount = movements.length - 1;
                return (
                  <li key={order.id} className="py-4">
                    <Link
                      to={`/succes/${order.id}`}
                      className="block rounded-2xl p-2 transition hover:bg-bg"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink">
                            {order.order_number ?? `#${order.id}`}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                            {firstProduct}
                            {extraCount > 0 && ` +${extraCount} autre(s)`}
                          </p>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
                          <span className="text-xs text-muted">
                            {formatDate(order.created_at)}
                          </span>
                          <span className="text-sm font-bold text-ink">
                            {formatAr(total)}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      </div>
    </Page>
  );
}
