import { useId, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { Spinner } from "../Spinner";
import { isValidEmail, normalizeEmail } from "../../lib/utils";
import { AuthField } from "./AuthField";
import { AuthSocialButtons } from "./AuthSocialButtons";

interface LoginFormProps {
  /** Appele juste apres une authentification reussie (email/mot de passe, Google). */
  onSuccess: () => void;
  /** Bascule vers l'onglet inscription dans la modale. */
  onRegister?: () => void;
  className?: string;
}

export function LoginForm({
  onSuccess,
  onRegister,
  className
}: LoginFormProps) {
  const { login } = useAuth();
  const { t } = useI18n();
  const fieldId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    if (!password) {
      setError(t("auth.needPassword"));
      return;
    }

    setIsSubmitting(true);
    try {
      await login(normalizeEmail(email), password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger/5 px-3.5 py-3 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id={`${fieldId}-email`}
          label={t("auth.email")}
          type="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          placeholder="exemple@email.com"
          autoComplete="email"
          icon={<Mail />}
        />

        <AuthField
          id={`${fieldId}-password`}
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={t("auth.passwordHint")}
          autoComplete="current-password"
          icon={<Lock />}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-accent px-6 py-3.5 text-sm font-bold text-white shadow-glow transition duration-200 hover:brightness-105 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Spinner className="h-4 w-4" />
              {t("auth.loginLoading")}
            </>
          ) : (
            <>
              {t("auth.loginBtn")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <AuthSocialButtons onSuccess={onSuccess} onError={setError} />

      {onRegister && (
        <p className="mt-6 text-center text-sm text-muted">
          {t("auth.noAccount")}{" "}
          <button
            type="button"
            onClick={onRegister}
            className="font-semibold text-brand underline-offset-2 transition hover:underline"
          >
            {t("auth.createAccount")}
          </button>
        </p>
      )}
    </div>
  );
}