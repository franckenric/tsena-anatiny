import { Bell, Home, Shapes, ShoppingCart, Sparkles, Star, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavSection {
  labelKey: string;
  items: NavItem[];
}

export const SHOP_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home, exact: true },
  { to: "/nouveautes", labelKey: "nav.new", icon: Sparkles },
  { to: "/recommandes", labelKey: "nav.recommended", icon: Star },
  { to: "/categories", labelKey: "nav.categories", icon: Shapes }
];

/** Liens visibles dans la barre de navigation horizontale (desktop). */
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  ...SHOP_ITEMS,
  { to: "/panier", labelKey: "nav.myCart", icon: ShoppingCart }
];

/** Onglets de la barre inférieure (mobile). */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.shop", icon: Home, exact: true },
  { to: "/panier", labelKey: "nav.cart", icon: ShoppingCart },
  { to: "/compte", labelKey: "nav.account", icon: UserRound }
];

export function accountSectionItems(isLoggedIn: boolean): NavItem[] {
  if (isLoggedIn) {
    return [
      { to: "/compte", labelKey: "nav.myOrders", icon: UserRound },
      { to: "/notifications", labelKey: "nav.myNotifications", icon: Bell }
    ];
  }
  return [
    { to: "/connexion", labelKey: "nav.login", icon: UserRound },
    { to: "/inscription", labelKey: "nav.createAccount", icon: UserRound }
  ];
}

export const NAV_SECTIONS: NavSection[] = [
  { labelKey: "nav.shop", items: SHOP_ITEMS }
];

/**
 * react-router v5 ne type pas les enfants-fonction de <NavLink>, on calcule
 * donc l'etat actif a partir du pathname courant.
 */
export function isNavActive(
  pathname: string,
  to: string,
  exact = false
): boolean {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}
