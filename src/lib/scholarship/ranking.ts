// ============================================================
// Ranking: who has the top score in each cohort, and their share.
//
// The highest total score wins. Equal scores share a rank, and a
// tie for the top splits the award equally (founder, 8 Nov: two
// students tied at the top get $750 each). Rejected claims are
// left out. A score read from the PDF counts as verified; a score
// the student only typed does not, and is shown as such.
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
  /** The share an approved or paid claim was given. */
  awardCents?: number | null;
}

export interface Ranked extends RankInput {
  /** 1 = top of the cohort; equal scores share a rank. Null for rejected claims. */
  rank: number | null;
  score: number | null;
  scoreVerified: boolean;
  /** Another ranked claim in the cohort has the same score. */
  tied: boolean;
}

function scoreOf(c: RankInput): number | null {
  return c.extractedTotal ?? c.declaredTotal;
}

/** Display order: score, then earlier test date, then earlier upload. */
export function compareClaims(a: RankInput, b: RankInput): number {
  const sa = scoreOf(a) ?? -1;
  const sb = scoreOf(b) ?? -1;
  if (sa !== sb) return sb - sa;
  const da = a.extractedTestDate ?? a.declaredTestDate ?? "9999-12-31";
  const db = b.extractedTestDate ?? b.declaredTestDate ?? "9999-12-31";
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
    let rank = 0;
    let previous: number | null | undefined;
    eligible.forEach((c, i) => {
      const s = scoreOf(c);
      if (s === null || s !== previous) rank = i + 1;
      previous = s;
      out.push({
        ...c,
        rank,
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

export type ApproveCheck =
  | { ok: true; shareCents: number; tiedWith: number }
  | {
      ok: false;
      reason: "not_found" | "not_submitted" | "already_awarded" | "not_top" | "uneven_split";
    };

/**
 * Only a claim with the cohort's top score can be approved. A tie splits the award equally
 * among the tied claims that aren't rejected. If an earlier approval in the tie was given a
 * different share (for example before a third student tied), undo it first.
 */
export function canApprove(
  claimId: string,
  cohortClaims: RankInput[],
  awardCents: number
): ApproveCheck {
  const claim = cohortClaims.find((c) => c.id === claimId);
  if (!claim) return { ok: false, reason: "not_found" };
  if (claim.status !== "submitted") return { ok: false, reason: "not_submitted" };
  const ranked = rankClaims(cohortClaims);
  const mine = ranked.find((c) => c.id === claimId);
  if (!mine || mine.rank !== 1 || mine.score === null) return { ok: false, reason: "not_top" };
  const group = ranked.filter((c) => c.rank === 1 && c.score === mine.score);
  const awarded = cohortClaims.filter((c) => c.status === "approved" || c.status === "paid");
  if (awarded.some((c) => !group.some((g) => g.id === c.id))) {
    return { ok: false, reason: "already_awarded" };
  }
  const shareCents = Math.floor(awardCents / group.length);
  if (awarded.some((c) => (c.awardCents ?? shareCents) !== shareCents)) {
    return { ok: false, reason: "uneven_split" };
  }
  return { ok: true, shareCents, tiedWith: group.length - 1 };
}

export const APPROVE_BLOCK_MESSAGES: Record<Exclude<ApproveCheck, { ok: true }>["reason"], string> =
  {
    not_found: "This claim no longer exists.",
    not_submitted: "Only a claim waiting for review can be approved.",
    already_awarded: "This cohort's scholarship has already been awarded to another student.",
    not_top:
      "Another claim in this cohort has a higher score. Reject it first if it doesn't qualify.",
    uneven_split:
      "Another tied claim was approved with a different share. Undo that approval, then approve the tied claims again so the award splits evenly.",
  };
