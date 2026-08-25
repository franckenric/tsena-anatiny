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
import { getApiUser, setApiToken, type ApiUser } from "../services/api";
import { registerPlugin, type Plugin } from "@capacitor/core";
import type { RegisterPayload } from "../types/customer";

export interface CustomerSession {
  id: number;
  name: string;
  phone: string;
  delivery_address?: string;
  otpVerified: boolean;
}

const CUSTOMER_KEY = "fo.customer";
const API_USER_KEY = "fo.api.user";

function readStoredCustomer(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerSession;
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
  login: (phone: string) => Promise<CustomerSession>;
  register: (payload: RegisterPayload) => Promise<CustomerSession>;
  loginWithFacebook: () => void;
  handleFacebookCallback: (code: string) => Promise<CustomerSession>;
  loginWithGoogle: () => Promise<CustomerSession>;
  handleGoogleCallback: (code: string) => Promise<CustomerSession>;
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
        delivery_address: found.delivery_address,
        otpVerified: true
      };
      persistCustomer(session);
      return session;
    },
    [persistCustomer]
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<CustomerSession> => {
      const result = await customersService.register(payload);
      setApiToken(result.access_token);
      const created = result.customer;
      const session: CustomerSession = {
        id: created.id,
        name: created.name,
        phone: created.phone,
        delivery_address: created.delivery_address,
        otpVerified: false
      };
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

  const handleFacebookCallback = useCallback(
    async (code: string): Promise<CustomerSession> => {
      const redirectUri = getFacebookRedirectUri();
      const result = await customersService.facebookLogin(code, redirectUri);
      setApiToken(result.access_token);

      const tokenPayload = await getApiUser();
      const session: CustomerSession = {
        id: tokenPayload.id,
        name: tokenPayload.email ?? "Utilisateur Facebook",
        phone: "",
        otpVerified: true
      };
      persistCustomer(session);
      return session;
    },
    [getFacebookRedirectUri, persistCustomer]
  );

  const loginWithGoogle = useCallback(async () => {
    const GoogleAuth = registerPlugin<Plugin & {
      signIn: () => Promise<{ authentication: { idToken: string }; name?: string }>;
    }>("GoogleAuth");
    const result = await GoogleAuth.signIn();
    const idToken = result.authentication.idToken;

    const apiResult = await customersService.googleLogin(idToken);
    setApiToken(apiResult.access_token);

    const tokenPayload = await getApiUser();
    const session: CustomerSession = {
      id: tokenPayload.id,
      name: result.name || (tokenPayload.email ?? "Utilisateur Google"),
      phone: "",
      otpVerified: true
    };
    persistCustomer(session);
    return session;
  }, [persistCustomer]);

  const handleGoogleCallback = useCallback(
    async (_code: string): Promise<CustomerSession> => {
      return loginWithGoogle();
    },
    [loginWithGoogle]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomer(null);
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
    () => ({ isBooting, apiUser, customer, login, register, loginWithFacebook, handleFacebookCallback, loginWithGoogle, handleGoogleCallback, logout, verifyOtp }),
    [isBooting, apiUser, customer, login, register, loginWithFacebook, handleFacebookCallback, loginWithGoogle, handleGoogleCallback, logout, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
