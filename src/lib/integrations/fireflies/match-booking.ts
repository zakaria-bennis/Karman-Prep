// ============================================================
// Pure booking-matching helpers for the Fireflies transcript
// webhook (/api/webhooks/fireflies-transcript). Lives in its own
// file so the matching policy is unit-testable without DB mocks.
//
// Audit issue #16. The previous matcher pulled ANY booking whose
// scheduled_start was within ±60 minutes of the transcript date
// and took the earliest one. Two back-to-back tutoring sessions
// (or two sessions in the same hour for different students) both
// land in that window — the transcript could attach to the wrong
// row. This module tightens the policy:
//
//   - WINDOW_MS: ±30 min (instead of ±60).
//   - When more than one candidate falls in the window, pick the
//     one whose scheduled_start is closest to the transcript date,
//     BUT only when the runner-up is at least DISAMBIGUATION_GAP_MS
//     farther away. Otherwise we report `ambiguous` and the caller
//     refuses to attach the transcript automatically — admin must
//     resolve manually.
//
// The webhook route additionally filters Strategy-3 candidates to
// rows where zoom_meeting_id IS NULL, since any booking with a
// known Zoom id should already have been caught by the direct-id
// strategies above this fallback.
// ============================================================

/** Search window applied around the transcript date when looking
 *  up bookings by time. ±30 minutes is wide enough to absorb a
 *  late-starting session but narrow enough that back-to-back
 *  hourly bookings can't both fall in. */
export const TRANSCRIPT_TIME_WINDOW_MS = 30 * 60_000;

/** When multiple bookings fall in the window, require the second-
 *  closest to be at least this far behind the closest in
 *  milliseconds. 10 minutes leaves enough room to confidently
 *  distinguish two real sessions; a tighter gap would refuse too
 *  many legitimate matches. */
export const DISAMBIGUATION_GAP_MS = 10 * 60_000;

export interface MatchCandidate {
  id: string;
  scheduledStartMs: number;
}

export type MatchResult =
  | { kind: "match"; id: string }
  | { kind: "none" }
  | { kind: "ambiguous"; candidateIds: string[] };

/** Pick a single booking from a set of candidates whose start
 *  times fall in the transcript-time window. Pure / synchronous —
 *  the route reads bookings from Supabase first, then passes the
 *  result here.
 *
 *  Returns:
 *   - `match`     — exactly one obvious winner.
 *   - `none`      — empty input.
 *   - `ambiguous` — multiple candidates and the gap between the
 *                   closest and runner-up is too small to decide
 *                   safely. Caller throws so an admin reviews. */
export function pickBookingByTime(
  candidates: MatchCandidate[],
  transcriptDateMs: number
): MatchResult {
  if (candidates.length === 0) return { kind: "none" };
  if (candidates.length === 1) return { kind: "match", id: candidates[0].id };

  // Sort by absolute distance from the transcript date — smallest
  // delta first.
  const sorted = [...candidates]
    .map((c) => ({ ...c, delta: Math.abs(c.scheduledStartMs - transcriptDateMs) }))
    .sort((a, b) => a.delta - b.delta);

  const closest = sorted[0];
  const runnerUp = sorted[1];
  const gap = runnerUp.delta - closest.delta;

  if (gap >= DISAMBIGUATION_GAP_MS) {
    return { kind: "match", id: closest.id };
  }

  return {
    kind: "ambiguous",
    candidateIds: sorted.map((c) => c.id),
  };
}
