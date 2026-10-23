// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestion } from "../../../../tests/fixtures/approved-catalog";
import CatalogQuestion from "./CatalogQuestion";
const base = toStudentQuizQuestion(catalogQuestion() as unknown as QuizQuestionWithChoices);
describe("canonical immutable question rendering", () => {
  it("renders explicit fractions crisply and does not show key or explanations", () => {
    const q = { ...base, question_text: "Solve $x=\\frac{3}{4}$." };
    const { container } = render(
      <CatalogQuestion question={q} answer="" disabled={false} onAnswer={vi.fn()} />
    );
    expect(container.querySelector(".katex .mfrac")).not.toBeNull();
    expect(screen.queryByText("Subtract 2.")).toBeNull();
    expect(screen.queryByText(/Correct answer/)).toBeNull();
  });
  it("uses native radio choices beside native tables without table-in-label/button nesting", () => {
    const table = { header_row: ["x", "y"], rows: [["1", "2"]] };
    const q = {
      ...base,
      figure_kind: "table" as const,
      figure_table_data: table,
      answer_choices: [{ ...base.answer_choices[0], choice_table_data: table }],
    };
    const onAnswer = vi.fn();
    render(<CatalogQuestion question={q} answer="" disabled={false} onAnswer={onAnswer} />);
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getAllByRole("table").every((element) => !element.closest("label,button"))).toBe(
      true
    );
    fireEvent.click(screen.getByRole("radio", { name: "Choice A" }));
    expect(onAnswer).toHaveBeenCalledWith("A");
  });
  it("keeps a submitted/pending table choice disabled without inventing wrong-answer feedback", () => {
    const table = { rows: [["1", "2"]] };
    const q = {
      ...base,
      answer_choices: [{ ...base.answer_choices[0], choice_table_data: table }],
    };
    render(<CatalogQuestion question={q} answer="A" disabled onAnswer={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Choice A" })).toBeDisabled();
    expect(screen.queryByText(/incorrect/)).toBeNull();
  });
  it("preserves paired passages and source italics", () => {
    const q = {
      ...base,
      subject: "reading" as const,
      passage_a: "First <i>source title</i>.",
      passage_b: "Second source text.",
    };
    const { container } = render(
      <CatalogQuestion question={q} answer="" disabled={false} onAnswer={vi.fn()} />
    );
    expect(screen.getByText("Text 1")).toBeTruthy();
    expect(screen.getByText("Text 2")).toBeTruthy();
    expect(container.querySelector("i")?.textContent).toBe("source title");
  });
  it("preserves bound semantic passage structure and supports numeric entry", () => {
    const q = {
      ...base,
      subject: "reading" as const,
      answer_format: "numeric_entry" as const,
      passage: "original flattened source bytes",
      reviewed_passage: { intro: "Introduction", excerpt: "Exact excerpt", copyright: "Copyright" },
    };
    const onAnswer = vi.fn();
    const { container } = render(
      <CatalogQuestion question={q} answer="1/2" disabled={false} onAnswer={onAnswer} />
    );
    expect(container.querySelector('[data-passage-part="excerpt"]')?.textContent).toBe(
      "Exact excerpt"
    );
    expect(container.querySelector('[data-passage-part="copyright"]')).not.toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), {
      target: { value: "0.5" },
    });
    expect(onAnswer).toHaveBeenCalledWith("0.5");
    expect(screen.queryByRole("radio")).toBeNull();
  });
});

it("shows a Reading and Writing figure before the source passage, prompt and answer choices", () => {
  const q = {
    ...base,
    subject: "reading" as const,
    passage: "Original passage with 2/11 and 17 samples.",
    question_text: "Which choice most logically completes the text?",
    figure_kind: "table" as const,
    figure_table_data: { rows: [["2025", "17"]] },
  };
  const original = JSON.stringify(q);
  render(<CatalogQuestion question={q} answer="" disabled={false} onAnswer={vi.fn()} />);
  const passage = screen.getByText(q.passage);
  const table = screen.getByRole("table");
  const prompt = screen.getByText(q.question_text);
  expect(table.compareDocumentPosition(passage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(passage.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(
    prompt.compareDocumentPosition(screen.getAllByRole("radio")[0]) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(JSON.stringify(q)).toBe(original);
});

it("lays out a figure kind with nothing to draw exactly like a question without a figure", () => {
  const empty = {
    ...base,
    passage: null,
    passage_intro: null,
    passage_a: null,
    passage_b: null,
    image_url: null,
    figure_svg: null,
  };
  const plain = render(
    <CatalogQuestion
      question={{ ...empty, figure_kind: null }}
      answer=""
      disabled={false}
      onAnswer={vi.fn()}
    />
  ).container.innerHTML;
  const { container } = render(
    <CatalogQuestion
      question={{ ...empty, figure_kind: "image" as const }}
      answer=""
      disabled={false}
      onAnswer={vi.fn()}
    />
  );
  expect(container.innerHTML).toBe(plain);
  expect(container.querySelector("[data-question-layout]")?.className).not.toMatch(/grid-cols-2/);
});
