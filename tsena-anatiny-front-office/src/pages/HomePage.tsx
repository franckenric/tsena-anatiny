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
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  X
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
import { PromoCodeCard } from "../components/PromoCodeCard";
import { Page } from "../components/Page";
import { useAuth } from "../contexts/AuthContext";
import {
  cn,
  formatAr,
  getRecentProductIds,
  resolveImageUrl
} from "../lib/utils";
import { useI18n } from "../contexts/I18nContext";

const PAGE_SIZE = 200;

type SortKey = "pertinence" | "price-asc" | "price-desc" | "name" | "newest";

function productPrice(product: Product): number {
  return getProductDisplayPrice(product);
}

const SORT_KEYS: Record<SortKey, string> = {
  pertinence: "home.sort.pertinence",
  "price-asc": "home.sort.priceAsc",
  "price-desc": "home.sort.priceDesc",
  name: "home.sort.name",
  newest: "home.sort.newest"
};

function isAvailable(product: Product): boolean {
  if (product.status === "inactive") return false;
  return getProductTotalStock(product) > 0;
}

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 5) return "home.greeting.night";
  if (h < 12) return "home.greeting.morning";
  if (h < 18) return "home.greeting.afternoon";
  return "home.greeting.evening";
}

const TRUST = [
  { icon: Banknote, labelKey: "home.trust.cod" },
  { icon: Truck, labelKey: "home.trust.fastDelivery" },
  { icon: ShieldCheck, labelKey: "home.trust.easyReturns" }
];

function AnnouncementBar() {
  const { t } = useI18n();
  return (
    <div className="bg-gradient-to-r from-[#9a3412] via-brand to-[#9a3412] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold tracking-wide sm:text-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <Truck className="h-3.5 w-3.5 shrink-0" />
        <span>{t("home.announcement")}</span>
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
  const { t } = useI18n();
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
    <section className="mx-4 mt-4 animate-fade-up sm:mx-6 lg:mx-auto lg:max-w-6xl">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-[hsl(16_80%_38%)] to-[#7c2d12] px-6 pb-7 pt-7 text-white shadow-glow sm:px-9 sm:pb-9 sm:pt-9 lg:flex lg:items-center lg:gap-8">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 animate-pulse-slow rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="relative z-10 min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2 pr-3.5 text-xs font-semibold ring-1 ring-white/20 backdrop-blur-md">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {!isBooting && firstName ? (
                firstName[0].toUpperCase()
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
            </span>
            <span className="max-w-[14rem] truncate">
              {!isBooting && firstName
                ? `${t(greetingKey())}, ${firstName} 👋`
                : t("home.welcome")}
            </span>
          </span>

          <h1 className="mt-4 font-display text-[2.1rem] font-extrabold leading-[1.04] tracking-tight sm:text-5xl">
            {t("home.heroTitle1")}{" "}
            <span className="bg-gradient-to-r from-accent-soft to-white bg-clip-text text-transparent">
              {t("home.heroTitle2")}
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            {t("home.heroSub")}
          </p>

          <form onSubmit={handleSearch} className="mt-6 max-w-lg">
            <div className="group flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-white/40 transition focus-within:ring-4 focus-within:ring-white/30">
              <Search className="pointer-events-none ml-3 h-5 w-5 shrink-0 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("header.searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] font-medium text-ink outline-none placeholder:text-muted/60"
              />
              <button
                type="submit"
                aria-label={t("header.searchPlaceholder")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-glow transition hover:bg-brand/90 active:scale-90"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand shadow-lift transition hover:bg-white/90 active:scale-95"
            >
              {t("home.explore")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={onNewest}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
            >
              <Flame className="h-4 w-4 text-accent-soft" />
              {t("home.new")}
            </button>
          </div>

          <div className="mt-6 hidden flex-wrap items-center gap-2.5 sm:flex">
            {TRUST.map(({ icon: Icon, labelKey }) => (
              <span
                key={labelKey}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-accent-soft" />
                {t(labelKey)}
              </span>
            ))}
          </div>
        </div>

        {image && featured && (
          <div className="relative z-10 mt-7 hidden shrink-0 lg:block">
            <div className="absolute -left-6 -top-6 h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm" />
            <div className="group relative w-56 rotate-2 overflow-hidden rounded-3xl bg-panel shadow-lift ring-1 ring-white/40 transition-transform duration-500 hover:rotate-0">
              <img
                src={image}
                alt={featured.name}
                className="aspect-square w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    {t("home.featured")}
                  </p>
                  <p className="truncate text-sm font-bold text-ink">
                    {featured.name}
                  </p>
                </div>
                <span className="shrink-0 text-base font-extrabold text-brand">
                  {price > 0 ? formatAr(price) : ""}
                </span>
              </div>
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
      <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-ink sm:text-2xl">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-card ring-1 ring-brand/10">
            <Icon className="h-5 w-5 text-brand" />
          </span>
        )}
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={action.onPress}
          className="group flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-2 text-sm font-bold text-brand transition hover:bg-brand hover:text-white active:scale-95"
        >
          {action.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

function CategoryRail({
  categories,
  activeCategories,
  onToggleCategory,
  onClearCategories,
  onExplore
}: {
  categories: Category[];
  activeCategories: Set<number>;
  onToggleCategory: (id: number) => void;
  onClearCategories: () => void;
  onExplore?: () => void;
}) {
  const { t } = useI18n();
  if (categories.length === 0) return null;

  const visible = categories.slice(0, 12);
  const isAllSelected = activeCategories.size === 0;

  const chip =
    "shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95";

  return (
    <section className="mt-6 animate-fade-up lg:mx-auto lg:max-w-6xl">
      <SectionHeader
        title={t("home.categories")}
        icon={Store}
        action={
          onExplore ? { label: t("common.seeAll"), onPress: onExplore } : undefined
        }
      />
      <div className="mx-4 mt-3 rounded-2xl border border-border bg-panel p-1.5 shadow-card sm:mx-6 lg:mx-auto lg:max-w-6xl">
        <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={onClearCategories}
            aria-pressed={isAllSelected}
            className={cn(
              chip,
              isAllSelected
                ? "bg-brand text-white shadow-glow"
                : "text-muted hover:bg-bg hover:text-ink"
            )}
          >
            {t("common.all")}
          </button>

          <span className="h-5 w-px shrink-0 bg-border" aria-hidden />

          {visible.map((c) => {
            const selected = activeCategories.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggleCategory(c.id)}
                aria-pressed={selected}
                className={cn(
                  chip,
                  selected
                    ? "bg-brand text-white shadow-glow"
                    : "text-muted hover:bg-bg hover:text-ink"
                )}
              >
                {c.name}
              </button>
            );
          })}

          {onExplore && (
            <Link
              to="/categories"
              className={cn(
                chip,
                "flex items-center gap-1 text-brand hover:bg-brand-soft/50"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("home.allCategories")}
            </Link>
          )}
        </div>
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
  const isCompact = products.length <= 2;
  return (
    <section
      className="mt-7 animate-fade-up sm:mt-9 lg:mx-auto lg:max-w-6xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      {isCompact ? (
        <div className="mx-4 overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-brand-soft/50 via-panel to-panel p-4 shadow-card sm:mx-6 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-ink sm:text-2xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-card ring-1 ring-brand/10">
                {Icon && <Icon className="h-5 w-5 text-brand" />}
              </span>
              {title}
            </h2>
            {action && (
              <button
                type="button"
                onClick={action.onPress}
                className="group flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-95"
              >
                {action.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}

function PromoBanner({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <section className="mx-4 mt-7 animate-fade-up sm:mx-6 lg:mx-auto lg:max-w-6xl">
      <button
        type="button"
        onClick={onPress}
        className="group relative block w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-accent via-[hsl(24_92%_45%)] to-[hsl(8_85%_40%)] p-6 text-left text-white shadow-glow transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99] sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
        <div className="pointer-events-none absolute right-10 top-6 h-12 w-12 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute right-16 top-14 h-6 w-6 rounded-full border border-white/15" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white ring-1 ring-white/25 backdrop-blur-sm">
              <BadgePercent className="h-3.5 w-3.5" />
              {t("home.goodDeal")}
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold leading-snug sm:text-2xl">
              {t("home.promoTitle1")}{" "}
              {t("home.promoTitle2")}
            </h2>
          </div>
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-card transition-transform duration-300 group-hover:translate-x-1 sm:h-14 sm:w-14"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </div>
      </button>
    </section>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const history = useHistory();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const query = (searchParams.get("q") ?? "").toLowerCase().trim();
  const rawCats = searchParams.get("cats");
  const activeCategories = useMemo(() => {
    const set = new Set<number>();
    if (rawCats) {
      for (const part of rawCats.split(",")) {
        const id = Number(part);
        if (Number.isFinite(id) && id > 0) set.add(id);
      }
    }
    return set;
  }, [rawCats]);

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
      setError(err instanceof Error ? err.message : t("home.errorCatalog"));
      return false;
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  }, [t]);

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
        .slice(0, 2),
    [availableProducts]
  );

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (p.status === "inactive") return false;
      if (getProductTotalStock(p) <= 0) return false;
      if (activeCategories.size > 0 && !activeCategories.has(p.category_id))
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
  }, [products, activeCategories, query, sort]);

  const recentProducts = useMemo(() => {
    if (query || activeCategories.size > 0) return [];
    const ids = getRecentProductIds();
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }, [products, query, activeCategories]);

  const recommended = useMemo(() => {
    if (query || activeCategories.size > 0) return [];
    const recent = recentProducts;
    const recentIds = new Set(recent.map((p) => p.id));
    const fill = availableProducts.filter((p) => !recentIds.has(p.id));
    return [...recent, ...fill].slice(0, 2);
  }, [recentProducts, availableProducts, query, activeCategories]);

  const hasActiveFilter = Boolean(query) || activeCategories.size > 0;

  const updateCategories = (next: Set<number>) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (next.size > 0) params.set("cats", [...next].join(","));
    const qs = params.toString();
    history.push(qs ? `/?${qs}` : "/");
  };

  const toggleCategory = (id: number) => {
    const next = new Set(activeCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateCategories(next);
  };

  const clearCategories = () => updateCategories(new Set());

  const scrollToProducts = () =>
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const goNewest = () => {
    history.push("/nouveautes");
  };

  const selectedCategoryNames = useMemo(
    () =>
      [...activeCategories]
        .map((id) => categories.find((c) => c.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
    [activeCategories, categories]
  );

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
          activeCategories={activeCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          onExplore={() => history.push("/categories")}
        />

        {!hasActiveFilter && newestProducts.length > 0 && (
          <ProductRail
            title={t("home.new")}
            icon={Flame}
            delay={40}
            action={{
              label: t("common.seeAll"),
              onPress: () => history.push("/nouveautes")
            }}
            products={newestProducts}
          />
        )}

        {!hasActiveFilter && (
          <PromoBanner onPress={scrollToProducts} />
        )}

        <PromoCodeCard />

        <section
          ref={productsRef}
          className="mt-8 scroll-mt-4 px-4 sm:px-6 lg:mx-auto lg:max-w-6xl lg:px-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-ink">
                {hasActiveFilter ? t("home.results") : t("home.allProducts")}
              </h2>
              {!isLoading && (
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">
                  {filtered.length}
                </span>
              )}
            </div>
            <label className="flex items-center gap-2">
              <span className="hidden text-xs font-semibold uppercase tracking-widest text-muted sm:block">
                {t("home.sort")}
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 rounded-xl border border-border bg-panel px-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {(Object.keys(SORT_KEYS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {t(SORT_KEYS[key])}
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
              {selectedCategoryNames.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={t("home.removeCategory", { name })}
                    onClick={() => {
                      const id = categories.find((c) => c.name === name)?.id;
                      if (id != null) toggleCategory(id);
                    }}
                    className="text-brand transition hover:text-danger"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {!hasActiveFilter && sort !== "pertinence" && (
                <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-muted">
                  {t("home.sortLabel", { sort: t(SORT_KEYS[sort]) })}
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
                {t("common.retry")}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-[1.75rem] border border-border bg-panel p-14 text-center">
              <PackageSearch className="h-12 w-12 text-muted" />
              <p className="text-lg font-semibold text-ink">
                {t("home.noResults")}
              </p>
              <p className="max-w-md text-sm text-muted">
                {t("home.noResultsHint")}
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
                        {t("common.loading")}
                      </>
                    ) : (
                      <>
                        {t("home.loadMore")}
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
                ? t("home.recommended")
                : t("home.toDiscover")
            }
            icon={Sparkles}
            delay={80}
            action={{
              label: t("common.seeAll"),
              onPress: () => history.push("/recommandes")
            }}
            products={recommended}
          />
        )}
      </div>
    </Page>
  );
}
