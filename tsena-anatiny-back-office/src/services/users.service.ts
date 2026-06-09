import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UserListResponse
} from "../types/user";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const usersService = {
  async getUsers(page = 1, pageSize = 10): Promise<UserListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/users/?offset=${(page - 1) * pageSize}&limit=${pageSize}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getStoredToken()}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Non autorisé"
          : "Erreur lors du chargement des utilisateurs"
      );
    }

    const payload = await response.json();

    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0,
      page,
      page_size: pageSize
    };
  },

  async getUserById(id: number): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getStoredToken()}`
      }
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération de l'utilisateur");
    }

    return response.json();
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getStoredToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Erreur lors de la création de l'utilisateur"
      );
    }

    return response.json();
  },

  async updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getStoredToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Erreur lors de la mise à jour de l'utilisateur"
      );
    }

    return response.json();
  },

  async deleteUser(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getStoredToken()}`
      }
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la suppression de l'utilisateur");
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem("tsena.auth.token");
  }
};
