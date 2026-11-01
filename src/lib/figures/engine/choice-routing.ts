// ============================================================
// Which path a question's answer choices take: the figure grid
// (FigureChoices), the table-choice path, or text. Quiz routes call these on
// every question, so this module has no Zod and no builders (page bundle
// budget, AR-33).
//
// Each helper takes `parse`, parseFigureSpec from the lazily loaded figure
// engine (useFigureEngine), or null before it has loaded. With it, a choice
// spec must be valid to count; without it the path is picked from the spec's
// shape (its `type`), and FigureChoices and QuestionTable validate when they
// draw: a choice they cannot draw shows its text.
// ============================================================

import type { QuestionTableData } from "@/types/question-table";
import type { FigureSpec, ParseResult } from "./spec";
import { storedSpecType } from "./spec-types";

/** parseFigureSpec, passed in so this module never loads the schema. */
export type SpecParser = (input: unknown) => ParseResult;

type ChoiceFigureFields = {
  choice_figure_spec?: unknown;
  choice_table_data?: QuestionTableData | null;
};

/** The type of a choice's stored spec: validated with `parse`, else its shape alone. */
function choiceSpecType(input: unknown, parse: SpecParser | null): string | null {
  if (input === null || input === undefined) return null;
  if (!parse) return storedSpecType(input);
  const parsed = parse(input);
  return parsed.ok ? parsed.spec.type : null;
}

/** True when any choice has a drawn (non-table) spec: the question's choices are figures. */
export function hasFigureChoices(
  choices: readonly ChoiceFigureFields[],
  parse: SpecParser | null = null
): boolean {
  return choices.some((c) => {
    const type = choiceSpecType(c.choice_figure_spec, parse);
    return type !== null && type !== "table";
  });
}

/**
 * The choices with every table choice_figure_spec turned into the choice_table_data
 * it draws (an existing choice_table_data is kept), so table choices keep one path.
 */
export function withSpecTables<T extends ChoiceFigureFields>(
  choices: readonly T[],
  parse: SpecParser | null = null
): T[] {
  return choices.map((c) => {
    if (c.choice_table_data || c.choice_figure_spec == null) return c;
    let table: QuestionTableData | null = null;
    if (parse) {
      const parsed = parse(c.choice_figure_spec);
      table = parsed.ok ? specToTableData(parsed.spec) : null;
    } else if (storedSpecType(c.choice_figure_spec) === "table") {
      // Unvalidated: QuestionTable validates the table data when it draws it.
      table = specToTableData(c.choice_figure_spec as FigureSpec);
    }
    return table ? { ...c, choice_table_data: table } : c;
  });
}

/**
 * A `type: table` FigureSpec as the old table data, so a choice whose
 * choice_figure_spec is a table goes through the table-choice path (radio beside the
 * table, calculator transfer) like a choice_table_data. Null for any other spec, and for
 * a stored spec without a table part.
 */
export function specToTableData(spec: FigureSpec): QuestionTableData | null {
  if (spec.type !== "table" || !Array.isArray(spec.parts)) return null;
  const part = spec.parts.find((p) => p?.kind === "table");
  if (!part || part.kind !== "table" || !Array.isArray(part.rows)) return null;
  return {
    ...(spec.title ? { caption: spec.title } : {}),
    ...(part.groups?.length ? { header_groups: part.groups } : {}),
    ...(part.header?.length ? { header_row: part.header } : {}),
    rows: part.rows,
    ...(part.note ? { footer_note: part.note } : {}),
  };
}
