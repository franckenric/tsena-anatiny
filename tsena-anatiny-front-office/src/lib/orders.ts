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
          typeof line.product_name === "string" && line.product_name.trim()
            ? line.product_name
            : `Produit #${productId}`,
        variant_name:
          typeof line.variant_name === "string" && line.variant_name.trim()
            ? line.variant_name
            : undefined,
        quantity: Number(line.quantity || 0),
        unit_cost: Number(line.unit_cost || 0),
        another_price: Number(line.another_price || 0),
        other_price_reason:
          typeof line.other_price_reason === "string"
            ? line.other_price_reason
            : undefined
      };
    })
    .filter((line) => line.product_id > 0);
}

export function getOrderLineItems(order: Order): OrderLineItem[] {
  const movements = order.stock_movements ?? [];
  if (movements.length > 0) {
    return movements.map((m) => ({
      product_id: m.product_id ?? 0,
      variant_id: m.variant_id ?? null,
      product_name: m.product?.name ?? `Produit #${m.product_id ?? 0}`,
      variant_name: m.variant?.name,
      quantity: Number(m.quantity || 0),
      unit_cost: Number(m.unit_cost || 0),
      another_price: Number(m.another_price || 0),
      other_price_reason: m.other_price_reason
    }));
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
  return productsTotal + otherPrice;
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
