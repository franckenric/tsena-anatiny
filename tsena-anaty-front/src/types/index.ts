// Types principaux de l'application TsenaAnatiny
// Alignés avec les schémas du backend tsena-anaty-apis

export type StatusEnum = 'active' | 'inactive'

export type TypeEnum = 'in_stock' | 'out_stock'

export type OrderStatus = 'draft' | 'confirmed' | 'delivered' | 'cancelled'

// === Rôles ===
export type Role = {
  id?: string
  name?: string | null
}

// === Utilisateurs ===
export type User = {
  id?: string
  email?: string | null
  password?: string | null
  is_active?: boolean | null
  role_id?: number | null
  phone_numer?: string | null
  address?: string | null
  role?: Role | null
}

export type PaginatedResponse<T> = {
  count: number
  data: T[] | null
}

// === Catégories ===
export type Category = {
  id?: string
  name?: string | null
  description?: string | null
  status?: StatusEnum | null
}

// === Produits ===
export type Product = {
  id?: string
  category_id?: number | null
  sku?: string | null
  name?: string | null
  description?: string | null
  image?: string | null
  cost_price?: number | null
  selling_price?: number | null
  unit?: string | null
  low_stock_alert?: number | null
  status?: StatusEnum | null
  categorie?: Category | null
}

// === Assignations commerciales ===
export type Assignment = {
  id?: string
  user_id?: number | null
  product_id?: number | null
  quantity?: number | null
  user?: User | null
  product?: Product | null
}

// === Stock ===
export type Stock = {
  id?: string
  product_id?: number | null
  quantity?: number | null
  reserved?: boolean | null
  product?: Product | null
}

// === Mouvements de stock ===
export type StockMovement = {
  id?: string
  product_id?: number | null
  user_id?: number | null
  type?: TypeEnum | null
  quantity?: number | null
  stock_before?: number | null
  stock_after?: number | null
  reference?: string | null
  product?: Product | null
  user?: User | null
}

// === Commandes ===
export type Order = {
  id?: string
  order_number?: string | null
  user_id?: number | null
  customer_name?: string | null
  customer_phone?: string | null
  delivery_address?: string | null
  product_id?: number | null
  quantity?: number | null
  status?: OrderStatus | null
  note?: string | null
  user?: User | null
  product?: Product | null
}

// === Token ===
export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  access_token: string
  token_type: string
}

export type TokenPayload = {
  id?: string | null
  email?: string | null
}

// === Requêtes de création ===
export type CreateProductRequest = {
  category_id: number
  sku: string
  name: string
  image: string
  description?: string | null
  cost_price?: number | null
  selling_price?: number | null
  unit?: string | null
  low_stock_alert?: number | null
  status?: StatusEnum | null
}

export type UpdateProductRequest = {
  category_id?: number | null
  sku?: string | null
  name?: string | null
  description?: string | null
  image?: string | null
  cost_price?: number | null
  selling_price?: number | null
  unit?: string | null
  low_stock_alert?: number | null
  status?: StatusEnum | null
}

export type CreateUserRequest = {
  email: string
  password: string
  is_active: boolean
  role_id: number
  phone_numer: string
  address?: string | null
}

export type UpdateUserRequest = {
  email?: string | null
  password?: string | null
  is_active?: boolean | null
  role_id?: number | null
  phone_numer?: string | null
  address?: string | null
}

export type CreateAssignmentRequest = {
  user_id: number
  product_id: number
  quantity: number
}

export type UpdateAssignmentRequest = {
  user_id?: number | null
  product_id?: number | null
  quantity?: number | null
}

export type CreateStockMovementRequest = {
  product_id: number
  user_id: number
  type: TypeEnum
  quantity: number
  stock_before?: number | null
  stock_after?: number | null
  reference?: string | null
}

export type UpdateStockMovementRequest = {
  product_id?: number | null
  user_id?: number | null
  type?: TypeEnum | null
  quantity?: number | null
  stock_before?: number | null
  stock_after?: number | null
  reference?: string | null
}

export type CreateOrderRequest = {
  user_id: number
  customer_name: string
  product_id: number
  order_number?: string | null
  customer_phone?: string | null
  delivery_address?: string | null
  quantity?: number | null
  status?: OrderStatus | null
  note?: string | null
}

export type UpdateOrderRequest = {
  order_number?: string | null
  user_id?: number | null
  customer_name?: string | null
  customer_phone?: string | null
  delivery_address?: string | null
  product_id?: number | null
  quantity?: number | null
  status?: OrderStatus | null
  note?: string | null
}

// Params de requête communs pour les endpoints list
export type ListParams = {
  offset?: number
  limit?: number
  relation?: string
  where?: string
  where_relation?: string
  base_columns?: string
}
