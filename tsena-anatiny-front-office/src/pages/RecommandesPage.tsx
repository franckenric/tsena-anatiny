import { useCallback, useMemo } from "react";
import { getProductTotalStock } from "../services/products.service";
import type { Product } from "../types/product";
import { ProductListing } from "../components/ProductListing";
import { useI18n } from "../contexts/I18nContext";
import { useRecommendations } from "../hooks/useRecommendations";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";

export function RecommandesPage() {
  const { t } = useI18n();

  const transform = useCallback(
    (items: Product[]) =>
      items.filter(
        (p) => p.status !== "inactive" && getProductTotalStock(p) > 0
      ),
    []
  );

  const {
    products,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    reload
  } = useInfiniteProducts({}, { transform });

  const available = useMemo(() => products, [products]);

  const { recommendations, isLoading: recLoading } =
    useRecommendations(available, 200);

  return (
    <ProductListing
      title={t("pages.rec.title")}
      subtitle={t("pages.rec.subtitle")}
      products={recommendations}
      total={total}
      isLoading={isLoading || recLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      error={error}
      onRetry={reload}
      emptyMessage={t("pages.rec.empty")}
    />
  );
}
