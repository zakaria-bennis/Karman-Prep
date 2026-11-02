"use client";

// ============================================================
// TableFigure: draws a question's figure_table_data, or an answer
// choice's choice_table_data, with the figure engine. It converts the old
// table data to `type: table` FigureSpecs and renders TableView, a native
// HTML table in the house table style; data that joined separate tables side
// by side draws them as separate tables, stacked (tableDataToSpecs). On Math
// questions every table gets the calculator's small table button in its
// top-right corner (SpecTable, shared with SpecFigure's figure_spec tables).
//
// Part of the lazy engine chunk (engine-views.ts); QuestionTable loads it.
// ============================================================

import { useCalculator } from "@/components/calculator/bridge-context"; // not CalculatorScope (AR-33)
import { CalculatorTableAction } from "@/components/calculator/CalculatorSourceAction";
import { tableDataToSpecs, TableDataError } from "@/lib/figures/engine/from-table-data";
import { cn } from "@/lib/utils";
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

/** The transfer item ids of a question's tables in order: "table", then "table:2", "table:3", …
 * (c-transfer TR-91). A table choice keeps its "choice:<letter>" id on its first table only. */
export function tableItemIds(count: number, first = "table"): (string | null)[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? first : first === "table" ? `table:${i + 1}` : null
  );
}

/** TR-92: what tells several tables apart in their buttons' names: the title when every title is
 * there and distinct, else "table n". One table needs none. */
export function tableLabels(specs: readonly FigureSpec[]): (string | undefined)[] {
  if (specs.length < 2) return specs.map(() => undefined);
  const titles = specs.map((s) => s.title?.replace(/\$/g, "").trim() || "");
  const distinct = titles.every((t, i) => t !== "" && titles.indexOf(t) === i);
  return titles.map((t, i) => (distinct ? t : `table ${i + 1}`));
}

function specsFor(data: QuestionTableData): FigureSpec[] | null {
  try {
    return tableDataToSpecs(data);
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
  const specs = specsFor(data);
  if (!specs) return <p className="my-4 text-sm">This table can&apos;t be shown yet.</p>;
  if (specs.length === 1)
    return (
      <SpecTable
        spec={specs[0]}
        renderMath={renderMath}
        ariaLabel={ariaLabel}
        className={className}
        calculator={calculator}
        calculatorItemId={calculatorItemId}
      />
    );
  // Separate tables stay separate: one per row, each its own width, never side by side. Each
  // gets its own table button (TR-91).
  const ids = tableItemIds(specs.length, calculatorItemId);
  const labels = tableLabels(specs);
  return (
    <div data-figure-stack="" className={cn("my-4 flex flex-col gap-4", className)}>
      {specs.map((spec, i) => (
        <SpecTable
          key={i}
          spec={spec}
          renderMath={renderMath}
          ariaLabel={ariaLabel && `${ariaLabel}, table ${i + 1}`}
          className="my-0 self-start"
          calculator={calculator && ids[i] !== null}
          calculatorItemId={ids[i] ?? undefined}
          calculatorLabel={labels[i]}
        />
      ))}
    </div>
  );
}

/**
 * A `type: table` FigureSpec as TableView, plus (with `calculator`, on a page with a calculator)
 * the calculator's small table button fed from the spec's table part, set into the frame's
 * top-right corner. Shared by TableFigure and a question's figure_spec (SpecFigure), so both get
 * the same button.
 */
export function SpecTable({
  spec,
  renderMath = true,
  ariaLabel,
  className,
  calculator = false,
  calculatorItemId = "table",
  calculatorLabel,
}: Omit<QuestionTableProps, "data"> & { spec: FigureSpec; calculatorLabel?: string }) {
  const part = spec.parts.find((p) => p.kind === "table");
  // TR-93: the corner keeps its room whenever the button can show, before its lazy chunk loads,
  // so the button never shifts the table.
  const bridge = useCalculator();
  const button = calculator && part !== undefined && bridge !== null;
  return (
    <TableView
      spec={spec}
      renderMath={renderMath}
      ariaLabel={ariaLabel}
      className={className}
      actionRoom={button}
    >
      {button && (
        <CalculatorTableAction
          rows={part.rows}
          headers={part.header}
          itemId={calculatorItemId}
          label={calculatorLabel}
        />
      )}
    </TableView>
  );
}
