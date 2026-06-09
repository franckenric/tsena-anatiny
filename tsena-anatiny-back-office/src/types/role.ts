export interface Role {
  id: number;
  name: string;
}

export interface RoleListResponse {
  items: Role[];
  total: number;
}
