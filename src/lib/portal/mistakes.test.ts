import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import { sampleOf } from "./mistakes";

/** A frozen question as a session keeps it, with only what the Mistake Log reads. */
function snap(student: Record<string, unknown>, choices: Record<string, unknown>[] = []) {
  return {
    student: {
      id: "q1",
      subject: "math",
      question_text: "What is x?",
      image_url: null,
      image_alt: null,
      figure_kind: null,
      figure_table_data: null,
      figure_chart_data: null,
      figure_geometry_data: null,
      figure_svg: null,
      figure_spec: null,
      answer_choices: choices,
      ...student,
    },
    answer: { correctAnswer: "B" },
    review: { explanation_text: "Because." },
  } as unknown as CatalogDeliverySnapshot;
}
const words = ["A", "B", "C", "D"].map((letter) => ({
  letter,
  choice_text: `choice ${letter}`,
  choice_table_data: null,
  choice_figure_spec: null,
}));
const scatter = { type: "scatter", version: "figure-spec/1", frame: {}, parts: [] };

describe("sampleOf: the figure a missed question carries into the Mistake Log", () => {
  it("carries a question's figure, with its choices in letter order", () => {
    const sample = sampleOf(snap({ figure_spec: scatter }, [...words].reverse()), "A");
    expect(sample.figure?.figure_spec).toEqual(scatter);
    expect(sample.figure?.answer_choices.map((c) => c.letter)).toEqual(["A", "B", "C", "D"]);
    expect(sample.answer).toBe(1);
  });

  it("carries table and figure choices when the question itself has no figure", () => {
    const tables = words.map((c) => ({ ...c, choice_table_data: { rows: [["1", "2"]] } }));
    expect(sampleOf(snap({}, tables), "A").figure?.answer_choices[0].choice_table_data).toEqual({
      rows: [["1", "2"]],
    });
  });

  it("carries an older figure (a table) and a typed answer's figure", () => {
    const table = { rows: [["x", "y"]] };
    const sample = sampleOf(snap({ figure_kind: "table", figure_table_data: table }), "12");
    expect(sample.typed).toEqual({ given: "12", correct: "B" });
    expect(sample.figure?.figure_table_data).toEqual(table);
  });

  it("carries nothing for a question with no figure to draw", () => {
    expect(sampleOf(snap({}, words), "A").figure).toBeUndefined();
    // a kind with nothing behind it draws nothing, as in the quiz
    expect(sampleOf(snap({ figure_kind: "image" }, words), "A").figure).toBeUndefined();
  });
});
