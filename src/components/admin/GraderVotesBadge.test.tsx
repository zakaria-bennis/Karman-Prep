// @vitest-environment jsdom
//
// Tests for GraderVotesBadge — locks in the v1 → v2 key aliasing
// added 2026-05-29.
//
// Phase 6's verify-answers.mjs writes the new JSONB shape:
//   pass1: { gemini, deepseek, groq }
//
// The v1 multi-vote-grader.mjs (removed in PR #189) wrote:
//   pass1: { flash, deepseek, llama }
//
// The badge needs to keep rendering correctly across the schema
// transition. These tests cover BOTH key shapes plus the mixed
// edge case.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GraderVotesBadge } from "./GraderVotesBadge";

describe("GraderVotesBadge — v1 (flash/llama) keys still render", () => {
  it("shows Flash + Llama answers from the old key names", () => {
    render(
      <GraderVotesBadge
        votes={{
          pass1: { flash: "B", deepseek: "B", llama: "C" },
          verdict: "verified",
          stored_answer: "B",
          graded_at: "2026-05-01T00:00:00Z",
        }}
        storedAnswer="B"
      />
    );
    // Flash chip
    expect(screen.getByTitle(/Flash answered B/i)).toBeInTheDocument();
    // Llama chip — disagrees with stored, so it's a different chip but still rendered
    expect(screen.getByTitle(/Llama answered C/i)).toBeInTheDocument();
    expect(screen.getByTitle(/DeepSeek answered B/i)).toBeInTheDocument();
  });
});

describe("GraderVotesBadge — v2 (gemini/groq) keys map correctly", () => {
  it("shows Flash chip from the Phase 6 'gemini' key", () => {
    render(
      <GraderVotesBadge
        votes={{
          pass1: { gemini: "C", deepseek: "C", groq: "D" },
          phase6: {
            verifier_status: "verified_panel",
            dispute_category: "none",
            escalation_path: "human_review_only",
            reason: "Pass 1 majority agreed with stored answer — no escalation.",
            suggested_verified_answer: null,
          },
          verdict: "verified",
          graded_at: "2026-05-28T19:38:24.360Z",
          stored_answer: "C",
        }}
        storedAnswer="C"
      />
    );
    // Flash label, gemini answer — the v2 key is read but label preserved
    expect(screen.getByTitle(/Flash answered C/i)).toBeInTheDocument();
    // Llama label, groq answer
    expect(screen.getByTitle(/Llama answered D/i)).toBeInTheDocument();
    expect(screen.getByTitle(/DeepSeek answered C/i)).toBeInTheDocument();
  });

  it("renders Pro chip when verified_pro escalation happened", () => {
    render(
      <GraderVotesBadge
        votes={{
          pass1: { gemini: "D", deepseek: null, groq: null },
          pass2_pro: "D",
          phase6: {
            verifier_status: "verified_pro",
            dispute_category: "visual_dispute",
            escalation_path: "pro",
            reason: "Pro agreed with the stored key after Pass 1 dispute.",
            suggested_verified_answer: null,
          },
          verdict: "verified_pro",
          graded_at: "2026-05-28T09:44:36.438Z",
          stored_answer: "D",
        }}
        storedAnswer="D"
      />
    );
    expect(screen.getByTitle(/Pro answered D/i)).toBeInTheDocument();
  });

  it("renders Opus chip when verified_opus escalation happened", () => {
    render(
      <GraderVotesBadge
        votes={{
          pass1: { gemini: "D", deepseek: "C", groq: "C" },
          pass3_opus: "D",
          phase6: {
            verifier_status: "verified_opus",
            dispute_category: "rw_reasoning_dispute",
            escalation_path: "opus",
            reason: "Opus agreed with the stored key after Pass 1 dispute.",
            suggested_verified_answer: null,
          },
          verdict: "verified_opus",
          graded_at: "2026-05-28T19:44:04.608Z",
          stored_answer: "D",
        }}
        storedAnswer="D"
      />
    );
    expect(screen.getByTitle(/Opus answered D/i)).toBeInTheDocument();
  });
});

describe("GraderVotesBadge — defensive paths", () => {
  it("shows Ungraded hint when votes is null", () => {
    render(<GraderVotesBadge votes={null} storedAnswer="A" />);
    expect(screen.getByText(/Ungraded/i)).toBeInTheDocument();
  });

  it("shows Ungraded hint when votes is malformed (not an object)", () => {
    render(<GraderVotesBadge votes={"oops" as unknown as null} storedAnswer="A" />);
    expect(screen.getByText(/Ungraded/i)).toBeInTheDocument();
  });

  it("renders dashes for voters who didn't vote (sparse pass1)", () => {
    render(
      <GraderVotesBadge
        votes={{
          pass1: { gemini: "C" }, // only Flash voted
          verdict: "verified",
          stored_answer: "C",
          graded_at: "2026-05-28T19:38:24Z",
        }}
        storedAnswer="C"
      />
    );
    // Flash chip should have the answer
    expect(screen.getByTitle(/Flash answered C/i)).toBeInTheDocument();
    // DeepSeek + Llama should show "did not vote"
    expect(screen.getByTitle(/DeepSeek did not vote/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Llama did not vote/i)).toBeInTheDocument();
  });
});
