import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useAuth } from "./AuthContext";
import { cartItemsService } from "../services/operations.service";
import {
  clearGuestCart,
  getGuestCart,
  getGuestCartCount,
  mergeGuestCartIntoServer,
  type GuestCartLine
} from "../lib/guestCart";

/**
 * Le panier a deux implementations et une seule interface :
 * - client connecte -> `cart_items` en base, rattache a la fiche client ;
 * - visiteur sans compte -> `localStorage`, car aucun `customer_id` n'existe
 *   avant la commande.
 *
 * Les composants ne manipulent que des lignes neutres, sans savoir d'ou elles
 * viennent.
 */
interface CartContextValue {
  /** Lignes du panier courant (source serveur ou invite, peu importe). */
  items: GuestCartLine[];
  count: number;
  isGuest: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { customer, isBooting } = useAuth();
  const isGuest = !customer;
  const [items, setItems] = useState<GuestCartLine[]>(() => getGuestCart());
  const [count, setCount] = useState<number>(() => getGuestCartCount());

  const applyGuestCart = useCallback(() => {
    const next = getGuestCart();
    setItems(next);
    setCount(next.reduce((sum, line) => sum + line.quantity, 0));
  }, []);

  const refresh = useCallback(async () => {
    if (!customer) {
      applyGuestCart();
      return;
    }
    try {
      const rows = await cartItemsService.getCartItemsWithProducts(customer.id);
      setItems(
        rows.map((item) => ({
          product_id: item.product_id,
          product_name:
            item.product?.name ??
            item.variant?.name ??
            `Produit #${item.product_id}`,
          variant_id: item.variant_id ?? null,
          variant_name: item.variant?.name ?? null,
          quantity: Number(item.quantity || 0),
          unit_cost: Number(item.unit_cost || 0),
          image: item.variant?.image ?? item.product?.image ?? null
        }))
      );
      setCount(rows.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
    } catch {
      setItems([]);
      setCount(0);
    }
  }, [customer, applyGuestCart]);

  const clear = useCallback(() => {
    if (customer) {
      setItems([]);
      setCount(0);
      return;
    }
    clearGuestCart();
    applyGuestCart();
  }, [customer, applyGuestCart]);

  useEffect(() => {
    if (isBooting) return;
    void refresh();
  }, [isBooting, customer?.id, refresh]);

  // Le panier invite ne disparait pas a la connexion : son contenu est copie
  // ligne a ligne dans le panier du client, puis ecrase. L'API cumule les
  // quantites d'un produit deja present, donc aucun doublon n'apparait.
  const syncedCustomerId = useRef<number | null>(null);
  useEffect(() => {
    if (isBooting || isGuest || !customer) return;
    if (syncedCustomerId.current === customer.id) return;
    if (getGuestCartCount() === 0) {
      syncedCustomerId.current = customer.id;
      return;
    }

    syncedCustomerId.current = customer.id;
    let cancelled = false;
    void mergeGuestCartIntoServer(async (entry) => {
      await cartItemsService.createCartItem({
        customer_id: customer.id,
        product_id: entry.product_id,
        variant_id: entry.variant_id,
        quantity: entry.quantity,
        unit_cost: entry.unit_cost > 0 ? entry.unit_cost : undefined
      });
    })
      .catch(() => {
        // `mergeGuestCartIntoServer` n'efface le panier local qu'une fois toutes
        // les lignes copiees : en cas d'echec il est intact et la copie est
        // reessayee au prochain changement de contexte.
        if (!cancelled) syncedCustomerId.current = null;
      })
      .finally(() => {
        if (!cancelled) void refresh();
      });

    return () => {
      cancelled = true;
    };
  }, [isBooting, isGuest, customer, refresh]);

  const value = useMemo(
    () => ({ items, count, isGuest, refresh, clear }),
    [items, count, isGuest, refresh, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}