import { useState, useEffect } from "react";
import type {
  Lot,
  LotExpense,
  CreateLotExpensePayload,
  UpdateLotExpensePayload,
  CreateLotPayload,
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
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "../components/ui/popover";

function generateRef(date?: string): string {
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `ACHAT-${y}${m}${day}`;
}

const roundToNearestThousand = (value: number) =>
  Math.max(0, Math.round(value / 1000) * 1000);

function CreateLotForm({
  onSubmit,
  onCancel,
  isLoading
}: {
  onSubmit: (p: CreateLotPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    reference: generateRef(),
    received_at: today
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refManuallyEdited, setRefManuallyEdited] = useState(false);

  const handleDateChange = (val: string) => {
    setForm((p) => ({
      ...p,
      received_at: val,
      reference: refManuallyEdited ? p.reference : generateRef(val)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        reference: form.reference.trim(),
        received_at: form.received_at
          ? new Date(form.received_at).toISOString()
          : undefined
      });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
          {errors.submit}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-ink">
          Date d'arrivee
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              <span>
                {form.received_at
                  ? format(new Date(form.received_at), "PPP", { locale: fr })
                  : "Selectionner une date"}
              </span>
              <CalendarIcon className="h-4 w-4 text-muted" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Calendar
              className="w-full"
              mode="single"
              selected={
                form.received_at ? new Date(form.received_at) : undefined
              }
              onSelect={(date) => {
                if (!date) return;
                handleDateChange(format(date, "yyyy-MM-dd"));
              }}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Input
        label="Reference lot"
        value={form.reference}
        onChange={(e) => {
          setRefManuallyEdited(true);
          setForm((p) => ({ ...p, reference: e.target.value }));
        }}
        placeholder="ACHAT-20260608"
        disabled={isLoading}
        error={errors.reference}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          Creer le lot
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

function LotExpenseForm({
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
  const [form, setForm] = useState({
    name: expense?.name ?? "",
    description: expense?.description ?? "",
    amount: expense?.amount ?? 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Nom requis";
    if (form.amount < 0) nextErrors.amount = "Montant invalide";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (expense) {
        await onSubmit({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          amount: Number(form.amount) || 0
        });
      } else {
        await onSubmit({
          lot_id: lotId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          amount: Number(form.amount) || 0
        });
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
          {errors.submit}
        </div>
      )}

      <Input
        label="Nom depense"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        placeholder="Transport, manutention, taxe..."
        disabled={isLoading}
        error={errors.name}
      />

      <Input
        label="Description"
        value={form.description}
        onChange={(e) =>
          setForm((p) => ({ ...p, description: e.target.value }))
        }
        placeholder="Details de la depense"
        disabled={isLoading}
      />

      <Input
        label="Montant (Ar)"
        type="number"
        value={form.amount}
        onChange={(e) =>
          setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))
        }
        placeholder="0"
        disabled={isLoading}
        error={errors.amount}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          {expense ? "Mettre a jour" : "Ajouter depense"}
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

export function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotExpenses, setLotExpenses] = useState<LotExpense[]>([]);
  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>(
    []
  );
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateLot, setShowCreateLot] = useState(false);
  const [selectedLotForDetails, setSelectedLotForDetails] =
    useState<Lot | null>(null);
  const [lotDetailsTab, setLotDetailsTab] = useState<"products" | "expenses">(
    "products"
  );
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<LotExpense | null>(
    null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [lotsResp, movementsResp, ordersResp] = await Promise.all([
        lotsService.getLots(1, 200),
        stockMovementsService.getMovements(1, 5000),
        ordersService.getOrders(1, 5000)
      ]);
      setLots(lotsResp.items);
      setAllStockMovements(movementsResp.items);
      setAllOrders(ordersResp.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    productsService
      .getProducts(1, 200)
      .then((r) => setProducts(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedLotForDetails) {
      setLotExpenses([]);
      return;
    }

    lotExpensesService
      .getLotExpenses(selectedLotForDetails.id, 1, 500)
      .then((r) => setLotExpenses(r.items))
      .catch(() => setLotExpenses([]));
  }, [selectedLotForDetails]);

  const handleCreateLot = async (payload: CreateLotPayload) => {
    setIsFormLoading(true);
    try {
      await lotsService.createLot(payload);
      setShowCreateLot(false);
      await load();
    } finally {
      setIsFormLoading(false);
    }
  };

  const refreshLotData = async (lotId: number) => {
    const [lotsResp, expensesResp] = await Promise.all([
      lotsService.getLots(1, 200),
      lotExpensesService.getLotExpenses(lotId, 1, 500)
    ]);
    setLots(lotsResp.items);
    setLotExpenses(expensesResp.items);
    const updatedLot = lotsResp.items.find((lot) => lot.id === lotId) || null;
    setSelectedLotForDetails(updatedLot);
  };

  const handleSubmitExpense = async (
    payload: CreateLotExpensePayload | UpdateLotExpensePayload
  ) => {
    if (!selectedLotForDetails) return;
    setIsFormLoading(true);
    try {
      if (selectedExpense) {
        await lotExpensesService.updateLotExpense(selectedExpense.id, payload);
      } else {
        await lotExpensesService.createLotExpense(
          payload as CreateLotExpensePayload
        );
      }
      await refreshLotData(selectedLotForDetails.id);
      setShowExpenseForm(false);
      setSelectedExpense(null);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteExpense = async (expense: LotExpense) => {
    if (!selectedLotForDetails) return;
    if (!confirm(`Supprimer la depense « ${expense.name} » ?`)) return;
    setIsFormLoading(true);
    try {
      await lotExpensesService.deleteLotExpense(expense.id);
      await refreshLotData(selectedLotForDetails.id);
    } finally {
      setIsFormLoading(false);
    }
  };

  const lotsGroupedByDate = lots.reduce(
    (acc, lot) => {
      const d = lot.received_at ?? lot.created_at;
      if (!d) return acc;
      const date = new Date(d).toISOString().split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(lot);
      return acc;
    },
    {} as Record<string, Lot[]>
  );

  const getDaysInMonth = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) =>
    (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString("fr-FR", {
    month: "long",
    year: "numeric"
  });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const productById = products.reduce(
    (acc, product) => {
      acc[product.id] = product;
      return acc;
    },
    {} as Record<number, Product>
  );

  type LotProductRow = StockMovement & {
    line_total: number;
    current_stock: number;
    sold_quantity: number;
    selling_price: number;
    estimated_price_25: number;
    estimated_price_50: number;
    estimated_price_75: number;
    estimated_price_100: number;
    estimated_price_200: number;
    estimated_price_300: number;
    estimated_price_400: number;
    estimated_price_500: number;
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

        return (
          <div>
            <p className="font-semibold text-ink">{productName}</p>
            <p className="text-xs text-muted">{productSku}</p>
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
      render: (v) =>
        v != null ? `${Number(v).toLocaleString("fr-FR")} Ar` : "-"
    },
    {
      header: "Prix total",
      accessor: "line_total",
      width: "12%",
      render: (v) => `${Number(v || 0).toLocaleString("fr-FR")} Ar`
    },
    {
      header: "PV estime (25/50/75/100%)",
      accessor: "estimated_price_25",
      width: "18%",
      render: (_, row) => {
        if (!row.quantity || row.quantity <= 0) return "-";
        return (
          <div className="space-y-0.5 text-xs">
            <p>
              25%:{" "}
              {row.estimated_price_25.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
            <p>
              50%:{" "}
              {row.estimated_price_50.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
            <p>
              75%:{" "}
              {row.estimated_price_75.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
            <p>
              100%:{" "}
              {row.estimated_price_100.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
          </div>
        );
      }
    },
    {
      header: "PV estime (200/300/400/500%)",
      accessor: "estimated_price_200",
      width: "18%",
      render: (_, row) => {
        if (!row.quantity || row.quantity <= 0) return "-";
        return (
          <div className="space-y-0.5 text-xs">
            <p>
              200%:{" "}
              {row.estimated_price_200.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
            <p>
              300%:{" "}
              {row.estimated_price_300.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
            <p>
              400%:{" "}
              {row.estimated_price_400.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
            <p>
              500%:{" "}
              {row.estimated_price_500.toLocaleString("fr-FR", {
                maximumFractionDigits: 2
              })}{" "}
              Ar
            </p>
          </div>
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

  const getStockLinesForLot = (lotId: number) =>
    allStockMovements.filter(
      (sm) => sm.type === "in_stock" && sm.lot_id === lotId
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

  const getLotProductRows = (lotId: number): LotProductRow[] =>
    getStockLinesForLot(lotId).map((line, _idx, lines) => {
      const lineTotal =
        (line.quantity || 0) * Number(line.unit_cost || 0) +
        Number(line.another_price || 0);
      const currentStock =
        currentStockByProduct[line.product_id] ?? Number(line.stock_after || 0);
      const soldQuantity =
        soldQuantityByLotAndProduct[`${lotId}:${line.product_id}`] ??
        soldQuantityByProduct[line.product_id] ??
        0;
      const sellingStatsByLot =
        sellingPriceStatsByLotAndProduct[`${lotId}:${line.product_id}`];
      const sellingStatsByProduct =
        deliveredSellingStatsByProduct[line.product_id] ?? null;
      const sellingPrice = sellingStatsByLot
        ? roundToNearestThousand(
            sellingStatsByLot.total / sellingStatsByLot.quantity
          )
        : sellingStatsByProduct
          ? roundToNearestThousand(
              sellingStatsByProduct.total / sellingStatsByProduct.quantity
            )
          : 0;
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

      // Repartit les depenses additionnelles pour que le prix estime couvre bien la depense totale du lot.
      let allocatedExpenses = 0;
      if (totalExtraExpenses > 0) {
        if (totalPurchase > 0) {
          allocatedExpenses = (lineTotal / totalPurchase) * totalExtraExpenses;
        } else if (totalQuantity > 0) {
          allocatedExpenses =
            (Number(line.quantity || 0) / totalQuantity) * totalExtraExpenses;
        }
      }

      const effectiveLineTotal = lineTotal + allocatedExpenses;
      const unitCostWithExtra =
        (line.quantity || 0) > 0
          ? effectiveLineTotal / Number(line.quantity || 1)
          : 0;
      const estimatedPrice25 = roundToNearestThousand(unitCostWithExtra * 1.25);
      const estimatedPrice50 = roundToNearestThousand(unitCostWithExtra * 1.5);
      const estimatedPrice75 = roundToNearestThousand(unitCostWithExtra * 1.75);
      const estimatedPrice100 = roundToNearestThousand(unitCostWithExtra * 2);
      const estimatedPrice200 = roundToNearestThousand(unitCostWithExtra * 3);
      const estimatedPrice300 = roundToNearestThousand(unitCostWithExtra * 4);
      const estimatedPrice400 = roundToNearestThousand(unitCostWithExtra * 5);
      const estimatedPrice500 = roundToNearestThousand(unitCostWithExtra * 6);
      return {
        ...line,
        line_total: lineTotal,
        current_stock: currentStock,
        sold_quantity: soldQuantity,
        selling_price: sellingPrice,
        estimated_price_25: estimatedPrice25,
        estimated_price_50: estimatedPrice50,
        estimated_price_75: estimatedPrice75,
        estimated_price_100: estimatedPrice100,
        estimated_price_200: estimatedPrice200,
        estimated_price_300: estimatedPrice300,
        estimated_price_400: estimatedPrice400,
        estimated_price_500: estimatedPrice500
      };
    });

  const getLotSoldAmount = (lotId: number): number => {
    // Calculate: sum of all out_stock movements for this lot: Σ(quantité × unit_cost + another_price)
    return allStockMovements
      .filter((movement) => {
        return movement.type === "out_stock" && movement.lot_id === lotId;
      })
      .reduce((sum, movement) => {
        const quantity = Number(movement.quantity || 0);
        const unitCost = Number(movement.unit_cost || 0);
        const anotherPrice = Number(movement.another_price || 0);
        return sum + quantity * unitCost + anotherPrice;
      }, 0);
  };

  const getLotProfit = (lotId: number): number => {
    // Bénéfice = Total vendu - Total dépense
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

  return (
    <Layout title="Lots" subtitle="Gestion des lots d'achat et entrees stock">
      <div className="animate-fade-up flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        <Card
          title="Calendrier des lots"
          description="Cliquez sur une date pour ouvrir les details dans un modal"
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="min-h-0 flex-1 overflow-auto"
          headerAction={
            <Button variant="primary" onClick={() => setShowCreateLot(true)}>
              + Nouveau lot
            </Button>
          }
        >
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1
                    )
                  )
                }
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold text-ink capitalize">{monthName}</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1
                    )
                  )
                }
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                  <div
                    key={d}
                    className="flex h-11 items-center justify-center text-sm font-semibold text-muted"
                  >
                    {d}
                  </div>
                ))}

                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div
                        key={`e-${idx}`}
                        className="h-24 rounded-lg md:h-28"
                      />
                    );
                  }

                  const dateStr = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day
                  )
                    .toISOString()
                    .split("T")[0];
                  const dayLots = lotsGroupedByDate[dateStr] ?? [];
                  const totalExpense = dayLots.reduce(
                    (sum, l) => sum + (l.total_expense || 0),
                    0
                  );
                  const totalProfit = dayLots.reduce(
                    (sum, lot) => sum + getLotProfit(lot.id),
                    0
                  );

                  return (
                    <div
                      key={day}
                      className={`flex min-h-24 flex-col items-center justify-center rounded-xl border-2 px-2 py-2 transition md:min-h-28 ${
                        dayLots.length > 0
                          ? "border-warning/50 bg-panel"
                          : "border-border/40 bg-bg/30"
                      }`}
                    >
                      <span
                        className={`text-base font-bold ${
                          dayLots.length > 0 ? "text-ink" : "text-muted"
                        }`}
                      >
                        {day}
                      </span>
                      {dayLots.length > 0 && (
                        <>
                          <span className="text-xs font-semibold text-warning">
                            {dayLots.length} lot{dayLots.length > 1 ? "s" : ""}
                          </span>
                          <span className="text-xs leading-tight text-muted">
                            {totalExpense.toLocaleString("fr-FR", {
                              maximumFractionDigits: 0
                            })}{" "}
                            Ar
                          </span>
                          <span
                            className={`text-xs font-semibold leading-tight ${
                              totalProfit >= 0 ? "text-success" : "text-warning"
                            }`}
                          >
                            {totalProfit.toLocaleString("fr-FR", {
                              maximumFractionDigits: 0
                            })}{" "}
                            Ar
                          </span>
                          <div className="mt-1 flex w-full flex-wrap justify-center gap-1">
                            {dayLots.slice(0, 2).map((lot) => (
                              <button
                                key={lot.id}
                                type="button"
                                className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand/20"
                                onClick={() => {
                                  setSelectedLotForDetails(lot);
                                  setLotDetailsTab("products");
                                  setShowExpenseForm(false);
                                  setSelectedExpense(null);
                                }}
                                disabled={isLoading}
                              >
                                Lot #{lot.id}
                              </button>
                            ))}
                            {dayLots.length > 2 && (
                              <span className="text-[11px] font-semibold text-muted">
                                +{dayLots.length - 2} autres
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showCreateLot}
        onClose={() => setShowCreateLot(false)}
        title="Nouveau lot d'achat"
      >
        <CreateLotForm
          onSubmit={handleCreateLot}
          onCancel={() => setShowCreateLot(false)}
          isLoading={isFormLoading}
        />
      </Modal>

      <Modal
        isOpen={!!selectedLotForDetails}
        onClose={() => {
          setSelectedLotForDetails(null);
          setShowExpenseForm(false);
          setSelectedExpense(null);
          setLotDetailsTab("products");
        }}
        title={
          selectedLotForDetails
            ? `Lot #${selectedLotForDetails.id}${selectedLotForDetails.reference ? ` - ${selectedLotForDetails.reference}` : ""}`
            : "Detail lot"
        }
        contentClassName="w-[calc(100vw-4rem)] max-w-none h-[calc(100vh-4rem)]"
        bodyClassName="h-[calc(100vh-9rem)] max-h-[calc(100vh-9rem)]"
      >
        {selectedLotForDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-border/60 bg-bg/30 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Produits
                </p>
                <p className="mt-1 text-2xl font-bold text-ink">
                  {getLotProductRows(selectedLotForDetails.id).length}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-bg/30 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Total depense
                </p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {(
                    getLotProductRows(selectedLotForDetails.id).reduce(
                      (sum, row) => sum + row.line_total,
                      0
                    ) +
                    lotExpenses.reduce(
                      (sum, expense) => sum + Number(expense.amount || 0),
                      0
                    )
                  ).toLocaleString("fr-FR")}{" "}
                  Ar
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-bg/30 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Total achat
                </p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {getLotProductRows(selectedLotForDetails.id)
                    .reduce((sum, row) => sum + row.line_total, 0)
                    .toLocaleString("fr-FR")}{" "}
                  Ar
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-bg/30 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Total vendu
                </p>
                <p className="mt-1 text-xl font-bold text-success">
                  {getLotSoldAmount(selectedLotForDetails.id).toLocaleString(
                    "fr-FR"
                  )}{" "}
                  Ar
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-bg/30 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Benefice
                </p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    getLotProfit(selectedLotForDetails.id) >= 0
                      ? "text-success"
                      : "text-warning"
                  }`}
                >
                  {getLotProfit(selectedLotForDetails.id).toLocaleString(
                    "fr-FR"
                  )}{" "}
                  Ar
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-b border-border/40 pb-2">
              <Button
                size="sm"
                variant={lotDetailsTab === "products" ? "primary" : "secondary"}
                onClick={() => {
                  setLotDetailsTab("products");
                  setShowExpenseForm(false);
                  setSelectedExpense(null);
                }}
              >
                Produits
              </Button>
              <Button
                size="sm"
                variant={lotDetailsTab === "expenses" ? "primary" : "secondary"}
                onClick={() => {
                  setLotDetailsTab("expenses");
                }}
              >
                Depenses
              </Button>
            </div>

            {lotDetailsTab === "products" && (
              <div className="space-y-3">
                <DataTable
                  columns={stockLotColumns}
                  data={getLotProductRows(selectedLotForDetails.id)}
                  isLoading={false}
                  emptyMessage="Aucun mouvement entree dans ce lot"
                  tableMaxHeight="calc(100vh - 30rem)"
                />
              </div>
            )}

            {lotDetailsTab === "expenses" && (
              <Card
                title="Depenses du lot"
                description={`Somme depenses: ${lotExpenses
                  .reduce(
                    (sum, expense) => sum + Number(expense.amount || 0),
                    0
                  )
                  .toLocaleString("fr-FR")} Ar`}
              >
                <div className="mb-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setSelectedExpense(null);
                      setShowExpenseForm((v) => !v);
                    }}
                  >
                    {showExpenseForm && !selectedExpense
                      ? "Fermer formulaire"
                      : "+ Ajouter depense"}
                  </Button>
                </div>

                {showExpenseForm && (
                  <div className="mb-4 rounded-lg border border-border/50 bg-bg/20 p-4">
                    <LotExpenseForm
                      lotId={selectedLotForDetails.id}
                      expense={selectedExpense ?? undefined}
                      onSubmit={handleSubmitExpense}
                      onCancel={() => {
                        setShowExpenseForm(false);
                        setSelectedExpense(null);
                      }}
                      isLoading={isFormLoading}
                    />
                  </div>
                )}

                <DataTable
                  columns={lotExpenseColumns}
                  data={lotExpenses}
                  isLoading={false}
                  emptyMessage="Aucune depense enregistree"
                  tableMaxHeight="calc(100vh - 32rem)"
                  actions={(expense) => (
                    <>
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
                    </>
                  )}
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
