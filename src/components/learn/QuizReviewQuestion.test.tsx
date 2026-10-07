// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { toQuizReviewContent } from "@/lib/quiz-review-content";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import QuizReviewQuestion from "./QuizReviewQuestion";

const base = {
  question_text: "Solve $x+1=3$.",
  subject: "math",
  answer_format: "multiple_choice",
  answer_choices: [{ id: "a", letter: "A", choice_text: "$2$", choice_table_data: null }],
  correct_answer: "A",
  explanation_text: "Subtract $1$.",
  explanation_per_choice: { A: "Correct." },
  desmos_strategy: "Graph $y=x+1$.",
  image_url: null,
  import_flag_reason: "internal-review-only",
  source_asset_id: "internal-source-id",
} as unknown as QuizQuestionWithChoices;
afterEach(cleanup);
describe("completed quiz question rendering", () => {
  it.each(["math", "reading"] as const)(
    "limits serialized choice formatting to math reviews: %s",
    (subject) => {
      const q = {
        ...base,
        subject,
        answer_choices: [{ ...base.answer_choices[0], choice_text: "f(x) = −3^x + 1" }],
      };
      const { container } = render(<QuizReviewQuestion question={toQuizReviewContent(q)} />);
      const annotations = Array.from(
        container.querySelectorAll(".source-function-math annotation"),
        (e) => e.textContent
      );
      expect(annotations).toEqual(subject === "math" ? ["f(x) = -3^{x} + 1"] : []);
      if (subject === "reading") expect(container.textContent).toContain("f(x) = −3^x + 1");
    }
  );
  it("renders crisp math and reviewed explanations while omitting internal metadata", () => {
    const content = toQuizReviewContent(base);
    expect(JSON.stringify(content)).not.toContain("internal-");
    const { container } = render(<QuizReviewQuestion question={content} />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(screen.getByText("Current correct answer")).toBeTruthy();
    expect(screen.getByText("Choice A explanation")).toBeTruthy();
    expect(screen.getByText("Desmos strategy")).toBeTruthy();
  });
  it("keeps question and answer-choice tables as accessible native tables", () => {
    const table = {
      kind: "table" as const,
      header_row: ["x", "y"],
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
      caption: "Given data",
    };
    const q = {
      ...base,
      figure_kind: "table" as const,
      figure_table_data: table,
      answer_choices: [{ ...base.answer_choices[0], choice_table_data: table }],
    };
    render(<QuizReviewQuestion question={toQuizReviewContent(q)} />);
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(
      screen.getByRole("figure", { name: "Choice A data table" }).querySelector("table")
    ).not.toBeNull();
  });
  it("renders usable native geometry and keeps image fallback for ambiguous geometry", () => {
    const q = {
      ...base,
      figure_kind: "geometric" as const,
      figure_geometry_data: {
        kind: "geometric" as const,
        shapes: [
          {
            kind: "triangle" as const,
            vertices_or_points: [
              { label: "R", x: 255, y: 170 },
              { label: "S", x: 425, y: 80 },
              { label: "T", x: 425, y: 170 },
            ],
          },
        ],
      },
      image_url: "/fallback.png",
      image_alt: "Triangle RST",
    };
    const { container, unmount } = render(<QuizReviewQuestion question={toQuizReviewContent(q)} />);
    expect(container.querySelector("svg[role=img]")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    unmount();
    render(
      <QuizReviewQuestion
        question={toQuizReviewContent({
          ...q,
          figure_geometry_data: { ...q.figure_geometry_data, shapes: [] },
        })}
      />
    );
    expect(screen.getByRole("img", { name: "Triangle RST" }).getAttribute("src")).toBe(
      "/fallback.png"
    );
  });
  it("does not offer a math calculator strategy on a Reading review", () => {
    render(<QuizReviewQuestion question={toQuizReviewContent({ ...base, subject: "reading" })} />);
    expect(screen.queryByText("Desmos strategy")).toBeNull();
  });
});
