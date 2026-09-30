import { useEffect, useMemo, useState } from "react";
import type { Product } from "../types/product";
import type { CartItem, Order } from "../types/operations";
import { useAuth } from "../contexts/AuthContext";
import {
  cartItemsService,
  ordersService
} from "../services/operations.service";
import { buildRecommendations } from "../lib/recommendations";
import { getRecentProductIds } from "../lib/utils";

export interface RecommendationsResult {
  recommendations: Product[];
  isLoading: boolean;
  hasProfile: boolean;
}

const MAX_ORDERS = 200;

export function useRecommendations(
  products: Product[],
  limit = 10
): RecommendationsResult {
  const { customer } = useAuth();
  const customerId = customer?.id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!customerId) {
      setOrders([]);
      setCartItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.all([
      ordersService.getOrdersByCustomer(customerId, 1, MAX_ORDERS),
      cartItemsService.getCartItems(customerId)
    ])
      .then(([orderRes, cartRes]) => {
        if (cancelled) return;
        setOrders(orderRes.items);
        setCartItems(cartRes);
      })
      .catch(() => {
        // Signaux indisponibles: on garde la personnalisation minimale
        // fournie par les consultations récentes.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const recommendations = useMemo(
    () =>
      buildRecommendations({
        products,
        orders,
        cartItems,
        recentIds: getRecentProductIds(),
        limit
      }),
    [products, orders, cartItems, limit]
  );

  const hasProfile = Boolean(customer);

  return { recommendations, isLoading, hasProfile };
}