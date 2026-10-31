// @vitest-environment jsdom
//
// Found in the final branch review: CatalogQuestion re-ran drawnFigure (which
// validates figure_spec) and QuizReviewQuestion re-ran withSpecTables and
// hasFigureChoices (which validate every choice_figure_spec) on every render.
// Both now parse once per question.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import QuizReviewQuestion from "@/components/learn/QuizReviewQuestion";
import { FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";
import { toQuizReviewContent } from "@/lib/quiz-review-content";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";

const calls = vi.hoisted(() => ({ drawn: 0, tables: 0, figures: 0 }));
vi.mock("@/lib/figures/question-figure", async (original) => {
  const real = await original<typeof import("@/lib/figures/question-figure")>();
  return {
    ...real,
    drawnFigure: (...a: Parameters<typeof real.drawnFigure>) => {
      calls.drawn++;
      return real.drawnFigure(...a);
    },
  };
});
vi.mock("@/lib/figures/engine/choices", async (original) => {
  const real = await original<typeof import("@/lib/figures/engine/choices")>();
  return {
    ...real,
    withSpecTables: ((choices) => {
      calls.tables++;
      return real.withSpecTables(choices);
    }) as typeof real.withSpecTables,
    hasFigureChoices: (choices: Parameters<typeof real.hasFigureChoices>[0]) => {
      calls.figures++;
      return real.hasFigureChoices(choices);
    },
  };
});

const PLANE: FigureSpec = {
  version: FIGURE_SPEC_VERSION,
  type: "plane",
  parts: [{ kind: "point", id: "A", x: 1, y: 2 }],
  labels: [],
  marks: [],
  frame: { x: [-5, 5], y: [-5, 5], step: 1 },
};

const question = {
  id: "q1",
  node_id: null,
  question_text: "Which point is drawn?",
  answer_format: "multiple_choice",
  subject: "math",
  domain: "geometry_trig",
  correct_answer: "A",
  image_url: null,
  image_alt: null,
  figure_kind: null,
  figure_table_data: null,
  figure_chart_data: null,
  figure_geometry_data: null,
  figure_spec: PLANE,
  answer_choices: [
    {
      id: "c1",
      question_id: "q1",
      letter: "A",
      choice_text: "(1, 2)",
      choice_table_data: null,
      is_correct: true,
    },
  ],
} as unknown as QuizQuestionWithChoices;

describe("figure parsing is memoized on the question", () => {
  it("CatalogQuestion picks its figure once across re-renders", () => {
    const q = toStudentQuizQuestion(question);
    const onAnswer = vi.fn();
    const { rerender } = render(
      <CatalogQuestion question={q} answer="" disabled={false} onAnswer={onAnswer} />
    );
    const after = calls.drawn;
    expect(after).toBeGreaterThan(0);
    rerender(<CatalogQuestion question={q} answer="A" disabled={false} onAnswer={onAnswer} />);
    rerender(<CatalogQuestion question={q} answer="" disabled onAnswer={onAnswer} />);
    expect(calls.drawn).toBe(after);
  });

  it("QuizReviewQuestion reads its choices and figure once across re-renders", () => {
    const q = toQuizReviewContent(question);
    const { rerender } = render(<QuizReviewQuestion question={q} />);
    const before = { ...calls };
    rerender(<QuizReviewQuestion question={q} />);
    rerender(<QuizReviewQuestion question={q} />);
    expect(calls).toEqual(before);
  });
});
