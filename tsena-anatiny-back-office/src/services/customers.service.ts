import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerListResponse
} from "../types/customer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const GET_CACHE_TTL_MS = 10000;

const getToken = () => localStorage.getItem("tsena.auth.token");

const customersGetCache = new Map<
  string,
  { expiresAt: number; payload: CustomerListResponse }
>();
const pendingCustomersGet = new Map<string, Promise<CustomerListResponse>>();

const clearCustomersCache = () => {
  customersGetCache.clear();
  pendingCustomersGet.clear();
};

export const customersService = {
  async getCustomers(page = 1, pageSize = 20): Promise<CustomerListResponse> {
    const skip = (page - 1) * pageSize;
    const token = getToken() || "";
    const url = `${API_BASE_URL}/customers/?offset=${skip}&limit=${pageSize}`;
    const cacheKey = `${token}::${url}`;
    const now = Date.now();

    const cached = customersGetCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.payload;
    }

    const pending = pendingCustomersGet.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Non autorisé"
            : "Erreur chargement des clients"
        );
      }

      const payload = await response.json();
      const normalized = {
        items: Array.isArray(payload?.data) ? payload.data : [],
        total: typeof payload?.count === "number" ? payload.count : 0
      };
      customersGetCache.set(cacheKey, {
        payload: normalized,
        expiresAt: now + GET_CACHE_TTL_MS
      });
      return normalized;
    })();

    pendingCustomersGet.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingCustomersGet.delete(cacheKey);
    }
  },

  async searchCustomersByPhone(
    phoneQuery: string,
    page = 1,
    pageSize = 20
  ): Promise<CustomerListResponse> {
    const skip = (page - 1) * pageSize;
    const token = getToken() || "";
    const where = JSON.stringify([
      {
        key: "phone",
        operator: "like",
        value: phoneQuery
      }
    ]);
    const url = `${API_BASE_URL}/customers/?offset=${skip}&limit=${pageSize}&where=${encodeURIComponent(where)}`;
    const cacheKey = `${token}::${url}`;
    const now = Date.now();

    const cached = customersGetCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.payload;
    }

    const pending = pendingCustomersGet.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401 ? "Non autorisé" : "Erreur recherche clients"
        );
      }

      const payload = await response.json();
      const normalized = {
        items: Array.isArray(payload?.data) ? payload.data : [],
        total: typeof payload?.count === "number" ? payload.count : 0
      };
      customersGetCache.set(cacheKey, {
        payload: normalized,
        expiresAt: now + GET_CACHE_TTL_MS
      });
      return normalized;
    })();

    pendingCustomersGet.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingCustomersGet.delete(cacheKey);
    }
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/customers/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur création client");
    }

    clearCustomersCache();
    return response.json();
  },

  async updateCustomer(
    id: number,
    payload: UpdateCustomerPayload
  ): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur mise à jour client");
    }

    clearCustomersCache();
    return response.json();
  },

  async deleteCustomer(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur suppression client");
    }

    clearCustomersCache();
  }
};
