import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "../lib/utils";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  description?: string;
  disabled?: boolean;
}

export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Sélectionner...",
  error,
  description,
  disabled
}: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-ink">{label}</label>
      )}

      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-xl border border-border bg-panel/85 px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 data-[placeholder]:text-muted/80 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-warning/60"
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="z-50 max-h-80 overflow-hidden rounded-xl border border-border bg-panel shadow-xl">
            <SelectPrimitive.ScrollUpButton className="flex h-8 items-center justify-center text-muted">
              <ChevronUp className="h-4 w-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex h-10 cursor-default select-none items-center rounded-lg pl-8 pr-3 text-sm text-ink outline-none data-[highlighted]:bg-brand/15 data-[highlighted]:text-ink"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex h-4 w-4 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-8 items-center justify-center text-muted">
              <ChevronDown className="h-4 w-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {description && <p className="text-xs text-muted">{description}</p>}
      {error && <p className="text-xs text-warning">{error}</p>}
    </div>
  );
}
