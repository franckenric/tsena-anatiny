import { useEffect, useRef, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { IonHeader } from "@ionic/react";
import { Menu, ShoppingBag, LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useCartDrawer } from "../contexts/CartDrawerContext";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { useI18n } from "../contexts/I18nContext";
import { NotificationsBell } from "./NotificationsBell";
import { cn } from "../lib/utils";

export function Header() {
  const { customer, isBooting, logout } = useAuth();
  const { count } = useCart();
  const { openCart } = useCartDrawer();
  const { openMenu } = useMobileMenu();
  const { t, language, setLanguage } = useI18n();
  const history = useHistory();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userMenuOpen]);

  return (
    <IonHeader className="ion-no-border">
      <div
        className="border-b border-border/40 bg-panel/80 shadow-[0_1px_3px_hsl(var(--ink)/0.04)] backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-13 max-w-7xl items-center gap-2 px-3 sm:px-5">
          <button
            type="button"
            onClick={openMenu}
            aria-label={t("header.openMenu")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-brand/10 hover:text-brand active:scale-95 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/logo.png" alt="Tsena Anatiny" className="h-7 w-7 rounded-xl object-contain shadow-md shadow-brand/20" />
            <span className="hidden text-lg font-display font-bold text-ink sm:block">
              Tsena&nbsp;Anatiny
            </span>
          </Link>

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

            <button
              type="button"
              onClick={openCart}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand/10 hover:text-brand active:scale-95"
              aria-label={t("header.openCart")}
            >
              <ShoppingBag className="h-4.5 w-4.5" />
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
                    className="flex h-9 items-center gap-1.5 rounded-xl pl-1.5 pr-2 text-sm font-semibold transition-all hover:bg-brand/10 active:scale-[0.98]"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[hsl(30,90%,55%)] text-[10px] font-bold text-white shadow-sm">
                      {customer.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <span className="hidden max-w-20 truncate lg:block text-xs text-ink">
                      {customer.name}
                    </span>
                    <ChevronDown className={cn("hidden h-3 w-3 text-muted transition-transform lg:block", userMenuOpen && "rotate-180")} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 animate-fade-up overflow-hidden rounded-2xl border border-border/60 bg-panel shadow-lift">
                      <div className="border-b border-border/40 px-4 py-3">
                        <p className="truncate text-sm font-bold text-ink">{customer.name}</p>
                        {customer.phone && (
                          <p className="truncate text-xs text-muted">{customer.phone}</p>
                        )}
                      </div>
                      <div className="py-1.5">
                        <Link
                          to="/compte"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-brand/5"
                        >
                          <User className="h-4 w-4 text-muted" />
                          {t("nav.account")}
                        </Link>
                        <button
                          type="button"
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
                <Link
                  to="/connexion"
                  className="flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-ink transition hover:bg-bg active:scale-[0.98]"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/inscription"
                  className="flex h-9 items-center rounded-xl bg-gradient-to-r from-brand to-[hsl(30,90%,55%)] px-3 text-sm font-bold text-white shadow-md shadow-brand/20 transition-all hover:shadow-lg hover:shadow-brand/30 active:scale-[0.98]"
                >
                  {t("nav.createAccount")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </IonHeader>
  );
}
