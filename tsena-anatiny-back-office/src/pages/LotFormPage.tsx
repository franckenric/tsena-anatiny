import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowRight, Calendar as CalendarIcon, Package } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { CreateLotPayload, Lot } from "../types/operations";
import { lotsService } from "../services/operations.service";
import {
  Input,
  Layout,
  FloatingActionButton
} from "../components/index";
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

export function LotFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refManuallyEdited, setRefManuallyEdited] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState(() => ({
    reference: generateRef(),
    received_at: today
  }));

  useEffect(() => {
    if (!isEdit) return;
    lotsService
      .getLots(1, 500)
      .then((r) => r.items.find((l) => l.id === Number(id)))
      .then((lot) => {
        if (!lot) {
          setErrors({ submit: "Lot introuvable" });
          return;
        }
        const received = lot.received_at
          ? new Date(lot.received_at).toISOString().split("T")[0]
          : today;
        setForm({
          reference: lot.reference ?? generateRef(received),
          received_at: received
        });
        setRefManuallyEdited(true);
      })
      .catch(() => setErrors({ submit: "Erreur chargement" }))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

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
      setIsSaving(true);
      const payload: CreateLotPayload = {
        reference: form.reference.trim(),
        received_at: form.received_at
          ? new Date(form.received_at).toISOString()
          : undefined
      };
      if (isEdit) {
        await lotsService.updateLot(Number(id), payload);
      } else {
        await lotsService.createLot(payload);
      }
      history.push("/lots");
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title={isEdit ? "Modifier le lot" : "Nouveau lot d'achat"}>
      <FloatingActionButton
        label="Enregistrer"
        formId="lot-form"
        disabled={isSaving || isLoading}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <button
            type="button"
            onClick={() => history.push("/lots")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </span>
            Retour aux lots
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
            onClick={() => history.push("/lots")}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand sm:hidden"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Retour à la liste
          </button>

          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Package className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Informations du lot
            </p>
          </div>

          <form id="lot-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-ink">
                Date d'arrivée
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || isSaving}
                  >
                    <span>
                      {form.received_at
                        ? format(new Date(form.received_at), "PPP", {
                            locale: fr
                          })
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
              disabled={isLoading || isSaving}
              error={errors.reference}
            />
          </form>
        </div>
      </div>
    </Layout>
  );
}
