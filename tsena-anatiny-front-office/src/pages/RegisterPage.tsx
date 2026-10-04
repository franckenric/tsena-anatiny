import { useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { useI18n } from "../contexts/I18nContext";
import { usePageTitle } from "../contexts/PageTitleContext";
import { Page } from "../components/Page";
import { RegisterForm } from "../components/auth/RegisterForm";

/**
 * L'inscription passe par la modale : cette route n'est atteignable qu'en lien
 * profond ou via le retour du dialogue Facebook (`?code=`). Dans le premier cas
 * on renvoie l'utilisateur a l'accueil et on ouvre la modale.
 */
export function RegisterPage() {
  const { handleFacebookCallback } = useAuth();
  const { showRegister } = useAuthModal();
  const { t } = useI18n();
  usePageTitle(t("auth.registerTitle"));
  const history = useHistory();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/compte";

  const [callbackError, setCallbackError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = new URLSearchParams(location.search).get("code");
    if (!code) {
      history.replace("/");
      showRegister();
      return;
    }

    handleFacebookCallback(code)
      .then(() => {
        history.replace(from);
      })
      .catch((err: unknown) => {
        setCallbackError(
          err instanceof Error ? err.message : t("auth.registerError")
        );
        showRegister();
      });
  }, []);

  return (
    <Page>
      <div className="mx-auto max-w-lg px-4 py-14 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-panel p-8 shadow-card">
          <img
            src="/logo.png"
            alt="Tsena Anatiny"
            className="mx-auto h-16 w-16 rounded-2xl object-contain shadow-md shadow-brand/20"
          />
          <h1 className="mt-4 text-center text-2xl font-bold text-ink">
            {t("auth.registerTitle")}
          </h1>
          <p className="mt-1 text-center text-sm text-muted">
            {t("auth.registerSub")}
          </p>

          {callbackError && (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
              {callbackError}
            </div>
          )}

          <div className="mt-6">
            <RegisterForm
              onSuccess={(email) =>
                history.replace("/verification", { email, from })
              }
              onSocialSuccess={() => history.replace(from)}
            />
          </div>
        </div>
      </div>
    </Page>
  );
}