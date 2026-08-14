import { useCallback, useEffect, useState } from "react";
import {
  productsService,
  getProductTotalStock
} from "../services/products.service";
import type { Product } from "../types/product";
import { ProductListing } from "../components/ProductListing";

export function NouveautesPage() {
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
      const sorted = [...available].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      );
      setProducts(sorted);
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
      title="Nouveautés"
      subtitle="Les derniers produits arrivés en boutique."
      products={products}
      isLoading={isLoading}
      error={error}
      onRetry={load}
      emptyMessage="Aucun produit disponible pour le moment."
    />
  );
}
