import { describe, expect, it } from "vitest";
import { canApprove, rankClaims, type RankInput } from "./ranking";

const AWARD = 150000;

function claim(over: Partial<RankInput> & { id: string }): RankInput {
  return {
    cohortId: "c1",
    status: "submitted",
    extractedTotal: null,
    declaredTotal: null,
    extractedTestDate: null,
    declaredTestDate: null,
    submittedAt: "2026-11-01T00:00:00Z",
    awardCents: null,
    ...over,
  };
}

describe("rankClaims", () => {
  it("ranks by score within each cohort, and equal scores share a rank", () => {
    const ranked = rankClaims([
      claim({ id: "a", extractedTotal: 1400 }),
      claim({ id: "b", extractedTotal: 1500 }),
      claim({ id: "c", extractedTotal: 1500 }),
      claim({ id: "d", cohortId: "c2", extractedTotal: 1200 }),
    ]);
    const rank = (id: string) => ranked.find((r) => r.id === id)!;
    expect(rank("b").rank).toBe(1);
    expect(rank("c").rank).toBe(1);
    expect(rank("a").rank).toBe(3);
    expect(rank("d").rank).toBe(1);
    expect(rank("b").tied).toBe(true);
    expect(rank("a").tied).toBe(false);
  });

  it("leaves rejected claims out and marks typed-only scores unverified", () => {
    const ranked = rankClaims([
      claim({ id: "a", extractedTotal: 1590, status: "rejected" }),
      claim({ id: "b", declaredTotal: 1450 }),
    ]);
    expect(ranked.find((r) => r.id === "a")!.rank).toBeNull();
    const b = ranked.find((r) => r.id === "b")!;
    expect(b.rank).toBe(1);
    expect(b.scoreVerified).toBe(false);
  });
});

describe("canApprove", () => {
  const claims = [
    claim({ id: "top", extractedTotal: 1500 }),
    claim({ id: "second", extractedTotal: 1450 }),
  ];

  it("approves only the top claim, for the whole award", () => {
    expect(canApprove("top", claims, AWARD)).toEqual({ ok: true, shareCents: 150000, tiedWith: 0 });
    expect(canApprove("second", claims, AWARD)).toEqual({ ok: false, reason: "not_top" });
  });

  it("splits the award evenly in a tie: $750 each for two", () => {
    const tie = [...claims, claim({ id: "tied", extractedTotal: 1500 })];
    expect(canApprove("top", tie, AWARD)).toEqual({ ok: true, shareCents: 75000, tiedWith: 1 });
    const oneApproved = tie.map((c) =>
      c.id === "top" ? { ...c, status: "approved" as const, awardCents: 75000 } : c
    );
    expect(canApprove("tied", oneApproved, AWARD)).toEqual({
      ok: true,
      shareCents: 75000,
      tiedWith: 1,
    });
  });

  it("asks to redo a split when a third student ties after an approval", () => {
    const three = [
      claim({ id: "a", extractedTotal: 1500, status: "approved", awardCents: 75000 }),
      claim({ id: "b", extractedTotal: 1500 }),
      claim({ id: "c", extractedTotal: 1500 }),
    ];
    expect(canApprove("b", three, AWARD)).toEqual({ ok: false, reason: "uneven_split" });
  });

  it("lets the next claim through once the top one is rejected", () => {
    const next = claims.map((c) => (c.id === "top" ? { ...c, status: "rejected" as const } : c));
    expect(canApprove("second", next, AWARD)).toEqual({
      ok: true,
      shareCents: 150000,
      tiedWith: 0,
    });
  });

  it("blocks an award to anyone outside the top group", () => {
    const awarded = [
      claim({ id: "old", extractedTotal: 1450, status: "paid", awardCents: 150000 }),
      claim({ id: "new", extractedTotal: 1500 }),
    ];
    expect(canApprove("new", awarded, AWARD)).toEqual({ ok: false, reason: "already_awarded" });
  });

  it("blocks unknown and already-decided claims", () => {
    expect(canApprove("nope", claims, AWARD)).toEqual({ ok: false, reason: "not_found" });
    const rejected = [claim({ id: "x", status: "rejected", extractedTotal: 1500 })];
    expect(canApprove("x", rejected, AWARD)).toEqual({ ok: false, reason: "not_submitted" });
  });
});
