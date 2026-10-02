import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, Search, Table2, X } from "lucide-react";
import { cn } from "../lib/utils";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";

export interface DataListColumn<T> {
  header: string;
  accessor: keyof T | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: T) => ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DataListProps<T extends { id?: number | string }> {
  columns: DataListColumn<T>[];
  data: T[];
  title?: string;
  description?: string;
  headerAction?: ReactNode;

  isLoading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;

  actions?: (row: T) => ReactNode;
  gridCardRender?: (row: T) => ReactNode;
  getRowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  isRowActive?: (row: T) => boolean;
  defaultView?: "table" | "grid";
  allowViewToggle?: boolean;

  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  toolbar?: ReactNode;

  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  itemLabel?: string;
  showPagination?: boolean;

  className?: string;
  bodyClassName?: string;
}

function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSearchValue(item)).join(" ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = ["name", "full_name", "email", "label", "sku"];
    const preferredValue = preferred
      .map((key) => record[key])
      .find((entry) => typeof entry === "string" || typeof entry === "number");
    if (preferredValue !== undefined) return String(preferredValue);
    return Object.values(record)
      .map((entry) => normalizeSearchValue(entry))
      .join(" ");
  }
  return "";
}

export function DataList<T extends { id?: number | string }>({
  columns,
  data,
  title,
  description,
  headerAction,
  isLoading = false,
  emptyMessage = "Aucune donnée disponible",
  emptyTitle,
  emptyIcon,
  emptyAction,
  actions,
  gridCardRender,
  getRowKey,
  onRowClick,
  isRowActive,
  defaultView = "table",
  allowViewToggle = true,
  searchable = true,
  searchPlaceholder = "Rechercher...",
  searchValue,
  onSearchValueChange,
  toolbar,
  page,
  totalPages,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  itemLabel = "éléments",
  showPagination = true,
  className,
  bodyClassName
}: DataListProps<T>) {
  const rows = Array.isArray(data) ? data : [];
  const [view, setView] = useState<"table" | "grid">(defaultView);
  const [internalSearch, setInternalSearch] = useState("");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false
  );

  const query = (searchValue ?? internalSearch).trim().toLowerCase();
  const setSearch = onSearchValueChange ?? setInternalSearch;

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) =>
      setIsMobile(event.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const effectiveView = isMobile ? "grid" : view;

  const filteredRows = useMemo(() => {
    if (!query) return rows;
    return rows.filter((row) =>
      columns.some((col) =>
        normalizeSearchValue(row[col.accessor as keyof T])
          .toLowerCase()
          .includes(query)
      )
    );
  }, [rows, columns, query]);

  const renderCellValue = (row: T, col: DataListColumn<T>) => {
    const value = row[col.accessor as keyof T];
    return col.render ? col.render(value, row) : String(value ?? "-");
  };

  const rowKey = (row: T, index: number) =>
    getRowKey ? getRowKey(row, index) : row.id ?? index;

  const hasPagination =
    showPagination &&
    onPageChange != null &&
    total != null &&
    totalPages != null;
  const hasToolbar = searchable || toolbar || allowViewToggle;
  const skeletonCount = pageSize ? Math.min(pageSize, 8) : 6;
  const totalCount = total ?? rows.length;

  const header = (title || description || headerAction) && (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-bg/40 px-3 py-2 sm:px-6 sm:py-3">
      <div className="min-w-0">
        {title && (
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        )}
        {description && (
          <p className="mt-0.5 hidden text-sm text-muted sm:block">{description}</p>
        )}
      </div>
      {headerAction && (
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {headerAction}
        </div>
      )}
    </div>
  );

  const toolbarRow = hasToolbar && (
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:justify-between sm:gap-3 sm:px-6 sm:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xl">
        {searchable && (
          <label className="relative block min-w-0 flex-1 sm:max-w-xs sm:flex-none">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchValue ?? internalSearch}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-border/70 bg-panel/70 pl-10 pr-9 text-sm text-ink outline-none transition placeholder:text-muted/70 focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/20"
            />
            {(searchValue ?? internalSearch) && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition hover:bg-bg hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        )}
        <span className="hidden shrink-0 items-center whitespace-nowrap text-xs font-semibold text-muted sm:inline-flex">
          {totalCount} {itemLabel}
        </span>
      </div>

      <div
        className={cn(
          "flex items-center gap-2",
          toolbar ? "w-full sm:w-auto sm:justify-end" : "shrink-0"
        )}
      >
        {toolbar}
        {allowViewToggle && !isMobile && (
          <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-panel/60 p-1">
            {(
              [
                { key: "table", icon: Table2, label: "Tableau" },
                { key: "grid", icon: LayoutGrid, label: "Cartes" }
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setView(option.key)}
                aria-pressed={view === option.key}
                aria-label={`Vue ${option.key === "table" ? "tableau" : "cartes"}`}
                title={`Vue ${option.key === "table" ? "tableau" : "cartes"}`}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg p-0 text-xs font-semibold transition sm:w-auto sm:px-3",
                  view === option.key
                    ? "bg-brand text-white shadow-sm shadow-brand/25"
                    : "text-muted hover:bg-bg/70 hover:text-ink"
                )}
              >
                <option.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
        )}
        <span className="whitespace-nowrap text-xs font-semibold text-muted sm:hidden">
          {totalCount} {itemLabel}
        </span>
      </div>
    </div>
  );

  const footer = hasPagination && (
    <div className="shrink-0 border-t border-border/50 px-3 py-2 sm:px-6 sm:py-2.5">
      <Pagination
        page={page ?? 1}
        totalPages={totalPages ?? 1}
        total={total ?? 0}
        onPageChange={onPageChange!}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        itemLabel={itemLabel}
        showCount={false}
        isLoading={isLoading}
      />
    </div>
  );

  const renderSkeleton = () => {
    if (effectiveView === "grid") {
      return (
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 sm:px-6 xl:grid-cols-3">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse space-y-3 rounded-2xl border border-border/50 bg-panel/50 p-3 sm:p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-border/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded-full bg-border/60" />
                  <div className="h-2.5 w-1/3 rounded-full bg-border/50" />
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-border/50" />
              <div className="h-2.5 w-4/5 rounded-full bg-border/50" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="animate-pulse p-4 sm:px-6">
        <div className="space-y-3">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-panel/40 px-4 py-3.5"
            >
              <div className="h-9 w-9 shrink-0 rounded-lg bg-border/60" />
              <div className="h-3 flex-1 rounded-full bg-border/60" />
              <div className="hidden h-3 w-24 rounded-full bg-border/50 sm:block" />
              <div className="hidden h-3 w-16 rounded-full bg-border/50 md:block" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const emptyState = (
    <EmptyState
      title={emptyTitle ?? emptyMessage}
      description={
        query
          ? `Aucun résultat pour « ${searchValue ?? internalSearch} ».`
          : undefined
      }
      icon={emptyIcon}
      action={!query ? emptyAction : undefined}
    />
  );

  const body = () => {
    if (isLoading) return renderSkeleton();
    if (filteredRows.length === 0) return emptyState;

    if (effectiveView === "grid") {
      return (
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 sm:px-6 xl:grid-cols-3">
          {filteredRows.map((row, index) => {
            const active = isRowActive?.(row);
            return (
              <article
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "group flex flex-col rounded-2xl border border-border/60 bg-panel/70 p-3 shadow-card transition-all sm:p-4",
                  onRowClick &&
                    "cursor-pointer hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift",
                  active && "border-brand/60 ring-2 ring-brand/25"
                )}
              >
                <div className="flex-1">
                  {gridCardRender ? (
                    gridCardRender(row)
                  ) : (
                    <div className="space-y-2.5">
                      <div className="mb-2 flex items-center gap-2.5 border-b border-border/40 pb-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
                          <LayoutGrid className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 truncate text-sm font-semibold text-ink">
                          {renderCellValue(row, columns[0])}
                        </span>
                      </div>
                      {columns.slice(1).map((col, colIdx) => (
                        <div
                          key={colIdx}
                          className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                            {col.header}
                          </span>
                          <span className="text-right text-sm text-ink">
                            {renderCellValue(row, col)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {actions && (
                  <div className="data-list-actions mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-border/50 pt-3">
                    {actions(row)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      );
    }

    return (
      <div className="px-4 pb-2 sm:px-6">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{ width: col.width }}
                  className={cn(
                    "sticky top-0 z-10 border-b border-border/60 bg-panel pb-3 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted",
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  )}
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="sticky top-0 z-10 border-b border-border/60 bg-panel pb-3 pt-2 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const active = isRowActive?.(row);
              return (
                <tr
                  key={rowKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "group transition-colors",
                    onRowClick && "cursor-pointer",
                    active ? "bg-brand/5" : "hover:bg-brand/[0.04]"
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      style={{ width: col.width }}
                      className={cn(
                        "border-b border-border/40 py-3.5 pr-4 text-sm text-ink last:pr-0",
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left"
                      )}
                    >
                      {renderCellValue(row, col)}
                    </td>
                  ))}
                  {actions && (
                    <td className="border-b border-border/40 py-3 text-right">
                      <div className="data-list-actions flex items-center justify-end gap-1.5">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section
      className={cn(
        "flex min-h-0 shrink flex-col overflow-hidden rounded-2xl border border-border/70 bg-panel/75 shadow-card backdrop-blur",
        className
      )}
    >
      {header}
      <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>
        {toolbarRow}
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          {body()}
        </div>
        {footer}
      </div>
    </section>
  );
}
