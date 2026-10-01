import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { LogOut, ShoppingBag, X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useAuthModal } from "./AuthModalContext";
import { useI18n } from "./I18nContext";
import { SHOP_ITEMS, accountSectionItems, isNavActive } from "../lib/nav";
import { cn } from "../lib/utils";

interface MobileMenuContextValue {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const { customer, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useI18n();
  const history = useHistory();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  const openAuth = useCallback(
    (mode: "login" | "register") => {
      closeMenu();
      openAuthModal(mode);
    },
    [closeMenu, openAuthModal]
  );

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

  const value = useMemo(
    () => ({ isOpen, openMenu, closeMenu }),
    [isOpen, openMenu, closeMenu]
  );

  const initials = (customer?.name || "?").trim().charAt(0).toUpperCase();
  const firstName = (customer?.name ?? "").trim().split(" ")[0] ?? "";
  const accountItems = accountSectionItems(Boolean(customer));

  const navLink = (
    to: string,
    label: string,
    icon: ReactNode,
    exact = false
  ) => {
    const active = isNavActive(pathname, to, exact);
    return (
      <Link
        to={to}
        onClick={closeMenu}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition active:scale-[0.98]",
          active
            ? "bg-brand/15 text-brand"
            : "text-muted hover:bg-brand/10 hover:text-ink"
        )}
      >
        {icon}
        {label}
      </Link>
    );
  };

  const sectionLabel = (label: string) => (
    <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
      {label}
    </p>
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
                    {customer.email}
                  </p>
                </div>
              </div>
            )}

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
              {sectionLabel(t("nav.shop"))}
              {SHOP_ITEMS.map((item) => {
                const Icon = item.icon;
                return navLink(
                  item.to,
                  t(item.labelKey),
                  <Icon className="h-4 w-4 shrink-0" />,
                  item.exact
                );
              })}
              {navLink(
                "/panier",
                t("nav.myCart"),
                <ShoppingBag className="h-4 w-4 shrink-0" />
              )}

              {sectionLabel(t("nav.account"))}
              {accountItems.map((item) => {
                const Icon = item.icon;
                const { authModalMode } = item;
                if (authModalMode) {
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => openAuth(authModalMode)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-muted transition hover:bg-brand/10 hover:text-ink active:scale-[0.98]"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {t(item.labelKey)}
                    </button>
                  );
                }
                return navLink(
                  item.to,
                  t(item.labelKey),
                  <Icon className="h-4 w-4 shrink-0" />,
                  item.exact
                );
              })}
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
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-lg shadow-brand/35 transition duration-200 hover:-translate-y-0.5 hover:bg-brand/90"
                  >
                    {t("nav.login")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel/80 px-3 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-panel"
                  >
                    {t("nav.createAccount")}
                  </button>
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
