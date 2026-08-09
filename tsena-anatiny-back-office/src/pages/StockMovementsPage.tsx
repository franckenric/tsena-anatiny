import { useState, useEffect, useMemo } from "react";
import type {
  StockMovement,
  CreateStockMovementPayload,
  UpdateStockMovementPayload,
  MovementType,
  Lot
} from "../types/operations";
import type { Product } from "../types/product";
import type { User } from "../types/user";
import type { Column } from "../components/index";
import {
  stockMovementsService,
  lotsService
} from "../services/operations.service";
import { productsService } from "../services/products.service";
import { usersService } from "../services/users.service";
import {
  Layout,
  Card,
  Button,
  DataTable,
  Input,
  QuantityInput,
  Select
} from "../components/index";
import { Modal } from "../components/Modal";
import { Pencil, Trash2 } from "lucide-react";

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

function MovementForm({
  movement,
  products,
  users,
  lots,
  onSubmit,
  onCancel,
  isLoading
}: {
  movement?: StockMovement;
  products: Product[];
  users: User[];
  lots: Lot[];
  onSubmit: (
    p: CreateStockMovementPayload | UpdateStockMovementPayload
  ) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    product_id: movement?.product_id ?? (products[0]?.id || 0),
    user_id: movement?.user_id ?? (users[0]?.id || 0),
    lot_id: movement?.lot_id ?? 0,
    type: (movement?.type ?? "in_stock") as MovementType,
    quantity: movement?.quantity ?? 1,
    unit_cost: movement?.unit_cost ?? 0,
    another_price: movement?.another_price ?? 0,
    other_price_reason: movement?.other_price_reason ?? "",
    reference: movement?.reference ?? ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (form.another_price < 0) {
      setErrors({ another_price: "Other price invalide" });
      return;
    }
    if (
      form.type === "in_stock" &&
      form.another_price > 0 &&
      !form.other_price_reason.trim()
    ) {
      setErrors({
        other_price_reason: "Raison requise quand Other price est > 0"
      });
      return;
    }
    try {
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
      await onSubmit(payload);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  const sel = (field: string, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
      <div className="space-y-4 pb-4">
        {errors.submit && (
          <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        {/* Acteurs */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Acteurs
          </p>
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Type & Quantité */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Mouvement
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onValueChange={(value) => sel("type", value)}
              options={[
                { label: "Entrée", value: "in_stock" },
                { label: "Sortie", value: "out_stock" }
              ]}
              disabled={isLoading}
            />
            <QuantityInput
              label="Quantité"
              value={form.quantity}
              onChange={(value) => sel("quantity", value)}
              error={errors.quantity}
              placeholder="1"
              disabled={isLoading}
              min={0}
            />
          </div>
        </div>

        {/* Tarification (entrée uniquement) */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <p
            className={`text-xs font-semibold uppercase tracking-widest ${
              form.type !== "in_stock" ? "text-muted/40" : "text-muted"
            }`}
          >
            Tarification
          </p>
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
              disabled={isLoading || form.type !== "in_stock"}
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
                  other_price_reason: nextValue > 0 ? p.other_price_reason : ""
                }));
              }}
              error={errors.another_price}
              placeholder="0"
              disabled={isLoading || form.type !== "in_stock"}
            />
          </div>
          {form.type === "in_stock" && form.another_price > 0 && (
            <Input
              label="Other price reason"
              value={form.other_price_reason}
              onChange={(e) => sel("other_price_reason", e.target.value)}
              placeholder="Raison du coût additionnel"
              error={errors.other_price_reason}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Lot & Référence (entrée uniquement) */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <p
            className={`text-xs font-semibold uppercase tracking-widest ${
              form.type !== "in_stock" ? "text-muted/40" : "text-muted"
            }`}
          >
            Lot & Référence
          </p>
          <Select
            label="Lot"
            value={String(form.lot_id)}
            onValueChange={(value) => sel("lot_id", parseInt(value) || 0)}
            options={getLotOptions(lots)}
            disabled={isLoading || form.type !== "in_stock"}
            error={errors.lot_id}
          />
          <Input
            label="Référence (optionnel)"
            value={form.reference}
            onChange={(e) => sel("reference", e.target.value)}
            placeholder="BON-001"
            disabled={isLoading}
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
      </div>

      <div className="flex shrink-0 gap-3 border-t border-border/60 pt-4">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
          disabled={isLoading || movementValidation.length > 0}
        >
          {movement ? "Mettre à jour" : "Créer"}
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

export function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<StockMovement | null>(null);
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
    lotsService
      .getLots(1, 200)
      .then((r) => setLots(r.items))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const variantById = useMemo(() => {
    const map = new Map<number, NonNullable<Product["variants"]>[number]>();
    for (const p of products) {
      for (const v of p.variants ?? []) map.set(v.id, v);
    }
    return map;
  }, [products]);

  const getEffectiveVariantUnitCost = (variantId: number): number | null => {
    let current = variantById.get(variantId);
    while (current) {
      if (current.unit_cost != null) return Number(current.unit_cost);
      if (current.parent_id == null) break;
      current = variantById.get(current.parent_id);
    }
    return null;
  };

  type MovementRow = StockMovement & { stock_ids?: number[] };

  const displayMovements = useMemo(() => {
    const leafById = new Map<number, NonNullable<Product["variants"]>[number]>();
    for (const p of products) {
      const variants = p.variants ?? [];
      for (const v of variants) {
        if (!variants.some((c) => c.parent_id === v.id)) leafById.set(v.id, v);
      }
    }

    const aggregated = new Map<number, MovementRow>();
    const singles: MovementRow[] = [];

    for (const m of movements) {
      const variants = productById.get(m.product_id)?.variants ?? [];
      const hasLeaves = variants.some(
        (v) => !variants.some((c) => c.parent_id === v.id)
      );

      if (m.variant_id != null) {
        const leaf = leafById.get(m.variant_id);
        if (leaf) {
          const existing = aggregated.get(m.variant_id);
          if (existing) {
            existing.quantity =
              Number(existing.quantity || 0) + Number(m.quantity || 0);
            existing.another_price =
              Number(existing.another_price || 0) +
              Number(m.another_price || 0);
            existing.stock_ids = [
              ...(existing.stock_ids ?? []),
              m.id
            ];
          } else {
            aggregated.set(m.variant_id, {
              ...m,
              quantity: Number(m.quantity || 0),
              unit_cost: m.unit_cost ?? leaf.unit_cost ?? undefined,
              stock_ids: [m.id]
            });
          }
        }
        continue;
      }

      if (hasLeaves) continue;
      singles.push(m);
    }

    return [...singles, ...Array.from(aggregated.values())];
  }, [movements, products, productById]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const r = await stockMovementsService.getMovements(page, pageSize);
      setMovements(r.items);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (m: StockMovement) => {
    if (!confirm("Supprimer ce mouvement ?")) return;
    try {
      setIsFormLoading(true);
      await stockMovementsService.deleteMovement(m.id);
      setMovements((prev) => prev.filter((x) => x.id !== m.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateStockMovementPayload | UpdateStockMovementPayload
  ) => {
    try {
      setIsFormLoading(true);
      if (selected) {
        const u = await stockMovementsService.updateMovement(
          selected.id,
          payload as UpdateStockMovementPayload
        );
        setMovements((prev) => prev.map((x) => (x.id === selected.id ? u : x)));
      } else {
        const c = await stockMovementsService.createMovement(
          payload as CreateStockMovementPayload
        );
        setMovements((prev) => [c, ...prev]);
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

  const columns: Column<MovementRow>[] = [
    {
      header: "Stock ID",
      accessor: "id",
      width: "8%",
      render: (_, r) => {
        const ids = r.stock_ids?.length ? r.stock_ids : [r.id];
        return (
          <span className="text-muted">
            {ids.map((id) => `#${id}`).join(" ")}
          </span>
        );
      }
    },
    {
      header: "Produit",
      accessor: "product_id",
      render: (_, r) => (
        <div>
          <span>
            {r.product?.name ??
              products.find((p) => p.id === r.product_id)?.name ??
              `#${r.product_id}`}
          </span>
          {r.variant?.name && (
            <div className="text-xs font-medium text-brand">
              {r.variant.name}
              {r.variant.sku ? ` · ${r.variant.sku}` : ""}
            </div>
          )}
        </div>
      ),
      width: "25%"
    },
    {
      header: "Utilisateur",
      accessor: "user_id",
      render: (_, r) => r.user?.email ?? `#${r.user_id}`,
      width: "22%"
    },
    {
      header: "Type",
      accessor: "type",
      width: "13%",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${v === "in_stock" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
        >
          {v === "in_stock" ? "Entrée" : "Sortie"}
        </span>
      )
    },
    {
      header: "Quantité",
      accessor: "quantity",
      width: "10%",
      render: (v) => <span className="font-semibold">{v}</span>
    },
    {
      header: "Prix unitaire",
      accessor: "unit_cost",
      width: "12%",
      render: (v, r) => {
        const variantCost =
          r.variant_id != null
            ? getEffectiveVariantUnitCost(r.variant_id)
            : null;
        const value = variantCost ?? Number(v ?? 0);
        return value > 0 ? `${Number(value).toLocaleString("fr-FR")} Ar` : "-";
      }
    },
    {
      header: "Other",
      accessor: "another_price",
      width: "10%",
      render: (v) =>
        v != null ? `${Number(v).toLocaleString("fr-FR")} Ar` : "-"
    },
    {
      header: "Other reason",
      accessor: "other_price_reason",
      width: "14%",
      render: (v) => v || "-"
    },
    {
      header: "Lot",
      accessor: "lot_id",
      width: "10%",
      render: (v) => (v ? `#${v}` : "-")
    },
    {
      header: "Référence",
      accessor: "reference",
      render: (v) => v || "-",
      width: "15%"
    },
    {
      header: "Date création",
      accessor: "created_at",
      width: "13%",
      render: (v) => (v ? new Date(v).toLocaleString("fr-FR") : "-")
    }
  ];

  return (
    <Layout
      title="Mouvements de stock"
      subtitle="Historique des entrées et sorties"
    >
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Mouvements"
          description={`Total: ${total} mouvements`}
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
              + Nouveau mouvement
            </Button>
          }
        >
          <DataTable
            columns={columns}
            data={displayMovements}
            isLoading={isLoading}
            emptyMessage="Aucun mouvement"
            actions={(m) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(m);
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
                  onClick={() => handleDelete(m)}
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
              htmlFor="stock-movements-page-size"
            >
              Par page
            </label>
            <select
              id="stock-movements-page-size"
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
          title={selected ? "Modifier mouvement" : "Nouveau mouvement"}
        >
          <MovementForm
            movement={selected ?? undefined}
            products={products}
            users={users}
            lots={lots}
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
