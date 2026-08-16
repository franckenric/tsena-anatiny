import { cn } from "../lib/utils";
import { useI18n } from "../contexts/I18nContext";

export function Spinner({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "h-5 w-5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin-slow",
        className
      )}
      role="status"
      aria-label={t("common.loading")}
    />
  );
}

export function PageLoader({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-8 w-8 text-brand" />
      <p className="text-sm">{label ?? t("common.loading")}</p>
    </div>
  );
}
