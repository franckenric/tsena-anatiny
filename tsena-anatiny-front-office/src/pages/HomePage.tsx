import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  BadgePercent,
  Banknote,
  Flame,
  PackageSearch,
  RefreshCcw,
  Search,
  ShieldCheck,
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
import { useAuth } from "../contexts/AuthContext";
import {
  cn,
  formatAr,
  getRecentProductIds,
  resolveImageUrl
} from "../lib/utils";

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

function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 5) return "Bonsoir";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
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

function categoryGradient(name?: string): string {
  const n = (name ?? "").toLowerCase();
  if (/l[ée]gume|fruit|mara/.test(n)) return "from-emerald-100 to-lime-200";
  if (/riz/.test(n)) return "from-amber-100 to-yellow-200";
  if (/viande|poulet|volaille/.test(n)) return "from-rose-100 to-red-200";
  if (/poisson|crevette|fruit de mer/.test(n)) return "from-sky-100 to-cyan-200";
  if (/lait|fromage|produit laitier/.test(n)) return "from-violet-100 to-purple-200";
  if (/boisson|jus|soda|eau/.test(n)) return "from-blue-100 to-indigo-200";
  if (/c[éè]r[éè]ale|farine|bl[ée]/.test(n)) return "from-yellow-100 to-amber-200";
  if (/[éè]pice|poivre|sel/.test(n)) return "from-red-100 to-orange-200";
  if (/huile/.test(n)) return "from-lime-100 to-emerald-200";
  if (/sucre|chocolat|bonbon/.test(n)) return "from-pink-100 to-rose-200";
  if (/oeuf|œuf/.test(n)) return "from-orange-100 to-yellow-200";
  if (/pain|boulangerie/.test(n)) return "from-amber-100 to-orange-200";
  if (/caf[éè]|th[éè]/.test(n)) return "from-stone-200 to-amber-200";
  if (/bio|miel|sant/.test(n)) return "from-emerald-100 to-green-200";
  return "from-brand-soft to-emerald-100";
}

const TRUST = [
  { icon: Banknote, label: "Paiement à la réception" },
  { icon: Truck, label: "Livraison rapide" },
  { icon: ShieldCheck, label: "Retours faciles" }
];

function AnnouncementBar() {
  return (
    <div className="bg-gradient-to-r from-[#9a3412] via-brand to-[#9a3412] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold tracking-wide sm:text-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <Truck className="h-3.5 w-3.5 shrink-0" />
        <span>Livraison à domicile — paiement à la réception</span>
      </div>
    </div>
  );
}

function GreetingHero({
  featured,
  onExplore,
  onNewest
}: {
  featured: Product | null;
  onExplore: () => void;
  onNewest: () => void;
}) {
  const { customer, isBooting } = useAuth();
  const history = useHistory();
  const [query, setQuery] = useState("");
  const firstName = (customer?.name ?? "").trim().split(" ")[0] ?? "";

  const image = featured ? resolveImageUrl(featured.image) : null;
  const price = featured ? getProductDisplayPrice(featured) : 0;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    history.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  return (
    <section className="mx-4 mt-4 animate-fade-up sm:mx-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#7c2d12] via-brand to-[hsl(16_85%_14%)] px-5 pb-6 pt-6 text-white shadow-glow sm:px-8 sm:pb-8 sm:pt-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-8 h-14 w-14 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute right-16 top-16 h-8 w-8 rounded-full border border-white/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold ring-1 ring-white/20 backdrop-blur-sm">
              {!isBooting && firstName ? (
                firstName[0].toUpperCase()
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {greetingLabel()}
              </p>
              <p className="truncate text-base font-bold">
                {!isBooting && firstName
                  ? `${firstName} 👋`
                  : "Bienvenue chez Tsena Anatiny"}
              </p>
            </div>
          </div>

          <h1 className="mt-5 font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
            Vos produits,
            <br />
            livrés chez vous.
          </h1>
          <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-white/85">
            Produits frais, de qualité. Paiement à la réception, sans avance.
          </p>

          <form onSubmit={handleSearch} className="mt-5 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full rounded-2xl bg-white py-3.5 pl-12 pr-4 text-[15px] font-medium text-ink shadow-lg outline-none transition placeholder:text-muted/70 focus:ring-4 focus:ring-white/25"
              />
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
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

          <div className="mt-6 grid grid-cols-3 gap-2">
            {TRUST.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-2 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 text-white" />
                <span className="text-[10px] font-semibold leading-tight text-white/85">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {image && featured && (
          <div className="absolute -bottom-4 -right-2 z-10 hidden w-40 rotate-3 overflow-hidden rounded-3xl border-4 border-white/25 bg-panel shadow-2xl sm:block lg:w-48">
            <img
              src={image}
              alt={featured.name}
              className="aspect-square w-full object-cover"
            />
            <div className="flex items-center justify-between gap-2 bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
                  En vedette
                </p>
                <p className="truncate text-xs font-bold text-ink">
                  {featured.name}
                </p>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-brand">
                {price > 0 ? formatAr(price) : ""}
              </span>
            </div>
          </div>
        )}
      </div>
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
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-soft">
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

function CategoryRail({
  categories,
  counts,
  totalCount,
  activeCategory
}: {
  categories: Category[];
  counts: Map<number, number>;
  totalCount: number;
  activeCategory: number | null;
}) {
  if (categories.length === 0) return null;

  const tile = cn(
    "relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-3xl text-2xl shadow-card ring-2 transition"
  );

  return (
    <section className="mt-5 animate-fade-up">
      <SectionHeader title="Catégories" icon={Store} />
      <div className="scrollbar-hide -mx-4 mt-2 flex snap-x gap-4 overflow-x-auto px-4 pb-1 pt-1 sm:mx-0 sm:px-6">
        <Link
          to="/"
          className={cn(
            "flex shrink-0 snap-start flex-col items-center gap-1.5",
            activeCategory == null ? "" : "opacity-55"
          )}
        >
          <span
            className={cn(
              tile,
              activeCategory == null
                ? "bg-brand text-white ring-brand"
                : "bg-brand-soft text-brand ring-transparent"
            )}
          >
            <ShoppingBag className="h-6 w-6" />
            <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white ring-2 ring-bg">
              {totalCount}
            </span>
          </span>
          <span className="max-w-24 text-center text-[11px] font-semibold leading-tight text-ink">
            Tout
          </span>
        </Link>

        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/?cat=${c.id}`}
            className={cn(
              "flex shrink-0 snap-start flex-col items-center gap-1.5",
              activeCategory === c.id ? "" : "opacity-70"
            )}
          >
            <span
              className={cn(
                tile,
                "bg-gradient-to-br",
                categoryGradient(c.name),
                activeCategory === c.id ? "ring-brand" : "ring-transparent"
              )}
            >
              {categoryEmoji(c.name)}
              <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-panel px-1 text-[10px] font-bold text-brand shadow-card ring-1 ring-border">
                {counts.get(c.id) ?? 0}
              </span>
            </span>
            <span className="max-w-24 text-center text-[11px] font-semibold leading-tight text-ink">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductRail({
  title,
  icon: Icon,
  action,
  products,
  delay = 0
}: {
  title: string;
  icon?: typeof Flame;
  action?: { label: string; onPress: () => void };
  products: Product[];
  delay?: number;
}) {
  if (products.length === 0) return null;
  return (
    <section className="mt-6 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <SectionHeader title={title} icon={Icon} action={action} />
      <div className="scrollbar-hide -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="w-40 shrink-0 snap-start sm:w-48"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PromoBanner({ onPress }: { onPress: () => void }) {
  return (
    <section className="mx-4 mt-6 animate-fade-up sm:mx-6">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-accent via-[hsl(24_92%_45%)] to-[hsl(8_85%_40%)] p-6 text-white shadow-glow sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
        <div className="pointer-events-none absolute right-10 top-6 h-12 w-12 rounded-full border border-white/20" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/85">
              <BadgePercent className="h-4 w-4" />
              Bonne affaire
            </p>
            <h2 className="mt-1.5 font-display text-lg font-bold leading-snug sm:text-xl">
              Commandez maintenant,
              <br />
              payez à la réception.
            </h2>
          </div>
          <button
            type="button"
            onClick={onPress}
            className="shrink-0 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-brand shadow-card transition hover:bg-white/90 active:scale-95"
          >
            Découvrir
          </button>
        </div>
      </div>
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

  const categoryCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of availableProducts) {
      map.set(p.category_id, (map.get(p.category_id) ?? 0) + 1);
    }
    return map;
  }, [availableProducts]);

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
      <div className="pb-8">
        <AnnouncementBar />
        <GreetingHero
          featured={availableProducts[0] ?? null}
          onExplore={scrollToProducts}
          onNewest={goNewest}
        />
        <CategoryRail
          categories={categories}
          counts={categoryCounts}
          totalCount={availableProducts.length}
          activeCategory={activeCategory}
        />

        {!hasActiveFilter && newestProducts.length > 0 && (
          <ProductRail
            title="Nouveautés"
            icon={Flame}
            delay={40}
            action={{
              label: "Tout voir",
              onPress: () => {
                setSort("newest");
                history.push("/");
              }
            }}
            products={newestProducts}
          />
        )}

        {!hasActiveFilter && (
          <PromoBanner onPress={scrollToProducts} />
        )}

        <section
          ref={productsRef}
          className="mt-6 scroll-mt-4 px-4 sm:px-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-ink">
                {hasActiveFilter ? "Résultats" : "Tous les produits"}
              </h2>
              {!isLoading && (
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">
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
            <div className="mt-2 flex flex-wrap gap-2">
              {query && (
                <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-muted">
                  « {query} »
                </span>
              )}
              {activeCategoryName && (
                <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-muted">
                  {activeCategoryName}
                </span>
              )}
              {!hasActiveFilter && sort !== "pertinence" && (
                <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-muted">
                  Tri : {SORT_LABELS[sort].toLowerCase()}
                </span>
              )}
            </div>
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
          <ProductRail
            title={
              recentProducts.length > 0
                ? "Recommandé pour vous"
                : "À découvrir"
            }
            icon={Sparkles}
            delay={80}
            products={recommended}
          />
        )}
      </div>
    </Page>
  );
}
