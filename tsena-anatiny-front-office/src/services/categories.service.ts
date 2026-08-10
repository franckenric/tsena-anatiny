import { apiFetch } from "./api";
import type { Category, CategoryListResponse } from "../types/product";

export const categoriesService = {
  async getCategories(): Promise<CategoryListResponse> {
    const payload = await apiFetch<{ count: number; data?: Category[] }>(
      `/categories/?limit=200`
    );
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  }
};
