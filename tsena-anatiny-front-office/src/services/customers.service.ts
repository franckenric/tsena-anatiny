import { apiFetch, buildApiUrl } from "./api";
import type {
  Customer,
  CreateCustomerPayload,
  CustomerListResponse,
  RegisterPayload,
  RegisterResponse
} from "../types/customer";
import { normalizePhone } from "../lib/utils";

export const customersService = {
  async findByPhone(phone: string): Promise<Customer | null> {
    const where = JSON.stringify([
      { key: "phone", operator: "==", value: normalizePhone(phone) }
    ]);
    const payload = await apiFetch<{ count: number; data?: Customer[] }>(
      `/customers/?limit=1&where=${encodeURIComponent(where)}`
    );
    const items = Array.isArray(payload?.data) ? payload.data : [];
    return items[0] ?? null;
  },

  async create(payload: CreateCustomerPayload): Promise<Customer> {
    return apiFetch<Customer>("/customers/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const response = await fetch(buildApiUrl("/register/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let message = `Erreur HTTP ${response.status}`;
      try {
        const json = (await response.json()) as { detail?: unknown };
        if (typeof json.detail === "string") message = json.detail;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    return (await response.json()) as RegisterResponse;
  },

  async findOrCreate(payload: CreateCustomerPayload): Promise<Customer> {
    const existing = await this.findByPhone(payload.phone);
    if (existing) return existing;
    return this.create(payload);
  }
};

export type { CustomerListResponse };
