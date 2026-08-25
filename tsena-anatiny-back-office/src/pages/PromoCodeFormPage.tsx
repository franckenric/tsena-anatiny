import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type {
  CreatePromoCodePayload,
  UpdatePromoCodePayload,
  DiscountType
} from "../types/promo";
import { promoCodesService } from "../services/promo-codes.service";
import {
  Input,
  Select,
  Layout,
  FloatingActionButton
} from "../components/index";

function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function PromoCodeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percent" as DiscountType,
    discount_value: "",
    min_order_amount: "",
    max_uses: "",
    starts_at: "",
    expires_at: "",
    status: "active" as "active" | "inactive"
  });

  useEffect(() => {
    if (!isEdit) return;
    promoCodesService
      .getPromoCodes(1, 500)
      .then((r) => r.items.find((p) => p.id === Number(id)))
      .then((promo) => {
        if (!promo) {
          setErrors({ submit: "Code promo introuvable" });
          return;
        }
        setForm({
          code: promo.code ?? "",
          description: promo.description ?? "",
          discount_type: (promo.discount_type ?? "percent") as DiscountType,
          discount_value: String(promo.discount_value ?? ""),
          min_order_amount:
            promo.min_order_amount != null ? String(promo.min_order_amount) : "",
          max_uses: promo.max_uses != null ? String(promo.max_uses) : "",
          starts_at: toDatetimeLocal(promo.starts_at),
          expires_at: toDatetimeLocal(promo.expires_at),
          status: promo.status ?? "active"
        });
      })
      .catch(() => setErrors({ submit: "Erreur chargement" }))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.code.trim()) nextErrors.code = "Code requis";
    const value = Number(form.discount_value);
    if (!form.discount_value || Number.isNaN(value) || value <= 0) {
      nextErrors.discount_value = "Valeur de remise invalide";
    } else if (form.discount_type === "percent" && value > 100) {
      nextErrors.discount_value = "Un pourcentage ne peut pas dépasser 100";
    }
    if (
      form.starts_at &&
      form.expires_at &&
      new Date(form.starts_at) > new Date(form.expires_at)
    ) {
      nextErrors.expires_at = "La date de fin doit être après le début";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discount_type: form.discount_type,
        discount_value: value,
        min_order_amount: form.min_order_amount
          ? Number(form.min_order_amount)
          : undefined,
        max_uses: form.max_uses ? Number(form.max_uses) : undefined,
        starts_at: form.starts_at
          ? new Date(form.starts_at).toISOString()
          : undefined,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : undefined,
        status: form.status
      };
      if (isEdit) {
        await promoCodesService.updatePromoCode(
          Number(id),
          payload as UpdatePromoCodePayload
        );
      } else {
        await promoCodesService.createPromoCode(
          payload as CreatePromoCodePayload
        );
      }
      history.push("/promo-codes");
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur lors de l'envoi"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title={isEdit ? "Modifier le code promo" : "Nouveau code promo"}>
      <FloatingActionButton
        label="Enregistrer"
        formId="promo-form"
        disabled={isSaving || isLoading}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <button
            type="button"
            onClick={() => history.push("/promo-codes")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </span>
            Retour aux codes promo
          </button>
        </div>

        {errors.submit && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-panel p-4 sm:p-5">
          <button
            type="button"
            onClick={() => history.push("/promo-codes")}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand sm:hidden"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Retour à la liste
          </button>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg border border-border/40 bg-panel/50"
                />
              ))}
            </div>
          ) : (
            <form id="promo-form" onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Code"
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                }
                error={errors.code}
                placeholder="EX: BIENVENUE10"
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
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type de remise"
                  value={form.discount_type}
                  onValueChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      discount_type: value as DiscountType
                    }))
                  }
                  options={[
                    { value: "percent", label: "Pourcentage (%)" },
                    { value: "fixed", label: "Montant fixe (Ar)" }
                  ]}
                  disabled={isSaving}
                />
                <Input
                  label={
                    form.discount_type === "percent" ? "Remise (%)" : "Remise (Ar)"
                  }
                  type="number"
                  value={form.discount_value}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, discount_value: e.target.value }))
                  }
                  error={errors.discount_value}
                  placeholder={form.discount_type === "percent" ? "10" : "5000"}
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Montant minimum (Ar)"
                  type="number"
                  value={form.min_order_amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, min_order_amount: e.target.value }))
                  }
                  placeholder="0 = aucun"
                  disabled={isSaving}
                />
                <Input
                  label="Utilisations max"
                  type="number"
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, max_uses: e.target.value }))
                  }
                  placeholder="0 = illimité"
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Début"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, starts_at: e.target.value }))
                  }
                  disabled={isSaving}
                />
                <Input
                  label="Fin"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expires_at: e.target.value }))
                  }
                  error={errors.expires_at}
                  disabled={isSaving}
                />
              </div>
              <Select
                label="Statut"
                value={form.status}
                onValueChange={(value) =>
                  setForm((p) => ({
                    ...p,
                    status: value as "active" | "inactive"
                  }))
                }
                options={[
                  { value: "active", label: "Actif" },
                  { value: "inactive", label: "Inactif" }
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
