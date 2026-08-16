import { cn } from "../lib/utils";
import { useI18n } from "../contexts/I18nContext";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function QuantityInput({
  value,
  onChange,
  min = 0,
  max,
  disabled,
  className
}: QuantityInputProps) {
  const { t } = useI18n();
  const safeValue = Number.isFinite(value) ? value : min;

  const clamp = (next: number) => {
    let result = Number.isNaN(next) ? min : next;
    result = Math.max(min, result);
    if (max != null) result = Math.min(max, result);
    return result;
  };

  const update = (next: number) => onChange(clamp(next));

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-panel p-1",
        className
      )}
    >
      <button
        type="button"
        onClick={() => update(safeValue - 1)}
        disabled={disabled || safeValue <= min}
        aria-label={t("cart.decrease")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        value={safeValue}
        min={min}
        max={max}
        onChange={(e) => update(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="h-8 w-12 bg-transparent text-center text-sm font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => update(safeValue + 1)}
        disabled={disabled || (max != null && safeValue >= max)}
        aria-label={t("cart.increase")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
