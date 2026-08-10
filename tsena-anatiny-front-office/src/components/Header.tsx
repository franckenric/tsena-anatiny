import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useHistory, useLocation } from "react-router-dom";
import { IonHeader } from "@ionic/react";
import { Menu, Search, ShoppingBag, UserRound, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useCartDrawer } from "../contexts/CartDrawerContext";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { categoriesService } from "../services/categories.service";
import type { Category } from "../types/product";
import { cn } from "../lib/utils";

export function Header() {
  const { customer, isBooting, logout } = useAuth();
  const { count } = useCart();
  const { openCart } = useCartDrawer();
  const { openMenu } = useMobileMenu();
  const history = useHistory();
  const { search } = useLocation();

  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const activeCategory = (() => {
    const raw = new URLSearchParams(search).get("cat");
    const parsed = Number(raw);
    return raw && Number.isFinite(parsed) ? parsed : null;
  })();

  useEffect(() => {
    let cancelled = false;
    categoriesService
      .getCategories()
      .then((res) => {
        if (!cancelled) {
          setCategories(
            (res.items ?? []).filter(
              (c) => !c.status || c.status !== "inactive"
            )
          );
        }
      })
      .catch(() => {
        // barre de catégories optionnelle
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    history.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  return (
    <IonHeader className="ion-no-border">
      <div className="border-b border-border bg-panel/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={openMenu}
            aria-label="Ouvrir le menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-bg md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="hidden text-lg font-bold text-ink sm:block">
              Tsena&nbsp;Anatiny
            </span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="relative mx-auto hidden w-full max-w-md flex-1 md:block"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-bg hover:text-ink"
              aria-label="Ouvrir le panier"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>

            {isBooting ? null : customer ? (
              <div className="flex items-center gap-1.5">
                <NavLink
                  to="/compte"
                  className={(isActive) =>
                    cn(
                      "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition hover:bg-bg",
                      isActive ? "bg-brand-soft text-brand" : "text-ink"
                    )
                  }
                >
                  <UserRound className="h-4 w-4" />
                  <span className="hidden max-w-32 truncate lg:block">
                    {customer.name}
                  </span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    history.push("/");
                  }}
                  className="hidden h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-bg hover:text-ink sm:flex"
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Link
                  to="/connexion"
                  className="flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-ink transition hover:bg-bg"
                >
                  Connexion
                </Link>
                <Link
                  to="/inscription"
                  className="flex h-10 items-center rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand/90"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="relative border-t border-border/60 px-4 py-2 md:hidden"
        >
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </form>

        {categories.length > 0 && (
          <nav
            aria-label="Catégories"
            className="scrollbar-hide -mx-1 overflow-x-auto border-t border-border/60 px-1 py-2 sm:px-5"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-1.5">
              <Link
                to="/"
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                  activeCategory == null
                    ? "bg-ink text-white"
                    : "text-muted hover:bg-bg hover:text-ink"
                )}
              >
                Tout
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/?cat=${c.id}`}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                    activeCategory === c.id
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-bg hover:text-ink"
                  )}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </IonHeader>
  );
}
