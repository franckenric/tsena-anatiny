export type LoginPayload = {
  phone: string;
  password: string;
};

export type AuthToken = {
  access_token: string;
  token_type: string;
};

export type AuthUser = {
  id?: number | string;
  email?: string | null;
  phone_numer?: string | null;
  role_id?: number | null;
  is_active?: boolean | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};
