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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/$/,
  ""
);

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
  },

  async facebookLogin(code: string, redirectUri: string): Promise<{ access_token: string; token_type: string }> {
    const response = await fetch(`${API_BASE_URL}/login/facebook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Erreur connexion Facebook" }));
      throw new Error(err.detail || "Erreur connexion Facebook");
    }
    return response.json();
  },

  async googleLogin(idToken: string): Promise<{ access_token: string; token_type: string }> {
    const response = await fetch(`${API_BASE_URL}/login/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Erreur connexion Google" }));
      throw new Error(err.detail || "Erreur connexion Google");
    }
    return response.json();
  }
};

export type { CustomerListResponse };
