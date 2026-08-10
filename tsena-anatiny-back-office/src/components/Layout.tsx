import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
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

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const navItems = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Utilisateurs", href: "/users", icon: Users },
  { label: "Produits", href: "/products", icon: Package },
  { label: "Catégories", href: "/categories", icon: Shapes },
  { label: "Stock", href: "/stock", icon: Boxes },
  { label: "Lots", href: "/lots", icon: ScanBarcode },
  { label: "Mouvements", href: "/stock-movements", icon: ScanBarcode },
  { label: "Commandes", href: "/orders", icon: ShoppingCart },
  { label: "Clients", href: "/customers", icon: ContactRound },
  {
    label: "Affectations",
    href: "/commercial-assignments",
    icon: ClipboardList
  }
];

export function Layout({ children, title, subtitle }: LayoutProps) {
  const { logout } = useAuth();
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

  const brand = (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-warning text-white shadow-lg shadow-brand/30">
        <Package className="h-4 w-4" />
      </div>
      <div className="text-left">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
          Tsena Anatiny
        </p>
        <p className="font-display text-lg font-bold leading-none text-ink">
          Back Office
        </p>
      </div>
    </div>
  );

  const nav = (
    <nav className="space-y-1 px-3 py-4 sm:flex-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={() => setMenuOpen(false)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            isActive(item.href)
              ? "bg-brand/20 text-brand"
              : "text-muted hover:bg-brand/10 hover:text-ink"
          }`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const logoutButton = (
    <div className="border-t border-border/50 p-2 sm:p-3">
      <button
        type="button"
        onClick={logout}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft/35"
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </button>
    </div>
  );

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_0%_10%,hsl(var(--brand-soft)/0.35),transparent_26%),radial-gradient(circle_at_95%_5%,hsl(var(--warning)/0.15),transparent_28%),linear-gradient(155deg,hsl(var(--bg)),hsl(var(--panel)))]" />
      <div className="absolute -left-24 top-10 -z-20 h-72 w-72 rounded-full border border-brand/20 bg-brand/10 blur-3xl" />
      <div className="absolute -right-24 bottom-16 -z-20 h-80 w-80 rounded-full border border-warning/20 bg-warning/10 blur-3xl" />

      <div className="flex h-screen flex-col lg:flex-row">
        {/* Barre supérieure mobile/tablette */}
        <header className="flex items-center justify-between border-b border-border/60 bg-panel/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          {brand}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel text-ink transition hover:border-brand/40 hover:text-brand"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Sidebar desktop */}
        <aside className="hidden flex-col border-b border-border/60 bg-panel/80 backdrop-blur-xl lg:flex lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-6 sm:justify-start sm:px-5">
            {brand}
          </div>
          {nav}
          {logoutButton}
        </aside>

        {/* Drawer mobile/tablette */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border/60 bg-panel/95 backdrop-blur-xl sm:max-w-sm">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-5">
                {brand}
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fermer le menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel text-muted transition hover:border-brand/40 hover:text-brand"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {nav}
              {logoutButton}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-hidden px-4 py-6 lg:px-8">
            <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col">
              <div className="animate-fade-up mb-6 rounded-2xl border border-border/60 bg-panel/70 p-5 backdrop-blur xl:p-6">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-bg/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Espace professionnel
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
