export interface ProductVariant {
  id: number;
  parent_id?: number | null;
  name?: string;
  sku?: string | null;
  quantity?: number;
  unit_cost?: number | null;
  selling_price?: number | null;
}

export interface Product {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  description?: string;
  image?: string;
  unit?: string;
  selling_price?: number;
  unit_cost?: number | null;
  status?: string;
  categorie?: { id: number; name?: string } | null;
  stock?: Array<{ quantity?: number }>;
  variants?: ProductVariant[];
  created_at?: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

export interface CategoryListResponse {
  items: Category[];
  total: number;
}
