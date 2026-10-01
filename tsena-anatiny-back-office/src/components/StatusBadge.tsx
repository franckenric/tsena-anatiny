import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export type StatusTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-bg text-muted ring-border/70",
  brand: "bg-brand/12 text-brand ring-brand/25",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/15 text-[hsl(32,90%,35%)] ring-warning/30",
  danger: "bg-danger/10 text-danger ring-danger/25",
  info: "bg-sky-500/10 text-sky-600 ring-sky-500/25"
};

interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({
  tone = "neutral",
  children,
  className,
  dot = false
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
}
