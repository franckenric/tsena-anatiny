import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/auth.service";
import type { AuthUser, LoginPayload } from "../types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isBootstrapping: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedToken = authService.getStoredToken();
    if (!storedToken) {
      setIsBootstrapping(false);
      return;
    }

    setToken(storedToken);
    authService
      .testToken(storedToken)
      .then((me) => setUser(me))
      .catch(() => {
        authService.clearStoredToken();
        setToken(null);
      })
      .finally(() => setIsBootstrapping(false));
  }, []);

  async function handleLogin(payload: LoginPayload): Promise<void> {
    setIsLoading(true);
    try {
      const auth = await authService.login(payload);
      const me = await authService.testToken(auth.access_token);
      authService.saveToken(auth.access_token);
      setToken(auth.access_token);
      setUser(me);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout(): void {
    authService.clearStoredToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isBootstrapping,
      isLoading,
      login: handleLogin,
      logout: handleLogout
    }),
    [user, token, isBootstrapping, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
