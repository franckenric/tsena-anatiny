import { useId, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { Spinner } from "../Spinner";
import {
  formatPhoneMadagascar,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  PHONE_FORMAT_REGEX
} from "../../lib/utils";
import { AuthField } from "./AuthField";
import { AuthSocialButtons } from "./AuthSocialButtons";

interface RegisterFormProps {
  /** Appele avec l'email saisi apres une inscription reussie (verification OTP). */
  onSuccess: (email: string) => void;
  /** Appele apres une authentification sociale : aucune verification OTP n'est requise. */
  onSocialSuccess: () => void;
  /** Bascule vers l'onglet connexion dans la modale. */
  onLogin?: () => void;
  className?: string;
}

/** L'API renvoie ses messages en anglais : on les traduit pour l'affichage. */
const API_ERROR_KEYS: Record<string, string> = {
  "Email already registered": "auth.emailTaken",
  "Phone number already registered": "auth.phoneTaken"
};

export function RegisterForm({
  onSuccess,
  onSocialSuccess,
  onLogin,
  className
}: RegisterFormProps) {
  const { register } = useAuth();
  const { t } = useI18n();
  const fieldId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;

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
    if (!PHONE_FORMAT_REGEX.test(phone.trim())) {
      setError(t("auth.invalidPhone"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordShort"));
      return;
    }
    if (password !== passwordConfirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: normalizePhone(phone),
        delivery_address: address.trim() || undefined
      });
      onSuccess(normalizedEmail);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const key = API_ERROR_KEYS[message];
      setError(key ? t(key) : message || t("auth.registerError"));
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

      {/* Deux champs par ligne sur ecran large : le formulaire d'inscription tient
          alors dans la meme hauteur que celui de connexion. */}
      <form onSubmit={handleSubmit} className="grid gap-3.5 sm:grid-cols-2">
        <AuthField
          id={`${fieldId}-name`}
          label={t("auth.fullName")}
          value={name}
          onChange={setName}
          placeholder="Ex: RAKOTO Jean"
          autoComplete="name"
          icon={<User />}
        />

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
          id={`${fieldId}-phone`}
          label={t("auth.phoneRequired")}
          type="tel"
          inputMode="tel"
          maxLength={17}
          value={phone}
          onChange={setPhone}
          format={formatPhoneMadagascar}
          autoComplete="tel"
          icon={<Phone />}
        />

        <AuthField
          id={`${fieldId}-address`}
          label={t("auth.addressOptional")}
          value={address}
          onChange={setAddress}
          placeholder="Ex: Lot II A 25, Antananarivo"
          autoComplete="street-address"
          icon={<MapPin />}
        />

        <AuthField
          id={`${fieldId}-password`}
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={t("auth.passwordHint")}
          autoComplete="new-password"
          icon={<Lock />}
        />

        <AuthField
          id={`${fieldId}-password-confirm`}
          label={t("auth.confirmPassword")}
          type="password"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          placeholder={t("auth.confirmPasswordHint")}
          autoComplete="new-password"
          icon={<ShieldCheck />}
        />

        {passwordMismatch && (
          <p className="-mt-1 text-xs font-medium text-danger sm:col-span-2">
            {t("auth.passwordMismatch")}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-accent px-6 py-3.5 text-sm font-bold text-white shadow-glow transition duration-200 hover:brightness-105 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          {isSubmitting ? (
            <>
              <Spinner className="h-4 w-4" />
              {t("auth.creating")}
            </>
          ) : (
            <>
              {t("auth.createMyAccount")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <AuthSocialButtons onSuccess={onSocialSuccess} onError={setError} />

      {onLogin && (
        <p className="mt-6 text-center text-sm text-muted">
          {t("auth.alreadyRegistered")}{" "}
          <button
            type="button"
            onClick={onLogin}
            className="font-semibold text-brand underline-offset-2 transition hover:underline"
          >
            {t("auth.loginBtn")}
          </button>
        </p>
      )}
    </div>
  );
}