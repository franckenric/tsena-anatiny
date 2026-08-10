import { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ImageOff, ShoppingBag } from "lucide-react";
import type { Product } from "../types/product";
import { formatAr } from "../lib/utils";
import {
  getProductTotalStock,
  selectableVariants
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

  const price =
    hasVariants && variants.length > 0
      ? variants[0].selling_price ?? product.selling_price ?? 0
      : product.selling_price ?? 0;

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
      <div className="relative aspect-square w-full overflow-hidden bg-bg">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/50">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-semibold text-white">
            Rupture de stock
          </span>
        )}
        {product.categorie?.name && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
            {product.categorie.name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-ink">
          {product.name}
        </h3>
        <p className="text-xs text-muted">
          {hasVariants
            ? `${variants.length} variante${variants.length > 1 ? "s" : ""} disponible${variants.length > 1 ? "s" : ""}`
            : `${stock} en stock`}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-brand">
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
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
