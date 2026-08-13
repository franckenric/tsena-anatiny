import { getPaginationItems } from "../lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { cn } from "../lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  isLoading?: boolean;
  showCount?: boolean;
  showPageSize?: boolean;
  showFirstLast?: boolean;
  className?: string;
}

const NAV_BUTTON =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-35";

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "éléments",
  isLoading = false,
  showCount = true,
  showPageSize = true,
  showFirstLast = true,
  className
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), safeTotalPages);

  const hasRange = pageSize != null && pageSize > 0;
  const from = !hasRange || total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = hasRange ? Math.min(current * pageSize, total) : total;

  const items = getPaginationItems(current, safeTotalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {showCount && (
        <p className="text-xs font-medium text-muted sm:text-sm">
          {total === 0
            ? `Aucun ${itemLabel}`
            : hasRange
              ? `${from}–${to} sur ${total} ${itemLabel}`
              : `${total} ${itemLabel}`}
        </p>
      )}

      <nav
        className="flex flex-wrap items-center justify-center gap-1"
        aria-label="Pagination"
      >
        {showPageSize && pageSize != null && onPageSizeChange != null && (
          <button
            type="button"
            aria-label="Changer le nombre d'éléments par page"
            title="Éléments par page"
            onClick={() => {
              const index = pageSizeOptions.indexOf(pageSize);
              const next =
                pageSizeOptions[(index + 1) % pageSizeOptions.length] ??
                pageSize;
              onPageSizeChange(next);
              onPageChange(1);
            }}
            disabled={isLoading}
            className={cn(
              NAV_BUTTON,
              "mr-1 border border-border bg-bg text-muted hover:border-brand/50 hover:text-brand"
            )}
          >
            {pageSize}
          </button>
        )}

        {showFirstLast && (
          <button
            type="button"
            aria-label="Première page"
            onClick={() => onPageChange(1)}
            disabled={isLoading || current <= 1}
            className={cn(
              NAV_BUTTON,
              "hidden text-muted hover:bg-brand/10 hover:text-ink sm:inline-flex"
            )}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="Page précédente"
          onClick={() => onPageChange(Math.max(1, current - 1))}
          disabled={isLoading || current <= 1}
          className={cn(
            NAV_BUTTON,
            "text-muted hover:bg-brand/10 hover:text-ink"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="hidden min-w-6 px-0.5 text-center text-sm text-muted sm:inline-block"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === current ? "page" : undefined}
              onClick={() => onPageChange(item)}
              disabled={isLoading || item === current}
              className={cn(
                NAV_BUTTON,
                item === current
                  ? "bg-brand text-white shadow-md shadow-brand/30"
                  : "text-muted hover:bg-brand/10 hover:text-ink"
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Page suivante"
          onClick={() => onPageChange(Math.min(safeTotalPages, current + 1))}
          disabled={isLoading || current >= safeTotalPages}
          className={cn(
            NAV_BUTTON,
            "text-muted hover:bg-brand/10 hover:text-ink"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {showFirstLast && (
          <button
            type="button"
            aria-label="Dernière page"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={isLoading || current >= safeTotalPages}
            className={cn(
              NAV_BUTTON,
              "hidden text-muted hover:bg-brand/10 hover:text-ink sm:inline-flex"
            )}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </nav>
    </div>
  );
}
