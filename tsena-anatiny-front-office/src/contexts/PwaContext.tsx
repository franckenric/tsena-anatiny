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
  /** Appareil iOS/iPadOS : aucune invite native d'installation n'existe. */
  isIos: boolean;
  /**
   * Methode d'installation proposee :
   * - "native" : invite du navigateur (Chrome/Edge/Android) ;
   * - "ios" : marche a suivre manuelle (Partager > Sur l'ecran d'accueil) ;
   * - null : rien de propose (deja installe ou navigateur non compatible).
   */
  installMode: "native" | "ios" | null;
  /** Le navigateur propose l'installation de la PWA. */
  canInstall: boolean;
  /** Declenche l'invite d'installation native du navigateur. */
  promptInstall: () => void;
  /** L'utilisateur a refuse l'invite d'installation. */
  dismissInstall: () => void;
  installDismissed: boolean;
  /** La fiche d'instructions iOS est ouverte. */
  iosInstructionsOpen: boolean;
  /** Ouvre la fiche d'instructions iOS. */
  openIosInstructions: () => void;
  /** Ferme la fiche d'instructions iOS. */
  closeIosInstructions: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

const INSTALL_DISMISSED_KEY = "fo.pwa.install.dismissed";

// Un refus n'est plus definitif : on repropose l'installation apres une
// semaine, sinon un simple "Plus tard" condamnait l'app a ne plus jamais
// proposer l'ajout a l'ecran d'accueil.
const INSTALL_DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readInstallDismissed(): boolean {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (!raw) return false;
    const at = Number(raw);
    // Ancien format ("1") = refus juge definitif : on le considere expire pour
    // reproposer l'installation aux personnes deja bloquees.
    if (!Number.isFinite(at) || at <= 0) return false;
    return Date.now() - at < INSTALL_DISMISSED_TTL_MS;
  } catch {
    return false;
  }
}

function markInstallDismissed(): void {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  } catch {
    // stockage indisponible
  }
}

/**
 * iOS/iPadOS n'emet jamais `beforeinstallprompt` : l'installation passe
 * obligatoirement par le menu Partager de Safari. On detecte aussi l'iPad
 * qui se presente comme un Mac depuis iPadOS 13.
 */
function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ipadOs =
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
  return /iPad|iPhone|iPod/.test(ua) || ipadOs;
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
  const [iosInstructionsOpen, setIosInstructionsOpen] = useState(false);
  const isIos = useMemo(() => isIosDevice(), []);

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

  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    markInstallDismissed();
  }, []);

  const openIosInstructions = useCallback(() => {
    setIosInstructionsOpen(true);
  }, []);

  const closeIosInstructions = useCallback(() => {
    setIosInstructionsOpen(false);
  }, []);

  const promptInstall = useCallback(() => {
    // Pas d'invite native disponible : sur iOS on affiche la marche a suivre.
    if (!deferredPrompt) {
      if (isIos) setIosInstructionsOpen(true);
      return;
    }
    void deferredPrompt.prompt();
    void deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      } else {
        dismissInstall();
      }
    });
  }, [deferredPrompt, isIos, dismissInstall]);

  const updateApp = useCallback(() => {
    setNeedRefresh(false);
    void updateServiceWorker(true);
  }, [setNeedRefresh, updateServiceWorker]);

  const installMode: "native" | "ios" | null = isInstalled
    ? null
    : deferredPrompt
      ? "native"
      : isIos
        ? "ios"
        : null;

  const value = useMemo<PwaContextValue>(
    () => ({
      needsRefresh: needRefresh,
      updateApp,
      isOffline,
      isInstalled,
      isIos,
      installMode,
      canInstall: installMode !== null && !installDismissed,
      promptInstall,
      dismissInstall,
      installDismissed,
      iosInstructionsOpen,
      openIosInstructions,
      closeIosInstructions
    }),
    [
      needRefresh,
      updateApp,
      isOffline,
      isInstalled,
      isIos,
      installMode,
      installDismissed,
      promptInstall,
      dismissInstall,
      iosInstructionsOpen,
      openIosInstructions,
      closeIosInstructions
    ]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error("usePwa doit etre utilise dans <PwaProvider>");
  return ctx;
}
