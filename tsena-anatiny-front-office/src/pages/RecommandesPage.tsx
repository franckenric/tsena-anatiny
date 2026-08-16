import { useCallback, useEffect, useState } from "react";
import {
  productsService,
  getProductTotalStock
} from "../services/products.service";
import type { Product } from "../types/product";
import { ProductListing } from "../components/ProductListing";
import { getRecentProductIds } from "../lib/utils";
import { useI18n } from "../contexts/I18nContext";

export function RecommandesPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await productsService.getProducts(1, 200);
      const available = (res.items ?? []).filter(
        (p) => p.status !== "inactive" && getProductTotalStock(p) > 0
      );
      const recentIds = getRecentProductIds();
      const byId = new Map(available.map((p) => [p.id, p]));
      const recent = recentIds
        .map((id) => byId.get(id))
        .filter((p): p is Product => Boolean(p));
      const recentSet = new Set(recent.map((p) => p.id));
      const fill = available.filter((p) => !recentSet.has(p.id));
      setProducts([...recent, ...fill]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.generic"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ProductListing
      title={t("pages.rec.title")}
      subtitle={t("pages.rec.subtitle")}
      products={products}
      isLoading={isLoading}
      error={error}
      onRetry={load}
      emptyMessage={t("pages.rec.empty")}
    />
  );
}
