import { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ImageOff, Plus } from "lucide-react";
import type { Product } from "../types/product";
import { formatAr, resolveImageUrl } from "../lib/utils";
import {
  getProductTotalStock,
  selectableVariants,
  getProductDisplayPrice,
  getProductOriginalPrice,
  productHasDiscount
} from "../services/products.service";
import { useAddToCart } from "../hooks/useAddToCart";
import { useI18n } from "../contexts/I18nContext";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const stock = getProductTotalStock(product);
  const variants = selectableVariants(product);
  const hasVariants = (product.variants ?? []).length > 0;
  const outOfStock = stock <= 0;
  const history = useHistory();
  const { addSingle } = useAddToCart();
  const [isAdding, setIsAdding] = useState(false);

  const price = getProductDisplayPrice(product);
  const originalPrice = getProductOriginalPrice(product);
  const hasDiscount = productHasDiscount(product);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    if (hasVariants) {
      history.push(`/produit/${product.id}`);
      return;
    }
    setIsAdding(true);
    try {
      await addSingle(product, 1);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link
      to={`/produit/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-panel shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:border-brand/30"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-bg">
        {product.image ? (
          <img
            src={resolveImageUrl(product.image) ?? undefined}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/30">
            <ImageOff className="h-12 w-12" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute right-2.5 top-2.5">
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
              -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
            </span>
          </div>
        )}

        {/* Out of stock badge */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-[2px]">
            <span className="rounded-full bg-ink/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
              {t("common.rupture")}
            </span>
          </div>
        )}

        {/* Quick add button */}
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={outOfStock || isAdding}
          aria-label={
            hasVariants
              ? t("product.variantFor", { name: product.name })
              : t("product.addFor", { name: product.name })
          }
          title={
            hasVariants
              ? t("product.chooseVariant")
              : t("product.addToCart")
          }
          className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-panel/90 text-ink shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-brand hover:text-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
        >
          {isAdding ? (
            <span className="h-4 w-4 shrink-0 animate-spin-slow rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        {product.categorie?.name && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand/70">
            {product.categorie.name}
          </p>
        )}
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink/90 transition-colors group-hover:text-ink sm:text-sm">
          {product.name}
        </h3>

        <p className="text-[11px] text-muted/80">
          {hasVariants
            ? t("product.variantsCount", { count: variants.length })
            : outOfStock
              ? t("common.outOfStock")
              : t("common.inStock", { count: stock })}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-col">
            <span className="text-lg font-extrabold leading-tight text-brand">
              {price > 0 ? formatAr(price) : "—"}
            </span>
            {hasDiscount && (
              <span className="text-xs font-medium text-muted/60 line-through">
                {formatAr(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
