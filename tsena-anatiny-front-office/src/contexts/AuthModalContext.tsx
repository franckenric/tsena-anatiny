import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useHistory, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useI18n } from "./I18nContext";
import { LoginForm } from "../components/auth/LoginForm";
import { RegisterForm } from "../components/auth/RegisterForm";
import { cn } from "../lib/utils";

export type AuthModalMode = "login" | "register";

interface AuthModalOptions {
  /**
   * Action a rejouer une fois la session ouverte (ajout au panier, etc.).
   * Elle remplace la redirection automatique vers `/verification` apres une
   * inscription : une inscription exige toujours une verification par email.
   */
  onSuccess?: () => void;
}

interface AuthModalContextValue {
  isOpen: boolean;
  mode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode, options?: AuthModalOptions) => void;
  closeAuthModal: () => void;
  showLogin: (options?: AuthModalOptions) => void;
  showRegister: (options?: AuthModalOptions) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

const TABS: { mode: AuthModalMode; labelKey: string }[] = [
  { mode: "login", labelKey: "auth.loginTitle" },
  { mode: "register", labelKey: "auth.registerTab" }
];

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const { t } = useI18n();
  const history = useHistory();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const onSuccessRef = useRef<(() => void) | null>(null);

  const openAuthModal = useCallback(
    (nextMode: AuthModalMode = "login", options?: AuthModalOptions) => {
      onSuccessRef.current = options?.onSuccess ?? null;
      setMode(nextMode);
      setIsOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    onSuccessRef.current = null;
  }, []);

  const showLogin = useCallback(
    (options?: AuthModalOptions) => openAuthModal("login", options),
    [openAuthModal]
  );

  const showRegister = useCallback(
    (options?: AuthModalOptions) => openAuthModal("register", options),
    [openAuthModal]
  );

  const switchMode = useCallback((nextMode: AuthModalMode) => {
    setMode(nextMode);
  }, []);

  // La modale est un ecran bloquant : le fond ne doit plus defiler.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Une session deja ouverte rend la modale inutile. On ferme sans vider
  // l'action en attente : le formulaire vient de reussir et doit pouvoir la
  // rejouer meme si ce rendu passe avant l'appel a `onSuccess`.
  useEffect(() => {
    if (isOpen && customer) setIsOpen(false);
  }, [isOpen, customer]);

  const value = useMemo(
    () => ({
      isOpen,
      mode,
      openAuthModal,
      closeAuthModal,
      showLogin,
      showRegister
    }),
    [isOpen, mode, openAuthModal, closeAuthModal, showLogin, showRegister]
  );

  const handleLoginSuccess = useCallback(() => {
    const onSuccess = onSuccessRef.current;
    closeAuthModal();
    onSuccess?.();
  }, [closeAuthModal]);

  const handleRegisterSuccess = useCallback(
    (email: string) => {
      // Une inscription debouche toujours sur la verification par email :
      // l'action en attente est rejouee apres validation du code.
      closeAuthModal();
      history.push("/verification", {
        email,
        from: location.pathname + location.search
      });
    },
    [closeAuthModal, history, location.pathname, location.search]
  );

  const show = isOpen && !customer;

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      {show && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          {/* Voile opaque : masque toute l'interface et n'est pas cliquable. */}
          <div className="animate-fade-in absolute inset-0 bg-ink/80 backdrop-blur-md" />

          {/* Hauteur figee : le changement d'onglet ne doit pas faire sauter la
              fenetre. Seule la largeur suit le formulaire affiche. */}
          <div
            className={cn(
              "animate-modal-pop relative flex h-[min(680px,94vh)] w-full flex-col overflow-hidden rounded-t-[2rem] border border-border bg-panel shadow-lift sm:rounded-[2.5rem]",
              mode === "register" ? "sm:max-w-lg" : "sm:max-w-md"
            )}
          >
            {/* Poignee de feuille inferieure, sur mobile uniquement. */}
            <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-border" />
            </div>

            <header className="relative shrink-0 overflow-hidden px-6 pb-5 pt-4 sm:pt-6">
              {/* Halos decoratifs : donnent de la profondeur sans surcharger. */}
              <div className="animate-blob pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-14 top-6 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-panel shadow-card">
                  <img
                    src="/logo.png"
                    alt="Tsena Anatiny"
                    className="h-9 w-9 rounded-xl object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                    {t("auth.requiredTitle")}
                  </p>
                  <h2
                    id="auth-modal-title"
                    className="mt-0.5 font-display text-xl font-bold leading-tight text-ink"
                  >
                    {mode === "login"
                      ? t("auth.loginTitle")
                      : t("auth.registerTitle")}
                  </h2>
                  <p className="mt-1 text-[13px] leading-snug text-muted">
                    {mode === "login"
                      ? t("auth.loginSub")
                      : t("auth.registerSub")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAuthModal}
                  aria-label={t("common.close")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-panel text-muted shadow-sm transition hover:border-brand/40 hover:bg-brand/10 hover:text-ink active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="relative shrink-0 px-6 pb-1">
              <div
                role="tablist"
                aria-label={t("auth.requiredTitle")}
                className="relative grid grid-cols-2 gap-1 rounded-2xl bg-bg/80 p-1 ring-1 ring-border/60"
              >
                {/* Curseur glissant : suit l'onglet actif sans changer la hauteur. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1 left-1 w-[calc(50%_-_0.25rem)] rounded-xl bg-panel shadow-card transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    mode === "register" ? "translate-x-full" : "translate-x-0"
                  )}
                />
                {TABS.map((tab) => (
                  <button
                    key={tab.mode}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab.mode}
                    onClick={() => switchMode(tab.mode)}
                    className={cn(
                      "relative z-10 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
                      mode === tab.mode
                        ? "text-ink"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto overscroll-contain px-6 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {mode === "login" ? (
                <LoginForm
                  onSuccess={handleLoginSuccess}
                  onRegister={() => switchMode("register")}
                />
              ) : (
                <RegisterForm
                  onSuccess={handleRegisterSuccess}
                  onSocialSuccess={handleLoginSuccess}
                  onLogin={() => switchMode("login")}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal doit être utilisé dans <AuthModalProvider>");
  }
  return ctx;
}