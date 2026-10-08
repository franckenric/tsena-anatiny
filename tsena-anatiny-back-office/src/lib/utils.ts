import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Base de l'API, uniquement definie par l'env. Les images sont stockees en
// base sous forme de chemin relatif (/files/products/xxx.jpg) : seul ce
// fragment est conserve, l'origine est reconstruite ici au rendu.
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").trim();
const API_ORIGIN = (() => {
  if (!API_BASE.startsWith("http")) return "";
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "";
  }
})();

/**
 * Construit l'URL d'affichage d'une image produit.
 * - chemin relatif (/files/...) : preflixe par l'origine de l'env si elle est
 *   absolue, sinon rendu tel quel (meme origine, via le proxy /files).
 * - data:/blob: (previsualisations) : non modifies.
 * - URL absolue d'un autre service : non modifiee.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  const isAbsolute = /^https?:\/\//i.test(trimmed);
  // data: / blob: (previsualisations locales) : non modifies.
  if (!isAbsolute && !trimmed.startsWith("/")) return trimmed;

  let path = trimmed;
  if (isAbsolute) {
    try {
      const parsed = new URL(trimmed);
      path = `${parsed.pathname}${parsed.search}`;
      const isLocal =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      // URL absolue d'un autre service (CDN) : on la laisse telle quelle.
      if (!isLocal && !path.startsWith("/files/")) return trimmed;
    } catch {
      return trimmed;
    }
  }
  // Chemin stocke nu en base, seule l'env fournit l'origine.
  return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
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
