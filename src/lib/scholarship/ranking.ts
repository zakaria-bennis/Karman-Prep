// ============================================================
// Ranking: who has the top score in each cohort.
//
// Order (the tie rule in the terms): higher total score first,
// then the earlier official test date, then the earlier upload.
// Rejected claims are left out. A score read from the PDF counts
// as verified; a score the student only typed does not, and is
// shown as such so the admin checks it by eye.
// ============================================================

export type ClaimStatus = "submitted" | "approved" | "rejected" | "paid";

export interface RankInput {
  id: string;
  cohortId: string;
  status: ClaimStatus;
  extractedTotal: number | null;
  declaredTotal: number | null;
  extractedTestDate: string | null;
  declaredTestDate: string | null;
  submittedAt: string;
}

export interface Ranked extends RankInput {
  /** 1 = top of the cohort. Null for rejected claims. */
  rank: number | null;
  score: number | null;
  scoreVerified: boolean;
  /** Another ranked claim in the cohort has the same score. */
  tied: boolean;
}

function scoreOf(c: RankInput): number | null {
  return c.extractedTotal ?? c.declaredTotal;
}

function dateOf(c: RankInput): string | null {
  return c.extractedTestDate ?? c.declaredTestDate;
}

export function compareClaims(a: RankInput, b: RankInput): number {
  const sa = scoreOf(a) ?? -1;
  const sb = scoreOf(b) ?? -1;
  if (sa !== sb) return sb - sa;
  const da = dateOf(a) ?? "9999-12-31";
  const db = dateOf(b) ?? "9999-12-31";
  if (da !== db) return da < db ? -1 : 1;
  return a.submittedAt < b.submittedAt ? -1 : a.submittedAt > b.submittedAt ? 1 : 0;
}

/** Rank every claim within its own cohort. */
export function rankClaims(claims: RankInput[]): Ranked[] {
  const byCohort = new Map<string, RankInput[]>();
  for (const c of claims) {
    const list = byCohort.get(c.cohortId) ?? [];
    list.push(c);
    byCohort.set(c.cohortId, list);
  }
  const out: Ranked[] = [];
  for (const list of byCohort.values()) {
    const eligible = list.filter((c) => c.status !== "rejected").sort(compareClaims);
    const counts = new Map<number, number>();
    for (const c of eligible) {
      const s = scoreOf(c);
      if (s !== null) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    eligible.forEach((c, i) => {
      const s = scoreOf(c);
      out.push({
        ...c,
        rank: i + 1,
        score: s,
        scoreVerified: c.extractedTotal !== null,
        tied: s !== null && (counts.get(s) ?? 0) > 1,
      });
    });
    for (const c of list.filter((x) => x.status === "rejected")) {
      out.push({
        ...c,
        rank: null,
        score: scoreOf(c),
        scoreVerified: c.extractedTotal !== null,
        tied: false,
      });
    }
  }
  return out;
}

export type ApproveBlock =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_submitted" | "already_awarded" | "not_top" };

/** Only the top-ranked claim of a cohort with no award yet can be approved. */
export function canApprove(claimId: string, cohortClaims: RankInput[]): ApproveBlock {
  const claim = cohortClaims.find((c) => c.id === claimId);
  if (!claim) return { ok: false, reason: "not_found" };
  if (claim.status !== "submitted") return { ok: false, reason: "not_submitted" };
  if (cohortClaims.some((c) => c.status === "approved" || c.status === "paid")) {
    return { ok: false, reason: "already_awarded" };
  }
  const ranked = rankClaims(cohortClaims).find((c) => c.id === claimId);
  if (!ranked || ranked.rank !== 1) return { ok: false, reason: "not_top" };
  return { ok: true };
}

export const APPROVE_BLOCK_MESSAGES: Record<Exclude<ApproveBlock, { ok: true }>["reason"], string> =
  {
    not_found: "This claim no longer exists.",
    not_submitted: "Only a claim waiting for review can be approved.",
    already_awarded: "This cohort's scholarship has already been awarded.",
    not_top:
      "Another claim in this cohort has a higher score. Reject it first if it doesn't qualify.",
  };
