import { useCallback } from "react";
import { getProductTotalStock } from "../services/products.service";
import type { Product } from "../types/product";
import { ProductListing } from "../components/ProductListing";
import { useI18n } from "../contexts/I18nContext";
import { usePageTitle } from "../contexts/PageTitleContext";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";

export function NouveautesPage() {
  const { t } = useI18n();
  usePageTitle(t("pages.new.title"));

  const transform = useCallback(
    (items: Product[]) =>
      items
        .filter((p) => p.status !== "inactive" && getProductTotalStock(p) > 0)
        .sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
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

  return (
    <ProductListing
      title={t("pages.new.title")}
      subtitle={t("pages.new.subtitle")}
      products={products}
      total={total}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      error={error}
      onRetry={reload}
      emptyMessage={t("pages.new.empty")}
    />
  );
}
