export interface Customer {
  id: number;
  name: string;
  phone: string;
  delivery_address?: string;
  users_id?: number;
  created_at?: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  delivery_address?: string;
}

export interface RegisterPayload extends CreateCustomerPayload {
  password: string;
  email?: string;
}

export interface RegisterResponse {
  access_token: string;
  token_type: string;
  customer: Customer;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
}
