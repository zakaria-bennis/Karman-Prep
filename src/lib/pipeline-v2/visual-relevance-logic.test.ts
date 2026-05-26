import { describe, expect, it } from "vitest";
import {
  classifyVisualAsset,
  groupByVisualSignature,
  hammingDistance,
  isLikelySidebarArtifact,
  questionReferencesVisual,
} from "../../../scripts/lib/visual-relevance-logic.mjs";

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    asset_type: "figure_crop",
    relevance: "required",
    use_in_solving: true,
    repeated_across_pages: false,
    bbox: null,
    ...overrides,
  };
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    question_text: "What is the value of x?",
    passage: null,
    passage_a: null,
    passage_b: null,
    passage_intro: null,
    image_url: "https://r2.example/figure.png",
    image_alt: null,
    ...overrides,
  };
}

describe("questionReferencesVisual — true positives (real visual references)", () => {
  it("matches 'based on the graph'", () => {
    expect(
      questionReferencesVisual(question({ question_text: "Based on the graph, what is x?" }))
    ).toBe(true);
  });

  it("matches 'the table shows'", () => {
    expect(
      questionReferencesVisual(question({ question_text: "The table shows values of f(x)." }))
    ).toBe(true);
  });

  it("matches 'the figure above'", () => {
    expect(
      questionReferencesVisual(
        question({ question_text: "Which point in the figure above represents the maximum?" })
      )
    ).toBe(true);
  });

  it("matches 'shown above/below/in'", () => {
    expect(
      questionReferencesVisual(question({ question_text: "Use the values shown above." }))
    ).toBe(true);
    expect(
      questionReferencesVisual(question({ question_text: "Which value is shown below?" }))
    ).toBe(true);
  });

  it("matches 'according to the chart'", () => {
    expect(
      questionReferencesVisual(question({ question_text: "According to the chart, the mean is…" }))
    ).toBe(true);
  });

  it("matches standalone visualization words", () => {
    for (const stem of [
      "The scatterplot shows…",
      "Estimate the median from the histogram.",
      "The box plot of test scores…",
      "Plot the values on the number line.",
    ]) {
      expect(questionReferencesVisual(question({ question_text: stem }))).toBe(true);
    }
  });

  it("matches 'Fig. N' style", () => {
    expect(
      questionReferencesVisual(
        question({ question_text: "See Fig. 3 for the experimental setup." })
      )
    ).toBe(true);
  });
});

describe("questionReferencesVisual — TIGHTENED false-negative protection", () => {
  // These were the false-positive traps in the original loose patterns.
  // The tightened regex should NOT match them — they reference 'table'
  // / 'graph' / 'figure' metaphorically or in non-visual ways.

  it("does NOT match 'the table seats 8 students' (word problem)", () => {
    expect(
      questionReferencesVisual(
        question({ question_text: "The table seats 8 students. How many can fit at 5 tables?" })
      )
    ).toBe(false);
  });

  it("does NOT match 'the graph of f(x) = 2x + 3' (algebraic notation, no image required)", () => {
    expect(
      questionReferencesVisual(
        question({ question_text: "If the graph of f(x) = 2x + 3 passes through point (1, 5)…" })
      )
    ).toBe(false);
  });

  it("does NOT match 'figure of speech' (R&W metaphor)", () => {
    expect(
      questionReferencesVisual(
        question({ question_text: "Which choice best describes the figure of speech used?" })
      )
    ).toBe(false);
  });

  it("does NOT match 'a diagram' as a bare noun", () => {
    // No "the X above/below/shown" cue → not a visual reference.
    expect(
      questionReferencesVisual(
        question({ question_text: "Drawing a diagram is a useful strategy." })
      )
    ).toBe(false);
  });

  it("does NOT match an algebra-only question without visual cues", () => {
    expect(
      questionReferencesVisual(
        question({ question_text: "What is the value of x in 2x + 3 = 11?" })
      )
    ).toBe(false);
  });
});

describe("isLikelySidebarArtifact", () => {
  it("detects a tall left-rail bbox", () => {
    expect(
      isLikelySidebarArtifact(
        asset({
          bbox: { x_min: 20, y_min: 100, x_max: 300, y_max: 850 },
        })
      )
    ).toBe(true);
  });

  it("does not label a central graph bbox as sidebar", () => {
    expect(
      isLikelySidebarArtifact(
        asset({
          bbox: { x_min: 300, y_min: 250, x_max: 820, y_max: 650 },
        })
      )
    ).toBe(false);
  });
});

describe("visual signature grouping", () => {
  it("computes hamming distance over hex signatures", () => {
    expect(hammingDistance("ffff", "fffe")).toBe(1);
  });

  it("groups near-identical visual signatures", () => {
    const groups = groupByVisualSignature([
      { id: "a", visual_signature: "ffff" },
      { id: "b", visual_signature: "fffe" },
      { id: "c", visual_signature: "0000" },
    ]);
    expect(groups.map((g) => g.assets.map((a) => a.id))).toEqual([["a", "b"], ["c"]]);
  });
});

describe("classifyVisualAsset", () => {
  it("marks repeated unreferenced left-sidebar visuals irrelevant", () => {
    const r = classifyVisualAsset({
      asset: asset({ bbox: { x_min: 20, y_min: 100, x_max: 300, y_max: 850 } }),
      question: question({ question_text: "What is the value of x?", image_alt: null }),
      repeatCount: 4,
    });

    expect(r).toMatchObject({
      visual_class: "calculator_artifact",
      relevance: "irrelevant",
      use_in_solving: false,
      repeated_across_pages: true,
    });
  });

  it("routes repeated visuals to review when the stem references a visual", () => {
    const r = classifyVisualAsset({
      asset: asset({ bbox: { x_min: 20, y_min: 100, x_max: 300, y_max: 850 } }),
      question: question({ question_text: "Based on the graph, what is x?" }),
      repeatCount: 4,
    });

    expect(r).toMatchObject({
      visual_class: "uncertain_visual",
      relevance: "uncertain",
      use_in_solving: false,
      repeated_across_pages: true,
    });
  });

  it("keeps ordinary attached figure crops required", () => {
    const r = classifyVisualAsset({
      asset: asset({ bbox: { x_min: 300, y_min: 250, x_max: 820, y_max: 650 } }),
      question: question({ question_text: "What is the value of x?" }),
      repeatCount: 1,
    });

    expect(r).toMatchObject({
      visual_class: "problem_required_visual",
      relevance: "required",
      use_in_solving: true,
      repeated_across_pages: false,
    });
  });

  it("keeps explicit calculator artifacts out of solving", () => {
    const r = classifyVisualAsset({
      asset: asset({ asset_type: "calculator_artifact" }),
      question: question({ question_text: "Based on the graph, what is x?" }),
      repeatCount: 1,
    });

    expect(r).toMatchObject({
      visual_class: "calculator_artifact",
      relevance: "irrelevant",
      use_in_solving: false,
    });
  });
});
