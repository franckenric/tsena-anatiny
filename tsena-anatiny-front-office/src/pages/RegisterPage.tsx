import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { Spinner } from "../components/Spinner";
import { Page } from "../components/Page";
import {
  isGoogleConfigured,
  renderGoogleButton
} from "../services/google-auth.service";
import { isValidEmail, normalizeEmail } from "../lib/utils";

export function RegisterPage() {
  const { register, loginWithFacebook, handleFacebookCallback, loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const history = useHistory();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/compte";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const googleEnabled = isGoogleConfigured();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (!code) return;

    setIsFacebookLoading(true);
    handleFacebookCallback(code)
      .then(() => {
        history.replace(from);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("auth.registerError"));
        history.replace("/inscription");
      })
      .finally(() => setIsFacebookLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("auth.needName"));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordShort"));
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: normalizedEmail,
        password,
        delivery_address: address.trim() || undefined
      });
      history.replace("/verification", {
        email: normalizedEmail,
        from
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.registerError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacebookLogin = () => {
    setError(null);
    loginWithFacebook();
  };

  const onGoogleCredential = useCallback(
    async (idToken: string) => {
      setIsGoogleLoading(true);
      setError(null);
      try {
        await loginWithGoogle(idToken);
        history.replace(from);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("auth.loginError"));
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [loginWithGoogle, history, from, t]
  );

  useEffect(() => {
    if (!googleEnabled || !googleButtonRef.current) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) return;

    let cancelled = false;
    void renderGoogleButton(
      googleButtonRef.current,
      clientId,
      (idToken) => {
        if (!cancelled) void onGoogleCredential(idToken);
      }
    ).catch((err: Error) => {
      if (!cancelled) setError(err.message);
    });

    return () => {
      cancelled = true;
    };
  }, [googleEnabled, onGoogleCredential]);

  return (
    <Page>
      <div className="mx-auto max-w-md px-4 py-14 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-panel p-8 shadow-card">
          <img src="/logo.png" alt="Tsena Anatiny" className="mx-auto h-16 w-16 rounded-2xl object-contain shadow-md shadow-brand/20" />
          <h1 className="mt-4 text-center text-2xl font-bold text-ink">
            {t("auth.registerTitle")}
          </h1>
          <p className="mt-1 text-center text-sm text-muted">
            {t("auth.registerSub")}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-widest text-muted"
              >
                {t("auth.fullName")}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: RAKOTO Jean"
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-widest text-muted"
              >
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com"
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-widest text-muted"
              >
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordHint")}
                autoComplete="new-password"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="text-xs font-semibold uppercase tracking-widest text-muted"
              >
                {t("auth.addressOptional")}
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Lot II A 25, Antananarivo"
                autoComplete="street-address"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  {t("auth.creating")}
                </>
              ) : (
                t("auth.createMyAccount")
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

          {googleEnabled ? (
            <div className="relative mt-3 min-h-[44px] w-full overflow-hidden rounded-2xl">
              <div ref={googleButtonRef} className="flex w-full justify-center" />
              {isGoogleLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/85">
                  <Spinner className="h-5 w-5 text-brand" />
                </div>
              )}
            </div>
          ) : null}

          <p className="mt-6 text-center text-sm text-muted">
            {t("auth.alreadyRegistered")}{" "}
            <Link
              to={{ pathname: "/connexion", state: { from } }}
              className="font-semibold text-brand hover:underline"
            >
              {t("auth.loginBtn")}
            </Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
