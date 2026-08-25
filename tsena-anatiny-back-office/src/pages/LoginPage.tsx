import { useEffect, useState } from "react";
import { Redirect, useHistory, useLocation } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { Eye, EyeOff, LockKeyhole, Package, Phone } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { login, loginWithFacebook, handleFacebookCallback, token, isLoading } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (!code) return;

    setIsFacebookLoading(true);
    handleFacebookCallback(code)
      .then(() => {
        history.replace("/dashboard");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erreur connexion Facebook");
        history.replace("/login");
      })
      .finally(() => setIsFacebookLoading(false));
  }, []);

  if (token) {
    return <Redirect to="/dashboard" />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!phone.trim() || !password.trim()) {
      setError("Téléphone et mot de passe sont requis.");
      return;
    }

    try {
      await login({ phone: phone.trim(), password });
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    }
  }

  async function handleFacebookLogin() {
    setError(null);
    loginWithFacebook();
  }

  return (
    <IonPage className="bg-bg">
      <IonContent>
        <div className="relative isolate flex min-h-full flex-col justify-center overflow-hidden px-5 py-10">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--brand-soft)/0.55),transparent_36%),radial-gradient(circle_at_100%_10%,hsl(var(--warning)/0.2),transparent_30%),linear-gradient(120deg,hsl(var(--bg)),hsl(var(--panel)))]" />
          <div className="absolute -left-28 top-24 -z-10 h-80 w-80 rounded-full border border-brand/20 bg-brand/10 blur-3xl" />
          <div className="absolute -right-40 bottom-20 -z-10 h-96 w-96 rounded-full border border-warning/20 bg-warning/10 blur-3xl" />

          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
              <img src="/logo.png" alt="Tsena Anatiny" className="h-16 w-16 rounded-3xl object-contain shadow-lg shadow-brand/35" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  Tsena Anatiny
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-ink">
                  Back Office
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Pilotez votre commerce, partout.
                </p>
              </div>
            </div>

            <form
              className="space-y-4 rounded-3xl border border-border/70 bg-panel/90 p-5 shadow-xl backdrop-blur"
              onSubmit={handleSubmit}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-ink"
                >
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="phone"
                    type="text"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+261 34 00 000 00"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-bg/60 pl-11 pr-3.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-ink"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-bg/60 pl-11 pr-12 text-sm text-ink outline-none transition placeholder:text-muted/80 focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-bg hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-base font-bold text-white shadow-lg shadow-brand/35 transition hover:-translate-y-0.5 hover:bg-brand/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Connexion..." : "Accéder au tableau de bord"}
              </button>
            </form>

            <div className="relative mt-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-muted">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={isFacebookLoading || isLoading}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-border/70 bg-panel/90 px-6 py-3 text-sm font-bold text-ink shadow-sm backdrop-blur transition hover:bg-panel active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFacebookLoading ? (
                <span className="h-4 w-4 shrink-0 animate-spin-slow rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              Se connecter avec Facebook
            </button>

            <p className="mt-6 text-center text-xs text-muted">
              Réservé au personnel autorisé de Tsena Anatiny
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
