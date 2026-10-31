import { useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../cn";
import { Icon } from "../icons";
import { useWidth } from "./hooks";

/*
 * DataTable: rules and alignment. 12px grey sentence-case headers, no header
 * band, no zebra, numbers right-aligned in tabular figures, a sort glyph on the
 * active column only, empties last in both directions. The sorting model is
 * ported from Sortable Data Table (21st.dev 35036, kuratlielia); its selection,
 * motion and CSS module were not. Under 560px the rows become two lines.
 */
export type SortState = { key: string; dir: "asc" | "desc" };
export interface Column<T> {
  key: keyof T & string;
  label: string;
  numeric?: boolean;
  sortable?: boolean;
  render?(value: T[keyof T], row: T): ReactNode;
  width?: string;
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const empty = (v: unknown) => v == null || v === "";

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  rowKey,
  caption,
  defaultSort,
  emptyMessage = "Nothing to show",
  className,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: keyof T & string;
  caption: string;
  defaultSort?: SortState;
  emptyMessage?: string;
  className?: string;
}) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);
  const host = useRef<HTMLDivElement>(null);
  const narrow = useWidth(host) < 560;
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const k = sort.key as keyof T;
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const l = a.row[k];
        const r = b.row[k];
        if (empty(l) || empty(r))
          return empty(l) === empty(r) ? a.index - b.index : empty(l) ? 1 : -1;
        const res =
          typeof l === "number" && typeof r === "number"
            ? l - r
            : collator.compare(String(l), String(r));
        return (sort.dir === "asc" ? res : -res) || a.index - b.index;
      })
      .map((e) => e.row);
  }, [rows, sort]);
  const numeric = (c: Column<T>) => c.numeric ?? rows.some((r) => typeof r[c.key] === "number");
  const cell = (c: Column<T>, row: T) =>
    c.render ? (
      c.render(row[c.key], row)
    ) : empty(row[c.key]) ? (
      <span className="text-muted">-</span>
    ) : (
      String(row[c.key])
    );
  const toggle = (c: Column<T>) =>
    setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === "asc" ? "desc" : "asc" }));
  const [first, ...rest] = columns;

  return (
    <div ref={host} className={cn("w-full", className)}>
      {narrow ? (
        <ul aria-label={caption} className="divide-y divide-line">
          {sorted.map((row) => (
            <li key={String(row[rowKey])} className="grid min-h-12 gap-0.5 py-2">
              <div className="flex items-baseline justify-between gap-3 text-body">
                <span className="truncate font-medium">{cell(first, row)}</span>
                {rest[0] ? <span className="tabular">{cell(rest[0], row)}</span> : null}
              </div>
              {rest.length > 1 ? (
                <div className="flex flex-wrap gap-x-3 text-dense text-muted">
                  {rest.slice(1).map((c) => (
                    <span key={c.key}>
                      {c.label} <span className="tabular text-text">{cell(c, row)}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
          {!sorted.length ? <li className="py-3 text-dense text-muted">{emptyMessage}</li> : null}
        </ul>
      ) : (
        <table className="w-full border-collapse text-dense">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const on = sort?.key === c.key;
                const num = numeric(c);
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      c.sortable === false
                        ? undefined
                        : on
                          ? sort!.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                    }
                    className={cn(
                      "h-9 px-2 text-small font-normal text-muted first:pl-0 last:pr-0",
                      num ? "text-right" : "text-left"
                    )}
                    style={{ width: c.width }}
                  >
                    {c.sortable === false ? (
                      c.label
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        className={cn(
                          "inline-flex min-h-tap min-w-tap items-center gap-1 hover:text-text",
                          num ? "flex-row-reverse justify-start" : "justify-start",
                          on && "text-text"
                        )}
                        aria-label={`Sort by ${c.label}`}
                      >
                        {c.label}
                        {on ? (
                          <Icon
                            name={sort!.dir === "asc" ? "chevronUp" : "chevronDown"}
                            size={20}
                          />
                        ) : null}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((row) => (
              <tr key={String(row[rowKey])}>
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      "h-11 px-2 first:pl-0 last:pr-0",
                      numeric(c) ? "tabular text-right" : "text-left",
                      i === 0 && "font-medium text-text"
                    )}
                  >
                    {cell(c, row)}
                  </td>
                ))}
              </tr>
            ))}
            {!sorted.length ? (
              <tr>
                <td colSpan={columns.length} className="py-3 text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </div>
  );
}
