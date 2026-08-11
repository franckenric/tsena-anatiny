import { useEffect, useMemo, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImageOff,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Tags,
  Truck
} from "lucide-react";
import {
  productsService,
  getProductTotalStock,
  getProductDisplayPrice,
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
import {
  formatAr,
  addRecentProductId,
  resolveImageUrl,
  cn
} from "../lib/utils";

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
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const urls: string[] = [];
    if (product.image && product.image !== "/No_Image_Available.jpg") {
      urls.push(resolveImageUrl(product.image) ?? product.image);
    }
    for (const img of product.images ?? []) {
      if (img.image && !urls.includes(img.image)) {
        urls.push(resolveImageUrl(img.image) ?? img.image);
      }
    }
    return urls;
  }, [product]);

  useEffect(() => {
    if (!product) return;
    setSelectedImage(galleryImages[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, galleryImages.length]);

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

  const displayPrice = product ? getProductDisplayPrice(product) : 0;

  const total =
    hasVariants && activeLines.length > 0
      ? activeLines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0)
      : quantity * displayPrice;

  const totalQty = hasVariants
    ? activeLines.reduce((sum, l) => sum + l.quantity, 0)
    : quantity;

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );

  const handleGoBack = () => {
    const state = window.history.state as { idx?: number } | null;
    if (state && typeof state.idx === "number" && state.idx > 0) {
      history.goBack();
    } else {
      history.push("/");
    }
  };

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

  const canAdd =
    !isSubmitting && stock > 0 && (!hasVariants || totalQty > 0);

  const backButton = (
    <button
      type="button"
      onClick={handleGoBack}
      aria-label="Retour"
      title="Retour"
      className="fixed left-4 top-20 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-panel/90 text-ink shadow-lg backdrop-blur-md transition hover:bg-panel active:scale-95 sm:left-6"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );

  if (isLoading) {
    return (
      <Page>
        {backButton}
        <ProductDetailSkeleton />
      </Page>
    );
  }

  if (error && !product) {
    return (
      <Page>
        {backButton}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-danger/30 bg-danger/5 p-8 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-semibold text-brand"
            >
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
      {/* Bouton retour flottant */}
      {backButton}

      <div className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:pb-12">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── Galerie ── */}
          <div className="animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-panel">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-muted/40">
                  <ImageOff className="h-16 w-16" />
                </div>
              )}
              {galleryImages.length > 1 && selectedImage && (
                <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {galleryImages.indexOf(selectedImage) + 1} /{" "}
                  {galleryImages.length}
                </span>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {galleryImages.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelectedImage(url)}
                    className={cn(
                      "relative h-20 w-20 overflow-hidden rounded-xl border-2 transition",
                      selectedImage === url
                        ? "border-brand ring-2 ring-brand/25"
                        : "border-border hover:border-brand/40"
                    )}
                  >
                    <img
                      src={url}
                      alt={`Aperçu ${product.name}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Informations ── */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {product.categorie?.name && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                  <Tags className="h-3.5 w-3.5" />
                  {product.categorie.name}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                  stock > 0
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                )}
              >
                {stock > 0 ? (
                  <>
                    <PackageCheck className="h-3.5 w-3.5" />
                    {stock} en stock
                  </>
                ) : (
                  <>
                    <PackageX className="h-3.5 w-3.5" />
                    Rupture de stock
                  </>
                )}
              </span>
            </div>

            <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span>SKU : {product.sku}</span>
              {product.unit && <span>Unité : {product.unit}</span>}
            </div>

            {product.description && (
              <div className="rounded-2xl border border-border/60 bg-bg/30 p-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">
                  Description
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                  {product.description}
                </p>
              </div>
            )}

            {/* ── Prix & sélection ── */}
            {hasVariants ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    Variantes
                  </p>
                  {displayPrice > 0 && (
                    <p className="text-sm text-muted">
                      À partir de{" "}
                      <span className="font-bold text-brand">
                        {formatAr(displayPrice)}
                      </span>
                    </p>
                  )}
                </div>
                {lines.map((line, index) => {
                  const lineStock = variantEffectiveStock(
                    product.variants ?? [],
                    line.variant
                  );
                  const soldOut = lineStock <= 0;
                  return (
                    <div
                      key={line.variant.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition",
                        soldOut
                          ? "border-border/50 bg-bg/30 opacity-70"
                          : "border-border bg-panel"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {variantLabel(product, line.variant)}
                        </p>
                        <p className="text-xs text-muted">
                          {soldOut ? (
                            <span className="font-semibold text-danger">
                              Épuisé
                            </span>
                          ) : (
                            <>
                              Stock : {lineStock} ·{" "}
                              <span className="font-semibold text-brand">
                                {formatAr(line.unit_cost)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <QuantityInput
                        value={soldOut ? 0 : line.quantity}
                        onChange={(value) =>
                          updateLine(index, { quantity: value })
                        }
                        max={lineStock}
                        disabled={soldOut}
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
                  <p className="text-3xl font-bold text-brand">
                    {formatAr(displayPrice)}
                  </p>
                </div>
                <QuantityInput
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={stock > 0 ? stock : undefined}
                  disabled={stock <= 0}
                />
              </div>
            )}

            {/* ── Récapitulatif ── */}
            <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand">
                <ShoppingBag className="h-4 w-4" />
                {totalQty > 0
                  ? `${totalQty} article${totalQty > 1 ? "s" : ""}`
                  : "Total"}
              </div>
              <span className="text-xl font-bold text-brand">
                {formatAr(total)}
              </span>
            </div>

            {/* ── Actions (desktop) ── */}
            <div className="hidden flex-col gap-3 sm:flex lg:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAdd}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" />
                {isSubmitting ? "Ajout en cours..." : "Ajouter au panier"}
              </button>
              <button
                type="button"
                disabled={!canAdd}
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

            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Truck className="h-3.5 w-3.5" />
              Livraison rapide · Paiement à la livraison
            </p>

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

      {/* ── Barre d'achat mobile ── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-panel/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Total
            </p>
            <p className="text-lg font-bold text-brand">{formatAr(total)}</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAdd}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            {hasVariants && totalQty <= 0 && stock > 0
              ? "Choisir une variante"
              : isSubmitting
                ? "Ajout en cours..."
                : "Ajouter au panier"}
          </button>
        </div>
      </div>
    </Page>
  );
}
