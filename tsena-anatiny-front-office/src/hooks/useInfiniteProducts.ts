import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PRODUCTS_PAGE_SIZE,
  productsService,
  type ProductQuery
} from "../services/products.service";
import type { Product } from "../types/product";

export interface InfiniteProductsResult {
  /** Produits transforms (filtre/tri) a partir de tous les lots charges. */
  products: Product[];
  /** Nombre de produits renvoyes par l'API pour la requete courante. */
  total: number;
  /** Nombre de lots deja charges. */
  loaded: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  /** Charge le lot suivant (append) si des produits restent. */
  loadMore: () => void;
  /** Recharge le premier lot depuis le debut. */
  reload: () => void;
}

interface UseInfiniteProductsOptions {
  /** Desactive le chargement (page suspendue, etc.). */
  enabled?: boolean;
  /** Filtre/tri applique a l'ensemble des lots charges. */
  transform?: (items: Product[]) => Product[];
  /** Taille d'un lot, 5 par defaut via `VITE_PRODUCTS_PAGE_SIZE`. */
  pageSize?: number;
}

/**
 * Chargement page par page du catalogue : une seule requete au premier rendu,
 * puis un lot supplementaire a chaque scroll. Les reponses obsoletes sont
 * ignorees et les identifiants deja affiches ne sont jamais dupliques.
 */
export function useInfiniteProducts(
  query: ProductQuery = {},
  options: UseInfiniteProductsOptions = {}
): InfiniteProductsResult {
  const { enabled = true, transform, pageSize = PRODUCTS_PAGE_SIZE } = options;

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `transform` est souvent recree a chaque render: on garde la derniere
  // reference dans une ref pour ne pas relancer les requetes.
  const latestRequestRef = useRef(0);
  const loadingRef = useRef(false);

  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  const fetchPage = useCallback(
    async (pageToLoad: number, append: boolean, key: string) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;

      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);

      try {
        const res = await productsService.getProducts(
          pageToLoad,
          pageSize,
          JSON.parse(key) as ProductQuery
        );
        if (requestId !== latestRequestRef.current) return;
        setTotal(typeof res.total === "number" ? res.total : 0);
        setItems((prev) => {
          const incoming = res.items ?? [];
          if (!append) return incoming;
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...incoming.filter((p) => !ids.has(p.id))];
        });
        setPage(pageToLoad);
      } catch (err) {
        if (requestId === latestRequestRef.current) {
          setError(
            err instanceof Error ? err.message : "Impossible de charger les produits"
          );
        }
      } finally {
        if (requestId === latestRequestRef.current) {
          loadingRef.current = false;
          if (append) setIsLoadingMore(false);
          else setIsLoading(false);
        }
      }
    },
    [pageSize]
  );

  const reload = useCallback(() => {
    void fetchPage(1, false, queryKey);
  }, [fetchPage, queryKey]);

  // Premier lot + rechargement a chaque changement de critere.
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void fetchPage(1, false, queryKey);
  }, [enabled, fetchPage, queryKey]);

  const hasMore = items.length > 0 && items.length < total;

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    void fetchPage(page + 1, true, queryKey);
  }, [fetchPage, hasMore, page, queryKey]);

  const products = useMemo(
    () => (transform ? transform(items) : items),
    [items, transform]
  );

  return {
    products,
    total,
    loaded: items.length,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    reload
  };
}
