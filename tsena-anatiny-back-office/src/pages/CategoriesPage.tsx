import { useState, useEffect } from "react";
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload
} from "../types/product";
import type { Column } from "../components/index";
import { categoriesService } from "../services/categories.service";
import { Card, Button, DataTable, Select } from "../components/index";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Layout } from "../components/Layout";

function CategoryForm({
  category,
  onSubmit,
  onCancel,
  isLoading
}: {
  category?: Category;
  onSubmit: (p: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    description: category?.description ?? "",
    status: category?.status ?? ("active" as const)
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Nom est requis" });
      return;
    }
    try {
      await onSubmit(form);
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur lors de l'envoi"
      });
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
          {errors.submit}
        </div>
      )}
      <Input
        label="Nom"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        error={errors.name}
        placeholder="Nom de la catégorie"
        disabled={isLoading}
      />
      <Input
        label="Description"
        value={form.description}
        onChange={(e) =>
          setForm((p) => ({ ...p, description: e.target.value }))
        }
        placeholder="Description (optionnel)"
        disabled={isLoading}
      />
      <Select
        label="Statut"
        value={form.status}
        onValueChange={(value) =>
          setForm((p) => ({ ...p, status: value as "active" | "inactive" }))
        }
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" }
        ]}
        disabled={isLoading}
      />
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          {category ? "Mettre à jour" : "Créer"}
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

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCategories();
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await categoriesService.getCategories(page, pageSize);
      setCategories(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Supprimer « ${cat.name} » ?`)) return;
    try {
      setIsFormLoading(true);
      await categoriesService.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateCategoryPayload | UpdateCategoryPayload
  ) => {
    try {
      setIsFormLoading(true);
      if (selected) {
        const updated = await categoriesService.updateCategory(
          selected.id,
          payload as UpdateCategoryPayload
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === selected.id ? updated : c))
        );
      } else {
        const created = await categoriesService.createCategory(
          payload as CreateCategoryPayload
        );
        setCategories((prev) => [created, ...prev]);
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

  const columns: Column<Category>[] = [
    { header: "Nom", accessor: "name", width: "30%" },
    {
      header: "Description",
      accessor: "description",
      render: (v) => v || "-",
      width: "40%"
    },
    {
      header: "Statut",
      accessor: "status",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            v === "active"
              ? "bg-success/20 text-success"
              : "bg-warning/20 text-warning"
          }`}
        >
          {v === "active" ? "Active" : "Inactive"}
        </span>
      ),
      width: "15%"
    }
  ];

  return (
    <Layout title="Catégories" subtitle="Gérez les catégories de produits">
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Liste des catégories"
          description={`Total: ${total} catégories`}
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
              + Ajouter une catégorie
            </Button>
          }
        >
          <DataTable
            columns={columns}
            data={categories}
            isLoading={isLoading}
            emptyMessage="Aucune catégorie trouvée"
            actions={(cat) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(cat);
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
                  onClick={() => handleDelete(cat)}
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
            Page {page} de {totalPages}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <label
              className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
              htmlFor="categories-page-size"
            >
              Par page
            </label>
            <select
              id="categories-page-size"
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
          title={selected ? "Modifier la catégorie" : "Nouvelle catégorie"}
        >
          <CategoryForm
            category={selected ?? undefined}
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
