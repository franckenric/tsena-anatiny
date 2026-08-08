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
  total_expense?: number;
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

export interface LotExpense {
  id: number;
  lot_id: number;
  name: string;
  description?: string;
  amount: number;
  created_at?: string;
}

export interface CreateLotExpensePayload {
  lot_id: number;
  name: string;
  description?: string;
  amount: number;
}

export interface UpdateLotExpensePayload {
  name?: string;
  description?: string;
  amount?: number;
}

export interface LotExpenseListResponse {
  items: LotExpense[];
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
  unit_cost: number;
  another_price?: number;
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
  variant_id?: number | null;
  commande_id?: number;
  type: MovementType;
  quantity: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  total_cost?: number;
  stock_before?: number;
  stock_after?: number;
  reference?: string;
  product?: Product | null;
  variant?: {
    id: number;
    name?: string;
    sku?: string | null;
  } | null;
  user?: User | null;
  created_at?: string;
}

export interface CreateStockMovementPayload {
  product_id: number;
  user_id: number;
  lot_id?: number;
  variant_id?: number | null;
  commande_id?: number;
  type: MovementType;
  quantity: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  total_cost?: number;
  stock_before?: number;
  stock_after?: number;
  reference?: string;
}

export interface UpdateStockMovementPayload {
  lot_id?: number;
  variant_id?: number | null;
  commande_id?: number;
  type?: MovementType;
  quantity?: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  total_cost?: number;
  stock_before?: number;
  stock_after?: number;
  reference?: string;
}

export interface StockMovementListResponse {
  items: StockMovement[];
  total: number;
}

// ── Cart Items ───────────────────────────────────────────────────────────────
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
  variant?: {
    id: number;
    name?: string;
    sku?: string | null;
    quantity?: number;
    selling_price?: number | null;
  } | null;
}

export interface CreateCartItemPayload {
  customer_id?: number;
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
}

export interface UpdateCartItemPayload {
  quantity?: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
}

export interface CheckoutCartPayload {
  user_id: number;
  order_number?: string;
  customer_id?: number;
  another_price?: number;
  other_price_reason?: string;
  status?: OrderStatus;
  note?: string;
}

export interface CartItemListResponse {
  items: CartItem[];
  total: number;
}

// ── Orders ───────────────────────────────────────────────────────────────────
export type OrderStatus = "draft" | "confirmed" | "delivered" | "cancelled";

export interface OrderMovementPayload {
  product_id: number;
  quantity: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
}

export interface CustomerRef {
  id: number;
  name: string;
  phone: string;
  delivery_address?: string;
}

export interface Order {
  id: number;
  order_number?: string;
  user_id: number;
  customer_id: number;
  product_id?: number;
  quantity?: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  status?: OrderStatus;
  note?: string;
  user?: User | null;
  product?: Product | null;
  customer?: CustomerRef | null;
  stock_movements?: StockMovement[];
  created_at?: string;
}

export interface CreateOrderPayload {
  order_number?: string;
  user_id: number;
  customer_id: number;
  product_id?: number;
  quantity?: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  movement?: OrderMovementPayload;
  movements?: OrderMovementPayload[];
  status?: OrderStatus;
  note?: string;
}

export interface UpdateOrderPayload {
  customer_id?: number;
  product_id?: number;
  quantity?: number;
  unit_cost?: number;
  another_price?: number;
  other_price_reason?: string;
  movement?: OrderMovementPayload;
  movements?: OrderMovementPayload[];
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
