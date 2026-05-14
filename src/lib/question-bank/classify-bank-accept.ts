// ============================================================
// Pure classifier for the "Accept all bank" admin flow.
//
// Splits a list of bank quiz_questions rows into:
//   · ones with a concept_slug that maps to a curriculum node →
//     queued for acceptance with that node assigned
//   · ones whose slug doesn't map to any node (or that have no
//     slug at all) → skipped
//
// Lives separately from the server action that calls it so we can
// unit-test the classification logic without standing up a Supabase
// client. The action layer (src/app/admin/actions.ts) is responsible
// for the I/O parts: fetching rows, calling acceptFlaggedQuestion
// for each accepted row, tallying errors.
// ============================================================

export interface BankRow {
  id: string;
  concept_slug: string | null;
}

export interface BankAcceptPlan {
  /** Rows we'll call `acceptFlaggedQuestion` on, with the resolved
   *  curriculum node id. Order preserved from the input. */
  toAccept: Array<{ questionId: string; nodeId: string }>;
  /** Row ids we skipped because their slug didn't map to a node
   *  (or the row had no slug at all). The caller increments
   *  `skipped_no_slug_match` by `skippedIds.length`. */
  skippedIds: string[];
}

/** Resolves a row's concept_slug to a curriculum node id, or returns
 *  null/undefined if the slug isn't mapped. Mirrors the shape of
 *  `nodeIdFromSlug` from `@/lib/question-bank/taxonomy`, but kept as
 *  a callback so this function stays free of any specific dependency. */
type NodeIdFromSlug = (slug: string) => string | null | undefined;

export function classifyBankRowsForAccept(
  rows: BankRow[],
  nodeIdFromSlug: NodeIdFromSlug
): BankAcceptPlan {
  const toAccept: BankAcceptPlan["toAccept"] = [];
  const skippedIds: string[] = [];
  for (const row of rows) {
    const slug = row.concept_slug;
    const nodeId = slug ? (nodeIdFromSlug(slug) ?? null) : null;
    if (!nodeId) {
      skippedIds.push(row.id);
      continue;
    }
    toAccept.push({ questionId: row.id, nodeId });
  }
  return { toAccept, skippedIds };
}
