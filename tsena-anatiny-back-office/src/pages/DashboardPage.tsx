import {
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
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
  Users,
  type LucideIcon
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

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-border/40 ${className ?? ""}`}
    />
  );
}

function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const to = Number.isFinite(target) ? Math.max(0, target) : 0;
    if (to === 0) {
      setDisplay(0);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function CountUp({
  value,
  className
}: {
  value: number;
  className?: string;
}) {
  const display = useCountUp(value);
  return <span className={className}>{display.toLocaleString("fr-FR")}</span>;
}

function StatRow({
  icon: Icon,
  label,
  value,
  iconClass
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-bg/55 px-3 py-2.5 transition hover:border-brand/30">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium text-muted">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}

const RANK_STYLES = [
  "bg-warning/20 text-warning ring-1 ring-warning/30",
  "bg-brand/15 text-brand ring-1 ring-brand/30",
  "bg-muted/15 text-muted ring-1 ring-border",
  "bg-bg text-muted ring-1 ring-border"
];

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
    void loadStats();
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

  const chartTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );

  const maxChartValue = useMemo(
    () => Math.max(...chartData.map((item) => item.value), 1),
    [chartData]
  );

  const totalFlow = stats.orders + stats.movements + stats.assignments;

  const maxCommercialUnits = Math.max(
    ...orderInsights.byCommercial.map((item) => item.unitsSold),
    1
  );
  const maxCategorySoldUnits = Math.max(
    ...productInsights.soldByCategory.map((item) => item.unitsSold),
    1
  );

  const todayLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const cardClass =
    "rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)]";

  return (
    <Layout title="Vue d'ensemble">
      <div className="animate-fade-up space-y-6 pr-1">
        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-warning/10 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                Tableau de bord
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
                {todayLabel}
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                <span className="font-bold text-ink tabular-nums">
                  {isLoading ? "..." : totalFlow.toLocaleString("fr-FR")}
                </span>{" "}
                opérations enregistrées ·{" "}
                <span className="font-semibold text-ink">
                  {isLoading ? "..." : stats.orders.toLocaleString("fr-FR")}
                </span>{" "}
                commandes
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl border border-border/60 bg-bg/60 px-3 py-2 text-right sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                  Taux de vente
                </p>
                <p className="text-sm font-bold text-brand tabular-nums">
                  {isLoading
                    ? "..."
                    : `${productInsights.soldPercentage.toFixed(1)}%`}
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
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        {/* ── KPIs ── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi, idx) => (
            <article
              key={kpi.label}
              className={`animate-fade-up group relative overflow-hidden rounded-2xl border border-border/70 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-26px_rgba(8,18,38,0.75)]`}
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand/70 to-warning/70 opacity-50 transition group-hover:opacity-100" />
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ) : (
                <>
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${kpi.tone}`}
                  >
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {kpi.label}
                  </p>
                  <CountUp
                    value={kpi.value}
                    className="mt-1 block text-3xl font-bold text-ink tabular-nums"
                  />
                </>
              )}
            </article>
          ))}
        </section>

        {/* ── Volumes & résumé ── */}
        <section className="grid gap-4 xl:grid-cols-5">
          <article className={`${cardClass} xl:col-span-3`}>
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

            {isLoading ? (
              <div className="mt-5 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {chartData.map((entry, idx) => {
                  const pct =
                    chartTotal > 0
                      ? Math.round((entry.value / chartTotal) * 100)
                      : 0;
                  const width = `${Math.max(6, (entry.value / maxChartValue) * 100)}%`;
                  return (
                    <div key={entry.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex min-w-0 items-center gap-2.5 text-ink">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                            <entry.icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate">{entry.label}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-ink tabular-nums">
                          {entry.value.toLocaleString("fr-FR")}
                          <span className="ml-1.5 text-xs font-medium text-muted">
                            · {pct}%
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-bg/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-warning transition-all duration-700"
                          style={{
                            width,
                            transitionDelay: `${idx * 80}ms`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className={`${cardClass} xl:col-span-2`}>
            <h3 className="font-display text-lg font-semibold text-ink">
              Résumé rapide
            </h3>
            <p className="mt-1 text-sm text-muted">
              Indicateurs synthétiques pour piloter l'activité.
            </p>
            <div className="mt-5 space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                <>
                  <StatRow
                    icon={ShoppingCart}
                    label="Commandes"
                    value={stats.orders.toLocaleString("fr-FR")}
                    iconClass="bg-brand/15 text-brand"
                  />
                  <StatRow
                    icon={ScanLine}
                    label="Mouvements de stock"
                    value={stats.movements.toLocaleString("fr-FR")}
                    iconClass="bg-warning/20 text-warning"
                  />
                  <StatRow
                    icon={ClipboardList}
                    label="Affectations commerciales"
                    value={stats.assignments.toLocaleString("fr-FR")}
                    iconClass="bg-success/15 text-success"
                  />
                </>
              )}
            </div>
          </article>
        </section>

        {/* ── Catégories & donut ── */}
        <section className="grid gap-4 xl:grid-cols-5">
          <article className={`${cardClass} xl:col-span-3`}>
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

            {isLoading ? (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : productInsights.soldByCategory.length === 0 ? (
              <p className="mt-6 text-sm text-muted">
                Aucune vente par categorie disponible.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {productInsights.soldByCategory.slice(0, 8).map((item, idx) => {
                  const width = `${Math.max(8, (item.unitsSold / maxCategorySoldUnits) * 100)}%`;
                  return (
                    <div
                      key={`${item.categoryId}-${item.categoryName}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-bg/55 p-3 transition hover:border-brand/30"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${RANK_STYLES[idx] ?? RANK_STYLES[3]}`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-ink">
                            {item.categoryName}
                          </p>
                          <p className="shrink-0 text-xs font-semibold text-ink tabular-nums">
                            {item.unitsSold.toLocaleString("fr-FR")} vendus
                          </p>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-warning to-brand transition-all duration-700"
                            style={{ width }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          {item.ordersCount.toLocaleString("fr-FR")} commandes
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className={`${cardClass} xl:col-span-2`}>
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

            {isLoading ? (
              <div className="mt-5 flex flex-col items-center space-y-4">
                <Skeleton className="h-44 w-44 rounded-full" />
                <Skeleton className="h-10 w-40" />
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-center">
                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(hsl(var(--success)) ${productInsights.soldPercentage}%, hsl(var(--border)) 0%)`
                    }}
                  >
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-panel text-center shadow-inner">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Vendu
                      </p>
                      <p className="text-3xl font-bold text-ink tabular-nums">
                        {productInsights.soldPercentage.toFixed(1)}%
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {productInsights.soldUnits.toLocaleString("fr-FR")}{" "}
                        unités
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    Vendu {productInsights.soldPercentage.toFixed(1)}%
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    En stock {productInsights.inStockPercentage.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-5 grid gap-2">
                  <StatRow
                    icon={TrendingUp}
                    label="Unites vendues"
                    value={productInsights.soldUnits.toLocaleString("fr-FR")}
                    iconClass="bg-success/15 text-success"
                  />
                  <StatRow
                    icon={Boxes}
                    label="Unites en stock"
                    value={productInsights.totalUnitsInStock.toLocaleString(
                      "fr-FR"
                    )}
                    iconClass="bg-brand/15 text-brand"
                  />
                  <StatRow
                    icon={Package}
                    label="Produits au catalogue"
                    value={productInsights.totalProducts.toLocaleString(
                      "fr-FR"
                    )}
                    iconClass="bg-warning/20 text-warning"
                  />
                </div>
              </>
            )}
          </article>
        </section>

        {/* ── Commerciaux & produits vendus ── */}
        <section className="grid gap-4 xl:grid-cols-5">
          <article className={`${cardClass} xl:col-span-3`}>
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

            {isLoading ? (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : orderInsights.byCommercial.length === 0 ? (
              <p className="mt-6 text-sm text-muted">
                Aucune commande commerciale disponible.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {orderInsights.byCommercial.slice(0, 8).map((item, idx) => {
                  const width = `${Math.max(8, (item.unitsSold / maxCommercialUnits) * 100)}%`;
                  return (
                    <div
                      key={`${item.commercialId}-${item.commercialName}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-bg/55 p-3 transition hover:border-brand/30"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${RANK_STYLES[idx] ?? RANK_STYLES[3]}`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-ink">
                            {item.commercialName}
                          </p>
                          <p className="shrink-0 text-xs font-semibold text-ink tabular-nums">
                            {item.unitsSold.toLocaleString("fr-FR")} vendus
                          </p>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-success to-brand transition-all duration-700"
                            style={{ width }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          {item.ordersCount.toLocaleString("fr-FR")} commandes
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className={`${cardClass} xl:col-span-2`}>
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

            {isLoading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-bg/55 p-4">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-success/10 blur-2xl" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted">
                        Produits vendus (global)
                      </p>
                      <CountUp
                        value={orderInsights.totalUnitsSold}
                        className="mt-1 block text-3xl font-bold text-ink tabular-nums"
                      />
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                      <TrendingUp className="h-5 w-5" />
                    </span>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-bg/55 p-4">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand/10 blur-2xl" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted">
                        Commandes analysées
                      </p>
                      <CountUp
                        value={orderInsights.totalOrders}
                        className="mt-1 block text-3xl font-bold text-ink tabular-nums"
                      />
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                      <ShoppingCart className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </article>
        </section>
      </div>
    </Layout>
  );
}
