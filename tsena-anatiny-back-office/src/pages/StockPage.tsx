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
  Select
} from "../components/index";
import { Modal } from "../components/Modal";
import { Pencil, Trash2 } from "lucide-react";

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
  const [form, setForm] = useState({
    product_id: stock?.product_id ?? (products[0]?.id || 0),
    lot_id: lots[0]?.id || 0,
    quantity: stock?.quantity ?? 0,
    reserved: stock?.reserved ?? false,
    reference: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stockValidation = (() => {
    const issues: string[] = [];
    if (!form.product_id) issues.push("Produit requis");
    if (!stock && !form.lot_id) issues.push("Lot requis");
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

        await onSubmit({
          product_id: form.product_id,
          quantity: form.quantity,
          lot_id: form.lot_id,
          reference: form.reference || undefined
        });
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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Produit
          </p>
          <Select
            label="Produit"
            value={String(form.product_id)}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, product_id: parseInt(value) }))
            }
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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Détails stock
          </p>
          <QuantityInput
            label="Quantité"
            value={form.quantity}
            onChange={(value) => setForm((p) => ({ ...p, quantity: value }))}
            placeholder="0"
            disabled={isLoading}
            min={0}
          />
          {stock ? (
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
          ) : (
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
      render: (_, row) =>
        row.product?.name ??
        products.find((p) => p.id === row.product_id)?.name ??
        `#${row.product_id}`,
      width: "35%"
    },
    {
      header: "SKU",
      accessor: "product_id",
      render: (_, row) => row.product?.sku ?? "-",
      width: "20%"
    },
    {
      header: "Quantité",
      accessor: "quantity",
      width: "20%",
      render: (v) => <span className="font-semibold text-ink">{v}</span>
    },
    {
      header: "Réservé",
      accessor: "reserved",
      width: "15%",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${v ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}
        >
          {v ? "Oui" : "Non"}
        </span>
      )
    }
  ];

  return (
    <Layout title="Stock" subtitle="Gestion des stocks produits">
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Stocks"
          description={`Total: ${total} entrées`}
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
              + Entrée stock
            </Button>
          }
        >
          <DataTable
            columns={columns}
            data={stocks}
            isLoading={isLoading}
            emptyMessage="Aucun stock"
            actions={(s) => (
              <>
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
              </>
            )}
          />
        </Card>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-panel/65 px-2.5 py-2 sm:gap-3 sm:px-3">
          <p className="text-xs font-medium text-muted sm:text-sm">
            Page {page} / {totalPages}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <label
              className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
              htmlFor="stock-page-size"
            >
              Par page
            </label>
            <select
              id="stock-page-size"
              className="h-8 min-w-[68px] rounded-lg border border-border bg-bg px-2 text-xs font-semibold text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 sm:h-9 sm:min-w-[72px] sm:text-sm"
              value={pageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value) || 20;
                setPageSize(nextSize);
                setPage(1);
              }}
              disabled={isLoading}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              className="min-w-[84px] sm:min-w-[96px]"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="min-w-[84px] sm:min-w-[96px]"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelected(null);
          }}
          title={selected ? "Modifier stock" : "Nouvelle entrée stock"}
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
