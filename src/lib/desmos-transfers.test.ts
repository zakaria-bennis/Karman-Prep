import { describe, expect, it } from "vitest";
import { getDesmosTransfers } from "./desmos-transfers";

const given = {
  id: "q-1",
  subject: "math" as const,
  question_text: "",
  figure_kind: null,
  figure_table_data: null,
};
describe("Desmos transfers from question givens", () => {
  it("preserves explicit equations and deduplicates repeats with stable IDs", () => {
    const q = { ...given, question_text: "$y=2x+3$ and \\(y=2x+3\\)" };
    expect(getDesmosTransfers(q)).toHaveLength(1);
    expect(getDesmosTransfers(q)[0].expression).toEqual({
      id: "karman_q-1_equation_0",
      latex: "y=2x+3",
    });
    expect(getDesmosTransfers(q)).toEqual(getDesmosTransfers(q));
  });
  it("does not transfer prose, unsupported math, or unmarked guessed equations", () => {
    expect(
      getDesmosTransfers({ ...given, question_text: "y=2x+3. $x$ $y=\\text{unknown}$ $x=2; y=3$" })
    ).toEqual([]);
  });
  it("transfers exact numeric x–y cells including fractions without fitting a function", () => {
    const result = getDesmosTransfers({
      ...given,
      figure_kind: "table",
      figure_table_data: {
        header_row: ["$x$", "f(x)"],
        rows: [
          ["-1", "1/2"],
          ["2", "$\\frac{3}{4}$"],
        ],
      },
    });
    expect(result[0].expression).toEqual({
      id: "karman_q-1_table",
      type: "table",
      columns: [
        { latex: "x_1", values: ["-1", "2"] },
        { latex: "y_1", values: ["0.5", "0.75"], points: true, lines: false },
      ],
    });
  });
  it("holds nonnumeric, non-x–y, ragged, and zero-denominator tables", () => {
    for (const table of [
      { header_row: ["Time", "Height"], rows: [["1", "2"]] },
      { header_row: ["x", "y"], rows: [["1", "unknown"]] },
      { header_row: ["x", "y"], rows: [["1", "1/0"]] },
      { header_row: ["x", "y"], rows: [["1"]] },
    ])
      expect(
        getDesmosTransfers({ ...given, figure_kind: "table", figure_table_data: table })
      ).toEqual([]);
  });
  it("transfers explicit points once, without reading answer or chart data", () => {
    const q = {
      ...given,
      question_text: "The point (−1, 2.5) and (−1, 2.5).",
      correct_answer: "99",
      explanation_text: "$y=99x$",
      figure_chart_data: { points: [[9, 9]] },
    };
    expect(getDesmosTransfers(q).map((item) => item.expression)).toEqual([
      { id: "karman_q-1_point_1", latex: "(-1,2.5)" },
    ]);
  });
  it("offers no transfers for reading questions", () => {
    expect(
      getDesmosTransfers({ ...given, subject: "reading", question_text: "$y=2x$ (1,2)" })
    ).toEqual([]);
  });
  it("does not mistake an interval or an unlabelled numeric pair for a point", () => {
    expect(
      getDesmosTransfers({ ...given, question_text: "The interval (1,2) and the numbers (3,4)." })
    ).toEqual([]);
  });
});

describe("extended explicit givens", () => {
  it("offers functions and expressions in addition to equations", () => {
    expect(
      getDesmosTransfers({ ...given, question_text: "$f(t)=2t+1$ and $x^2+2x+1$" }).map(
        (item) => item.label
      )
    ).toEqual(["Send function 1", "Send expression 2"]);
  });
  it("explains unsupported table values rather than guessing units", async () => {
    const { getDesmosTransferReport } = await import("./desmos-transfers");
    const result = getDesmosTransferReport({
      ...given,
      figure_kind: "table",
      figure_table_data: { header_row: ["x", "y"], rows: [["1", "2 cm"]] },
    });
    expect(result.transfers).toEqual([]);
    expect(result.notices[0]).toMatch(/ambiguous or unsupported/);
  });
});

it("accepts subtraction expressions without treating bare negatives or pairs as expressions", () => {
  const transfers = getDesmosTransfers({ ...given, question_text: "$x-1$ $-4$ $(-1,2)$" });
  expect(transfers.map((item) => item.expression)).toEqual([
    { id: "karman_q-1_equation_0", latex: "x-1" },
  ]);
});
