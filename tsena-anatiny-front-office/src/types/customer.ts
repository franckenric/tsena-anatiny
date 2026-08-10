export interface Customer {
  id: number;
  name: string;
  phone: string;
  delivery_address?: string;
  created_at?: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  delivery_address?: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
}
