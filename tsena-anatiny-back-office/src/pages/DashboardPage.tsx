import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Package,
  RefreshCw,
  ScanLine,
  Shapes,
  ShoppingCart,
  TrendingUp,
  Users
} from "lucide-react";
import {
  dashboardService,
  type DashboardOrderInsights,
  type DashboardProductInsights,
  type DashboardStats
} from "../services/dashboard.service";

const defaultStats: DashboardStats = {
  users: 0,
  products: 0,
  categories: 0,
  stock: 0,
  orders: 0,
  movements: 0,
  assignments: 0
};

const defaultOrderInsights: DashboardOrderInsights = {
  totalOrders: 0,
  totalUnitsSold: 0,
  byCommercial: []
};

const defaultProductInsights: DashboardProductInsights = {
  totalProducts: 0,
  totalUnitsInStock: 0,
  soldUnits: 0,
  soldPercentage: 0,
  inStockPercentage: 0,
  byCategory: [],
  soldByCategory: []
};

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [orderInsights, setOrderInsights] =
    useState<DashboardOrderInsights>(defaultOrderInsights);
  const [productInsights, setProductInsights] =
    useState<DashboardProductInsights>(defaultProductInsights);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [nextStats, nextOrderInsights, nextProductInsights] =
        await Promise.all([
          dashboardService.getStats(),
          dashboardService.getOrderInsights(),
          dashboardService.getProductInsights()
        ]);
      setStats(nextStats);
      setOrderInsights(nextOrderInsights);
      setProductInsights(nextProductInsights);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur de chargement du dashboard"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const kpis = useMemo(
    () => [
      {
        label: "Utilisateurs",
        value: stats.users,
        icon: Users,
        tone: "bg-brand/15 text-brand ring-brand/25"
      },
      {
        label: "Produits",
        value: stats.products,
        icon: Package,
        tone: "bg-success/15 text-success ring-success/25"
      },
      {
        label: "Catégories",
        value: stats.categories,
        icon: Shapes,
        tone: "bg-warning/20 text-warning ring-warning/25"
      },
      {
        label: "Stock",
        value: stats.stock,
        icon: Boxes,
        tone: "bg-brand/15 text-brand ring-brand/25"
      }
    ],
    [stats]
  );

  const chartData = useMemo(
    () => [
      { label: "Produits", value: stats.products, icon: Package },
      { label: "Commandes", value: stats.orders, icon: ShoppingCart },
      { label: "Mouvements", value: stats.movements, icon: ScanLine },
      { label: "Affectations", value: stats.assignments, icon: ClipboardList },
      { label: "Utilisateurs", value: stats.users, icon: Users }
    ],
    [stats]
  );

  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);
  const totalFlow = stats.orders + stats.movements + stats.assignments;
  const maxCommercialUnits = Math.max(
    ...orderInsights.byCommercial.map((item) => item.unitsSold),
    1
  );
  const maxCategorySoldUnits = Math.max(
    ...productInsights.soldByCategory.map((item) => item.unitsSold),
    1
  );

  return (
    <Layout
      title="Vue d'ensemble"
      subtitle="Suivez vos indicateurs clés en temps réel"
    >
      <div className="animate-fade-up h-full min-h-0 space-y-6 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-panel/65 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              Performance globale
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {totalFlow.toLocaleString("fr-FR")} opérations enregistrées
            </p>
          </div>
          <button
            type="button"
            onClick={loadStats}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-brand-soft/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualiser
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article
              key={kpi.label}
              className="rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)]"
            >
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${kpi.tone}`}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {isLoading ? "..." : kpi.value.toLocaleString("fr-FR")}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
          <article className="rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] xl:col-span-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/25">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Répartition des volumes
                </h3>
                <p className="text-sm text-muted">
                  Vue comparative des principaux modules
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {chartData.map((entry) => {
                const width = `${Math.max(6, (entry.value / maxChartValue) * 100)}%`;
                return (
                  <div key={entry.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-ink">
                        <entry.icon className="h-4 w-4 text-muted" />
                        {entry.label}
                      </span>
                      <span className="font-semibold text-ink">
                        {isLoading
                          ? "..."
                          : entry.value.toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-bg/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-warning transition-all duration-700"
                        style={{ width: isLoading ? "12%" : width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] xl:col-span-2">
            <h3 className="font-display text-lg font-semibold text-ink">
              Résumé rapide
            </h3>
            <p className="mt-1 text-sm text-muted">
              Indicateurs synthétiques pour piloter l'activité.
            </p>
            <dl className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg/55 px-3 py-2.5">
                <dt className="text-sm text-muted">Commandes</dt>
                <dd className="text-sm font-semibold text-ink">
                  {isLoading ? "..." : stats.orders.toLocaleString("fr-FR")}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg/55 px-3 py-2.5">
                <dt className="text-sm text-muted">Mouvements de stock</dt>
                <dd className="text-sm font-semibold text-ink">
                  {isLoading ? "..." : stats.movements.toLocaleString("fr-FR")}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg/55 px-3 py-2.5">
                <dt className="text-sm text-muted">
                  Affectations commerciales
                </dt>
                <dd className="text-sm font-semibold text-ink">
                  {isLoading
                    ? "..."
                    : stats.assignments.toLocaleString("fr-FR")}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
          <article className="rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] xl:col-span-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-warning/20 text-warning ring-1 ring-warning/25">
                <Shapes className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Produits vendus par categorie
                </h3>
                <p className="text-sm text-muted">
                  Repartition des ventes par categorie
                </p>
              </div>
            </div>

            {productInsights.soldByCategory.length === 0 ? (
              <p className="mt-6 text-sm text-muted">
                Aucune vente par categorie disponible.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {productInsights.soldByCategory.slice(0, 8).map((item) => {
                  const width = `${Math.max(8, (item.unitsSold / maxCategorySoldUnits) * 100)}%`;
                  return (
                    <div
                      key={`${item.categoryId}-${item.categoryName}`}
                      className="rounded-xl border border-border/60 bg-bg/55 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-ink">
                          {item.categoryName}
                        </p>
                        <p className="shrink-0 text-xs text-muted">
                          {item.ordersCount.toLocaleString("fr-FR")} commandes
                        </p>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-panel">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-warning to-brand transition-all duration-700"
                          style={{ width: isLoading ? "12%" : width }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-ink">
                        {item.unitsSold.toLocaleString("fr-FR")} produits vendus
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] xl:col-span-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success ring-1 ring-success/25">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Pourcentage vendus
                </h3>
                <p className="text-sm text-muted">
                  Part vendue vs stock disponible
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <div
                className="relative flex h-40 w-40 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--success)) ${isLoading ? 12 : productInsights.soldPercentage}%, hsl(var(--border)) 0%)`
                }}
              >
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-panel text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">
                    Vendu
                  </p>
                  <p className="text-2xl font-bold text-ink">
                    {isLoading
                      ? "..."
                      : `${productInsights.soldPercentage.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg/55 px-3 py-2.5 text-sm">
                <span className="text-muted">Unites vendues</span>
                <span className="font-semibold text-ink">
                  {isLoading
                    ? "..."
                    : productInsights.soldUnits.toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg/55 px-3 py-2.5 text-sm">
                <span className="text-muted">Unites en stock</span>
                <span className="font-semibold text-ink">
                  {isLoading
                    ? "..."
                    : productInsights.totalUnitsInStock.toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-bg/55 px-3 py-2.5 text-sm">
                <span className="text-muted">Part en stock</span>
                <span className="font-semibold text-ink">
                  {isLoading
                    ? "..."
                    : `${productInsights.inStockPercentage.toFixed(1)}%`}
                </span>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] xl:col-span-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success ring-1 ring-success/25">
                <Package className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Produits vendus
                </h3>
                <p className="text-sm text-muted">Totalité et base commandes</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-border/60 bg-bg/55 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">
                  Produits vendus (global)
                </p>
                <p className="mt-1 text-2xl font-bold text-ink">
                  {isLoading
                    ? "..."
                    : orderInsights.totalUnitsSold.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-bg/55 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">
                  Commandes analysées
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {isLoading
                    ? "..."
                    : orderInsights.totalOrders.toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] xl:col-span-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/25">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Commandes par commercial
                </h3>
                <p className="text-sm text-muted">
                  Quantité vendue par commercial
                </p>
              </div>
            </div>

            {orderInsights.byCommercial.length === 0 ? (
              <p className="mt-6 text-sm text-muted">
                Aucune commande commerciale disponible.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {orderInsights.byCommercial.slice(0, 8).map((item) => {
                  const width = `${Math.max(8, (item.unitsSold / maxCommercialUnits) * 100)}%`;
                  return (
                    <div
                      key={`${item.commercialId}-${item.commercialName}`}
                      className="rounded-xl border border-border/60 bg-bg/55 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-ink">
                          {item.commercialName}
                        </p>
                        <p className="shrink-0 text-xs text-muted">
                          {item.ordersCount} commandes
                        </p>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-panel">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-success to-brand transition-all duration-700"
                          style={{ width: isLoading ? "12%" : width }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-ink">
                        {isLoading
                          ? "..."
                          : item.unitsSold.toLocaleString("fr-FR")}{" "}
                        produits vendus
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      </div>
    </Layout>
  );
}
