import { useEffect, useMemo, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImageOff,
  PackageCheck,
  ShoppingBag
} from "lucide-react";
import {
  productsService,
  getProductTotalStock,
  selectableVariants,
  variantEffectiveStock,
  variantLabel
} from "../services/products.service";
import type { Product } from "../types/product";
import { useAuth } from "../contexts/AuthContext";
import { useCartDrawer } from "../contexts/CartDrawerContext";
import { useToast } from "../contexts/ToastContext";
import { useAddToCart, type CartLine } from "../hooks/useAddToCart";
import { ProductDetailSkeleton } from "../components/Skeletons";
import { Page } from "../components/Page";
import { QuantityInput } from "../components/QuantityInput";
import { formatAr, addRecentProductId, cn } from "../lib/utils";

type Line = CartLine;

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { customer, isBooting } = useAuth();
  const { closeCart } = useCartDrawer();
  const { error: toastError } = useToast();
  const { addSingle, addLines } = useAddToCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const variants = useMemo(
    () => (product ? selectableVariants(product) : []),
    [product]
  );
  const hasVariants = (product?.variants ?? []).length > 0;

  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    productsService
      .getProducts(1, 200)
      .then((res) => {
        if (cancelled) return;
        const found =
          res.items.find((p) => p.id === Number(id)) ??
          res.items.find((p) => p.sku === id) ??
          null;
        setProduct(found);
        if (found) addRecentProductId(found.id);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur produit");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (product && hasVariants) {
      setLines(
        variants.map((v) => ({
          variant: v,
          quantity: 0,
          unit_cost:
            Number(v.selling_price ?? 0) ||
            Number(product.selling_price ?? 0) ||
            0
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const stock = product ? getProductTotalStock(product) : 0;
  const activeLines = hasVariants ? lines.filter((l) => l.quantity > 0) : [];

  const singlePrice =
    hasVariants && variants.length > 0
      ? variants[0].selling_price ?? product?.selling_price ?? 0
      : product?.selling_price ?? 0;

  const total =
    hasVariants && activeLines.length > 0
      ? activeLines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0)
      : quantity * singlePrice;

  const totalQty = hasVariants
    ? activeLines.reduce((sum, l) => sum + l.quantity, 0)
    : quantity;

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );

  const handleAddToCart = async (): Promise<boolean> => {
    if (!product) return false;
    if (hasVariants) {
      if (totalQty <= 0) {
        toastError("Veuillez choisir une quantité");
        return false;
      }
      setIsSubmitting(true);
      try {
        return await addLines(product, activeLines);
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsSubmitting(true);
    try {
      return await addSingle(product, quantity);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Page>
        <ProductDetailSkeleton />
      </Page>
    );
  }

  if (error && !product) {
    return (
      <Page>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-danger/30 bg-danger/5 p-8 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand">
              Retour à la boutique
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  if (!product) return <Page />;

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-4 py-8 pb-12 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la boutique
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="animate-fade-in overflow-hidden rounded-3xl border border-border bg-panel">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-muted/40">
              <ImageOff className="h-16 w-16" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {product.categorie?.name && (
            <span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              {product.categorie.name}
            </span>
          )}
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-muted">{product.description}</p>
          )}
          <p className="text-xs text-muted">SKU: {product.sku}</p>

          <div className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-semibold",
                stock > 0 ? "text-success" : "text-danger"
              )}
            >
              <PackageCheck className="h-4 w-4" />
              {stock > 0 ? `${stock} en stock` : "Rupture de stock"}
            </span>
          </div>

          {hasVariants ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                Variantes
              </p>
              {lines.map((line, index) => {
                const lineStock = variantEffectiveStock(
                  product.variants ?? [],
                  line.variant
                );
                return (
                  <div
                    key={line.variant.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-panel p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {variantLabel(product, line.variant)}
                      </p>
                      <p className="text-xs text-muted">
                        Stock: {lineStock} · {formatAr(line.unit_cost)}
                      </p>
                    </div>
                    <QuantityInput
                      value={line.quantity}
                      onChange={(value) => updateLine(index, { quantity: value })}
                      max={lineStock}
                      className="shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-panel p-4">
              <div>
                <p className="text-sm text-muted">Prix unitaire</p>
                <p className="text-2xl font-bold text-brand">
                  {formatAr(singlePrice)}
                </p>
              </div>
              <QuantityInput
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={stock > 0 ? stock : undefined}
              />
            </div>
          )}

          <div className="rounded-2xl bg-brand-soft p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brand">Total</span>
              <span className="text-xl font-bold text-brand">
                {formatAr(total)}
              </span>
            </div>
            <p className="mt-1 text-xs text-brand/80">
              {totalQty > 0
                ? `${totalQty} article${totalQty > 1 ? "s" : ""}`
                : "Aucun article sélectionné"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isSubmitting || stock <= 0 || (hasVariants && totalQty <= 0)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {isSubmitting ? "Ajout en cours..." : "Ajouter au panier"}
            </button>
            <button
              type="button"
              disabled={isSubmitting || stock <= 0 || (hasVariants && totalQty <= 0)}
              onClick={async () => {
                const ok = await handleAddToCart();
                if (ok) {
                  closeCart();
                  history.push("/panier");
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-ink px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Acheter maintenant
            </button>
          </div>

          {!customer && !isBooting && (
            <p className="text-xs text-muted">
              Vous devez avoir un compte pour commander.{" "}
              <Link to="/inscription" className="font-semibold text-brand">
                Créer un compte
              </Link>
            </p>
          )}
        </div>
      </div>
      </div>
    </Page>
  );
}
