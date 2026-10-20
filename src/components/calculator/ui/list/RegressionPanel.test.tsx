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

it("RT-31 the panel shows Log Mode, REGRESSION PARAMETERS, then STATISTICS and RESIDUALS side by side", async () => {
  withData(["1", "2", "3", "4"], ["2", "4", "8", "16"], "y_{1}\\sim ab^{x_{1}}");
  await ready();
  const p = panel();
  const parts = [...p.querySelectorAll(".kc-regression-log, section")].map(
    (el) => el.getAttribute("aria-label") ?? el.textContent
  );
  expect(parts).toEqual(["Log Mode?", "Regression Parameters", "Statistics", "Residuals"]);
  expect(within(p).getByRole("checkbox", { name: "Log Mode" })).not.toBeChecked();
  expect(within(p).getByRole("link", { name: "Log mode help" })).toBeTruthy();
  // an iterative fit: "Parameters might not be exact"
  expect(
    within(p).getByRole("link", { name: "Parameters might not be exact. Click to learn more." })
  ).toBeTruthy();
  expect(p.querySelector(".kc-tr-footer")!.children).toHaveLength(2);
});

it("RT-23, RT-31 each value is focusable typeset math named name equals value, in Tab order", async () => {
  withData(["1", "2", "3"], ["3", "5", "7"], "y_{1}\\sim mx_{1}+b");
  await ready();
  const fields = within(panel()).getAllByRole("img");
  expect(fields.map((f) => f.getAttribute("aria-label"))).toEqual([
    "m equals 2",
    "b equals 1",
    "R squared equals 1",
    "r equals 1",
    "e sub 1",
  ]);
  expect(fields.map((f) => f.querySelector("[data-latex]")!.getAttribute("data-latex"))).toEqual([
    "m=2",
    "b=1",
    "R^{2}=1",
    "r=1",
    "e_{1}",
  ]);
  fields[0].focus();
  const user = userEvent.setup();
  for (const next of fields.slice(1)) {
    await user.tab();
    expect(next).toHaveFocus();
  }
  // a linear fit is exact: no "Parameters might not be exact"
  expect(within(panel()).queryByRole("link")).toBeNull();
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
  fireEvent.click(within(panel()).getByRole("button", { name: "plot" }));
  const columns = columnsOf(kit);
  expect(columns.map((c) => c.latex)).toEqual(["x_{1}", "y_{1}", "e_{1}"]);
  const regressionColour = kit.engine.getSnapshot().rows.find((r) => r.id === "r")!.color;
  expect(columns[2].color).not.toBe(regressionColour);
  await waitFor(() =>
    expect(screen.getAllByRole("gridcell", { name: /^e₁, row 1, computed, / })).toHaveLength(1)
  );
  expect(within(panel()).queryByRole("button", { name: "plot" })).toBeNull();
  act(() => kit.engine.undo());
  expect(columnsOf(kit)).toHaveLength(2);
});
