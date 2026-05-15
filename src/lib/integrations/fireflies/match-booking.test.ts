// ============================================================
// Tests for the Fireflies transcript matcher's time-window
// policy. The flakey ±60-min fallback (audit issue #16) is what
// these guard against — if back-to-back sessions both fall in
// the window, the matcher refuses rather than picking one
// arbitrarily.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  DISAMBIGUATION_GAP_MS,
  TRANSCRIPT_TIME_WINDOW_MS,
  pickBookingByTime,
  type MatchCandidate,
} from "./match-booking";

const TRANSCRIPT_DATE_MS = new Date("2026-05-15T15:00:00Z").getTime();

function at(offsetMinutes: number, id: string): MatchCandidate {
  return { id, scheduledStartMs: TRANSCRIPT_DATE_MS + offsetMinutes * 60_000 };
}

describe("pickBookingByTime", () => {
  it("returns none for empty input", () => {
    expect(pickBookingByTime([], TRANSCRIPT_DATE_MS)).toEqual({ kind: "none" });
  });

  it("returns the only candidate when there is exactly one", () => {
    const r = pickBookingByTime([at(2, "only")], TRANSCRIPT_DATE_MS);
    expect(r).toEqual({ kind: "match", id: "only" });
  });

  it("picks the closer of two candidates when the gap exceeds DISAMBIGUATION_GAP_MS", () => {
    // closest is 2 min off, runner-up is 25 min off → gap is 23 min,
    // well above the 10-min disambiguation threshold.
    const r = pickBookingByTime([at(2, "close"), at(25, "far")], TRANSCRIPT_DATE_MS);
    expect(r).toEqual({ kind: "match", id: "close" });
  });

  it("returns ambiguous when two candidates are too close together to decide", () => {
    // 5 min off and 8 min off → only a 3-min gap, far under the
    // 10-min disambiguation threshold.
    const r = pickBookingByTime([at(5, "a"), at(8, "b")], TRANSCRIPT_DATE_MS);
    expect(r.kind).toBe("ambiguous");
    if (r.kind !== "ambiguous") return;
    expect(r.candidateIds).toEqual(["a", "b"]);
  });

  it("ambiguity is independent of input order — order by delta in the response", () => {
    // Provide the farther one first; result should still list
    // closest-first.
    const r = pickBookingByTime([at(8, "b"), at(5, "a")], TRANSCRIPT_DATE_MS);
    expect(r.kind).toBe("ambiguous");
    if (r.kind !== "ambiguous") return;
    expect(r.candidateIds).toEqual(["a", "b"]);
  });

  it("works symmetrically — before vs after the transcript date is identical", () => {
    const before = pickBookingByTime([at(-3, "p")], TRANSCRIPT_DATE_MS);
    const after = pickBookingByTime([at(3, "f")], TRANSCRIPT_DATE_MS);
    expect(before).toEqual({ kind: "match", id: "p" });
    expect(after).toEqual({ kind: "match", id: "f" });
  });

  it("picks clearly when a session ran 30 min late (back-to-back-ish but distinguishable)", () => {
    // 1 min off (the session that actually finished writing the
    // transcript) and 30 min off (the next scheduled session).
    const r = pickBookingByTime([at(1, "actual"), at(30, "next")], TRANSCRIPT_DATE_MS);
    expect(r).toEqual({ kind: "match", id: "actual" });
  });

  it("constants are exported and have sensible values", () => {
    expect(TRANSCRIPT_TIME_WINDOW_MS).toBe(30 * 60_000);
    expect(DISAMBIGUATION_GAP_MS).toBe(10 * 60_000);
  });
});
