export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  delivery_address?: string | null;
  users_id?: number | null;
  created_at?: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  delivery_address?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  delivery_address?: string;
}

export interface RegisterResponse {
  access_token: string;
  token_type: string;
  customer: Customer;
  otp_required?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  email: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
}
