import { useCallback } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useCartDrawer } from "../contexts/CartDrawerContext";
import { useToast } from "../contexts/ToastContext";
import { useI18n } from "../contexts/I18nContext";
import { cartItemsService } from "../services/operations.service";
import type { Product } from "../types/product";

export interface CartLine {
  variant: NonNullable<Product["variants"]>[number];
  quantity: number;
  unit_cost: number;
}

export function useAddToCart() {
  const { customer, isBooting } = useAuth();
  const { refresh } = useCart();
  const { openCart } = useCartDrawer();
  const { success, error } = useToast();
  const { t } = useI18n();
  const history = useHistory();
  const location = useLocation();

  const requireCustomer = useCallback((): boolean => {
    if (isBooting) return false;
    if (!customer) {
      history.push("/connexion", {
        from: location.pathname + location.search
      });
      return false;
    }
    return true;
  }, [customer, isBooting, history, location.pathname, location.search]);

  const addSingle = useCallback(
    async (product: Product, quantity: number): Promise<boolean> => {
      if (!customer || !requireCustomer()) return false;
      const price = Number(product.selling_price ?? 0);
      const discount = Number(product.discount_price ?? 0);
      const unitCost = discount > 0 && discount < price ? discount : price;
      try {
        await cartItemsService.createCartItem({
          customer_id: customer.id,
          product_id: product.id,
          variant_id: null,
          quantity,
          unit_cost: unitCost > 0 ? unitCost : undefined
        });
        await refresh();
        success(t("cart.added", { count: quantity }));
        openCart();
        return true;
      } catch (err) {
        error(err instanceof Error ? err.message : t("error.addCart"));
        return false;
      }
    },
    [customer, requireCustomer, refresh, success, error, openCart, t]
  );

  const addLines = useCallback(
    async (product: Product, lines: CartLine[]): Promise<boolean> => {
      if (!customer || !requireCustomer()) return false;
      const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
      try {
        for (const line of lines) {
          await cartItemsService.createCartItem({
            customer_id: customer.id,
            product_id: product.id,
            variant_id: line.variant.id,
            quantity: line.quantity,
            unit_cost: line.unit_cost > 0 ? line.unit_cost : undefined
          });
        }
        await refresh();
        success(t("cart.added", { count: totalQty }));
        openCart();
        return true;
      } catch (err) {
        error(err instanceof Error ? err.message : t("error.addCart"));
        return false;
      }
    },
    [customer, requireCustomer, refresh, success, error, openCart, t]
  );

  return { requireCustomer, addSingle, addLines };
}
