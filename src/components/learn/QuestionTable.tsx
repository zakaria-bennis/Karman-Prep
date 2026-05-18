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

  return (
    <figure
      className={cn(
        // Container: card surface, bronze frame, generous breathing room
        "my-4 inline-block max-w-full rounded-lg border border-[#3B3426] bg-[#171611] px-5 py-4 shadow-[0_1px_0_0_rgba(195,171,106,0.08)_inset]",
        className
      )}
    >
      {caption && (
        <figcaption className="mb-3 text-center font-serif text-[15px] italic leading-snug text-[#F3ECDD]">
          {renderCell(caption, "caption")}
        </figcaption>
      )}
      <table className="w-full border-collapse text-sm">
        {header_row && header_row.length > 0 && (
          <thead>
            <tr>
              {header_row.map((h, i) => (
                <th
                  key={`h-${i}`}
                  className={cn(
                    "border-b border-[#3B3426] px-3 py-2 text-center font-serif text-[13px] font-normal leading-tight text-[#F3ECDD]",
                    i > 0 && "border-l border-[#3B3426]/60"
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
              {row.map((cell, ci) => (
                <td
                  key={`r-${ri}-c-${ci}`}
                  className={cn(
                    "border-b border-[#3B3426]/40 px-3 py-2 text-center font-sans text-[13px] text-[#F3ECDD]",
                    // First column is often a row label — bias it left + bronze accent
                    ci === 0 && header_row && header_row.length > 1 && "text-left text-[#B8B0A1]",
                    ci > 0 && "border-l border-[#3B3426]/40"
                  )}
                >
                  {renderCell(cell, `r-${ri}-c-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer_note && (
        <div className="mt-3 text-center text-[11px] italic text-[#B8B0A1]">
          {renderCell(footer_note, "footer")}
        </div>
      )}
    </figure>
  );
}
