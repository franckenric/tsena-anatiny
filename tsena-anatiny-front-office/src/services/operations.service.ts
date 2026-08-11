import { apiFetch } from "./api";
import type {
  CartItem,
  CreateCartItemPayload,
  UpdateCartItemPayload,
  CheckoutPayload,
  Order,
  OrderListResponse
} from "../types/operations";

export const cartItemsService = {
  async getCartItems(customerId: number): Promise<CartItem[]> {
    const payload = await apiFetch<{ count: number; data?: CartItem[] }>(
      `/cart_items/?limit=500&customer_id=${customerId}`
    );
    return Array.isArray(payload?.data) ? payload.data : [];
  },

  async createCartItem(payload: CreateCartItemPayload): Promise<CartItem> {
    return apiFetch<CartItem>("/cart_items/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async updateCartItem(
    id: number,
    payload: UpdateCartItemPayload
  ): Promise<CartItem> {
    return apiFetch<CartItem>(`/cart_items/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  async deleteCartItem(id: number): Promise<void> {
    await apiFetch(`/cart_items/${id}`, { method: "DELETE" });
  },

  async checkout(
    customerId: number,
    payload: CheckoutPayload
  ): Promise<Order> {
    return apiFetch<Order>(`/cart_items/checkout/${customerId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

export const ordersService = {
  async getOrdersByCustomer(
    customerId: number,
    page = 1,
    pageSize = 50
  ): Promise<OrderListResponse> {
    const skip = (page - 1) * pageSize;
    const where = JSON.stringify([
      { key: "customer_id", operator: "==", value: customerId }
    ]);
    const relation = JSON.stringify([
      "customer{id,name,phone,delivery_address}",
      "stock_movements{id,product_id,variant_id,type,quantity,unit_cost,another_price}",
      "stock_movements.product{id,name,sku}",
      "stock_movements.variant{id,name,sku}"
    ]);
    const payload = await apiFetch<{ count: number; data?: Order[] }>(
      `/orders/?offset=${skip}&limit=${pageSize}&where=${encodeURIComponent(
        where
      )}&relation=${encodeURIComponent(relation)}`
    );
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      total: typeof payload?.count === "number" ? payload.count : 0
    };
  },

  async getOrder(orderId: number): Promise<Order | null> {
    const where = JSON.stringify([
      { key: "id", operator: "==", value: orderId }
    ]);
    const relation = JSON.stringify([
      "customer{id,name,phone,delivery_address}",
      "stock_movements{id,product_id,variant_id,type,quantity,unit_cost,another_price}",
      "stock_movements.product{id,name,sku}",
      "stock_movements.variant{id,name,sku}"
    ]);
    const payload = await apiFetch<{ count: number; data?: Order[] }>(
      `/orders/?limit=1&where=${encodeURIComponent(
        where
      )}&relation=${encodeURIComponent(relation)}`
    );
    const items = Array.isArray(payload?.data) ? payload.data : [];
    return items[0] ?? null;
  }
};
