// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FigureFrame from "@/components/learn/FigureFrame";
import CatalogQuestion from "@/components/learn/catalog-practice/CatalogQuestion";
import { buildChart } from "@/lib/figures/engine/charts";
import { buildGeometry2d } from "@/lib/figures/engine/geometry2d";
import { buildScene, defaultBox } from "@/lib/figures/engine/index";
import { buildPlane } from "@/lib/figures/engine/plane";
import { buildSolid3d } from "@/lib/figures/engine/solid3d";
import { FIGURE_SPEC_VERSION, parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";
import { drawnFigure } from "@/lib/figures/question-figure";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import { toQuizReviewContent } from "@/lib/quiz-review-content";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";

const BOX = { width: 400, height: 300 };
const base: Pick<FigureSpec, "version" | "labels" | "marks"> = {
  version: FIGURE_SPEC_VERSION,
  labels: [],
  marks: [],
};

const PLANE: FigureSpec = {
  ...base,
  type: "plane",
  parts: [
    { kind: "point", id: "A", x: 0, y: 0 },
    { kind: "point", id: "B", x: 2, y: 3 },
    { kind: "segment", id: "AB", from: "A", to: "B" },
  ],
  frame: { x: [-5, 5], y: [-5, 5], step: 1 },
};
const GEOMETRY: FigureSpec = {
  ...base,
  type: "geometry2d",
  parts: [
    { kind: "point", id: "A", x: 0, y: 0 },
    { kind: "point", id: "B", x: 4, y: 0 },
    { kind: "point", id: "C", x: 0, y: 3 },
    { kind: "polygon", id: "ABC", points: ["A", "B", "C"] },
  ],
};
const BAR: FigureSpec = {
  ...base,
  type: "bar",
  parts: [{ kind: "series", id: "s1", values: [2, 4, 8] }],
  frame: { x: [0, 3], y: [0, 10], step: 2, categories: ["A", "B", "C"] },
};
const SOLID: FigureSpec = {
  ...base,
  type: "solid3d",
  parts: [{ kind: "solid", id: "can", shape: "cylinder", dims: { radius: 2, height: 5 } }],
};
const TABLE: FigureSpec = {
  ...base,
  type: "table",
  parts: [{ kind: "table", id: "t1", header: ["x", "y"], rows: [["1", "2"]] }],
};
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" data-figure-theme="karman-v1" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="#070605"/></svg>';

// The calculator's table transfer control, as a marker carrying what it was given.
vi.mock("@/components/calculator/CalculatorSourceAction", async (original) => ({
  ...(await original<typeof import("@/components/calculator/CalculatorSourceAction")>()),
  CalculatorTableAction: (props: { rows: string[][]; headers?: string[]; itemId?: string }) => (
    <span data-testid="table-transfer" data-props={JSON.stringify(props)} />
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("buildScene", () => {
  it("the fixtures are valid specs", () => {
    for (const spec of [PLANE, GEOMETRY, BAR, SOLID, TABLE])
      expect(parseFigureSpec(spec)).toEqual({ ok: true, spec });
  });

  it("dispatches on spec.type to the matching builder", () => {
    expect(buildScene(PLANE, BOX)).toEqual(buildPlane(PLANE, BOX));
    expect(buildScene(GEOMETRY, BOX)).toEqual(buildGeometry2d(GEOMETRY, BOX));
    expect(buildScene(SOLID, BOX)).toEqual(buildSolid3d(SOLID, BOX));
    for (const type of ["bar", "line", "scatter", "dot_plot", "histogram", "box_plot"] as const) {
      const spec = { ...BAR, type };
      expect(buildScene(spec, BOX)).toEqual(buildChart(spec, BOX));
    }
  });

  it("throws a clear error for a table, which is HTML and never a Scene", () => {
    expect(() => buildScene(TABLE, BOX)).toThrow(/table.*TableView/);
  });

  it("gives every drawn type a default box", () => {
    for (const spec of [PLANE, GEOMETRY, BAR, SOLID]) {
      const box = defaultBox(spec);
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });
});

describe("FigureFrame with figure_spec", () => {
  it("FigureFrame prefers figure_spec over figure_svg", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { container } = render(
      <FigureFrame spec={PLANE} svg={SVG} src="/old.png" alt="Segment AB" />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Named from the spec's own parts, which describe what is actually drawn.
    expect(svg?.getAttribute("aria-label")).toBe(buildScene(PLANE, defaultBox(PLANE)).description);
    expect(container.querySelector("img")).toBeNull();
    // The engine's drawing, not the stored SVG's rect, and nothing fetched.
    expect(container.querySelector('[data-part="AB"]')).not.toBeNull();
    expect(container.querySelector('rect[fill="#070605"]')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("routes a table spec to TableView", () => {
    const { container } = render(<FigureFrame spec={TABLE} svg={SVG} alt="Table of x and y" />);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("a Math table spec shows the calculator's table transfer control, fed from the spec", () => {
    const { container } = render(<FigureFrame spec={TABLE} calculator alt="Table" />);
    const control = container.querySelector('[data-testid="table-transfer"]');
    expect(control).not.toBeNull();
    expect(JSON.parse(control!.getAttribute("data-props")!)).toEqual({
      rows: [["1", "2"]],
      headers: ["x", "y"],
      itemId: "table",
    });
  });

  it("a Reading and Writing table spec has no transfer control", () => {
    const { container } = render(<FigureFrame spec={TABLE} calculator={false} alt="Table" />);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector('[data-testid="table-transfer"]')).toBeNull();
  });

  it("a student surface gives Math table specs the control and Reading and Writing ones none", () => {
    for (const [subject, count] of [
      ["math", 1],
      ["reading", 0],
    ] as const) {
      const q = toStudentQuizQuestion(question({ subject, figure_spec: TABLE }));
      const { container, unmount } = render(
        <CatalogQuestion question={q} answer="" disabled={false} onAnswer={vi.fn()} />
      );
      expect(container.querySelector("table")).not.toBeNull();
      expect(container.querySelectorAll('[data-testid="table-transfer"]')).toHaveLength(count);
      unmount();
    }
  });

  it("invalid figure_spec renders nothing and logs one error, never a partial figure", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = {
      ...PLANE,
      parts: [...PLANE.parts, { kind: "segment", id: "CD", from: "C", to: "D" }],
    };
    const { container } = render(<FigureFrame spec={broken} svg={SVG} src="/old.png" alt="x" />);
    expect(container.innerHTML).toBe("");
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toMatch(/figure_spec/);
  });

  it("keeps the old path when figure_spec is null", () => {
    const { container } = render(<FigureFrame spec={null} src="/old.png" alt="Old figure" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/old.png");
  });
});

const question = (over: Partial<QuizQuestionWithChoices> = {}) =>
  ({
    id: "q1",
    node_id: null,
    question_text: "Which made-up segment is drawn?",
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
    answer_choices: [
      {
        id: "c1",
        question_id: "q1",
        letter: "A",
        choice_text: "",
        choice_table_data: null,
        is_correct: true,
      },
    ],
    ...over,
  }) as unknown as QuizQuestionWithChoices;

describe("figure_spec through question data", () => {
  it("drawnFigure picks the spec before every old field", () => {
    expect(
      drawnFigure(question({ figure_spec: PLANE, figure_kind: "image", image_url: "/a.png" }))
    ).toBe("spec");
    expect(drawnFigure(question({ figure_spec: null, image_url: "/a.png" }))).toBe("image");
  });

  it("the student payload and review carry figure_spec and choice_figure_spec only when set", () => {
    const withSpec = question({
      figure_spec: PLANE,
      answer_choices: [
        {
          id: "c1",
          question_id: "q1",
          letter: "A",
          choice_text: "",
          choice_table_data: null,
          choice_figure_spec: BAR,
          is_correct: true,
        },
      ],
    });
    const student = toStudentQuizQuestion(withSpec);
    expect(student.figure_spec).toEqual(PLANE);
    expect(student.answer_choices[0].choice_figure_spec).toEqual(BAR);
    const review = toQuizReviewContent(withSpec);
    expect(review.figure_spec).toEqual(PLANE);
    expect(review.answer_choices[0].choice_figure_spec).toEqual(BAR);

    const plain = toStudentQuizQuestion(question());
    expect("figure_spec" in plain).toBe(false);
    expect("choice_figure_spec" in plain.answer_choices[0]).toBe(false);
  });

  it("leaves every question without a spec sealed exactly as before", () => {
    const sealed = catalogQuestionPayloadHash(question());
    expect(catalogQuestionPayloadHash(question({ figure_spec: null }))).toBe(sealed);
    expect(catalogQuestionPayloadHash(question({ figure_spec: PLANE }))).not.toBe(sealed);
  });
});

describe("figure_spec migration", () => {
  const root = path.resolve(__dirname, "../../../../supabase");
  const read = (file: string) => readFileSync(path.join(root, file), "utf8");
  it("adds two nullable jsonb columns and the rollback drops only them", () => {
    const up = read("migrations/20261031050000_figure_spec.sql");
    const down = read("rollbacks/20261031050000_figure_spec.down.sql");
    expect(up).toMatch(/quiz_questions\s+add column if not exists figure_spec jsonb;/);
    expect(up).toMatch(/answer_choices\s+add column if not exists choice_figure_spec jsonb;/);
    expect(up).not.toMatch(/not null/i);
    expect(down).toMatch(/drop column if exists figure_spec/);
    expect(down).toMatch(/drop column if exists choice_figure_spec/);
  });
});
