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
  "inline-flex h-8 min-w-7 items-center justify-center rounded-lg px-1.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-35 sm:h-9 sm:min-w-9 sm:px-2";

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

  const items = getPaginationItems(current, safeTotalPages);
  const compactOnMobile = safeTotalPages > 5;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-2",
        className
      )}
    >
      {showCount && (
        <p className="whitespace-nowrap text-xs font-medium text-muted">
          {total === 0 ? `Aucun ${itemLabel}` : `${total} ${itemLabel}`}
        </p>
      )}

      <nav
        className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1"
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
              "mr-1 hidden border border-border bg-bg text-muted hover:border-brand/50 hover:text-brand sm:inline-flex"
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
                compactOnMobile && Math.abs(item - current) > 1
                  ? "hidden sm:inline-flex"
                  : "",
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
