import type { Product } from "./product";
import type { User } from "./user";

// ── Lots (en-tête d'achat) ──────────────────────────────────────────────────
export interface Lot {
  id: number;
  reference?: string;
  total_expense: number;
  received_at?: string;
  created_at?: string;
}

export interface CreateLotPayload {
  reference?: string;
  total_expense: number;
  received_at?: string;
}

export interface UpdateLotPayload {
  reference?: string;
  total_expense?: number;
}

export interface LotListResponse {
  items: Lot[];
  total: number;
}

// ── Stock ────────────────────────────────────────────────────────────────────
export interface Stock {
  id: number;
  product_id: number;
  quantity: number;
  reserved?: boolean;
  product?: Product | null;
}

export interface CreateStockPayload {
  product_id: number;
  quantity: number;
  reserved?: boolean;
}

export interface StockArrivalPayload {
  product_id: number;
  quantity: number;
  lot_id: number;
  reference?: string;
}

export interface UpdateStockPayload {
  product_id?: number;
  quantity?: number;
  reserved?: boolean;
}

export interface StockListResponse {
  items: Stock[];
  total: number;
}

// ── Stock Movements ──────────────────────────────────────────────────────────
export type MovementType = "in_stock" | "out_stock";

export interface StockMovement {
  id: number;
  product_id: number;
  user_id: number;
  lot_id?: number;
  type: MovementType;
  quantity: number;
  stock_before?: number;
  stock_after?: number;
  reference?: string;
  product?: Product | null;
  user?: User | null;
  created_at?: string;
}

export interface CreateStockMovementPayload {
  product_id: number;
  user_id: number;
  lot_id?: number;
  type: MovementType;
  quantity: number;
  stock_before?: number;
  stock_after?: number;
  reference?: string;
}

export interface UpdateStockMovementPayload {
  lot_id?: number;
  type?: MovementType;
  quantity?: number;
  stock_before?: number;
  stock_after?: number;
  reference?: string;
}

export interface StockMovementListResponse {
  items: StockMovement[];
  total: number;
}

// ── Orders ───────────────────────────────────────────────────────────────────
export type OrderStatus = "draft" | "confirmed" | "delivered" | "cancelled";

export interface Order {
  id: number;
  order_number?: string;
  user_id: number;
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  product_id: number;
  quantity?: number;
  status?: OrderStatus;
  note?: string;
  user?: User | null;
  product?: Product | null;
  created_at?: string;
}

export interface CreateOrderPayload {
  user_id: number;
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  product_id: number;
  quantity?: number;
  status?: OrderStatus;
  note?: string;
}

export interface UpdateOrderPayload {
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  product_id?: number;
  quantity?: number;
  status?: OrderStatus;
  note?: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
}

// ── Commercial Assignments ───────────────────────────────────────────────────
export interface CommercialAssignment {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  user?: User | null;
  product?: Product | null;
  created_at?: string;
}

export interface CreateAssignmentPayload {
  user_id: number;
  product_id: number;
  quantity: number;
}

export interface UpdateAssignmentPayload {
  user_id?: number;
  product_id?: number;
  quantity?: number;
}

export interface AssignmentListResponse {
  items: CommercialAssignment[];
  total: number;
}
