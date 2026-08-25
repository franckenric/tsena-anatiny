import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Bell,
  Boxes,
  ClipboardList,
  ContactRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScanBarcode,
  Shapes,
  ShoppingCart,
  TicketPercent,
  Truck,
  Users,
  X,
  ChevronRight,
  User,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { NotificationsBell } from "./NotificationsBell";
import { cn } from "../lib/utils";

interface LayoutProps {
  children: ReactNode;
  title: string;
}

const navItems = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Commandes", href: "/orders", icon: ShoppingCart },
  { label: "Produits", href: "/products", icon: Package },
  { label: "Stock", href: "/stock", icon: Boxes },
  { label: "Arrivages", href: "/arrivals", icon: Truck },
  { label: "Lots", href: "/lots", icon: ScanBarcode },
  { label: "Mouvements", href: "/stock-movements", icon: ScanBarcode },
  { label: "Catégories", href: "/categories", icon: Shapes },
  { label: "Codes promo", href: "/promo-codes", icon: TicketPercent },
  { label: "Clients", href: "/customers", icon: ContactRound },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Utilisateurs", href: "/users", icon: Users },
  {
    label: "Affectations",
    href: "/commercial-assignments",
    icon: ClipboardList
  }
];

const tabItems = [
  { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Commandes", href: "/orders", icon: ShoppingCart },
  { label: "Produits", href: "/products", icon: Package },
  { label: "Stock", href: "/stock", icon: Boxes },
  { label: "Arrivages", href: "/arrivals", icon: Truck }
];

export function Layout({ children, title }: LayoutProps) {
  const { logout, user } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const go = (href: string) => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    history.push(href);
  };

  const userInitial = (user?.email ?? user?.phone_numer ?? "?")
    .charAt(0)
    .toUpperCase();

  const brand = (
    <div className="flex items-center gap-3">
      <img src="/logo.png" alt="Tsena Anatiny" className="h-11 w-11 shrink-0 rounded-2xl object-contain shadow-lg shadow-brand/25" />
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted">
          Tsena Anatiny
        </p>
        <p className="font-display text-base font-bold leading-tight text-ink">
          Back Office
        </p>
      </div>
    </div>
  );

  const renderNavItem = (item: (typeof navItems)[number]) => {
    const active = isActive(item.href);
    return (
      <button
        key={item.href}
        type="button"
        onClick={() => go(item.href)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
          active
            ? "bg-brand text-white shadow-md shadow-brand/25"
            : "text-muted hover:bg-brand/10 hover:text-ink"
        )}
      >
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition",
            active ? "text-white" : "text-muted group-hover:text-brand"
          )}
        />
        <span className="flex-1 text-left">{item.label}</span>
        {active && (
          <ChevronRight className="h-3.5 w-3.5 text-white/70" />
        )}
      </button>
    );
  };

  const logoutButton = (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/8 px-3 text-sm font-bold text-warning transition-all hover:border-warning/50 hover:bg-warning/15 active:scale-[0.98]"
    >
      <LogOut className="h-4 w-4" />
      Se déconnecter
    </button>
  );

  return (
    <div
      className="bg-bg fixed inset-0 flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <header className="shrink-0">
        <div className="border-b border-border/50 bg-panel/80 shadow-[0_1px_3px_hsl(var(--ink)/0.04)] backdrop-blur-xl">
          <div className="flex h-13 items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-brand/10 hover:text-brand active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 overflow-hidden">
              <img src="/logo.png" alt="Tsena Anatiny" className="h-7 w-7 shrink-0 rounded-lg object-contain shadow-sm shadow-brand/15" />
              <h1 className="truncate font-display text-base font-bold text-ink">
                {title}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <NotificationsBell />

              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex h-9 items-center gap-1.5 rounded-xl pl-1 pr-1.5 transition hover:bg-brand/10 active:scale-95"
                  aria-label="Menu utilisateur"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[hsl(30,90%,55%)] text-[10px] font-bold text-white shadow-md shadow-brand/20">
                    {userInitial}
                  </div>
                  <ChevronDown className={cn("hidden h-3 w-3 text-muted transition-transform sm:block", userMenuOpen && "rotate-180")} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-up overflow-hidden rounded-2xl border border-border/60 bg-panel shadow-lift">
                    <div className="border-b border-border/40 px-4 py-3">
                      <p className="truncate text-sm font-bold text-ink">
                        {user?.email || user?.phone_numer || "Administrateur"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {user?.email ? "Compte admin" : user?.phone_numer ?? ""}
                      </p>
                    </div>
                    <div className="py-1.5">
                      <button
                        type="button"
                        onClick={() => go("/users")}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-brand/5"
                      >
                        <User className="h-4 w-4 text-muted" />
                        Mon profil
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/5"
                      >
                        <LogOut className="h-4 w-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none">
        <main className="animate-fade-up flex min-h-full flex-col gap-6 px-3 pt-3 sm:px-5">
          {children}
        </main>
      </div>

      <div
        className="shrink-0 border-t border-border/40 bg-panel/90 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <nav className="mx-auto flex h-14 max-w-lg items-stretch px-1">
          {tabItems.map((tab) => {
            const active = isActive(tab.href);
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => go(tab.href)}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200",
                  active ? "text-brand" : "text-muted"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-brand" />
                )}
                <tab.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    active && "scale-110"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-bold transition",
                    active ? "text-brand" : ""
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col border-r border-border/40 bg-panel/95 backdrop-blur-2xl animate-slide-in-left">
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
              {brand}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-bg text-muted transition hover:border-brand/40 hover:text-brand active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-border/40 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[hsl(30,90%,55%)] text-base font-bold text-white shadow-md shadow-brand/20">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {user?.email || user?.phone_numer || "Administrateur"}
                </p>
                <p className="truncate text-xs text-muted">
                  {user?.email ? (user.phone_numer ?? "") : "Compte admin"}
                </p>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map(renderNavItem)}
            </nav>

            <div className="border-t border-border/40 p-3">
              {logoutButton}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
