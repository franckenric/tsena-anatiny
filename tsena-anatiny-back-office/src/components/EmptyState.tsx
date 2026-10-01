import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "../lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = "Aucune donnée",
  description,
  icon,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <div className="max-w-xs space-y-1">
        <p className="font-display text-sm font-bold text-ink">{title}</p>
        {description && (
          <p className="text-xs leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
