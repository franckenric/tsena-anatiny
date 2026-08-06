import { Label } from "./ui/label";
import { cn } from "../lib/utils";

interface QuantityInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  disabled?: boolean;
  error?: string;
  description?: string;
  placeholder?: string;
}

export function QuantityInput({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  disabled,
  error,
  description,
  placeholder
}: QuantityInputProps) {
  const safeValue = Number.isFinite(value) ? value : min;

  const decrement = () => {
    if (disabled) return;
    onChange(Math.max(min, safeValue - step));
  };

  const increment = () => {
    if (disabled) return;
    onChange(safeValue + step);
  };

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel/85 text-lg font-semibold text-ink transition hover:border-brand/45 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-warning/60"
          )}
          onClick={decrement}
          disabled={disabled || safeValue <= min}
          aria-label="Diminuer la quantité"
        >
          -
        </button>

        <input
          type="number"
          value={safeValue}
          min={min}
          step={step}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value, 10);
            if (Number.isNaN(next)) {
              onChange(min);
              return;
            }
            onChange(Math.max(min, next));
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-12 w-full rounded-xl border border-border bg-panel/85 px-3.5 text-center text-sm text-ink placeholder:text-muted/80 outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-warning/60"
          )}
        />

        <button
          type="button"
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel/85 text-lg font-semibold text-ink transition hover:border-brand/45 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-warning/60"
          )}
          onClick={increment}
          disabled={disabled}
          aria-label="Augmenter la quantité"
        >
          +
        </button>
      </div>

      {description && <p className="text-xs text-muted">{description}</p>}
      {error && <p className="text-xs text-warning">{error}</p>}
    </div>
  );
}
