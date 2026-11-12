// ============================================================
// Admin workbench kit: the building blocks every admin page
// uses inside the portal shell. Server-friendly: filters and
// search are plain links and GET forms, so they work without
// client JavaScript. Styles in workbench.css.
// ============================================================

import "./tokens.css";
import "./workbench.css";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Num } from "@/components/portal/primitives";

export type Tone = "ok" | "warn" | "fail" | "neutral" | "info";

export function WbPage({
  title,
  summary,
  actions,
  children,
}: {
  title: string;
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="wb">
      <header className="wb-head">
        <div>
          <h2>{title}</h2>
          {summary && <p>{summary}</p>}
        </div>
        {actions && <div className="wb-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function WbStats({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="wb-stats">
      {items.map((s, i) => (
        <div key={s.label} className="wb-stat" style={{ "--i": i } as CSSProperties}>
          {/* A whole number counts up as the tile settles (portal-motion.css); anything else shows as written. */}
          <b>
            {typeof s.value === "number" || typeof s.value === "string" ? (
              <Num count>{s.value}</Num>
            ) : (
              s.value
            )}
          </b>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface WbMixPart {
  label: string;
  value: number;
  /** "none" draws the part in a quiet grey: the rest that is not one of the kinds (Free, no role). */
  tone?: "none";
}

/**
 * A share bar: one whole split into its parts (people by role, people by plan). Parts keep the
 * order they are given, which should be the kinds' own order, never sorted by size, so a part's
 * colour never changes when the numbers do. The key names every part with its count and share.
 */
export function WbMix({
  title,
  note,
  parts,
}: {
  title: string;
  note?: ReactNode;
  parts: WbMixPart[];
}) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (total === 0) return null;
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;
  let slot = 0;
  const shown = parts.map((p) => ({
    ...p,
    color: p.tone === "none" ? "var(--mix-none)" : `var(--mix-${(slot++ % 7) + 1})`,
  }));
  const summary = shown.map((p) => `${p.label} ${p.value} (${pct(p.value)})`).join(", ");
  return (
    <figure className="wb-mix">
      <figcaption>
        {title}
        {note !== undefined && <small>{note}</small>}
      </figcaption>
      <div className="wb-mix-bar" role="img" aria-label={`${title}: ${summary}`}>
        {shown
          .filter((p) => p.value > 0)
          .map((p) => (
            <span
              key={p.label}
              title={`${p.label}: ${p.value} (${pct(p.value)})`}
              style={{ "--n": p.value, "--c": p.color } as CSSProperties}
            />
          ))}
      </div>
      <ul className="wb-mix-key" aria-hidden="true">
        {shown.map((p, i) => (
          <li key={p.label} style={{ "--i": i, "--c": p.color } as CSSProperties}>
            <i />
            {p.label}
            <b>{p.value}</b>
            {pct(p.value)}
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function WbToolbar({ children }: { children: ReactNode }) {
  return <div className="wb-toolbar">{children}</div>;
}

/** Filter tabs as links that set one search param, keeping the others. */
export function WbTabs({
  label,
  param,
  value,
  options,
  basePath,
  params = {},
}: {
  label: string;
  param: string;
  value: string;
  options: Array<{ value: string; label: string; count?: number }>;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label={label} className="wb-tabs">
      {options.map((o) => {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v && k !== param) q.set(k, v);
        q.set(param, o.value);
        return (
          <Link
            key={o.value}
            href={`${basePath}?${q.toString()}`}
            className="wb-tab"
            aria-current={o.value === value ? "page" : undefined}
          >
            {o.label}
            {o.count !== undefined && <small>{o.count}</small>}
          </Link>
        );
      })}
    </nav>
  );
}

/** A GET search form. Hidden fields keep the other filters. */
export function WbSearch({
  label,
  placeholder,
  value,
  action,
  keep = {},
}: {
  label: string;
  placeholder: string;
  value: string;
  action: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" action={action} method="get" className="wb-search">
      {Object.entries(keep).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null
      )}
      <input
        className="wb-input"
        type="search"
        name="q"
        defaultValue={value}
        placeholder={placeholder}
        aria-label={label}
      />
      <button className="wb-btn" type="submit">
        Search
      </button>
    </form>
  );
}

export function WbPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="wb-pill" data-tone={tone}>
      {children}
    </span>
  );
}

export interface WbColumn<T> {
  key: string;
  label: string;
  numeric?: boolean;
  cell: (row: T) => ReactNode;
}

export function WbTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string;
  columns: WbColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
}) {
  if (rows.length === 0) return <div className="wb-empty">{empty}</div>;
  return (
    <div className="wb-table-wrap">
      <table className="wb-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={c.numeric ? { textAlign: "right" } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label} data-num={c.numeric ? "" : undefined}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WbEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="wb-empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function WbSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wb-section" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
