export type DiscountType = "percent" | "fixed";

export interface PromoCode {
  id: number;
  code: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount?: number | null;
  max_uses?: number | null;
  used_count?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  status: "active" | "inactive";
  created_at?: string;
}

export interface PromoCodeListResponse {
  items: PromoCode[];
  total: number;
}

export interface CreatePromoCodePayload {
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount?: number;
  max_uses?: number;
  starts_at?: string;
  expires_at?: string;
  status: "active" | "inactive";
}

export type UpdatePromoCodePayload = Partial<CreatePromoCodePayload>;
