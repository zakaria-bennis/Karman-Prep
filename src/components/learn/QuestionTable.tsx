"use client";

// ============================================================
// QuestionTable — renders a question figure as a native HTML
// table, styled with Karman's observatory tokens (warm dark
// canvas + thin ivory rules edge to edge + ivory text).
//
// Used in place of the raster crop when a question's figure_kind
// is 'table' and figure_table_data is populated. The data shape
// is produced by scripts/figure-extraction/extract-table-data.mjs.
//
// Why HTML and not the image:
//   · Native rendering scales perfectly with viewport + zoom
//   · Selectable / readable by screen readers
//   · Inherits the design tokens (no JPEG-on-page-bg vibe)
//   · No raster artifacts on retina
//
// Words never break (question-table-fit.ts): cells wrap only at spaces. Tables start at
// 18px type; one too wide for its column (or, on a laptop, too tall for its pane) steps
// its padding and type down to 13px, then scrolls sideways inside its frame with the
// first column pinned and fades on the hidden edges. Row rules run edge to edge: the
// frame never has padding of its own, so callers must not add any.
//
// Cell values may contain inline math; we pass through MathText
// so KaTeX renders correctly in headers + body.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalculatorTableAction } from "@/components/calculator/CalculatorSourceAction";
import MathText from "@/components/learn/MathText";
import { cn } from "@/lib/utils";
import type { QuestionTableData } from "@/types/question-table";
import {
  DENSITY_CELL,
  WORD_WRAP,
  fitTable,
  isNumericCell,
  plainWords,
  scrollEdges,
  startingDensity,
  tightenUnits,
  type TableDensity,
} from "./question-table-fit";
export type { QuestionTableData } from "@/types/question-table";

interface Props {
  data: QuestionTableData;
  calculator?: boolean;
  /** Inline math? Pass `false` to skip KaTeX wrapping for plain-text-only tables. */
  renderMath?: boolean;
  /** Distinguishes multiple tables used as separate answer choices. */
  ariaLabel?: string;
  /** Optional wrapper class. */
  className?: string;
  /** The transfer item id of this table: "table", or "choice:<letter>" for a table choice. */
  calculatorItemId?: string;
}

const RULE = "border-ivory/70";
// Pinned first column while the table scrolls: opaque so scrolled cells pass beneath it,
// a rule on its right edge, and a fade just past that rule (padding box + 1px border) once
// content is scrolled under it.
const PINNED = cn(
  "sticky left-0 z-[1] border-r bg-surface",
  "after:pointer-events-none after:absolute after:inset-y-0 after:right-[-17px] after:w-4 after:bg-gradient-to-r after:from-[color:var(--figure-surface)] after:to-transparent after:opacity-0 after:transition-opacity after:content-['']",
  "group-data-[scrolled=true]/table:after:opacity-100"
);

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** On a laptop or wider, the height of the scrolling pane the table sits in (inside its padding). */
function paneHeight(fig: HTMLElement): number | null {
  if (!window.matchMedia?.("(min-width: 768px)").matches) return null;
  for (let el = fig.parentElement; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflowY)) continue;
    const inner =
      el.clientHeight -
      parseFloat(style.paddingTop || "0") -
      parseFloat(style.paddingBottom || "0");
    return inner > 0 ? inner : null;
  }
  return null;
}

/** Fits the table to its column, measuring the rendered widths at each density. */
function useTableFit(columns: number) {
  const figureRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // First paint guesses from the column count; the measurement then steps down from roomy.
  const [tier, setTier] = useState<TableDensity>(() => startingDensity(columns));
  const [overflow, setOverflow] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const next = scrollEdges(sc.scrollLeft, sc.clientWidth, sc.scrollWidth);
    setEdges((e) => (e.left === next.left && e.right === next.right ? e : next));
  }, []);

  const measure = useCallback(() => {
    const fig = figureRef.current;
    const sc = scrollerRef.current;
    // Not laid out yet (hidden or unmounted parent): keep the guess until it has a width.
    if (!fig || !sc || sc.clientWidth === 0) return;
    fig.style.setProperty("--table-view", "auto");
    const maxHeight = paneHeight(fig);
    const fits = (t: TableDensity) => {
      fig.dataset.tableDensity = t;
      return {
        width: sc.scrollWidth <= sc.clientWidth + 1,
        height: maxHeight === null || fig.getBoundingClientRect().height <= maxHeight + 1,
      };
    };
    const result = fitTable("large", fits);
    fig.dataset.tableDensity = result.tier;
    fig.style.setProperty("--table-view", result.overflow ? `${sc.clientWidth}px` : "auto");
    setTier(result.tier);
    setOverflow(result.overflow);
    updateEdges();
  }, [updateEdges]);

  useIsomorphicLayoutEffect(() => {
    measure();
    const fig = figureRef.current;
    const parent = fig?.parentElement;
    if (!fig || !parent || typeof ResizeObserver === "undefined") return;
    let lastWidth = parent.clientWidth;
    const observer = new ResizeObserver(() => {
      if (parent.clientWidth === lastWidth) return;
      lastWidth = parent.clientWidth;
      measure();
    });
    observer.observe(parent);
    // The figure serif (STIX) can arrive after first paint and change every width.
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [measure]);

  return { figureRef, scrollerRef, tier, overflow, edges, updateEdges };
}

export default function QuestionTable({
  data,
  renderMath = true,
  ariaLabel,
  className,
  calculator = false,
  calculatorItemId = "table",
}: Props) {
  const { caption, header_groups, header_row, rows, footer_note } = data;
  const columns = Math.max(header_row?.length ?? 0, ...rows.map((r) => r.length), 1);
  const { figureRef, scrollerRef, tier, overflow, edges, updateEdges } = useTableFit(columns);

  // WORD_WRAP keeps words whole; nowrap words also stop breaks at hyphens ("1980-81").
  const renderCell = (source: string, key: string) => {
    const text = tightenUnits(source);
    const words = plainWords(text);
    if (!words) return <span key={key}>{renderMath ? <MathText text={text} /> : text}</span>;
    return (
      <span key={key}>
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
  };

  // When there's a multi-column header, the first body cell of each row is
  // a row label — render it as <th scope="row"> so screen readers announce
  // it as the heading for the rest of the row ().
  const hasRowHeaders = Boolean(header_row && header_row.length > 1);
  // Column rules: every column after the first has a left rule; while the first column is
  // pinned, that rule moves onto the pinned column so it stays put during the scroll.
  const columnRule = (ci: number) =>
    ci === 0 ? (overflow ? PINNED : undefined) : ci === 1 && overflow ? undefined : "border-l";
  // Numbers sit centered in their column, row labels included; word labels align left.
  const cellClass = (text: string, ci: number, rowLabel: boolean) =>
    cn(
      `border-b ${RULE} text-ivory`,
      WORD_WRAP,
      DENSITY_CELL,
      rowLabel && !isNumericCell(tightenUnits(text))
        ? "text-left font-normal"
        : "text-center tabular-nums font-normal",
      isNumericCell(tightenUnits(text)) && "whitespace-nowrap",
      columnRule(ci)
    );
  // Caption and footer span the whole (possibly scrolled) table; their text stays in view.
  const inView = "sticky left-0 block w-[var(--table-view,auto)] px-4";

  return (
    <figure
      ref={figureRef}
      aria-label={ariaLabel ?? (caption ? undefined : "Question data table")}
      data-table-density={tier}
      data-table-overflow={overflow ? "true" : undefined}
      data-scrolled={edges.left ? "true" : undefined}
      className={cn(
        // Container: thin-ruled frame; cells, not the card, carry the padding so rules reach the border.
        `group/table themed-question-figure themed-question-table my-4 inline-block min-w-0 max-w-full overflow-hidden rounded-lg border ${RULE} bg-surface shadow-[0_4px_16px_-8px_rgba(0,0,0,0.5)]`,
        className
      )}
    >
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          tabIndex={overflow ? 0 : undefined}
          className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info"
        >
          {/* border-separate: each cell owns its rules, so the pinned column keeps them. */}
          <table className="w-full border-separate border-spacing-0">
            {caption && (
              <caption
                className={`caption-top border-b ${RULE} py-3 text-center text-base italic leading-snug text-ivory ${WORD_WRAP}`}
              >
                <span className={inView}>{renderCell(caption, "caption")}</span>
              </caption>
            )}
            {((header_row && header_row.length > 0) || !!header_groups?.length) && (
              <thead>
                {!!header_groups?.length && (
                  <tr>
                    {header_groups.map((group, i) => {
                      const span = Math.max(1, Math.floor(group.span));
                      return (
                        <th
                          key={`g-${i}`}
                          scope={group.label ? "colgroup" : undefined}
                          colSpan={span}
                          className={cn(
                            "text-center font-normal text-ivory",
                            WORD_WRAP,
                            DENSITY_CELL,
                            group.label && `border-b ${RULE}`,
                            i > 0 && `border-l ${RULE}`,
                            i === 0 && span === 1 && overflow && cn(PINNED, RULE)
                          )}
                        >
                          {group.label ? renderCell(group.label, `group-${i}`) : null}
                        </th>
                      );
                    })}
                  </tr>
                )}
                {header_row && header_row.length > 0 && (
                  <tr>
                    {header_row.map((h, i) => (
                      <th
                        key={`h-${i}`}
                        scope="col"
                        className={cn(
                          `border-b ${RULE} text-center font-semibold text-ivory`,
                          WORD_WRAP,
                          DENSITY_CELL,
                          columnRule(i)
                        )}
                      >
                        {renderCell(h, `head-${i}`)}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={`r-${ri}`}
                  className={
                    ri === rows.length - 1 && !footer_note ? "[&>*]:border-b-0" : undefined
                  }
                >
                  {row.map((cell, ci) =>
                    hasRowHeaders && ci === 0 ? (
                      <th key={`r-${ri}-c-${ci}`} scope="row" className={cellClass(cell, ci, true)}>
                        {renderCell(cell, `r-${ri}-c-${ci}`)}
                      </th>
                    ) : (
                      <td key={`r-${ri}-c-${ci}`} className={cellClass(cell, ci, false)}>
                        {renderCell(cell, `r-${ri}-c-${ci}`)}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
            {footer_note && (
              <tfoot>
                <tr>
                  <td
                    colSpan={header_row?.length || rows[0]?.length || 1}
                    className={`py-3 text-center text-sm italic text-taupe ${WORD_WRAP}`}
                  >
                    <span className={inView}>{renderCell(footer_note, "footer")}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {/* More columns to the right: fade the right edge until the end is reached. */}
        <div
          aria-hidden
          data-fade="right"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[color:var(--figure-surface)] to-transparent transition-opacity",
            edges.right ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
      {calculator && (
        <div className={`border-t ${RULE} px-4 py-2`}>
          <CalculatorTableAction
            rows={rows}
            headers={header_row ?? undefined}
            itemId={calculatorItemId}
          />
        </div>
      )}
    </figure>
  );
}
