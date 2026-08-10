import { cn } from "../lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin-slow",
        className
      )}
      role="status"
      aria-label="Chargement"
    />
  );
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-8 w-8 text-brand" />
      <p className="text-sm">{label ?? "Chargement..."}</p>
    </div>
  );
}
