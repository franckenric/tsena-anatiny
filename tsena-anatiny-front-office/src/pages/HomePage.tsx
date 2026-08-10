import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowDown, Clock3, PackageSearch } from "lucide-react";
import { categoriesService } from "../services/categories.service";
import { productsService, getProductTotalStock } from "../services/products.service";
import type { Category, Product } from "../types/product";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeletons";
import { Page } from "../components/Page";
import { getRecentProductIds } from "../lib/utils";

const PAGE_SIZE = 200;

type SortKey = "pertinence" | "price-asc" | "price-desc" | "name" | "newest";

function productPrice(product: Product): number {
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    const leaves = variants.filter(
      (v) => !variants.some((o) => o.parent_id === v.id)
    );
    return (
      (leaves[0]?.selling_price ?? 0) ||
      (product.selling_price ?? 0) ||
      0
    );
  }
  return product.selling_price ?? 0;
}

const SORT_LABELS: Record<SortKey, string> = {
  pertinence: "Pertinence",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  name: "Nom (A → Z)",
  newest: "Nouveautés"
};

export function HomePage() {
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

  const activeCategoryName = activeCategory != null
    ? categories.find((c) => c.id === activeCategory)?.name
    : null;

  const hasActiveFilter = Boolean(query) || activeCategory != null;

  return (
    <Page>
      <div>
        <section className="bg-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Boutique en ligne
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight text-ink sm:text-5xl">
            Tsena Anatiny, vos produits livrés à votre porte.
          </h1>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">
            Parcourez notre sélection, passez commande en quelques clics et
            suivez l'état de vos livraisons.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {(hasActiveFilter || sort !== "pertinence") && (
            <p className="text-sm text-muted">
              {filtered.length} produit{filtered.length > 1 ? "s" : ""}
              {query ? ` pour « ${query} »` : ""}
              {activeCategoryName ? ` dans ${activeCategoryName}` : ""}
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            <label
              htmlFor="sort"
              className="text-xs font-semibold uppercase tracking-widest text-muted"
            >
              Trier
            </label>
            <select
              id="sort"
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
          </div>
        </div>

        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : error ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/5 p-8 text-center">
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-panel p-14 text-center">
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
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
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

        {!hasActiveFilter && recentProducts.length > 0 && (
          <section className="mt-16">
            <div className="mb-5 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-brand" />
              <h2 className="text-xl font-bold text-ink">
                Récemment consultés
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </section>
      </div>
    </Page>
  );
}
