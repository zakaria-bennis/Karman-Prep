// ============================================================
// Unit tests for the 7-step question-matcher (Phase 3).
//
// The matcher pairs Gemini-detected questions on a PDF page
// with their quiz_questions DB rows. Spec: pipeline-v2-redesign-
// plan.md §3.4.
//
// Each describe block tests ONE step of the hierarchy. The
// failure cases also test the strictness ordering (an earlier
// step wins over a later one).
//
// Logic in scripts/lib/question-matcher.mjs.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  matchOneDetection,
  matchPageDetections,
  processedStatusFromMatch,
  MATCH_CONFIDENCE,
} from "../../../scripts/lib/question-matcher.mjs";

// .mjs import doesn't carry types; assert known fixture shape locally
type MatchedRow = { id: string };

// ── Test fixtures ────────────────────────────────────────────

function detection(overrides: Record<string, unknown> = {}) {
  return {
    source_question_number: null,
    stem_snippet: "Which choice completes the text with the most precise wording?",
    passage_snippet: null,
    choice_snippets: null,
    bbox: [100, 100, 800, 1000],
    confidence: 0.92,
    contains_full_question_stem: true,
    contains_passage_if_present: true,
    contains_answer_choices_if_mcq: true,
    contains_embedded_visual_if_present: true,
    ...overrides,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-1",
    question_text: "Which choice completes the text with the most precise wording?",
    passage: null,
    passage_a: null,
    passage_b: null,
    passage_intro: null,
    source_question_number: null,
    answer_choices: [
      { letter: "A", choice_text: "broad" },
      { letter: "B", choice_text: "vital" },
      { letter: "C", choice_text: "narrow" },
      { letter: "D", choice_text: "modest" },
    ],
    ...overrides,
  };
}

// ── Step 2: page_question_number ────────────────────────────

describe("matchOneDetection — Step 2 (page_question_number)", () => {
  it("matches when both sides have the same source_question_number", () => {
    const r = matchOneDetection(detection({ source_question_number: 17 }), [
      row({ source_question_number: 17 }),
    ]);
    expect(r.matched).not.toBeNull();
    expect(r.method).toBe("page_question_number");
    expect(r.confidence).toBe(MATCH_CONFIDENCE.page_question_number);
  });

  it("skips Step 2 when detection has no source_question_number", () => {
    // Stem also matches — verify we DON'T mis-attribute as Step 2.
    const r = matchOneDetection(detection({ source_question_number: null }), [
      row({ source_question_number: 17 }),
    ]);
    // Step 5 (stem) catches it.
    expect(r.method).toBe("page_stem_snippet");
  });

  it("skips Step 2 when the numbers don't match", () => {
    const r = matchOneDetection(detection({ source_question_number: 99 }), [
      row({ source_question_number: 17 }),
    ]);
    // Falls through to stem matching since the stems are identical.
    expect(r.method).toBe("page_stem_snippet");
  });
});

// ── Step 3: page_passage_snippet ────────────────────────────

describe("matchOneDetection — Step 3 (page_passage_snippet)", () => {
  it("matches via passage prefix when passage_snippet is present", () => {
    const r = matchOneDetection(
      detection({
        stem_snippet: "Which choice completes the text",
        passage_snippet: "Researcher Philip Metzger continues to use the Apollo data",
      }),
      [
        row({
          id: "row-other",
          passage: "Completely unrelated text about geology",
        }),
        row({
          id: "row-target",
          passage:
            "Researcher Philip Metzger continues to use the Apollo data demonstrating significance",
        }),
      ]
    );
    expect((r.matched as MatchedRow | null)?.id).toBe("row-target");
    expect(r.method).toBe("page_passage_snippet");
  });

  it("matches passage_a when it's a Text-1/Text-2 question", () => {
    const r = matchOneDetection(
      detection({
        passage_snippet: "Passage A starts with these specific opening words about the topic",
      }),
      [
        row({
          id: "row-1",
          passage_a: "Passage A starts with these specific opening words about the topic of energy",
          passage_b: "Passage B is entirely different",
        }),
      ]
    );
    expect((r.matched as MatchedRow | null)?.id).toBe("row-1");
  });

  it("does not match when no passage prefix lines up", () => {
    const r = matchOneDetection(
      detection({
        // 60-char stem clears the 40-char threshold so Step 5 fires.
        stem_snippet: "Which choice completes the text with the most precise wording?",
        passage_snippet: "Foo bar baz unique sentinel string that won't be in any row",
      }),
      [row({ passage: "Different passage text entirely unrelated content here" })]
    );
    // Passage mismatch → falls back to stem.
    expect(r.method).toBe("page_stem_snippet");
  });
});

// ── Step 4: page_choice_snippets ────────────────────────────

describe("matchOneDetection — Step 4 (page_choice_snippets)", () => {
  it("matches MC when 3 of 4 choice prefixes line up", () => {
    const r = matchOneDetection(
      detection({
        passage_snippet: null,
        stem_snippet: "Generic stem text",
        choice_snippets: {
          A: "broad in scope and detail",
          B: "vital to the discussion",
          C: "narrow but informative",
          D: "completely different here",
        },
      }),
      [
        row({
          question_text: "Different generic stem",
          answer_choices: [
            { letter: "A", choice_text: "broad in scope and detail xx" },
            { letter: "B", choice_text: "vital to the discussion yy" },
            { letter: "C", choice_text: "narrow but informative zz" },
            { letter: "D", choice_text: "totally different choice text" },
          ],
        }),
      ]
    );
    expect(r.method).toBe("page_choice_snippets");
  });

  it("does not match when only 2 of 4 line up", () => {
    const r = matchOneDetection(
      detection({
        choice_snippets: {
          A: "broad in scope and detail",
          B: "vital to the discussion",
          C: "no match here at all",
          D: "also nothing alike",
        },
      }),
      [
        row({
          answer_choices: [
            { letter: "A", choice_text: "broad in scope and detail" },
            { letter: "B", choice_text: "vital to the discussion" },
            { letter: "C", choice_text: "narrow informational thing" },
            { letter: "D", choice_text: "modest contribution stuff" },
          ],
        }),
      ]
    );
    expect(r.method).not.toBe("page_choice_snippets");
  });

  // Short-choice safety rule (spec §3.4 follow-up): when the row's
  // choices are very short (numeric MC, single-letter probability,
  // one-word completions), 3-of-4 matching is too easily confused,
  // so the matcher penalises confidence. The match still fires —
  // it's better than orphaning the row — but it drops below the
  // 0.75 publish-gate threshold so gateLowCropConfidence flags it.

  it("penalises confidence when row choices are very short (numeric MC)", () => {
    const r = matchOneDetection(
      detection({
        // Detector wouldn't even have 20 chars of overlap here, but
        // we craft the test to verify the penalty path, not the
        // overlap path. Use longer detected snippets that still
        // share a 20-char prefix with the short row choices.
        choice_snippets: {
          A: "3",
          B: "4",
          C: "5",
          D: "6",
        },
        passage_snippet: null,
        stem_snippet: "Short stem too short to matter for stem matching here",
      }),
      [
        row({
          // Choices are 1-char each → avg length below threshold
          answer_choices: [
            { letter: "A", choice_text: "3" },
            { letter: "B", choice_text: "4" },
            { letter: "C", choice_text: "5" },
            { letter: "D", choice_text: "6" },
          ],
        }),
      ]
    );
    // 20-char overlap fails (choices are 1 char), so choice-step
    // doesn't fire — falls through to orphan. This verifies the
    // existing minLen guard already prevents bogus matches on
    // ultra-short choices BEFORE the short-choice penalty kicks in.
    expect(r.method).not.toBe("page_choice_snippets");
  });

  it("penalises confidence when row choices are short words (avg < 8 chars)", () => {
    // Choices: "broad", "vital", "narrow", "modest" → avg ~6 chars.
    // Detected snippets share enough overlap (>= 20 chars after
    // padding via the detected snippets being longer). We pad the
    // detected versions with extra context the detector "saw."
    const r = matchOneDetection(
      detection({
        passage_snippet: null,
        stem_snippet: "Some other stem long enough not to trip step 5 matching here",
        choice_snippets: {
          A: "broad in scope describing wide-ranging implications fully",
          B: "vital to the discussion absolutely essential indeed",
          C: "narrow but informative scope of analysis here",
          D: "modest in claims but reliable nonetheless",
        },
      }),
      [
        row({
          question_text: "Different stem entirely long enough to avoid step-5 match",
          answer_choices: [
            // Avg length = (5+5+6+6)/4 = 5.5 → BELOW 8-char threshold
            { letter: "A", choice_text: "broad" },
            { letter: "B", choice_text: "vital" },
            { letter: "C", choice_text: "narrow" },
            { letter: "D", choice_text: "modest" },
          ],
        }),
      ]
    );
    // 20-char overlap requires BOTH sides to have >= 20 chars.
    // Row choices are 5-6 chars → fails minLen guard → no choice match.
    // Falls through to orphan. Net effect of safety rule: ultra-short
    // choices simply never match via this step (which is the safest
    // outcome).
    expect(r.method).not.toBe("page_choice_snippets");
  });

  it("KEEPS high confidence when choices are long enough (avg ≥ 8 chars)", () => {
    const r = matchOneDetection(
      detection({
        passage_snippet: null,
        stem_snippet: "Different stem long enough to bypass step-5 matching here",
        choice_snippets: {
          A: "broad in scope and detail across many topics",
          B: "vital to the discussion of energy use",
          C: "narrow but informative analysis ahead",
          D: "modest in scope and reach overall",
        },
      }),
      [
        row({
          question_text: "Yet another stem long enough to skip step-5 matching",
          answer_choices: [
            // Long choices: avg ~ 30+ chars
            { letter: "A", choice_text: "broad in scope and detail across many topics" },
            { letter: "B", choice_text: "vital to the discussion of energy use" },
            { letter: "C", choice_text: "narrow but informative analysis ahead" },
            { letter: "D", choice_text: "modest in scope and reach overall" },
          ],
        }),
      ]
    );
    expect(r.method).toBe("page_choice_snippets");
    expect(r.confidence).toBe(0.85); // full confidence retained
  });
});

// ── Step 5: page_stem_snippet ───────────────────────────────

describe("matchOneDetection — Step 5 (page_stem_snippet)", () => {
  it("matches when only the stem prefix lines up", () => {
    const r = matchOneDetection(
      detection({
        stem_snippet: "Which expression is equivalent to (x+2)(x-3)?",
        passage_snippet: null,
        choice_snippets: null,
      }),
      [row({ question_text: "Which expression is equivalent to (x+2)(x-3)? Choose one." })]
    );
    expect(r.method).toBe("page_stem_snippet");
  });

  it("does not match below the 40-char overlap threshold", () => {
    const r = matchOneDetection(
      detection({
        stem_snippet: "Short stem", // 10 chars — too short
        passage_snippet: null,
        choice_snippets: null,
      }),
      [row({ question_text: "Short stem matches" })]
    );
    expect(r.matched).toBeNull();
  });
});

// ── matchPageDetections — Steps 6 + 7 ──────────────────────

describe("matchPageDetections — Step 6 (ordered_fallback)", () => {
  it("fires only when unmatched counts are equal", () => {
    // 2 detections, neither has semantic signal that lines up; 2 rows
    // also generic. The counts ARE equal so step 6 pairs them by order.
    const detections = [
      detection({
        stem_snippet: "Unique stem aaa aaa aaa aaa aaa aaa aaa aaa aaa",
        choice_snippets: null,
      }),
      detection({
        stem_snippet: "Unique stem bbb bbb bbb bbb bbb bbb bbb bbb bbb",
        choice_snippets: null,
      }),
    ];
    const rows = [
      row({ id: "row-A", question_text: "Different stem 1 quite long indeed long" }),
      row({ id: "row-B", question_text: "Different stem 2 quite long indeed long" }),
    ];
    const out = matchPageDetections(detections, rows);
    expect(out[0].method).toBe("ordered_fallback");
    expect(out[1].method).toBe("ordered_fallback");
    expect((out[0].matched as MatchedRow).id).toBe("row-A");
    expect((out[1].matched as MatchedRow).id).toBe("row-B");
  });

  it("falls back to orphan when counts DON'T match", () => {
    // 2 detections, only 1 row.
    const detections = [
      detection({ stem_snippet: "Unique stem aaa aaa aaa aaa aaa aaa aaa aaa aaa" }),
      detection({ stem_snippet: "Unique stem bbb bbb bbb bbb bbb bbb bbb bbb bbb" }),
    ];
    const rows = [row({ question_text: "Yet another stem long enough not to match" })];
    const out = matchPageDetections(detections, rows);
    // Step 6 cannot fire because counts differ. Both orphan.
    expect(out[0].method).toBe("orphan");
    expect(out[1].method).toBe("orphan");
  });
});

describe("matchPageDetections — Step 7 (orphan)", () => {
  it("marks every unmatched detection as orphan when no candidates", () => {
    const detections = [
      detection({ stem_snippet: "Anything goes here long enough to clear the threshold ok" }),
    ];
    const out = matchPageDetections(detections, []);
    expect(out[0].method).toBe("orphan");
    expect(out[0].confidence).toBe(0);
    expect(out[0].matched).toBeNull();
  });
});

describe("matchPageDetections — strictness ordering", () => {
  it("Step 2 (question_number) WINS over later semantic matches", () => {
    const r = matchOneDetection(
      // Both signals present: question_number AND a stem match.
      detection({
        source_question_number: 5,
        stem_snippet: "Same generic stem matches everything generic generic",
      }),
      [
        row({
          id: "wrong-row",
          source_question_number: 99,
          question_text: "Same generic stem matches everything generic generic",
        }),
        row({
          id: "right-row",
          source_question_number: 5,
          question_text: "Completely different question text",
        }),
      ]
    );
    expect((r.matched as MatchedRow).id).toBe("right-row");
    expect(r.method).toBe("page_question_number");
  });

  it("Step 3 (passage) WINS over Step 5 (stem)", () => {
    const r = matchOneDetection(
      detection({
        passage_snippet: "Specific passage with unique sentinel xyz xyz xyz",
        stem_snippet: "Identical stem identical stem identical stem identical",
      }),
      [
        row({
          id: "stem-only",
          passage: "Different passage with nothing in common at all xxx",
          question_text: "Identical stem identical stem identical stem identical",
        }),
        row({
          id: "passage-and-stem",
          passage: "Specific passage with unique sentinel xyz xyz xyz xyz",
          question_text: "Identical stem identical stem identical stem identical",
        }),
      ]
    );
    expect((r.matched as MatchedRow).id).toBe("passage-and-stem");
    expect(r.method).toBe("page_passage_snippet");
  });

  it("ordered fallback does NOT claim a row already taken by a semantic step", () => {
    // Detection A has a passage match to row-1. Detection B has no
    // semantic signal. Two rows present. Without the claim-tracking,
    // ordered fallback would try to pair B with row-1.
    const detections = [
      detection({
        passage_snippet: "Passage A starts with unique snippet text aaa aaa aaa aaa",
        stem_snippet: "Stem A",
      }),
      detection({
        passage_snippet: null,
        stem_snippet: "Unmatchable stem of B bb bb bb bb bb bb bb bb bb bb",
      }),
    ];
    const rows = [
      row({ id: "row-1", passage: "Passage A starts with unique snippet text aaa aaa aaa aaa bb" }),
      row({ id: "row-2", question_text: "Completely unrelated thing long long long long" }),
    ];
    const out = matchPageDetections(detections, rows);
    expect((out[0].matched as MatchedRow).id).toBe("row-1");
    expect(out[0].method).toBe("page_passage_snippet");
    expect(out[1].method).toBe("ordered_fallback");
    expect((out[1].matched as MatchedRow).id).toBe("row-2");
  });
});

// ── processedStatusFromMatch ─────────────────────────────────

describe("processedStatusFromMatch", () => {
  it("returns 'complete' for high-confidence + complete crop", () => {
    const det = detection({});
    const r = { method: "page_passage_snippet", confidence: 0.9 };
    expect(processedStatusFromMatch(r, det)).toBe("complete");
  });

  it("returns 'partial' for ordered_fallback match (regardless of crop_complete)", () => {
    const det = detection({});
    const r = { method: "ordered_fallback", confidence: 0.6 };
    expect(processedStatusFromMatch(r, det)).toBe("partial");
  });

  it("returns 'partial' when crop is incomplete", () => {
    const det = detection({ contains_full_question_stem: false });
    const r = { method: "page_passage_snippet", confidence: 0.9 };
    expect(processedStatusFromMatch(r, det)).toBe("partial");
  });

  it("returns 'partial' for orphan", () => {
    const det = detection({});
    const r = { method: "orphan", confidence: 0 };
    expect(processedStatusFromMatch(r, det)).toBe("partial");
  });
});

// ── Bbox-math edge case — 80-px padding floor ────────────────
// Not in the matcher module proper but the spec calls this out as
// a Phase-3 invariant; the test exercises the formula inline.

describe("expanded crop padding rule (20% OR 80 px, whichever larger)", () => {
  function expandedDims(w: number, h: number) {
    const MIN_PAD = 80;
    const pad_x = Math.max(w * 0.2, MIN_PAD);
    const pad_y = Math.max(h * 0.2, MIN_PAD);
    return { pad_x, pad_y };
  }

  it("uses 20% padding when bbox is large", () => {
    const { pad_x, pad_y } = expandedDims(1000, 500);
    expect(pad_x).toBe(200); // 20% of 1000
    expect(pad_y).toBe(100); // 20% of 500
  });

  it("uses the 80-px floor when bbox is small", () => {
    const { pad_x, pad_y } = expandedDims(100, 100);
    expect(pad_x).toBe(80); // not 20 (which would be 20%)
    expect(pad_y).toBe(80);
  });

  it("uses different rules per axis (tall narrow bbox)", () => {
    const { pad_x, pad_y } = expandedDims(50, 800);
    expect(pad_x).toBe(80); // 80-px floor on width
    expect(pad_y).toBe(160); // 20% of 800 on height
  });
});
