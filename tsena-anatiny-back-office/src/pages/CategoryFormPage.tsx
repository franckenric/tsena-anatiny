import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload
} from "../types/product";
import { categoriesService } from "../services/categories.service";
import { Input, Select, Layout, FloatingActionButton } from "../components/index";

export function CategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive"
  });

  useEffect(() => {
    if (!isEdit) return;
    categoriesService
      .getCategories(1, 500)
      .then((r) => {
        const category = r.items.find((c) => c.id === Number(id)) as
          | Category
          | undefined;
        if (!category) {
          setError("Catégorie introuvable");
          return;
        }
        setForm({
          name: category.name ?? "",
          description: category.description ?? "",
          status: category.status ?? "active"
        });
      })
      .catch(() => setError("Erreur chargement"))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nom est requis");
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      if (isEdit) {
        await categoriesService.updateCategory(
          Number(id),
          form as UpdateCategoryPayload
        );
      } else {
        await categoriesService.createCategory(
          form as CreateCategoryPayload
        );
      }
      history.push("/categories");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title={isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}>
      <FloatingActionButton
        label="Enregistrer"
        formId="category-form"
        disabled={isSaving || isLoading}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <button
            type="button"
            onClick={() => history.push("/categories")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </span>
            Retour aux catégories
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-panel p-4 sm:p-5">
          <button
            type="button"
            onClick={() => history.push("/categories")}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand sm:hidden"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Retour à la liste
          </button>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg border border-border/40 bg-panel/50"
                />
              ))}
            </div>
          ) : (
            <form id="category-form" onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nom"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nom de la catégorie"
                disabled={isSaving}
              />
              <Input
                label="Description"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Description (optionnel)"
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
