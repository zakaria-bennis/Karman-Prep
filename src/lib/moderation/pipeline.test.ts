// ============================================================
// Unit tests for the moderation pipeline branching.
//
// Mocks ./providers so we can drive each branch without hitting
// OpenAI. The point is to lock down:
//   · Layer 1 keyword reject short-circuits before Layer 2
//   · Image-only messages now reach Layer 2 (the bug this PR fixes)
//   · Layer 2 high-severity → rejected
//   · Layer 2 medium-severity → approved_with_flag
//   · Layer 2 errors → REJECT (fail-closed)
//   · Empty text + no images → approved without calling provider
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModerationInput } from "./types";

// vi.mock() is hoisted to the top of the file by Vitest, so the mock
// fns have to live inside vi.hoisted() (also hoisted) to be in scope
// at mock-factory time.
const { callOpenAIModerationMock, callKarmanClassifierMock } = vi.hoisted(() => ({
  callOpenAIModerationMock: vi.fn(),
  callKarmanClassifierMock: vi.fn(),
}));
vi.mock("./providers", () => ({
  callOpenAIModeration: callOpenAIModerationMock,
}));
vi.mock("./karman-classifier", () => ({
  callKarmanClassifier: callKarmanClassifierMock,
}));

import { moderateMessage } from "./pipeline";

// Default: Karman is clean unless a specific test overrides it.
// That keeps every Layer 2 test from having to re-stub the Karman
// classifier just to assert OpenAI behavior.
function karmanClean(): void {
  callKarmanClassifierMock.mockResolvedValue({ flagged: false, reason: "clean" });
}

function baseInput(over: Partial<ModerationInput> = {}): ModerationInput {
  return {
    content: "",
    mediaUrls: [],
    senderId: "test-sender",
    senderUuid: "uuid-test-sender",
    channelId: "channel-1",
    messageType: "cohort_message",
    ...over,
  };
}

beforeEach(() => {
  callOpenAIModerationMock.mockReset();
  callKarmanClassifierMock.mockReset();
  karmanClean();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("moderateMessage — Layer 1 (keyword blocklist)", () => {
  it("rejects a message containing a slur without ever reaching the OpenAI call", async () => {
    const r = await moderateMessage(baseInput({ content: "you are a bitch" }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") {
      expect(r.layer).toBe("keyword");
      expect(r.rejection_message).toContain("breaches Karman");
    }
    expect(callOpenAIModerationMock).not.toHaveBeenCalled();
  });
});

describe("moderateMessage — empty input guard", () => {
  it("approves a message with no text AND no images without calling OpenAI", async () => {
    const r = await moderateMessage(baseInput());
    expect(r.decision).toBe("approved");
    expect(callOpenAIModerationMock).not.toHaveBeenCalled();
  });
});

describe("moderateMessage — image moderation (this PR)", () => {
  it("now calls OpenAI for image-only messages instead of bypassing", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: false,
      worstCategory: null,
      worstScore: 0,
      isHighSeverity: false,
    });
    const r = await moderateMessage(
      baseInput({ content: "", mediaUrls: ["https://cdn.example.com/a.jpg"] })
    );
    expect(r.decision).toBe("approved");
    expect(callOpenAIModerationMock).toHaveBeenCalledWith("", ["https://cdn.example.com/a.jpg"]);
  });

  it("forwards both text AND images when both are present", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: false,
      worstCategory: null,
      worstScore: 0,
      isHighSeverity: false,
    });
    await moderateMessage(
      baseInput({ content: "ok", mediaUrls: ["https://cdn.example.com/a.jpg"] })
    );
    expect(callOpenAIModerationMock).toHaveBeenCalledWith("ok", ["https://cdn.example.com/a.jpg"]);
  });

  it("rejects an image-only message when OpenAI flags it as high severity", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      worstCategory: "sexual/minors",
      worstScore: 0.9,
      isHighSeverity: true,
    });
    const r = await moderateMessage(baseInput({ mediaUrls: ["https://cdn.example.com/vile.jpg"] }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") {
      expect(r.layer).toBe("ai");
    }
  });
});

describe("moderateMessage — Layer 2 outcomes", () => {
  it("rejects HIGH severity", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      worstCategory: "harassment/threatening",
      worstScore: 0.7,
      isHighSeverity: true,
    });
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("rejected");
  });

  it("approves with flag on LOW-confidence non-HIGH categories (score < 0.5)", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      worstCategory: "harassment",
      worstScore: 0.35,
      isHighSeverity: false,
    });
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("approved_with_flag");
  });

  it("REJECTS high-confidence non-HIGH categories (score ≥ 0.5) — school audience threshold", async () => {
    // Real-world case from prod: `sexual (0.93)` had been delivered
    // because `sexual` (vs `sexual/minors`) isn't on the always-HIGH
    // list. For a 14-18 audience that's clearly wrong.
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      worstCategory: "sexual",
      worstScore: 0.93,
      isHighSeverity: false,
    });
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("rejected");
  });

  it("uses score = 0.5 as the inclusive cutoff (exactly 0.5 rejects)", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      worstCategory: "harassment",
      worstScore: 0.5,
      isHighSeverity: false,
    });
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("rejected");
  });

  it("still rejects HIGH-category flags regardless of score (e.g. sexual/minors at 0.2)", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      worstCategory: "sexual/minors",
      worstScore: 0.2,
      isHighSeverity: true,
    });
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("rejected");
  });

  it("approves a clean text message", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: false,
      worstCategory: null,
      worstScore: 0,
      isHighSeverity: false,
    });
    const r = await moderateMessage(baseInput({ content: "hi friend" }));
    expect(r.decision).toBe("approved");
  });

  it("fails CLOSED — rejects when OpenAI errors out", async () => {
    callOpenAIModerationMock.mockRejectedValueOnce(new Error("network down"));
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") {
      expect(r.layer).toBe("ai");
      expect(r.rejection_message).toContain("Please try again");
    }
  });
});

describe("moderateMessage — Karman bullying classifier (Layer 2.5)", () => {
  it("rejects when Karman flags even if OpenAI says clean", async () => {
    // The class of bug the classifier exists to catch: OpenAI's
    // safety categories don't trip on "nobody actually likes you",
    // but Karman's school-audience prompt does.
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: false,
      worstCategory: null,
      worstScore: 0,
      isHighSeverity: false,
    });
    callKarmanClassifierMock.mockResolvedValueOnce({
      flagged: true,
      reason: "put-down directed at another student",
    });
    const r = await moderateMessage(baseInput({ content: "nobody actually likes you" }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") {
      expect(r.layer).toBe("karman");
      expect(r.reason).toContain("put-down");
    }
  });

  it("fails closed when Karman's check cannot be had, even if OpenAI says clean", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: false,
      worstCategory: null,
      worstScore: 0,
      isHighSeverity: false,
    });
    callKarmanClassifierMock.mockRejectedValueOnce(new Error("classifier timeout"));
    const r = await moderateMessage(baseInput({ content: "study sesh?" }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") expect(r.rejection_message).toMatch(/try again/);
  });

  it("OpenAI fail-closed takes precedence even if Karman returns a flag", async () => {
    // OpenAI is the safety floor — if it errors we don't deliver
    // even when another layer has an opinion.
    callOpenAIModerationMock.mockRejectedValueOnce(new Error("openai down"));
    callKarmanClassifierMock.mockResolvedValueOnce({ flagged: false, reason: "clean" });
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") {
      expect(r.layer).toBe("ai"); // OpenAI fail-closed wins over Karman
    }
  });

  it("has Karman's check look at a picture sent with no words", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: false,
      worstCategory: null,
      worstScore: 0,
      isHighSeverity: false,
    });
    callKarmanClassifierMock.mockResolvedValueOnce({
      flagged: true,
      category: "sexual",
      reason: "nudity",
    });
    const r = await moderateMessage(
      baseInput({ content: "", mediaUrls: ["https://cdn.example.com/a.jpg"] })
    );
    expect(callKarmanClassifierMock).toHaveBeenCalledWith("", ["https://cdn.example.com/a.jpg"]);
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") expect(r.reason).toBe("Karman: sexual: nudity");
  });
});

// ============================================================
// Nothing is waved through. A sender who was approved a moment ago
// is checked again in full, images above all.
// ============================================================

describe("moderateMessage — every send is checked", () => {
  const clean = { flagged: false, isHighSeverity: false, worstCategory: null, worstScore: 0 };

  it("checks a second message from the same sender in full", async () => {
    callOpenAIModerationMock.mockResolvedValue(clean);
    await moderateMessage(baseInput({ content: "hello" }));
    await moderateMessage(baseInput({ content: "hello again" }));
    expect(callOpenAIModerationMock).toHaveBeenCalledTimes(2);
    expect(callKarmanClassifierMock).toHaveBeenCalledTimes(2);
  });

  it("checks an image sent right after a clean message, and rejects it when flagged", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce(clean);
    await moderateMessage(baseInput({ content: "hello" }));
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      isHighSeverity: true,
      worstCategory: "sexual/minors",
      worstScore: 0.97,
    });
    const r = await moderateMessage(baseInput({ mediaUrls: ["https://cdn.example.com/b.jpg"] }));
    expect(callOpenAIModerationMock).toHaveBeenLastCalledWith("", [
      "https://cdn.example.com/b.jpg",
    ]);
    expect(r.decision).toBe("rejected");
  });
});

// ============================================================
// Academic dishonesty: reported on its own layer.
// ============================================================

describe("moderateMessage — academic dishonesty", () => {
  const clean = { flagged: false, isHighSeverity: false, worstCategory: null, worstScore: 0 };

  it("rejects on the integrity layer when the classifier says cheating", async () => {
    callOpenAIModerationMock.mockResolvedValue(clean);
    callKarmanClassifierMock.mockResolvedValue({
      flagged: true,
      category: "cheating",
      reason: "asks for a bare answer",
    });
    const r = await moderateMessage(baseInput({ content: "just tell me the answer to 14" }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") {
      expect(r.layer).toBe("integrity");
      expect(r.rejection_message).toMatch(/not for passing answers/);
    }
  });

  it("keeps other conduct flags on the karman layer", async () => {
    callOpenAIModerationMock.mockResolvedValue(clean);
    callKarmanClassifierMock.mockResolvedValue({
      flagged: true,
      category: "conduct",
      reason: "a put-down",
    });
    const r = await moderateMessage(baseInput({ content: "nobody likes you" }));
    expect(r.decision).toBe("rejected");
    if (r.decision === "rejected") expect(r.layer).toBe("karman");
  });
});

// ============================================================
// Staff: the two student-only rules are not held against a tutor.
// ============================================================

describe("moderateMessage — a tutor or admin sending", () => {
  const clean = { flagged: false, isHighSeverity: false, worstCategory: null, worstScore: 0 };

  it("lets a tutor explain an answer", async () => {
    callOpenAIModerationMock.mockResolvedValue(clean);
    callKarmanClassifierMock.mockResolvedValue({
      flagged: true,
      category: "cheating",
      reason: "gives the answer",
    });
    const r = await moderateMessage(
      baseInput({ content: "It is B, because the radius is squared", staff: true })
    );
    expect(r.decision).toBe("approved");
  });

  it("lets a tutor share a link, with staff known only later", async () => {
    callOpenAIModerationMock.mockResolvedValue(clean);
    callKarmanClassifierMock.mockResolvedValue({
      flagged: true,
      category: "contact",
      reason: "a meeting link",
    });
    const r = await moderateMessage(
      baseInput({ content: "Class link is in the calendar", staff: Promise.resolve(true) })
    );
    expect(r.decision).toBe("approved");
  });

  it("still stops a tutor for sexual content or other conduct", async () => {
    callOpenAIModerationMock.mockResolvedValue(clean);
    for (const category of ["sexual", "conduct"] as const) {
      callKarmanClassifierMock.mockResolvedValue({ flagged: true, category, reason: "no" });
      const r = await moderateMessage(baseInput({ content: "something", staff: true }));
      expect(r.decision).toBe("rejected");
    }
  });

  it("holds a student to both rules", async () => {
    callOpenAIModerationMock.mockResolvedValue(clean);
    callKarmanClassifierMock.mockResolvedValue({
      flagged: true,
      category: "contact",
      reason: "a handle",
    });
    const r = await moderateMessage(baseInput({ content: "add me", staff: false }));
    expect(r.decision).toBe("rejected");
  });
});
