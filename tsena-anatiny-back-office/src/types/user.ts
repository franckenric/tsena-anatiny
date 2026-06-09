export interface User {
  id: number;
  email: string;
  phone_numer: string;
  is_active: boolean;
  role_id: number;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserPayload {
  email: string;
  phone_numer: string;
  password: string;
  role_id: number;
  is_active: boolean;
  full_name?: string;
}

export interface UpdateUserPayload {
  email?: string;
  phone_numer?: string;
  password?: string;
  role_id?: number;
  full_name?: string;
  is_active?: boolean;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}
