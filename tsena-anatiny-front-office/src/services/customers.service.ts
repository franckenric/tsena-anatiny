import { apiFetch } from "./api";
import type {
  Customer,
  CreateCustomerPayload,
  CustomerListResponse
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

  async findOrCreate(payload: CreateCustomerPayload): Promise<Customer> {
    const existing = await this.findByPhone(payload.phone);
    if (existing) return existing;
    return this.create(payload);
  }
};

export type { CustomerListResponse };
