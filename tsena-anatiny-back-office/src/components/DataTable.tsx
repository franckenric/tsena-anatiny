import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, Search, Table2 } from "lucide-react";

export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  render?: (value: any, row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  actions?: (row: T) => ReactNode;
  defaultView?: "table" | "grid";
  searchable?: boolean;
  searchPlaceholder?: string;
  gridCardRender?: (row: T) => ReactNode;
  getRowKey?: (row: T, index: number) => string | number;
  tableMaxHeight?: string;
  hideControlsOnMobile?: boolean;
}

export function DataTable<T extends { id?: number | string }>({
  columns,
  data,
  isLoading,
  emptyMessage = "Aucune donnée disponible",
  actions,
  defaultView = "table",
  searchable = true,
  searchPlaceholder = "Rechercher...",
  gridCardRender,
  getRowKey,
  tableMaxHeight,
  hideControlsOnMobile = false
}: DataTableProps<T>) {
  const rows = Array.isArray(data) ? data : [];
  const [view, setView] = useState<"table" | "grid">(defaultView);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false
  );
  const resolvedTableMaxHeight = tableMaxHeight ?? "100%";

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) =>
      setIsMobile(event.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const effectiveView = isMobile ? "grid" : view;

  const renderCellValue = (row: T, col: Column<T>) => {
    const value = row[col.accessor as keyof T];
    return col.render ? col.render(value, row) : String(value || "-");
  };

  const normalizeSearchValue = (value: unknown): string => {
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
        .find(
          (entry) => typeof entry === "string" || typeof entry === "number"
        );
      if (preferredValue !== undefined) return String(preferredValue);
      return Object.values(record)
        .map((entry) => normalizeSearchValue(entry))
        .join(" ");
    }
    return "";
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (!query) return true;
    return columns.some((col) => {
      const value = row[col.accessor as keyof T];
      return normalizeSearchValue(value).toLowerCase().includes(query);
    });
  });

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-2 text-sm text-muted">Chargement...</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  const controls = (
    <div
      className={`mb-3 gap-2 sm:items-center sm:justify-between ${
        hideControlsOnMobile
          ? "hidden flex-col sm:flex sm:flex-row"
          : "flex flex-col sm:flex-row"
      }`}
    >
      {searchable ? (
        <label className="relative block w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-border/60 bg-panel/70 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted/80 focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
          />
        </label>
      ) : (
        <div />
      )}

      <div className="hidden items-center justify-end gap-1 rounded-xl border border-border/60 bg-panel/60 p-1 md:flex">
        <button
          type="button"
          onClick={() => setView("table")}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
            view === "table"
              ? "bg-brand/20 text-brand"
              : "text-muted hover:bg-bg/60 hover:text-ink"
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          Table
        </button>
        <button
          type="button"
          onClick={() => setView("grid")}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
            view === "grid"
              ? "bg-brand/20 text-brand"
              : "text-muted hover:bg-bg/60 hover:text-ink"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Modules
        </button>
      </div>
    </div>
  );

  if (filteredRows.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {controls}
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/60 bg-panel/30">
          <p className="text-sm text-muted">
            {query ? "Aucun resultat pour cette recherche" : emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  if (effectiveView === "grid") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {controls}
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((row, rowIdx) => (
              <article
                key={getRowKey ? getRowKey(row, rowIdx) : row.id || rowIdx}
                className="rounded-xl border border-border/60 bg-panel/70 p-4 shadow-[0_14px_28px_-22px_rgba(8,18,38,0.6)]"
              >
                {gridCardRender ? (
                  gridCardRender(row)
                ) : (
                  <div className="space-y-2.5">
                    <div className="mb-2 flex items-center gap-2.5 border-b border-border/40 pb-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
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
                {actions && (
                  <div className="mt-4 flex justify-end border-t border-border/50 pt-3">
                    {actions(row)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {controls}
      <div
        className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/60"
        style={{ maxHeight: resolvedTableMaxHeight }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-bg/95 backdrop-blur">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-panel/40">
            {filteredRows.map((row, rowIdx) => (
              <tr
                key={getRowKey ? getRowKey(row, rowIdx) : row.id || rowIdx}
                className="border-b border-border/40 transition hover:bg-brand/5"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-4 py-3.5 text-sm text-ink"
                    style={{ width: col.width }}
                  >
                    {renderCellValue(row, col)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-1.5">
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
