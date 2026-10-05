/**
 * Panier d'un visiteur sans compte.
 *
 * Le panier des clients connectes vit en base (table `cart_items`, rattachee
 * a la fiche client). Un visiteur ne peut pas avoir de ligne en base : il
 * n'existe aucun `customer_id` avant la validation de la commande. Son panier
 * reste donc dans le navigateur, et part avec la commande a la validation.
 *
 * Les prix stockes ici servent uniquement a l'affichage : l'API les recalcule
 * depuis le catalogue au moment de la commande.
 */

import type { AppliedPromo } from "./promo";

const STORAGE_KEY = "fo.cart.guest";
const GUEST_PROMO_KEY = "fo.cart.guest.promo";

export interface GuestCartLine {
  /** Identifiant de la ligne en base, absent d'un panier local. */
  id?: number;
  product_id: number;
  product_name: string;
  variant_id: number | null;
  variant_name: string | null;
  quantity: number;
  unit_cost: number;
  image: string | null;
}

function read(): GuestCartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (line): line is GuestCartLine =>
            !!line && typeof line.product_id === "number" && line.quantity > 0
        )
      : [];
  } catch {
    return [];
  }
}

function write(lines: GuestCartLine[]): GuestCartLine[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Stockage indisponible (navigation privee) : le panier ne survivra pas au
    // rechargement, mais la commande reste possible dans la session.
  }
  return lines;
}

export function getGuestCart(): GuestCartLine[] {
  return read();
}

export function getGuestCartCount(): number {
  return read().reduce((sum, line) => sum + line.quantity, 0);
}

export function addToGuestCart(
  entry: Omit<GuestCartLine, "quantity"> & { quantity: number }
): GuestCartLine[] {
  if (entry.quantity <= 0) return read();

  const lines = read();
  const existing = lines.find(
    (line) =>
      line.product_id === entry.product_id &&
      (line.variant_id ?? null) === (entry.variant_id ?? null)
  );

  if (existing) {
    existing.quantity += entry.quantity;
    // Le catalogue fait foi pour l'affichage, comme pour la commande.
    existing.unit_cost = entry.unit_cost;
    existing.product_name = entry.product_name;
    existing.variant_name = entry.variant_name;
    existing.image = entry.image;
  } else {
    lines.push({ ...entry, variant_id: entry.variant_id ?? null });
  }

  return write(lines);
}

export function updateGuestCartQuantity(
  productId: number,
  variantId: number | null,
  quantity: number
): GuestCartLine[] {
  const lines = read();
  const index = lines.findIndex(
    (line) =>
      line.product_id === productId &&
      (line.variant_id ?? null) === (variantId ?? null)
  );
  if (index < 0) return lines;

  if (quantity <= 0) {
    lines.splice(index, 1);
    return write(lines);
  }

  lines[index].quantity = quantity;
  return write(lines);
}

export function removeFromGuestCart(
  productId: number,
  variantId: number | null
): GuestCartLine[] {
  return write(
    read().filter(
      (line) =>
        !(
          line.product_id === productId &&
          (line.variant_id ?? null) === (variantId ?? null)
        )
    )
  );
}

export function clearGuestCart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien a faire.
  }
}

/**
 * Code promo du visiteur sans compte, memorise sous sa forme complete
 * (type + valeur) pour que l'affichage du panier puisse calculer la remise
 * sans repasser par l'API.
 */
export function getGuestPromo(): AppliedPromo | null {
  try {
    const raw = localStorage.getItem(GUEST_PROMO_KEY);
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

export function setGuestPromo(promo: AppliedPromo | null): void {
  try {
    if (promo) localStorage.setItem(GUEST_PROMO_KEY, JSON.stringify(promo));
    else localStorage.removeItem(GUEST_PROMO_KEY);
  } catch {
    // Rien a faire.
  }
}

/** Copie le panier d'un invite dans le panier serveur d'un client qui se connecte. */
export async function mergeGuestCartIntoServer(
  send: (entry: {
    product_id: number;
    variant_id: number | null;
    quantity: number;
    unit_cost: number;
  }) => Promise<void>
): Promise<void> {
  const lines = read();
  if (lines.length === 0) return;

  for (const line of lines) {
    await send({
      product_id: line.product_id,
      variant_id: line.variant_id,
      quantity: line.quantity,
      unit_cost: line.unit_cost
    });
  }
  clearGuestCart();
}