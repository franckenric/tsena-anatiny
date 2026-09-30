import { useCallback, useEffect, useMemo, useState } from "react";
import {
  productsService,
  getProductTotalStock
} from "../services/products.service";
import type { Product } from "../types/product";
import { ProductListing } from "../components/ProductListing";
import { useI18n } from "../contexts/I18nContext";
import { useRecommendations } from "../hooks/useRecommendations";

export function RecommandesPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(
    () =>
      products.filter(
        (p) => p.status !== "inactive" && getProductTotalStock(p) > 0
      ),
    [products]
  );

  const { recommendations, isLoading: recLoading } =
    useRecommendations(available, 200);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await productsService.getProducts(1, 200);
      setProducts(res.items ?? []);
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
      products={recommendations}
      isLoading={isLoading || recLoading}
      error={error}
      onRetry={load}
      emptyMessage={t("pages.rec.empty")}
    />
  );
}
