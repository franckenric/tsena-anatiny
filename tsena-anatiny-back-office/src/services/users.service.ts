import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UserListResponse
} from "../types/user";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const GET_CACHE_TTL_MS = 10000;

const usersGetCache = new Map<
  string,
  { expiresAt: number; payload: UserListResponse }
>();
const pendingUsersGet = new Map<string, Promise<UserListResponse>>();

const clearUsersCache = () => {
  usersGetCache.clear();
  pendingUsersGet.clear();
};

export const usersService = {
  async getUsers(page = 1, pageSize = 10): Promise<UserListResponse> {
    const token = this.getStoredToken() || "";
    const url = `${API_BASE_URL}/users/?offset=${(page - 1) * pageSize}&limit=${pageSize}`;
    const cacheKey = `${token}::${url}`;
    const now = Date.now();

    const cached = usersGetCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.payload;

    const pending = pendingUsersGet.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Non autorisé"
            : "Erreur lors du chargement des utilisateurs"
        );
      }

      const payload = await response.json();

      const normalized = {
        items: Array.isArray(payload?.data) ? payload.data : [],
        total: typeof payload?.count === "number" ? payload.count : 0,
        page,
        page_size: pageSize
      };

      usersGetCache.set(cacheKey, {
        payload: normalized,
        expiresAt: now + GET_CACHE_TTL_MS
      });

      return normalized;
    })();

    pendingUsersGet.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingUsersGet.delete(cacheKey);
    }
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

    clearUsersCache();

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

    clearUsersCache();

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

    clearUsersCache();
  },

  getStoredToken(): string | null {
    return localStorage.getItem("tsena.auth.token");
  }
};
