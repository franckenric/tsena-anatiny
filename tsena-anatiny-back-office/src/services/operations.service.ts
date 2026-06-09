import type {
  Lot,
  CreateLotPayload,
  UpdateLotPayload,
  LotListResponse,
  Stock,
  CreateStockPayload,
  StockArrivalPayload,
  UpdateStockPayload,
  StockListResponse,
  StockMovement,
  CreateStockMovementPayload,
  UpdateStockMovementPayload,
  StockMovementListResponse,
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

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`
});

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: headers(), ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur ${res.status}`);
  }
  return res.json();
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

// ── Orders ───────────────────────────────────────────────────────────────────
export const ordersService = {
  async getOrders(page = 1, size = 20): Promise<OrderListResponse> {
    const data = await apiFetch<any>(
      listUrl("/orders/", page, size, '["product","user"]')
    );
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
