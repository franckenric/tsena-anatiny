import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { customersService } from "../services/customers.service";
import { getApiUser, type ApiUser } from "../services/api";
import type { CreateCustomerPayload } from "../types/customer";

export interface CustomerSession {
  id: number;
  name: string;
  phone: string;
  delivery_address?: string;
}

const CUSTOMER_KEY = "fo.customer";
const API_USER_KEY = "fo.api.user";

function readStoredCustomer(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

function readStoredApiUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(API_USER_KEY);
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  isBooting: boolean;
  apiUser: ApiUser | null;
  customer: CustomerSession | null;
  login: (phone: string) => Promise<CustomerSession>;
  register: (payload: CreateCustomerPayload) => Promise<CustomerSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isBooting, setIsBooting] = useState(true);
  const [apiUser, setApiUser] = useState<ApiUser | null>(() =>
    readStoredApiUser()
  );
  const [customer, setCustomer] = useState<CustomerSession | null>(() =>
    readStoredCustomer()
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const user = await getApiUser();
        if (cancelled) return;
        localStorage.setItem(API_USER_KEY, JSON.stringify(user));
        setApiUser(user);
      } catch {
        // pas de token ni d'identifiants API: navigation publique, catalogue toujours visible
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistCustomer = useCallback((next: CustomerSession) => {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(next));
    setCustomer(next);
  }, []);

  const login = useCallback(
    async (phone: string): Promise<CustomerSession> => {
      const found = await customersService.findByPhone(phone);
      if (!found) {
        throw new Error(
          "Aucun compte trouve avec ce numero. Creez votre compte."
        );
      }
      const session: CustomerSession = {
        id: found.id,
        name: found.name,
        phone: found.phone,
        delivery_address: found.delivery_address
      };
      persistCustomer(session);
      return session;
    },
    [persistCustomer]
  );

  const register = useCallback(
    async (payload: CreateCustomerPayload): Promise<CustomerSession> => {
      const created = await customersService.findOrCreate(payload);
      const session: CustomerSession = {
        id: created.id,
        name: created.name,
        phone: created.phone,
        delivery_address: created.delivery_address
      };
      persistCustomer(session);
      return session;
    },
    [persistCustomer]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomer(null);
  }, []);

  const value = useMemo(
    () => ({ isBooting, apiUser, customer, login, register, logout }),
    [isBooting, apiUser, customer, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
