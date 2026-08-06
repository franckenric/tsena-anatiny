import type {
  Lot,
  CreateLotPayload,
  UpdateLotPayload,
  LotListResponse,
  LotExpense,
  CreateLotExpensePayload,
  UpdateLotExpensePayload,
  LotExpenseListResponse,
  Stock,
  CreateStockPayload,
  StockArrivalPayload,
  UpdateStockPayload,
  StockListResponse,
  StockMovement,
  CreateStockMovementPayload,
  UpdateStockMovementPayload,
  StockMovementListResponse,
  CartItem,
  CreateCartItemPayload,
  UpdateCartItemPayload,
  CheckoutCartPayload,
  CartItemListResponse,
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderListResponse,
  CommercialAssignment,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
  AssignmentListResponse
} from "../types/operations";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const getToken = () => localStorage.getItem("tsena.auth.token");
const GET_CACHE_TTL_MS = 10000;

const operationsGetCache = new Map<
  string,
  { expiresAt: number; payload: unknown }
>();
const pendingOperationsGet = new Map<string, Promise<unknown>>();

const clearOperationsCache = () => {
  operationsGetCache.clear();
  pendingOperationsGet.clear();
};

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`
});

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const token = getToken() || "";

  if (method === "GET") {
    const cacheKey = `${token}::${url}`;
    const now = Date.now();
    const cached = operationsGetCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.payload as T;
    }

    const pending = pendingOperationsGet.get(cacheKey);
    if (pending) {
      return (await pending) as T;
    }

    const request = (async () => {
      const res = await fetch(url, { headers: headers(), ...init });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }
      const payload = await res.json();
      operationsGetCache.set(cacheKey, {
        payload,
        expiresAt: now + GET_CACHE_TTL_MS
      });
      return payload;
    })();

    pendingOperationsGet.set(cacheKey, request);
    try {
      return (await request) as T;
    } finally {
      pendingOperationsGet.delete(cacheKey);
    }
  }

  const res = await fetch(url, { headers: headers(), ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur ${res.status}`);
  }
  const payload = await res.json();
  clearOperationsCache();
  return payload;
}

function listUrl(path: string, page: number, size: number, relation?: string) {
  const skip = (page - 1) * size;
  let url = `${API_BASE_URL}${path}?offset=${skip}&limit=${size}`;
  if (relation) url += `&relation=${encodeURIComponent(relation)}`;
  return url;
}

function normalize<T>(payload: any): { items: T[]; total: number } {
  return {
    items: Array.isArray(payload?.data) ? payload.data : [],
    total: typeof payload?.count === "number" ? payload.count : 0
  };
}

// ── Lots ─────────────────────────────────────────────────────────────────────
export const lotsService = {
  async getLots(page = 1, size = 100): Promise<LotListResponse> {
    const data = await apiFetch<any>(listUrl("/lots/", page, size));
    return normalize<Lot>(data);
  },
  async createLot(payload: CreateLotPayload): Promise<Lot> {
    return apiFetch<Lot>(`${API_BASE_URL}/lots/`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateLot(id: number, payload: UpdateLotPayload): Promise<Lot> {
    return apiFetch<Lot>(`${API_BASE_URL}/lots/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  async deleteLot(id: number): Promise<void> {
    await apiFetch(`${API_BASE_URL}/lots/${id}`, { method: "DELETE" });
  }
};

export const lotExpensesService = {
  async getLotExpenses(
    lotId: number,
    page = 1,
    size = 200
  ): Promise<LotExpenseListResponse> {
    const where = encodeURIComponent(
      JSON.stringify([{ key: "lot_id", operator: "==", value: lotId }])
    );
    const skip = (page - 1) * size;
    const data = await apiFetch<any>(
      `${API_BASE_URL}/lot_expenses/?offset=${skip}&limit=${size}&where=${where}`
    );
    return normalize<LotExpense>(data);
  },
  async createLotExpense(
    payload: CreateLotExpensePayload
  ): Promise<LotExpense> {
    return apiFetch<LotExpense>(`${API_BASE_URL}/lot_expenses/`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateLotExpense(
    id: number,
    payload: UpdateLotExpensePayload
  ): Promise<LotExpense> {
    return apiFetch<LotExpense>(`${API_BASE_URL}/lot_expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  async deleteLotExpense(id: number): Promise<void> {
    await apiFetch(`${API_BASE_URL}/lot_expenses/${id}`, { method: "DELETE" });
  }
};

// ── Stock ────────────────────────────────────────────────────────────────────
export const stockService = {
  async getStock(page = 1, size = 20): Promise<StockListResponse> {
    const data = await apiFetch<any>(
      listUrl("/stock/", page, size, '["product"]')
    );
    return normalize<Stock>(data);
  },
  async createStock(payload: CreateStockPayload): Promise<Stock> {
    return apiFetch<Stock>(`${API_BASE_URL}/stock/`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async registerArrival(payload: StockArrivalPayload): Promise<Stock> {
    return apiFetch<Stock>(`${API_BASE_URL}/stock/arrivals`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateStock(id: number, payload: UpdateStockPayload): Promise<Stock> {
    return apiFetch<Stock>(`${API_BASE_URL}/stock/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  async deleteStock(id: number): Promise<void> {
    await apiFetch(`${API_BASE_URL}/stock/${id}`, { method: "DELETE" });
  }
};

// ── Stock Movements ──────────────────────────────────────────────────────────
export const stockMovementsService = {
  async getMovements(page = 1, size = 20): Promise<StockMovementListResponse> {
    const data = await apiFetch<any>(
      listUrl("/stock_movements/", page, size, '["product","user"]')
    );
    return normalize<StockMovement>(data);
  },
  async createMovement(
    payload: CreateStockMovementPayload
  ): Promise<StockMovement> {
    return apiFetch<StockMovement>(`${API_BASE_URL}/stock_movements/`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateMovement(
    id: number,
    payload: UpdateStockMovementPayload
  ): Promise<StockMovement> {
    return apiFetch<StockMovement>(`${API_BASE_URL}/stock_movements/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  async deleteMovement(id: number): Promise<void> {
    await apiFetch(`${API_BASE_URL}/stock_movements/${id}`, {
      method: "DELETE"
    });
  }
};

// ── Cart Items ───────────────────────────────────────────────────────────────
export const cartItemsService = {
  async getCartItems(
    customerId?: number,
    page = 1,
    size = 100
  ): Promise<CartItemListResponse> {
    const skip = (page - 1) * size;
    const customerQuery =
      customerId != null
        ? `&customer_id=${encodeURIComponent(String(customerId))}`
        : "";
    const data = await apiFetch<any>(
      `${API_BASE_URL}/cart_items/?offset=${skip}&limit=${size}${customerQuery}`
    );
    return normalize<CartItem>(data);
  },
  async createCartItem(payload: CreateCartItemPayload): Promise<CartItem> {
    return apiFetch<CartItem>(`${API_BASE_URL}/cart_items/`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateCartItem(
    id: number,
    payload: UpdateCartItemPayload
  ): Promise<CartItem> {
    return apiFetch<CartItem>(`${API_BASE_URL}/cart_items/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  async deleteCartItem(id: number): Promise<void> {
    await apiFetch(`${API_BASE_URL}/cart_items/${id}`, { method: "DELETE" });
  },
  async checkout(
    customerId: number,
    payload: CheckoutCartPayload
  ): Promise<Order> {
    return apiFetch<Order>(
      `${API_BASE_URL}/cart_items/checkout/${customerId}`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );
  }
};

// ── Orders ───────────────────────────────────────────────────────────────────
export const ordersService = {
  async getOrders(
    page = 1,
    size = 20,
    relation = '["customer{name,phone,delivery_address}","user{email}","stock_movements{product_id,quantity,unit_cost,another_price,other_price_reason,type}","stock_movements.product{name}"]'
  ): Promise<OrderListResponse> {
    const data = await apiFetch<any>(listUrl("/orders/", page, size, relation));
    return normalize<Order>(data);
  },
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return apiFetch<Order>(`${API_BASE_URL}/orders/`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateOrder(id: number, payload: UpdateOrderPayload): Promise<Order> {
    return apiFetch<Order>(`${API_BASE_URL}/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  async deleteOrder(id: number): Promise<void> {
    await apiFetch(`${API_BASE_URL}/orders/${id}`, { method: "DELETE" });
  }
};

// ── Commercial Assignments ───────────────────────────────────────────────────
export const assignmentsService = {
  async getAssignments(page = 1, size = 20): Promise<AssignmentListResponse> {
    const data = await apiFetch<any>(
      listUrl("/commercial_assignments/", page, size, '["product","user"]')
    );
    return normalize<CommercialAssignment>(data);
  },
  async createAssignment(
    payload: CreateAssignmentPayload
  ): Promise<CommercialAssignment> {
    return apiFetch<CommercialAssignment>(
      `${API_BASE_URL}/commercial_assignments/`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );
  },
  async updateAssignment(
    id: number,
    payload: UpdateAssignmentPayload
  ): Promise<CommercialAssignment> {
    return apiFetch<CommercialAssignment>(
      `${API_BASE_URL}/commercial_assignments/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload)
      }
    );
  },
  async deleteAssignment(id: number): Promise<void> {
    await apiFetch(`${API_BASE_URL}/commercial_assignments/${id}`, {
      method: "DELETE"
    });
  }
};
