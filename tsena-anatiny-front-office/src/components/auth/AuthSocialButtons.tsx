import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { Spinner } from "../Spinner";
import {
  isGoogleConfigured,
  renderGoogleButton
} from "../../services/google-auth.service";

interface AuthSocialButtonsProps {
  onSuccess: () => void;
  onError: (message: string | null) => void;
}

export function AuthSocialButtons({ onSuccess, onError }: AuthSocialButtonsProps) {
  const { loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const googleEnabled = isGoogleConfigured();

  const onGoogleCredential = useCallback(
    async (idToken: string) => {
      setIsGoogleLoading(true);
      onError(null);
      try {
        await loginWithGoogle(idToken);
        onSuccess();
      } catch (err) {
        onError(err instanceof Error ? err.message : t("auth.loginError"));
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [loginWithGoogle, onSuccess, onError, t]
  );

  useEffect(() => {
    if (!googleEnabled || !googleButtonRef.current) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) return;

    let cancelled = false;
    void renderGoogleButton(googleButtonRef.current, clientId, (idToken) => {
      if (!cancelled) void onGoogleCredential(idToken);
    }).catch((err: Error) => {
      if (!cancelled) onError(err.message);
    });

    return () => {
      cancelled = true;
    };
  }, [googleEnabled, onGoogleCredential, onError]);

  return (
    <>
      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/70" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-panel px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {t("auth.or")}
          </span>
        </div>
      </div>

      {googleEnabled ? (
        <div className="relative mt-5 min-h-[48px] w-full overflow-hidden rounded-2xl">
          <div ref={googleButtonRef} className="flex w-full justify-center" />
          {isGoogleLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-panel/85">
              <Spinner className="h-5 w-5 text-brand" />
            </div>
          )}
        </div>
      ) : (
        /* Sans VITE_GOOGLE_CLIENT_ID le bouton officiel ne peut pas etre monte :
           on affiche un equivalent maison qui explique la configuration manquante. */
        <button
          type="button"
          onClick={() => onError(t("auth.googleNotConfigured"))}
          className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-panel px-6 text-sm font-semibold text-ink shadow-sm transition hover:border-brand/30 hover:bg-bg/50 active:scale-[0.985]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.29 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.29a12 12 0 0 0 0 10.74l4-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.38-3.38C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l4 3.1C6.23 6.86 8.88 4.75 12 4.75z"
            />
          </svg>
          {t("auth.loginWithGoogle")}
        </button>
      )}
    </>
  );
}