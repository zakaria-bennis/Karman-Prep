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
// Cell values may contain inline math; we pass through MathText
// so KaTeX renders correctly in headers + body.
// ============================================================

import { CalculatorTableAction } from "@/components/calculator/CalculatorSourceAction";
import MathText from "@/components/learn/MathText";
import { cn } from "@/lib/utils";
import type { QuestionTableData } from "@/types/question-table";
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

/**
 * Wide tables shrink their cell padding and type so they fit the quiz column without a
 * sideways scroll (the scroll stays only as a last resort on a phone). Headers wrap.
 * 1-5 columns: roomy; 6-7: compact; 8+: tighter still. Never below 13px.
 */
export function tableDensity(columns: number) {
  if (columns >= 8)
    return {
      tier: "dense",
      cell: "px-1.5 py-1.5 text-[13px] leading-tight",
      head: "px-1.5 py-1.5 text-[13px] leading-tight",
    } as const;
  if (columns >= 6)
    return {
      tier: "compact",
      cell: "px-2.5 py-2 text-sm leading-snug",
      head: "px-2.5 py-2 text-sm leading-snug",
    } as const;
  return {
    tier: "roomy",
    cell: "px-4 py-3 text-base leading-snug",
    head: "px-4 py-3 text-base leading-snug",
  } as const;
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
  const renderCell = (text: string, key: string) => (
    <span key={key}>{renderMath ? <MathText text={text} /> : text}</span>
  );

  // When there's a multi-column header, the first body cell of each row is
  // a row label — render it as <th scope="row"> so screen readers announce
  // it as the heading for the rest of the row ().
  const columns = Math.max(header_row?.length ?? 0, ...rows.map((r) => r.length), 1);
  const density = tableDensity(columns);
  const hasRowHeaders = Boolean(header_row && header_row.length > 1);
  const rowLabelClass = cn(
    "border-b border-ivory/70 text-left font-normal text-ivory [overflow-wrap:anywhere]",
    density.cell
  );
  const cellClass = cn(
    "border-b border-ivory/70 text-center tabular-nums text-ivory [overflow-wrap:anywhere]",
    density.cell
  );

  return (
    <figure
      aria-label={ariaLabel ?? (caption ? undefined : "Question data table")}
      data-table-density={density.tier}
      className={cn(
        // Container: thin-ruled frame; cells, not the card, carry the padding so rules reach the border.
        "themed-question-figure themed-question-table my-4 inline-block max-w-full overflow-x-auto rounded-lg border border-ivory/70 bg-surface shadow-[0_4px_16px_-8px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <table className="w-full border-collapse text-sm">
        {caption && (
          <caption className="caption-top border-b border-ivory/70 px-4 py-3 text-center text-base italic leading-snug text-ivory">
            {renderCell(caption, "caption")}
          </caption>
        )}
        {((header_row && header_row.length > 0) || !!header_groups?.length) && (
          <thead>
            {!!header_groups?.length && (
              <tr>
                {header_groups.map((group, i) => (
                  <th
                    key={`g-${i}`}
                    scope={group.label ? "colgroup" : undefined}
                    colSpan={Math.max(1, Math.floor(group.span))}
                    className={cn(
                      "text-center font-normal text-ivory",
                      density.head,
                      group.label && "border-b border-ivory/70",
                      i > 0 && "border-l border-ivory/70"
                    )}
                  >
                    {group.label ? renderCell(group.label, `group-${i}`) : null}
                  </th>
                ))}
              </tr>
            )}
            {header_row && header_row.length > 0 && (
              <tr>
                {header_row.map((h, i) => (
                  <th
                    key={`h-${i}`}
                    scope="col"
                    className={cn(
                      "border-b border-ivory/70 text-center font-semibold text-ivory [overflow-wrap:anywhere]",
                      density.head,
                      i > 0 && "border-l border-ivory/70"
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
              className={ri === rows.length - 1 && !footer_note ? "[&>*]:border-b-0" : undefined}
            >
              {row.map((cell, ci) =>
                hasRowHeaders && ci === 0 ? (
                  <th key={`r-${ri}-c-${ci}`} scope="row" className={rowLabelClass}>
                    {renderCell(cell, `r-${ri}-c-${ci}`)}
                  </th>
                ) : (
                  <td
                    key={`r-${ri}-c-${ci}`}
                    className={cn(cellClass, ci > 0 && "border-l border-ivory/70")}
                  >
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
                className="border-t border-ivory/70 px-4 py-3 text-center text-sm italic text-taupe"
              >
                {renderCell(footer_note, "footer")}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {calculator && (
        <div className="border-t border-ivory/70 px-4 py-2">
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
