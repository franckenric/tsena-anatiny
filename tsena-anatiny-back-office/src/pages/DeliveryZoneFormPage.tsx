import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type {
  CreateDeliveryZonePayload,
  UpdateDeliveryZonePayload
} from "../types/delivery-zone";
import { deliveryZonesService } from "../services/delivery-zones.service";
import { Input, Select, Layout, FloatingActionButton } from "../components/index";

export function DeliveryZoneFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    fee: "",
    position: "",
    is_active: true
  });

  useEffect(() => {
    if (!isEdit) return;
    deliveryZonesService
      .getDeliveryZones(1, 500)
      .then((r) => r.items.find((z) => z.id === Number(id)))
      .then((zone) => {
        if (!zone) {
          setErrors({ submit: "Zone introuvable" });
          return;
        }
        setForm({
          name: zone.name ?? "",
          fee: zone.fee != null ? String(zone.fee) : "",
          position: zone.position != null ? String(zone.position) : "0",
          is_active: zone.is_active ?? true
        });
      })
      .catch(() => setErrors({ submit: "Erreur chargement" }))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Nom requis";

    const fee = Number(form.fee);
    // Un tarif manquant vaut 0 (livraison gratuite), mais un negative serait
    // une remise : on le refuse.
    if (form.fee !== "" && (Number.isNaN(fee) || fee < 0)) {
      nextErrors.fee = "Tarif invalide (0 minimum)";
    }
    const position = Number(form.position || 0);
    if (Number.isNaN(position)) nextErrors.position = "Ordre invalide";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: form.name.trim(),
        fee: Number.isNaN(fee) ? 0 : fee,
        position: Number.isNaN(position) ? 0 : position,
        is_active: form.is_active
      };
      if (isEdit) {
        await deliveryZonesService.updateDeliveryZone(
          Number(id),
          payload as UpdateDeliveryZonePayload
        );
      } else {
        await deliveryZonesService.createDeliveryZone(
          payload as CreateDeliveryZonePayload
        );
      }
      history.push("/delivery-zones");
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur lors de l'envoi"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title={isEdit ? "Modifier la zone" : "Nouvelle zone de livraison"}>
      <FloatingActionButton
        label="Enregistrer"
        formId="zone-form"
        disabled={isSaving || isLoading}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <button
            type="button"
            onClick={() => history.push("/delivery-zones")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </span>
            Retour aux zones
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
            onClick={() => history.push("/delivery-zones")}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand sm:hidden"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Retour à la liste
          </button>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg border border-border/40 bg-panel/50"
                />
              ))}
            </div>
          ) : (
            <form id="zone-form" onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nom de la zone"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                error={errors.name}
                placeholder="Ex: Antananarivo Urbain, Ivato, Ambohipo…"
                disabled={isSaving}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tarif de livraison (Ar)"
                  type="number"
                  value={form.fee}
                  onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
                  error={errors.fee}
                  placeholder="0 = gratuit"
                  disabled={isSaving}
                />
                <Input
                  label="Ordre d'affichage"
                  type="number"
                  value={form.position}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, position: e.target.value }))
                  }
                  error={errors.position}
                  placeholder="0 = en premier"
                  disabled={isSaving}
                />
              </div>
              <Select
                label="Statut"
                value={form.is_active ? "active" : "inactive"}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, is_active: value === "active" }))
                }
                options={[
                  { value: "active", label: "Proposée au client" },
                  { value: "inactive", label: "Masquée du client" }
                ]}
                disabled={isSaving}
              />
              <p className="text-xs text-muted">
                Le tarif est relu par le serveur au moment de la commande : le
                client ne peut pas choisir lui-même un montant.
              </p>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
