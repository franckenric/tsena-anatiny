import { useCallback, useEffect, useState } from "react";
import {
  productsService,
  getProductTotalStock
} from "../services/products.service";
import type { Product } from "../types/product";
import { ProductListing } from "../components/ProductListing";
import { getRecentProductIds } from "../lib/utils";

export function RecommandesPage() {
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
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ProductListing
      title="Recommandé pour vous"
      subtitle="Une sélection basée sur vos dernières consultations."
      products={products}
      isLoading={isLoading}
      error={error}
      onRetry={load}
      emptyMessage="Aucun produit recommandé pour le moment."
    />
  );
}
