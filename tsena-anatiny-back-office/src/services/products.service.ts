import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductListResponse,
  ProductImageUploadResponse
} from "../types/product";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const GET_CACHE_TTL_MS = 10000;

const getToken = () => localStorage.getItem("tsena.auth.token");

const productsGetCache = new Map<
  string,
  { expiresAt: number; payload: ProductListResponse }
>();
const pendingProductsGet = new Map<string, Promise<ProductListResponse>>();

const clearProductsCache = () => {
  productsGetCache.clear();
  pendingProductsGet.clear();
};

export const productsService = {
  async getProducts(
    page = 1,
    pageSize = 20,
    relation = '["categorie{id,name}","stock{quantity}","commercial_assignment{user_id}","commercial_assignment.user{full_name,email}"]'
  ): Promise<ProductListResponse> {
    const skip = (page - 1) * pageSize;
    const token = getToken() || "";
    const url = `${API_BASE_URL}/products/?offset=${skip}&limit=${pageSize}&relation=${encodeURIComponent(relation)}`;
    const cacheKey = `${token}::${url}`;
    const now = Date.now();

    const cached = productsGetCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.payload;

    const pending = pendingProductsGet.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Non autorisé"
            : "Erreur chargement produits"
        );
      const payload = await response.json();
      const normalized = {
        items: Array.isArray(payload?.data) ? payload.data : [],
        total: typeof payload?.count === "number" ? payload.count : 0
      };
      productsGetCache.set(cacheKey, {
        payload: normalized,
        expiresAt: now + GET_CACHE_TTL_MS
      });
      return normalized;
    })();

    pendingProductsGet.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingProductsGet.delete(cacheKey);
    }
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/products/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erreur création produit");
    }
    clearProductsCache();
    return response.json();
  },

  async updateProduct(
    id: number,
    payload: UpdateProductPayload
  ): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erreur mise à jour produit");
    }
    clearProductsCache();
    return response.json();
  },

  async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      }
    });
    if (!response.ok) throw new Error("Erreur suppression produit");
    clearProductsCache();
  },

  async uploadProductImage(file: File): Promise<ProductImageUploadResponse> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/products/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur upload image");
    }

    return response.json();
  }
};
