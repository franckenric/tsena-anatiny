import { useEffect, useState, type FormEvent } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { PhoneInput } from "../components/PhoneInput";
import { Spinner } from "../components/Spinner";
import { Page } from "../components/Page";
import {
  isPhonePrefixOnly,
  normalizePhone,
  PHONE_FORMAT_REGEX
} from "../lib/utils";

export function LoginPage() {
  const { login, loginWithFacebook, handleFacebookCallback, loginWithGoogle, handleGoogleCallback } = useAuth();
  const { t } = useI18n();
  const history = useHistory();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/compte";

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code) return;

    const isGoogle = state === "google";
    const setLoading = isGoogle ? setIsGoogleLoading : setIsFacebookLoading;
    const callback = isGoogle ? handleGoogleCallback : handleFacebookCallback;

    setLoading(true);
    callback(code)
      .then(() => {
        history.replace(from);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("auth.loginError"));
        history.replace("/connexion");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isPhonePrefixOnly(phone) || !PHONE_FORMAT_REGEX.test(phone)) {
      setError(t("auth.invalidPhone"));
      return;
    }

    setIsSubmitting(true);
    try {
      await login(normalizePhone(phone));
      history.replace(from);
    } catch (err) {
      setError(
        err instanceof Error && err.message.startsWith("Aucun compte")
          ? t("auth.notFound")
          : err instanceof Error
            ? err.message
            : t("auth.loginError")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacebookLogin = () => {
    setError(null);
    loginWithFacebook();
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      history.replace(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginError"));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Page>
      <div className="mx-auto max-w-md px-4 py-14 pb-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-panel p-8 shadow-card">
        <img src="/logo.png" alt="Tsena Anatiny" className="mx-auto h-16 w-16 rounded-2xl object-contain shadow-md shadow-brand/20" />
        <h1 className="mt-4 text-center text-2xl font-bold text-ink">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          {t("auth.loginSub")}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="text-xs font-semibold uppercase tracking-widest text-muted"
            >
              {t("auth.phone")}
            </label>
            <div className="mt-2">
              <PhoneInput
                id="phone"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                {t("auth.loginLoading")}
              </>
            ) : (
              t("auth.loginBtn")
            )}
          </button>
        </form>

        <div className="relative mt-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-panel px-2 text-muted">ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={isFacebookLoading}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white px-6 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFacebookLoading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          {t("auth.loginWithFacebook")}
        </button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white px-6 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGoogleLoading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {t("auth.loginWithGoogle")}
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          {t("auth.noAccount")}{" "}
          <Link
            to={{ pathname: "/inscription", state: { from } }}
            className="font-semibold text-brand hover:underline"
          >
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
      </div>
    </Page>
  );
}
