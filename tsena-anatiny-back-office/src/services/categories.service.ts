import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryListResponse
} from "../types/product";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const getToken = () => localStorage.getItem("tsena.auth.token");

export const categoriesService = {
  async getCategories(page = 1, pageSize = 100): Promise<CategoryListResponse> {
    const skip = (page - 1) * pageSize;
    const response = await fetch(
      `${API_BASE_URL}/categories/?offset=${skip}&limit=${pageSize}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? "Non autorisé"
          : "Erreur chargement catégories"
      );
    const payload = await response.json();
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  },

  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erreur création catégorie");
    }
    return response.json();
  },

  async updateCategory(
    id: number,
    payload: UpdateCategoryPayload
  ): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erreur mise à jour catégorie");
    }
    return response.json();
  },

  async deleteCategory(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      }
    });
    if (!response.ok) throw new Error("Erreur suppression catégorie");
  }
};
