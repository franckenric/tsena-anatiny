import { useEffect, useMemo, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImageOff,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Tags
} from "lucide-react";
import {
  productsService,
  getProductTotalStock,
  getProductDisplayPrice,
  getProductOriginalPrice,
  productHasDiscount,
  selectableVariants,
  variantEffectiveStock
} from "../services/products.service";
import type { Product } from "../types/product";
import { useCartDrawer } from "../contexts/CartDrawerContext";
import { useToast } from "../contexts/ToastContext";
import { useI18n } from "../contexts/I18nContext";
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
  const { closeCart } = useCartDrawer();
  const { error: toastError } = useToast();
  const { t } = useI18n();
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

  const hasVariants = (product?.variants ?? []).length > 0;

  const variantTree = useMemo(() => {
    if (!product || !hasVariants) return [];
    const all = product.variants ?? [];
    const roots = all.filter((v) => v.parent_id == null);
    return roots.map((root) => ({
      root,
      children: all.filter((v) => v.parent_id === root.id),
    }));
  }, [product?.id]);

  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);

  useEffect(() => {
    if (variantTree.length > 0 && selectedRootId == null) {
      const firstWithChildren = variantTree.find((g) => g.children.length > 0);
      setSelectedRootId(firstWithChildren?.root.id ?? variantTree[0].root.id);
    }
  }, [variantTree]);

  const selectedGroup = variantTree.find((g) => g.root.id === selectedRootId);

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
          setError(
            err instanceof Error ? err.message : t("error.product")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    if (product && hasVariants) {
      const leaves = selectableVariants(product);
      setLines(
        leaves.map((v) => {
          const vPrice = Number(v.selling_price ?? 0) || Number(product.selling_price ?? 0) || 0;
          const vDiscount = Number(v.discount_price ?? 0);
          return {
            variant: v,
            quantity: 0,
            unit_cost: vDiscount > 0 && vDiscount < vPrice ? vDiscount : vPrice
          };
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const stock = product ? getProductTotalStock(product) : 0;
  const activeLines = hasVariants ? lines.filter((l) => l.quantity > 0) : [];

  const displayPrice = product ? getProductDisplayPrice(product) : 0;
  const originalPrice = product ? getProductOriginalPrice(product) : 0;

  const effectivePrice = displayPrice;

  const total =
    hasVariants && activeLines.length > 0
      ? activeLines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0)
      : quantity * effectivePrice;

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
        toastError(t("product.chooseQuantity"));
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
      aria-label={t("product.back")}
      title={t("product.back")}
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
              {t("common.backToShop")}
            </Link>          </div>
        </div>
      </Page>
    );
  }

  if (!product) return <Page />;

  const hasDiscount = productHasDiscount(product);

  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  return (
    <Page>
      {backButton}

      <div className="mx-auto max-w-6xl px-5 pb-32 pt-6 sm:px-8 sm:pb-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:gap-10">
          {/* ── Gallery ── */}
          <div className="animate-fade-in lg:sticky lg:top-24 lg:self-start">
            <div className="relative overflow-hidden rounded-3xl bg-bg">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-muted/20">
                  <ImageOff className="h-20 w-20" />
                </div>
              )}

              {hasDiscount && (
                <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg">
                  -{discountPercent}%
                </span>
              )}

              {galleryImages.length > 1 && selectedImage && (
                <span className="absolute bottom-4 right-4 rounded-full bg-ink/50 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                  {galleryImages.indexOf(selectedImage) + 1}/{galleryImages.length}
                </span>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {galleryImages.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelectedImage(url)}
                    className={cn(
                      "h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl transition-all duration-200",
                      selectedImage === url
                        ? "ring-2 ring-brand ring-offset-2 ring-offset-bg"
                        : "opacity-50 hover:opacity-80"
                    )}
                  >
                    <img
                      src={url}
                      alt={t("product.preview", { name: product.name })}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="flex flex-col gap-5">
            {/* Top row: category + stock */}
            <div className="flex items-center gap-2">
              {product.categorie?.name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
                  <Tags className="h-3 w-3" />
                  {product.categorie.name}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                  stock > 0
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                )}
              >
                {stock > 0 ? (
                  <>
                    <PackageCheck className="h-3 w-3" />
                    {t("common.inStock", { count: stock })}
                  </>
                ) : (
                  <>
                    <PackageX className="h-3 w-3" />
                    {t("common.outOfStock")}
                  </>
                )}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
              {product.name}
            </h1>

            {/* SKU */}
            <div className="flex items-center gap-2 text-[11px] text-muted/50">
              <span>REF: {product.sku}</span>
              {product.unit && (
                <>
                  <span className="text-border">·</span>
                  <span>{product.unit}</span>
                </>
              )}
            </div>

            {/* ── Price block ── */}
            <div className="rounded-2xl border border-border/40 bg-bg/50 p-3.5 sm:p-4">
              {hasVariants ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted/50">
                      {t("product.variants")}
                    </p>
                    {displayPrice > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-brand">
                          {t("product.from")} {formatAr(displayPrice)}
                        </span>
                        {hasDiscount && (
                          <>
                            <span className="text-xs text-muted/40 line-through">
                              {formatAr(originalPrice)}
                            </span>
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                              -{discountPercent}%
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Root variant chips ── */}
                  <div className="flex flex-wrap gap-2">
                    {variantTree.map((group) => {
                      const isActive = selectedRootId === group.root.id;
                      const rootStock = variantEffectiveStock(
                        product.variants ?? [],
                        group.root
                      );
                      const rootSoldOut =
                        group.children.length === 0 && rootStock <= 0;
                      const selectedCount = group.children.length > 0
                        ? group.children.filter((c) => {
                            const l = lines.find((ln) => ln.variant.id === c.id);
                            return l && l.quantity > 0;
                          }).length
                        : (() => {
                            const l = lines.find((ln) => ln.variant.id === group.root.id);
                            return l && l.quantity > 0 ? 1 : 0;
                          })();
                      return (
                        <button
                          key={group.root.id}
                          type="button"
                          onClick={() => setSelectedRootId(group.root.id)}
                          disabled={rootSoldOut}
                          className={cn(
                            "relative rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                            isActive
                              ? "border-brand bg-brand text-white shadow-sm"
                              : "border-border/60 bg-panel text-ink hover:border-brand/50",
                            rootSoldOut && "cursor-not-allowed opacity-30"
                          )}
                        >
                          {group.root.name || `#${group.root.id}`}
                          {selectedCount > 0 && (
                            <span
                              className={cn(
                                "ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                                isActive
                                  ? "bg-white/25 text-white"
                                  : "bg-brand/15 text-brand"
                              )}
                            >
                              {selectedCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Variant rows with inline quantity ── */}
                  {selectedGroup && (() => {
                    const items = selectedGroup.children.length > 0
                      ? selectedGroup.children
                      : [selectedGroup.root];
                    return (
                      <div className="space-y-1.5">
                        {items.map((variant) => {
                          const line = lines.find(
                            (l) => l.variant.id === variant.id
                          );
                          if (!line) return null;
                          const idx = lines.indexOf(line);
                          if (idx === -1) return null;
                          const vStock = variantEffectiveStock(
                            product.variants ?? [],
                            variant
                          );
                          const vSoldOut = vStock <= 0;
                          const isSelected = line.quantity > 0;
                          const vSelling = Number(variant.selling_price ?? 0);
                          const vDiscount = Number(variant.discount_price ?? 0);
                          const vHasDiscount =
                            vDiscount > 0 && vSelling > 0 && vDiscount < vSelling;
                          const vPrice = vHasDiscount ? vDiscount : line.unit_cost;
                          const vPercent = vHasDiscount
                            ? Math.round(((vSelling - vDiscount) / vSelling) * 100)
                            : 0;

                          return (
                            <div
                              key={variant.id}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-200",
                                vSoldOut
                                  ? "border-border/20 bg-bg/20 opacity-50"
                                  : isSelected
                                    ? "border-brand/40 bg-brand/5 shadow-sm"
                                    : "border-border/40 bg-panel hover:border-border"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  {isSelected && (
                                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                                      {line.quantity}
                                    </span>
                                  )}
                                  <p className="truncate text-xs font-semibold text-ink">
                                    {variant.name || `#${variant.id}`}
                                  </p>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                                  {vSoldOut ? (
                                    <span className="font-semibold text-danger">
                                      {t("common.exhausted")}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-muted/50">
                                        {t("product.stock", { count: vStock })}
                                      </span>
                                      <span className="text-border">·</span>
                                      <span className="font-bold text-brand">
                                        {formatAr(vPrice)}
                                      </span>
                                      {vHasDiscount && (
                                        <>
                                          <span className="text-muted/40 line-through">
                                            {formatAr(vSelling)}
                                          </span>
                                          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                                            -{vPercent}%
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <QuantityInput
                                value={line.quantity}
                                onChange={(value) =>
                                  updateLine(idx, { quantity: value })
                                }
                                min={0}
                                max={vStock}
                                disabled={vSoldOut}
                                className="shrink-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="grid grid-cols-2 items-center gap-2">
                  {hasDiscount ? (
                    <>
                      <p className="text-sm text-muted/50 line-through">
                        {formatAr(originalPrice)}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <p className="text-[11px] font-medium text-muted/50">
                          {t("product.unitPrice")}
                        </p>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          -{discountPercent}%
                        </span>
                      </div>
                      <p className="text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">
                        {formatAr(displayPrice)}
                      </p>
                      <div className="flex justify-end">
                        <QuantityInput
                          value={quantity}
                          onChange={setQuantity}
                          min={1}
                          max={stock > 0 ? stock : undefined}
                          disabled={stock <= 0}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium text-muted/50">
                        {t("product.unitPrice")}
                      </p>
                      <div />
                      <p className="text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">
                        {formatAr(displayPrice)}
                      </p>
                      <div className="flex justify-end">
                        <QuantityInput
                          value={quantity}
                          onChange={setQuantity}
                          min={1}
                          max={stock > 0 ? stock : undefined}
                          disabled={stock <= 0}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Total recap ── */}
            <div className="flex items-center justify-between rounded-2xl bg-accent/10 px-5 py-3.5">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-brand">
                <ShoppingBag className="h-4.5 w-4.5" />
                {totalQty > 0
                  ? t("common.article", { count: totalQty })
                  : t("common.total")}
              </div>
              <span className="text-xl font-extrabold text-brand">
                {formatAr(total)}
              </span>
            </div>

            {/* ── Actions (desktop) ── */}
            <div className="hidden flex-col gap-3 sm:flex lg:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAdd}
                className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingBag className="h-4 w-4" />
                {isSubmitting ? t("product.adding") : t("product.addToCart")}
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
                className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl border border-ink/10 bg-ink px-6 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-ink/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("product.buyNow")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-panel/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAdd}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-glow transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
            {hasVariants && totalQty <= 0 && stock > 0
              ? t("product.chooseVariant")
              : isSubmitting
                ? t("product.adding")
                : t("product.addToCart")}
          </button>
        </div>
      </div>
    </Page>
  );
}
