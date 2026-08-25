export interface ProductVariant {
  id: number;
  parent_id?: number | null;
  name?: string;
  sku?: string | null;
  quantity?: number;
  unit_cost?: number | null;
  selling_price?: number | null;
  discount_price?: number | null;
}

export interface ProductImage {
  id: number;
  product_id?: number;
  image: string;
  position?: number;
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
  discount_price?: number | null;
  unit_cost?: number | null;
  status?: string;
  categorie?: { id: number; name?: string } | null;
  stock?: Array<{ quantity?: number }>;
  variants?: ProductVariant[];
  images?: ProductImage[];
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
