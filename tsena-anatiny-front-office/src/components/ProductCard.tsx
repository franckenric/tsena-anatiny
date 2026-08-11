import { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ImageOff, ShoppingBag } from "lucide-react";
import type { Product } from "../types/product";
import { formatAr, resolveImageUrl } from "../lib/utils";
import {
  getProductTotalStock,
  selectableVariants,
  getProductDisplayPrice
} from "../services/products.service";
import { useAddToCart } from "../hooks/useAddToCart";

export function ProductCard({ product }: { product: Product }) {
  const stock = getProductTotalStock(product);
  const variants = selectableVariants(product);
  const hasVariants = (product.variants ?? []).length > 0;
  const outOfStock = stock <= 0;
  const history = useHistory();
  const { addSingle } = useAddToCart();
  const [isAdding, setIsAdding] = useState(false);

  const price = getProductDisplayPrice(product);

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
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-panel shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative m-1 aspect-square overflow-hidden rounded-[1.25rem] bg-bg">
        {product.image ? (
          <img
            src={resolveImageUrl(product.image) ?? undefined}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/50">
            <ImageOff className="h-9 w-9" />
          </div>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white">
            Rupture
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink sm:text-sm">
          {product.name}
        </h3>
        <p className="text-[11px] text-muted">
          {hasVariants
            ? `${variants.length} variante${variants.length > 1 ? "s" : ""}`
            : outOfStock
              ? "Rupture de stock"
              : `${stock} en stock`}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-[15px] font-bold text-brand sm:text-lg">
            {price > 0 ? formatAr(price) : "—"}
          </span>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={outOfStock || isAdding}
            aria-label={
              hasVariants
                ? `Choisir une variante pour ${product.name}`
                : `Ajouter ${product.name} au panier`
            }
            title={hasVariants ? "Choisir une variante" : "Ajouter au panier"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAdding ? (
              <span className="h-4 w-4 shrink-0 animate-spin-slow rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
