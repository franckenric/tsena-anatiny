import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useAuth } from "./AuthContext";
import { cartItemsService } from "../services/operations.service";

interface CartContextValue {
  count: number;
  refresh: () => Promise<void>;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { customer, isBooting } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!customer) {
      setCount(0);
      return;
    }
    try {
      const items = await cartItemsService.getCartItems(customer.id);
      setCount(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
    } catch {
      setCount(0);
    }
  }, [customer]);

  const clear = useCallback(() => setCount(0), []);

  useEffect(() => {
    if (!isBooting) void refresh();
  }, [isBooting, customer?.id, refresh]);

  const value = useMemo(() => ({ count, refresh, clear }), [count, refresh, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
