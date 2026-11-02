// @vitest-environment jsdom
// ============================================================
// More than one figure per question (founder, 2026-11-01): a figure_spec or
// choice_figure_spec may hold an ordered list of FigureSpecs. Each figure is
// drawn as its own figure, stacked top to bottom, with its own title, note
// and accessible description; two tables stay two tables.
// ============================================================
import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FigureFrame from "@/components/learn/FigureFrame";
import QuestionTable from "@/components/learn/QuestionTable";
import FigureChoicesView from "@/components/learn/figures/FigureChoicesView";
import { loadFigureEngine } from "@/components/learn/figures/engine-loader";
import { checkSpecs } from "@/lib/figures/engine/checks";
import { hasFigureChoices, withSpecTables } from "@/lib/figures/engine/choice-routing";
import { choiceScenes } from "@/lib/figures/engine/choices";
import { buildScene, defaultBox } from "@/lib/figures/engine/index";
import {
  FIGURE_SPEC_VERSION,
  MAX_FIGURES,
  parseFigureSpecs,
  type FigureSpec,
} from "@/lib/figures/engine/spec";
import { storedSpecList, storedSpecTypes } from "@/lib/figures/engine/spec-types";
import { drawnFigure } from "@/lib/figures/question-figure";
import type { QuestionTableData } from "@/types/question-table";
import type { QuizQuestion } from "@/types/quiz";

await loadFigureEngine();

// A page with a calculator: SpecTable shows the table button only where useCalculator() is set.
vi.mock("@/components/calculator/bridge-context", async (original) => ({
  ...(await original<typeof import("@/components/calculator/bridge-context")>()),
  useCalculator: () => ({ questionKey: "attempt:q1" }),
}));
vi.mock("@/components/calculator/CalculatorSourceAction", async (original) => ({
  ...(await original<typeof import("@/components/calculator/CalculatorSourceAction")>()),
  CalculatorTableAction: (props: { rows: string[][]; itemId?: string; label?: string }) => (
    <span data-testid="table-transfer" data-props={JSON.stringify(props)} />
  ),
}));

afterEach(() => vi.restoreAllMocks());

const base: Pick<FigureSpec, "version" | "labels" | "marks"> = {
  version: FIGURE_SPEC_VERSION,
  labels: [],
  marks: [],
};
const table = (title: string, rows: string[][]): FigureSpec => ({
  ...base,
  type: "table",
  title,
  parts: [{ kind: "table", id: "t1", header: ["Value", "Frequency"], rows }],
});
const SET_A = table("Data Set A", [
  ["c", "12"],
  ["2c", "21"],
]);
const SET_B = table("Data Set B", [
  ["c", "30"],
  ["2c", "21"],
]);
const triangle = (k: number): FigureSpec => ({
  ...base,
  type: "geometry2d",
  parts: [
    { kind: "point", id: "A", x: 0, y: 0 },
    { kind: "point", id: "B", x: 4 * k, y: 0 },
    { kind: "point", id: "C", x: 0, y: 3 * k },
    { kind: "polygon", id: "ABC", points: ["A", "B", "C"] },
  ],
});
const BAR: FigureSpec = {
  ...base,
  type: "bar",
  title: "Trees planted",
  parts: [{ kind: "series", id: "s1", values: [2, 4, 8] }],
  frame: { x: [0, 3], y: [0, 10], step: 2, categories: ["A", "B", "C"] },
};

describe("parseFigureSpecs", () => {
  it("takes one spec as a list of one, and a list in order", () => {
    expect(parseFigureSpecs(SET_A)).toEqual({ ok: true, specs: [SET_A] });
    expect(parseFigureSpecs([SET_A, SET_B])).toEqual({ ok: true, specs: [SET_A, SET_B] });
  });

  it("refuses an empty list, too many figures, and names the figure that is wrong", () => {
    expect(parseFigureSpecs([]).ok).toBe(false);
    expect(parseFigureSpecs(Array(MAX_FIGURES + 1).fill(SET_A)).ok).toBe(false);
    const bad = parseFigureSpecs([SET_A, { ...SET_B, color: "red" }]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors[0]).toMatch(/^figure 2: /);
  });

  it("the Zod-free shape helpers read a list the same way", () => {
    expect(storedSpecList(SET_A)).toEqual([SET_A]);
    expect(storedSpecList([SET_A, BAR])).toEqual([SET_A, BAR]);
    expect(storedSpecList(null)).toEqual([]);
    expect(storedSpecTypes([SET_A, BAR])).toEqual(["table", "bar"]);
    expect(storedSpecTypes([SET_A, { type: "pie" }])).toBeNull();
    expect(storedSpecTypes([])).toBeNull();
  });
});

describe("a question with several figures", () => {
  it("draws two tables as two separate tables, stacked, never side by side", () => {
    const { container } = render(<FigureFrame spec={[SET_A, SET_B]} alt="Two tables" />);
    const stack = container.querySelector("[data-figure-stack]");
    expect(stack).not.toBeNull();
    expect(stack!.className).toMatch(/\bflex-col\b/);
    const tables = stack!.querySelectorAll("table");
    expect(tables).toHaveLength(2);
    // Each table is its own figure (one per row of the column) with its own title.
    expect([...stack!.children].map((c) => c.localName)).toEqual(["figure", "figure"]);
    expect([...tables].map((t) => t.querySelector("caption")?.textContent)).toEqual([
      "Data Set A",
      "Data Set B",
    ]);
  });

  it("gives each drawn figure its own accessible description, and a table its own title", () => {
    const { container } = render(<FigureFrame spec={[triangle(1), BAR, SET_A]} alt="x" />);
    const svgs = container.querySelectorAll("svg[data-figure-view]");
    expect(svgs).toHaveLength(2);
    expect(svgs[0].getAttribute("aria-label")).toBe(
      buildScene(triangle(1), defaultBox(triangle(1))).description
    );
    expect(svgs[1].getAttribute("aria-label")).toBe(buildScene(BAR, defaultBox(BAR)).description);
    expect(container.querySelector("caption")?.textContent).toBe("Data Set A");
  });

  it("gives every table its own table button (TR-91), with distinct ids and labels (TR-92)", () => {
    const { container } = render(<FigureFrame spec={[BAR, SET_A, SET_B]} calculator alt="x" />);
    const controls = [...container.querySelectorAll('[data-testid="table-transfer"]')];
    const props = controls.map((c) => JSON.parse(c.getAttribute("data-props")!));
    const rows = (s: FigureSpec) => (s.parts[0].kind === "table" ? s.parts[0].rows : []);
    expect(props.map((p) => p.rows)).toEqual([rows(SET_A), rows(SET_B)]);
    expect(props.map((p) => p.itemId)).toEqual(["table", "table:2"]);
    expect(props.map((p) => p.label)).toEqual(["Data Set A", "Data Set B"]);
    // Each button sits in its own table's frame, after the scroll frame.
    for (const c of controls) expect(c.closest("figure")?.querySelector("table")).not.toBeNull();
  });

  it("an invalid figure anywhere in the list draws none of them", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { ...SET_B, parts: [{ kind: "table", id: "t1" }] };
    const { container } = render(
      <FigureFrame spec={[SET_A, broken]} src="/old.png" alt="Old figure" />
    );
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/old.png");
  });

  it("drawnFigure takes a valid list as the spec figure, before and after the engine loads", () => {
    const q = { figure_spec: [SET_A, SET_B], image_url: "/a.png" } as Pick<
      QuizQuestion,
      "figure_spec" | "image_url"
    > as QuizQuestion;
    expect(drawnFigure(q)).toBe("spec");
    expect(drawnFigure(q, parseFigureSpecs)).toBe("spec");
  });

  it("checks the labels against every figure of the list together", () => {
    const labels = ["Data Set A", "Data Set B", "Value", "Frequency", "Value", "Frequency"];
    const cells = (s: FigureSpec) => (s.parts[0].kind === "table" ? s.parts[0].rows.flat() : []);
    const all = [...labels, ...cells(SET_A), ...cells(SET_B)];
    expect(checkSpecs([SET_A, SET_B], all)).toEqual([]);
    // A text printed in the original but drawn in neither is still reported.
    expect(checkSpecs([SET_A, SET_B], [...all, "Data Set C"])).toHaveLength(1);
  });
});

describe("the real two-table question (48122737), from its legacy table data", () => {
  const fixture = JSON.parse(
    readFileSync(
      path.resolve(__dirname, "../../../fixtures/tables/48122737-df2c-4c42-953b-94281484650c.json"),
      "utf8"
    )
  );

  it("its own transcription prints two tables", () => {
    expect(fixture.raw_question_text.match(/\[Table: /g)).toHaveLength(2);
  });

  it("QuestionTable draws its data as two separate tables, stacked", () => {
    const { container } = render(<QuestionTable data={fixture.figure_table_data} calculator />);
    const stack = container.querySelector("[data-figure-stack]");
    expect(stack).not.toBeNull();
    const tables = stack!.querySelectorAll("table");
    expect(tables).toHaveLength(2);
    expect([...tables].map((t) => t.querySelector("caption")?.textContent)).toEqual([
      "Data Set A",
      "Data Set B",
    ]);
    // No merged heading row joins them any more: each table is Value | Frequency.
    for (const t of tables) {
      expect([...t.querySelectorAll("thead th")].map((th) => th.textContent)).toEqual([
        "Value",
        "Frequency",
      ]);
    }
    expect(container.querySelectorAll('[data-testid="table-transfer"]')).toHaveLength(2);
  });
});

describe("answer choices with several figures", () => {
  it("draws a choice's list as its figures, in the set's one scale", () => {
    const scenes = choiceScenes([[triangle(1), triangle(2)], triangle(1)]);
    expect(scenes[0]).toHaveLength(2);
    expect(scenes[1]).toHaveLength(1);
    // One scale for every figure of the set: the larger triangle is twice as large.
    expect(scenes[0]![1].scale).toBeCloseTo(scenes[0]![0].scale!, 6);
  });

  it("a choice with an invalid figure in its list draws as text, never in part", () => {
    expect(choiceScenes([[triangle(1), { ...triangle(1), color: "red" }]])).toEqual([null]);
  });

  it("routes a list with a drawn figure to the figure grid and only a lone table to table choices", () => {
    expect(hasFigureChoices([{ choice_figure_spec: [triangle(1), triangle(2)] }])).toBe(true);
    expect(hasFigureChoices([{ choice_figure_spec: [SET_A] }], parseFigureSpecs)).toBe(false);
    const choices: { choice_figure_spec: unknown; choice_table_data?: QuestionTableData }[] = [
      { choice_figure_spec: [SET_A] },
      { choice_figure_spec: [SET_A, SET_B] },
    ];
    const [one, two] = withSpecTables(choices, parseFigureSpecs);
    expect(one.choice_table_data?.caption).toBe("Data Set A");
    expect(two.choice_table_data).toBeUndefined();
  });

  it("FigureChoicesView stacks a choice's figures and names them all", () => {
    const { container } = render(
      <FigureChoicesView
        choices={[
          { letter: "A", choice_figure_spec: [triangle(1), triangle(2)], choice_text: "" },
          { letter: "B", choice_figure_spec: triangle(1), choice_text: "" },
        ]}
        onSelect={() => {}}
      />
    );
    const a = container.querySelector('[data-figure-choice="A"]')!;
    expect(a.querySelectorAll("svg[data-figure-view]")).toHaveLength(2);
    const name = a.querySelector("button")!.getAttribute("aria-label")!;
    expect(name.startsWith("Choice A: ")).toBe(true);
    expect(name.split("; ")).toHaveLength(2);
  });
});
