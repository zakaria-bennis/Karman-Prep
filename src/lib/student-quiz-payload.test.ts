// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import FigureFrame from "@/components/learn/FigureFrame";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import { studentFigureSvg, toStudentQuizQuestion } from "./student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" data-figure-theme="karman-v1" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="#070605"/></svg>';
const question = (over: Partial<QuizQuestionWithChoices> = {}) =>
  ({
    id: "q1",
    node_id: null,
    question_text: "Which made-up side is longest?",
    answer_format: "multiple_choice",
    subject: "math",
    domain: "geometry_trig",
    correct_answer: "A",
    image_url: null,
    image_alt: "A made-up square.",
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    answer_choices: [],
    ...over,
  }) as unknown as QuizQuestionWithChoices;

describe("hand-drawn SVG figures in the student payload", () => {
  it("sends figure_svg only for an image figure without a raster image_url", () => {
    expect(
      toStudentQuizQuestion(question({ figure_kind: "image", figure_svg: SVG })).figure_svg
    ).toBe(SVG);
    for (const over of [
      { figure_svg: SVG },
      { figure_kind: "image" as const, figure_svg: SVG, image_url: "https://x.test/a.png" },
      { figure_kind: "geometric" as const, figure_svg: SVG },
    ])
      expect("figure_svg" in toStudentQuizQuestion(question(over))).toBe(false);
  });

  it("seals the SVG bytes and leaves every other question's seal unchanged", () => {
    const plain = catalogQuestionPayloadHash(question());
    expect(catalogQuestionPayloadHash(question({ figure_svg: SVG }))).toBe(plain);
    const svg = catalogQuestionPayloadHash(question({ figure_kind: "image", figure_svg: SVG }));
    expect(svg).not.toBe(plain);
    expect(
      catalogQuestionPayloadHash(
        question({ figure_kind: "image", figure_svg: SVG.replace('x="1"', 'x="2"') })
      )
    ).not.toBe(svg);
  });

  it("is inlined by FigureFrame through the quiz sanitizer", async () => {
    const q = question({ figure_kind: "image", figure_svg: SVG });
    const { container } = render(
      createElement(FigureFrame, { svg: studentFigureSvg(q), alt: q.image_alt ?? "" })
    );
    await waitFor(() => expect(container.querySelector("svg rect")).not.toBeNull());
    expect(container.querySelector("svg")).toHaveAttribute("aria-label", "A made-up square.");
    expect(container.querySelector("svg rect")).toHaveAttribute(
      "fill",
      "var(--figure-background, #070605)"
    );
  });
});
