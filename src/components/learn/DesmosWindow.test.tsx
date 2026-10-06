// @vitest-environment jsdom
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DesmosWindow from "./DesmosWindow";
import type { StudentQuizQuestion } from "@/types/quiz";

vi.mock("next/script", () => ({ default: () => null }));
const question = {
  id: "given-q",
  subject: "math",
  question_text: "$y=2x+3$",
  figure_kind: null,
  figure_table_data: null,
} as StudentQuizQuestion;
const givenState = { expressions: { list: [{ id: "student-manual", latex: "y=x^2" }] } };
const createCalculator = () => ({
  destroy: vi.fn(),
  getState: vi.fn(() => givenState),
  setState: vi.fn(),
  setExpressions: vi.fn(),
  getExpressions: vi.fn(
    () =>
      [] as {
        id: string;
        type?: string;
        latex?: string;
        columns?: { latex: string; values?: string[] }[];
      }[]
  ),
  updateSettings: vi.fn(),
});
let calculators: ReturnType<typeof createCalculator>[];
type CalculatorFactory = (
  element: HTMLElement,
  options?: { invertedColors?: boolean; border?: boolean }
) => ReturnType<typeof createCalculator>;
let graphing: ReturnType<typeof vi.fn<CalculatorFactory>>;
beforeEach(() => {
  calculators = [];
  graphing = vi.fn(() => {
    const calc = createCalculator();
    calculators.push(calc);
    return calc;
  });
  window.Desmos = {
    GraphingCalculator: graphing,
    ScientificCalculator: vi.fn(() => {
      const calc = createCalculator();
      calculators.push(calc);
      return calc;
    }),
  };
});

function mount(enabled: boolean) {
  return render(
    <DesmosWindow
      onClose={() => {}}
      constraintsRef={createRef<HTMLDivElement>()}
      question={question}
      transfersEnabled={enabled}
    />
  );
}
describe("Desmos source transfer integration", () => {
  it("transfers only on click, uses stable IDs on repeats, and initializes dark mode", () => {
    mount(true);
    expect(graphing.mock.calls[0][1]).toMatchObject({ invertedColors: true, border: false });
    expect(calculators[0].setExpressions).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Send equation 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Send equation 1" }));
    expect(calculators[0].setExpressions.mock.calls[0][0]).toEqual([
      { id: "karman_given-q_equation_0", latex: "y=2x+3" },
    ]);
    expect(calculators[0].setExpressions.mock.calls[1]).toEqual(
      calculators[0].setExpressions.mock.calls[0]
    );
  });
  it("hides transfers when the menu setting is off", () => {
    mount(false);
    expect(screen.queryByRole("button", { name: "Send equation 1" })).not.toBeInTheDocument();
  });
  it("retains manual work through minimize and mode switching without rewriting state", () => {
    mount(true);
    fireEvent.click(screen.getByRole("button", { name: "Minimize Desmos" }));
    expect(calculators[0].destroy).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Open Desmos calculator" }));
    expect(calculators[1].setState).toHaveBeenCalledWith(givenState);
    fireEvent.click(screen.getByRole("button", { name: "Scientific" }));
    expect(screen.getByRole("button", { name: "Send equation 1" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Graphing" }));
    expect(calculators[3].setState).toHaveBeenCalledWith(givenState);
  });
});

describe("section boundaries and manual variable protection", () => {
  it("does not render or initialize Desmos for a reading question, even with Math props", () => {
    render(
      <DesmosWindow
        subject="math"
        question={{ ...question, subject: "reading" }}
        onClose={() => {}}
        constraintsRef={createRef<HTMLDivElement>()}
        transfersEnabled
      />
    );
    expect(graphing).not.toHaveBeenCalled();
    expect(screen.queryByText("Desmos")).not.toBeInTheDocument();
  });
  it("fails closed without any current Math context", () => {
    render(<DesmosWindow onClose={() => {}} constraintsRef={createRef<HTMLDivElement>()} />);
    expect(graphing).not.toHaveBeenCalled();
  });
  it("does not overwrite a student's x₁ or y₁ table", () => {
    render(
      <DesmosWindow
        question={{
          ...question,
          figure_kind: "table",
          figure_table_data: { header_row: ["x", "y"], rows: [["1", "2"]] },
        }}
        onClose={() => {}}
        constraintsRef={createRef<HTMLDivElement>()}
        transfersEnabled
      />
    );
    calculators[0].getExpressions.mockReturnValue([
      { id: "manual-table", type: "table", columns: [{ latex: "x_1", values: ["99"] }] },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Send x–y table" }));
    expect(calculators[0].setExpressions).not.toHaveBeenCalled();
    expect(screen.getByText(/already in use/)).toBeInTheDocument();
  });
});

it("accepts native API expression rows without confusing them with tables", () => {
  render(
    <DesmosWindow
      question={{
        ...question,
        figure_kind: "table",
        figure_table_data: { header_row: ["x", "y"], rows: [["1", "2"]] },
      }}
      onClose={() => {}}
      constraintsRef={createRef<HTMLDivElement>()}
      transfersEnabled
    />
  );
  calculators[0].getExpressions.mockReturnValue([
    { id: "manual-equation", type: "expression", latex: "y=x^2" },
    { id: "note", type: "text" },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Send x–y table" }));
  expect(calculators[0].setExpressions).toHaveBeenCalledTimes(1);
});
