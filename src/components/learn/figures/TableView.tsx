"use client";

// ============================================================
// TableView: draws a `type: table` FigureSpec as a native HTML table, so it
// stays readable by screen readers and selectable. The house table rules:
// one header style, one rule weight (1px, --figure-ink-muted), numbers on
// the decimal point, text left-aligned, a blank top-left corner when the exam
// has one, merged headings, and cell math typeset by MathText exactly like
// question text. Words never break: cells wrap only at spaces. A table wider
// than its column scrolls sideways inside its own frame with the first column
// pinned, a fade on each edge with more content past it, and the title and note
// kept in view; the page never scrolls sideways. The frame is always a focusable,
// named region, so a keyboard can scroll it. Colors come only from theme roles.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import MathText from "@/components/learn/MathText";
import { displayProse } from "@/components/learn/dash-blank-display";
import type { FigureSpec } from "@/lib/figures/engine/spec";
import { layoutTable, plainWords, scrollEdges, type TableCell } from "@/lib/figures/engine/table";
import { cn } from "@/lib/utils";
import "./figure-roles.css";

/** Wrap only at spaces: no breaks inside a word, no hyphenation. */
const WORD_WRAP = "[word-break:normal] [overflow-wrap:normal] [hyphens:none]";
const RULE = "border-[color:var(--figure-ink-muted)]";
const SURFACE = "bg-[color:var(--figure-surface)]";
const CELL = cn(
  "px-4 py-2.5 text-base leading-snug md:text-lg text-[color:var(--figure-ink)]",
  RULE,
  WORD_WRAP
);
/** The one header style, for column headings and merged headings alike. */
const HEAD = cn(CELL, "border-b text-center align-bottom font-semibold");
const ALIGN = {
  decimal: "text-center whitespace-nowrap",
  left: "text-left",
  center: "text-center",
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Tracks which edges of the scroll frame hide content, and the frame's width while
 * the table overflows (the title and note are pinned to that width, so they stay in view).
 */
function useScrollEdges() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ left: false, right: false, view: 0 });
  const update = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    const edges = scrollEdges(el.scrollLeft, el.clientWidth, el.scrollWidth);
    const view = el.scrollWidth > el.clientWidth + 1 ? el.clientWidth : 0;
    setState((s) =>
      s.left === edges.left && s.right === edges.right && s.view === view ? s : { ...edges, view }
    );
  }, []);
  useIsomorphicLayoutEffect(() => {
    update();
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [update]);
  return { frameRef, ...state, update };
}

/** A fade over one edge of the frame; with the partly cut column it shows there is more. */
function EdgeFade({ side, shown }: { side: "left" | "right"; shown: boolean }) {
  return (
    <div
      aria-hidden
      data-fade={side}
      data-shown={shown ? "true" : "false"}
      className={cn(
        "pointer-events-none absolute inset-y-0 z-[2] w-8 from-[color:var(--figure-surface)] to-transparent transition-opacity",
        side === "right" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r",
        shown ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

function renderText(text: string, renderMath: boolean): ReactNode {
  const words = plainWords(text) && plainWords(displayProse(text));
  if (!words) return renderMath ? <MathText text={text} /> : displayProse(text);
  return (
    <span>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          " "
        ) : (
          <span key={i} className="whitespace-nowrap">
            {w}
          </span>
        )
      )}
    </span>
  );
}

function renderNumber(cell: TableCell, layout: { intEm: number; fracEm: number }) {
  return (
    <span className="inline-block whitespace-nowrap tabular-nums">
      <span
        data-int=""
        className="inline-block text-right"
        style={{ minWidth: `${layout.intEm}em` }}
      >
        {cell.int}
      </span>
      <span
        data-frac=""
        className="inline-block text-left"
        style={{ minWidth: `${layout.fracEm}em` }}
      >
        {cell.frac}
      </span>
    </span>
  );
}

export default function TableView({
  spec,
  renderMath = true,
  ariaLabel,
  className,
  children,
}: {
  spec: FigureSpec;
  /** Pass `false` to show cell text as is, without typesetting math. */
  renderMath?: boolean;
  /** Names the figure; distinguishes tables shown as separate answer choices. */
  ariaLabel?: string;
  className?: string;
  /** Rendered just after the table's frame (the calculator's transfer control). */
  children?: ReactNode;
}) {
  const table = layoutTable(spec);
  const { header, groups, rows, columnCount, decimal } = table;
  const { frameRef, left, right, view, update } = useScrollEdges();
  const name = ariaLabel ?? table.title ?? "Question data table";
  // The title and note stay in view while the table scrolls: pinned to the frame's width.
  const inView = "sticky left-0 block px-4";
  const inViewStyle = view ? { width: `${view}px` } : undefined;
  // Column rules: the first column is pinned while the table scrolls and carries the
  // rule on its right edge; every column after the second has a rule on its left.
  const columnRule = (ci: number) =>
    ci === 0
      ? cn("sticky left-0 z-[1]", SURFACE, columnCount > 1 && "border-r")
      : ci >= 2 && "border-l";
  const lastRow = rows.length - 1;

  const bodyCell = (cell: TableCell, ri: number, ci: number) => {
    const layout = decimal[ci];
    const content =
      cell.align === "decimal" && layout
        ? renderNumber(cell, layout)
        : renderText(cell.text, renderMath);
    const props = {
      "data-align": cell.align,
      className: cn(
        CELL,
        "font-normal",
        ALIGN[cell.align],
        (ri < lastRow || table.note) && "border-b",
        columnRule(ci)
      ),
    };
    return table.rowHeaders && ci === 0 ? (
      <th key={ci} scope="row" {...props}>
        {content}
      </th>
    ) : (
      <td key={ci} {...props}>
        {content}
      </td>
    );
  };

  // The first column each merged heading covers.
  const groupStarts = (groups ?? []).map((_, i) =>
    groups!.slice(0, i).reduce((sum, g) => sum + g.span, 0)
  );
  return (
    <figure
      aria-label={ariaLabel ?? (table.title ? undefined : "Question data table")}
      className={cn(
        "themed-question-figure themed-question-table my-4 inline-block min-w-0 max-w-full overflow-hidden rounded-lg border",
        RULE,
        SURFACE,
        className
      )}
    >
      <div className="relative">
        <div
          ref={frameRef}
          onScroll={update}
          tabIndex={0}
          role="region"
          aria-label={`${name}, scrollable table`}
          className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--figure-highlight)]"
        >
          {/* border-separate: each cell owns its rules, so the pinned column keeps them. */}
          <table className="w-full border-separate border-spacing-0">
            {table.title && (
              <caption className={cn(CELL, "caption-top border-b px-0 text-center font-semibold")}>
                <span className={inView} style={inViewStyle}>
                  {renderText(table.title, renderMath)}
                </span>
              </caption>
            )}
            {(header || groups) && (
              <thead>
                {groups && (
                  <tr>
                    {groups.map((group, i) => {
                      const start = groupStarts[i];
                      const rule = group.span === 1 || start > 0 ? columnRule(start) : undefined;
                      if (!group.label)
                        return <td key={i} colSpan={group.span} className={cn(CELL, rule)} />;
                      return (
                        <th
                          key={i}
                          scope="colgroup"
                          colSpan={group.span}
                          className={cn(HEAD, rule)}
                        >
                          {renderText(group.label, renderMath)}
                        </th>
                      );
                    })}
                  </tr>
                )}
                {header && (
                  <tr>
                    {header.map((h, i) =>
                      i === 0 && table.blankCorner ? (
                        // A two-way table's blank corner keeps its rules but is not a heading.
                        <td key={i} data-table-corner="" className={cn(HEAD, columnRule(0))} />
                      ) : (
                        <th key={i} scope="col" className={cn(HEAD, columnRule(i))}>
                          {renderText(h.text, renderMath)}
                        </th>
                      )
                    )}
                  </tr>
                )}
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => bodyCell(cell, ri, ci))}</tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columnCount}
                    data-table-empty=""
                    className={cn(CELL, "text-center italic text-[color:var(--figure-ink-muted)]")}
                  >
                    No data
                  </td>
                </tr>
              )}
            </tbody>
            {table.note && (
              <tfoot>
                <tr>
                  <td
                    colSpan={columnCount}
                    className={cn(
                      "py-3 text-center text-sm italic text-[color:var(--figure-ink-muted)]",
                      WORD_WRAP
                    )}
                  >
                    <span className={inView} style={inViewStyle}>
                      {renderText(table.note, renderMath)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <EdgeFade side="left" shown={left} />
        <EdgeFade side="right" shown={right} />
      </div>
      {children}
    </figure>
  );
}
