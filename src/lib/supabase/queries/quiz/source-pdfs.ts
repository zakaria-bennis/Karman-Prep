// ============================================================
// source-pdfs — fetch the list of distinct source_pdf values in
// the bank, for the admin "filter by file" dropdown.
//
// Lifted into its own file because multiple admin pages
// (inspect, review, preview, rejected) all need the same list +
// counts. Cached briefly on the server so concurrent page loads
// don't blast Supabase with the same distinct query.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

export interface SourcePdfRow {
  /** The source_pdf filename, e.g. "202406asiav2.pdf". */
  source_pdf: string;
  /** How many active (non-archived) questions came from this PDF. */
  active_count: number;
  /** How many archived questions came from this PDF. */
  archived_count: number;
  /** When the most recent row from this PDF was inserted (for sort). */
  most_recent: string;
}

/**
 * Distinct source_pdf list with per-PDF active + archived counts.
 *
 * Returns sorted by most_recent DESC so newly-imported PDFs
 * surface first in the dropdown.
 *
 * @param opts.includeArchived  When false, omits PDFs whose
 *   active_count is 0. Used by pages that don't show archived
 *   rows in the first place.
 */
export async function fetchSourcePdfList(
  opts: { includeArchived?: boolean } = {}
): Promise<SourcePdfRow[]> {
  const { includeArchived = true } = opts;
  const supabase = createAdminClient();
  // We need (source_pdf, archived_at IS NULL) grouped counts. Supabase
  // doesn't surface GROUP BY in the query builder directly, so we
  // pull source_pdf + archived_at + created_at and aggregate in JS.
  // Bank size is ≤ tens of thousands; this is fine.
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("source_pdf, archived_at, created_at")
    .not("source_pdf", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const map = new Map<string, SourcePdfRow>();
  for (const row of data ?? []) {
    if (!row.source_pdf) continue;
    const existing = map.get(row.source_pdf);
    if (existing) {
      if (row.archived_at) existing.archived_count++;
      else existing.active_count++;
      // First row encountered is the most recent because we ordered
      // DESC on created_at — keep that timestamp.
    } else {
      map.set(row.source_pdf, {
        source_pdf: row.source_pdf,
        active_count: row.archived_at ? 0 : 1,
        archived_count: row.archived_at ? 1 : 0,
        most_recent: row.created_at ?? new Date().toISOString(),
      });
    }
  }

  let rows = [...map.values()];
  if (!includeArchived) {
    rows = rows.filter((r) => r.active_count > 0);
  }
  // Sort by most_recent DESC. Map iteration above already in that
  // order, but be explicit so future callers can rely on it.
  rows.sort((a, b) => (b.most_recent < a.most_recent ? -1 : 1));
  return rows;
}
