export type ProductStatus = "active" | "inactive";

export interface Category {
  id: number;
  name: string;
  description?: string;
  status?: ProductStatus;
}

export interface Product {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  description?: string;
  image?: string;
  cost_price?: number;
  selling_price?: number;
  unit?: string;
  low_stock_alert?: number;
  status?: ProductStatus;
  categorie?: Category | null;
  stock?: Array<{
    quantity?: number;
  }>;
  commercial_assignment?: {
    user_id?: number;
    user?: {
      full_name?: string;
      email?: string;
    };
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductPayload {
  category_id: number;
  sku: string;
  name: string;
  image: string;
  description?: string;
  cost_price?: number;
  selling_price?: number;
  unit?: string;
  low_stock_alert?: number;
  status?: ProductStatus;
}

export interface UpdateProductPayload {
  category_id?: number;
  sku?: string;
  name?: string;
  image?: string;
  description?: string;
  cost_price?: number;
  selling_price?: number;
  unit?: string;
  low_stock_alert?: number;
  status?: ProductStatus;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export interface ProductImageUploadResponse {
  image_path: string;
  image_url: string;
  filename: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  status?: ProductStatus;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  status?: ProductStatus;
}

export interface CategoryListResponse {
  items: Category[];
  total: number;
}
