import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import {
  Check,
  ChevronRight,
  PackageSearch,
  Plus,
  RefreshCcw,
  ShoppingBag,
  Store
} from "lucide-react";
import { categoriesService } from "../services/categories.service";
import {
  productsService,
  getProductTotalStock
} from "../services/products.service";
import type { Category } from "../types/product";
import { Page } from "../components/Page";
import { cn } from "../lib/utils";
import { categoryEmoji, categoryGradient } from "../lib/categories";

export function CategoriesPage() {
  const history = useHistory();
  const { search } = useLocation();

  const activeCategories = useMemo(() => {
    const set = new Set<number>();
    const rawCats = new URLSearchParams(search).get("cats");
    if (rawCats) {
      for (const part of rawCats.split(",")) {
        const id = Number(part);
        if (Number.isFinite(id) && id > 0) set.add(id);
      }
    }
    return set;
  }, [search]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [catRes, prodRes] = await Promise.all([
        categoriesService.getCategories(),
        productsService.getProducts(1, 200)
      ]);
      const cats = (catRes.items ?? []).filter(
        (c) => !c.status || c.status !== "inactive"
      );
      const available = (prodRes.items ?? []).filter(
        (p) => p.status !== "inactive" && getProductTotalStock(p) > 0
      );
      setCategories(cats);
      setTotalCount(available.length);
      const map = new Map<number, number>();
      for (const p of available) {
        map.set(p.category_id, (map.get(p.category_id) ?? 0) + 1);
      }
      setCounts(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCategory = (id: number) => {
    const next = new Set(activeCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const params = new URLSearchParams();
    if (next.size > 0) params.set("cats", [...next].join(","));
    const qs = params.toString();
    history.replace(qs ? `?${qs}` : "");
  };

  const selectedCount = [...activeCategories].reduce(
    (sum, id) => sum + (counts.get(id) ?? 0),
    0
  );

  const row =
    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition active:scale-[0.99]";
  const isAllSelected = activeCategories.size === 0;

  return (
    <Page>
      <div className="pb-24">
        <div className="px-4 pt-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">
                Toutes les catégories
              </h1>
              <p className="mt-1 text-sm text-muted">
                Sélectionnez une ou plusieurs catégories.
              </p>
            </div>
            {!isLoading && !error && (
              <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                {categories.length}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-1 px-4 sm:px-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-panel" />
            ))}
          </div>
        ) : error ? (
          <div className="mx-4 mt-6 flex flex-col items-center gap-3 rounded-[1.75rem] border border-danger/30 bg-danger/5 p-10 text-center sm:mx-6">
            <PackageSearch className="h-12 w-12 text-danger/60" />
            <p className="text-sm font-medium text-danger">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink/90 active:scale-95"
            >
              <RefreshCcw className="h-4 w-4" />
              Réessayer
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="mx-4 mt-6 flex flex-col items-center gap-3 rounded-[1.75rem] border border-border bg-panel p-14 text-center sm:mx-6">
            <Store className="h-12 w-12 text-muted" />
            <p className="text-lg font-semibold text-ink">
              Aucune catégorie
            </p>
            <p className="max-w-md text-sm text-muted">
              Les catégories apparaîtront ici dès qu'elles seront créées.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-1 px-4 sm:px-6 md:grid-cols-2">
            <button
              type="button"
              onClick={() => history.replace("")}
              className={cn(
                row,
                isAllSelected
                  ? "bg-brand-soft ring-2 ring-brand/60"
                  : "bg-panel shadow-card"
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-glow">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-bold text-ink">
                Tout
              </span>
              <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                {totalCount}
              </span>
              {isAllSelected ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              )}
            </button>
            {categories.map((c) => {
              const selected = activeCategories.has(c.id);
              const count = counts.get(c.id) ?? 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={cn(
                    row,
                    selected
                      ? "bg-brand-soft ring-2 ring-brand/60"
                      : "bg-panel shadow-card"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-base",
                      categoryGradient(c.name)
                    )}
                  >
                    {categoryEmoji(c.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
                    {c.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                    {count}
                  </span>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                </button>
              );
            })}
            <Link
              to="/"
              className={cn(row, "border border-dashed border-brand/40 bg-panel/70")}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Plus className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-bold text-ink">
                Voir tous les produits
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-muted">
                {totalCount}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
            </Link>
          </div>
        )}

        {activeCategories.size > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 p-4 backdrop-blur sm:px-6">
            <div className="mx-auto max-w-7xl">
              <button
                type="button"
                onClick={() => {
                  const qs = [...activeCategories].join(",");
                  history.push(`/?cats=${qs}`);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                Afficher les {selectedCount} produits sélectionnés
              </button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
