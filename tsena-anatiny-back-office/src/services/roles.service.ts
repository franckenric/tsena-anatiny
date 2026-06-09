import type { RoleListResponse } from "../types/role";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

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
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  }
};
