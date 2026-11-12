// Small pieces the Schools, For tutors and Free practice test pages share: the tick, a progress ring for the
// drawn portal screens, and a reader for copy rows with three parts ("a = b = c | ...").
import type { CSSProperties } from "react";
import { list } from "@/lib/marketing/site-copy";

export function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

/** A small progress ring with the percent in the middle, for the drawn portal screens. */
export function Ring({ pct }: { pct: number }) {
  return (
    <span className="au-ring" style={{ "--v": pct / 100 } as CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" />
        <circle cx="18" cy="18" r="15" pathLength="100" />
      </svg>
      <b className="num">{pct}</b>
    </span>
  );
}

/** "a = b = c | d = e = f" -> [["a", "b", "c"], ["d", "e", "f"]] */
export function triples(s: string | undefined): string[][] {
  return list(s).map((row) => row.split(" = ").map((x) => x.trim()));
}

/** The rows of a section as a numbered list, as on the SAT Program page. */
export function Moves({ rows }: { rows: [string, string][] }) {
  return (
    <ol className="pg-moves">
      {rows.map(([k, v]) => (
        <li key={k}>
          <b>{k}</b>
          <span>{v}</span>
        </li>
      ))}
    </ol>
  );
}

/** A cream card listing the rows with a tick each: the bold label, then its line. */
export function TickCard({ title, rows }: { title?: string; rows: [string, string][] }) {
  return (
    <article className="pg-terms au-ticks">
      {title ? <h3>{title}</h3> : null}
      <ul>
        {rows.map(([k, v]) => (
          <li key={k}>
            <Tick />
            <span>
              <b>{k}</b> {v}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
