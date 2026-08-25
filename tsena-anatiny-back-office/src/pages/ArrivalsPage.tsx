import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { Product } from "../types/product";
import type { Lot, StockArrivalPayload } from "../types/operations";
import { stockService, lotsService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import { Layout, Button, Input, Select, QuantityInput } from "../components/index";
import {
  Package,
  Plus,
  Truck,
  Search,
  X,
  ChevronRight,
  Boxes,
  ArrowRight,
  Pencil,
  Trash2,
  Check
} from "lucide-react";

const variantEffectiveStock = (
  variants: NonNullable<Product["variants"]>,
  node: NonNullable<Product["variants"]>[number]
): number => {
  const children = variants.filter((v) => v.parent_id === node.id);
  if (children.length > 0) {
    return children.reduce(
      (sum, child) => sum + variantEffectiveStock(variants, child),
      0
    );
  }
  return Number(node.quantity ?? 0);
};

const getProductTotalStock = (product: Product): number => {
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
};

const getLotDateLabel = (lot: Lot) => {
  const rawDate = lot.received_at ?? lot.created_at;
  if (!rawDate) return "Date inconnue";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";
  return parsed.toLocaleDateString("fr-FR");
};

function ArrivalForm({
  product,
  lots,
  onSubmit,
  onCancel,
  isLoading
}: {
  product: Product;
  lots: Lot[];
  onSubmit: (payloads: StockArrivalPayload[]) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const productVariants = product.variants ?? [];
  const leafVariants = productVariants.filter(
    (v) => !productVariants.some((other) => other.parent_id === v.id)
  );
  const hasExistingVariants = leafVariants.length > 0;

  const [variantMode, setVariantMode] = useState(hasExistingVariants);
  const [variantQtys, setVariantQtys] = useState<Record<number, number>>(() => {
    const qtys: Record<number, number> = {};
    for (const v of leafVariants) qtys[v.id] = 0;
    return qtys;
  });
  const [variantPrices, setVariantPrices] = useState<Record<number, { unit_cost: number; selling_price: number; discount_price: number }>>(() => {
    const prices: Record<number, { unit_cost: number; selling_price: number; discount_price: number }> = {};
    for (const v of leafVariants) {
      prices[v.id] = {
        unit_cost: Number(v.unit_cost ?? 0),
        selling_price: Number(v.selling_price ?? 0),
        discount_price: Number(v.discount_price ?? 0)
      };
    }
    return prices;
  });

  const [newVariants, setNewVariants] = useState<Array<{
    tempKey: string;
    name: string;
    qty: number;
    unit_cost: number;
    selling_price: number;
    discount_price: number;
  }>>([]);

  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [editingVariantName, setEditingVariantName] = useState("");
  const [deletingVariantId, setDeletingVariantId] = useState<number | null>(null);

  const [form, setForm] = useState({
    lot_id: lots[0]?.id ?? 0,
    quantity: 0,
    unit_cost: 0,
    selling_price: 0,
    discount_price: 0,
    another_price: 0,
    reference: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tempKeyRef = useRef(0);
  const getNextTempKey = () => {
    tempKeyRef.current -= 1;
    return String(tempKeyRef.current);
  };

  const currentQty = getProductTotalStock(product);

  const getVariantLabel = (v: (typeof productVariants)[number]): string => {
    const parent =
      v.parent_id != null
        ? productVariants.find((p) => p.id === v.parent_id)
        : undefined;
    const base = v.name || `Variante #${v.id}`;
    return parent?.name ? `${base} (${parent.name})` : base;
  };

  const totalExistingVariantQty = Object.values(variantQtys).reduce((s, q) => s + q, 0);
  const totalNewVariantQty = newVariants.reduce((s, v) => s + v.qty, 0);
  const totalAllVariantQty = totalExistingVariantQty + totalNewVariantQty;

  const hasAnyVariantRow = variantMode || newVariants.length > 0;

  const arrivalValidation = (() => {
    const issues: string[] = [];
    if (!form.lot_id) issues.push("Lot requis");
    if (hasAnyVariantRow) {
      if (totalAllVariantQty <= 0) issues.push("Quantité requise pour au moins une variante");
    } else {
      if (form.quantity <= 0) issues.push("Quantité doit être > 0");
    }
    if (!hasAnyVariantRow && form.unit_cost <= 0) issues.push("Prix d'achat doit être > 0");
    if (form.another_price < 0) issues.push("Autre prix invalide");
    for (const nv of newVariants) {
      if (nv.qty > 0 && !nv.name.trim()) issues.push("Nom requis pour les nouvelles variantes avec quantité");
    }
    return issues;
  })();

  const updateExistingVariantPrice = (id: number, field: "unit_cost" | "selling_price" | "discount_price", value: number) => {
    setVariantPrices((p) => ({
      ...p,
      [id]: { ...p[id], [field]: value }
    }));
  };

  const updateNewVariant = (tempKey: string, field: string, value: string | number) => {
    setNewVariants((prev) =>
      prev.map((nv) => (nv.tempKey === tempKey ? { ...nv, [field]: value } : nv))
    );
  };

  const addNewVariant = () => {
    setNewVariants((prev) => [
      ...prev,
      {
        tempKey: getNextTempKey(),
        name: "",
        qty: 0,
        unit_cost: 0,
        selling_price: 0,
        discount_price: 0
      }
    ]);
  };

  const removeNewVariant = (tempKey: string) => {
    setNewVariants((prev) => prev.filter((nv) => nv.tempKey !== tempKey));
  };

  const startEditVariantName = (v: (typeof productVariants)[number]) => {
    setEditingVariantId(v.id);
    setEditingVariantName(v.name || "");
  };

  const confirmEditVariantName = async () => {
    if (editingVariantId == null) return;
    const name = editingVariantName.trim();
    if (!name) return;
    try {
      await productsService.updateVariant(product.id, editingVariantId, { name });
      const updatedVariant = productVariants.find((v) => v.id === editingVariantId);
      if (updatedVariant) (updatedVariant as typeof productVariants[number]).name = name;
    } catch {
      // silently ignore
    }
    setEditingVariantId(null);
    setEditingVariantName("");
  };

  const confirmDeleteVariant = async (variantId: number) => {
    try {
      await productsService.deleteVariant(product.id, variantId);
      setDeletingVariantId(null);
    } catch {
      // silently ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.lot_id) errs.lot_id = "Lot requis";
    if (!hasAnyVariantRow) {
      if (!form.unit_cost || form.unit_cost <= 0) errs.unit_cost = "Prix d'achat requis";
      if (!form.quantity || form.quantity <= 0) errs.quantity = "Quantité requise";
    }
    if (form.another_price < 0) errs.another_price = "Invalide";
    if (hasAnyVariantRow && totalAllVariantQty <= 0) errs.quantity = "Quantité requise";
    for (const nv of newVariants) {
      if (nv.qty > 0 && !nv.name.trim()) errs.newVariant = "Nom requis pour les nouvelles variantes";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    try {
      const allPayloads: StockArrivalPayload[] = [];

      if (hasAnyVariantRow) {
        const newVariantIdMap: Record<string, number> = {};

        for (const nv of newVariants) {
          if (nv.qty > 0 || nv.name.trim()) {
            const created = await productsService.createVariant(product.id, {
              name: nv.name.trim(),
              quantity: 0,
              unit_cost: nv.unit_cost || undefined,
              selling_price: nv.selling_price || undefined,
              discount_price: nv.discount_price || undefined
            });
            newVariantIdMap[nv.tempKey] = created.id;
          }
        }

        for (const v of leafVariants) {
          const qty = variantQtys[v.id] ?? 0;
          if (qty > 0) {
            const vp = variantPrices[v.id];
            allPayloads.push({
              product_id: product.id,
              quantity: qty,
              lot_id: form.lot_id,
              unit_cost: vp?.unit_cost ?? 0,
              another_price: form.another_price,
              reference: form.reference.trim() || undefined,
              variant_id: v.id
            });
            if (vp) {
              await productsService.updateVariant(product.id, v.id, {
                unit_cost: vp.unit_cost || undefined,
                selling_price: vp.selling_price || undefined,
                discount_price: vp.discount_price || undefined
              });
            }
          }
        }

        for (const nv of newVariants) {
          const realId = newVariantIdMap[nv.tempKey];
          if (realId && nv.qty > 0) {
            allPayloads.push({
              product_id: product.id,
              quantity: nv.qty,
              lot_id: form.lot_id,
              unit_cost: nv.unit_cost,
              another_price: form.another_price,
              reference: form.reference.trim() || undefined,
              variant_id: realId
            });
          }
        }
      } else {
        allPayloads.push({
          product_id: product.id,
          quantity: form.quantity,
          lot_id: form.lot_id,
          unit_cost: form.unit_cost,
          another_price: form.another_price,
          reference: form.reference.trim() || undefined
        });
      }

      await onSubmit(allPayloads);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  const pricingInputClass = "w-full rounded-lg border border-border/60 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
      {errors.submit && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.submit}
        </div>
      )}

      {/* Product summary */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-r from-brand/5 to-transparent p-3 sm:p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg sm:h-14 sm:w-14">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div className={`flex h-full w-full items-center justify-center text-muted/30 ${product.image ? "hidden" : ""}`}>
            <Package className="h-6 w-6" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{product.name}</p>
          <p className="text-xs text-muted">SKU: {product.sku ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Stock</p>
          <p className="text-xl font-extrabold text-brand">{currentQty}</p>
        </div>
      </div>

      {/* Lot */}
      <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-3 sm:p-5 sm:space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Truck className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink">Lot & Référence</p>
        </div>
        <Select
          label="Lot"
          value={String(form.lot_id || "")}
          onValueChange={(value) =>
            setForm((p) => ({ ...p, lot_id: parseInt(value, 10) || 0 }))
          }
          options={[
            { label: "Sélectionner un lot", value: "0" },
            ...[...lots]
              .sort((a, b) => {
                const aTime = new Date(a.received_at ?? a.created_at ?? 0).getTime();
                const bTime = new Date(b.received_at ?? b.created_at ?? 0).getTime();
                return bTime - aTime;
              })
              .map((lot) => ({
                label: `#${lot.id} — ${getLotDateLabel(lot)} — ${lot.reference || "Sans référence"} (${Number(lot.total_expense || 0).toLocaleString("fr-FR")} Ar)`,
                value: String(lot.id)
              }))
          ]}
          disabled={isLoading}
          error={errors.lot_id}
        />
        <Input
          label="Référence (optionnel)"
          value={form.reference}
          onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
          placeholder="ARRIVAGE-2026-08"
          disabled={isLoading}
        />
      </div>

      {/* Quantities & Pricing */}
      <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-3 sm:p-5 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Boxes className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              {variantMode || newVariants.length > 0 ? "Variants" : "Quantités"}
            </p>
          </div>
          {!hasExistingVariants && newVariants.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setVariantMode(true);
                addNewVariant();
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand transition hover:bg-brand/20"
            >
              <Plus className="h-3 w-3" />
              Créer des variantes
            </button>
          )}
        </div>

        {(variantMode || newVariants.length > 0) ? (
          <div className="space-y-3">
            {/* Existing variants */}
            {leafVariants.map((v) => {
              const stock = variantEffectiveStock(productVariants, v);
              const vp = variantPrices[v.id] ?? { unit_cost: 0, selling_price: 0, discount_price: 0 };
              const isEditing = editingVariantId === v.id;
              const isDeleting = deletingVariantId === v.id;

              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-border/40 bg-bg/50 p-3 space-y-3 transition hover:border-brand/30 sm:p-4"
                >
                  {/* Header row: name + stock + qty + actions */}
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingVariantName}
                            onChange={(e) => setEditingVariantName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmEditVariantName();
                              if (e.key === "Escape") setEditingVariantId(null);
                            }}
                            className="w-full rounded-lg border border-brand/50 bg-white px-2 py-1 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand/30"
                            autoFocus
                          />
                          <button type="button" onClick={confirmEditVariantName} className="shrink-0 rounded-lg bg-emerald-500 p-1 text-white hover:bg-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingVariantId(null)} className="shrink-0 rounded-lg bg-gray-200 p-1 text-gray-600 hover:bg-gray-300">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="truncate text-sm font-semibold text-ink">{getVariantLabel(v)}</p>
                          <p className="text-[11px] text-muted">Stock: {stock} pcs</p>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditVariantName(v)}
                          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-blue-50 hover:text-blue-600"
                          title="Renommer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {!isDeleting ? (
                          <button
                            type="button"
                            onClick={() => setDeletingVariantId(v.id)}
                            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-500"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-red-500">Suppr?</span>
                            <button
                              type="button"
                              onClick={() => confirmDeleteVariant(v.id)}
                              className="shrink-0 rounded-lg bg-red-500 p-1 text-white hover:bg-red-600"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingVariantId(null)}
                              className="shrink-0 rounded-lg bg-gray-200 p-1 text-gray-600 hover:bg-gray-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <div className="w-32 shrink-0">
                      <QuantityInput
                        value={variantQtys[v.id] ?? 0}
                        onChange={(qty) =>
                          setVariantQtys((p) => ({ ...p, [v.id]: qty }))
                        }
                        placeholder="Qté"
                        disabled={isLoading}
                        min={0}
                      />
                    </div>
                  </div>

                  {/* Pricing row */}
                  {!isEditing && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix achat</label>
                        <input
                          type="number"
                          value={vp.unit_cost || ""}
                          onChange={(e) => updateExistingVariantPrice(v.id, "unit_cost", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={isLoading}
                          className={pricingInputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix vente</label>
                        <input
                          type="number"
                          value={vp.selling_price || ""}
                          onChange={(e) => updateExistingVariantPrice(v.id, "selling_price", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={isLoading}
                          className={pricingInputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix promo</label>
                        <input
                          type="number"
                          value={vp.discount_price || ""}
                          onChange={(e) => updateExistingVariantPrice(v.id, "discount_price", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={isLoading}
                          className={pricingInputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* New variant rows */}
            {newVariants.map((nv) => (
              <div
                key={nv.tempKey}
                className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 space-y-3 sm:p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={nv.name}
                      onChange={(e) => updateNewVariant(nv.tempKey, "name", e.target.value)}
                      placeholder="Nom de la variante"
                      className="w-full rounded-lg border border-border/60 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewVariant(nv.tempKey)}
                    className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-500"
                    title="Retirer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-32 shrink-0">
                    <QuantityInput
                      value={nv.qty}
                      onChange={(qty) => updateNewVariant(nv.tempKey, "qty", qty)}
                      placeholder="Qté"
                      disabled={isLoading}
                      min={0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix achat</label>
                    <input
                      type="number"
                      value={nv.unit_cost || ""}
                      onChange={(e) => updateNewVariant(nv.tempKey, "unit_cost", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={isLoading}
                      className={pricingInputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix vente</label>
                    <input
                      type="number"
                      value={nv.selling_price || ""}
                      onChange={(e) => updateNewVariant(nv.tempKey, "selling_price", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={isLoading}
                      className={pricingInputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix promo</label>
                    <input
                      type="number"
                      value={nv.discount_price || ""}
                      onChange={(e) => updateNewVariant(nv.tempKey, "discount_price", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={isLoading}
                      className={pricingInputClass}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add variant button */}
            <button
              type="button"
              onClick={addNewVariant}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/30 bg-brand/5 py-2.5 text-xs font-bold text-brand transition hover:bg-brand/10 hover:border-brand/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une variante
            </button>

            {totalAllVariantQty > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-brand/5 px-4 py-2.5">
                <span className="text-xs font-semibold text-muted">Total à ajouter</span>
                <span className="text-sm font-bold text-brand">{totalAllVariantQty} pcs</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <QuantityInput
              label="Quantité d'arrivage"
              value={form.quantity}
              onChange={(value) => setForm((p) => ({ ...p, quantity: value }))}
              placeholder="0"
              disabled={isLoading}
              error={errors.quantity}
              min={0}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Prix d'achat (Ar)"
                type="number"
                value={form.unit_cost}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0"
                disabled={isLoading}
                error={errors.unit_cost}
              />
              <Input
                label="Prix de vente (Ar)"
                type="number"
                value={form.selling_price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, selling_price: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0"
                disabled={isLoading}
              />
              <Input
                label="Prix promo (Ar)"
                type="number"
                value={form.discount_price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, discount_price: parseFloat(e.target.value) || 0 }))
                }
                placeholder="0"
                disabled={isLoading}
              />
            </div>
          </>
        )}
      </div>

      {/* Other cost (only for non-variant mode) */}
      {!hasAnyVariantRow && (
        <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-3 sm:p-5 sm:space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <span className="text-sm font-bold">Ar</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">Autre coût</p>
          </div>
          <Input
            label="Autre coût (Ar)"
            type="number"
            value={form.another_price}
            onChange={(e) =>
              setForm((p) => ({ ...p, another_price: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0"
            disabled={isLoading}
            error={errors.another_price}
          />
        </div>
      )}

      {/* Validation */}
      {arrivalValidation.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          {arrivalValidation.map((msg) => (
            <li key={msg} className="text-xs font-medium text-amber-700">
              {msg}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t border-border/60 pt-4 sm:pt-5">
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          isLoading={isLoading}
          disabled={isLoading || arrivalValidation.length > 0}
        >
          Enregistrer l'arrivage
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function ArrivalsPage() {
  const { search: locationSearch } = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsRes, lotsRes] = await Promise.all([
        productsService.getProducts(1, 500),
        lotsService.getLots(1, 500)
      ]);
      setProducts(productsRes.items);
      setLots(lotsRes.items);

      const params = new URLSearchParams(locationSearch);
      const productId = params.get("product");
      if (productId) {
        const p = productsRes.items.find((item) => item.id === Number(productId));
        if (p) setSelectedProduct(p);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [locationSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.categorie?.name?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleSubmit = async (payloads: StockArrivalPayload[]) => {
    try {
      setIsSubmitting(true);
      setMessage(null);
      for (const payload of payloads) {
        await stockService.registerArrival(payload);
      }
      setMessage({ type: "success", text: `${payloads.length} arrivage(s) enregistré(s) avec succès` });
      setSelectedProduct(null);
      setSearch("");
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur lors de l'arrivage"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Arrivages">
      <div className="animate-fade-up flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200">
              <Truck className="h-4 w-4" />
            </span>
            Enregistrer un nouvel arrivage de marchandises
          </div>
          <span className="text-xs text-muted">{products.length} produits · {lots.length} lots</span>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Mobile: single column with view switching */}
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6">
          {/* ── Product list ── */}
          <div className={`flex flex-col gap-3 sm:gap-4 ${selectedProduct ? "hidden lg:flex" : "flex"}`}>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full rounded-xl border border-border/60 bg-panel py-3 pl-10 pr-10 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Product list */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl border border-border/40 bg-panel/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                {filtered.map((product) => {
                  const stock = getProductTotalStock(product);
                  const hasVariants = (product.variants ?? []).length > 0;
                  const isSelected = selectedProduct?.id === product.id;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProduct(isSelected ? null : product)}
                      className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-brand bg-brand/5 shadow-md ring-1 ring-brand/20"
                          : "border-border/60 bg-panel hover:border-brand/30 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div className={`flex h-full w-full items-center justify-center text-muted/30 ${product.image ? "hidden" : ""}`}>
                          <Package className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted">
                          <span>{product.sku ?? "—"}</span>
                          {hasVariants && (
                            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                              {(product.variants ?? []).length} var.
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${stock > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {stock}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 text-muted transition-transform ${isSelected ? "rotate-90 text-brand" : ""}`}
                        />
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full py-12 text-center text-sm text-muted">
                    Aucun produit trouvé
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Form (right / full mobile) ── */}
          <div className={`flex flex-col gap-4 ${selectedProduct ? "flex" : "hidden lg:flex"}`}>
            {selectedProduct ? (
              <>
                {/* Mobile back button */}
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex items-center gap-2 text-sm font-semibold text-brand lg:hidden"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Retour à la liste
                </button>

                <div>
                  <ArrivalForm
                    product={selectedProduct}
                    lots={lots}
                    onSubmit={handleSubmit}
                    onCancel={() => setSelectedProduct(null)}
                    isLoading={isSubmitting}
                  />
                </div>
              </>
            ) : (
              <div className="hidden min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-panel/30 p-8 text-center lg:flex">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <Truck className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold text-ink">Sélectionnez un produit</p>
                <p className="mt-1 text-xs text-muted">
                  Choisissez un produit dans la liste pour enregistrer un arrivage
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
