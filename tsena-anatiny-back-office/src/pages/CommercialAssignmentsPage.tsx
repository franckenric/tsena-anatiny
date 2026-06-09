import { useState, useEffect } from "react";
import type {
  CommercialAssignment,
  CreateAssignmentPayload,
  UpdateAssignmentPayload
} from "../types/operations";
import type { Product } from "../types/product";
import type { User } from "../types/user";
import type { Column } from "../components/index";
import { assignmentsService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import { usersService } from "../services/users.service";
import { Layout, Card, Button, DataTable, Input } from "../components/index";
import { Modal } from "../components/Modal";

function AssignmentForm({
  assignment,
  products,
  users,
  onSubmit,
  onCancel,
  isLoading
}: {
  assignment?: CommercialAssignment;
  products: Product[];
  users: User[];
  onSubmit: (
    p: CreateAssignmentPayload | UpdateAssignmentPayload
  ) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    user_id: assignment?.user_id ?? (users[0]?.id || 0),
    product_id: assignment?.product_id ?? (products[0]?.id || 0),
    quantity: assignment?.quantity ?? 1
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sel = (field: string, value: number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.quantity || form.quantity < 1) {
      setErrors({ quantity: "Quantité invalide" });
      return;
    }
    try {
      await onSubmit(form);
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
        <label className="block text-sm font-semibold text-ink">
          Commercial
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
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-ink">Produit</label>
        <select
          value={form.product_id}
          onChange={(e) => sel("product_id", parseInt(e.target.value))}
          className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
          disabled={isLoading}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>
      <Input
        label="Quantité assignée"
        type="number"
        value={form.quantity}
        onChange={(e) => sel("quantity", parseInt(e.target.value) || 1)}
        error={errors.quantity}
        placeholder="1"
        disabled={isLoading}
      />
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          {assignment ? "Mettre à jour" : "Assigner"}
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

export function CommercialAssignmentsPage() {
  const [assignments, setAssignments] = useState<CommercialAssignment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<CommercialAssignment | null>(null);
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
  }, []);
  useEffect(() => {
    load();
  }, [page]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const r = await assignmentsService.getAssignments(page, pageSize);
      setAssignments(r.items);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (a: CommercialAssignment) => {
    if (!confirm("Supprimer cette affectation ?")) return;
    try {
      setIsFormLoading(true);
      await assignmentsService.deleteAssignment(a.id);
      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateAssignmentPayload | UpdateAssignmentPayload
  ) => {
    try {
      setIsFormLoading(true);
      if (selected) {
        const u = await assignmentsService.updateAssignment(
          selected.id,
          payload as UpdateAssignmentPayload
        );
        setAssignments((prev) =>
          prev.map((x) => (x.id === selected.id ? u : x))
        );
      } else {
        const c = await assignmentsService.createAssignment(
          payload as CreateAssignmentPayload
        );
        setAssignments((prev) => [c, ...prev]);
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

  const columns: Column<CommercialAssignment>[] = [
    {
      header: "Commercial",
      accessor: "user_id",
      render: (_, r) => r.user?.email ?? `#${r.user_id}`,
      width: "30%"
    },
    {
      header: "Produit",
      accessor: "product_id",
      render: (_, r) => r.product?.name ?? `#${r.product_id}`,
      width: "30%"
    },
    {
      header: "SKU",
      accessor: "product_id",
      render: (_, r) => r.product?.sku ?? "-",
      width: "20%"
    },
    {
      header: "Quantité",
      accessor: "quantity",
      width: "15%",
      render: (v) => <span className="font-semibold">{v}</span>
    }
  ];

  return (
    <Layout
      title="Affectations commerciales"
      subtitle="Gestion des produits assignés aux commerciaux"
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
            + Nouvelle affectation
          </Button>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card title="Affectations" description={`Total: ${total} affectations`}>
          <DataTable
            columns={columns}
            data={assignments}
            isLoading={isLoading}
            emptyMessage="Aucune affectation"
            actions={(a) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(a);
                    setIsModalOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(a)}
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
          title={selected ? "Modifier affectation" : "Nouvelle affectation"}
        >
          <AssignmentForm
            assignment={selected ?? undefined}
            products={products}
            users={users}
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
