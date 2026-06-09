import { useState, useEffect } from "react";
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload
} from "../types/product";
import type { Column } from "../components/index";
import { categoriesService } from "../services/categories.service";
import { Card, Button, DataTable } from "../components/index";
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
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-ink">Statut</label>
        <select
          value={form.status}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              status: e.target.value as "active" | "inactive"
            }))
          }
          className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
          disabled={isLoading}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
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
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCategories();
  }, [page]);

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
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              setSelected(null);
              setIsModalOpen(true);
            }}
          >
            + Ajouter une catégorie
          </Button>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Liste des catégories"
          description={`Total: ${total} catégories`}
        >
          <DataTable
            columns={columns}
            data={categories}
            isLoading={isLoading}
            emptyMessage="Aucune catégorie trouvée"
            actions={(cat) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(cat);
                    setIsModalOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(cat)}
                >
                  Supprimer
                </Button>
              </div>
            )}
          />
        </Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page} de {Math.max(1, Math.ceil(total / pageSize))}
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
