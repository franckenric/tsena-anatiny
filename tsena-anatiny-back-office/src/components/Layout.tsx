import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
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
  User,
  ChevronDown,
  FileUp
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
  { label: "Clients", href: "/customers", icon: ContactRound },
  { label: "Import receipt", href: "/products/import-receipt", icon: FileUp },
  { label: "Mouvements", href: "/stock-movements", icon: ScanBarcode },
  { label: "Catégories", href: "/categories", icon: Shapes },
  { label: "Codes promo", href: "/promo-codes", icon: TicketPercent },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Utilisateurs", href: "/users", icon: Users },
  {
    label: "Affectations",
    href: "/commercial-assignments",
    icon: ClipboardList
  }
];

const PRIMARY_HREFS = [
  "/dashboard",
  "/orders",
  "/products",
  "/stock",
  "/arrivals",
  "/lots",
  "/customers"
];

const primaryNavItems = navItems.filter((item) =>
  PRIMARY_HREFS.includes(item.href)
);
const moreNavItems = navItems.filter(
  (item) => !PRIMARY_HREFS.includes(item.href)
);

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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
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
    if (!userMenuOpen && !moreMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userMenuOpen, moreMenuOpen]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const go = (href: string) => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
    history.push(href);
  };

  const userInitial = (user?.email ?? user?.phone_numer ?? "?")
    .charAt(0)
    .toUpperCase();

  const brand = (
    <div className="flex items-center gap-3">
      <img
        src="/logo.png"
        alt="Tsena Anatiny"
        className="h-11 w-11 shrink-0 rounded-2xl object-contain shadow-lg shadow-brand/25"
      />
      <div className="text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
          Tsena Anatiny
        </p>
        <p className="font-display text-base font-bold leading-tight text-ink">
          Back Office
        </p>
      </div>
    </div>
  );

  const renderDrawerNavItem = (item: (typeof navItems)[number]) => {
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
      </button>
    );
  };

  const renderDesktopNavItem = (item: (typeof navItems)[number]) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        to={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
          active ? "text-brand" : "text-muted hover:bg-brand/5 hover:text-ink"
        )}
      >
        {item.label}
        {active && (
          <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
        )}
      </Link>
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
    <div className="flex min-h-dvh flex-col bg-bg">
      <header
        className="sticky top-0 z-50 w-full border-b border-border/60 bg-panel/85 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="page-shell flex h-14 items-center gap-2 sm:h-16">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-brand/10 hover:text-brand active:scale-95 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/dashboard"
            className="flex min-w-0 shrink items-center gap-2.5"
          >
            <img
              src="/logo.png"
              alt="Tsena Anatiny"
              className="h-7 w-7 shrink-0 rounded-xl object-contain shadow-md shadow-brand/20 sm:h-8 sm:w-8"
            />
            <span className="truncate font-display text-base font-bold text-ink sm:text-lg lg:hidden">
              {title}
            </span>
            <span className="hidden font-display text-lg font-bold text-ink lg:block">
              Tsena&nbsp;Anatiny
            </span>
          </Link>

          <nav
            aria-label="Navigation principale"
            className="ml-4 hidden items-center gap-0.5 lg:flex xl:ml-8"
          >
            {primaryNavItems.map(renderDesktopNavItem)}

            {moreNavItems.length > 0 && (
              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                  className={cn(
                    "flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    moreNavItems.some((item) => isActive(item.href))
                      ? "text-brand"
                      : "text-muted hover:bg-brand/5 hover:text-ink"
                  )}
                >
                  Plus
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      moreMenuOpen && "rotate-180"
                    )}
                  />
                </button>

                {moreMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-2 w-60 animate-fade-up overflow-hidden rounded-2xl border border-border/60 bg-panel shadow-lift"
                  >
                    <div className="py-1.5">
                      {moreNavItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            role="menuitem"
                            onClick={() => setMoreMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition",
                              active
                                ? "bg-brand/5 text-brand"
                                : "text-ink hover:bg-brand/5"
                            )}
                          >
                            <item.icon className="h-4 w-4 text-muted" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

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
                <ChevronDown
                  className={cn(
                    "hidden h-3 w-3 text-muted transition-transform sm:block",
                    userMenuOpen && "rotate-180"
                  )}
                />
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
      </header>

      <main className="page-shell animate-fade-up flex flex-1 flex-col gap-6 pb-24 pt-4 lg:pb-10 lg:pt-6">
        {children}
      </main>

      <footer className="border-t border-border/50 bg-panel/60 backdrop-blur">
        <div className="page-shell flex flex-col gap-1 py-6 pb-24 text-xs text-muted sm:flex-row sm:items-center sm:justify-between lg:pb-6">
          <p>© {new Date().getFullYear()} Tsena Anatiny — Back Office</p>
          <p>Réservé au personnel autorisé</p>
        </div>
      </footer>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-panel/90 backdrop-blur-xl lg:hidden"
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
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          <div className="animate-slide-in-left absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col border-r border-border/40 bg-panel/95 backdrop-blur-2xl">
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
              {navItems.map(renderDrawerNavItem)}
            </nav>

            <div className="border-t border-border/40 p-3">{logoutButton}</div>
          </div>
        </div>
      )}
    </div>
  );
}
