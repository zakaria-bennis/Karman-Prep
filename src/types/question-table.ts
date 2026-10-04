/** A structured figure table, including tables displayed as answer choices. */
export interface QuestionTableData {
  caption?: string | null;
  header_row?: string[] | null;
  rows: string[][];
  footer_note?: string | null;
}
