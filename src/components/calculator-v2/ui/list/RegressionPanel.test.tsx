// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ExpressionPanel } from "./ExpressionPanel";
import { panelProps, renderEditor } from "./__fixtures__/render-editor";

type Kit = ReturnType<typeof renderEditor>;

function withData(x: string[], y: string[], latex: string) {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: [""] });
  act(() =>
    kit.engine.setExpressions([
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: x },
          { latex: "y_{1}", values: y },
        ],
      },
      { id: "r", latex },
    ])
  );
  return kit;
}
const panel = () => document.querySelector<HTMLElement>("[data-regression]")!;
const ready = () => waitFor(() => expect(panel()).not.toBeNull());
const columnsOf = (kit: Kit) => kit.engine.getSnapshot().rows.find((r) => r.id === "t")!.columns!;

it("D-37 the panel shows Log mode, Regression parameters, then Statistics and Residuals side by side", async () => {
  withData(["1", "2", "3", "4"], ["2", "4", "8", "16"], "y_{1}\\sim ab^{x_{1}}");
  await ready();
  const p = panel();
  const parts = [...p.querySelectorAll(".kc-regression-log, section")].map(
    (el) => el.getAttribute("aria-label") ?? el.textContent
  );
  expect(parts).toEqual(["Log mode", "Regression parameters", "Statistics", "Residuals"]);
  expect(within(p).getByRole("checkbox", { name: "Log mode" })).not.toBeChecked();
  expect(p.querySelector(".kc-regression-columns")!.children).toHaveLength(2);
});

it("D-37 each value is a focusable field named name equals value and Tab visits them in order", async () => {
  withData(["1", "2", "3"], ["3", "5", "7"], "y_{1}\\sim mx_{1}+b");
  await ready();
  const fields = within(panel()).getAllByRole("textbox");
  expect(fields.map((f) => f.getAttribute("aria-label"))).toEqual([
    "m equals 2",
    "b equals 1",
    "R squared equals 1",
    "r equals 1",
  ]);
  expect(fields.map((f) => (f as HTMLInputElement).value)).toEqual([
    "m = 2",
    "b = 1",
    "R² = 1",
    "r = 1",
  ]);
  fields[0].focus();
  const user = userEvent.setup();
  for (const next of fields.slice(1)) {
    await user.tab();
    expect(next).toHaveFocus();
  }
  expect(fields.every((f) => f.hasAttribute("readonly"))).toBe(true);
  expect(
    screen.getByRole("textbox", { name: /^Expression 3\. Has graph and regression/ })
  ).toBeTruthy();
});

it("A11Y-10 the summary is announced 750 ms after a change", async () => {
  const kit = withData(["1", "2", "3"], ["3", "5", "7"], "");
  act(() => kit.focus.focusRow("r", "end"));
  act(() => kit.fields.forRow("r").emitEdit("y_{1}\\sim mx_{1}+b"));
  await waitFor(
    () =>
      expect(kit.announcer.texts).toContain(
        "Regression: m equals 2, b equals 1, R squared equals 1, r equals 1"
      ),
    { timeout: 3000 }
  );
});

it("D-33 plot adds a read-only e1 column to the source table in a new colour", async () => {
  const kit = withData(["1", "2", "3"], ["3", "5", "8"], "y_{1}\\sim mx_{1}+b");
  await ready();
  fireEvent.click(within(panel()).getByRole("button", { name: "Plot residuals" }));
  const columns = columnsOf(kit);
  expect(columns.map((c) => c.latex)).toEqual(["x_{1}", "y_{1}", "e_{1}"]);
  const regressionColour = kit.engine.getSnapshot().rows.find((r) => r.id === "r")!.color;
  expect(columns[2].color).not.toBe(regressionColour);
  await waitFor(() =>
    expect(screen.getAllByRole("gridcell", { name: /^e₁, row 1, computed, / })).toHaveLength(1)
  );
  expect(within(panel()).queryByRole("button", { name: "Plot residuals" })).toBeNull();
  act(() => kit.engine.undo());
  expect(columnsOf(kit)).toHaveLength(2);
});
