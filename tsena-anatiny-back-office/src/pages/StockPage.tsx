import { useState, useEffect } from "react";
import type {
  Lot,
  Stock,
  CreateStockPayload,
  StockArrivalPayload,
  UpdateStockPayload
} from "../types/operations";
import type { Product } from "../types/product";
import type { Column } from "../components/index";
import { lotsService, stockService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import {
  Layout,
  Card,
  Button,
  DataTable,
  Input,
  QuantityInput,
  Select,
  Pagination
} from "../components/index";
import { Modal } from "../components/Modal";
import { Boxes, Package, Pencil, Plus, Trash2 } from "lucide-react";

const getLotDateLabel = (lot: Lot) => {
  const rawDate = lot.received_at ?? lot.created_at;
  if (!rawDate) return "Date inconnue";

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";

  return parsed.toLocaleDateString("fr-FR");
};

const getLotOptions = (lots: Lot[]) => [
  { label: "Sélectionner un lot", value: "0" },
  ...[...lots]
    .sort((a, b) => {
      const aTime = new Date(a.received_at ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.received_at ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    })
    .map((lot) => ({
      label: `#${lot.id} - ${getLotDateLabel(lot)} - ${lot.reference || "Sans référence"} (${Number(lot.total_expense || 0).toLocaleString("fr-FR")} Ar)`,
      value: String(lot.id)
    }))
];

function StockForm({
  stock,
  products,
  lots,
  onSubmit,
  onCancel,
  isLoading
}: {
  stock?: Stock;
  products: Product[];
  lots: Lot[];
  onSubmit: (
    p: CreateStockPayload | StockArrivalPayload | UpdateStockPayload
  ) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const selectedProduct = products.find((p) => p.id === (stock?.product_id ?? (products[0]?.id || 0)));
  const productVariants = selectedProduct?.variants ?? [];
  const leafVariants = productVariants.filter(
    (v) => !productVariants.some((other) => other.parent_id === v.id)
  );
  const hasVariants = !stock && leafVariants.length > 0;

  const [form, setForm] = useState(() => {
    const variantQtys: Record<number, number> = {};
    const variantPricing: Record<number, { unit_cost: number; selling_price: number; discount_price: number }> = {};
    if (!stock) {
      for (const v of leafVariants) {
        variantQtys[v.id] = 0;
        variantPricing[v.id] = {
          unit_cost: v.unit_cost ?? 0,
          selling_price: v.selling_price ?? 0,
          discount_price: v.discount_price ?? 0
        };
      }
    }
    return {
      product_id: stock?.product_id ?? (products[0]?.id || 0),
      lot_id: lots[0]?.id || 0,
      variantQtys,
      variantPricing,
      quantity: stock?.quantity ?? 0,
      reserved: stock?.reserved ?? false,
      unit_cost: 0,
      selling_price: 0,
      discount_price: 0,
      reference: ""
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getVariantLabel = (v: (typeof productVariants)[number]): string => {
    const parent =
      v.parent_id != null
        ? productVariants.find((p) => p.id === v.parent_id)
        : undefined;
    const base = v.name || `Variante #${v.id}`;
    return parent?.name ? `${base} (${parent.name})` : base;
  };

  const totalVariantQty = hasVariants
    ? Object.values(form.variantQtys).reduce((s, q) => s + q, 0)
    : 0;

  const stockValidation = (() => {
    const issues: string[] = [];
    if (!form.product_id) issues.push("Produit requis");
    if (!stock && !form.lot_id) issues.push("Lot requis");
    if (!stock && hasVariants && totalVariantQty <= 0) issues.push("Quantité requise pour au moins une variante");
    if (!stock && !hasVariants && form.quantity <= 0) issues.push("Quantité requise");
    return issues;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id) {
      setErrors({ product_id: "Produit requis" });
      return;
    }
    try {
      if (stock) {
        await onSubmit({
          product_id: form.product_id,
          quantity: form.quantity,
          reserved: form.reserved
        });
      } else {
        if (!form.lot_id) {
          setErrors({ lot_id: "Lot requis" });
          return;
        }
        if (hasVariants) {
          for (const v of leafVariants) {
            const qty = form.variantQtys[v.id] ?? 0;
            if (qty > 0) {
              await onSubmit({
                product_id: form.product_id,
                quantity: qty,
                lot_id: form.lot_id,
                reference: form.reference || undefined,
                variant_id: v.id,
                unit_cost: form.variantPricing[v.id]?.unit_cost ?? 0
              } as StockArrivalPayload);
            }
          }
          for (const v of leafVariants) {
            const qty = form.variantQtys[v.id] ?? 0;
            if (qty > 0) {
              const pricing = form.variantPricing[v.id];
              if (pricing && (pricing.selling_price > 0 || pricing.discount_price > 0)) {
                try {
                  await productsService.updateVariant(form.product_id, v.id, {
                    selling_price: pricing.selling_price || undefined,
                    discount_price: pricing.discount_price || undefined,
                    unit_cost: pricing.unit_cost || undefined
                  });
                } catch {
                  // silently ignore pricing update failures
                }
              }
            }
          }
        } else {
          await onSubmit({
            product_id: form.product_id,
            quantity: form.quantity,
            lot_id: form.lot_id,
            reference: form.reference || undefined
          } as StockArrivalPayload);
          if (selectedProduct && (form.selling_price > 0 || form.discount_price > 0)) {
            try {
              await productsService.updateProduct(selectedProduct.id, {
                selling_price: form.selling_price || undefined,
                discount_price: form.discount_price || undefined
              });
            } catch {
              // silently ignore
            }
          }
        }
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
      <div className="space-y-4 pb-4">
        {errors.submit && (
          <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Package className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Produit
            </p>
          </div>
          <Select
            label="Produit"
            value={String(form.product_id)}
            onValueChange={(value) => setForm((p) => ({ ...p, product_id: parseInt(value) }))}
            options={products.map((p) => ({
              label: `${p.name} (${p.sku})`,
              value: String(p.id)
            }))}
            placeholder="Sélectionner un produit"
            disabled={isLoading}
            error={errors.product_id}
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Boxes className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Détails stock
            </p>
          </div>
          {stock ? (
            <>
              <QuantityInput
                label="Quantité"
                value={form.quantity}
                onChange={(value) => setForm((p) => ({ ...p, quantity: value }))}
                placeholder="0"
                disabled={isLoading}
                min={0}
              />
              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="text-sm font-semibold text-ink">Réservé</span>
                <span className="relative inline-flex h-7 w-12 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={form.reserved}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, reserved: e.target.checked }))
                    }
                    disabled={isLoading}
                  />
                  <span className="absolute inset-0 rounded-full bg-border transition peer-checked:bg-brand peer-disabled:opacity-60" />
                  <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>
            </>
          ) : hasVariants ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted">Quantité par variante</p>
              {leafVariants.map((v) => (
                <div key={v.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{getVariantLabel(v)}</p>
                    <p className="text-[11px] text-muted">Stock actuel: {v.quantity ?? 0}</p>
                  </div>
                  <div className="w-28 shrink-0">
                    <QuantityInput
                      value={form.variantQtys[v.id] ?? 0}
                      onChange={(qty) =>
                        setForm((p) => ({
                          ...p,
                          variantQtys: { ...p.variantQtys, [v.id]: qty }
                        }))
                      }
                      placeholder="0"
                      disabled={isLoading}
                      min={0}
                    />
                  </div>
                </div>
              ))}
              {totalVariantQty > 0 && (
                <p className="text-xs font-semibold text-brand">Total à ajouter: {totalVariantQty}</p>
              )}
            </div>
          ) : (
            <QuantityInput
              label="Quantité"
              value={form.quantity}
              onChange={(value) => setForm((p) => ({ ...p, quantity: value }))}
              placeholder="0"
              disabled={isLoading}
              min={0}
            />
          )}
          {!stock && (
            <>
              <Select
                label="Lot"
                value={String(form.lot_id || "")}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, lot_id: parseInt(value) || 0 }))
                }
                options={getLotOptions(lots)}
                disabled={isLoading}
                error={errors.lot_id}
              />
              <Input
                label="Référence lot"
                value={form.reference}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reference: e.target.value }))
                }
                placeholder="ARRIVAGE-2026-06"
                disabled={isLoading}
              />
            </>
          )}
        </div>

        {!stock && (
          <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Package className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink">
                Tarification
              </p>
            </div>
            {hasVariants ? (
              <div className="space-y-4">
                {leafVariants.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border/40 bg-bg/20 p-3 space-y-3">
                    <p className="text-sm font-semibold text-ink">{getVariantLabel(v)}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Coût unitaire (Ar)"
                        type="number"
                        value={form.variantPricing[v.id]?.unit_cost ?? 0}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            variantPricing: {
                              ...p.variantPricing,
                              [v.id]: {
                                ...p.variantPricing[v.id],
                                unit_cost: parseFloat(e.target.value) || 0
                              }
                            }
                          }))
                        }
                        placeholder="0"
                        disabled={isLoading}
                      />
                      <Input
                        label="Prix vente (Ar)"
                        type="number"
                        value={form.variantPricing[v.id]?.selling_price ?? 0}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            variantPricing: {
                              ...p.variantPricing,
                              [v.id]: {
                                ...p.variantPricing[v.id],
                                selling_price: parseFloat(e.target.value) || 0
                              }
                            }
                          }))
                        }
                        placeholder="0"
                        disabled={isLoading}
                      />
                      <Input
                        label="Prix promo (Ar)"
                        type="number"
                        value={form.variantPricing[v.id]?.discount_price ?? 0}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            variantPricing: {
                              ...p.variantPricing,
                              [v.id]: {
                                ...p.variantPricing[v.id],
                                discount_price: parseFloat(e.target.value) || 0
                              }
                            }
                          }))
                        }
                        placeholder="0"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Coût unitaire (Ar)"
                  type="number"
                  value={form.unit_cost}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  disabled={isLoading}
                />
                <Input
                  label="Prix vente (Ar)"
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
            )}
          </div>
        )}

        {stockValidation.length > 0 && (
          <ul className="space-y-0.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2">
            {stockValidation.map((msg) => (
              <li key={msg} className="text-xs text-warning">
                • {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-border/60 pt-4">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
          disabled={isLoading || stockValidation.length > 0}
        >
          {stock ? "Mettre à jour" : "Créer"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    productsService
      .getProducts(1, 200)
      .then((r) => setProducts(r.items))
      .catch(() => {});

    lotsService
      .getLots(1, 200)
      .then((r) => setLots(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const r = await stockService.getStock(page, pageSize);
      setStocks(r.items);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (s: Stock) => {
    if (!confirm("Supprimer ce stock ?")) return;
    try {
      setIsFormLoading(true);
      await stockService.deleteStock(s.id);
      setStocks((prev) => prev.filter((x) => x.id !== s.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateStockPayload | StockArrivalPayload | UpdateStockPayload
  ) => {
    try {
      setIsFormLoading(true);
      if (selected) {
        const u = await stockService.updateStock(
          selected.id,
          payload as UpdateStockPayload
        );
        setStocks((prev) => prev.map((x) => (x.id === selected.id ? u : x)));
      } else {
        const c = await stockService.registerArrival(
          payload as StockArrivalPayload
        );
        setStocks((prev) => [c, ...prev]);
        setTotal((t) => t + 1);
      }
      setIsModalOpen(false);
      setSelected(null);
    } catch (err) {
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const columns: Column<Stock>[] = [
    {
      header: "Produit",
      accessor: "product_id",
      width: "40%",
      render: (_, row) => {
        const product =
          row.product ?? products.find((p) => p.id === row.product_id);
        const name = product?.name ?? `Produit #${row.product_id}`;
        const sku = product?.sku;
        return (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{name}</p>
            {sku ? <p className="truncate text-xs text-muted">{sku}</p> : null}
          </div>
        );
      }
    },
    {
      header: "Quantité",
      accessor: "quantity",
      width: "20%",
      render: (v) => <span className="font-semibold text-ink">{v}</span>
    },
    {
      header: "Prix de vente",
      accessor: "product_id",
      width: "20%",
      render: (_, row) => {
        const product =
          row.product ?? products.find((p) => p.id === row.product_id);
        if (!product?.selling_price) return "-";
        if (product.discount_price != null && product.discount_price > 0 && Number(product.discount_price) < Number(product.selling_price)) {
          return (
            <span>
              <span className="font-semibold">{Number(product.discount_price).toLocaleString("fr-FR") + " Ar"}</span>
              <span className="ml-1 text-xs text-muted line-through">{Number(product.selling_price).toLocaleString("fr-FR") + " Ar"}</span>
            </span>
          );
        }
        return Number(product.selling_price).toLocaleString("fr-FR") + " Ar";
      }
    },
    {
      header: "Réservé",
      accessor: "reserved",
      width: "15%",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${v ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}
        >
          {v ? "Réservé" : "Disponible"}
        </span>
      )
    }
  ];

  return (
    <Layout title="Stock">
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <Boxes className="h-4 w-4" />
            </span>
            Gestion du stock
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Stocks"
          description={`Total: ${total} entrées`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => {
                setSelected(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Entrée stock
            </Button>
          }
        >
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            showCount={false}
            itemLabel="entrées"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={stocks}
            isLoading={isLoading}
            emptyMessage="Aucun stock"
            gridCardRender={(s) => {
              const product =
                s.product ?? products.find((p) => p.id === s.product_id);
              const name = product?.name ?? `Produit #${s.product_id}`;
              const sku = product?.sku;
              return (
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {name}
                      </p>
                      {sku ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {sku}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.reserved ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}
                    >
                      {s.reserved ? "Réservé" : "Disponible"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border/50 pt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Quantité
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {s.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Prix de vente
                      </p>
                      {product?.discount_price != null && product.discount_price > 0 && Number(product.selling_price ?? 0) > 0 && Number(product.discount_price) < Number(product.selling_price) ? (
                        <p className="mt-0.5 text-sm font-bold text-brand">
                          <span>{Number(product.discount_price).toLocaleString("fr-FR") + " Ar"}</span>
                          <span className="ml-1 text-xs text-muted line-through">
                            {Number(product.selling_price).toLocaleString("fr-FR") + " Ar"}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm font-bold text-brand">
                          {product?.selling_price
                            ? Number(product.selling_price).toLocaleString(
                                "fr-FR"
                              ) + " Ar"
                            : "—"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
            actions={(s) => (
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(s);
                    setIsModalOpen(true);
                  }}
                  title="Modifier"
                  aria-label="Modifier"
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(s)}
                  title="Supprimer"
                  aria-label="Supprimer"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        </Card>
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelected(null);
          }}
          title={selected ? "Modifier stock" : "Nouvelle entrée stock"}
          contentClassName="max-w-4xl"
        >
          <StockForm
            stock={selected ?? undefined}
            products={products}
            lots={lots}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setSelected(null);
            }}
            isLoading={isFormLoading}
          />
        </Modal>
      </div>
    </Layout>
  );
}
