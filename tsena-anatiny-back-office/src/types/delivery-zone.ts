export interface DeliveryZone {
  id: number;
  name: string;
  fee: number;
  is_active: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryZoneListResponse {
  items: DeliveryZone[];
  total: number;
}

export interface CreateDeliveryZonePayload {
  name: string;
  fee: number;
  is_active?: boolean;
  position?: number;
}

export type UpdateDeliveryZonePayload = Partial<CreateDeliveryZonePayload>;
