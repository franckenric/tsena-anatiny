import { apiFetch } from "./api";
import type {
  Customer,
  CreateCustomerPayload,
  CustomerListResponse,
  RegisterPayload,
  RegisterResponse,
  VerifyOtpPayload,
  VerifyOtpResponse
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
    return apiFetch<RegisterResponse>("/register/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async findOrCreate(payload: CreateCustomerPayload): Promise<Customer> {
    const existing = await this.findByPhone(payload.phone);
    if (existing) return existing;
    return this.create(payload);
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
    return apiFetch<VerifyOtpResponse>("/otp/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async resendOtp(phone: string): Promise<VerifyOtpResponse> {
    const response = await apiFetch<VerifyOtpResponse>("/otp/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    return response;
  }
};

export type { CustomerListResponse };
