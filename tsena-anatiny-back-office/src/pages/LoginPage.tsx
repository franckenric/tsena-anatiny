import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { login, token, isLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (token) {
    return <Navigate to="/dashboard" replace />;
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

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--brand-soft)/0.5),transparent_36%),radial-gradient(circle_at_100%_10%,hsl(var(--warning)/0.2),transparent_30%),linear-gradient(120deg,hsl(var(--bg)),hsl(var(--panel)))]" />
      <div className="absolute -left-28 top-24 -z-10 h-80 w-80 rounded-full border border-brand/20 bg-brand/10 blur-3xl" />
      <div className="absolute -right-40 bottom-20 -z-10 h-96 w-96 rounded-full border border-warning/20 bg-warning/10 blur-3xl" />

      <main className="w-full max-w-md overflow-hidden rounded-3xl border border-border/70 bg-panel/85 shadow-2xl backdrop-blur">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-soft/30 via-transparent to-warning/10" />
          <div className="relative space-y-8 p-6 sm:p-8 lg:p-10">
            <div className="space-y-2 text-center">
              <span className="inline-flex rounded-full border border-brand/35 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
                tsena anatiny back office
              </span>
              <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">
                Se connecter
              </h1>
              <p className="text-sm text-muted">
                Accédez à votre plateforme de pilotage commercial
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-ink"
                >
                  Téléphone
                </label>
                <input
                  id="phone"
                  type="text"
                  autoComplete="tel"
                  placeholder="+261 34 00 000 00"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-ink"
                  >
                    Mot de passe
                  </label>
                  <span className="text-xs text-muted">Confidentiel</span>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-5 text-base font-bold text-white shadow-lg shadow-brand/35 transition hover:-translate-y-0.5 hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Connexion..." : "Accéder au tableau de bord"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
