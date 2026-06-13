// ============================================================
// QuestionTable — renders a question figure as a native HTML
// table, styled with Karman's observatory tokens (warm dark
// canvas + bronze rules + ivory text).
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

import MathText from "@/components/learn/MathText";
import { cn } from "@/lib/utils";

export interface QuestionTableData {
  caption?: string | null;
  header_row?: string[] | null;
  rows: string[][];
  footer_note?: string | null;
}

interface Props {
  data: QuestionTableData;
  /** Inline math? Pass `false` to skip KaTeX wrapping for plain-text-only tables. */
  renderMath?: boolean;
  /** Optional wrapper class. */
  className?: string;
}

export default function QuestionTable({ data, renderMath = true, className }: Props) {
  const { caption, header_row, rows, footer_note } = data;
  const renderCell = (text: string, key: string) => (
    <span key={key}>{renderMath ? <MathText text={text} /> : text}</span>
  );

  // When there's a multi-column header, the first body cell of each row is
  // a row label — render it as <th scope="row"> so screen readers announce
  // it as the heading for the rest of the row (and the bronze-accent style).
  const hasRowHeaders = Boolean(header_row && header_row.length > 1);
  const rowLabelClass =
    "border-b border-bronze/60 px-3 py-2 text-left font-sans text-[13px] font-normal text-taupe";
  const cellClass =
    "border-b border-bronze/60 px-3 py-2 text-center font-sans text-[13px] text-ivory";

  return (
    <figure
      aria-label={caption ? undefined : "Question data table"}
      className={cn(
        // Container: warm card surface, bronze frame (observatory system).
        "my-4 inline-block max-w-full rounded-lg border border-bronze bg-surface px-5 py-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <table className="w-full border-collapse text-sm">
        {caption && (
          <caption className="mb-3 caption-top text-center font-serif text-[15px] italic leading-snug text-ivory">
            {renderCell(caption, "caption")}
          </caption>
        )}
        {header_row && header_row.length > 0 && (
          <thead>
            <tr>
              {header_row.map((h, i) => (
                <th
                  key={`h-${i}`}
                  scope="col"
                  className={cn(
                    "border-b border-bronze px-3 py-2 text-center font-serif text-[13px] font-normal leading-tight text-ivory",
                    i > 0 && "border-l border-bronze/60"
                  )}
                >
                  {renderCell(h, `head-${i}`)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={`r-${ri}`}>
              {row.map((cell, ci) =>
                hasRowHeaders && ci === 0 ? (
                  <th key={`r-${ri}-c-${ci}`} scope="row" className={rowLabelClass}>
                    {renderCell(cell, `r-${ri}-c-${ci}`)}
                  </th>
                ) : (
                  <td
                    key={`r-${ri}-c-${ci}`}
                    className={cn(cellClass, ci > 0 && "border-l border-bronze/60")}
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
                className="pt-3 text-center text-[11px] italic text-taupe"
              >
                {renderCell(footer_note, "footer")}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </figure>
  );
}
