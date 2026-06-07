import axios from 'axios'
import type {
  User,
  Product,
  Assignment,
  StockMovement,
  Order,
  LoginRequest,
  LoginResponse,
  TokenPayload,
  CreateProductRequest,
  UpdateProductRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  CreateStockMovementRequest,
  UpdateStockMovementRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  PaginatedResponse,
  ListParams,
} from '@/types'

// Instance Axios configurée
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur pour gérer les erreurs 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/** Construire les query params pour les endpoints list */
function buildListParams(params?: ListParams): string {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset))
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit))
  if (params.relation) searchParams.set('relation', params.relation)
  if (params.where) searchParams.set('where', params.where)
  if (params.where_relation) searchParams.set('where_relation', params.where_relation)
  if (params.base_columns) searchParams.set('base_columns', params.base_columns)
  const str = searchParams.toString()
  return str ? `?${str}` : ''
}

// === Auth (POST /login/access-token) ===
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', data.username)
    formData.append('password', data.password)
    const response = await api.post<LoginResponse>('/login/access-token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.data
  },

  testToken: async (token: string): Promise<User> => {
    const response = await api.post<User>(`/login/test-token/${token}`)
    return response.data
  },

  decodeToken: async (): Promise<TokenPayload> => {
    const response = await api.post<TokenPayload>('/login/decode_token')
    return response.data
  },
}

// === Produits (GET/POST /products, GET/PUT/DELETE /products/:id) ===
export const productsApi = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get<PaginatedResponse<Product>>(`/products${buildListParams(params)}`)
    return response.data
  },

  getById: async (id: string, params?: ListParams): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}${buildListParams(params)}`)
    return response.data
  },

  create: async (data: CreateProductRequest): Promise<Product> => {
    const response = await api.post<Product>('/products', data)
    return response.data
  },

  update: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`)
  },
}

// === Utilisateurs (GET/POST /users, GET/PUT/DELETE /users/:id) ===
export const usersApi = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>(`/users${buildListParams(params)}`)
    return response.data
  },

  getById: async (id: string, params?: ListParams): Promise<User> => {
    const response = await api.get<User>(`/users/${id}${buildListParams(params)}`)
    return response.data
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post<User>('/users', data)
    return response.data
  },

  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`)
  },
}

// === Assignations commerciales (GET/POST /commercial_assignments, GET/PUT/DELETE /commercial_assignments/:id) ===
export const assignmentsApi = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<Assignment>> => {
    const response = await api.get<PaginatedResponse<Assignment>>(`/commercial_assignments${buildListParams(params)}`)
    return response.data
  },

  getById: async (id: string, params?: ListParams): Promise<Assignment> => {
    const response = await api.get<Assignment>(`/commercial_assignments/${id}${buildListParams(params)}`)
    return response.data
  },

  create: async (data: CreateAssignmentRequest): Promise<Assignment> => {
    const response = await api.post<Assignment>('/commercial_assignments', data)
    return response.data
  },

  update: async (id: string, data: UpdateAssignmentRequest): Promise<Assignment> => {
    const response = await api.put<Assignment>(`/commercial_assignments/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/commercial_assignments/${id}`)
  },
}

// === Mouvements de stock (GET/POST /stock_movements, GET/PUT/DELETE /stock_movements/:id) ===
export const stockMovementsApi = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<StockMovement>> => {
    const response = await api.get<PaginatedResponse<StockMovement>>(`/stock_movements${buildListParams(params)}`)
    return response.data
  },

  getById: async (id: string, params?: ListParams): Promise<StockMovement> => {
    const response = await api.get<StockMovement>(`/stock_movements/${id}${buildListParams(params)}`)
    return response.data
  },

  create: async (data: CreateStockMovementRequest): Promise<StockMovement> => {
    const response = await api.post<StockMovement>('/stock_movements', data)
    return response.data
  },

  update: async (id: string, data: UpdateStockMovementRequest): Promise<StockMovement> => {
    const response = await api.put<StockMovement>(`/stock_movements/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/stock_movements/${id}`)
  },
}

// === Commandes (GET/POST /orders, GET/PUT/DELETE /orders/:id) ===
export const ordersApi = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<PaginatedResponse<Order>>(`/orders${buildListParams(params)}`)
    return response.data
  },

  getById: async (id: string, params?: ListParams): Promise<Order> => {
    const response = await api.get<Order>(`/orders/${id}${buildListParams(params)}`)
    return response.data
  },

  create: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await api.post<Order>('/orders', data)
    return response.data
  },

  update: async (id: string, data: UpdateOrderRequest): Promise<Order> => {
    const response = await api.put<Order>(`/orders/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/orders/${id}`)
  },
}

export default api
