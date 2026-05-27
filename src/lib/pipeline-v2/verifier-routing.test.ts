// @vitest-environment node
//
// Unit tests for the Phase 6 typed dispute router + verdict
// reconciler in scripts/lib/verifier-routing.mjs.
//
// The router IS the policy — every rule in the user's verbatim
// 7-rule routing answer needs to be exercised:
//
//   1. R&W disputes → Opus
//   2. Math + visual → Pro
//   3. Math notation flag → SymPy first
//   4. Math open-ended numeric → SymPy first
//   5. Pure math reasoning → Pro
//   6. Ambiguous → BOTH
//   7. (downstream) Pro + Opus disagree → human review
//
// Plus the hard stops (extraction_error, unanswerable) and the
// happy-path (panel agrees with key → NONE).

import { describe, expect, it } from "vitest";
import { routeDispute, reconcileVerdict } from "../../../scripts/lib/verifier-routing.mjs";
import {
  DISPUTE_CATEGORIES,
  ESCALATION_PATHS,
  VERIFIER_STATUSES,
} from "../../../scripts/lib/grader-roles.mjs";

// Fixture helper — sane defaults for a math MC question.
function mathMcQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    subject: "math",
    answer_format: "multiple_choice",
    answer_choices: [
      { letter: "A", choice_text: "1" },
      { letter: "B", choice_text: "2" },
      { letter: "C", choice_text: "3" },
      { letter: "D", choice_text: "4" },
    ],
    selected_official_answer: "B",
    correct_answer: "B",
    question_text: "What is 1 + 1?",
    ...overrides,
  };
}

function rwQuestion(overrides: Record<string, unknown> = {}) {
  return mathMcQuestion({
    subject: "reading",
    question_text: "Which choice best describes the author's tone?",
    ...overrides,
  });
}

function vote(role: string, answer: string | null, extras: Record<string, unknown> = {}) {
  return { role, answer, is_answerable: true, ok: !!answer, ...extras };
}

describe("routeDispute — hard stops", () => {
  it("MC with <4 choices → extraction_error / human_review_only", () => {
    const r = routeDispute({
      question: mathMcQuestion({ answer_choices: [{ letter: "A", choice_text: "1" }] }),
      pass1Votes: [vote("deepseek", "A"), vote("groq", "A"), vote("flash", "A")],
      pass1Tally: { consensus: "A", count: 3, unanimous: true },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.EXTRACTION_ERROR);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.HUMAN_REVIEW_ONLY);
  });

  it("all voters report unanswerable → unanswerable_question / human_review_only", () => {
    const r = routeDispute({
      question: mathMcQuestion(),
      pass1Votes: [
        { role: "deepseek", answer: null, is_answerable: false },
        { role: "groq", answer: null, is_answerable: false },
        { role: "flash", answer: null, is_answerable: false },
      ],
      pass1Tally: { consensus: null, count: 0, unanimous: false },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.UNANSWERABLE_QUESTION);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.HUMAN_REVIEW_ONLY);
  });
});

describe("routeDispute — happy path", () => {
  it("panel majority agrees with key → NONE / human_review_only sentinel", () => {
    const r = routeDispute({
      question: mathMcQuestion(),
      pass1Votes: [vote("deepseek", "B"), vote("groq", "B"), vote("flash", "B")],
      pass1Tally: { consensus: "B", count: 3, unanimous: true },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.NONE);
  });
});

describe("routeDispute — rule 1: R&W always → Opus", () => {
  it("R&W dispute routes to Opus regardless of which voter disagreed", () => {
    const r = routeDispute({
      question: rwQuestion(),
      pass1Votes: [vote("deepseek", "A"), vote("groq", "B"), vote("flash", "C")],
      pass1Tally: { consensus: null, count: 1, unanimous: false },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.RW_REASONING_DISPUTE);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.OPUS);
  });
});

describe("routeDispute — rule 4: numeric_entry → SymPy first", () => {
  it("math numeric_entry with panel split routes to SymPy first", () => {
    const r = routeDispute({
      question: mathMcQuestion({
        answer_format: "numeric_entry",
        selected_official_answer: "0.5",
      }),
      // Panel split: deepseek says "1/2" (mathematically equivalent
      // to 0.5 but textually different), the others disagree.
      pass1Votes: [vote("deepseek", "1/2"), vote("groq", "3"), vote("flash", "3")],
      pass1Tally: { consensus: "3", count: 2, unanimous: false },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.MATH_EQUIVALENCE_DISPUTE);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.SYMPY_FIRST);
  });
});

describe("routeDispute — rule 3: math_notation_status flag → SymPy first", () => {
  it("Phase 5 math notation flag → math_notation_dispute / sympy_first", () => {
    const r = routeDispute({
      question: mathMcQuestion({
        math_notation_status: "suggested_repair_needs_review",
      }),
      pass1Votes: [vote("deepseek", "A"), vote("groq", "A"), vote("flash", "C")],
      pass1Tally: { consensus: "A", count: 2, unanimous: false },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.MATH_NOTATION_DISPUTE);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.SYMPY_FIRST);
  });
});

describe("routeDispute — rule 2: math + visual → Pro", () => {
  it("math + image_url routes to Pro", () => {
    const r = routeDispute({
      question: mathMcQuestion({ image_url: "https://r2/example.png" }),
      pass1Votes: [vote("deepseek", "C"), vote("groq", "C"), vote("flash", "A")],
      pass1Tally: { consensus: "C", count: 2, unanimous: false },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.VISUAL_DISPUTE);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.PRO);
  });

  it("math + 'the graph above' phrasing routes to Pro", () => {
    const r = routeDispute({
      question: mathMcQuestion({
        question_text: "Based on the graph above, what is f(2)?",
        // Panel agrees on A; stored key is B — clear dispute.
      }),
      pass1Votes: [vote("deepseek", "A"), vote("groq", "A"), vote("flash", "A")],
      pass1Tally: { consensus: "A", count: 3, unanimous: true },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.VISUAL_DISPUTE);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.PRO);
  });
});

describe("routeDispute — answer-key already disputed → BOTH", () => {
  it("Phase 2 correction_disputed routes to BOTH Pro + Opus", () => {
    const r = routeDispute({
      question: mathMcQuestion({ answer_key_status: "correction_disputed" }),
      pass1Votes: [vote("deepseek", "A"), vote("groq", "A"), vote("flash", "A")],
      pass1Tally: { consensus: "A", count: 3, unanimous: true },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.ANSWER_KEY_DISPUTE);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.BOTH);
  });
});

describe("routeDispute — rule 5: pure math reasoning → Pro", () => {
  it("math, no visual, no notation flag, panel disagrees with key → Pro first", () => {
    const r = routeDispute({
      question: mathMcQuestion({ question_text: "What is the value of x in 2x + 3 = 11?" }),
      // Panel says A but key is B — pure-math dispute, no visual.
      pass1Votes: [vote("deepseek", "A"), vote("groq", "A"), vote("flash", "A")],
      pass1Tally: { consensus: "A", count: 3, unanimous: true },
    });
    expect(r.dispute_category).toBe(DISPUTE_CATEGORIES.MATH_EQUIVALENCE_DISPUTE);
    expect(r.escalation_path).toBe(ESCALATION_PATHS.PRO);
  });
});

describe("reconcileVerdict — SYMPY_FIRST", () => {
  it("SymPy equivalent → verified_sympy, no suggestion", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.SYMPY_FIRST,
      storedAnswer: "0.5",
      proAnswer: null,
      opusAnswer: null,
      sympyResult: "equivalent",
      pass1Consensus: "1/2",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.VERIFIED_SYMPY);
    expect(v.suggested_verified_answer).toBeNull();
  });

  it("SymPy not_equivalent → model_consensus_disagrees + suggest panel ans", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.SYMPY_FIRST,
      storedAnswer: "0.5",
      proAnswer: null,
      opusAnswer: null,
      sympyResult: "not_equivalent",
      pass1Consensus: "3",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.MODEL_CONSENSUS_DISAGREES_WITH_KEY);
    expect(v.suggested_verified_answer).toBe("3");
  });

  it("SymPy inconclusive → sympy_inconclusive (caller may escalate)", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.SYMPY_FIRST,
      storedAnswer: "0.5",
      proAnswer: null,
      opusAnswer: null,
      sympyResult: "inconclusive",
      pass1Consensus: "0.5",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.SYMPY_INCONCLUSIVE);
  });
});

describe("reconcileVerdict — PRO", () => {
  it("Pro agrees with key → verified_pro", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.PRO,
      storedAnswer: "B",
      proAnswer: "B",
      opusAnswer: null,
      sympyResult: null,
      pass1Consensus: "A",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.VERIFIED_PRO);
    expect(v.suggested_verified_answer).toBeNull();
  });

  it("Pro disagrees with key → model_consensus_disagrees + suggest Pro's answer", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.PRO,
      storedAnswer: "B",
      proAnswer: "C",
      opusAnswer: null,
      sympyResult: null,
      pass1Consensus: "C",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.MODEL_CONSENSUS_DISAGREES_WITH_KEY);
    expect(v.suggested_verified_answer).toBe("C");
  });
});

describe("reconcileVerdict — OPUS", () => {
  it("Opus agrees with key → verified_opus", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.OPUS,
      storedAnswer: "B",
      proAnswer: null,
      opusAnswer: "B",
      sympyResult: null,
      pass1Consensus: "A",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.VERIFIED_OPUS);
  });

  it("Opus produced no answer → verifier_error", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.OPUS,
      storedAnswer: "B",
      proAnswer: null,
      opusAnswer: null,
      sympyResult: null,
      pass1Consensus: "A",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.VERIFIER_ERROR);
  });
});

describe("reconcileVerdict — BOTH", () => {
  it("Pro + Opus agree with key → verified_opus (strongest)", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.BOTH,
      storedAnswer: "B",
      proAnswer: "B",
      opusAnswer: "B",
      sympyResult: null,
      pass1Consensus: "A",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.VERIFIED_OPUS);
  });

  it("Pro + Opus agree on a different answer than key → model_consensus_disagrees", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.BOTH,
      storedAnswer: "B",
      proAnswer: "C",
      opusAnswer: "C",
      sympyResult: null,
      pass1Consensus: "C",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.MODEL_CONSENSUS_DISAGREES_WITH_KEY);
    expect(v.suggested_verified_answer).toBe("C");
  });

  it("Pro and Opus disagree → escalation_disagrees, no suggestion", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.BOTH,
      storedAnswer: "B",
      proAnswer: "C",
      opusAnswer: "D",
      sympyResult: null,
      pass1Consensus: null,
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.ESCALATION_DISAGREES);
    expect(v.suggested_verified_answer).toBeNull();
  });

  it("BOTH missing Pro answer → verifier_error", () => {
    const v = reconcileVerdict({
      escalationPath: ESCALATION_PATHS.BOTH,
      storedAnswer: "B",
      proAnswer: null,
      opusAnswer: "B",
      sympyResult: null,
      pass1Consensus: "A",
    });
    expect(v.verifier_status).toBe(VERIFIER_STATUSES.VERIFIER_ERROR);
  });
});
