// The rules of a student's standing in chat: what counts, the warning, and the pause.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createAdminClient: vi.fn() }));

import { GOOD_STANDING, afterStrike, consequenceOf } from "./standing";

const rejected = (layer: "keyword" | "ai" | "karman" | "integrity", reason: string) =>
  ({ decision: "rejected", layer, reason, rejection_message: "x" }) as const;

describe("consequenceOf", () => {
  it("counts answer-sharing as a strike", () => {
    expect(consequenceOf(rejected("integrity", "Karman: asks for a bare answer"))).toEqual({
      kind: "strike",
    });
  });

  it("pauses at once for sexual content, with no strike first", () => {
    expect(consequenceOf(rejected("ai", "OpenAI: sexual/minors (0.97)"))).toEqual({
      kind: "pause",
      reason: "content",
    });
    expect(consequenceOf(rejected("ai", "OpenAI: sexual (0.81)"))).toEqual({
      kind: "pause",
      reason: "content",
    });
  });

  it("does not count other rejections, an outage, or anything approved", () => {
    expect(consequenceOf(rejected("keyword", "Blocked: shit")).kind).toBe("none");
    expect(consequenceOf(rejected("karman", "Karman: a put-down")).kind).toBe("none");
    expect(consequenceOf(rejected("ai", "OpenAI: harassment (0.70)")).kind).toBe("none");
    expect(consequenceOf(rejected("ai", "OpenAI moderation unavailable: timeout")).kind).toBe(
      "none"
    );
    expect(consequenceOf({ decision: "approved" }).kind).toBe("none");
    expect(consequenceOf({ decision: "approved_with_flag", reason: "x" }).kind).toBe("none");
  });
});

describe("afterStrike", () => {
  it("warns the first time and does not pause", () => {
    expect(afterStrike(GOOD_STANDING)).toEqual({ strikes: 1, paused: false, warned: true });
  });

  it("pauses the second time, without another warning", () => {
    expect(afterStrike({ strikes: 1, paused: false })).toEqual({
      strikes: 2,
      paused: true,
      warned: false,
    });
  });

  it("stays paused once paused", () => {
    expect(afterStrike({ strikes: 2, paused: true }).paused).toBe(true);
  });
});
