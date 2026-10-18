import type {
  DeliveryZone,
  DeliveryZoneListResponse,
  CreateDeliveryZonePayload,
  UpdateDeliveryZonePayload
} from "../types/delivery-zone";

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
    // Violations de contrainte pydantic (champ vide, tarif negatif...)
    if (Array.isArray(err.detail)) {
      message = err.detail
        .map((d: { msg?: string }) => d?.msg)
        .filter(Boolean)
        .join(" · ") || fallback;
    }
  } catch {
    // keep fallback
  }
  throw new Error(message);
}

export const deliveryZonesService = {
  async getDeliveryZones(page = 1, pageSize = 100): Promise<DeliveryZoneListResponse> {
    const skip = (page - 1) * pageSize;
    const response = await fetch(
      `${API_BASE_URL}/delivery_zones/?offset=${skip}&limit=${pageSize}`,
      { headers: headers() }
    );
    if (!response.ok) return parseError(response, "Erreur chargement zones");
    const payload = await response.json();
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  },

  async createDeliveryZone(payload: CreateDeliveryZonePayload): Promise<DeliveryZone> {
    const response = await fetch(`${API_BASE_URL}/delivery_zones/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ ...payload, name: payload.name.trim() })
    });
    if (!response.ok) return parseError(response, "Erreur création zone");
    return response.json();
  },

  async updateDeliveryZone(
    id: number,
    payload: UpdateDeliveryZonePayload
  ): Promise<DeliveryZone> {
    const response = await fetch(`${API_BASE_URL}/delivery_zones/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(
        payload.name !== undefined ? { ...payload, name: payload.name.trim() } : payload
      )
    });
    if (!response.ok) return parseError(response, "Erreur mise à jour zone");
    return response.json();
  },

  /**
   * Suppression logique : les commandes passees referencent la zone, le
   * serveur la conserve donc dans l'historique et la retire des options.
   */
  async deleteDeliveryZone(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/delivery_zones/${id}`, {
      method: "DELETE",
      headers: headers()
    });
    if (!response.ok) return parseError(response, "Erreur suppression zone");
  }
};
