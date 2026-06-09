import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Card({
  children,
  className = "",
  title,
  description
}: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border/70 bg-panel/75 shadow-[0_16px_42px_-26px_rgba(8,18,38,0.45)] backdrop-blur ${className}`}
    >
      {(title || description) && (
        <div className="border-b border-border/50 bg-bg/40 px-6 py-4">
          {title && (
            <h3 className="font-display text-lg font-semibold text-ink">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
