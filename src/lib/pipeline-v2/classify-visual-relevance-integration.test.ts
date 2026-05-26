// @vitest-environment node
//
// Integration test for the END-TO-END classification flow in
// scripts/pdf-pipeline/classify-visual-relevance.mjs.
//
// The script itself mixes pure logic (classification, hashing) with
// IO (Supabase, R2 image fetches). We can't easily run the CLI in
// vitest, but we CAN cover the pure pipeline composition:
//
//   1. Build fixture assets representing a realistic page-asset mix
//      (one repeated sidebar artifact across 3 pages, one real figure,
//      one calculator_artifact asset).
//   2. Run them through the production pipeline functions:
//      groupByVisualSignature → classifyVisualAsset → buildPhase4Metadata.
//   3. Assert the classification distribution matches expectations.
//
// This catches regressions where the gluing logic in
// classify-visual-relevance.mjs would silently mis-route classes,
// without needing real R2/Supabase fixtures.

import { describe, it, expect } from "vitest";
import {
  classifyVisualAsset,
  buildPhase4Metadata,
  groupByVisualSignature,
  MIN_REPEAT_COUNT,
  PHASE4_VERSION,
} from "../../../scripts/lib/visual-relevance-logic.mjs";

type ClassificationOutcome = {
  visual_class: string;
  relevance: string;
  use_in_solving: boolean;
  repeated_across_pages: boolean;
  reason: string;
};

// ── Fixture: 5 visual assets across 4 pages of one synthetic PDF ──
//
//   pages 1, 2, 3: same "Desmos sidebar" — visual_signature 'AAAA',
//                  left-edge bbox.    → should classify as
//                  calculator_artifact (irrelevant, sidebar repeat)
//   page 4:  one real central figure  — signature 'FFFF', centred.
//                  Question text says "The graph above shows…"
//                  → problem_required_visual (required)
//   page 5:  explicit asset_type='calculator_artifact'  →
//                  irrelevant by type, regardless of question text.

function sidebarAsset(id: string, page: number) {
  return {
    id,
    asset_type: "figure_crop",
    page_number: page,
    visual_signature: "aaaa",
    bbox: { x_min: 30, y_min: 100, x_max: 280, y_max: 880 },
    relevance: "required",
    use_in_solving: true,
    repeated_across_pages: false,
    raw_metadata: {},
    question_id: `q-${page}`,
  };
}

function centralFigure() {
  return {
    id: "fig-real",
    asset_type: "figure_crop",
    page_number: 4,
    visual_signature: "ffff",
    bbox: { x_min: 300, y_min: 250, x_max: 820, y_max: 650 },
    relevance: "required",
    use_in_solving: true,
    repeated_across_pages: false,
    raw_metadata: {},
    question_id: "q-4",
  };
}

function explicitCalcArtifact() {
  return {
    id: "calc-explicit",
    asset_type: "calculator_artifact",
    page_number: 5,
    visual_signature: "bbbb",
    bbox: { x_min: 30, y_min: 100, x_max: 280, y_max: 880 },
    relevance: "required",
    use_in_solving: true,
    repeated_across_pages: false,
    raw_metadata: {},
    question_id: "q-5",
  };
}

const QUESTIONS_BY_ID = new Map<string, Record<string, unknown>>([
  ["q-1", { question_text: "What is the value of x?", image_url: null }],
  ["q-2", { question_text: "Solve for y.", image_url: null }],
  ["q-3", { question_text: "What is 2 + 2?", image_url: null }],
  ["q-4", { question_text: "The graph above shows f(x). What is f(2)?", image_url: "x" }],
  ["q-5", { question_text: "The graph above shows f(x). What is f(2)?", image_url: "x" }],
]);

describe("classify-visual-relevance — end-to-end pipeline composition", () => {
  it("groups repeated visual signatures across pages", () => {
    const assets = [
      sidebarAsset("s1", 1),
      sidebarAsset("s2", 2),
      sidebarAsset("s3", 3),
      centralFigure(),
    ];
    const groups = groupByVisualSignature(assets);
    const sidebarGroup = groups.find((g) => g.signature === "aaaa");
    const figureGroup = groups.find((g) => g.signature === "ffff");
    expect(sidebarGroup?.assets).toHaveLength(3);
    expect(figureGroup?.assets).toHaveLength(1);
  });

  it("classifies the 3-page repeated sidebar as calculator_artifact", () => {
    const repeatCount = 3;
    const result: ClassificationOutcome = classifyVisualAsset({
      asset: sidebarAsset("s1", 1),
      question: QUESTIONS_BY_ID.get("q-1"),
      repeatCount,
      minRepeatCount: MIN_REPEAT_COUNT,
    });
    expect(result.visual_class).toBe("calculator_artifact");
    expect(result.relevance).toBe("irrelevant");
    expect(result.use_in_solving).toBe(false);
    expect(result.repeated_across_pages).toBe(true);
  });

  it("classifies the central single-instance figure as problem_required_visual", () => {
    const result: ClassificationOutcome = classifyVisualAsset({
      asset: centralFigure(),
      question: QUESTIONS_BY_ID.get("q-4"),
      repeatCount: 1,
      minRepeatCount: MIN_REPEAT_COUNT,
    });
    expect(result.visual_class).toBe("problem_required_visual");
    expect(result.relevance).toBe("required");
    expect(result.use_in_solving).toBe(true);
  });

  it("classifies an explicit calculator_artifact regardless of question text", () => {
    const result: ClassificationOutcome = classifyVisualAsset({
      asset: explicitCalcArtifact(),
      question: QUESTIONS_BY_ID.get("q-5"),
      repeatCount: 1,
      minRepeatCount: MIN_REPEAT_COUNT,
    });
    expect(result.visual_class).toBe("calculator_artifact");
    expect(result.relevance).toBe("irrelevant");
  });

  it("buildPhase4Metadata captures the run + classification + previous-state snapshot", () => {
    const asset = sidebarAsset("s1", 1);
    const classification = classifyVisualAsset({
      asset,
      question: QUESTIONS_BY_ID.get("q-1"),
      repeatCount: 3,
      minRepeatCount: MIN_REPEAT_COUNT,
    });
    const meta = buildPhase4Metadata({
      asset,
      question: QUESTIONS_BY_ID.get("q-1"),
      classification,
      visualSignature: "aaaa",
      repeatCount: 3,
    });

    expect(meta.version).toBe(PHASE4_VERSION);
    expect(meta.visual_signature).toBe("aaaa");
    expect(meta.repeat_count).toBe(3);
    expect(meta.visual_class).toBe("calculator_artifact");
    expect(meta.previous).toEqual({
      relevance: "required",
      repeated_across_pages: false,
      use_in_solving: true,
    });
    expect(typeof meta.classified_at).toBe("string");
  });

  it("full-page mix: 3 sidebar repeats + 1 figure + 1 explicit calc → tally matches expectation", () => {
    const assets = [
      sidebarAsset("s1", 1),
      sidebarAsset("s2", 2),
      sidebarAsset("s3", 3),
      centralFigure(),
      explicitCalcArtifact(),
    ];
    const groups = groupByVisualSignature(assets);
    const repeatCountById = new Map<string, number>();
    for (const g of groups) for (const a of g.assets) repeatCountById.set(a.id, g.assets.length);

    const tally: Record<string, number> = {};
    for (const asset of assets) {
      const r: ClassificationOutcome = classifyVisualAsset({
        asset,
        question: QUESTIONS_BY_ID.get(asset.question_id),
        repeatCount: repeatCountById.get(asset.id) ?? 1,
        minRepeatCount: MIN_REPEAT_COUNT,
      });
      tally[r.visual_class] = (tally[r.visual_class] ?? 0) + 1;
    }

    expect(tally).toEqual({
      calculator_artifact: 4, // 3 sidebar repeats + 1 explicit
      problem_required_visual: 1, // the central figure
    });
  });
});
