"use client";

// ============================================================
// QuestionTable: draws a question's figure_table_data, or an answer
// choice's choice_table_data, with the figure engine. It converts the old
// table data to a `type: table` FigureSpec and renders TableView, a native
// HTML table in the house table style. Math questions add the calculator's
// table transfer control just after the table's frame.
// ============================================================

import { CalculatorTableAction } from "@/components/calculator/CalculatorSourceAction";
import { tableDataToSpec, TableDataError } from "@/lib/figures/engine/from-table-data";
import type { FigureSpec } from "@/lib/figures/engine/spec";
import type { QuestionTableData } from "@/types/question-table";
import TableView from "./figures/TableView";
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

function specFor(data: QuestionTableData): FigureSpec | null {
  try {
    return tableDataToSpec(data);
  } catch (error) {
    if (error instanceof TableDataError) return null;
    throw error;
  }
}

export default function QuestionTable({
  data,
  renderMath = true,
  ariaLabel,
  className,
  calculator = false,
  calculatorItemId = "table",
}: Props) {
  const spec = specFor(data);
  if (!spec) return <p className="my-4 text-sm">This table can&apos;t be shown yet.</p>;
  return (
    <TableView spec={spec} renderMath={renderMath} ariaLabel={ariaLabel} className={className}>
      {/* The transfer control's item is the element just before it (TransferControl): the
          table's frame, so hovering the table shows the control at its top right (TR-46). */}
      {calculator && (
        <CalculatorTableAction
          rows={data.rows}
          headers={data.header_row ?? undefined}
          itemId={calculatorItemId}
        />
      )}
    </TableView>
  );
}
