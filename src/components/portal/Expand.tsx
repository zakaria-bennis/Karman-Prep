"use client";

/*
 * Progressive disclosure (founder, 2026-11-08): a card or row that opens in place with a smooth
 * slide, showing more, instead of jumping to a new page. Where a full page is still needed, the
 * opened part carries the link to it. The summary is a real button (aria-expanded), so it works
 * by keyboard and screen reader. Reduced motion opens it without the slide.
 */
import { useId, useState, type CSSProperties, type ReactNode } from "react";

export function Expand({
  summary,
  children,
  defaultOpen = false,
  tint,
  label,
}: {
  /** What shows while closed: the heading, squares, a count. */
  summary: ReactNode;
  /** What slides open. */
  children: ReactNode;
  defaultOpen?: boolean;
  /** A color for the card's wash and edge, for example a level shade (var(--l3)). */
  tint?: string;
  /** Accessible name for the region that opens. */
  label?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div
      className="kp-expand"
      data-open={open ? "" : undefined}
      style={tint ? ({ "--tint": tint } as CSSProperties) : undefined}
    >
      <button
        type="button"
        className="kp-expand-sum"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="kp-expand-body">{summary}</span>
        <svg
          className="kp-expand-chev"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className="kp-expand-panel" id={id} role="region" aria-label={label} inert={!open}>
        <div className="kp-expand-inner">{children}</div>
      </div>
    </div>
  );
}
