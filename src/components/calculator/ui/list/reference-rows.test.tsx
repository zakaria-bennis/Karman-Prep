// @vitest-environment jsdom
// The reference calculator's row additions (rea-targets visual MASTER.md): the add-slider line
// under the math of a row with undefined names (R-6; owner, 2026-10-22, Desmos's own), the DEG/RAD
// badge, no fraction toggle on a regression parameter, the point row's Label line (EL-15), the
// Edit list mode rows (EL-44, EL-45), the hover tooltips (PM-29) and the list resizer (EL-4).
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { clampListWidth, ListResizer } from "../layout/ListResizer";
import { panelProps, renderEditor, rowItem } from "./__fixtures__/render-editor";
import { ExpressionPanel } from "./ExpressionPanel";
import { TOOLTIP_DELAY_MS, TOOLTIP_HIDE_MS } from "./Tooltip";

const latexes = (kit: ReturnType<typeof renderEditor>) =>
  kit.engine.getSnapshot().rows.map((r) => r.latex);

afterEach(() => {
  vi.useRealTimers();
});

it("R-6 y=mx+b shows the warning and, under the math, add slider: m, b and an accent all (live Desmos)", () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=mx+b"] });
  const row = rowItem("1");
  const gutter = within(row.querySelector<HTMLElement>(".kc-row-gutter")!);
  expect(gutter.getByRole("button", { name: "Error" })).toBeInTheDocument();
  expect(gutter.queryByRole("button", { name: /expression 1/ })).toBeNull(); // no colour icon
  expect(gutter.queryByRole("button", { name: "Add sliders" })).toBeNull(); // the old icon is gone
  expect(screen.getByText("m and b are not defined.")).toBeInTheDocument();
  const line = within(row).getByRole("group", { name: "add slider:" });
  const buttons = within(line).getAllByRole("button");
  expect(buttons.map((b) => b.textContent)).toEqual(["m", "b", "all"]);
  expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
    "Add slider for m",
    "Add slider for b",
    "Add sliders for all",
  ]);
  expect(buttons.map((b) => b.getAttribute("data-tone"))).toEqual([null, null, "accent"]);
});

it("R-6 one undefined name is one accent button and no all; it adds name=1 below the row in one undo step", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=kx", "y=2"] });
  expect(screen.getByText("k is not defined.")).toBeInTheDocument();
  const line = within(screen.getByRole("group", { name: "add slider:" }));
  expect(line.getAllByRole("button")).toHaveLength(1);
  const k = line.getByRole("button", { name: "Add slider for k" });
  expect(k).toHaveAttribute("data-tone", "accent");
  await userEvent.setup().click(k);
  expect(latexes(kit)).toEqual(["y=kx", "k=1", "y=2"]);
  expect(screen.queryByRole("group", { name: "add slider:" })).toBeNull();
  act(() => kit.engine.undo());
  expect(latexes(kit)).toEqual(["y=kx", "y=2"]);
});

it("R-6 at most four name buttons, as on Desmos; all still adds every name", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=ax^2+bx+c+d+f_1"],
  });
  const line = within(screen.getByRole("group", { name: "add slider:" }));
  expect(line.getAllByRole("button").map((b) => b.textContent)).toEqual([
    "a",
    "b",
    "c",
    "d",
    "all",
  ]);
  await userEvent.setup().click(line.getByRole("button", { name: "Add sliders for all" }));
  expect(latexes(kit)).toEqual(["y=ax^2+bx+c+d+f_1", "a=1", "b=1", "c=1", "d=1", "f_{1}=1"]);
});

it("R-6 Tab goes from the math to the delete cross, then m, b and all, as on Desmos", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=mx+b"] });
  const row = rowItem("1");
  const order = [...row.querySelectorAll<HTMLElement>("textarea, button")]
    .filter((el) => el.closest(".kc-row-gutter") === null)
    .map((el) => el.getAttribute("aria-label") ?? el.tagName);
  expect(order.slice(-4)).toEqual([
    "Delete expression 1",
    "Add slider for m",
    "Add slider for b",
    "Add sliders for all",
  ]);
});

it("R-11 a trig row shows a RAD badge that turns to DEG with the setting; a polynomial row shows none", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["\\sin(2)", "y=\\tan(x)", "y=x^2"],
  });
  const badge = (id: string) => rowItem(id).querySelector(".kc-angle-badge");
  expect(badge("1")).toHaveTextContent("RAD");
  expect(badge("1")).toHaveAttribute("aria-hidden", "true");
  expect(badge("2")).toHaveAttribute("data-placement", "row");
  expect(badge("3")).toBeNull();
  act(() => kit.engine.updateSettings({ angleMode: "degrees" }));
  expect(badge("1")).toHaveTextContent("DEG");
  expect(badge("2")).toHaveTextContent("DEG");
});

it("R-5 a regression parameter row offers no decimal/fraction toggle", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["\\frac{1}{2}", "y=2"],
  });
  act(() =>
    kit.engine.setExpressions([
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2", "3"] },
          { latex: "y_{1}", values: ["2", "4", "6.5"] },
        ],
      },
      { id: "r", latex: "y_{1}\\sim mx_{1}+b" },
      { id: "m", latex: "m" },
      { id: "h", latex: "\\frac{1}{2}" },
    ])
  );
  await screen.findByText("2.25");
  expect(kit.engine.getSnapshot().rows.find((r) => r.id === "m")?.fraction).toBeNull();
  expect(rowItem("m").querySelector(".kc-row-fraction")).toBeNull();
  expect(rowItem("h").querySelector(".kc-row-fraction")).not.toBeNull();
});

it("EL-15 a point row shows a Label checkbox under the math; other rows do not", () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["(1,2)", "y=x"] });
  expect(within(rowItem("1")).getByRole("checkbox", { name: "Label" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  expect(within(rowItem("2")).queryByRole("checkbox")).toBeNull();
});

it("EL-45 Edit list mode swaps each row's cross for Create Table, Duplicate and Delete", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", "a=2"] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Edit list" }));
  expect(document.querySelector(".kc-row-delete")).toBeNull(); // the crosses give way
  expect(
    screen.getByRole("button", { name: "Create table from expression 1" })
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create table from expression 2" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Duplicate expression 2" }));
  expect(latexes(kit)).toEqual(["y=x", "a=2", "a=2"]);
  await user.click(screen.getByRole("button", { name: "Delete expression 1" }));
  expect(latexes(kit)).toEqual(["a=2", "a=2"]);
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.getByRole("button", { name: "Delete expression 1" })).toBeInTheDocument();
});

it("PM-29 a toolbar tooltip shows 500 ms after hover, hides 170 ms after leave, and never on a disabled button", () => {
  vi.useFakeTimers();
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const collapse = screen.getByRole("button", { name: "Collapse list" });
  fireEvent.pointerEnter(collapse, { pointerType: "mouse" });
  act(() => vi.advanceTimersByTime(TOOLTIP_DELAY_MS - 1));
  expect(collapse.querySelector(".kc-tooltip")).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(collapse.querySelector(".kc-tooltip")).toHaveTextContent("Hide Expression List");
  fireEvent.pointerLeave(collapse);
  act(() => vi.advanceTimersByTime(TOOLTIP_HIDE_MS - 1));
  expect(collapse.querySelector(".kc-tooltip")).not.toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(collapse.querySelector(".kc-tooltip")).toBeNull();
  const redo = screen.getByRole("button", { name: "Redo" });
  expect(redo).toHaveAttribute("aria-disabled", "true");
  fireEvent.pointerEnter(redo, { pointerType: "mouse" });
  act(() => vi.advanceTimersByTime(TOOLTIP_DELAY_MS));
  expect(redo.querySelector(".kc-tooltip")).toBeNull();
});

it("EL-4 the list width clamps to 320 px and the container width minus 200 px", () => {
  expect(clampListWidth(100, 1440)).toBe(320);
  expect(clampListWidth(548, 1440)).toBe(548);
  expect(clampListWidth(1400, 1440)).toBe(1240);
  expect(clampListWidth(400, 450)).toBe(320);
});

it("EL-4 the resizer is a separator the arrow keys, Home and End move", () => {
  const onResize = vi.fn();
  render(<ListResizer width={448} containerWidth={1440} onResize={onResize} />);
  const separator = screen.getByRole("separator", { name: "Resize expression list" });
  expect(separator).toHaveAttribute("aria-valuenow", "448");
  fireEvent.keyDown(separator, { key: "ArrowRight" });
  expect(onResize).toHaveBeenLastCalledWith(458);
  fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true });
  expect(onResize).toHaveBeenLastCalledWith(398);
  fireEvent.keyDown(separator, { key: "Home" });
  expect(onResize).toHaveBeenLastCalledWith(320);
  fireEvent.keyDown(separator, { key: "End" });
  expect(onResize).toHaveBeenLastCalledWith(1240);
});
