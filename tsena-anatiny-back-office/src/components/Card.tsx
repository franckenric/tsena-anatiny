import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  headerAction?: ReactNode;
  bodyClassName?: string;
}

export function Card({
  children,
  className = "",
  title,
  description,
  headerAction,
  bodyClassName = ""
}: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border/70 bg-panel/75 shadow-[0_16px_42px_-26px_rgba(8,18,38,0.45)] backdrop-blur ${className}`}
    >
      {(title || description) && (
        <div className="border-b border-border/50 bg-bg/40 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              {title && (
                <h3 className="font-display text-lg font-semibold text-ink">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted">{description}</p>
              )}
            </div>
            {headerAction && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
