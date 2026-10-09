import { Link } from "react-router-dom";
import {
  ArrowUp,
  Banknote,
  ChevronRight,
  Download,
  ShieldCheck,
  Truck
} from "lucide-react";
import { useI18n } from "../contexts/I18nContext";
import { DESKTOP_NAV_ITEMS, accountSectionItems } from "../lib/nav";
import { useAuth } from "../contexts/AuthContext";
import { usePwa } from "../contexts/PwaContext";
import { cn } from "../lib/utils";

const TRUST = [
  { icon: Banknote, labelKey: "home.trust.cod" },
  { icon: Truck, labelKey: "home.trust.fastDelivery" },
  { icon: ShieldCheck, labelKey: "home.trust.easyReturns" }
];

function ColumnHeading({
  id,
  children
}: {
  id?: string;
  children: string;
}) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      {children}
    </h2>
  );
}

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-1.5 text-sm font-medium text-ink/70 transition-colors hover:text-brand"
    >
      <span>{label}</span>
      <ChevronRight className="h-3.5 w-3.5 translate-x-0 text-brand opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}

export function Footer() {
  const { t, language, setLanguage } = useI18n();
  const { customer } = useAuth();
  const { canInstall, promptInstall } = usePwa();
  const accountItems = accountSectionItems(Boolean(customer));
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative mt-auto hidden overflow-hidden border-t border-border/60 bg-gradient-to-b from-panel to-bg/60 lg:block">
      {/* Halo décoratif : rappelle le dégradé de l'en-tête de la page d'accueil. */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[42rem] -translate-x-1/2 rounded-full bg-brand-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      <div className="page-shell relative grid gap-10 py-12 lg:grid-cols-12 lg:gap-8">
        {/* Marque */}
        <div className="lg:col-span-4">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Tsena Anatiny"
              className="h-9 w-9 rounded-xl object-contain shadow-md shadow-brand/20"
            />
            <span className="font-display text-lg font-bold text-ink">
              Tsena&nbsp;Anatiny
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            {t("home.heroSub")}
          </p>

          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            <span>{t("pwa.installHint")}</span>
          </p>

          {canInstall && (
            <button
              type="button"
              onClick={promptInstall}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/50 px-3.5 text-xs font-bold text-brand transition hover:bg-brand-soft active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              {t("pwa.install")}
            </button>
          )}
        </div>

        {/* Boutique */}
        <nav aria-labelledby="footer-shop" className="lg:col-span-2">
          <ColumnHeading id="footer-shop">{t("nav.shop")}</ColumnHeading>
          <ul className="mt-4 space-y-2.5">
            {DESKTOP_NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <FooterLink to={item.to} label={t(item.labelKey)} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Compte */}
        <nav aria-labelledby="footer-account" className="lg:col-span-2">
          <ColumnHeading id="footer-account">{t("nav.account")}</ColumnHeading>
          <ul className="mt-4 space-y-2.5">
            {accountItems.map((item) => (
              <li key={item.to}>
                <FooterLink to={item.to} label={t(item.labelKey)} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Pourquoi nous choisir */}
        <div className="lg:col-span-4">
          <ColumnHeading>{t("footer.whyUs")}</ColumnHeading>
          <ul className="mt-4 space-y-2.5">
            {TRUST.map(({ icon: Icon, labelKey }) => (
              <li
                key={labelKey}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-panel/70 px-3.5 py-2.5 shadow-card"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-ink/80">
                  {t(labelKey)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Barre inférieure */}
      <div className="border-t border-border/60 bg-bg/40">
        <div className="page-shell flex flex-col items-center justify-between gap-3 py-4 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {year} Tsena Anatiny — {t("nav.brandSub")}
          </p>

          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label={t("footer.language")}
              className="flex items-center overflow-hidden rounded-full border border-border/60 bg-panel"
            >
              {(["fr", "mg"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  aria-pressed={language === lang}
                  className={cn(
                    "h-7 px-2.5 text-[10px] font-bold uppercase tracking-wide transition-all",
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
              onClick={scrollToTop}
              aria-label={t("footer.backToTop")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-panel px-3 text-[11px] font-semibold text-muted transition hover:border-brand/40 hover:text-brand active:scale-95"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {t("footer.backToTop")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
