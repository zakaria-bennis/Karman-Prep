"use client";

// Shared pieces for the Revenue page's hand-drawn charts: the card heading with its
// "Sample data" badge, the hover/keyboard cursor, the floating tooltip and the table
// that says the same thing in words.

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export function PanelHead({
  title,
  sub,
  sample,
  right,
  id,
}: {
  title: string;
  sub?: ReactNode;
  sample: boolean;
  right?: ReactNode;
  id?: string;
}) {
  return (
    <header className="kp-rev-head">
      <div>
        <h2 id={id}>
          {title}
          {sample && <SampleBadge />}
        </h2>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function SampleBadge() {
  return (
    <span className="kp-rev-sample" title="Made-up rows, not your customers">
      Sample data
    </span>
  );
}

/**
 * Which bar or point is picked: the pointer picks it, and once the chart has focus the arrow
 * keys, Home and End move along. Returns handlers for the chart's focusable wrapper.
 */
export function useCursor(count: number) {
  const [active, setActive] = useState<number | null>(null);
  // A click focuses the chart too; only a keyboard focus should pick the latest bar.
  const fromPointer = useRef(false);
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (count === 0) return;
      const step: Record<string, (i: number) => number> = {
        ArrowRight: (i) => Math.min(count - 1, i + 1),
        ArrowLeft: (i) => Math.max(0, i - 1),
        Home: () => 0,
        End: () => count - 1,
      };
      const move = step[e.key];
      if (!move) return;
      e.preventDefault();
      setActive((i) => move(i ?? count - 1));
    },
    [count]
  );
  return {
    active,
    wrapper: {
      tabIndex: 0,
      onKeyDown,
      onPointerDown: () => {
        fromPointer.current = true;
      },
      onFocus: () => {
        if (!fromPointer.current) setActive((i) => i ?? count - 1);
        fromPointer.current = false;
      },
      onBlur: () => setActive(null),
    },
    pointer: (index: number | null) => setActive(index),
  };
}

/** Tooltip width in px (revenue.css sets the same). */
const TIP_W = 200;

/**
 * The floating box beside the picked bar: to its right, or to its left when there is no room,
 * and always inside the chart (no sideways scroll on a phone). It glides from bar to bar.
 */
export function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const right = x + 14;
  const left = right + TIP_W > width ? x - 14 - TIP_W : right;
  const at = Math.max(0, Math.min(width - TIP_W, left));
  return (
    <div
      className="kp-rev-tip"
      style={{ transform: `translateX(${Math.round(at)}px)` }}
      aria-hidden="true"
    >
      <div>{children}</div>
    </div>
  );
}

export function TipRow({
  color,
  label,
  value,
  strong,
}: {
  color?: string;
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <p className="kp-rev-tip-row" data-strong={strong ? "" : undefined}>
      {color ? <i style={{ background: color }} /> : <i data-blank="" />}
      <span>{label}</span>
      <b className="kp-num">{value}</b>
    </p>
  );
}

/** "Show as a table": the chart's numbers in rows, for screen readers and for copying. */
export function ChartTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
}) {
  return (
    <details className="kp-rev-table">
      <summary>Show as a table</summary>
      <div className="kp-rev-table-scroll">
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={h} scope="col" data-num={i > 0 ? "" : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                {r.cells.map((c, i) =>
                  i === 0 ? (
                    <th key={i} scope="row">
                      {c}
                    </th>
                  ) : (
                    <td key={i} data-num="">
                      {c}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Which x-axis labels to print so they never collide: every nth, always the last. */
export function tickEvery(count: number, width: number, minGap = 44): number {
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / minGap))));
}
