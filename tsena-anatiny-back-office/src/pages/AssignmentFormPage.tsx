import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowRight, UserCheck } from "lucide-react";
import type {
  CreateAssignmentPayload,
  UpdateAssignmentPayload
} from "../types/operations";
import type { Product } from "../types/product";
import type { User } from "../types/user";
import { assignmentsService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import { usersService } from "../services/users.service";
import {
  QuantityInput,
  Select,
  Layout,
  FloatingActionButton
} from "../components/index";

export function AssignmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    user_id: 0,
    product_id: 0,
    quantity: 1
  });

  useEffect(() => {
    void (async () => {
      try {
        const [productsRes, usersRes] = await Promise.all([
          productsService.getProducts(1, 200),
          usersService.getUsers(1, 200)
        ]);
        setProducts(productsRes.items);
        setUsers(usersRes.items);

        if (isEdit) {
          const assignmentsRes = await assignmentsService.getAssignments(
            1,
            1000
          );
          const assignment = assignmentsRes.items.find(
            (a) => a.id === Number(id)
          );
          if (assignment) {
            setForm({
              user_id: assignment.user_id ?? 0,
              product_id: assignment.product_id ?? 0,
              quantity: assignment.quantity ?? 1
            });
          } else {
            setErrors({ submit: "Affectation introuvable" });
          }
        } else {
          setForm({
            user_id: usersRes.items[0]?.id || 0,
            product_id: productsRes.items[0]?.id || 0,
            quantity: 1
          });
        }
      } catch {
        setErrors({ submit: "Erreur chargement des données" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isEdit]);

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
      setIsSaving(true);
      if (isEdit) {
        await assignmentsService.updateAssignment(
          Number(id),
          form as UpdateAssignmentPayload
        );
      } else {
        await assignmentsService.createAssignment(
          form as CreateAssignmentPayload
        );
      }
      history.push("/commercial-assignments");
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title={isEdit ? "Modifier l'affectation" : "Nouvelle affectation"}>
      <FloatingActionButton
        label="Enregistrer"
        formId="assignment-form"
        disabled={isSaving || isLoading}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <button
            type="button"
            onClick={() => history.push("/commercial-assignments")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </span>
            Retour aux affectations
          </button>
        </div>

        {errors.submit && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        <button
          type="button"
          onClick={() => history.push("/commercial-assignments")}
          className="flex items-center gap-2 text-sm font-semibold text-brand sm:hidden"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Retour à la liste
        </button>

        <div className="rounded-2xl border border-border/60 bg-panel p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <UserCheck className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Affectation
            </p>
          </div>

          <form id="assignment-form" onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Commercial"
              value={String(form.user_id)}
              onValueChange={(value) => sel("user_id", parseInt(value))}
              options={users.map((u) => ({
                label: u.email,
                value: String(u.id)
              }))}
              placeholder="Sélectionner un commercial"
              disabled={isLoading || isSaving}
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
              disabled={isLoading || isSaving}
            />
            <QuantityInput
              label="Quantité assignée"
              value={form.quantity}
              onChange={(value) => sel("quantity", value || 1)}
              error={errors.quantity}
              placeholder="1"
              disabled={isLoading || isSaving}
              min={1}
            />
          </form>

          {assignmentValidation.length > 0 && (
            <ul className="mt-4 space-y-0.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2">
              {assignmentValidation.map((msg) => (
                <li key={msg} className="text-xs text-warning">
                  • {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
