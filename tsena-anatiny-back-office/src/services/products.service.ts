import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductListResponse,
  ProductImageUploadResponse,
  ReceiptExtractionResult,
  ReceiptImportRequest,
  ProductVariantNode,
  ProductVariant,
  CreateVariantPayload,
  UpdateVariantPayload,
  ProductImage
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
    relation = '["categorie{id,name}","stock{quantity}","variants{id,parent_id,name,sku,quantity,unit_cost,selling_price}","commercial_assignment{user_id}","commercial_assignment.user{full_name,email}","images{id,image,position}"]'
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
  },

  async uploadVariantImage(file: File): Promise<ProductImageUploadResponse> {
    return this.uploadProductImage(file);
  },

  async extractReceipt(file: File): Promise<ReceiptExtractionResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}/products/extract-receipt`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur extraction reçu");
    }

    return response.json();
  },

  async importReceipt(payload: ReceiptImportRequest): Promise<Product[]> {
    const response = await fetch(
      `${API_BASE_URL}/products/import-receipt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur import du reçu");
    }

    clearProductsCache();
    return response.json();
  },

  async getVariants(productId: number): Promise<ProductVariantNode[]> {
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/variants`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur chargement variantes");
    }
    return response.json();
  },

  async createVariant(
    productId: number,
    payload: CreateVariantPayload
  ): Promise<ProductVariant> {
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/variants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur création variante");
    }
    return response.json();
  },

  async updateVariant(
    productId: number,
    variantId: number,
    payload: UpdateVariantPayload
  ): Promise<ProductVariant> {
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/variants/${variantId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur mise à jour variante");
    }
    return response.json();
  },

  async deleteVariant(productId: number, variantId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/variants/${variantId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur suppression variante");
    }
  },

  async getProductImages(productId: number): Promise<ProductImage[]> {
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/images`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur chargement images produit");
    }
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  },

  async deleteProductImage(
    productId: number,
    imageId: number
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/images/${imageId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        }
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur suppression image produit");
    }
    clearProductsCache();
  },

  async uploadProductImages(
    productId: number,
    files: File[]
  ): Promise<ProductImage[]> {
    const formData = new FormData();
    for (const file of files) formData.append("images", file);
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/images`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur ajout images produit");
    }
    const created = await response.json();
    clearProductsCache();
    return Array.isArray(created) ? created : [];
  },

  async replaceProductImage(
    productId: number,
    imageId: number,
    file: File
  ): Promise<ProductImage> {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(
      `${API_BASE_URL}/products/${productId}/images/${imageId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Erreur remplacement image produit");
    }
    const updated = await response.json();
    clearProductsCache();
    return updated;
  }
};
