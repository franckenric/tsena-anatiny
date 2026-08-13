import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PaginationItem = number | "ellipsis";

export function getPaginationItems(
  current: number,
  total: number
): PaginationItem[] {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const candidates = [1, total, current - 1, current, current + 1];
  const sorted = [...new Set(candidates)]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  let prev = 0;
  for (const page of sorted) {
    if (page - prev > 1) items.push("ellipsis");
    items.push(page);
    prev = page;
  }
  return items;
}

export function roundToNearestThousand(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 500) return Math.round(value * 100) / 100;
  return Math.max(1000, Math.round(value / 1000) * 1000);
}

export interface LotCostLine {
  quantity: number;
  unit_cost: number;
  another_price: number;
}

export function computeEffectiveUnitCost(params: {
  lotLines: LotCostLine[];
  totalExpenses: number;
  totalQuantity: number;
  targetQuantity: number;
  targetUnitCost: number;
  targetAnotherPrice: number;
}): number {
  const totalPurchase = params.lotLines.reduce(
    (sum, line) =>
      sum +
      Number(line.quantity || 0) * Number(line.unit_cost || 0) +
      Number(line.another_price || 0),
    0
  );
  const lineTotal =
    Number(params.targetQuantity || 0) * Number(params.targetUnitCost || 0) +
    Number(params.targetAnotherPrice || 0);
  const totalExpenses = Number(params.totalExpenses || 0);
  let allocated = 0;
  if (totalExpenses > 0) {
    if (totalPurchase > 0) {
      allocated = (lineTotal / totalPurchase) * totalExpenses;
    } else if (params.totalQuantity > 0) {
      allocated =
        (Number(params.targetQuantity || 0) / params.totalQuantity) *
        totalExpenses;
    }
  }
  const effectiveLineTotal = lineTotal + allocated;
  return Number(params.targetQuantity || 0) > 0
    ? effectiveLineTotal / params.targetQuantity
    : 0;
}
