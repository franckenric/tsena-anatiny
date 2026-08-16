import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import type { Lot, CreateLotPayload, StockMovement } from "../types/operations";
import { lotsService, stockMovementsService } from "../services/operations.service";
import { Layout, Card, Button, Input } from "../components/index";
import { Modal } from "../components/Modal";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  ScanBarcode
} from "lucide-react";
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

function CreateLotForm({
  onSubmit,
  onCancel,
  isLoading,
  initialLot
}: {
  onSubmit: (p: CreateLotPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  initialLot?: Lot | null;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState(() => {
    if (initialLot) {
      const received = initialLot.received_at
        ? new Date(initialLot.received_at).toISOString().split("T")[0]
        : today;
      return {
        reference: initialLot.reference ?? generateRef(received),
        received_at: received
      };
    }
    return { reference: generateRef(), received_at: today };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refManuallyEdited, setRefManuallyEdited] = useState(Boolean(initialLot));

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
          Date d'arrivée
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
                  : "Sélectionner une date"}
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
        label="Référence lot"
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
          {initialLot ? "Enregistrer" : "Créer le lot"}
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
  const history = useHistory();
  const [lots, setLots] = useState<Lot[]>([]);
  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotModal, setLotModal] = useState<
    { mode: "create" } | { mode: "edit"; lot: Lot } | null
  >(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [lotsResp, movementsResp] = await Promise.all([
        lotsService.getLots(1, 200),
        stockMovementsService.getMovements(1, 5000)
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
    void load();
  }, []);

  const handleSubmitLot = async (payload: CreateLotPayload) => {
    setIsFormLoading(true);
    try {
      if (lotModal?.mode === "edit") {
        await lotsService.updateLot(lotModal.lot.id, payload);
      } else {
        await lotsService.createLot(payload);
      }
      setLotModal(null);
      await load();
    } finally {
      setIsFormLoading(false);
    }
  };

  const openLotDetails = (lot: Lot) => {
    history.push(`/lots/${lot.id}`);
  };

  const getLotPurchaseAmount = (lotId: number): number =>
    allStockMovements
      .filter((m) => m.type === "in_stock" && m.lot_id === lotId)
      .reduce(
        (sum, m) =>
          sum +
          Number(m.quantity || 0) * Number(m.unit_cost || 0) +
          Number(m.another_price || 0),
        0
      );

  const getLotSoldAmount = (lotId: number): number =>
    allStockMovements
      .filter((m) => m.type === "out_stock" && m.lot_id === lotId)
      .reduce(
        (sum, m) =>
          sum +
          Number(m.quantity || 0) * Number(m.unit_cost || 0) +
          Number(m.another_price || 0),
        0
      );

  const getLotProfit = (lotId: number): number => {
    const lot = lots.find((l) => l.id === lotId);
    const totalDepense =
      getLotPurchaseAmount(lotId) + Number(lot?.total_expense || 0);
    return getLotSoldAmount(lotId) - totalDepense;
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

  const changeMonth = (delta: number) => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + delta
    );
    setCurrentMonth(newMonth);
    setSelectedDate(
      new Date(newMonth.getFullYear(), newMonth.getMonth(), 1)
        .toISOString()
        .split("T")[0]
    );
  };

  const selectedDayLots = lotsGroupedByDate[selectedDate] ?? [];
  const selectedDateLabel = new Date(selectedDate).toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long" }
  );

  return (
    <Layout title="Lots">
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <ScanBarcode className="h-4 w-4" />
            </span>
            Gestion des lots
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        <Card
          title="Calendrier des lots"
          description="Cliquez sur un lot pour ouvrir le détail"
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="min-h-0 flex-1 overflow-auto"
          headerAction={
            <Button
              size="sm"
              variant="primary"
              onClick={() => setLotModal({ mode: "create" })}
              aria-label="Nouveau lot"
            >
              <Plus className="h-4 w-4" />
            </Button>
          }
        >
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => changeMonth(-1)}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold text-ink capitalize">{monthName}</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => changeMonth(1)}
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
                        className="h-10 rounded-lg sm:h-24 md:h-28"
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
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDate(dateStr)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedDate(dateStr);
                        }
                      }}
                      className={`flex min-h-10 cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-1 py-1 transition sm:min-h-24 sm:px-2 sm:py-2 md:min-h-28 ${
                        dayLots.length > 0
                          ? "border-warning/50 bg-panel"
                          : "border-border/40 bg-bg/30"
                      } ${selectedDate === dateStr ? "ring-2 ring-brand/60" : ""}`}
                    >
                      <span
                        className={`text-sm font-bold sm:text-base ${
                          dayLots.length > 0 ? "text-ink" : "text-muted"
                        }`}
                      >
                        {day}
                      </span>
                      {dayLots.length > 0 && (
                        <>
                          <span className="mt-0.5 h-2 w-2 rounded-full bg-warning sm:hidden" />
                          <span className="hidden text-xs font-semibold text-warning sm:block">
                            {dayLots.length} lot{dayLots.length > 1 ? "s" : ""}
                          </span>
                          <span className="hidden text-xs leading-tight text-muted sm:block">
                            {totalExpense.toLocaleString("fr-FR", {
                              maximumFractionDigits: 0
                            })}{" "}
                            Ar
                          </span>
                          <span
                            className={`hidden text-xs font-semibold leading-tight sm:block ${
                              totalProfit >= 0
                                ? "text-success"
                                : "text-warning"
                            }`}
                          >
                            {totalProfit.toLocaleString("fr-FR", {
                              maximumFractionDigits: 0
                            })}{" "}
                            Ar
                          </span>
                          <div className="mt-1 hidden w-full flex-wrap justify-center gap-1 sm:flex">
                            {dayLots.slice(0, 2).map((lot) => (
                            <button
                              key={lot.id}
                              type="button"
                              className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLotDetails(lot);
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

              <div className="mt-4 space-y-2 sm:hidden">
                {selectedDayLots.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted">
                    Aucun lot à cette date
                  </p>
                ) : (
                  <div className="rounded-xl border border-border/50 bg-bg/30 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold capitalize text-ink">
                        {selectedDateLabel}
                      </span>
                      <span className="text-xs font-semibold text-warning">
                        {selectedDayLots.length} lot
                        {selectedDayLots.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selectedDayLots.map((lot) => (
                        <div
                          key={lot.id}
                          className="inline-flex items-center gap-0.5 rounded-full border border-brand/30 bg-brand/10 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-brand"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5"
                            onClick={() => openLotDetails(lot)}
                            disabled={isLoading}
                          >
                            <Package className="h-3 w-3" />
                            Lot #{lot.id}
                            {lot.reference ? ` · ${lot.reference}` : ""}
                          </button>
                          <button
                            type="button"
                            aria-label={`Modifier le lot #${lot.id}`}
                            onClick={() => setLotModal({ mode: "edit", lot })}
                            disabled={isLoading}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-brand transition hover:bg-brand/20"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={lotModal !== null}
        onClose={() => setLotModal(null)}
        title={
          lotModal?.mode === "edit"
            ? `Modifier le lot #${lotModal.lot.id}`
            : "Nouveau lot d'achat"
        }
        contentClassName="max-w-lg"
      >
        <CreateLotForm
          key={lotModal?.mode === "edit" ? `edit-${lotModal.lot.id}` : "create"}
          initialLot={lotModal?.mode === "edit" ? lotModal.lot : null}
          onSubmit={handleSubmitLot}
          onCancel={() => setLotModal(null)}
          isLoading={isFormLoading}
        />
      </Modal>
    </Layout>
  );
}
