import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { Link, NavLink, useHistory } from "react-router-dom";
import {
  Bell,
  Home,
  LogOut,
  Package,
  Shapes,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  UserRound,
  X
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { cn } from "../lib/utils";

interface MobileMenuContextValue {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const { customer, logout } = useAuth();
  const { t } = useI18n();
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

  const navLink = (
    to: string,
    label: string,
    icon: ReactNode,
    exact = false
  ) => (
    <NavLink
      to={to}
      exact={exact}
      onClick={closeMenu}
      className={(isActive) =>
        cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition active:scale-[0.98]",
          isActive
            ? "bg-brand/15 text-brand"
            : "text-muted hover:bg-brand/10 hover:text-ink"
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );

  const sectionLabel = (label: string) => (
    <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
      {label}
    </p>
  );

  const value = useMemo(
    () => ({ isOpen, openMenu, closeMenu }),
    [isOpen, openMenu, closeMenu]
  );

  const initials = (customer?.name || "?").trim().charAt(0).toUpperCase();
  const firstName = (customer?.name ?? "").trim().split(" ")[0] ?? "";

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-warning text-white shadow-lg shadow-brand/30">
        <ShoppingBag className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          Tsena Anatiny
        </p>
        <p className="font-display text-base font-bold leading-none text-ink">
          {t("nav.brandSub")}
        </p>
      </div>
    </div>
  );

  return (
    <MobileMenuContext.Provider value={value}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t("common.closeMenu")}
            onClick={closeMenu}
            className="animate-fade-in absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
          />
          <aside className="animate-slide-in-left absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border/60 bg-panel/95 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
              {brand}
              <button
                type="button"
                onClick={closeMenu}
                aria-label={t("common.closeMenu")}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel text-muted transition hover:border-brand/40 hover:text-brand active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {customer && (
              <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {firstName}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {customer.phone}
                  </p>
                </div>
              </div>
            )}

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
              {sectionLabel(t("nav.shop"))}
              {navLink(
                "/",
                t("nav.home"),
                <Home className="h-4 w-4 shrink-0" />,
                true
              )}
              {navLink(
                "/nouveautes",
                t("nav.new"),
                <Sparkles className="h-4 w-4 shrink-0" />
              )}
              {navLink(
                "/recommandes",
                t("nav.recommended"),
                <Star className="h-4 w-4 shrink-0" />
              )}
              {navLink(
                "/categories",
                t("nav.categories"),
                <Shapes className="h-4 w-4 shrink-0" />
              )}
              {navLink(
                "/panier",
                t("nav.myCart"),
                <ShoppingCart className="h-4 w-4 shrink-0" />
              )}

              {sectionLabel(t("nav.account"))}
              {customer ? (
                <>
                  {navLink(
                    "/compte",
                    t("nav.myOrders"),
                    <UserRound className="h-4 w-4 shrink-0" />
                  )}
                  {navLink(
                    "/notifications",
                    t("nav.myNotifications"),
                    <Bell className="h-4 w-4 shrink-0" />
                  )}
                </>
              ) : (
                <>
                  {navLink(
                    "/connexion",
                    t("nav.login"),
                    <UserRound className="h-4 w-4 shrink-0" />
                  )}
                  {navLink(
                    "/inscription",
                    t("nav.createAccount"),
                    <Package className="h-4 w-4 shrink-0" />
                  )}
                </>
              )}
            </nav>

            <div className="mt-auto space-y-2 border-t border-border/50 p-3">
              {customer ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    closeMenu();
                    history.push("/");
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-brand-soft/35 active:scale-[0.98]"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </button>
              ) : (
                <>
                  <Link
                    to="/connexion"
                    onClick={closeMenu}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-lg shadow-brand/35 transition duration-200 hover:-translate-y-0.5 hover:bg-brand/90"
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    to="/inscription"
                    onClick={closeMenu}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-panel/80 px-3 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-panel"
                  >
                    {t("nav.createAccount")}
                  </Link>
                </>
              )}
            </div>
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
