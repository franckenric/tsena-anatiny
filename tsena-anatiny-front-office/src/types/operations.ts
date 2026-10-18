export type OrderStatus = "draft" | "confirmed" | "delivered" | "cancelled";

export interface CartItem {
  id: number;
  customer_id: number;
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  created_at?: string;
  /** Stock disponible (variante effective ou stock produit), calcule cote client. */
  available_quantity?: number | null;
  product?: {
    id: number;
    name?: string;
    sku?: string;
    image?: string;
  } | null;
  variant?: {
    id: number;
    name?: string;
    sku?: string | null;
    image?: string;
  } | null;
}

export interface CreateCartItemPayload {
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_cost?: number;
}

export interface UpdateCartItemPayload {
  quantity?: number;
  unit_cost?: number;
}

export interface CartItemListResponse {
  items: CartItem[];
  total: number;
}

export interface CheckoutPayload {
  user_id: number;
  order_number?: string;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  status?: OrderStatus;
  note?: string;
  promo_code?: string;
  /** Zone de livraison choisie : le tarif est relu par l'API. */
  delivery_zone_id?: number;
}

export interface GuestCheckoutLine {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
}

/** Commande placee sans compte. Les prix sont recalcules par l'API. */
export interface GuestCheckoutPayload {
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  items: GuestCheckoutLine[];
  status?: OrderStatus;
  note?: string;
  delivery_zone_id?: number;
}

export interface OrderMovement {
  product_id?: number;
  variant_id?: number | null;
  quantity: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  product?: {
    id: number;
    name?: string;
    sku?: string;
    image?: string;
  } | null;
  variant?: {
    id: number;
    name?: string;
    sku?: string | null;
    image?: string | null;
  } | null;
}

export interface Order {
  id: number;
  order_number?: string;
  user_id?: number;
  customer_id: number;
  status?: OrderStatus;
  another_price?: number;
  other_price_reason?: string;
  promo_code?: string | null;
  discount?: number;
  /** Zone de livraison choisie et tarif retenu (annule par un code offert). */
  delivery_zone_id?: number | null;
  delivery_fee?: number;
  note?: string;
  created_at?: string;
  customer?: {
    id: number;
    name?: string;
    phone?: string;
    delivery_address?: string;
  } | null;
  stock_movements?: OrderMovement[];
}

export type PromoDiscountType = "percent" | "fixed" | "free_shipping";

export interface PromoCodeValidation {
  valid: boolean;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  discount_amount: number;
  /** True quand ce code annule les frais de livraison de la zone choisie. */
  free_shipping?: boolean;
  description?: string | null;
}

/** Zone de livraison proposee au checkout (endpoint public). */
export interface DeliveryZone {
  id: number;
  name: string;
  fee: number;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
}
