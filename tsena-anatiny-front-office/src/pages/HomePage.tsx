import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Banknote,
  BadgePercent,
  Flame,
  PackageSearch,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Store,
  Truck
} from "lucide-react";
import { categoriesService } from "../services/categories.service";
import {
  productsService,
  getProductTotalStock,
  getProductDisplayPrice
} from "../services/products.service";
import type { Category, Product } from "../types/product";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeletons";
import { Page } from "../components/Page";
import { cn, getRecentProductIds, resolveImageUrl } from "../lib/utils";

const PAGE_SIZE = 200;

type SortKey = "pertinence" | "price-asc" | "price-desc" | "name" | "newest";

function productPrice(product: Product): number {
  return getProductDisplayPrice(product);
}

const SORT_LABELS: Record<SortKey, string> = {
  pertinence: "Pertinence",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  name: "Nom (A → Z)",
  newest: "Nouveautés"
};

function isAvailable(product: Product): boolean {
  if (product.status === "inactive") return false;
  return getProductTotalStock(product) > 0;
}

function categoryEmoji(name?: string): string {
  if (!name) return "🛒";
  const n = name.toLowerCase();
  if (/l[ée]gume|fruit|mara/.test(n)) return "🥬";
  if (/riz/.test(n)) return "🍚";
  if (/viande|poulet|volaille/.test(n)) return "🥩";
  if (/poisson|crevette|fruit de mer/.test(n)) return "🐟";
  if (/lait|fromage|produit laitier/.test(n)) return "🥛";
  if (/boisson|jus|soda|eau/.test(n)) return "🧃";
  if (/c[éè]r[éè]ale|farine|bl[ée]/.test(n)) return "🌾";
  if (/[éè]pice|poivre|sel/.test(n)) return "🌶️";
  if (/huile/.test(n)) return "🌻";
  if (/sucre|chocolat|bonbon/.test(n)) return "🍬";
  if (/oeuf|œuf/.test(n)) return "🥚";
  if (/pain|boulangerie/.test(n)) return "🥖";
  if (/caf[éè]|th[éè]/.test(n)) return "☕";
  if (/bio|miel|sant/.test(n)) return "🌱";
  return "🛒";
}

const TRUST = [
  { icon: Truck, label: "Livraison rapide" },
  { icon: Banknote, label: "Paiement à la livraison" },
  { icon: RefreshCcw, label: "Retours faciles" }
];

function AnnouncementBar() {
  return (
    <div className="bg-gradient-to-r from-[#0b5f42] via-brand to-[#0b5f42] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold tracking-wide sm:text-sm">
        <Truck className="h-3.5 w-3.5 shrink-0" />
        <span>Livraison à domicile — paiement à la réception</span>
      </div>
    </div>
  );
}

function TrustBadges() {
  return (
    <section className="mx-4 mt-4 flex items-stretch justify-between gap-2 sm:mx-6">
      {TRUST.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-panel px-3 py-2.5 shadow-card"
        >
          <Icon className="h-4 w-4 shrink-0 text-brand" />
          <span className="text-[11px] font-semibold leading-tight text-ink">
            {label}
          </span>
        </div>
      ))}
    </section>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  action
}: {
  title: string;
  icon?: typeof Flame;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft">
            <Icon className="h-4 w-4 text-brand" />
          </span>
        )}
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={action.onPress}
          className="flex items-center gap-1 rounded-xl bg-brand-soft px-2.5 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/15 active:scale-95"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Hero({
  featured,
  onExplore,
  onNewest
}: {
  featured: Product | null;
  onExplore: () => void;
  onNewest: () => void;
}) {
  const image = featured ? resolveImageUrl(featured.image) : null;
  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b5f42] via-brand to-[hsl(158_92%_15%)] px-6 pb-6 pt-7 text-white shadow-glow sm:mx-6 sm:px-9 sm:py-12">
      <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute right-6 top-6 h-16 w-16 rounded-full border border-white/15" />
      <div className="pointer-events-none absolute right-12 top-12 h-10 w-10 rounded-full border border-white/10" />

      <div className="relative z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-white/20 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Bienvenue
        </span>

        <h1 className="mt-4 max-w-md text-3xl font-extrabold leading-[1.08] sm:text-4xl">
          Vos produits,
          <br />
          livrés chez vous.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">
          Frais, de qualité, commandés en quelques clics. Paiement à la
          réception.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-brand shadow-lg transition hover:bg-white/90 active:scale-95"
          >
            Explorer la boutique
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNewest}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3.5 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20 active:scale-95"
          >
            <Flame className="h-4 w-4 text-accent" />
            Nouveautés
          </button>
        </div>
      </div>

      {image && (
        <div className="absolute -right-3 -bottom-3 z-10 w-28 rotate-3 overflow-hidden rounded-2xl border-4 border-white/20 bg-panel shadow-2xl sm:right-10 sm:top-1/2 sm:w-44 sm:-translate-y-1/2 sm:rotate-6">
          <img
            src={image}
            alt="Produit en vedette"
            className="aspect-square w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1.5 text-center backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">
              En vedette
            </p>
            {featured && (
              <p className="truncate text-[11px] font-bold text-white">
                {featured.name}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function HomePage() {
  const history = useHistory();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const query = (searchParams.get("q") ?? "").toLowerCase().trim();
  const rawCat = searchParams.get("cat");
  const activeCategory =
    rawCat && Number.isFinite(Number(rawCat)) ? Number(rawCat) : null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("pertinence");

  const productsRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (pageToLoad: number, append: boolean) => {
    try {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      const res = await productsService.getProducts(pageToLoad, PAGE_SIZE);
      setTotal(typeof res.total === "number" ? res.total : 0);
      setProducts((prev) => {
        if (!append) return res.items ?? [];
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...(res.items ?? []).filter((p) => !ids.has(p.id))];
      });
      setPage(pageToLoad);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement catalogue");
      return false;
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let mounted = true;
    Promise.all([categoriesService.getCategories()])
      .then(([catRes]) => {
        if (cancelled) return;
        setCategories(
          (catRes.items ?? []).filter((c) => !c.status || c.status !== "inactive")
        );
      })
      .catch(() => {
        // catégories optionnelles
      })
      .finally(() => {
        if (mounted) void loadPage(1, false);
      });
    return () => {
      cancelled = true;
      mounted = false;
    };
  }, [loadPage]);

  const availableProducts = useMemo(
    () => products.filter(isAvailable),
    [products]
  );

  const newestProducts = useMemo(
    () =>
      [...availableProducts]
        .sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        )
        .slice(0, 10),
    [availableProducts]
  );

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (p.status === "inactive") return false;
      if (getProductTotalStock(p) <= 0) return false;
      if (activeCategory != null && p.category_id !== activeCategory)
        return false;
      if (query) {
        const name = (p.name ?? "").toLowerCase();
        const category = (p.categorie?.name ?? "").toLowerCase();
        const sku = (p.sku ?? "").toLowerCase();
        if (
          !name.includes(query) &&
          !category.includes(query) &&
          !sku.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });

    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => productPrice(a) - productPrice(b));
      case "price-desc":
        return [...list].sort((a, b) => productPrice(b) - productPrice(a));
      case "name":
        return [...list].sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", "fr")
        );
      case "newest":
        return [...list].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        );
      default:
        return list;
    }
  }, [products, activeCategory, query, sort]);

  const recentProducts = useMemo(() => {
    if (query || activeCategory != null) return [];
    const ids = getRecentProductIds();
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }, [products, query, activeCategory]);

  const recommended = useMemo(() => {
    if (query || activeCategory != null) return [];
    const recent = recentProducts;
    const recentIds = new Set(recent.map((p) => p.id));
    const fill = availableProducts.filter((p) => !recentIds.has(p.id));
    return [...recent, ...fill].slice(0, 10);
  }, [recentProducts, availableProducts, query, activeCategory]);

  const activeCategoryName = activeCategory != null
    ? categories.find((c) => c.id === activeCategory)?.name
    : null;

  const hasActiveFilter = Boolean(query) || activeCategory != null;

  const scrollToProducts = () =>
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const goNewest = () => {
    setSort("newest");
    scrollToProducts();
  };

  return (
    <Page>
      <div className="pb-12">
        <AnnouncementBar />
        <Hero
          featured={availableProducts[0] ?? null}
          onExplore={scrollToProducts}
          onNewest={goNewest}
        />
        <TrustBadges />

        {categories.length > 0 && (
          <section className="mt-7">
            <SectionHeader title="Catégories" icon={Store} />
            <div className="scrollbar-hide -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 pt-1 sm:mx-0 sm:px-6">
              <Link
                to="/"
                className={cn(
                  "flex w-20 shrink-0 snap-start flex-col items-center gap-2",
                  activeCategory == null ? "" : "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-card ring-2 transition",
                    activeCategory == null
                      ? "bg-brand text-white ring-brand"
                      : "bg-brand-soft ring-transparent"
                  )}
                >
                  <ShoppingBag className="h-6 w-6" />
                </span>
                <span className="w-20 truncate text-center text-[11px] font-semibold text-ink">
                  Tout
                </span>
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/?cat=${c.id}`}
                  className={cn(
                    "flex w-20 shrink-0 snap-start flex-col items-center gap-2",
                    activeCategory === c.id ? "" : "opacity-70"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-soft to-brand/20 text-2xl shadow-card ring-2 transition",
                      activeCategory === c.id
                        ? "ring-brand"
                        : "ring-transparent"
                    )}
                  >
                    {categoryEmoji(c.name)}
                  </span>
                  <span className="w-20 truncate text-center text-[11px] font-semibold text-ink">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!hasActiveFilter && newestProducts.length > 0 && (
          <section className="mt-8">
            <SectionHeader
              title="Nouveautés"
              icon={Flame}
              action={{
                label: "Tout voir",
                onPress: () => {
                  setSort("newest");
                  history.push("/");
                }
              }}
            />
            <div className="scrollbar-hide -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-6">
              {newestProducts.map((product) => (
                <div
                  key={product.id}
                  className="w-40 shrink-0 snap-start sm:w-48"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {!hasActiveFilter && (
          <section className="mx-4 mt-8 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-accent via-[hsl(24_92%_45%)] to-[hsl(8_85%_40%)] p-5 text-white shadow-glow sm:mx-6 sm:p-7">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80">
                  <BadgePercent className="h-4 w-4" />
                  Bonne affaire
                </p>
                <h2 className="mt-1 text-lg font-bold leading-snug sm:text-xl">
                  Commandez maintenant,
                  <br />
                  payez à la réception.
                </h2>
              </div>
              <button
                type="button"
                onClick={scrollToProducts}
                className="shrink-0 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-brand shadow-card transition hover:bg-white/90 active:scale-95"
              >
                Découvrir
              </button>
            </div>
          </section>
        )}

        <section
          ref={productsRef}
          className="mt-8 scroll-mt-4 px-4 sm:px-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-ink">
                {hasActiveFilter ? "Résultats" : "Tous les produits"}
              </h2>
              {!isLoading && (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                  {filtered.length}
                </span>
              )}
            </div>
            <label className="flex items-center gap-2">
              <span className="hidden text-xs font-semibold uppercase tracking-widest text-muted sm:block">
                Trier
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 rounded-xl border border-border bg-panel px-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(hasActiveFilter || sort !== "pertinence") && (
            <p className="mt-1.5 text-sm text-muted">
              {query ? `Recherche « ${query} »` : ""}
              {activeCategoryName ? `Catégorie : ${activeCategoryName}` : ""}
              {!hasActiveFilter && sort !== "pertinence"
                ? `Tri : ${SORT_LABELS[sort].toLowerCase()}`
                : ""}
            </p>
          )}

          {isLoading ? (
            <div className="mt-4">
              <ProductGridSkeleton count={8} />
            </div>
          ) : error ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-[1.75rem] border border-danger/30 bg-danger/5 p-10 text-center">
              <PackageSearch className="h-12 w-12 text-danger/60" />
              <p className="text-sm font-medium text-danger">{error}</p>
              <button
                type="button"
                onClick={() => void loadPage(1, false)}
                className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink/90 active:scale-95"
              >
                <RefreshCcw className="h-4 w-4" />
                Réessayer
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-[1.75rem] border border-border bg-panel p-14 text-center">
              <PackageSearch className="h-12 w-12 text-muted" />
              <p className="text-lg font-semibold text-ink">
                Aucun produit trouvé
              </p>
              <p className="max-w-md text-sm text-muted">
                Essayez de modifier votre recherche ou de changer de catégorie.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {products.length < total && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadPage(page + 1, true)}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 rounded-2xl border border-ink px-6 py-3 text-sm font-bold text-ink transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <span className="h-4 w-4 shrink-0 animate-spin-slow rounded-full border-2 border-current border-t-transparent" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Voir plus
                        <ArrowDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {!hasActiveFilter && recommended.length > 0 && (
          <section className="mt-10">
            <SectionHeader
              title={
                recentProducts.length > 0
                  ? "Recommandé pour vous"
                  : "À découvrir"
              }
              icon={Sparkles}
            />
            <div className="scrollbar-hide -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-6">
              {recommended.map((product) => (
                <div
                  key={product.id}
                  className="w-40 shrink-0 snap-start sm:w-48"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Page>
  );
}
