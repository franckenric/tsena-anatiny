import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import type { Category } from "../types/product";
import type { Column } from "../components/index";
import { categoriesService } from "../services/categories.service";
import {
  Card,
  Button,
  DataTable,
  Pagination,
  FloatingActionButton
} from "../components/index";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";

export function CategoriesPage() {
  const history = useHistory();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <Layout title="Catégories">
      <FloatingActionButton
        label="Nouvelle catégorie"
        onClick={() => history.push("/categories/new")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <Tags className="h-4 w-4" />
            </span>
            Gestion des catégories
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Liste des catégories"
          description={`Total: ${total} catégories`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => history.push("/categories/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une catégorie
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
            itemLabel="catégories"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={categories}
            isLoading={isLoading}
            emptyMessage="Aucune catégorie trouvée"
            gridCardRender={(cat) => (
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {cat.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {cat.description || "Aucune description"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cat.status === "active" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
                  >
                    {cat.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            )}
            actions={(cat) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => history.push(`/categories/${cat.id}/edit`)}
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
      </div>
    </Layout>
  );
}
