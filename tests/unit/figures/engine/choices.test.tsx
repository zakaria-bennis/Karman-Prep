// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FigureChoices from "@/components/learn/figures/FigureChoices";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import QuizReviewQuestion from "@/components/learn/QuizReviewQuestion";
import DailyChallenge from "@/components/learn/DailyChallenge";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import {
  CHOICE_BOX,
  choiceScenes,
  hasFigureChoices,
  sharedFrame,
  withSpecTables,
} from "@/lib/figures/engine/choices";
import { buildScene } from "@/lib/figures/engine/index";
import { FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";
import { drawnFigure } from "@/lib/figures/question-figure";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import { toQuizReviewContent } from "@/lib/quiz-review-content";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { AnswerChoice, QuizQuestionWithChoices, StudentQuizQuestion } from "@/types/quiz";

vi.mock("@/app/learn/daily-challenge-actions", () => ({ actionReviewDailyAnswer: vi.fn() }));
vi.mock("@/contexts/QuizContext", () => ({
  useQuiz: () => ({ state: null }),
  useOptionalQuizState: () => null,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const base: Pick<FigureSpec, "version" | "labels" | "marks"> = {
  version: FIGURE_SPEC_VERSION,
  labels: [],
  marks: [],
};

const line = (m: number, frame: FigureSpec["frame"]): FigureSpec => ({
  ...base,
  type: "plane",
  parts: [
    { kind: "point", id: "P", x: 0, y: 0 },
    { kind: "point", id: "Q", x: 1, y: m },
    { kind: "line", id: "PQ", from: "P", to: "Q" },
  ],
  frame,
});

/** Four graphs whose authors gave each its own window; the choices must still share one. */
const GRAPHS: FigureSpec[] = [
  line(1, { x: [-5, 5], y: [-5, 5], step: 1 }),
  line(2, { x: [-10, 5], y: [-5, 5], step: 1 }),
  line(-1, { x: [-5, 8], y: [-6, 5], step: 1 }),
  line(-2, { x: [-5, 5], y: [-5, 9], step: 1 }),
];

const BAR = (values: number[], name?: string): FigureSpec => ({
  ...base,
  type: "bar",
  parts: [
    { kind: "series", id: "s1", values },
    { kind: "series", id: "s2", values: values.map((v) => v / 2) },
  ],
  labels: name
    ? [
        { text: name, on: "s1" },
        { text: "Other", on: "s2" },
      ]
    : [],
  frame: { x: [0, 3], y: [0, Math.max(...values)], step: 2, categories: ["A", "B", "C"] },
});

const TRIANGLE: FigureSpec = {
  ...base,
  type: "geometry2d",
  parts: [
    { kind: "point", id: "A", x: 0, y: 0 },
    { kind: "point", id: "B", x: 4, y: 0 },
    { kind: "point", id: "C", x: 0, y: 3 },
    { kind: "polygon", id: "ABC", points: ["A", "B", "C"] },
  ],
};

const TABLE: FigureSpec = {
  ...base,
  type: "table",
  parts: [{ kind: "table", id: "t1", header: ["x", "y"], rows: [["1", "2"]], note: "Exact." }],
  title: "Values",
};

const LETTERS = ["A", "B", "C", "D"] as const;
const items = (specs: unknown[]) =>
  specs.map((spec, i) => ({
    letter: LETTERS[i],
    choice_figure_spec: spec,
    choice_text: `Graph ${LETTERS[i]}`,
  }));

describe("sharedFrame", () => {
  it("is the union of the choices' ranges", () => {
    const frame = sharedFrame(GRAPHS);
    expect(frame.x).toEqual([-10, 8]);
    expect(frame.y).toEqual([-6, 9]);
    expect(frame.step).toBe(1);
  });

  it("refuses specs with no frame to share", () => {
    expect(() => sharedFrame([TRIANGLE])).toThrow(/plane or chart/);
  });
});

describe("choiceScenes", () => {
  it("four graph choices share one frame and one size", () => {
    const scenes = choiceScenes(GRAPHS);
    const frame = sharedFrame(GRAPHS);
    scenes.forEach((scene, i) => {
      expect(scene).toEqual(buildScene({ ...GRAPHS[i], frame }, CHOICE_BOX));
      expect([scene!.width, scene!.height]).toEqual([CHOICE_BOX.width, CHOICE_BOX.height]);
    });
    // One frame: every choice draws the same axes, grid and tick labels.
    const axes = (i: number) => JSON.stringify(scenes[i]!.items.filter((it) => !it.partId));
    for (const i of [1, 2, 3]) expect(axes(i)).toBe(axes(0));

    const { container } = render(<FigureChoices choices={items(GRAPHS)} onSelect={() => {}} />);
    const boxes = [...container.querySelectorAll("svg")].map((svg) => svg.getAttribute("viewBox"));
    expect(boxes).toHaveLength(4);
    expect(new Set(boxes).size).toBe(1);
  });

  it("charts of different heights (a legend) are drawn at one size", () => {
    const scenes = choiceScenes([BAR([2, 4, 8], "Plan"), BAR([1, 3, 5]), BAR([3, 3, 3]), BAR([6])]);
    const sizes = new Set(scenes.map((s) => `${s!.width}x${s!.height}`));
    expect(sizes.size).toBe(1);
  });

  it("an invalid spec or a table has no scene; the others still draw", () => {
    const broken = { ...TRIANGLE, parts: [{ kind: "segment", id: "XY", from: "X", to: "Y" }] };
    const scenes = choiceScenes([TRIANGLE, broken, TABLE, null]);
    expect(scenes[0]?.items.length).toBeGreaterThan(0);
    expect(scenes.slice(1)).toEqual([null, null, null]);
  });
});

describe("FigureChoices", () => {
  it('each choice is one button whose accessible name is "Choice A" plus the figure description', () => {
    const onSelect = vi.fn();
    render(<FigureChoices choices={items(GRAPHS)} onSelect={onSelect} />);
    const scenes = choiceScenes(GRAPHS);
    LETTERS.forEach((letter, i) => {
      const button = screen.getByRole("button", {
        name: `Choice ${letter}: ${scenes[i]!.description}`,
      });
      // The figure is inside the button: the whole choice is the tap target.
      expect(button.querySelector("svg")).not.toBeNull();
      expect(button).toHaveTextContent(letter);
      fireEvent.click(button);
      expect(onSelect).toHaveBeenLastCalledWith(letter);
    });
    // One button per choice, no other controls without elimination.
    expect(screen.getAllByRole("button")).toHaveLength(4);
    // Never a text placeholder in place of the drawing.
    expect(screen.queryByText(/Graph [ABCD]/)).toBeNull();
  });

  it("shows selection, elimination and correct and incorrect states", () => {
    const onSelect = vi.fn();
    const onToggleCrossed = vi.fn();
    const { rerender } = render(
      <FigureChoices
        choices={items(GRAPHS)}
        selected="B"
        onSelect={onSelect}
        crossed={(letter) => letter === "C"}
        onToggleCrossed={onToggleCrossed}
      />
    );
    const choice = (l: string) => screen.getByRole("button", { name: new RegExp(`^Choice ${l}`) });
    expect(choice("B")).toHaveAttribute("aria-pressed", "true");
    expect(choice("A")).toHaveAttribute("aria-pressed", "false");
    expect(choice("C")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Restore choice C" }));
    expect(onToggleCrossed).toHaveBeenCalledWith("C");
    fireEvent.click(screen.getByRole("button", { name: "Cross out choice A" }));
    expect(onToggleCrossed).toHaveBeenCalledWith("A");
    expect(onSelect).not.toHaveBeenCalled();

    rerender(
      <FigureChoices
        choices={items(GRAPHS)}
        selected="B"
        submitted
        correctLetter="D"
        onSelect={onSelect}
      />
    );
    expect(choice("B")).toBeDisabled();
    expect(choice("B").closest("[data-choice-state]")).toHaveAttribute(
      "data-choice-state",
      "incorrect"
    );
    expect(choice("D").closest("[data-choice-state]")).toHaveAttribute(
      "data-choice-state",
      "correct"
    );
    // Not by color alone: the state is part of each choice's accessible name.
    expect(choice("D")).toHaveAccessibleName(/^Choice D: .*\. Correct answer\.$/);
    expect(choice("B")).toHaveAccessibleName(/^Choice B: .*\. Your answer, incorrect\.$/);
    expect(choice("A").getAttribute("aria-label")).not.toMatch(/answer/i);
  });

  it("without onSelect the choices are a read-only list, not buttons", () => {
    render(<FigureChoices choices={items(GRAPHS)} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByRole("img")).toHaveLength(4);
  });

  it("a choice whose spec is invalid shows its text instead of an empty box", () => {
    const broken = { ...TRIANGLE, parts: [{ kind: "segment", id: "XY", from: "X", to: "Y" }] };
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<FigureChoices choices={items([TRIANGLE, broken])} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /^Choice B/ })).toHaveTextContent("Graph B");
  });
});

const choice = (letter: string, over: Partial<AnswerChoice> = {}): AnswerChoice =>
  ({
    id: `c-${letter}`,
    question_id: "q1",
    letter,
    choice_text: `Graph ${letter}`,
    choice_table_data: null,
    is_correct: letter === "A",
    ...over,
  }) as AnswerChoice;

const question = (over: Partial<QuizQuestionWithChoices> = {}) =>
  ({
    id: "q1",
    node_id: null,
    question_text: "Which graph shows y = x?",
    answer_format: "multiple_choice",
    subject: "math",
    domain: "algebra",
    topic_cluster: "Linear functions",
    difficulty_level: 3,
    correct_answer: "A",
    passage: null,
    passage_intro: null,
    passage_a: null,
    passage_b: null,
    reviewed_passage: null,
    image_url: null,
    image_alt: null,
    figure_kind: null,
    figure_svg: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    explanation_text: "",
    explanation_per_choice: null,
    desmos_strategy: null,
    numeric_tolerance: null,
    answer_choices: LETTERS.map((l, i) => choice(l, { choice_figure_spec: GRAPHS[i] })),
    ...over,
  }) as unknown as QuizQuestionWithChoices;

describe("choice data helpers", () => {
  it("hasFigureChoices is true only for a drawn, valid choice spec", () => {
    expect(hasFigureChoices(question().answer_choices)).toBe(true);
    expect(hasFigureChoices([choice("A"), choice("B")])).toBe(false);
    expect(hasFigureChoices([choice("A", { choice_figure_spec: TABLE })])).toBe(false);
    expect(hasFigureChoices([choice("A", { choice_figure_spec: { type: "plane" } })])).toBe(false);
  });

  it("withSpecTables turns a table spec choice into the table-choice data it draws", () => {
    const [a, b] = withSpecTables([
      choice("A", { choice_figure_spec: TABLE }),
      choice("B", { choice_table_data: { rows: [["9"]] } }),
    ]);
    expect(a.choice_table_data).toEqual({
      caption: "Values",
      header_row: ["x", "y"],
      rows: [["1", "2"]],
      footer_note: "Exact.",
    });
    expect(b.choice_table_data).toEqual({ rows: [["9"]] });
  });
});

describe("student surfaces draw figure choices", () => {
  it("CatalogQuestion draws one tappable figure per choice", () => {
    const onAnswer = vi.fn();
    render(
      <CatalogQuestion
        question={toStudentQuizQuestion(question())}
        answer=""
        disabled={false}
        onAnswer={onAnswer}
      />
    );
    // The radio keyboard model of Catalog's text choices, kept for figures.
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    const buttons = screen.getAllByRole("radio", { name: /^Choice [ABCD]: A coordinate plane/ });
    expect(buttons).toHaveLength(4);
    fireEvent.click(buttons[2]);
    expect(onAnswer).toHaveBeenCalledWith("C");
    expect(screen.queryByText("Graph C")).toBeNull();
    // Elimination is kept.
    fireEvent.click(screen.getByRole("button", { name: "Cross out choice C" }));
    expect(buttons[2]).toBeDisabled();
  });

  it("ActiveQuizScreen draws figure choices and keeps selection", () => {
    const onSelectAnswer = vi.fn();
    render(
      <ActiveQuizScreen
        node={{ subject: "math", topic: "Practice" } as MappedNode}
        q={toStudentQuizQuestion(question()) as StudentQuizQuestion}
        onClose={() => {}}
        onSelectAnswer={onSelectAnswer}
        onSubmit={() => {}}
        onFlagClick={() => {}}
        showExplanations={false}
        onToggleExplanations={() => {}}
        onNext={() => {}}
        stateOverride={{
          phase: "answering",
          reviews: {},
          records: [],
          targetLength: 1,
          currentIndex: 0,
          selectedAnswer: "B",
        }}
      />
    );
    const b = screen.getByRole("button", { name: /^Choice B: A coordinate plane/ });
    expect(b).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /^Choice D/ }));
    expect(onSelectAnswer).toHaveBeenCalledWith("D");
  });

  it("DailyChallenge draws figure choices and selects one for checking", () => {
    render(
      <DailyChallenge
        math={{
          state: "ready",
          value: {
            day: "2026-10-31",
            subject: "math",
            question: toStudentQuizQuestion(question()),
          },
        }}
        reading={{ state: "empty" }}
      />
    );
    const a = screen.getByRole("radio", { name: /^Choice A: A coordinate plane/ });
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    fireEvent.click(a);
    expect(a).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
  });

  it("a table choice_figure_spec keeps the table-choice path with its radio", () => {
    render(
      <CatalogQuestion
        question={toStudentQuizQuestion(
          question({
            answer_choices: LETTERS.map((l) => choice(l, { choice_figure_spec: TABLE })),
          })
        )}
        answer=""
        disabled={false}
        onAnswer={() => {}}
      />
    );
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getAllByRole("table")).toHaveLength(4);
  });

  it("QuizReviewQuestion draws figure choices read-only", () => {
    render(<QuizReviewQuestion question={toQuizReviewContent(question())} />);
    expect(screen.getAllByRole("img", { name: /A coordinate plane/ })).toHaveLength(4);
    expect(screen.queryByText("Graph A")).toBeNull();
  });
});

describe("Task 9 carry-overs", () => {
  it("seals choice_figure_spec only when set, so every existing hash is unchanged", () => {
    const plain = question({
      answer_choices: LETTERS.map((l) => choice(l)),
    });
    const sealed = catalogQuestionPayloadHash(plain);
    // The key absent and the key null hash byte-identically.
    const withNull = question({
      answer_choices: LETTERS.map((l) => choice(l, { choice_figure_spec: null })),
    });
    expect(catalogQuestionPayloadHash(withNull)).toBe(sealed);
    // A drawn choice changes the seal.
    expect(catalogQuestionPayloadHash(question())).not.toBe(sealed);
  });

  it("an invalid figure_spec lays out like a question with no figure", () => {
    const broken = { ...TRIANGLE, parts: [{ kind: "segment", id: "XY", from: "X", to: "Y" }] };
    expect(drawnFigure(question({ figure_spec: broken } as never))).toBeNull();
    expect(drawnFigure(question({ figure_spec: TRIANGLE } as never))).toBe("spec");
    const { container } = render(
      <CatalogQuestion
        question={toStudentQuizQuestion(
          question({
            figure_spec: broken,
            answer_choices: LETTERS.map((l) => choice(l)),
          } as never)
        )}
        answer=""
        disabled={false}
        onAnswer={() => {}}
      />
    );
    const layout = container.querySelector("[data-question-layout]");
    expect(layout?.className).not.toMatch(/grid-cols-2/);
  });
});
