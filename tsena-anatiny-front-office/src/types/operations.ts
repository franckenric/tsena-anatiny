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
  } | null;
  variant?: {
    id: number;
    name?: string;
    sku?: string | null;
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

export interface OrderListResponse {
  items: Order[];
  total: number;
}
