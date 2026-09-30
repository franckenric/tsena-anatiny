import { Link, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useI18n } from "../contexts/I18nContext";
import { BOTTOM_NAV_ITEMS, isNavActive } from "../lib/nav";
import { cn } from "../lib/utils";

export function BottomNav() {
  const { count } = useCart();
  const { t } = useI18n();
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navigation rapide"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-panel/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCart = item.to === "/panier";
          const active = isNavActive(pathname, item.to, item.exact);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors",
                  active ? "text-brand" : "text-muted"
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-transform duration-200",
                      active && "scale-110"
                    )}
                  />
                  {isCart && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-sm">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                <span className="truncate">{t(item.labelKey)}</span>
                {active && (
                  <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
