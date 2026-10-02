import { apiFetch, buildApiUrl, setApiToken } from "./api";
import type {
  Customer,
  CreateCustomerPayload,
  CustomerListResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  VerifyOtpPayload,
  VerifyOtpResponse
} from "../types/customer";
import { normalizeEmail, normalizePhone } from "../lib/utils";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/$/,
  ""
);

async function queryCustomers(where: unknown): Promise<Customer | null> {
  const payload = await apiFetch<{ count: number; data?: Customer[] }>(
    // Slash final obligatoire: sans lui l'API repond 307 vers une URL absolue
    // et le navigateur supprime l'en-tete Authorization sur la redirection.
    `/customers/?limit=1&where=${encodeURIComponent(JSON.stringify(where))}`
  );
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items[0] ?? null;
}

export const customersService = {
  async findByPhone(phone: string): Promise<Customer | null> {
    return queryCustomers([
      { key: "phone", operator: "==", value: normalizePhone(phone) }
    ]);
  },

  async findByUserId(userId: number): Promise<Customer | null> {
    return queryCustomers([
      { key: "users_id", operator: "==", value: userId }
    ]);
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
      skipAuth: true,
      body: JSON.stringify(payload)
    });
  },

  async login(payload: LoginPayload): Promise<string> {
    const body = new URLSearchParams();
    body.set("username", normalizeEmail(payload.email));
    body.set("password", payload.password);
    body.set("grant_type", "password");

    const response = await fetch(buildApiUrl("/login/access-token"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ detail: "Erreur de connexion" }));
      throw new Error(err.detail || "Erreur de connexion");
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error("Réponse d'authentification invalide");
    }
    setApiToken(data.access_token);
    return data.access_token;
  },

  async findOrCreate(payload: CreateCustomerPayload): Promise<Customer> {
    const existing = await this.findByPhone(payload.phone);
    if (existing) return existing;
    return this.create(payload);
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
    return apiFetch<VerifyOtpResponse>("/otp/verify", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify(payload)
    });
  },

  async resendOtp(email: string): Promise<VerifyOtpResponse> {
    const response = await apiFetch<VerifyOtpResponse>("/otp/resend", {
      method: "POST",
      skipAuth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
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
