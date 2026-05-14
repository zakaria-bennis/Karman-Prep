// ============================================================
// Unit tests for the chat-send authorization helper.
//
// Each Karman chat-send rule is its own test so a future change
// to product policy fails LOUD — and the failing test names tell
// you exactly which rule shifted.
// ============================================================

import { describe, expect, it } from "vitest";
import { evaluateSendChannelAuth, type SendChannelAuthInputs } from "./can-send";

function inputs(over: Partial<SendChannelAuthInputs> = {}): SendChannelAuthInputs {
  return {
    messageType: "cohort_message",
    isMember: false,
    isTutor: false,
    isAdmin: false,
    muted: false,
    ...over,
  };
}

describe("evaluateSendChannelAuth — cohort_message / qa_question", () => {
  it("allows an active cohort member", () => {
    const r = evaluateSendChannelAuth(inputs({ messageType: "cohort_message", isMember: true }));
    expect(r.ok).toBe(true);
  });

  it("allows the cohort's tutor", () => {
    const r = evaluateSendChannelAuth(inputs({ messageType: "cohort_message", isTutor: true }));
    expect(r.ok).toBe(true);
  });

  it("allows admins", () => {
    const r = evaluateSendChannelAuth(inputs({ messageType: "cohort_message", isAdmin: true }));
    expect(r.ok).toBe(true);
  });

  it("rejects a non-member, non-tutor, non-admin", () => {
    const r = evaluateSendChannelAuth(inputs({ messageType: "cohort_message" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(403);
      expect(r.error).toBe("Forbidden");
    }
  });

  it("applies the same rules to qa_question", () => {
    // Sanity check: qa_question is treated identically to cohort_message
    // for membership purposes.
    const okMember = evaluateSendChannelAuth(
      inputs({ messageType: "qa_question", isMember: true })
    );
    const notOk = evaluateSendChannelAuth(inputs({ messageType: "qa_question" }));
    expect(okMember.ok).toBe(true);
    expect(notOk.ok).toBe(false);
  });
});

describe("evaluateSendChannelAuth — qa_answer (stricter rules)", () => {
  it("allows a tutor", () => {
    const r = evaluateSendChannelAuth(inputs({ messageType: "qa_answer", isTutor: true }));
    expect(r.ok).toBe(true);
  });

  it("allows an admin", () => {
    const r = evaluateSendChannelAuth(inputs({ messageType: "qa_answer", isAdmin: true }));
    expect(r.ok).toBe(true);
  });

  it("rejects a student even if they're an active cohort member", () => {
    // Members can post questions but NOT answers — that's the
    // load-bearing distinction between qa_question and qa_answer.
    const r = evaluateSendChannelAuth(inputs({ messageType: "qa_answer", isMember: true }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("Only tutors can post Q&A answers");
    }
  });

  it("rejects a totally unrelated user", () => {
    const r = evaluateSendChannelAuth(inputs({ messageType: "qa_answer" }));
    expect(r.ok).toBe(false);
  });
});

describe("evaluateSendChannelAuth — mute rules", () => {
  it("blocks a muted student", () => {
    const r = evaluateSendChannelAuth(
      inputs({ messageType: "cohort_message", isMember: true, muted: true })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("temporarily muted");
    }
  });

  it("does NOT block a muted tutor (tutors bypass mute)", () => {
    const r = evaluateSendChannelAuth(
      inputs({ messageType: "cohort_message", isTutor: true, muted: true })
    );
    expect(r.ok).toBe(true);
  });

  it("does NOT block a muted admin (admins bypass mute)", () => {
    const r = evaluateSendChannelAuth(
      inputs({ messageType: "cohort_message", isAdmin: true, muted: true })
    );
    expect(r.ok).toBe(true);
  });

  it("mute check runs AFTER the authority check — unauthorized + muted → 'Forbidden', not 'muted'", () => {
    // A non-member who's also muted gets the membership error first.
    // Tests document the precedence so a future refactor doesn't
    // accidentally flip the order.
    const r = evaluateSendChannelAuth(inputs({ messageType: "cohort_message", muted: true }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("Forbidden");
    }
  });
});
