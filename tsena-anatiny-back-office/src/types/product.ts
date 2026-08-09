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
  unit?: string;
  selling_price?: number;
  unit_cost?: number | null;
  low_stock_alert?: number;
  status?: ProductStatus;
  categorie?: Category | null;
  stock?: Array<{
    quantity?: number;
  }>;
  variants?: Array<{
    id: number;
    parent_id?: number | null;
    name?: string;
    sku?: string | null;
    quantity?: number;
    unit_cost?: number | null;
    selling_price?: number | null;
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
  unit?: string;
  selling_price?: number;
  low_stock_alert?: number;
  status?: ProductStatus;
}

export interface UpdateProductPayload {
  category_id?: number;
  sku?: string;
  name?: string;
  image?: string;
  description?: string;
  unit?: string;
  selling_price?: number;
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

export interface ReceiptItem {
  name: string;
  base_name?: string;
  attributes?: Record<string, string>;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ReceiptExtractionResult {
  receipt_number?: string;
  receipt_date?: string;
  seller?: string;
  currency: string;
  items: ReceiptItem[];
  subtotal: number;
  shipping_fee: number;
  order_total: number;
  payment_fee: number;
  amount_paid: number;
  total_fees: number;
  already_imported?: boolean;
}

export interface ReceiptImportItem {
  name: string;
  quantity: number;
  unit_cost: number;
  another_price: number;
  unit?: string;
  sku?: string;
  attributes?: Record<string, string>;
}

export interface ReceiptImportRequest {
  receipt_number?: string;
  file_name?: string;
  seller?: string;
  currency?: string;
  category_id: number;
  lot_id: number;
  variant_levels?: string[];
  items: ReceiptImportItem[];
}

export interface ProductVariantNode {
  id: number;
  product_id: number;
  parent_id: number | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unit_cost?: number | null;
  selling_price?: number | null;
  image?: string | null;
  children: ProductVariantNode[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  parent_id: number | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unit_cost?: number | null;
  selling_price?: number | null;
  image?: string | null;
}

export interface CreateVariantPayload {
  name: string;
  quantity?: number;
  parent_id?: number | null;
  sku?: string;
  unit_cost?: number | null;
  selling_price?: number | null;
  image?: string | null;
}

export interface UpdateVariantPayload {
  name?: string;
  quantity?: number;
  parent_id?: number | null;
  sku?: string;
  unit_cost?: number | null;
  selling_price?: number | null;
  image?: string | null;
}

export interface DraftVariant {
  name: string;
  quantity: string;
  unit_cost: string;
  image?: File | null;
}
