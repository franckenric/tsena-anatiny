import { useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import type {
  StockMovement
} from "../types/operations";
import type { Product } from "../types/product";
import type { Column } from "../components/index";
import { stockMovementsService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import {
  Layout,
  Card,
  Button,
  DataTable,
  Pagination,
  FloatingActionButton
} from "../components/index";
import {
  ArrowLeftRight,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";

export function StockMovementsPage() {
  const history = useHistory();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    productsService
      .getProducts(1, 200)
      .then((r) => setProducts(r.items))
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
    >
      <FloatingActionButton
        label="Nouveau mouvement"
        onClick={() => history.push("/stock-movements/new")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
            Gestion des mouvements
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Mouvements"
          description={`Total: ${total} mouvements`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => history.push("/stock-movements/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau mouvement
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
            itemLabel="mouvements"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={displayMovements}
            isLoading={isLoading}
            emptyMessage="Aucun mouvement"
            gridCardRender={(m) => {
              const productName =
                m.product?.name ??
                products.find((p) => p.id === m.product_id)?.name ??
                `#${m.product_id}`;
              const variantCost =
                m.variant_id != null
                  ? getEffectiveVariantUnitCost(m.variant_id)
                  : null;
              const unitCost = variantCost ?? Number(m.unit_cost ?? 0);
              return (
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {productName}
                      </p>
                      {m.variant?.name && (
                        <p className="mt-0.5 truncate text-xs font-medium text-brand">
                          {m.variant.name}
                          {m.variant.sku ? ` · ${m.variant.sku}` : ""}
                        </p>
                      )}
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {m.user?.email ?? `#${m.user_id}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.type === "in_stock" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
                    >
                      {m.type === "in_stock" ? "Entrée" : "Sortie"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border/50 pt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Quantité
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {m.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Prix unitaire
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-brand">
                        {unitCost > 0
                          ? `${unitCost.toLocaleString("fr-FR")} Ar`
                          : "—"}
                      </p>
                    </div>
                    {m.lot_id ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Lot
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-ink">
                          #{m.lot_id}
                        </p>
                      </div>
                    ) : null}
                    <div className={m.lot_id ? "text-right" : ""}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Date
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {m.created_at
                          ? new Date(m.created_at).toLocaleString("fr-FR")
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }}
            actions={(m) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() =>
                    history.push(`/stock-movements/${m.id}/edit`)
                  }
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
      </div>
    </Layout>
  );
}
