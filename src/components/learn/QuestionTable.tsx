"use client";

// ============================================================
// QuestionTable: a question's figure_table_data, or an answer choice's
// choice_table_data, drawn by TableFigure with the figure engine (a native
// HTML table, with the calculator's table transfer control on Math
// questions). The engine loads lazily (engine-loader.tsx) so quiz pages
// without a table never download it (AR-33); until it loads, a client-only
// mount shows a frame with the table's row count.
// ============================================================

import { lazyView } from "./figures/engine-loader";
import { TablePlaceholder, tableRows } from "./figures/placeholders";
import type { QuestionTableProps } from "./figures/TableFigure";
export type { QuestionTableData } from "@/types/question-table";

function TableDataPlaceholder({ data, className }: QuestionTableProps) {
  return <TablePlaceholder rows={tableRows(data ?? {})} className={className} />;
}

const QuestionTable = lazyView<QuestionTableProps>(
  (engine) => engine.TableFigure,
  TableDataPlaceholder
);

export default QuestionTable;
