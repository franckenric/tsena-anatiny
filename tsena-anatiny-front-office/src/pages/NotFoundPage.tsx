import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { Page } from "../components/Page";
import { OfflineNotice } from "../components/PwaUi";
import { useI18n } from "../contexts/I18nContext";

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <Page>
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-5 px-4 py-24 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand/10">
          <Compass className="h-10 w-10 text-brand" />
        </span>
        <div>
          <p className="font-display text-6xl font-extrabold text-brand">404</p>
          <h1 className="mt-2 text-xl font-bold text-ink">{t("notFound.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("notFound.subtitle")}
          </p>
        </div>

        <OfflineNotice />

        <Link
          to="/"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90"
        >
          <Home className="h-4 w-4" />
          {t("common.backToShop")}
        </Link>
      </div>
    </Page>
  );
}
