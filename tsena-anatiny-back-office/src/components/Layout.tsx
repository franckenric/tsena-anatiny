import { useEffect, useState, type ReactNode } from "react";
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
  Users,
  X
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
  { label: "Lots", href: "/lots", icon: ScanBarcode },
  { label: "Mouvements", href: "/stock-movements", icon: ScanBarcode },
  { label: "Catégories", href: "/categories", icon: Shapes },
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
  { label: "Stock", href: "/stock", icon: Boxes }
];

export function Layout({ children, title }: LayoutProps) {
  const { logout, user } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const go = (href: string) => {
    setMenuOpen(false);
    history.push(href);
  };

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-warning text-white shadow-lg shadow-brand/30">
        <Package className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          Tsena Anatiny
        </p>
        <p className="font-display text-base font-bold leading-none text-ink">
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
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition active:scale-[0.98]",
          active
            ? "bg-brand/15 text-brand"
            : "text-muted hover:bg-brand/10 hover:text-ink"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {item.label}
      </button>
    );
  };

  const logoutButton = (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-brand-soft/35 active:scale-[0.98]"
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
      <header>
        <div className="border-b border-border/70 bg-panel/90 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-bg active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center">
              <h1 className="truncate font-display text-lg font-bold text-ink">
                {title}
              </h1>
            </div>

            <NotificationsBell />

            <button
              type="button"
              onClick={logout}
              aria-label="Se déconnecter"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-bg hover:text-ink active:scale-95"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none">
        <main className="animate-fade-up flex min-h-full flex-col gap-6 px-3 pt-3 sm:px-5">
          {children}
        </main>
      </div>

      <div
        className="shrink-0 bg-panel/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <nav className="border-t border-border">
          <div className="mx-auto flex h-11 max-w-7xl items-stretch">
          {tabItems.map((tab) => {
            const active = isActive(tab.href);
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => go(tab.href)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition active:scale-95",
                  active ? "text-brand" : "text-muted"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
        </nav>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border/60 bg-panel/95 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
              {brand}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel text-muted transition hover:border-brand/40 hover:text-brand active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                {(user?.email ?? user?.phone_numer ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {user?.email || user?.phone_numer || "Administrateur"}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {user?.email ? (user.phone_numer ?? "") : ""}
                </p>
              </div>
            </div>

            <nav className="space-y-1 px-3 py-4">
              {navItems.map(renderNavItem)}
            </nav>

            <div className="mt-auto space-y-2 border-t border-border/50 p-3">
              {logoutButton}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
