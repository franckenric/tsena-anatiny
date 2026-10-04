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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Package,
  RefreshCw,
  RotateCcw,
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
import {
  getVisitsSummary,
  type VisitsSummary,
  type VisitDay
} from "../services/visits.service";
import { useNotifications } from "../contexts/NotificationsContext";

const emptyVisits = (): VisitsSummary => ({
  total: 0,
  previous_week_total: 0,
  week_start: null,
  week_end: null,
  by_day: []
});

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
  const { presence, isConnected } = useNotifications();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [orderInsights, setOrderInsights] =
    useState<DashboardOrderInsights>(defaultOrderInsights);
  const [productInsights, setProductInsights] =
    useState<DashboardProductInsights>(defaultProductInsights);
  const [visits, setVisits] = useState<VisitsSummary>(emptyVisits);
  // -1 = semaine precedente, 0 = semaine en cours, 1 = semaine suivante.
  const [visitsWeekOffset, setVisitsWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [nextStats, nextOrderInsights, nextProductInsights, nextVisits] =
        await Promise.all([
          dashboardService.getStats(),
          dashboardService.getOrderInsights(),
          dashboardService.getProductInsights(),
          // Le compteur de visites n'est pas critique : s'il echoue on garde un
          // graphique vide plutot que de faire tomber tout le tableau de bord.
          getVisitsSummary(visitsWeekOffset).catch(() => emptyVisits())
        ]);
      setStats(nextStats);
      setOrderInsights(nextOrderInsights);
      setProductInsights(nextProductInsights);
      setVisits(nextVisits);
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

  // Le changement de semaine recharge uniquement les visites : inutile de
  // re-demander les commandes, le stock et les produits a chaque fleche.
  const loadVisits = async (offset: number) => {
    try {
      const next = await getVisitsSummary(offset);
      setVisits(next);
    } catch {
      setVisits(emptyVisits());
    }
  };

  const goToVisitsWeek = (nextOffset: number) => {
    setVisitsWeekOffset(nextOffset);
    void loadVisits(nextOffset);
  };

  const refreshVisits = async () => {
    await loadVisits(visitsWeekOffset);
  };

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

  const presenceHint = useMemo(() => {
    if (!isConnected) {
      return "Compteur figé, reconnexion en cours";
    }
    const sessions = presence.connected_customer_sessions;
    if (sessions > presence.connected_customers) {
      return `${sessions.toLocaleString("fr-FR")} sessions ouvertes · ${presence.connected_staff.toLocaleString("fr-FR")} au back-office`;
    }
    return `${presence.connected_staff.toLocaleString("fr-FR")} au back-office`;
  }, [isConnected, presence]);

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

  // ── Visites du front-office (jour par jour sur la semaine affichee) ──
  // Date du jour au format "AAAA-MM-JJ", pour comparer aux dates de l'API et
  // reperer les colonnes qui n'ont pas encore de donnee.
  const today = new Date().toLocaleDateString("sv-SE");

  // L'API renvoie les sept jours de la semaine, du lundi au dimanche, jours
  // sans visite inclus (count a 0) : pas de trou dans les barres, donc pas
  // d'ambiguite entre « aucune visite » et « aucune donnee ».
  const visitSeries = useMemo(() => visits.by_day ?? [], [visits.by_day]);

  const maxVisits = useMemo(
    () => Math.max(...visitSeries.map((day) => day.count), 1),
    [visitSeries]
  );

  const visitsPerDayAverage = useMemo(() => {
    if (visitSeries.length === 0) return 0;
    const sum = visitSeries.reduce((acc, day) => acc + day.count, 0);
    // Moyenne sur les sept jours, jours sans visite inclus : c'est le rythme
    // du trafic, pas le total divise par les seuls jours actifs.
    return Math.round(sum / visitSeries.length);
  }, [visitSeries]);

  const busiestVisitDay = useMemo(() => {
    let best: VisitDay | null = null;
    for (const day of visitSeries) {
      if (day.count > 0 && (best === null || day.count > best.count)) {
        best = day;
      }
    }
    return best;
  }, [visitSeries]);

  const weekDeltaLabel = useMemo(() => {
    const delta = visits.total - visits.previous_week_total;
    if (delta === 0) {
      return { text: "identique a la semaine precedente", tone: "text-muted" };
    }
    const percent =
      visits.previous_week_total > 0
        ? Math.round((delta / visits.previous_week_total) * 100)
        : null;
    const sign = delta > 0 ? "+" : "";
    const text =
      percent === null
        ? `${sign}${delta} vs semaine precedente`
        : `${sign}${delta} (${sign}${percent}%) vs semaine precedente`;
    return {
      text,
      tone:
        delta > 0 ? "text-success" : delta < 0 ? "text-warning" : "text-muted"
    };
  }, [visits.total, visits.previous_week_total]);

  const formatVisitDay = (iso: string): string => {
    // "AAAA-MM-JJ" est interprete comme UTC par new Date(), ce qui peut reculer
    // le jour d'un cran. On passe par les parties de la chaine.
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) return iso;
    return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short"
    });
  };

  const parseIsoDate = (iso: string): Date => {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  };

  const formatWeekday = (iso: string): string => {
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) return iso;
    // "lun." -> "lun" : le point final ne sert a rien sous une barre et
    // occupe de la largeur.
    return new Date(year, month - 1, day)
      .toLocaleDateString("fr-FR", { weekday: "short" })
      .replace(/\.$/, "");
  };

  const visitsWeekLabel = useMemo(() => {
    if (!visits.week_start || !visits.week_end) return "";
    const start = parseIsoDate(visits.week_start);
    const end = parseIsoDate(visits.week_end);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: sameMonth ? undefined : "short"
    });
    const endLabel = end.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    return `${startLabel} – ${endLabel}`;
  }, [visits.week_start, visits.week_end]);

  const visitsWeekCaption = useMemo(() => {
    if (visitsWeekOffset === 0) return "Semaine en cours";
    if (visitsWeekOffset === -1) return "Semaine precedente";
    if (visitsWeekOffset === 1) return "Semaine suivante";
    return visitsWeekOffset < 0
      ? `Il y a ${Math.abs(visitsWeekOffset)} semaines`
      : `Dans ${visitsWeekOffset} semaines`;
  }, [visitsWeekOffset]);

  // Tant qu'on n'a pas quitte la semaine en cours, le bouton « revenir » est
  // inutile.
  const isCurrentVisitsWeek = visitsWeekOffset === 0;

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
                onClick={() => {
                  void loadStats();
                  void refreshVisits();
                }}
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
        <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
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

          {/* ── Clients connectés (temps réel) ── */}
          <article
            className="animate-fade-up group relative overflow-hidden rounded-2xl border border-success/40 bg-panel/80 p-5 shadow-[0_18px_36px_-28px_rgba(8,18,38,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-26px_rgba(8,18,38,0.75)]"
            style={{ animationDelay: `${kpis.length * 70}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-success/70 to-brand/70 opacity-70" />
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/25">
                <Users className="h-5 w-5" />
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 ${
                  isConnected
                    ? "bg-success/10 text-success ring-success/30"
                    : "bg-muted/10 text-muted ring-border"
                }`}
              >
                {isConnected && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                )}
                {isConnected ? "En direct" : "Hors ligne"}
              </span>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Clients connectés
            </p>
            <p className="mt-1 block text-3xl font-bold text-ink tabular-nums">
              {presence.connected_customers.toLocaleString("fr-FR")}
            </p>
            <p className="mt-1.5 truncate text-xs text-muted">{presenceHint}</p>
          </article>
        </section>

        {/* ── Volumes & résumé ── */}
        {/* `grid-cols-1` est indispensable : sans colonne de base, la piste
            implicite est en `auto` et seede sur le min-content des cartes, qui
            sort alors du conteneur sur petit ecran au lieu de tronquer. */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
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

        {/* ── Visites du front-office (par semaine) ── */}
        <section>
          <article className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/25">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Visites du front-office
                  </h3>
                  <p className="text-sm text-muted">
                    Un visiteur compte une fois par jour, tous appareils
                  </p>
                </div>
              </div>

              {/* Navigation par semaine : la semaine affichee, et les fleches
                  pour reculer ou avancer d'une semaine. */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToVisitsWeek(visitsWeekOffset - 1)}
                  aria-label="Semaine precedente"
                  title="Semaine precedente"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-ink transition hover:border-brand/40 hover:bg-brand-soft/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="min-w-[11.5rem] rounded-xl border border-border/60 bg-bg/60 px-3 py-1.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                    {visitsWeekCaption}
                  </p>
                  <p className="text-sm font-bold text-ink">
                    {isLoading ? "..." : visitsWeekLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => goToVisitsWeek(visitsWeekOffset + 1)}
                  aria-label="Semaine suivante"
                  title="Semaine suivante"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-ink transition hover:border-brand/40 hover:bg-brand-soft/30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chiffres de la semaine affichee. */}
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Visites sur la semaine
                </p>
                <p className="mt-0.5 text-3xl font-bold text-ink tabular-nums">
                  {isLoading ? "..." : visits.total.toLocaleString("fr-FR")}
                </p>
                {weekDeltaLabel && (
                  <p className={`mt-1 text-xs font-semibold ${weekDeltaLabel.tone}`}>
                    {weekDeltaLabel.text}
                  </p>
                )}
              </div>

              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Moyenne / jour
                </p>
                <p className="mt-0.5 text-2xl font-bold text-brand tabular-nums">
                  {isLoading ? "..." : visitsPerDayAverage.toLocaleString("fr-FR")}
                </p>
                <p className="mt-1 text-xs text-muted">sur 7 jours</p>
              </div>

              {!isCurrentVisitsWeek && (
                <button
                  type="button"
                  onClick={() => goToVisitsWeek(0)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-panel px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand/40 hover:bg-brand-soft/30"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revenir a la semaine en cours
                </button>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="mt-6 h-44 w-full" />
            ) : visitSeries.length === 0 ? (
              <p className="mt-6 text-sm text-muted">
                Aucune visite enregistree pour le moment.
              </p>
            ) : (
              <>
                {/* Une colonne par jour, du lundi au dimanche, hauteur
                    proportionnelle au maximum de la semaine. */}
                <div className="mt-6 flex h-44 items-end gap-1.5 sm:gap-2">
                  {visitSeries.map((day) => {
                    const heightPct = (day.count / maxVisits) * 100;
                    // Jour deja ecoule : au-dela, la barre n'a pas encore de
                    // donnee, on l'estompe pour ne pas la lire comme un zero.
                    const isFuture = parseIsoDate(day.date) > new Date();
                    const isToday = day.date === today;
                    return (
                      <div
                        key={day.date}
                        className={`group relative flex h-full min-w-0 flex-1 flex-col justify-end ${
                          isToday ? "rounded-lg bg-brand/5" : ""
                        }`}
                      >
                        {/* Valeur au-dessus des barres actives : lisible sans
                            survol, sinon il faudrait hoverer chaque jour. */}
                        {day.count > 0 && !isFuture && (
                          <span className="mb-1 block text-center text-[10px] font-semibold text-muted tabular-nums">
                            {day.count}
                          </span>
                        )}
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-brand to-warning transition-all duration-500 group-hover:opacity-80"
                          style={{
                            height:
                              day.count > 0
                                ? `${Math.max(heightPct, 3)}%`
                                : "3px",
                            opacity:
                              day.count > 0
                                ? 0.35 + (heightPct / 100) * 0.65
                                : isFuture
                                  ? 0.08
                                  : 0.15
                          }}
                        />
                        <span
                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-panel px-2 py-1 text-[11px] font-semibold text-ink shadow-lg group-hover:block"
                          role="tooltip"
                        >
                          {formatWeekday(day.date)} {formatVisitDay(day.date)} –{" "}
                          {day.count.toLocaleString("fr-FR")}
                          {day.count > 1 ? " visites" : " visite"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Jour de la semaine sous chaque barre : la semaine se lit
                    directement, du lundi au dimanche. */}
                <div className="mt-2 flex gap-1.5 sm:gap-2">
                  {visitSeries.map((day) => {
                    const isToday = day.date === today;
                    return (
                      <span
                        key={day.date}
                        className={`min-w-0 flex-1 truncate text-center text-[11px] ${
                          isToday ? "font-bold text-brand" : "text-muted"
                        }`}
                      >
                        {formatWeekday(day.date)}
                      </span>
                    );
                  })}
                </div>

                {busiestVisitDay && (
                  <p className="mt-4 text-sm text-muted">
                    Meilleur jour :{" "}
                    <span className="font-semibold text-ink">
                      {formatWeekday(busiestVisitDay.date)}{" "}
                      {formatVisitDay(busiestVisitDay.date)}
                    </span>{" "}
                    avec{" "}
                    <span className="font-semibold text-ink tabular-nums">
                      {busiestVisitDay.count.toLocaleString("fr-FR")}
                    </span>{" "}
                    visites
                  </p>
                )}
              </>
            )}
          </article>
        </section>

        {/* ── Catégories & donut ── */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
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
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
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
