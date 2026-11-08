import { describe, expect, it } from "vitest";
import {
  AFFILIATE_SEAT_LIMIT,
  affiliateAccess,
  affiliateCapabilities,
  generateAffiliateCode,
  normalizeAffiliateCode,
  seatSummary,
} from "./rules";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const sub = (status: string, currentPeriodEnd: string | null = null) => ({
  status,
  currentPeriodEnd,
});

describe("affiliate access", () => {
  it.each(["active", "trialing"])("grants access while the subscription is %s", (status) => {
    expect(affiliateAccess(sub(status), NOW)).toBe("active");
  });

  it("keeps access while a failed payment is inside the paid period", () => {
    expect(affiliateAccess(sub("past_due", "2026-11-20T00:00:00.000Z"), NOW)).toBe("active");
  });

  it("lapses a failed payment once the paid period is over", () => {
    expect(affiliateAccess(sub("past_due", "2026-11-01T00:00:00.000Z"), NOW)).toBe("lapsed");
    expect(affiliateAccess(sub("past_due"), NOW)).toBe("lapsed");
  });

  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])(
    "lapses a %s subscription",
    (status) => {
      expect(affiliateAccess(sub(status, "2026-12-01T00:00:00.000Z"), NOW)).toBe("lapsed");
    }
  );

  it("lapses a tutor with no subscription at all", () => {
    expect(affiliateAccess(null, NOW)).toBe("lapsed");
  });
});

describe("affiliate capabilities", () => {
  it("lets an active tutor do everything", () => {
    expect([...affiliateCapabilities("active")].sort()).toEqual(
      ["assign", "regenerate_code", "remove", "view_progress", "view_roster"].sort()
    );
  });

  it("leaves a lapsed tutor with the roster and removal only", () => {
    expect([...affiliateCapabilities("lapsed")].sort()).toEqual(["remove", "view_roster"]);
  });
});

describe("affiliate codes", () => {
  it("normalizes case, spaces and a missing dash", () => {
    expect(normalizeAffiliateCode(" abcd efgh ")).toBe("ABCD-EFGH");
    expect(normalizeAffiliateCode("abcdefgh")).toBe("ABCD-EFGH");
    expect(normalizeAffiliateCode("ab-cd-ef-gh")).toBe("ABCD-EFGH");
  });

  it("rejects ambiguous letters, wrong lengths and junk", () => {
    expect(normalizeAffiliateCode("ABCD-EFG0")).toBeNull();
    expect(normalizeAffiliateCode("ABCD-EFGI")).toBeNull();
    expect(normalizeAffiliateCode("ABCD-EFG")).toBeNull();
    expect(normalizeAffiliateCode("ABCD-EFGHJ")).toBeNull();
    expect(normalizeAffiliateCode("<script>")).toBeNull();
    expect(normalizeAffiliateCode("")).toBeNull();
  });

  it("generates codes in the stored format from the given random bytes", () => {
    const code = generateAffiliateCode(() => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 31]));
    expect(code).toBe("ABCD-EFG9");
    expect(normalizeAffiliateCode(code)).toBe(code);
  });

  it("only produces valid codes for any byte values", () => {
    for (let seed = 0; seed < 256; seed += 1) {
      const code = generateAffiliateCode(() =>
        Uint8Array.from({ length: 8 }, (_, i) => (seed * 7 + i * 31) % 256)
      );
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });
});

describe("seat summary", () => {
  it("caps every tutor at 50 seats", () => {
    expect(AFFILIATE_SEAT_LIMIT).toBe(50);
    expect(seatSummary(12, 50)).toEqual({ used: 12, limit: 50, remaining: 38, full: false });
    expect(seatSummary(50, 50)).toEqual({ used: 50, limit: 50, remaining: 0, full: true });
  });

  it("never reports negative remaining seats", () => {
    expect(seatSummary(52, 50)).toEqual({ used: 52, limit: 50, remaining: 0, full: true });
  });
});
