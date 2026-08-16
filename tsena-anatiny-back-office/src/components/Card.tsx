import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  headerAction?: ReactNode;
  bodyClassName?: string;
  hideHeaderOnMobile?: boolean;
  plainOnMobile?: boolean;
}

export function Card({
  children,
  className = "",
  title,
  description,
  headerAction,
  bodyClassName = "",
  hideHeaderOnMobile = false,
  plainOnMobile = false
}: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl backdrop-blur ${
        plainOnMobile
          ? "border-0 bg-transparent shadow-none sm:border sm:border-border/70 sm:bg-panel/75 sm:shadow-[0_16px_42px_-26px_rgba(8,18,38,0.45)]"
          : "border border-border/70 bg-panel/75 shadow-[0_16px_42px_-26px_rgba(8,18,38,0.45)]"
      } ${className}`}
    >
      {(title || description) && (
        <div
          className={`border-b border-border/50 bg-bg/40 px-3 py-3 sm:px-6 sm:py-4 ${
            hideHeaderOnMobile ? "hidden sm:block" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
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
      <div className={`${plainOnMobile ? "p-0 sm:p-6" : "p-3 sm:p-6"} ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
