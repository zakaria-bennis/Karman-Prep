import type { QuestionTableData } from "@/types/question-table";

/** Reject malformed or oversized tables before they reach the quiz renderer. */
export function isValidChoiceTableData(value: unknown): value is QuestionTableData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const table = value as Record<string, unknown>;
  if (!Array.isArray(table.rows) || table.rows.length < 1 || table.rows.length > 30) return false;
  const first = table.rows[0];
  if (!Array.isArray(first) || first.length < 1 || first.length > 8) return false;
  const width = first.length;
  const validText = (cell: unknown) =>
    typeof cell === "string" && cell.trim().length > 0 && cell.length <= 1000;
  if (
    !table.rows.every((row) => Array.isArray(row) && row.length === width && row.every(validText))
  )
    return false;
  if (table.header_row != null) {
    if (
      !Array.isArray(table.header_row) ||
      table.header_row.length !== width ||
      !table.header_row.every(validText)
    )
      return false;
  }
  if (table.caption != null && !validText(table.caption)) return false;
  if (table.footer_note != null && !validText(table.footer_note)) return false;
  return true;
}

/** Text announced with the answer control; the HTML table remains navigable. */
export function describeChoiceTable(table: QuestionTableData): string {
  const headers = table.header_row ?? [];
  const rows = table.rows.map((row) =>
    row.map((cell, index) => (headers[index] ? `${headers[index]} ${cell}` : cell)).join(", ")
  );
  return [table.caption, ...rows, table.footer_note].filter(Boolean).join("; ");
}
