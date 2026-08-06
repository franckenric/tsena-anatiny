import { cn } from "../lib/utils";
import { Label } from "./ui/label";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";

export interface SelectOption {
  label: string;
  value: string;
  searchText?: string;
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
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  searchPlaceholder?: string;
  noResultsMessage?: string;
}

export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Sélectionner...",
  error,
  description,
  disabled,
  searchValue,
  onSearchValueChange,
  searchPlaceholder = "Rechercher...",
  noResultsMessage = "Aucun résultat"
}: SelectProps) {
  const normalizedQuery = (searchValue || "").trim().toLowerCase();
  const visibleOptions =
    typeof onSearchValueChange === "function" && normalizedQuery
      ? options.filter((option) => {
          const source = (option.searchText || option.label).toLowerCase();
          return source.includes(normalizedQuery);
        })
      : options;

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}

      <UiSelect value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn(error && "border-warning/60")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {typeof onSearchValueChange === "function" && (
            <div className="sticky top-0 z-10 border-b border-border/60 bg-popover p-2">
              <input
                value={searchValue || ""}
                onChange={(e) => onSearchValueChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/20"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {visibleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}

          {visibleOptions.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted">
              {noResultsMessage}
            </div>
          )}
        </SelectContent>
      </UiSelect>

      {description && <p className="text-xs text-muted">{description}</p>}
      {error && <p className="text-xs text-warning">{error}</p>}
    </div>
  );
}
