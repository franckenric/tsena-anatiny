import type { Product } from "../types/product";
import type { CartItem, Order } from "../types/operations";

export interface RecommendationInput {
  products: Product[];
  orders?: Order[];
  cartItems?: CartItem[];
  recentIds?: number[];
  limit?: number;
}

const WEIGHTS = {
  view: 1.0,
  purchase: 2.5,
  affinity: 1.5,
  cart: 1.2,
  popularity: 0.4,
  freshness: 0.05
} as const;

function daysAgo(iso?: string | null): number {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, (Date.now() - time) / 86_400_000);
}

function recencyWeight(days: number): number {
  return Math.pow(0.92, days);
}

function freshnessScore(product: Product): number {
  return recencyWeight(daysAgo(product.created_at) / 30);
}

export function buildRecommendations({
  products,
  orders = [],
  cartItems = [],
  recentIds = [],
  limit = 10
}: RecommendationInput): Product[] {
  if (products.length === 0) return [];

  const cartProductIds = new Set(cartItems.map((item) => item.product_id));
  const purchaseWeightByProduct = new Map<number, number>();
  const soldCountByProduct = new Map<number, number>();
  const categoryAffinity = new Map<number, number>();

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const orderWeight = recencyWeight(daysAgo(order.created_at));
    for (const movement of order.stock_movements ?? []) {
      const productId = movement.product_id;
      if (productId == null) continue;
      const qty = Math.max(1, Number(movement.quantity) || 1);
      const weight = orderWeight * qty;
      purchaseWeightByProduct.set(
        productId,
        (purchaseWeightByProduct.get(productId) ?? 0) + weight
      );
      soldCountByProduct.set(
        productId,
        (soldCountByProduct.get(productId) ?? 0) + qty
      );
      const product = products.find((p) => p.id === productId);
      if (product) {
        categoryAffinity.set(
          product.category_id,
          (categoryAffinity.get(product.category_id) ?? 0) + weight
        );
      }
    }
  }

  const cartCategories = new Set<number>();
  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.product_id);
    if (product) cartCategories.add(product.category_id);
  }

  const recentWeight = new Map<number, number>();
  recentIds.forEach((id, index) => {
    recentWeight.set(id, Math.pow(0.9, index));
  });

  const maxPurchaseWeight = Math.max(1, ...purchaseWeightByProduct.values());
  const maxCategoryAffinity = Math.max(1, ...categoryAffinity.values());
  const maxViewWeight = Math.max(1, ...recentWeight.values());
  const maxSoldCount = Math.max(1, ...soldCountByProduct.values());
  const maxFreshness = Math.max(
    1,
    ...products.map((p) => freshnessScore(p))
  );

  const scored = products
    .filter((product) => !cartProductIds.has(product.id))
    .map((product) => {
      const purchaseScore =
        (purchaseWeightByProduct.get(product.id) ?? 0) / maxPurchaseWeight;
      const affinityScore =
        (categoryAffinity.get(product.category_id) ?? 0) / maxCategoryAffinity;
      const viewScore =
        (recentWeight.get(product.id) ?? 0) / maxViewWeight;
      const cartScore = cartCategories.has(product.category_id) ? 1 : 0;
      const popularityScore =
        (soldCountByProduct.get(product.id) ?? 0) / maxSoldCount;
      const freshScore = freshnessScore(product) / maxFreshness;

      const score =
        viewScore * WEIGHTS.view +
        purchaseScore * WEIGHTS.purchase +
        affinityScore * WEIGHTS.affinity +
        cartScore * WEIGHTS.cart +
        popularityScore * WEIGHTS.popularity +
        freshScore * WEIGHTS.freshness;

      return { product, score };
    });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}