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
// fn has to live inside vi.hoisted() (also hoisted) to be in scope
// at mock-factory time.
const { callOpenAIModerationMock } = vi.hoisted(() => ({
  callOpenAIModerationMock: vi.fn(),
}));
vi.mock("./providers", () => ({
  callOpenAIModeration: callOpenAIModerationMock,
}));

import { moderateMessage } from "./pipeline";

function baseInput(over: Partial<ModerationInput> = {}): ModerationInput {
  return {
    content: "",
    mediaUrls: [],
    senderId: "test-sender",
    channelId: "channel-1",
    messageType: "cohort_message",
    ...over,
  };
}

beforeEach(() => {
  callOpenAIModerationMock.mockReset();
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

  it("approves with flag on medium severity", async () => {
    callOpenAIModerationMock.mockResolvedValueOnce({
      flagged: true,
      worstCategory: "harassment",
      worstScore: 0.55,
      isHighSeverity: false,
    });
    const r = await moderateMessage(baseInput({ content: "..." }));
    expect(r.decision).toBe("approved_with_flag");
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
