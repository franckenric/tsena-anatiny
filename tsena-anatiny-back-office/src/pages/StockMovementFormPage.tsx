import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  Coins,
  Users as UsersIcon
} from "lucide-react";
import type {
  CreateStockMovementPayload,
  UpdateStockMovementPayload,
  MovementType,
  Lot
} from "../types/operations";
import type { Product } from "../types/product";
import type { User } from "../types/user";
import {
  lotsService,
  stockMovementsService
} from "../services/operations.service";
import { productsService } from "../services/products.service";
import { usersService } from "../services/users.service";
import {
  Input,
  QuantityInput,
  Select,
  Layout,
  FloatingActionButton
} from "../components/index";

const getLotDateLabel = (lot: Lot) => {
  const rawDate = lot.received_at ?? lot.created_at;
  if (!rawDate) return "Date inconnue";

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";

  return parsed.toLocaleDateString("fr-FR");
};

const getLotOptions = (lots: Lot[]) => [
  { label: "Sélectionner un lot", value: "0" },
  ...[...lots]
    .sort((a, b) => {
      const aTime = new Date(a.received_at ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.received_at ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    })
    .map((lot) => ({
      label: `#${lot.id} - ${getLotDateLabel(lot)} - ${lot.reference || "Sans référence"}`,
      value: String(lot.id)
    }))
];

export function StockMovementFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    product_id: 0,
    user_id: 0,
    lot_id: 0,
    type: "in_stock" as MovementType,
    quantity: 1,
    unit_cost: 0,
    another_price: 0,
    other_price_reason: "",
    reference: ""
  });

  useEffect(() => {
    void (async () => {
      try {
        const [productsRes, usersRes, lotsRes] = await Promise.all([
          productsService.getProducts(1, 500),
          usersService.getUsers(1, 200),
          lotsService.getLots(1, 200)
        ]);
        setProducts(productsRes.items);
        setUsers(usersRes.items);
        setLots(lotsRes.items);

        if (isEdit) {
          const movementsRes = await stockMovementsService.getMovements(1, 1000);
          const movement = movementsRes.items.find(
            (m) => m.id === Number(id)
          );
          if (movement) {
            setForm({
              product_id: movement.product_id ?? productsRes.items[0]?.id ?? 0,
              user_id: movement.user_id ?? usersRes.items[0]?.id ?? 0,
              lot_id: movement.lot_id ?? 0,
              type: (movement.type ?? "in_stock") as MovementType,
              quantity: movement.quantity ?? 1,
              unit_cost: movement.unit_cost ?? 0,
              another_price: movement.another_price ?? 0,
              other_price_reason: movement.other_price_reason ?? "",
              reference: movement.reference ?? ""
            });
          } else {
            setErrors({ submit: "Mouvement introuvable" });
          }
        } else {
          setForm((p) => ({
            ...p,
            product_id: productsRes.items[0]?.id || 0,
            user_id: usersRes.items[0]?.id || 0
          }));
        }
      } catch {
        setErrors({ submit: "Erreur chargement des données" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isEdit]);

  const movementValidation = (() => {
    const issues: string[] = [];
    if (!form.product_id) issues.push("Produit requis");
    if (form.quantity < 1) issues.push("Quantité invalide (min 1)");
    if (form.type === "in_stock" && !form.lot_id)
      issues.push("Lot requis pour une entrée");
    if (form.type === "in_stock" && form.unit_cost <= 0)
      issues.push("Prix unitaire requis pour une entrée");
    if (form.another_price < 0) issues.push("Other price invalide");
    if (
      form.type === "in_stock" &&
      form.another_price > 0 &&
      !form.other_price_reason.trim()
    )
      issues.push("Raison requise quand Other price est > 0");
    return issues;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!form.product_id) {
      setErrors({ product_id: "Produit requis" });
      return;
    }
    if (!form.quantity || form.quantity < 1) {
      setErrors({ quantity: "Quantité invalide" });
      return;
    }
    if (form.type === "in_stock" && !form.lot_id) {
      setErrors({ lot_id: "Lot requis pour une entrée" });
      return;
    }
    if (form.type === "in_stock" && (!form.unit_cost || form.unit_cost <= 0)) {
      setErrors({ unit_cost: "Prix unitaire requis pour une entrée" });
      return;
    }
    if (movementValidation.length > 0) {
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...form,
        unit_cost:
          form.type === "in_stock" && form.unit_cost > 0
            ? form.unit_cost
            : undefined,
        another_price:
          form.type === "in_stock" ? form.another_price : undefined,
        other_price_reason:
          form.type === "in_stock" && form.another_price > 0
            ? form.other_price_reason.trim() || undefined
            : undefined,
        lot_id:
          form.type === "in_stock" && form.lot_id ? form.lot_id : undefined
      };
      if (isEdit) {
        await stockMovementsService.updateMovement(
          Number(id),
          payload as UpdateStockMovementPayload
        );
      } else {
        await stockMovementsService.createMovement(
          payload as CreateStockMovementPayload
        );
      }
      history.push("/stock-movements");
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  const sel = (field: string, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const sectionHeader = (
    icon: React.ReactNode,
    title: string,
    dimmed = false
  ) => (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          dimmed ? "bg-muted/10 text-muted/40" : "bg-brand/10 text-brand"
        }`}
      >
        {icon}
      </div>
      <p
        className={`text-xs font-bold uppercase tracking-widest ${
          dimmed ? "text-muted/40" : "text-ink"
        }`}
      >
        {title}
      </p>
    </div>
  );

  return (
    <Layout title={isEdit ? "Modifier le mouvement" : "Nouveau mouvement"}>
      <FloatingActionButton
        label="Enregistrer"
        formId="movement-form"
        disabled={isSaving || isLoading}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <button
            type="button"
            onClick={() => history.push("/stock-movements")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </span>
            Retour aux mouvements
          </button>
        </div>

        {errors.submit && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        <button
          type="button"
          onClick={() => history.push("/stock-movements")}
          className="flex items-center gap-2 text-sm font-semibold text-brand sm:hidden"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Retour à la liste
        </button>

        <form
          id="movement-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-4">
            {sectionHeader(<UsersIcon className="h-4 w-4" />, "Acteurs")}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Produit"
                value={String(form.product_id)}
                onValueChange={(value) => sel("product_id", parseInt(value))}
                options={products.map((p) => ({
                  label: p.name,
                  value: String(p.id)
                }))}
                placeholder="Sélectionner un produit"
                disabled={isLoading || isSaving}
              />
              <Select
                label="Utilisateur"
                value={String(form.user_id)}
                onValueChange={(value) => sel("user_id", parseInt(value))}
                options={users.map((u) => ({
                  label: u.email,
                  value: String(u.id)
                }))}
                placeholder="Sélectionner un utilisateur"
                disabled={isLoading || isSaving}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-4">
            {sectionHeader(<ArrowLeftRight className="h-4 w-4" />, "Mouvement")}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Type"
                value={form.type}
                onValueChange={(value) => sel("type", value)}
                options={[
                  { label: "Entrée", value: "in_stock" },
                  { label: "Sortie", value: "out_stock" }
                ]}
                disabled={isLoading || isSaving}
              />
              <QuantityInput
                label="Quantité"
                value={form.quantity}
                onChange={(value) => sel("quantity", value)}
                error={errors.quantity}
                placeholder="1"
                disabled={isLoading || isSaving}
                min={0}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-4">
            {sectionHeader(
              <Coins className="h-4 w-4" />,
              "Tarification",
              form.type !== "in_stock"
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Prix unitaire (Ar)"
                type="number"
                value={form.unit_cost}
                onChange={(e) =>
                  sel("unit_cost", parseFloat(e.target.value) || 0)
                }
                error={errors.unit_cost}
                placeholder="0"
                disabled={isLoading || isSaving || form.type !== "in_stock"}
              />
              <Input
                label="Other price (Ar)"
                type="number"
                value={form.another_price}
                onChange={(e) => {
                  const nextValue = parseFloat(e.target.value) || 0;
                  setForm((p) => ({
                    ...p,
                    another_price: nextValue,
                    other_price_reason:
                      nextValue > 0 ? p.other_price_reason : ""
                  }));
                }}
                error={errors.another_price}
                placeholder="0"
                disabled={isLoading || isSaving || form.type !== "in_stock"}
              />
            </div>
            {form.type === "in_stock" && form.another_price > 0 && (
              <Input
                label="Other price reason"
                value={form.other_price_reason}
                onChange={(e) =>
                  sel("other_price_reason", e.target.value)
                }
                placeholder="Raison du coût additionnel"
                error={errors.other_price_reason}
                disabled={isLoading || isSaving}
              />
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-4">
            {sectionHeader(
              <Boxes className="h-4 w-4" />,
              "Lot & Référence",
              form.type !== "in_stock"
            )}
            <Select
              label="Lot"
              value={String(form.lot_id)}
              onValueChange={(value) => sel("lot_id", parseInt(value) || 0)}
              options={getLotOptions(lots)}
              disabled={isLoading || isSaving || form.type !== "in_stock"}
              error={errors.lot_id}
            />
            <Input
              label="Référence (optionnel)"
              value={form.reference}
              onChange={(e) => sel("reference", e.target.value)}
              placeholder="BON-001"
              disabled={isLoading || isSaving}
            />
          </div>

          {movementValidation.length > 0 && (
            <ul className="space-y-0.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2">
              {movementValidation.map((msg) => (
                <li key={msg} className="text-xs text-warning">
                  • {msg}
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>
    </Layout>
  );
}
