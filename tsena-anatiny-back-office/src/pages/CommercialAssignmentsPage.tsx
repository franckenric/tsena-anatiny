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
import {
  Layout,
  Card,
  Button,
  DataTable,
  QuantityInput,
  Select
} from "../components/index";
import { Modal } from "../components/Modal";
import { Pencil, Trash2 } from "lucide-react";

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

  const assignmentValidation = (() => {
    const issues: string[] = [];
    if (!form.user_id) issues.push("Commercial requis");
    if (!form.product_id) issues.push("Produit requis");
    if (form.quantity < 1) issues.push("Quantité invalide (min 1)");
    return issues;
  })();

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
    <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
      <div className="space-y-4 pb-4">
        {errors.submit && (
          <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Affectation
          </p>
          <Select
            label="Commercial"
            value={String(form.user_id)}
            onValueChange={(value) => sel("user_id", parseInt(value))}
            options={users.map((u) => ({
              label: u.email,
              value: String(u.id)
            }))}
            placeholder="Sélectionner un commercial"
            disabled={isLoading}
          />
          <Select
            label="Produit"
            value={String(form.product_id)}
            onValueChange={(value) => sel("product_id", parseInt(value))}
            options={products.map((p) => ({
              label: `${p.name} (${p.sku})`,
              value: String(p.id)
            }))}
            placeholder="Sélectionner un produit"
            disabled={isLoading}
          />
          <QuantityInput
            label="Quantité assignée"
            value={form.quantity}
            onChange={(value) => sel("quantity", value || 1)}
            error={errors.quantity}
            placeholder="1"
            disabled={isLoading}
            min={1}
          />
        </div>

        {assignmentValidation.length > 0 && (
          <ul className="space-y-0.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2">
            {assignmentValidation.map((msg) => (
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
          disabled={isLoading || assignmentValidation.length > 0}
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
  const [pageSize, setPageSize] = useState(20);
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
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Affectations"
          description={`Total: ${total} affectations`}
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
              + Nouvelle affectation
            </Button>
          }
        >
          <DataTable
            columns={columns}
            data={assignments}
            isLoading={isLoading}
            emptyMessage="Aucune affectation"
            actions={(a) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(a);
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
                  onClick={() => handleDelete(a)}
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
              htmlFor="assignments-page-size"
            >
              Par page
            </label>
            <select
              id="assignments-page-size"
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
