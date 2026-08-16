import { useState, type FormEvent } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
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
  const { login } = useAuth();
  const { t } = useI18n();
  const history = useHistory();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/compte";

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <Page>
      <div className="mx-auto max-w-md px-4 py-14 pb-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-panel p-8 shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
          <LogIn className="h-6 w-6 text-brand" />
        </div>
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
