import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { Link, useHistory } from "react-router-dom";
import { ShoppingBag, UserRound, X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { cn } from "../lib/utils";

interface MobileMenuContextValue {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const { customer, logout } = useAuth();
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, closeMenu]);

  const navLink = (to: string, children: ReactNode) => (
    <Link
      to={to}
      onClick={closeMenu}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-bg"
      )}
    >
      {children}
    </Link>
  );

  const value = useMemo(
    () => ({ isOpen, openMenu, closeMenu }),
    [isOpen, openMenu, closeMenu]
  );

  return (
    <MobileMenuContext.Provider value={value}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={closeMenu}
            className="animate-fade-in absolute inset-0 h-full w-full bg-ink/40 backdrop-blur-sm"
          />
          <aside className="animate-slide-in-right absolute right-0 top-0 flex h-full w-full max-w-xs flex-col bg-panel shadow-lift">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="flex items-center gap-2 font-bold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                Menu
              </span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-bg hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <p className="px-3 text-xs font-semibold uppercase tracking-widest text-muted">
                Boutique
              </p>
              {navLink("/", "Boutique")}
              {navLink("/panier", "Mon panier")}
              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-widest text-muted">
                Compte
              </p>
              {customer ? (
                <>
                  {navLink("/compte", (
                    <>
                      <UserRound className="h-4 w-4" />
                      {customer.name}
                    </>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      closeMenu();
                      history.push("/");
                    }}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger transition hover:bg-danger/10"
                  >
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  {navLink("/connexion", "Se connecter")}
                  {navLink("/inscription", "Créer un compte")}
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu(): MobileMenuContextValue {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) {
    throw new Error("useMobileMenu doit être utilisé dans <MobileMenuProvider>");
  }
  return ctx;
}
