import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface PwaContextValue {
  /** Une nouvelle version est disponible et attend une confirmation. */
  needsRefresh: boolean;
  /** Applique la mise a jour et recharge la page. */
  updateApp: () => void;
  /** L'app fonctionne hors ligne. */
  isOffline: boolean;
  /** L'app est lancee depuis le mode standalone (installee). */
  isInstalled: boolean;
  /** Le navigateur propose l'installation de la PWA. */
  canInstall: boolean;
  /** Declenche l'invite d'installation native du navigateur. */
  promptInstall: () => void;
  /** L'utilisateur a refuse l'invite d'installation. */
  dismissInstall: () => void;
  installDismissed: boolean;
}

const PwaContext = createContext<PwaContextValue | null>(null);

const INSTALL_DISMISSED_KEY = "fo.pwa.install.dismissed";

function readInstallDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      // Verifie les mises a jour toutes les heures quand l'onglet est visible.
      window.setInterval(
        () => {
          if (document.visibilityState === "visible") {
            void registration.update();
          }
        },
        60 * 60 * 1000
      );
      void swUrl;
    },
    onRegisterError(error) {
      console.error("Service worker non enregistre", error);
    }
  });

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [installDismissed, setInstallDismissed] = useState(
    readInstallDismissed
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const media = window.matchMedia("(display-mode: standalone)");
    const onModeChange = () => setIsInstalled(isStandalone());
    media.addEventListener?.("change", onModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      media.removeEventListener?.("change", onModeChange);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferredPrompt) return;
    void deferredPrompt.prompt();
    void deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      } else {
        setInstallDismissed(true);
        try {
          localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
        } catch {
          // stockage indisponible
        }
      }
    });
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // stockage indisponible
    }
  }, []);

  const updateApp = useCallback(() => {
    setNeedRefresh(false);
    void updateServiceWorker(true);
  }, [setNeedRefresh, updateServiceWorker]);

  const value = useMemo<PwaContextValue>(
    () => ({
      needsRefresh: needRefresh,
      updateApp,
      isOffline,
      isInstalled,
      canInstall: Boolean(deferredPrompt) && !isInstalled && !installDismissed,
      promptInstall,
      dismissInstall,
      installDismissed
    }),
    [
      needRefresh,
      updateApp,
      isOffline,
      isInstalled,
      deferredPrompt,
      installDismissed,
      promptInstall,
      dismissInstall
    ]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error("usePwa doit etre utilise dans <PwaProvider>");
  return ctx;
}
