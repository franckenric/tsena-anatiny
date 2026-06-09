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
import { Layout, Card, Button, DataTable, Input } from "../components/index";
import { Modal } from "../components/Modal";

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
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
          {errors.submit}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-ink">Produit</label>
        <select
          value={form.product_id}
          onChange={(e) =>
            setForm((p) => ({ ...p, product_id: parseInt(e.target.value) }))
          }
          className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
          disabled={isLoading}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
        {errors.product_id && (
          <p className="text-xs text-warning">{errors.product_id}</p>
        )}
      </div>
      <Input
        label="Quantité"
        type="number"
        value={form.quantity}
        onChange={(e) =>
          setForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 0 }))
        }
        placeholder="0"
        disabled={isLoading}
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
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-ink">Lot</label>
            <select
              value={form.lot_id || ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  lot_id: parseInt(e.target.value) || 0
                }))
              }
              className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
              disabled={isLoading}
            >
              <option value={0}>Sélectionner un lot</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  #{l.id} - {l.reference || "Sans référence"} (
                  {Number(l.total_expense || 0).toLocaleString("fr-FR")} Ar)
                </option>
              ))}
            </select>
            {errors.lot_id && (
              <p className="text-xs text-warning">{errors.lot_id}</p>
            )}
          </div>
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
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
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
  const [pageSize] = useState(20);
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
  }, [page]);

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
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              setSelected(null);
              setIsModalOpen(true);
            }}
          >
            + Entrée stock
          </Button>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card title="Stocks" description={`Total: ${total} entrées`}>
          <DataTable
            columns={columns}
            data={stocks}
            isLoading={isLoading}
            emptyMessage="Aucun stock"
            actions={(s) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(s);
                    setIsModalOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(s)}
                >
                  Supprimer
                </Button>
              </div>
            )}
          />
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
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
