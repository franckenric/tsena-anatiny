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
  PRODUCTS_PAGE_SIZE,
  getProductTotalStock,
  getProductDisplayPrice
} from "../services/products.service";
import type { Category, Product } from "../types/product";
import { ProductCard } from "../components/ProductCard";
import { ProductImage } from "../components/ProductImage";
import { ProductGridSkeleton } from "../components/Skeletons";
import { InfiniteScrollSentinel } from "../components/InfiniteScrollSentinel";
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
import { usePageTitle } from "../contexts/PageTitleContext";
import { useRecommendations } from "../hooks/useRecommendations";

const PAGE_SIZE = PRODUCTS_PAGE_SIZE;

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
      <div className="page-shell flex items-center justify-center gap-2 py-2 text-center text-xs font-semibold tracking-wide sm:text-sm">
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
  search,
  onSearch,
  onExplore,
  onNewest
}: {
  featured: Product | null;
  search: string;
  onSearch: (value: string) => void;
  onExplore: () => void;
  onNewest: () => void;
}) {
  const { customer, isBooting } = useAuth();
  const { t } = useI18n();
  const [text, setText] = useState(search);
  const firstName = (customer?.name ?? "").trim().split(" ")[0] ?? "";

  useEffect(() => {
    setText(search);
  }, [search]);

  const image = featured ? resolveImageUrl(featured.image) : null;
  const price = featured ? getProductDisplayPrice(featured) : 0;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (q !== search) onSearch(q);
  };

  const clearSearch = () => {
    setText("");
    if (search) onSearch("");
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
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("header.searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] font-medium text-ink outline-none placeholder:text-muted/60"
              />
              {text && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t("common.clearSearch")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-bg hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
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
              <ProductImage
                src={image}
                alt={featured.name}
                size="card"
                loading="eager"
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
          <div className="scrollbar-hide -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-6 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
            {products.map((product) => (
              <div
                key={product.id}
                className="w-40 shrink-0 snap-start sm:w-48 lg:w-auto lg:shrink"
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
  usePageTitle(t("nav.shop"));
  const history = useHistory();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const query = (searchParams.get("q") ?? "").trim();
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
  // Identifiant stable des categories actives: rejoue l'effet de chargement
  // uniquement quand la selection change reellement.
  const categoryIdsKey = useMemo(
    () => [...activeCategories].sort((a, b) => a - b).join(","),
    [activeCategories]
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productsRef = useRef<HTMLDivElement>(null);
  // Empche une reponse perimee (recherche lancee puis remplacee) d'ecraser
  // le resultat de la requete en cours.
  const latestRequestRef = useRef(0);

  const loadPage = useCallback(
    async (pageToLoad: number, append: boolean, searchTerm: string) => {
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);
      try {
        const res = await productsService.getProducts(pageToLoad, PAGE_SIZE, {
          search: searchTerm,
          categoryIds: categoryIdsKey ? categoryIdsKey.split(",").map(Number) : []
        });
        if (requestId !== latestRequestRef.current) return false;
        setTotal(typeof res.total === "number" ? res.total : 0);
        setProducts((prev) => {
          if (!append) return res.items ?? [];
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...(res.items ?? []).filter((p) => !ids.has(p.id))];
        });
        setPage(pageToLoad);
        return true;
      } catch (err) {
        if (requestId === latestRequestRef.current) {
          setError(err instanceof Error ? err.message : t("home.errorCatalog"));
        }
        return false;
      } finally {
        if (requestId === latestRequestRef.current) {
          if (append) setIsLoadingMore(false);
          else setIsLoading(false);
        }
      }
    },
    [categoryIdsKey, t]
  );

  useEffect(() => {
    let cancelled = false;
    categoriesService
      .getCategories()
      .then((catRes) => {
        if (cancelled) return;
        setCategories(
          (catRes.items ?? []).filter((c) => !c.status || c.status !== "inactive")
        );
      })
      .catch(() => {
        // catégories optionnelles
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recherche et categories sont appliquees par l'API: on recharge la
  // premiere page a chaque changement de critere.
  useEffect(() => {
    setPage(1);
    void loadPage(1, false, query);
  }, [loadPage, query]);

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

  const hasActiveFilter = Boolean(query) || activeCategories.size > 0;

  const recentProducts = useMemo(() => {
    if (hasActiveFilter) return [];
    const ids = getRecentProductIds();
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }, [products, hasActiveFilter]);

  const { customer } = useAuth();

  const { recommendations: recommended } = useRecommendations(
    hasActiveFilter ? [] : availableProducts,
    2
  );

  const recTitle =
    customer || recentProducts.length > 0
      ? t("home.recommended")
      : t("home.toDiscover");

  const pushQuery = useCallback(
    (nextQuery: string, nextCategories: Set<number>) => {
      const params = new URLSearchParams();
      if (nextQuery) params.set("q", nextQuery);
      if (nextCategories.size > 0)
        params.set("cats", [...nextCategories].join(","));
      const qs = params.toString();
      history.push(qs ? `/?${qs}` : "/");
    },
    [history]
  );

  const submitSearch = useCallback(
    (value: string) => pushQuery(value, activeCategories),
    [pushQuery, activeCategories]
  );

  const updateCategories = (next: Set<number>) => pushQuery(query, next);

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

  return (
    <Page>
      <div className="pb-8">
        <AnnouncementBar />
        <GreetingHero
          featured={hasActiveFilter ? null : availableProducts[0] ?? null}
          search={query}
          onSearch={submitSearch}
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

        {!hasActiveFilter && recommended.length > 0 && (
          <ProductRail
            title={recTitle}
            icon={Sparkles}
            delay={40}
            action={{
              label: t("common.seeAll"),
              onPress: () => history.push("/recommandes")
            }}
            products={recommended}
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
                  {total > 0 ? total : availableProducts.length}
                </span>
              )}
            </div>
          </div>

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
                onClick={() => void loadPage(1, false, query)}
                className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink/90 active:scale-95"
              >
                <RefreshCcw className="h-4 w-4" />
                {t("common.retry")}
              </button>
            </div>
          ) : availableProducts.length === 0 ? (
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
                {availableProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {products.length < total && (
                <InfiniteScrollSentinel
                  hasMore={products.length < total}
                  isLoading={isLoadingMore}
                  onLoadMore={() => void loadPage(page + 1, true, query)}
                />
              )}
            </>
          )}
        </section>
      </div>
    </Page>
  );
}
