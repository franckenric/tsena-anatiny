import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useCartDrawer } from "../contexts/CartDrawerContext";
import { useToast } from "../contexts/ToastContext";
import { useI18n } from "../contexts/I18nContext";
import { cartItemsService } from "../services/operations.service";
import { addToGuestCart } from "../lib/guestCart";
import type { Product } from "../types/product";

export interface CartLine {
  variant: NonNullable<Product["variants"]>[number];
  quantity: number;
  unit_cost: number;
}

export function useAddToCart() {
  const { customer } = useAuth();
  const { refresh } = useCart();
  const { openCart } = useCartDrawer();
  const { success, error } = useToast();
  const { t } = useI18n();

  /**
   * L'ajout au panier ne demande plus de compte : un visiteur sans session
   * remplit son panier local, la commande se fera a la validation.
   */
  const addSingle = useCallback(
    async (product: Product, quantity: number): Promise<boolean> => {
      if (quantity <= 0) return false;
      const price = Number(product.selling_price ?? 0);
      const discount = Number(product.discount_price ?? 0);
      const unitCost = discount > 0 && discount < price ? discount : price;
      try {
        if (customer) {
          await cartItemsService.createCartItem({
            customer_id: customer.id,
            product_id: product.id,
            variant_id: null,
            quantity,
            unit_cost: unitCost > 0 ? unitCost : undefined
          });
        } else {
          addToGuestCart({
            product_id: product.id,
            product_name: product.name,
            variant_id: null,
            variant_name: null,
            quantity,
            unit_cost: unitCost,
            image: product.image ?? product.images?.[0]?.image ?? null
          });
        }
        await refresh();
        success(t("cart.added", { count: quantity }));
        openCart();
        return true;
      } catch (err) {
        error(err instanceof Error ? err.message : t("error.addCart"));
        return false;
      }
    },
    [customer, refresh, success, error, openCart, t]
  );

  const addLines = useCallback(
    async (product: Product, lines: CartLine[]): Promise<boolean> => {
      const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
      if (totalQty <= 0) return false;
      try {
        for (const line of lines) {
          if (customer) {
            await cartItemsService.createCartItem({
              customer_id: customer.id,
              product_id: product.id,
              variant_id: line.variant.id,
              quantity: line.quantity,
              unit_cost: line.unit_cost > 0 ? line.unit_cost : undefined
            });
          } else {
            addToGuestCart({
              product_id: product.id,
              product_name: product.name,
              variant_id: line.variant.id,
              variant_name: line.variant.name ?? null,
              quantity: line.quantity,
              unit_cost: line.unit_cost,
              image: product.image ?? product.images?.[0]?.image ?? null
            });
          }
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
    [customer, refresh, success, error, openCart, t]
  );

  return { addSingle, addLines };
}