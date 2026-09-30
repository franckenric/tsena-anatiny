import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useI18n } from "../contexts/I18nContext";
import { DESKTOP_NAV_ITEMS, accountSectionItems } from "../lib/nav";
import { useAuth } from "../contexts/AuthContext";

export function Footer() {
  const { t } = useI18n();
  const { customer } = useAuth();
  const accountItems = accountSectionItems(Boolean(customer));

  return (
    <footer className="mt-auto hidden border-t border-border/60 bg-panel/60 lg:block">
      <div className="page-shell grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Tsena Anatiny"
              className="h-8 w-8 rounded-xl object-contain"
            />
            <span className="font-display text-base font-bold text-ink">
              Tsena&nbsp;Anatiny
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            {t("home.heroSub")}
          </p>
        </div>

        <nav aria-labelledby="footer-shop">
          <h2
            id="footer-shop"
            className="text-xs font-bold uppercase tracking-[0.16em] text-muted"
          >
            {t("nav.shop")}
          </h2>
          <ul className="mt-3 space-y-2">
            {DESKTOP_NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm font-medium text-ink/80 transition hover:text-brand"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-account">
          <h2
            id="footer-account"
            className="text-xs font-bold uppercase tracking-[0.16em] text-muted"
          >
            {t("nav.account")}
          </h2>
          <ul className="mt-3 space-y-2">
            {accountItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm font-medium text-ink/80 transition hover:text-brand"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            {t("home.trust.cod")}
          </h2>
          <ul className="mt-3 space-y-2 text-sm font-medium text-ink/80">
            <li>{t("home.trust.fastDelivery")}</li>
            <li>{t("home.trust.easyReturns")}</li>
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <ShoppingBag className="h-3.5 w-3.5" />
            {t("pwa.installHint")}
          </p>
        </div>
      </div>

      <div className="border-t border-border/60 py-4">
        <p className="page-shell text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} Tsena Anatiny — {t("nav.brandSub")}
        </p>
      </div>
    </footer>
  );
}
