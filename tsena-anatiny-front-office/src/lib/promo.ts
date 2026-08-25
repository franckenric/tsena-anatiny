const STORAGE_KEY = "fo.promo.code";

export interface AppliedPromo {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
}

export function getAppliedPromo(): AppliedPromo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.code === "string" &&
      (parsed.discount_type === "percent" || parsed.discount_type === "fixed") &&
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

export function computeDiscountAmount(
  promo: Pick<AppliedPromo, "discount_type" | "discount_value">,
  subtotal: number
): number {
  const amount =
    promo.discount_type === "percent"
      ? (subtotal * promo.discount_value) / 100
      : promo.discount_value;
  return Math.max(0, Math.min(amount, subtotal));
}
