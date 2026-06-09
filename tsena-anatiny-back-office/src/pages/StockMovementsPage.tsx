import { useState, useEffect } from "react";
import type {
  StockMovement,
  CreateStockMovementPayload,
  UpdateStockMovementPayload,
  MovementType,
  Lot
} from "../types/operations";
import type { Product } from "../types/product";
import type { User } from "../types/user";
import type { Column } from "../components/index";
import {
  stockMovementsService,
  lotsService
} from "../services/operations.service";
import { productsService } from "../services/products.service";
import { usersService } from "../services/users.service";
import { Layout, Card, Button, DataTable, Input } from "../components/index";
import { Modal } from "../components/Modal";

function MovementForm({
  movement,
  products,
  users,
  lots,
  onSubmit,
  onCancel,
  isLoading
}: {
  movement?: StockMovement;
  products: Product[];
  users: User[];
  lots: Lot[];
  onSubmit: (
    p: CreateStockMovementPayload | UpdateStockMovementPayload
  ) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    product_id: movement?.product_id ?? (products[0]?.id || 0),
    user_id: movement?.user_id ?? (users[0]?.id || 0),
    lot_id: movement?.lot_id ?? 0,
    type: (movement?.type ?? "in_stock") as MovementType,
    quantity: movement?.quantity ?? 1,
    reference: movement?.reference ?? ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id) {
      setErrors({ product_id: "Produit requis" });
      return;
    }
    if (!form.quantity || form.quantity < 1) {
      setErrors({ quantity: "Quantité invalide" });
      return;
    }
    if (form.type === "in_stock" && !form.lot_id) {
      setErrors({ lot_id: "Lot requis pour une entrée" });
      return;
    }
    try {
      const payload = {
        ...form,
        lot_id:
          form.type === "in_stock" && form.lot_id ? form.lot_id : undefined
      };
      await onSubmit(payload);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  const sel = (field: string, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
          {errors.submit}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-ink">
            Produit
          </label>
          <select
            value={form.product_id}
            onChange={(e) => sel("product_id", parseInt(e.target.value))}
            className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
            disabled={isLoading}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-ink">
            Utilisateur
          </label>
          <select
            value={form.user_id}
            onChange={(e) => sel("user_id", parseInt(e.target.value))}
            className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
            disabled={isLoading}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-ink">Type</label>
          <select
            value={form.type}
            onChange={(e) => sel("type", e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
            disabled={isLoading}
          >
            <option value="in_stock">Entrée</option>
            <option value="out_stock">Sortie</option>
          </select>
        </div>
        <Input
          label="Quantité"
          type="number"
          value={form.quantity}
          onChange={(e) => sel("quantity", parseInt(e.target.value) || 0)}
          error={errors.quantity}
          placeholder="1"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-ink">Lot</label>
        <select
          value={form.lot_id}
          onChange={(e) => sel("lot_id", parseInt(e.target.value) || 0)}
          className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
          disabled={isLoading || form.type !== "in_stock"}
        >
          <option value={0}>Sélectionner un lot</option>
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              #{lot.id} - {lot.reference || "Sans référence"}
            </option>
          ))}
        </select>
        {errors.lot_id && (
          <p className="text-xs text-warning">{errors.lot_id}</p>
        )}
      </div>
      <Input
        label="Référence (optionnel)"
        value={form.reference}
        onChange={(e) => sel("reference", e.target.value)}
        placeholder="BON-001"
        disabled={isLoading}
      />
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          {movement ? "Mettre à jour" : "Créer"}
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

export function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<StockMovement | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    productsService
      .getProducts(1, 200)
      .then((r) => setProducts(r.items))
      .catch(() => {});
    usersService
      .getUsers(1, 200)
      .then((r) => setUsers(r.items))
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
      const r = await stockMovementsService.getMovements(page, pageSize);
      setMovements(r.items);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (m: StockMovement) => {
    if (!confirm("Supprimer ce mouvement ?")) return;
    try {
      setIsFormLoading(true);
      await stockMovementsService.deleteMovement(m.id);
      setMovements((prev) => prev.filter((x) => x.id !== m.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateStockMovementPayload | UpdateStockMovementPayload
  ) => {
    try {
      setIsFormLoading(true);
      if (selected) {
        const u = await stockMovementsService.updateMovement(
          selected.id,
          payload as UpdateStockMovementPayload
        );
        setMovements((prev) => prev.map((x) => (x.id === selected.id ? u : x)));
      } else {
        const c = await stockMovementsService.createMovement(
          payload as CreateStockMovementPayload
        );
        setMovements((prev) => [c, ...prev]);
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

  const columns: Column<StockMovement>[] = [
    {
      header: "Produit",
      accessor: "product_id",
      render: (_, r) => r.product?.name ?? `#${r.product_id}`,
      width: "25%"
    },
    {
      header: "Utilisateur",
      accessor: "user_id",
      render: (_, r) => r.user?.email ?? `#${r.user_id}`,
      width: "22%"
    },
    {
      header: "Type",
      accessor: "type",
      width: "13%",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${v === "in_stock" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
        >
          {v === "in_stock" ? "Entrée" : "Sortie"}
        </span>
      )
    },
    {
      header: "Quantité",
      accessor: "quantity",
      width: "10%",
      render: (v) => <span className="font-semibold">{v}</span>
    },
    {
      header: "Lot",
      accessor: "lot_id",
      width: "12%",
      render: (v) => (v ? `#${v}` : "-")
    },
    {
      header: "Référence",
      accessor: "reference",
      render: (v) => v || "-",
      width: "15%"
    },
    {
      header: "Date",
      accessor: "created_at",
      width: "13%",
      render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-")
    }
  ];

  return (
    <Layout
      title="Mouvements de stock"
      subtitle="Historique des entrées et sorties"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              setSelected(null);
              setIsModalOpen(true);
            }}
          >
            + Nouveau mouvement
          </Button>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card title="Mouvements" description={`Total: ${total} mouvements`}>
          <DataTable
            columns={columns}
            data={movements}
            isLoading={isLoading}
            emptyMessage="Aucun mouvement"
            actions={(m) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(m);
                    setIsModalOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(m)}
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
          title={selected ? "Modifier mouvement" : "Nouveau mouvement"}
        >
          <MovementForm
            movement={selected ?? undefined}
            products={products}
            users={users}
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
