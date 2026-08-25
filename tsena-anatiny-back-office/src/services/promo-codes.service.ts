import type {
  PromoCode,
  PromoCodeListResponse,
  CreatePromoCodePayload,
  UpdatePromoCodePayload
} from "../types/promo";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const getToken = () => localStorage.getItem("tsena.auth.token");

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`
});

async function parseError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const err = await response.json();
    if (typeof err.detail === "string") message = err.detail;
  } catch {
    // keep fallback
  }
  throw new Error(message);
}

export const promoCodesService = {
  async getPromoCodes(page = 1, pageSize = 100): Promise<PromoCodeListResponse> {
    const skip = (page - 1) * pageSize;
    const response = await fetch(
      `${API_BASE_URL}/promo_codes/?offset=${skip}&limit=${pageSize}`,
      { headers: headers() }
    );
    if (!response.ok) return parseError(response, "Erreur chargement codes promo");
    const payload = await response.json();
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  },

  async createPromoCode(payload: CreatePromoCodePayload): Promise<PromoCode> {
    const body = {
      ...payload,
      code: payload.code.trim().toUpperCase()
    };
    const response = await fetch(`${API_BASE_URL}/promo_codes/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body)
    });
    if (!response.ok) return parseError(response, "Erreur création code promo");
    return response.json();
  },

  async updatePromoCode(
    id: number,
    payload: UpdatePromoCodePayload
  ): Promise<PromoCode> {
    const response = await fetch(`${API_BASE_URL}/promo_codes/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) return parseError(response, "Erreur mise à jour code promo");
    return response.json();
  },

  async deletePromoCode(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/promo_codes/${id}`, {
      method: "DELETE",
      headers: headers()
    });
    if (!response.ok) return parseError(response, "Erreur suppression code promo");
  }
};
