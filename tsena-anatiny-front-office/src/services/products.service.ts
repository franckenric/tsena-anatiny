import { apiFetch } from "./api";
import type {
  Product,
  ProductListResponse
} from "../types/product";

const PRODUCT_RELATION = JSON.stringify([
  "categorie{id,name}",
  "stock{quantity}",
  "variants{id,parent_id,name,sku,quantity,unit_cost,selling_price}",
  "images{image,position}"
]);

export const productsService = {
  async getProducts(page = 1, pageSize = 200): Promise<ProductListResponse> {
    const skip = (page - 1) * pageSize;
    const payload = await apiFetch<{ count: number; data?: Product[] }>(
      `/products/?offset=${skip}&limit=${pageSize}&relation=${encodeURIComponent(PRODUCT_RELATION)}`
    );
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  }
};

export function getProductTotalStock(product: Product): number {
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    const roots = variants.filter((v) => v.parent_id == null);
    return roots.reduce(
      (sum, root) => sum + variantEffectiveStock(variants, root),
      0
    );
  }
  return (product.stock ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0),
    0
  );
}

export function variantEffectiveStock(
  variants: NonNullable<Product["variants"]>,
  node: NonNullable<Product["variants"]>[number]
): number {
  const children = variants.filter((v) => v.parent_id === node.id);
  if (children.length > 0) {
    return children.reduce(
      (sum, child) => sum + variantEffectiveStock(variants, child),
      0
    );
  }
  return Number(node.quantity ?? 0);
}

export function selectableVariants(
  product: Product
): NonNullable<Product["variants"]> {
  const variants = product.variants ?? [];
  if (variants.length === 0) return variants;
  const leaves = variants.filter(
    (v) => !variants.some((other) => other.parent_id === v.id)
  );
  return leaves.length > 0 ? leaves : variants;
}

export function getProductDisplayPrice(product: Product): number {
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    const prices = selectableVariants(product)
      .map((v) => v.selling_price)
      .filter((p): p is number => typeof p === "number" && p > 0);
    if (prices.length > 0) {
      return Math.min(...prices);
    }
  }
  return product.selling_price ?? 0;
}

export function variantLabel(
  product: Product,
  variant: NonNullable<Product["variants"]>[number]
): string {
  const base = variant.name || `Variante #${variant.id}`;
  const parent =
    variant.parent_id != null
      ? (product.variants ?? []).find((p) => p.id === variant.parent_id)
      : undefined;
  return parent?.name ? `${base} (${parent.name})` : base;
}
