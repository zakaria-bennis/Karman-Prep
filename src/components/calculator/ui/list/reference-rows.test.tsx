// @vitest-environment jsdom
// The reference calculator's row additions (rea-targets visual MASTER.md): the add-slider line and
// its "Too many variables" warning (R-6, EL-34 to EL-36), the point row's Label line (EL-15), the
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

it("R-6 y=mx+b shows the reference's warning and an add-slider line with m, b and all", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=mx+b"] });
  const row = rowItem("1");
  const gutter = within(row.querySelector<HTMLElement>(".kc-row-gutter")!);
  expect(gutter.getByRole("button", { name: "Error" })).toBeInTheDocument();
  expect(gutter.queryByRole("button", { name: /expression 1/ })).toBeNull(); // no colour icon
  expect(screen.getByText("Too many variables. Try defining 'm' or 'b'.")).toBeInTheDocument();
  const line = within(screen.getByRole("group", { name: "Add slider" }));
  expect(line.getAllByRole("button").map((b) => b.textContent)).toEqual(["m", "b", "all"]);
  expect(line.getByRole("button", { name: "Add sliders for all" })).toHaveAttribute(
    "data-tone",
    "accent"
  );
  expect(line.getByRole("button", { name: "Add slider for m" })).not.toHaveAttribute("data-tone");
});

it("R-6 one undefined name gets a single blue button, which adds name=1 below the row in one undo step", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=kx", "y=2"] });
  expect(screen.getByText("Too many variables. Try defining 'k'.")).toBeInTheDocument();
  const line = within(screen.getByRole("group", { name: "Add slider" }));
  const k = line.getByRole("button", { name: "Add slider for k" });
  expect(line.getAllByRole("button")).toHaveLength(1);
  expect(k).toHaveAttribute("data-tone", "accent");
  await userEvent.setup().click(k);
  expect(latexes(kit)).toEqual(["y=kx", "k=1", "y=2"]);
  act(() => kit.engine.undo());
  expect(latexes(kit)).toEqual(["y=kx", "y=2"]);
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
  expect(screen.queryByRole("button", { name: "Delete expression 1" })).toBeNull();
  expect(screen.getByRole("button", { name: "Create Table: Expression 1" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create Table: Expression 2" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Duplicate: Expression 2" }));
  expect(latexes(kit)).toEqual(["y=x", "a=2", "a=2"]);
  await user.click(screen.getByRole("button", { name: "Delete: Expression 1" }));
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
