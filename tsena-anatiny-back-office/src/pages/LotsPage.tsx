import { useState, useEffect } from "react";
import type {
  Lot,
  CreateLotPayload,
  StockArrivalPayload,
  StockMovement
} from "../types/operations";
import type { Product } from "../types/product";
import type { Column } from "../components/index";
import {
  lotsService,
  stockService,
  stockMovementsService
} from "../services/operations.service";
import { productsService } from "../services/products.service";
import { Layout, Card, Button, DataTable, Input } from "../components/index";
import { Modal } from "../components/Modal";
import { ChevronLeft, ChevronRight } from "lucide-react";

function generateRef(date?: string): string {
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `ACHAT-${y}${m}${day}`;
}

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
    total_expense: "",
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
    const newErrors: Record<string, string> = {};
    if (!form.reference.trim()) newErrors.reference = "Reference obligatoire";
    const expense = Number(form.total_expense);
    if (form.total_expense === "" || Number.isNaN(expense) || expense < 0) {
      newErrors.total_expense = "Depense totale requise (>= 0)";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        reference: form.reference.trim(),
        total_expense: expense,
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
        <input
          type="date"
          value={form.received_at}
          onChange={(e) => handleDateChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
          disabled={isLoading}
        />
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

      <Input
        label="Depense totale du lot (Ar)"
        type="number"
        value={form.total_expense}
        onChange={(e) =>
          setForm((p) => ({ ...p, total_expense: e.target.value }))
        }
        placeholder="0"
        disabled={isLoading}
        error={errors.total_expense}
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

function AddProductToLotForm({
  lot,
  products,
  onSubmit,
  onCancel,
  isLoading
}: {
  lot: Lot;
  products: Product[];
  onSubmit: (p: StockArrivalPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    product_id: products[0]?.id || 0,
    quantity: 0,
    reference: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.product_id) newErrors.product_id = "Produit requis";
    if (!form.quantity || form.quantity <= 0) {
      newErrors.quantity = "Quantite doit etre > 0";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        product_id: form.product_id,
        quantity: form.quantity,
        lot_id: lot.id,
        reference: form.reference || undefined
      });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm text-ink">
        <span className="font-semibold">Lot #{lot.id}</span>
        {lot.reference && (
          <span className="ml-2 text-muted">- {lot.reference}</span>
        )}
        <div className="mt-1 font-bold text-brand">
          {lot.total_expense.toLocaleString("fr-FR")} Ar
        </div>
      </div>

      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
          {errors.submit}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-ink">Produit</label>
        <select
          value={form.product_id}
          onChange={(e) =>
            setForm((p) => ({ ...p, product_id: parseInt(e.target.value, 10) }))
          }
          className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
          disabled={isLoading}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
        {errors.product_id && (
          <p className="text-xs text-warning">{errors.product_id}</p>
        )}
      </div>

      <Input
        label="Quantite arrivee"
        type="number"
        value={form.quantity}
        onChange={(e) =>
          setForm((p) => ({
            ...p,
            quantity: parseInt(e.target.value, 10) || 0
          }))
        }
        placeholder="0"
        disabled={isLoading}
        error={errors.quantity}
      />

      <Input
        label="Reference (optionnel)"
        value={form.reference}
        onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
        placeholder="Note sur ce produit dans le lot"
        disabled={isLoading}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          Ajouter au lot
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
  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>(
    []
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateLot, setShowCreateLot] = useState(false);
  const [selectedLotForProducts, setSelectedLotForProducts] =
    useState<Lot | null>(null);
  const [selectedLotForDetails, setSelectedLotForDetails] =
    useState<Lot | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [lotsResp, movementsResp] = await Promise.all([
        lotsService.getLots(1, 200),
        stockMovementsService.getMovements(1, 500)
      ]);
      setLots(lotsResp.items);
      setAllStockMovements(movementsResp.items);
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

  const handleAddProduct = async (payload: StockArrivalPayload) => {
    setIsFormLoading(true);
    try {
      await stockService.registerArrival(payload);
      setSelectedLotForProducts(null);
      await load();
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

  const lotsForSelectedDate = selectedDate
    ? (lotsGroupedByDate[selectedDate] ?? [])
    : [];

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate).toLocaleString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "";

  const stockMovementsForDate = selectedDate
    ? allStockMovements.filter((sm) => {
        if (sm.type !== "in_stock" || !sm.lot_id) return false;
        return (
          new Date(sm.created_at || "").toISOString().split("T")[0] ===
          selectedDate
        );
      })
    : [];

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

  const stockLotColumns: Column<StockMovement>[] = [
    {
      header: "Produit",
      accessor: "product_id",
      width: "25%",
      render: (_, row) => row.product?.name || `#${row.product_id}`
    },
    {
      header: "SKU",
      accessor: "product_id",
      width: "15%",
      render: (_, row) => row.product?.sku || "-"
    },
    {
      header: "Qte",
      accessor: "quantity",
      width: "12%",
      render: (v) => <span className="font-semibold">{v}</span>
    },
    {
      header: "Date",
      accessor: "created_at",
      width: "18%",
      render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-")
    },
    {
      header: "Utilisateur",
      accessor: "user_id",
      width: "15%",
      render: (_, row) => row.user?.email?.split("@")[0] || `#${row.user_id}`
    }
  ];

  const getStockLinesForLot = (lotId: number) =>
    allStockMovements.filter(
      (sm) => sm.type === "in_stock" && sm.lot_id === lotId
    );

  return (
    <Layout title="Lots" subtitle="Gestion des lots d'achat et entrees stock">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setShowCreateLot(true)}>
            + Nouveau lot
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        <Card
          title="Calendrier des lots"
          description="Cliquez sur une date pour ouvrir les details dans un modal"
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

            <div className="w-full overflow-x-auto">
              <div className="grid min-w-[920px] grid-cols-7 gap-3">
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
                  const isSelected = selectedDate === dateStr;
                  const totalExpense = dayLots.reduce(
                    (sum, l) => sum + (l.total_expense || 0),
                    0
                  );

                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setSelectedDate(isSelected ? null : dateStr)
                      }
                      className={`flex min-h-24 flex-col items-center justify-center rounded-xl border-2 px-2 py-2 transition md:min-h-28 ${
                        isSelected
                          ? "border-brand bg-brand/10"
                          : dayLots.length > 0
                            ? "border-warning/50 bg-panel hover:border-brand/50"
                            : "border-border/40 bg-bg/30"
                      }`}
                      disabled={isLoading}
                    >
                      <span
                        className={`text-base font-bold ${
                          isSelected
                            ? "text-brand"
                            : dayLots.length > 0
                              ? "text-ink"
                              : "text-muted"
                        }`}
                      >
                        {day}
                      </span>
                      {dayLots.length > 0 && (
                        <>
                          <span
                            className={`text-xs font-semibold ${
                              isSelected ? "text-brand" : "text-warning"
                            }`}
                          >
                            {dayLots.length} lot{dayLots.length > 1 ? "s" : ""}
                          </span>
                          <span className="text-xs leading-tight text-muted">
                            {totalExpense.toLocaleString("fr-FR", {
                              maximumFractionDigits: 0
                            })}{" "}
                            Ar
                          </span>
                        </>
                      )}
                    </button>
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
        isOpen={!!selectedLotForProducts}
        onClose={() => setSelectedLotForProducts(null)}
        title="Ajouter un produit au lot"
      >
        {selectedLotForProducts && (
          <AddProductToLotForm
            lot={selectedLotForProducts}
            products={products}
            onSubmit={handleAddProduct}
            onCancel={() => setSelectedLotForProducts(null)}
            isLoading={isFormLoading}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!selectedLotForDetails}
        onClose={() => setSelectedLotForDetails(null)}
        title={
          selectedLotForDetails
            ? `Produits du lot #${selectedLotForDetails.id}${selectedLotForDetails.reference ? ` - ${selectedLotForDetails.reference}` : ""} (${getStockLinesForLot(selectedLotForDetails.id).length})`
            : "Produits du lot"
        }
      >
        {selectedLotForDetails && (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm text-ink">
              <div className="font-semibold">
                Depense totale:{" "}
                {selectedLotForDetails.total_expense.toLocaleString("fr-FR")} Ar
              </div>
              <div className="text-xs text-muted mt-1">
                {getStockLinesForLot(selectedLotForDetails.id).length} produit
                {getStockLinesForLot(selectedLotForDetails.id).length > 1
                  ? "s"
                  : ""}{" "}
                dans ce lot
              </div>
            </div>
            <DataTable
              columns={stockLotColumns}
              data={getStockLinesForLot(selectedLotForDetails.id)}
              isLoading={false}
              emptyMessage="Aucun mouvement entree dans ce lot"
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? `Lots du ${selectedDateLabel}` : "Details lots"}
      >
        {selectedDate && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-bg/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Nombre de lots</span>
                <span className="font-semibold">
                  {lotsForSelectedDate.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Quantite totale arrivee</span>
                <span className="font-semibold">
                  {stockMovementsForDate.reduce(
                    (sum, sm) => sum + sm.quantity,
                    0
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Nombre de mouvements entree</span>
                <span className="font-semibold text-brand">
                  {stockMovementsForDate.length}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-sm font-semibold text-ink">
                  Depense totale journee
                </span>
                <span className="font-bold text-brand">
                  {lotsForSelectedDate
                    .reduce((sum, l) => sum + l.total_expense, 0)
                    .toLocaleString("fr-FR")}{" "}
                  Ar
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {lotsForSelectedDate.map((lot) => {
                const lotLines = getStockLinesForLot(lot.id);
                return (
                  <div
                    key={lot.id}
                    className="rounded-xl border border-border/60 bg-bg/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold uppercase text-muted">
                            Lot #{lot.id}
                          </span>
                          {lot.reference && (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                              {lot.reference}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xl font-bold text-ink">
                          {lot.total_expense.toLocaleString("fr-FR")} Ar
                        </div>
                        <div className="mt-1 inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                          {lotLines.length} produit
                          {lotLines.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-border/40 pt-3 flex items-center justify-between gap-3">
                      <div className="text-xs text-muted">
                        Cliquez pour voir tous les produits de ce lot
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedLotForDetails(lot)}
                      >
                        Voir produits ({lotLines.length})
                      </Button>
                    </div>
                  </div>
                );
              })}
              {lotsForSelectedDate.length === 0 && (
                <p className="text-center text-sm text-muted py-4">
                  Aucun lot pour cette date
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
