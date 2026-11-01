"use client";

// ============================================================
// TableFigure: draws a question's figure_table_data, or an answer
// choice's choice_table_data, with the figure engine. It converts the old
// table data to a `type: table` FigureSpec and renders TableView, a native
// HTML table in the house table style. Math questions add the calculator's
// table transfer control just after the table's frame (SpecTable, shared with
// SpecFigure's figure_spec tables).
//
// Part of the lazy engine chunk (engine-views.ts); QuestionTable loads it.
// ============================================================

import { CalculatorTableAction } from "@/components/calculator/CalculatorSourceAction";
import { tableDataToSpec, TableDataError } from "@/lib/figures/engine/from-table-data";
import type { FigureSpec } from "@/lib/figures/engine/spec";
import type { QuestionTableData } from "@/types/question-table";
import TableView from "./TableView";

export interface QuestionTableProps {
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

export default function TableFigure({
  data,
  renderMath = true,
  ariaLabel,
  className,
  calculator = false,
  calculatorItemId = "table",
}: QuestionTableProps) {
  const spec = specFor(data);
  if (!spec) return <p className="my-4 text-sm">This table can&apos;t be shown yet.</p>;
  return (
    <SpecTable
      spec={spec}
      renderMath={renderMath}
      ariaLabel={ariaLabel}
      className={className}
      calculator={calculator}
      calculatorItemId={calculatorItemId}
    />
  );
}

/**
 * A `type: table` FigureSpec as TableView, plus (with `calculator`) the calculator's table
 * transfer control fed from the spec's table part. Shared by TableFigure and a
 * question's figure_spec (SpecFigure), so both get the same control.
 */
export function SpecTable({
  spec,
  renderMath = true,
  ariaLabel,
  className,
  calculator = false,
  calculatorItemId = "table",
}: Omit<QuestionTableProps, "data"> & { spec: FigureSpec }) {
  const part = spec.parts.find((p) => p.kind === "table");
  return (
    <TableView spec={spec} renderMath={renderMath} ariaLabel={ariaLabel} className={className}>
      {/* The transfer control's item is the element just before it (TransferControl): the
          table's frame, so hovering the table shows the control at its top right (TR-46). */}
      {calculator && part && (
        <CalculatorTableAction rows={part.rows} headers={part.header} itemId={calculatorItemId} />
      )}
    </TableView>
  );
}
