import { useState, type FormEvent } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { PhoneInput } from "../components/PhoneInput";
import { Spinner } from "../components/Spinner";
import { Page } from "../components/Page";
import {
  isPhonePrefixOnly,
  normalizePhone,
  PHONE_FORMAT_REGEX
} from "../lib/utils";

export function RegisterPage() {
  const { register } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/compte";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Veuillez saisir votre nom.");
      return;
    }
    if (isPhonePrefixOnly(phone) || !PHONE_FORMAT_REGEX.test(phone)) {
      setError("Numéro de téléphone invalide.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        phone: normalizePhone(phone),
        password,
        delivery_address: address.trim() || undefined
      });
      history.replace(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      <div className="mx-auto max-w-md px-4 py-14 pb-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-panel p-8 shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
          <UserPlus className="h-6 w-6 text-brand" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-ink">
          Créer un compte
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          Enregistrez vos informations pour passer commande.
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
              Nom complet
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
              htmlFor="phone"
              className="text-xs font-semibold uppercase tracking-widest text-muted"
            >
              Téléphone
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

          <div>
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-widest text-muted"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              autoComplete="new-password"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="text-xs font-semibold uppercase tracking-widest text-muted"
            >
              Adresse de livraison (optionnel)
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
                Création...
              </>
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Déjà inscrit ?{" "}
          <Link
            to={{ pathname: "/connexion", state: { from } }}
            className="font-semibold text-brand hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
      </div>
    </Page>
  );
}
