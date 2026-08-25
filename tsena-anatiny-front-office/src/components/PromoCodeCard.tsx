import { useState } from "react";
import { BadgePercent, Check, Ticket, X } from "lucide-react";
import { promoCodesService } from "../services/operations.service";
import {
  getAppliedPromo,
  setAppliedPromo,
  type AppliedPromo
} from "../lib/promo";
import { useI18n } from "../contexts/I18nContext";

export function PromoCodeCard() {
  const { t } = useI18n();
  const [applied, setApplied] = useState<AppliedPromo | null>(() =>
    getAppliedPromo()
  );
  const [code, setCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value || isChecking) return;
    setIsChecking(true);
    setError(null);
    try {
      const res = await promoCodesService.validate(value);
      const promo: AppliedPromo = {
        code: res.code,
        discount_type: res.discount_type,
        discount_value: res.discount_value
      };
      setAppliedPromo(promo);
      setApplied(promo);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setIsChecking(false);
    }
  };

  const handleRemove = () => {
    setAppliedPromo(null);
    setApplied(null);
    setError(null);
  };

  if (applied) {
    return (
      <section className="mx-4 mt-3 animate-fade-up sm:mx-6 lg:mx-auto lg:max-w-6xl">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <p className="min-w-0 truncate text-sm font-semibold text-ink">
              {t("promo.applied")}{" "}
              <span className="rounded-lg bg-success/15 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-success">
                {applied.code}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label={t("promo.remove")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-4 mt-3 animate-fade-up sm:mx-6 lg:mx-auto lg:max-w-6xl">
      <form
        onSubmit={handleApply}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-panel p-4 shadow-card sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <BadgePercent className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{t("promo.title")}</p>
            <p className="truncate text-xs text-muted">{t("promo.hint")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("promo.placeholder")}
              maxLength={32}
              className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 font-mono text-sm font-semibold uppercase tracking-wider text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button
            type="submit"
            disabled={!code.trim() || isChecking}
            className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? t("promo.checking") : t("promo.apply")}
          </button>
        </div>
      </form>
      {error && (
        <p className="mt-2 px-1 text-xs font-medium text-danger">{error}</p>
      )}
    </section>
  );
}
