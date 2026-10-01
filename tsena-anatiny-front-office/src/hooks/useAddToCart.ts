import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
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
  const { showLogin } = useAuthModal();
  const { refresh } = useCart();
  const { openCart } = useCartDrawer();
  const { success, error } = useToast();
  const { t } = useI18n();

  // L'action mise en attente est rejouee apres la connexion : elle doit donc
  // relire la session fraichement etablie, pas celle du rendu d'origine.
  const customerRef = useRef(customer);
  useEffect(() => {
    customerRef.current = customer;
  }, [customer]);

  /**
   * Portail d'authentification : sans session, la modale bloque l'interface et
   * `retry` est rejoue une fois la connexion reussie.
   */
  const guardCustomer = useCallback(
    (retry: () => Promise<boolean>): Promise<boolean> => {
      if (isBooting) return Promise.resolve(false);
      if (!customerRef.current) {
        showLogin({
          onSuccess: () => {
            void retry();
          }
        });
        return Promise.resolve(false);
      }
      return retry();
    },
    [isBooting, showLogin]
  );

  const requireCustomer = useCallback((): boolean => {
    if (isBooting) return false;
    if (!customer) {
      showLogin();
      return false;
    }
    return true;
  }, [customer, isBooting, showLogin]);

  const addSingleImpl = useCallback(
    async (product: Product, quantity: number): Promise<boolean> => {
      const current = customerRef.current;
      if (!current) return false;
      const price = Number(product.selling_price ?? 0);
      const discount = Number(product.discount_price ?? 0);
      const unitCost = discount > 0 && discount < price ? discount : price;
      try {
        await cartItemsService.createCartItem({
          customer_id: current.id,
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
    [refresh, success, error, openCart, t]
  );

  const addLinesImpl = useCallback(
    async (product: Product, lines: CartLine[]): Promise<boolean> => {
      const current = customerRef.current;
      if (!current) return false;
      const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
      try {
        for (const line of lines) {
          await cartItemsService.createCartItem({
            customer_id: current.id,
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
    [refresh, success, error, openCart, t]
  );

  const addSingle = useCallback(
    (product: Product, quantity: number): Promise<boolean> =>
      guardCustomer(() => addSingleImpl(product, quantity)),
    [guardCustomer, addSingleImpl]
  );

  const addLines = useCallback(
    (product: Product, lines: CartLine[]): Promise<boolean> =>
      guardCustomer(() => addLinesImpl(product, lines)),
    [guardCustomer, addLinesImpl]
  );

  return { requireCustomer, addSingle, addLines };
}