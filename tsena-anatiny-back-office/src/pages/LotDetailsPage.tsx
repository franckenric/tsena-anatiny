import { useState, useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import type {
  Lot,
  LotExpense,
  CreateLotExpensePayload,
  UpdateLotExpensePayload,
  StockMovement,
  Order
} from "../types/operations";
import type { Product } from "../types/product";
import type { Column } from "../components/index";
import {
  lotsService,
  lotExpensesService,
  stockMovementsService,
  ordersService
} from "../services/operations.service";
import { productsService } from "../services/products.service";
import { Layout, Card, Button, DataTable, Input } from "../components/index";
import { Modal } from "../components/Modal";
import {
  ArrowLeft,
  Coins,
  Package,
  Pencil,
  Plus,
  ScanBarcode,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wallet
} from "lucide-react";
import { roundToNearestThousand } from "../lib/utils";
import { cn } from "../lib/utils";

type ProductVariantItem = NonNullable<Product["variants"]>[number];

type LotProductRow = StockMovement & {
  line_total: number;
  current_stock: number;
  sold_quantity: number;
  selling_price: number;
  base_unit_cost: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  delay,
  onClick
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone: "brand" | "success" | "warning" | "muted";
  delay?: string;
  onClick?: () => void;
}) {
  const tones: Record<typeof tone, string> = {
    brand: "bg-brand/15 text-brand ring-brand/20",
    success: "bg-success/15 text-success ring-success/20",
    warning: "bg-warning/15 text-warning ring-warning/20",
    muted: "bg-muted/10 text-muted ring-muted/20"
  };
  const inner = (
    <>
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1",
          tones[tone]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted sm:text-[11px]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-ink sm:text-base">
          {value}
        </p>
      </div>
    </>
  );
  const baseClass =
    "animate-fade-up flex items-center gap-3 rounded-2xl border border-border/60 bg-panel/70 p-3 shadow-[0_14px_28px_-22px_rgba(8,18,38,0.6)] sm:p-4";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          baseClass,
          "cursor-pointer text-left transition hover:border-brand/50 hover:bg-panel"
        )}
        style={{ animationDelay: delay }}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={baseClass} style={{ animationDelay: delay }}>
      {inner}
    </div>
  );
}

export function LotDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const lotId = Number(id);
  const history = useHistory();

  const [lot, setLot] = useState<Lot | null>(null);
  const [lotExpenses, setLotExpenses] = useState<LotExpense[]>([]);
  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>(
    []
  );
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<LotExpense | null>(
    null
  );
  const [estimatedMargin, setEstimatedMargin] = useState(25);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [lotsResp, movementsResp, ordersResp, productsResp, expensesResp] =
        await Promise.all([
          lotsService.getLots(1, 200),
          stockMovementsService.getMovements(1, 5000),
          ordersService.getOrders(1, 5000),
          productsService.getProducts(1, 200),
          lotExpensesService.getLotExpenses(lotId, 1, 500)
        ]);
      const found = lotsResp.items.find((l) => l.id === lotId) ?? null;
      if (!found) {
        setError("Lot introuvable");
      }
      setLot(found);
      setAllStockMovements(movementsResp.items);
      setAllOrders(ordersResp.items);
      setProducts(productsResp.items);
      setLotExpenses(expensesResp.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [lotId]);

  const handleSubmitExpense = async (
    payload: CreateLotExpensePayload | UpdateLotExpensePayload
  ) => {
    if (!lot) return;
    setIsFormLoading(true);
    try {
      if (selectedExpense) {
        await lotExpensesService.updateLotExpense(selectedExpense.id, payload);
      } else {
        await lotExpensesService.createLotExpense(
          payload as CreateLotExpensePayload
        );
      }
      const resp = await lotExpensesService.getLotExpenses(lot.id, 1, 500);
      setLotExpenses(resp.items);
      setShowExpenseForm(false);
      setSelectedExpense(null);
    } catch (err) {
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteExpense = async (expense: LotExpense) => {
    if (!confirm(`Supprimer la dépense « ${expense.name} » ?`)) return;
    setIsFormLoading(true);
    try {
      await lotExpensesService.deleteLotExpense(expense.id);
      const resp = await lotExpensesService.getLotExpenses(lotId, 1, 500);
      setLotExpenses(resp.items);
    } finally {
      setIsFormLoading(false);
    }
  };

  const productById = products.reduce(
    (acc, product) => {
      acc[product.id] = product;
      return acc;
    },
    {} as Record<number, Product>
  );

  const variantById = products.reduce(
    (acc, product) => {
      for (const v of product.variants ?? []) {
        acc[v.id] = v;
      }
      return acc;
    },
    {} as Record<number, ProductVariantItem>
  );

  const currentStockByVariant = products.reduce(
    (acc, product) => {
      for (const v of product.variants ?? []) {
        acc[v.id] = Number(v.quantity ?? 0);
      }
      return acc;
    },
    {} as Record<number, number>
  );

  const currentStockByProduct = products.reduce(
    (acc, product) => {
      acc[product.id] = (product.stock ?? []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
      return acc;
    },
    {} as Record<number, number>
  );

  const deliveredOrders = allOrders.filter(
    (order) => order.status === "delivered"
  );

  const soldQuantityByLotAndProduct = allStockMovements.reduce(
    (acc, movement) => {
      if (movement.type !== "out_stock") return acc;
      if (!movement.lot_id) return acc;
      const productId = movement.product_id;
      if (!productId) return acc;
      const key = `${movement.lot_id}:${productId}`;
      acc[key] = (acc[key] || 0) + Number(movement.quantity || 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const soldQuantityByProduct = deliveredOrders.reduce(
    (acc, order) => {
      const productId = order.product_id;
      if (!productId) return acc;
      acc[productId] = (acc[productId] || 0) + Number(order.quantity || 0);
      return acc;
    },
    {} as Record<number, number>
  );

  const soldQuantityByLotAndVariant = allStockMovements.reduce(
    (acc, movement) => {
      if (movement.type !== "out_stock") return acc;
      if (!movement.lot_id || !movement.variant_id) return acc;
      const key = `${movement.lot_id}:${movement.variant_id}`;
      acc[key] = (acc[key] || 0) + Number(movement.quantity || 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const soldQuantityByVariant = allStockMovements.reduce(
    (acc, movement) => {
      if (movement.type !== "out_stock") return acc;
      if (!movement.variant_id) return acc;
      acc[movement.variant_id] =
        (acc[movement.variant_id] || 0) + Number(movement.quantity || 0);
      return acc;
    },
    {} as Record<number, number>
  );

  const deliveredSellingStatsByProduct = deliveredOrders.reduce(
    (acc, order) => {
      const productId = order.product_id;
      if (!productId) return acc;

      const quantity = Number(order.quantity || 0);
      const unitCost = Number(order.unit_cost || 0);
      if (quantity <= 0 || unitCost <= 0) return acc;

      const prev = acc[productId] || { quantity: 0, total: 0 };
      acc[productId] = {
        quantity: prev.quantity + quantity,
        total: prev.total + quantity * unitCost
      };
      return acc;
    },
    {} as Record<number, { quantity: number; total: number }>
  );

  const sellingPriceStatsByLotAndProduct = allStockMovements.reduce(
    (acc, movement) => {
      if (movement.type !== "out_stock") return acc;
      if (!movement.lot_id) return acc;
      const productId = movement.product_id;
      if (!productId) return acc;

      const quantity = Number(movement.quantity || 0);
      const unitCost = Number(movement.unit_cost || 0);
      if (quantity <= 0 || unitCost <= 0) return acc;

      const key = `${movement.lot_id}:${productId}`;
      const prev = acc[key] || { quantity: 0, total: 0 };
      acc[key] = {
        quantity: prev.quantity + quantity,
        total: prev.total + quantity * unitCost
      };
      return acc;
    },
    {} as Record<string, { quantity: number; total: number }>
  );

  const effectiveVariantSellingPrice = (variantId: number): number | null => {
    let current = variantById[variantId];
    while (current) {
      if (current.selling_price) return Number(current.selling_price);
      if (current.parent_id == null) break;
      current = variantById[current.parent_id];
    }
    return null;
  };

  const effectiveVariantUnitCost = (variantId: number): number | null => {
    let current = variantById[variantId];
    while (current) {
      if (current.unit_cost != null) return Number(current.unit_cost);
      if (current.parent_id == null) break;
      current = variantById[current.parent_id];
    }
    return null;
  };

  const getStockLinesForLot = (lotId: number) =>
    allStockMovements.filter(
      (sm) => sm.type === "in_stock" && sm.lot_id === lotId
    );

  const getLotProductRows = (lotId: number): LotProductRow[] => {
    const lines = getStockLinesForLot(lotId);
    const totalPurchase = lines.reduce(
      (sum, item) =>
        sum +
        (Number(item.quantity || 0) * Number(item.unit_cost || 0) +
          Number(item.another_price || 0)),
      0
    );
    const totalQuantity = lines.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
    const totalExtraExpenses = lotExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const buildRow = (
      line: StockMovement,
      qty: number,
      unitCost: number,
      anotherPrice: number,
      variantId?: number | null
    ): LotProductRow => {
      const baseUnitCost =
        variantId != null
          ? (effectiveVariantUnitCost(variantId) ?? Number(unitCost || 0))
          : Number(unitCost || 0);
      const lineTotal = qty * baseUnitCost + anotherPrice;

      const currentStock = variantId
        ? (currentStockByVariant[variantId] ??
          Number(line.stock_after || 0))
        : (currentStockByProduct[line.product_id] ??
          Number(line.stock_after || 0));

      const soldQuantity = variantId
        ? (soldQuantityByLotAndVariant[`${lotId}:${variantId}`] ??
          soldQuantityByVariant[variantId] ??
          0)
        : (soldQuantityByLotAndProduct[`${lotId}:${line.product_id}`] ??
          soldQuantityByProduct[line.product_id] ??
          0);

      const sellingStatsByLot =
        sellingPriceStatsByLotAndProduct[`${lotId}:${line.product_id}`];
      const sellingStatsByProduct =
        deliveredSellingStatsByProduct[line.product_id] ?? null;
      const variantSellingPrice =
        variantId != null ? effectiveVariantSellingPrice(variantId) : null;
      const sellingPrice =
        variantSellingPrice ??
        (sellingStatsByLot
          ? roundToNearestThousand(
              sellingStatsByLot.total / sellingStatsByLot.quantity
            )
          : sellingStatsByProduct
            ? roundToNearestThousand(
                sellingStatsByProduct.total / sellingStatsByProduct.quantity
              )
            : 0);

      let allocatedExpenses = 0;
      if (totalExtraExpenses > 0) {
        if (totalPurchase > 0) {
          allocatedExpenses = (lineTotal / totalPurchase) * totalExtraExpenses;
        } else if (totalQuantity > 0) {
          allocatedExpenses = (qty / totalQuantity) * totalExtraExpenses;
        }
      }

      const effectiveLineTotal = lineTotal + allocatedExpenses;
      const unitCostWithExtra = qty > 0 ? effectiveLineTotal / qty : 0;

      return {
        ...line,
        quantity: qty,
        unit_cost: baseUnitCost,
        another_price: anotherPrice,
        variant_id: variantId ?? null,
        line_total: lineTotal,
        current_stock: currentStock,
        sold_quantity: soldQuantity,
        selling_price: sellingPrice,
        base_unit_cost: unitCostWithExtra
      };
    };

    const rows: LotProductRow[] = [];
    for (const line of lines) {
      const product = productById[line.product_id] ?? line.product;
      const productVariants = product?.variants ?? [];
      const leaves = productVariants.filter(
        (v) => !productVariants.some((child) => child.parent_id === v.id)
      );

      if (line.variant_id) {
        rows.push(
          buildRow(
            line,
            Number(line.quantity || 0),
            Number(line.unit_cost || 0),
            Number(line.another_price || 0),
            line.variant_id
          )
        );
      } else if (leaves.length > 0) {
        for (const leaf of leaves) {
          rows.push(
            buildRow(
              line,
              Number(leaf.quantity ?? 0),
              Number(line.unit_cost || 0),
              0,
              leaf.id
            )
          );
        }
      } else {
        rows.push(
          buildRow(
            line,
            Number(line.quantity || 0),
            Number(line.unit_cost || 0),
            Number(line.another_price || 0),
            null
          )
        );
      }
    }
    return rows;
  };

  const getLotSoldAmount = (lotId: number): number =>
    allStockMovements
      .filter(
        (movement) =>
          movement.type === "out_stock" && movement.lot_id === lotId
      )
      .reduce((sum, movement) => {
        const quantity = Number(movement.quantity || 0);
        const unitCost = Number(movement.unit_cost || 0);
        const anotherPrice = Number(movement.another_price || 0);
        return sum + quantity * unitCost + anotherPrice;
      }, 0);

  const getLotProfit = (lotId: number): number => {
    const totalVendu = getLotSoldAmount(lotId);
    const totalAchat = getLotProductRows(lotId).reduce(
      (sum, row) => sum + row.line_total,
      0
    );
    const totalDepenses = lotExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );
    const totalDepense = totalAchat + totalDepenses;
    return totalVendu - totalDepense;
  };

  const stockLotColumns: Column<LotProductRow>[] = [
    {
      header: "Produit",
      accessor: "product_id",
      width: "20%",
      render: (_, row) => {
        const fallbackProduct = productById[row.product_id];
        const productName =
          row.product?.name || fallbackProduct?.name || `#${row.product_id}`;
        const productSku = row.product?.sku || fallbackProduct?.sku || "-";
        const movementVariant =
          row.variant_id != null ? variantById[row.variant_id] : undefined;
        const variant = movementVariant ?? row.variant;
        const parent =
          movementVariant?.parent_id != null
            ? variantById[movementVariant.parent_id]
            : undefined;

        return (
          <div>
            <p className="font-semibold text-ink">{productName}</p>
            <p className="text-xs text-muted">{productSku}</p>
            {variant && (
              <p className="text-xs font-medium text-brand">
                {variant.name || `Variante #${variant.id}`}
                {parent?.name ? ` (${parent.name})` : ""}
                {variant.sku ? ` · ${variant.sku}` : ""}
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: "Qte",
      accessor: "quantity",
      width: "8%",
      render: (v) => <span className="font-semibold">{v}</span>
    },
    {
      header: "Prix vente",
      accessor: "selling_price",
      width: "12%",
      render: (v) =>
        v && Number(v) > 0 ? `${Number(v).toLocaleString("fr-FR")} Ar` : "-"
    },
    {
      header: "Prix unitaire",
      accessor: "unit_cost",
      width: "12%",
      render: (v, row) => {
        const variantUnitCost =
          row.variant_id != null
            ? effectiveVariantUnitCost(row.variant_id)
            : null;
        const value = variantUnitCost ?? Number(v ?? 0);
        return value > 0 ? `${Number(value).toLocaleString("fr-FR")} Ar` : "-";
      }
    },
    {
      header: "Prix total",
      accessor: "line_total",
      width: "12%",
      render: (v) => `${Number(v || 0).toLocaleString("fr-FR")} Ar`
    },
    {
      header: "PV estime",
      accessor: "base_unit_cost",
      width: "12%",
      render: (v, row) => {
        if (!row.quantity || row.quantity <= 0) return "-";
        const price = roundToNearestThousand(
          Number(v) * (1 + estimatedMargin / 100)
        );
        return (
          <span className="font-semibold text-brand">
            {price.toLocaleString("fr-FR")} Ar
          </span>
        );
      }
    },
    {
      header: "Another price",
      accessor: "another_price",
      width: "10%",
      render: (v) => `${Number(v || 0).toLocaleString("fr-FR")} Ar`
    },
    {
      header: "Stock avant",
      accessor: "stock_before",
      width: "10%",
      render: (v) => <span className="text-muted">{v ?? "-"}</span>
    },
    {
      header: "Stock actuel",
      accessor: "current_stock",
      width: "10%",
      render: (v) => (
        <span className="font-semibold text-success">{v ?? "-"}</span>
      )
    },
    {
      header: "Qte vendue",
      accessor: "sold_quantity",
      width: "10%",
      render: (v) => <span className="font-semibold text-brand">{v ?? 0}</span>
    },
    {
      header: "Date",
      accessor: "created_at",
      width: "12%",
      render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-")
    },
    {
      header: "Utilisateur",
      accessor: "user_id",
      width: "10%",
      render: (_, row) => row.user?.email?.split("@")[0] || `#${row.user_id}`
    }
  ];

  const lotExpenseColumns: Column<LotExpense>[] = [
    {
      header: "Nom",
      accessor: "name",
      width: "30%",
      render: (v) => <span className="font-semibold text-ink">{v}</span>
    },
    {
      header: "Description",
      accessor: "description",
      width: "40%",
      render: (v) => v || "-"
    },
    {
      header: "Montant",
      accessor: "amount",
      width: "20%",
      render: (v) => `${Number(v || 0).toLocaleString("fr-FR")} Ar`
    },
    {
      header: "Date",
      accessor: "created_at",
      width: "10%",
      render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-")
    }
  ];

  const formatAr = (value: number) => `${value.toLocaleString("fr-FR")} Ar`;

  const productRows = lot ? getLotProductRows(lot.id) : [];
  const totalPurchase = productRows.reduce((sum, row) => sum + row.line_total, 0);
  const totalExtraExpenses = lotExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );
  const totalVendu = lot ? getLotSoldAmount(lot.id) : 0;
  const profit = lot ? getLotProfit(lot.id) : 0;

  if (isLoading) {
    return (
      <Layout title={lot ? `Lot #${lot.id}` : "Détail du lot"}>
        <div className="animate-fade-up flex flex-col gap-6">
          <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
                <ScanBarcode className="h-4 w-4" />
              </span>
              Chargement du lot...
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-border/60 bg-panel/70"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl border border-border/60 bg-panel/70" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={lot ? `Lot #${lot.id}` : "Détail du lot"}>
      <div className="animate-fade-up flex flex-col gap-4">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <ScanBarcode className="h-4 w-4" />
            </span>
            Détail du lot
            {lot?.reference ? ` — ${lot.reference}` : ""}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => history.push("/lots")}
          className="w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux lots
        </Button>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
            {!lot && (
              <Button
                variant="secondary"
                onClick={() => history.push("/lots")}
                className="ml-3"
              >
                Retour aux lots
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Produits"
            value={String(productRows.length)}
            icon={Package}
            tone="brand"
          />
          <StatCard
            label="Total achat"
            value={formatAr(totalPurchase)}
            icon={Wallet}
            tone="muted"
            delay="0.03s"
          />
          <StatCard
            label="Total dépense"
            value={formatAr(totalExtraExpenses)}
            icon={Coins}
            tone="warning"
            delay="0.06s"
            onClick={() => setIsExpensesModalOpen(true)}
          />
          <StatCard
            label="Total vendu"
            value={formatAr(totalVendu)}
            icon={ShoppingBag}
            tone="success"
            delay="0.09s"
          />
          <StatCard
            label="Bénéfice"
            value={formatAr(profit)}
            icon={TrendingUp}
            tone={profit >= 0 ? "success" : "warning"}
            delay="0.12s"
          />
        </div>

        <Card
          title="Produits du lot"
          description={`${productRows.length} produit${productRows.length > 1 ? "s" : ""} · ${formatAr(totalPurchase)} d'achat`}
          hideHeaderOnMobile
          plainOnMobile
          headerAction={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand ring-1 ring-brand/20">
              <Package className="h-3.5 w-3.5" />
              {productRows.length} produit{productRows.length > 1 ? "s" : ""}
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-bg/30 px-4 py-3">
            <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
              PV estimé
            </p>
            <input
              type="range"
              min={25}
              max={500}
              step={25}
              value={estimatedMargin}
              onChange={(e) => setEstimatedMargin(Number(e.target.value))}
              className="min-w-40 flex-1 accent-brand"
            />
            <span className="shrink-0 text-xs font-semibold text-muted">
              500%
            </span>
            <span className="w-14 shrink-0 text-right text-sm font-bold text-brand">
              {estimatedMargin}%
            </span>
          </div>
          <DataTable
            columns={stockLotColumns}
            data={productRows}
            isLoading={false}
            emptyMessage="Aucun mouvement entrée dans ce lot"
            getRowKey={(row) =>
              row.variant_id
                ? `${row.id}-v${row.variant_id}`
                : `${row.id}-p${row.product_id}`
            }
            tableMaxHeight="calc(100vh - 24rem)"
            gridCardRender={(row) => {
              const fallbackProduct = productById[row.product_id];
              const productName =
                row.product?.name ||
                fallbackProduct?.name ||
                `#${row.product_id}`;
              const movementVariant =
                row.variant_id != null
                  ? variantById[row.variant_id]
                  : undefined;
              const variant = movementVariant ?? row.variant;
              const pvEstime =
                row.quantity && row.quantity > 0
                  ? roundToNearestThousand(
                      Number(row.base_unit_cost) * (1 + estimatedMargin / 100)
                    )
                  : null;
              return (
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {productName}
                      </p>
                      {variant?.name && (
                        <p className="mt-0.5 truncate text-xs font-medium text-brand">
                          {variant.name}
                          {variant.sku ? ` · ${variant.sku}` : ""}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                      {row.quantity} pcs
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border/50 pt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Prix total
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {formatAr(Number(row.line_total || 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        PV estimé
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-brand">
                        {pvEstime ? formatAr(pvEstime) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Stock actuel
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-success">
                        {row.current_stock ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Qte vendue
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-ink">
                        {row.sold_quantity ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </Card>

        <Modal
          isOpen={isExpensesModalOpen}
          onClose={() => {
            setIsExpensesModalOpen(false);
            setShowExpenseForm(false);
            setSelectedExpense(null);
          }}
          title="Dépenses du lot"
          contentClassName="max-w-2xl"
        >
          {showExpenseForm && lot ? (
            <ExpenseForm
              lotId={lot.id}
              expense={selectedExpense ?? undefined}
              onSubmit={handleSubmitExpense}
              onCancel={() => {
                setShowExpenseForm(false);
                setSelectedExpense(null);
              }}
              isLoading={isFormLoading}
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {lotExpenses.length} dépense
                  {lotExpenses.length > 1 ? "s" : ""} ·{" "}
                  {formatAr(totalExtraExpenses)} au total
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSelectedExpense(null);
                    setShowExpenseForm(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
              <DataTable
                columns={lotExpenseColumns}
                data={lotExpenses}
                isLoading={false}
                emptyMessage="Aucune dépense enregistrée"
                gridCardRender={(expense) => (
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {expense.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {expense.description || "—"}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                        {formatAr(Number(expense.amount || 0))}
                      </span>
                    </div>
                    {expense.created_at && (
                      <div className="mt-3 border-t border-border/50 pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Date
                        </p>
                        <p className="mt-0.5 text-sm text-ink">
                          {new Date(expense.created_at).toLocaleDateString(
                            "fr-FR"
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                actions={(expense) => (
                  <div className="flex w-full flex-wrap items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isFormLoading}
                      onClick={() => {
                        setSelectedExpense(expense);
                        setShowExpenseForm(true);
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
                      onClick={() => handleDeleteExpense(expense)}
                      title="Supprimer"
                      aria-label="Supprimer"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              />
            </>
          )}
        </Modal>
      </div>
    </Layout>
  );
}

function ExpenseForm({
  lotId,
  expense,
  onSubmit,
  onCancel,
  isLoading
}: {
  lotId: number;
  expense?: LotExpense;
  onSubmit: (
    payload: CreateLotExpensePayload | UpdateLotExpensePayload
  ) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(expense?.name ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense?.amount ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Nom requis";
    if (amount < 0) nextErrors.amount = "Montant invalide";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        amount: Number(amount) || 0
      };
      if (expense) {
        await onSubmit(payload);
      } else {
        await onSubmit({ lot_id: lotId, ...payload });
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
          {errors.submit}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Transport, manutention, taxe..."
          disabled={isLoading}
          error={errors.name}
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails de la dépense"
          disabled={isLoading}
        />
        <Input
          label="Montant (Ar)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          placeholder="0"
          disabled={isLoading}
          error={errors.amount}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          {expense ? "Mettre à jour" : "Ajouter"}
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
