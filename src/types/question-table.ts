/** A header cell spanning `span` columns, drawn in a row above `header_row`
 *  (e.g. "Grade level" over the four grade columns). An empty label leaves the
 *  spanned columns without a group heading. Spans should add up to the column count. */
export interface QuestionTableHeaderGroup {
  label: string;
  span: number;
}

/** A structured figure table, including tables displayed as answer choices. */
export interface QuestionTableData {
  caption?: string | null;
  header_groups?: QuestionTableHeaderGroup[] | null;
  header_row?: string[] | null;
  rows: string[][];
  footer_note?: string | null;
}
