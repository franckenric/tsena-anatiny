import { apiFetch } from "./api";
import type {
  Product,
  ProductListResponse
} from "../types/product";

const PRODUCT_RELATION = JSON.stringify([
  "categorie{id,name}",
  "stock{quantity}",
  "variants{id,parent_id,name,sku,quantity,unit_cost,selling_price,discount_price}",
  "images{image,position}"
]);

interface WhereClause {
  key: string;
  operator: string;
  value?: unknown;
}

/** Une liste imbriquǸe est interpretǸe comme un groupe OR par l'API. */
type Where = WhereClause | WhereClause[];

const DEFAULT_PAGE_SIZE = 12;

/**
 * Taille des lots de produits charges par le scroll infini. Elle se regle
 * sans recompiler via `VITE_PRODUCTS_PAGE_SIZE` (5 pour tester, 12 en
 * production).
 */
export const PRODUCTS_PAGE_SIZE = (() => {
  const raw = Number(import.meta.env.VITE_PRODUCTS_PAGE_SIZE);
  return Number.isFinite(raw) && raw > 0
    ? Math.min(Math.floor(raw), 100)
    : DEFAULT_PAGE_SIZE;
})();


export interface ProductQuery {
  /** Recherche plein texte applicative sur le nom, le SKU et la categorie. */
  search?: string;
  /** Restreint le catalogue a ces categories (cote serveur). */
  categoryIds?: number[];
  /** Exclude les produits inactifs (defaut : true). */
  activeOnly?: boolean;
}

function buildWhere(query: ProductQuery): Where[] {
  const where: Where[] = [];

  if (query.activeOnly !== false) {
    // `status` est nullable: un produit sans statut reste visible, seuls les
    // produits explicitement inactifs sont retires.
    where.push([
      { key: "status", operator: "isNull" },
      { key: "status", operator: "!=", value: "inactive" }
    ]);
  }

  const search = (query.search ?? "").trim();
  if (search) {
    where.push([
      { key: "name", operator: "like", value: search },
      { key: "sku", operator: "like", value: search },
      { key: "categorie.name", operator: "like", value: search }
    ]);
  }

  const categoryIds = (query.categoryIds ?? []).filter(
    (id) => Number.isFinite(id) && id > 0
  );
  if (categoryIds.length > 0) {
    where.push({ key: "category_id", operator: "in", value: categoryIds });
  }

  return where;
}

export const productsService = {
  async getProducts(
    page = 1,
    pageSize = PRODUCTS_PAGE_SIZE,
    query: ProductQuery = {}
  ): Promise<ProductListResponse> {
    const skip = (page - 1) * pageSize;
    const where = buildWhere(query);
    const params = new URLSearchParams({
      offset: String(skip),
      limit: String(pageSize),
      relation: PRODUCT_RELATION
    });
    if (where.length > 0) {
      params.set("where", JSON.stringify(where));
    }
    const payload = await apiFetch<{ count: number; data?: Product[] }>(
      `/products/?${params.toString()}`
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

export function getProductOriginalPrice(product: Product): number {
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

export function getProductDisplayPrice(product: Product): number {
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    const prices = selectableVariants(product)
      .map((v) => {
        const selling = typeof v.selling_price === "number" && v.selling_price > 0 ? v.selling_price : 0;
        const discount = typeof v.discount_price === "number" && v.discount_price > 0 ? v.discount_price : 0;
        return discount > 0 && discount < selling ? discount : selling;
      })
      .filter((p) => p > 0);
    if (prices.length > 0) {
      return Math.min(...prices);
    }
  }
  const original = product.selling_price ?? 0;
  const discount = product.discount_price ?? 0;
  return discount > 0 && discount < original ? discount : original;
}

export function productHasDiscount(product: Product): boolean {
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    return selectableVariants(product).some((v) => {
      const sp = Number(v.selling_price ?? 0);
      const dp = Number(v.discount_price ?? 0);
      return dp > 0 && sp > 0 && dp < sp;
    });
  }
  const sp = Number(product.selling_price ?? 0);
  const dp = Number(product.discount_price ?? 0);
  return dp > 0 && sp > 0 && dp < sp;
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
