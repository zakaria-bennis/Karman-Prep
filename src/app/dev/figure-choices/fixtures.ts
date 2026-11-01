import type { FigureSpec } from "@/lib/figures/engine/spec";
import { FIGURE_SPEC_VERSION } from "@/lib/figures/engine/spec";
import type { StudentQuizQuestion } from "@/types/quiz";

// Made-up fixtures (not bank questions): one question per kind of figure choice.
const base: Pick<FigureSpec, "version" | "labels" | "marks"> = {
  version: FIGURE_SPEC_VERSION,
  labels: [],
  marks: [],
};
const LETTERS = ["A", "B", "C", "D"] as const;

const line = (m: number, b: number, frame: FigureSpec["frame"]): FigureSpec => ({
  ...base,
  type: "plane",
  parts: [
    { kind: "point", id: "P", x: 0, y: b },
    { kind: "point", id: "Q", x: 1, y: b + m },
    { kind: "line", id: "PQ", from: "P", to: "Q" },
  ],
  frame,
});

const bars = (values: number[]): FigureSpec => ({
  ...base,
  type: "bar",
  parts: [{ kind: "series", id: "s1", values }],
  frame: {
    x: [0, 4],
    y: [0, Math.max(...values)],
    step: 2,
    categories: ["Mon", "Tue", "Wed", "Thu"],
    yLabel: "Visitors",
  },
});

const triangle = (cx: number, cy: number): FigureSpec => ({
  ...base,
  type: "geometry2d",
  parts: [
    { kind: "point", id: "A", x: 0, y: 0 },
    { kind: "point", id: "B", x: 6, y: 0 },
    { kind: "point", id: "C", x: cx, y: cy },
    { kind: "polygon", id: "ABC", points: ["A", "B", "C"] },
  ],
  labels: [
    { text: "A", on: "A" },
    { text: "B", on: "B" },
    { text: "C", on: "C" },
  ],
});

function fixture(id: string, text: string, specs: FigureSpec[]): StudentQuizQuestion {
  return {
    id,
    subject: "math",
    topic_cluster: "Figure choices",
    difficulty_level: 3,
    answer_format: "multiple_choice",
    question_text: text,
    passage_intro: null,
    passage: null,
    passage_a: null,
    passage_b: null,
    reviewed_passage: null,
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    figure_svg: null,
    image_url: null,
    image_alt: null,
    answer_choices: specs.map((spec, i) => ({
      id: `${id}-${LETTERS[i]}`,
      question_id: id,
      letter: LETTERS[i],
      choice_text: "",
      choice_table_data: null,
      choice_figure_spec: spec,
    })),
  } as unknown as StudentQuizQuestion;
}

const box = (length: number, width: number, height: number): FigureSpec => ({
  ...base,
  type: "solid3d",
  parts: [{ kind: "solid", id: "box", shape: "prism", dims: { length, width, height } }],
});

/** One made-up question per kind of figure choice (graphs, bar charts, triangles, prisms). */
export const FIGURE_CHOICE_QUESTIONS = [
  fixture("dev-graph-choices", "Which graph shows y = 2x + 1?", [
    line(2, 1, { x: [-5, 5], y: [-5, 5], step: 1 }),
    line(-2, 1, { x: [-6, 5], y: [-5, 5], step: 1 }),
    line(1, -2, { x: [-5, 5], y: [-5, 6], step: 1 }),
    line(0.5, 3, { x: [-5, 5], y: [-5, 5], step: 1 }),
  ]),
  fixture("dev-bar-choices", "Which bar graph shows the visitors in the table?", [
    bars([4, 8, 6, 10]),
    bars([8, 4, 10, 6]),
    bars([6, 6, 8, 4]),
    bars([10, 8, 6, 4]),
  ]),
  fixture("dev-shape-choices", "Which triangle has a right angle at A?", [
    triangle(0, 4),
    triangle(3, 4),
    triangle(5, 3),
    triangle(1, 5),
  ]),
  fixture("dev-solid-choices", "Which box has a volume of 24 cubic units?", [
    box(2, 3, 4),
    box(4, 2, 2),
    box(6, 2, 1),
    box(3, 3, 3),
  ]),
];
