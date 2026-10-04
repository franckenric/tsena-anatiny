import { useEffect, useRef, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, LogOut, User, ChevronDown, Download, Bell } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { useCart } from "../contexts/CartContext";
import { useCartDrawer } from "../contexts/CartDrawerContext";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { useI18n } from "../contexts/I18nContext";
import { usePwa } from "../contexts/PwaContext";
import { useCurrentPageTitle } from "../contexts/PageTitleContext";
import { NotificationsBell } from "./NotificationsBell";
import { DESKTOP_NAV_ITEMS, isNavActive } from "../lib/nav";
import { cn } from "../lib/utils";

export function Header() {
  const { customer, isBooting, logout } = useAuth();
  const { showLogin, showRegister } = useAuthModal();
  const { count } = useCart();
  const { openCart } = useCartDrawer();
  const { openMenu } = useMobileMenu();
  const { t, language, setLanguage } = useI18n();
  const { canInstall, promptInstall } = usePwa();
  const pageTitle = useCurrentPageTitle();
  const history = useHistory();
  const { pathname } = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-panel/85 backdrop-blur-xl transition-shadow duration-200",
        isScrolled
          ? "border-border/70 shadow-[0_1px_3px_hsl(var(--ink)/0.06)]"
          : "border-transparent"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="page-shell flex h-14 items-center gap-2 sm:h-16">
        <button
          type="button"
          onClick={openMenu}
          aria-label={t("header.openMenu")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-brand/10 hover:text-brand active:scale-95 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Comme le back-office : le titre de la page remplace le nom de la
            marque sur petit ecran. `min-w-0` + `truncate` garantissent que le
            titre se coupe plutot que de pousser les controles de droite. */}
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Tsena Anatiny"
            className="h-7 w-7 shrink-0 rounded-xl object-contain shadow-md shadow-brand/20 sm:h-8 sm:w-8"
          />
          <span className="truncate font-display text-base font-bold text-ink sm:text-lg lg:hidden">
            {pageTitle || t("nav.shop")}
          </span>
          <span className="hidden font-display text-lg font-bold text-ink lg:block">
            Tsena&nbsp;Anatiny
          </span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="ml-4 hidden items-center gap-0.5 lg:flex xl:ml-8"
        >
          {DESKTOP_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "text-brand"
                    : "text-muted hover:bg-brand/5 hover:text-ink"
                )}
              >
                {t(item.labelKey)}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <div
            role="group"
            aria-label="Langue"
            className="hidden items-center overflow-hidden rounded-full border border-border/60 bg-bg/80 sm:flex"
          >
            {(["fr", "mg"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                aria-pressed={language === lang}
                className={cn(
                  "h-7 px-2 text-[10px] font-bold uppercase tracking-wide transition-all",
                  language === lang
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted hover:bg-bg hover:text-ink"
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          {canInstall && (
            <button
              type="button"
              onClick={promptInstall}
              className="hidden h-9 items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-soft/50 px-2.5 text-xs font-bold text-brand transition hover:bg-brand-soft md:inline-flex"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{t("pwa.install")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (customer) {
                openCart();
                return;
              }
              showLogin({
                onSuccess: () => {
                  openCart();
                }
              });
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand/10 hover:text-brand active:scale-95"
            aria-label={t("header.openCart")}
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-sm">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>

          {isBooting ? null : customer ? (
            <div className="flex items-center gap-1">
              <NotificationsBell />
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex h-9 items-center gap-1.5 rounded-xl pl-1.5 pr-2 text-sm font-semibold transition-all hover:bg-brand/10 active:scale-[0.98]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[hsl(30,90%,55%)] text-[10px] font-bold text-white shadow-sm">
                    {customer.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden max-w-24 truncate text-xs text-ink lg:block">
                    {customer.name}
                  </span>
                  <ChevronDown
                    className={cn(
                      "hidden h-3 w-3 text-muted transition-transform lg:block",
                      userMenuOpen && "rotate-180"
                    )}
                  />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-52 animate-fade-up overflow-hidden rounded-2xl border border-border/60 bg-panel shadow-lift"
                  >
                    <div className="border-b border-border/40 px-4 py-3">
                      <p className="truncate text-sm font-bold text-ink">
                        {customer.name}
                      </p>
                      {customer.email && (
                        <p className="truncate text-xs text-muted">
                          {customer.email}
                        </p>
                      )}
                    </div>
                    <div className="py-1.5">
                      <Link
                        to="/compte"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-brand/5"
                      >
                        <User className="h-4 w-4 text-muted" />
                        {t("nav.account")}
                      </Link>
                      <Link
                        to="/notifications"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-brand/5"
                      >
                        <Bell className="h-4 w-4 text-muted" />
                        {t("nav.myNotifications")}
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                          history.push("/");
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/5"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("header.logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => showLogin()}
                className="flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-ink transition hover:bg-bg active:scale-[0.98]"
              >
                {t("nav.login")}
              </button>
              <button
                type="button"
                onClick={() => showRegister()}
                className="flex h-9 items-center rounded-xl bg-gradient-to-r from-brand to-[hsl(30,90%,55%)] px-3 text-sm font-bold text-white shadow-md shadow-brand/20 transition-all hover:shadow-lg hover:shadow-brand/30 active:scale-[0.98]"
              >
                {t("nav.createAccount")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
