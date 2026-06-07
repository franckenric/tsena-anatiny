import { NavLink } from "react-router-dom";
import {
  Home,
  Package,
  Users,
  Link,
  ShoppingCart,
  Boxes,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const navigation = [
  { name: "Tableau de bord", href: "/", icon: Home },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Commerciaux", href: "/commercials", icon: Users },
  { name: "Assignations", href: "/assignments", icon: Link },
  { name: "Commandes", href: "/orders", icon: ShoppingCart },
  { name: "Stock", href: "/stock", icon: Boxes },
];

function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-secondary text-white transition-transform lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <h1 className="text-lg font-bold text-primary">TsenaAnatiny</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/10"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}

          {/* Paramètres (admin seulement) */}
          {isAdmin && (
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Settings className="h-5 w-5" />
              Paramètres
            </NavLink>
          )}
        </nav>

        {/* Footer sidebar */}
        <div className="border-t border-white/10 p-4">
          <p className="text-xs text-white/50">© 2024 TsenaAnatiny</p>
        </div>
      </aside>
    </>
  );
}

export { Sidebar };
