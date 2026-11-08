import { describe, expect, it } from "vitest";
import { canApprove, rankClaims, type RankInput } from "./ranking";

function claim(over: Partial<RankInput> & { id: string }): RankInput {
  return {
    cohortId: "c1",
    status: "submitted",
    extractedTotal: null,
    declaredTotal: null,
    extractedTestDate: null,
    declaredTestDate: null,
    submittedAt: "2026-11-01T00:00:00Z",
    ...over,
  };
}

describe("rankClaims", () => {
  it("ranks by score, then earlier test date, then earlier upload, per cohort", () => {
    const ranked = rankClaims([
      claim({ id: "a", extractedTotal: 1400, extractedTestDate: "2026-10-04" }),
      claim({ id: "b", extractedTotal: 1500, extractedTestDate: "2026-10-04" }),
      claim({ id: "c", extractedTotal: 1500, extractedTestDate: "2026-08-23" }),
      claim({ id: "d", cohortId: "c2", extractedTotal: 1200 }),
    ]);
    const rank = (id: string) => ranked.find((r) => r.id === id)!;
    expect(rank("c").rank).toBe(1);
    expect(rank("b").rank).toBe(2);
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

  it("breaks a full tie by the earlier upload", () => {
    const ranked = rankClaims([
      claim({ id: "late", extractedTotal: 1500, submittedAt: "2026-11-02T00:00:00Z" }),
      claim({ id: "early", extractedTotal: 1500, submittedAt: "2026-11-01T00:00:00Z" }),
    ]);
    expect(ranked.find((r) => r.id === "early")!.rank).toBe(1);
  });
});

describe("canApprove", () => {
  const claims = [
    claim({ id: "top", extractedTotal: 1500 }),
    claim({ id: "second", extractedTotal: 1450 }),
  ];

  it("approves only the top claim", () => {
    expect(canApprove("top", claims)).toEqual({ ok: true });
    expect(canApprove("second", claims)).toEqual({ ok: false, reason: "not_top" });
  });

  it("lets the next claim through once the top one is rejected", () => {
    const next = claims.map((c) => (c.id === "top" ? { ...c, status: "rejected" as const } : c));
    expect(canApprove("second", next)).toEqual({ ok: true });
  });

  it("blocks a second award in the same cohort", () => {
    const awarded = claims.map((c) => (c.id === "second" ? { ...c, status: "paid" as const } : c));
    expect(canApprove("top", awarded)).toEqual({ ok: false, reason: "already_awarded" });
  });

  it("blocks unknown and already-decided claims", () => {
    expect(canApprove("nope", claims)).toEqual({ ok: false, reason: "not_found" });
    const rejected = [claim({ id: "x", status: "rejected", extractedTotal: 1500 })];
    expect(canApprove("x", rejected)).toEqual({ ok: false, reason: "not_submitted" });
  });
});
