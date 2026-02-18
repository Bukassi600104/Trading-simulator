"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

// --- Types ---
export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

type SortDirection = "asc" | "desc";

interface SortState {
  key: string;
  direction: SortDirection;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  defaultSort?: SortState;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  compact?: boolean;
  stickyHeader?: boolean;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function Table<T>({
  columns,
  data,
  keyExtractor,
  defaultSort,
  pageSize = 0,
  emptyMessage = "No data available",
  onRowClick,
  className,
  compact = false,
  stickyHeader = false,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort || null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = useCallback(
    (key: string) => {
      setSort((prev) => {
        if (prev?.key === key) {
          return prev.direction === "asc"
            ? { key, direction: "desc" }
            : null;
        }
        return { key, direction: "asc" };
      });
      setCurrentPage(1);
    },
    []
  );

  const sortedData = useMemo(() => {
    if (!sort) return data;

    return [...data].sort((a, b) => {
      const aVal = getNestedValue(a, sort.key);
      const bVal = getNestedValue(b, sort.key);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sort]);

  const paginatedData = useMemo(() => {
    if (pageSize <= 0) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = pageSize > 0 ? Math.ceil(data.length / pageSize) : 1;

  return (
    <div className={cn("w-full overflow-hidden rounded-lg border border-dark-700/50", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={cn("border-b border-dark-700/50", stickyHeader && "sticky top-0 z-10")}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "bg-dark-800/80 text-xs font-semibold uppercase tracking-wider text-dark-400",
                    compact ? "px-3 py-2" : "px-4 py-3",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.sortable && "cursor-pointer select-none hover:text-dark-300 transition-colors"
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col text-[8px] leading-none" aria-hidden="true">
                        <span className={sort?.key === col.key && sort.direction === "asc" ? "text-primary-400" : "text-dark-600"}>
                          ▲
                        </span>
                        <span className={sort?.key === col.key && sort.direction === "desc" ? "text-primary-400" : "text-dark-600"}>
                          ▼
                        </span>
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-dark-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  className={cn(
                    "border-b border-dark-700/30 transition-colors last:border-0",
                    onRowClick
                      ? "cursor-pointer hover:bg-dark-800/60"
                      : "hover:bg-dark-800/30"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "text-sm text-dark-200",
                        compact ? "px-3 py-2" : "px-4 py-3",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center"
                      )}
                    >
                      {col.render
                        ? col.render(getNestedValue(row, col.key), row, index)
                        : (getNestedValue(row, col.key) as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-dark-700/50 bg-dark-800/50 px-4 py-2.5">
          <span className="text-xs text-dark-500">
            {(currentPage - 1) * pageSize + 1}--{Math.min(currentPage * pageSize, data.length)} of {data.length}
          </span>

          <div className="flex items-center gap-1">
            <button
              className="rounded-md px-2 py-1 text-xs text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, i, arr) => {
                const showEllipsis = i > 0 && p - arr[i - 1] > 1;
                return (
                  <span key={p} className="inline-flex items-center">
                    {showEllipsis && (
                      <span className="px-1 text-xs text-dark-600">...</span>
                    )}
                    <button
                      className={cn(
                        "h-7 min-w-[28px] rounded-md text-xs transition-colors",
                        p === currentPage
                          ? "bg-primary-500/20 text-primary-400 font-semibold"
                          : "text-dark-400 hover:bg-dark-700 hover:text-dark-200"
                      )}
                      onClick={() => setCurrentPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={p === currentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}

            <button
              className="rounded-md px-2 py-1 text-xs text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Table };
