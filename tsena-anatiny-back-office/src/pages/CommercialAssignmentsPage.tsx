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
  Select,
  Pagination
} from "../components/index";
import { Modal } from "../components/Modal";
import { Handshake, Pencil, Plus, Trash2, UserCheck } from "lucide-react";

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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <UserCheck className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Affectation
            </p>
          </div>
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
    >
      <div className="animate-fade-up flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <Handshake className="h-4 w-4" />
            </span>
            Gestion des affectations
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Affectations"
          description={`Total: ${total} affectations`}
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
              Nouvelle affectation
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
            itemLabel="affectations"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={assignments}
            isLoading={isLoading}
            emptyMessage="Aucune affectation"
            gridCardRender={(a) => (
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {a.user?.email ?? `#${a.user_id}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {a.product?.name ?? `#${a.product_id}`}
                      {a.product?.sku ? ` · ${a.product.sku}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                    {a.quantity} pcs
                  </span>
                </div>
              </div>
            )}
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
