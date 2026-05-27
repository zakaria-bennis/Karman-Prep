// @vitest-environment node
//
// Unit tests for the Phase 7 model tiering policy in
// scripts/lib/explanation-tiering.mjs.

import { describe, expect, it } from "vitest";
import {
  pickGeneratorTier,
  pickCriticTier,
  TIERING_MODELS,
} from "../../../scripts/lib/explanation-tiering.mjs";

const SONNET = TIERING_MODELS.SONNET;
const OPUS = TIERING_MODELS.OPUS;

describe("pickGeneratorTier — default Sonnet", () => {
  it("plain math MC question → Sonnet", () => {
    const t = pickGeneratorTier({
      question: {
        subject: "math",
        answer_format: "multiple_choice",
        answer_verification_status: "verified_panel",
      },
    });
    expect(t.model).toBe(SONNET);
  });

  it("plain R&W question with short passage → Sonnet", () => {
    const t = pickGeneratorTier({
      question: {
        subject: "reading",
        answer_format: "multiple_choice",
        passage: "Short passage under 800 chars.",
        answer_verification_status: "verified_panel",
      },
    });
    expect(t.model).toBe(SONNET);
  });
});

describe("pickGeneratorTier — Opus escalation", () => {
  it("Phase 6 used Opus arbitration → Opus generator", () => {
    const t = pickGeneratorTier({
      question: {
        subject: "math",
        answer_format: "multiple_choice",
        answer_verification_status: "verified_opus",
      },
    });
    expect(t.model).toBe(OPUS);
  });

  it("R&W dispute (model_consensus_disagrees_with_key) → Opus", () => {
    const t = pickGeneratorTier({
      question: {
        subject: "reading",
        answer_format: "multiple_choice",
        answer_verification_status: "model_consensus_disagrees_with_key",
      },
    });
    expect(t.model).toBe(OPUS);
  });

  it("R&W with dispute_category=rw_reasoning_dispute → Opus", () => {
    const t = pickGeneratorTier({
      question: {
        subject: "reading",
        answer_format: "multiple_choice",
        dispute_category: "rw_reasoning_dispute",
      },
    });
    expect(t.model).toBe(OPUS);
  });

  it("R&W with dual passages (passage_a + passage_b) → Opus", () => {
    const t = pickGeneratorTier({
      question: {
        subject: "reading",
        answer_format: "multiple_choice",
        passage_a: "First passage.",
        passage_b: "Second passage.",
      },
    });
    expect(t.model).toBe(OPUS);
  });

  it("R&W with passage >800 chars → Opus", () => {
    const t = pickGeneratorTier({
      question: {
        subject: "reading",
        answer_format: "multiple_choice",
        passage: "x".repeat(900),
      },
    });
    expect(t.model).toBe(OPUS);
  });

  it("isRetry=true forces Opus regardless of other signals", () => {
    const t = pickGeneratorTier({
      question: { subject: "math", answer_format: "multiple_choice" },
      isRetry: true,
    });
    expect(t.model).toBe(OPUS);
    expect(t.reason).toContain("Retry");
  });
});

describe("pickCriticTier", () => {
  it("default → Sonnet critic", () => {
    const t = pickCriticTier({
      question: { subject: "math", answer_format: "multiple_choice" },
      generatorModel: SONNET,
    });
    expect(t.model).toBe(SONNET);
  });

  it("escalate=true → Opus critic", () => {
    const t = pickCriticTier({
      question: { subject: "math", answer_format: "multiple_choice" },
      generatorModel: SONNET,
      escalate: true,
    });
    expect(t.model).toBe(OPUS);
  });

  it("Opus-generated R&W disputed question → Opus critic (second opinion)", () => {
    const t = pickCriticTier({
      question: {
        subject: "reading",
        answer_verification_status: "model_consensus_disagrees_with_key",
      },
      generatorModel: OPUS,
    });
    expect(t.model).toBe(OPUS);
  });

  it("Opus-generated but undisputed → Sonnet critic (Sonnet good enough)", () => {
    const t = pickCriticTier({
      question: { subject: "math", answer_verification_status: "verified_panel" },
      generatorModel: OPUS,
    });
    expect(t.model).toBe(SONNET);
  });
});
