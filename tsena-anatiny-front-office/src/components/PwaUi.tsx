import { useEffect, useState } from "react";
import { CloudOff, Download, RefreshCw, WifiOff, X } from "lucide-react";
import { usePwa } from "../contexts/PwaContext";
import { useI18n } from "../contexts/I18nContext";

/** Bandeau "hors ligne" affiche en haut de l'ecran quand la connexion tombe. */
export function OfflineBanner() {
  const { isOffline } = usePwa();
  const { t } = useI18n();
  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="sticky top-14 z-40 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-xs font-semibold text-white sm:top-16"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      {t("pwa.offline")}
    </div>
  );
}

/** Banniere d'installation de la PWA, affichee une seule fois. */
export function InstallPrompt() {
  const { canInstall, promptInstall, dismissInstall } = usePwa();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall) return;
    const id = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(id);
  }, [canInstall]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
        dismissInstall();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismissInstall]);

  if (!canInstall || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 lg:bottom-5">
      <div
        role="dialog"
        aria-label={t("pwa.installTitle")}
        className="animate-toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-border/70 bg-panel p-3.5 shadow-lift"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">{t("pwa.installTitle")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {t("pwa.installSub")}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                promptInstall();
                setVisible(false);
              }}
              className="inline-flex h-9 items-center rounded-xl bg-brand px-3.5 text-xs font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand/90"
            >
              {t("pwa.install")}
            </button>
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                dismissInstall();
              }}
              className="inline-flex h-9 items-center rounded-xl border border-border px-3.5 text-xs font-semibold text-ink transition hover:bg-bg"
            >
              {t("pwa.installLater")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            dismissInstall();
          }}
          aria-label={t("common.close")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-bg hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Invite a recharger l'app quand une nouvelle version est prete. */
export function UpdatePrompt() {
  const { needsRefresh, updateApp } = usePwa();
  const { t } = useI18n();
  if (!needsRefresh) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-3">
      <div
        role="alert"
        className="animate-toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-brand/30 bg-panel p-3 shadow-lift"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <RefreshCw className="h-4.5 w-4.5" />
        </span>
        <p className="flex-1 text-xs font-semibold text-ink">
          {t("pwa.updateAvailable")}
        </p>
        <button
          type="button"
          onClick={updateApp}
          className="inline-flex h-9 shrink-0 items-center rounded-xl bg-brand px-3.5 text-xs font-bold text-white transition hover:bg-brand/90"
        >
          {t("pwa.updateNow")}
        </button>
      </div>
    </div>
  );
}

/** Ecran affiche quand l'application est lancee hors ligne sur une route inconnue. */
export function OfflineNotice({ className }: { className?: string }) {
  const { isOffline } = usePwa();
  const { t } = useI18n();
  if (!isOffline) return null;

  return (
    <div
      className={
        "flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink " +
        (className ?? "")
      }
    >
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-xs leading-relaxed">{t("pwa.offlineHint")}</p>
    </div>
  );
}
