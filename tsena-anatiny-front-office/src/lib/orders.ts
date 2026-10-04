import type { CartItem } from "../types/operations";
import type { Order } from "../types/operations";

export interface OrderLineItem {
  product_id: number;
  variant_id: number | null;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_cost: number;
  another_price: number;
  other_price_reason?: string;
}

const PENDING_LINES_MARKER = "__pending_lines__";

export function parsePendingLines(
  note?: string | null
): Array<Record<string, unknown>> {
  if (!note) return [];
  const markerIdx = note.indexOf(PENDING_LINES_MARKER);
  if (markerIdx < 0) return [];
  try {
    const parsed = JSON.parse(note.slice(markerIdx + PENDING_LINES_MARKER.length));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Premier libelle non vide (apres trim), sinon `undefined`.
 *
 *  Indispensable : `??` ne rattrape que null/undefined, donc un nom de produit
 *  vide ("") passait au travers et affichait une ligne sans titre dans la
 *  carte produit. Le back-office utilisait deja `||`.
 */
function firstNonEmpty(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const candidate of candidates) {
    const trimmed = typeof candidate === "string" ? candidate.trim() : "";
    if (trimmed) return trimmed;
  }
  return undefined;
}

function toLineItems(
  source: Array<Record<string, unknown>>
): OrderLineItem[] {
  return source
    .map((line) => {
      const productId = Number(line.product_id || 0);
      const variantId =
        line.variant_id != null && line.variant_id !== ""
          ? Number(line.variant_id)
          : null;
      return {
        product_id: productId,
        variant_id: variantId,
        product_name:
          firstNonEmpty(line.product_name as string | undefined) ??
          `Produit #${productId}`,
        variant_name: firstNonEmpty(
          line.variant_name as string | undefined
        ),
        quantity: Number(line.quantity || 0),
        unit_cost: Number(line.unit_cost || 0),
        another_price: Number(line.another_price || 0),
        other_price_reason: firstNonEmpty(
          line.other_price_reason as string | undefined
        )
      };
    })
    .filter((line) => line.product_id > 0);
}

export function getOrderLineItems(order: Order): OrderLineItem[] {
  // Un mouvement sans product_id exploite (produit supprime, ligne corrompue)
  // : on l'ignore, sinon la carte affiche une ligne parasite "Produit #0".
  const movements = (order.stock_movements ?? []).filter(
    (movement) => Number(movement.product_id || 0) > 0
  );

  if (movements.length > 0) {
    // Un meme produit/variante peut etre reparti sur plusieurs mouvements :
    // on agrege comme le back-office pour que les deux bureaux affichent
    // exactement les memes lignes.
    const aggregated = new Map<string, OrderLineItem>();
    for (const movement of movements) {
      const productId = Number(movement.product_id || 0);
      const variantId = movement.variant_id ?? null;
      const key = `${productId}:${variantId ?? ""}`;
      const quantity = Number(movement.quantity || 0);
      const anotherPrice = Number(movement.another_price || 0);
      const existing = aggregated.get(key);
      if (!existing) {
        aggregated.set(key, {
          product_id: productId,
          variant_id: variantId,
          product_name:
            firstNonEmpty(movement.product?.name) ?? `Produit #${productId}`,
          variant_name: firstNonEmpty(movement.variant?.name),
          quantity,
          unit_cost: Number(movement.unit_cost || 0),
          another_price: anotherPrice,
          other_price_reason:
            firstNonEmpty(movement.other_price_reason) ?? undefined
        });
        continue;
      }
      existing.quantity += quantity;
      existing.another_price += anotherPrice;
      if (!existing.other_price_reason && movement.other_price_reason) {
        existing.other_price_reason = movement.other_price_reason;
      }
      if (!existing.unit_cost && movement.unit_cost) {
        existing.unit_cost = Number(movement.unit_cost || 0);
      }
    }
    return Array.from(aggregated.values());
  }

  return toLineItems(parsePendingLines(order.note));
}

export function getOrderLineItemsFromCart(
  cartItems: CartItem[]
): OrderLineItem[] {
  return cartItems.map((item) => {
    const productName = item.product?.name?.trim();
    const variantName = item.variant?.name?.trim();
    return {
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: productName || variantName || `Produit #${item.product_id}`,
      variant_name: variantName || undefined,
      quantity: Number(item.quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
      another_price: Number(item.another_price || 0),
      other_price_reason: item.other_price_reason
    };
  });
}

export function getOrderTotal(
  order: Order,
  items?: OrderLineItem[]
): number {
  const lines = items ?? getOrderLineItems(order);
  const productsTotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unit_cost,
    0
  );
  const movementOtherPrice = lines.reduce(
    (sum, line) => sum + line.another_price,
    0
  );
  const orderOtherPrice = Number(order.another_price || 0);
  const otherPrice =
    orderOtherPrice > 0 ? orderOtherPrice : movementOtherPrice;
  return Math.max(
    0,
    productsTotal + otherPrice - Number(order.discount || 0)
  );
}

export function getOrderOtherPriceReason(
  order: Order,
  items?: OrderLineItem[]
): string {
  const reason = (order.other_price_reason || "").trim();
  if (reason) return reason;
  const lines = items ?? getOrderLineItems(order);
  return lines.find((line) => (line.other_price_reason || "").trim())
    ?.other_price_reason ?? "";
}
