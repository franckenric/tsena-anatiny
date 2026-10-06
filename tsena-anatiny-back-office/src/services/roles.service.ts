import type { RoleListResponse } from "../types/role";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

/**
 * L'application ne connait que deux roles : l'admin et le client. Le filtre
 * reflete la garde cote API (`users` endpoint) : un role commercial ou tout
 * autre role residuel ne doit jamais etre propose a la saisie.
 */
export const ALLOWED_ROLE_NAMES = ["super_admin", "client"] as const;

export const rolesService = {
  async getRoles(limit = 100): Promise<RoleListResponse> {
    const token = localStorage.getItem("tsena.auth.token");
    const response = await fetch(
      `${API_BASE_URL}/roles/?offset=0&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Non autorisé"
          : "Erreur lors du chargement des rôles"
      );
    }

    const payload = await response.json();
    const items = (Array.isArray(payload?.data) ? payload.data : []).filter(
      (role: { name?: string }) =>
        typeof role?.name === "string" &&
        (ALLOWED_ROLE_NAMES as readonly string[]).includes(role.name)
    );
    return {
      items,
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  }
};
