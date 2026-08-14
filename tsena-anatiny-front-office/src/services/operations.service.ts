import { apiFetch } from "./api";
import { productsService } from "./products.service";
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

  async getCartItemsWithProducts(customerId: number): Promise<CartItem[]> {
    const [items, productsRes] = await Promise.all([
      this.getCartItems(customerId),
      productsService.getProducts(1, 200)
    ]);
    const byId = new Map(productsRes.items.map((p) => [p.id, p]));
    return items.map((item) => {
      const product = byId.get(item.product_id);
      if (!product) return item;
      const image = product.image ?? product.images?.[0]?.image;
      const variant =
        item.variant_id != null
          ? (product.variants ?? []).find((v) => v.id === item.variant_id)
          : undefined;
      return {
        ...item,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          image
        },
        variant: variant
          ? {
              id: variant.id,
              name: variant.name,
              sku: variant.sku ?? null,
              image
            }
          : item.variant ?? null
      };
    });
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
      "stock_movements{id,product_id,variant_id,type,quantity,unit_cost,another_price,other_price_reason}",
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
      "stock_movements{id,product_id,variant_id,type,quantity,unit_cost,another_price,other_price_reason}",
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
