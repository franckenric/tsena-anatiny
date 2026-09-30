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
import {
  clearApiToken,
  getApiUser,
  setApiToken,
  type ApiUser
} from "../services/api";
import type { Customer, RegisterPayload } from "../types/customer";

export interface CustomerSession {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  delivery_address?: string | null;
  otpVerified: boolean;
}

const CUSTOMER_KEY = "fo.customer";
const API_USER_KEY = "fo.api.user";

function toSession(customer: Customer, email: string, otpVerified: boolean): CustomerSession {
  return {
    id: customer.id,
    name: customer.name,
    email,
    phone: customer.phone ?? null,
    delivery_address: customer.delivery_address ?? null,
    otpVerified
  };
}

function readStoredCustomer(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerSession;
    // Sessions created before the email switch have no email: drop them so
    // the customer is asked to sign in again.
    if (!parsed.email) return null;
    if (parsed.otpVerified === undefined) {
      parsed.otpVerified = true;
    }
    return parsed;
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
  login: (email: string, password: string) => Promise<CustomerSession>;
  register: (payload: RegisterPayload) => Promise<CustomerSession>;
  loginWithFacebook: () => void;
  handleFacebookCallback: (code: string) => Promise<CustomerSession>;
  loginWithGoogle: (idToken: string) => Promise<CustomerSession>;
  logout: () => void;
  verifyOtp: () => void;
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
    async (email: string, password: string): Promise<CustomerSession> => {
      await customersService.login({ email, password });
      const user = await getApiUser();
      setApiUser(user);
      localStorage.setItem(API_USER_KEY, JSON.stringify(user));

      const found = await customersService.findByUserId(user.id);
      if (!found) {
        throw new Error(
          "Aucun profil client neyet lie a ce compte. Reessayez dans un instant."
        );
      }
      const session = toSession(
        found,
        user.email ?? email,
        readStoredCustomer()?.otpVerified ?? true
      );
      persistCustomer(session);
      return session;
    },
    [persistCustomer]
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<CustomerSession> => {
      const result = await customersService.register(payload);
      setApiToken(result.access_token);

      // The token now belongs to the new customer, not the service account.
      const user = await getApiUser();
      setApiUser(user);
      localStorage.setItem(API_USER_KEY, JSON.stringify(user));

      const session = toSession(result.customer, payload.email, false);
      persistCustomer(session);
      return session;
    },
    [persistCustomer]
  );

  const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID ?? "";

  const getFacebookRedirectUri = useCallback(() => {
    return window.location.origin + "/connexion";
  }, []);

  const loginWithFacebook = useCallback(() => {
    const redirectUri = getFacebookRedirectUri();
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile&response_type=code&state=facebook`;
    window.location.href = url;
  }, [fbAppId, getFacebookRedirectUri]);

  const resolveSocialSession = useCallback(
    async (fallbackName: string): Promise<CustomerSession> => {
      const tokenPayload = await getApiUser();
      setApiUser(tokenPayload);
      localStorage.setItem(API_USER_KEY, JSON.stringify(tokenPayload));

      const found = await customersService.findByUserId(tokenPayload.id);
      if (!found) {
        throw new Error(
          "Aucun profil client neyet lie a ce compte. Reessayez dans un instant."
        );
      }
      const session = toSession(
        found,
        tokenPayload.email ?? "",
        readStoredCustomer()?.otpVerified ?? true
      );
      if (!session.name) session.name = fallbackName;
      persistCustomer(session);
      return session;
    },
    [persistCustomer]
  );

  const handleFacebookCallback = useCallback(
    async (code: string): Promise<CustomerSession> => {
      const redirectUri = getFacebookRedirectUri();
      const result = await customersService.facebookLogin(code, redirectUri);
      setApiToken(result.access_token);
      return resolveSocialSession("Utilisateur Facebook");
    },
    [getFacebookRedirectUri, resolveSocialSession]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<CustomerSession> => {
      const apiResult = await customersService.googleLogin(idToken);
      setApiToken(apiResult.access_token);
      return resolveSocialSession("Utilisateur Google");
    },
    [resolveSocialSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(CUSTOMER_KEY);
    localStorage.removeItem(API_USER_KEY);
    setCustomer(null);
    setApiUser(null);
    // The customer's token must not survive the session: the next API call
    // falls back to the public service account.
    clearApiToken();
  }, []);

  const verifyOtp = useCallback(() => {
    setCustomer((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, otpVerified: true };
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({ isBooting, apiUser, customer, login, register, loginWithFacebook, handleFacebookCallback, loginWithGoogle, logout, verifyOtp }),
    [isBooting, apiUser, customer, login, register, loginWithFacebook, handleFacebookCallback, loginWithGoogle, logout, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
