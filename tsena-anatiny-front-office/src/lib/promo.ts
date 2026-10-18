const STORAGE_KEY = "fo.promo.code";

export type PromoDiscountType = "percent" | "fixed" | "free_shipping";

export interface AppliedPromo {
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  /** True quand ce code annule les frais de livraison de la zone choisie. */
  free_shipping?: boolean;
}

const DISCOUNT_TYPES: readonly string[] = ["percent", "fixed", "free_shipping"];

export function getAppliedPromo(): AppliedPromo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.code === "string" &&
      DISCOUNT_TYPES.includes(parsed.discount_type) &&
      typeof parsed.discount_value === "number"
    ) {
      return parsed as AppliedPromo;
    }
    return null;
  } catch {
    return null;
  }
}

export function setAppliedPromo(promo: AppliedPromo | null): void {
  try {
    if (promo) localStorage.setItem(STORAGE_KEY, JSON.stringify(promo));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
}

/**
 * Remise sur les produits. Un code « livraison offerte » ne retire rien du
 * panier : il vaut 0 ici, son effet se voit sur la ligne de livraison.
 */
export function computeDiscountAmount(
  promo: Pick<AppliedPromo, "discount_type" | "discount_value">,
  subtotal: number
): number {
  if (promo.discount_type === "free_shipping") return 0;
  const amount =
    promo.discount_type === "percent"
      ? (subtotal * promo.discount_value) / 100
      : promo.discount_value;
  return Math.max(0, Math.min(amount, subtotal));
}

/** Vrai si ce code doit annuler le tarif de la zone de livraison choisie. */
export function isFreeShippingPromo(
  promo: Pick<AppliedPromo, "discount_type"> | null | undefined
): boolean {
  return promo?.discount_type === "free_shipping";
}
