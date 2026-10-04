import { useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { useI18n } from "../contexts/I18nContext";
import { usePageTitle } from "../contexts/PageTitleContext";
import { Page } from "../components/Page";
import { LoginForm } from "../components/auth/LoginForm";

/**
 * La connexion passe par la modale : cette route n'est atteignable qu'en lien
 * profond ou via le retour du dialogue Facebook (`?code=`). Dans le premier cas
 * on renvoie l'utilisateur a l'accueil et on ouvre la modale.
 */
export function LoginPage() {
  const { handleFacebookCallback } = useAuth();
  const { showLogin } = useAuthModal();
  const { t } = useI18n();
  usePageTitle(t("auth.loginTitle"));
  const history = useHistory();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/compte";

  const [callbackError, setCallbackError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = new URLSearchParams(location.search).get("code");
    if (!code) {
      history.replace("/");
      showLogin();
      return;
    }

    handleFacebookCallback(code)
      .then(() => {
        history.replace(from);
      })
      .catch((err: unknown) => {
        setCallbackError(err instanceof Error ? err.message : t("auth.loginError"));
        showLogin();
      });
  }, []);

  return (
    <Page>
      <div className="mx-auto max-w-md px-4 py-14 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-panel p-8 shadow-card">
          <img
            src="/logo.png"
            alt="Tsena Anatiny"
            className="mx-auto h-16 w-16 rounded-2xl object-contain shadow-md shadow-brand/20"
          />
          <h1 className="mt-4 text-center text-2xl font-bold text-ink">
            {t("auth.loginTitle")}
          </h1>
          <p className="mt-1 text-center text-sm text-muted">
            {t("auth.loginSub")}
          </p>

          {callbackError && (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
              {callbackError}
            </div>
          )}

          <div className="mt-6">
            <LoginForm onSuccess={() => history.replace(from)} />
          </div>
        </div>
      </div>
    </Page>
  );
}