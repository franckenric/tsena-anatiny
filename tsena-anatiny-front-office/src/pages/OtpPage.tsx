import { useState, type FormEvent } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { customersService } from "../services/customers.service";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { Spinner } from "../components/Spinner";
import { Page } from "../components/Page";

export function OtpPage() {
  const { t } = useI18n();
  const { verifyOtp } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const state = (location.state ?? {}) as {
    phone?: string;
    from?: string;
  } | null;
  const phone = state?.phone ?? "";
  const from = state?.from ?? "/compte";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.trim().length !== 6 || !/^\d{6}$/.test(code.trim())) {
      setError(t("otp.invalidCode"));
      return;
    }
    if (!phone) {
      setError(t("otp.missingPhone"));
      return;
    }

    setIsSubmitting(true);
    try {
      await customersService.verifyOtp({ phone, code: code.trim() });
      verifyOtp();
      setNotice(t("otp.success"));
      history.replace(from);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("otp.error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    if (!phone) {
      setError(t("otp.missingPhone"));
      return;
    }
    setIsResending(true);
    try {
      await customersService.resendOtp(phone);
      setNotice(t("otp.resent"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("otp.error")
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Page>
      <div className="mx-auto max-w-md px-4 py-14 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-panel p-8 shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
            <ShieldCheck className="h-6 w-6 text-brand" />
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold text-ink">
            {t("otp.title")}
          </h1>
          <p className="mt-1 text-center text-sm text-muted">
            {t("otp.sub")}
            {phone ? ` (${phone})` : ""}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="otp-code"
                className="text-xs font-semibold uppercase tracking-widest text-muted"
              >
                {t("otp.codeLabel")}
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-center text-2xl font-bold tracking-[0.4em] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                  {t("otp.verifying")}
                </>
              ) : (
                t("otp.verify")
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || isSubmitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-bg px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResending ? (
              <Spinner className="h-4 w-4" />
            ) : (
              t("otp.resend")
            )}
          </button>
        </div>
      </div>
    </Page>
  );
}
