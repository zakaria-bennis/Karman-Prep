// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ExpressionPanel } from "./ExpressionPanel";
import { panelProps, renderEditor } from "./__fixtures__/render-editor";

type Kit = ReturnType<typeof renderEditor>;
const box = (name: string) => screen.getByRole("textbox", { name });
const field = (kit: Kit, name: string) => kit.fields.byLabel(name);
const columns = (kit: Kit, id = "t") =>
  kit.engine
    .getSnapshot()
    .rows.find((r) => r.id === id)!
    .columns!.map((c) => c.values);

function withTable(rows: string[], x: string[], y: string[], after?: string[]) {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: x },
        { latex: "y_{1}", values: y },
      ],
    })
  );
  (after ?? []).forEach((latex, i) => act(() => kit.engine.setExpression({ id: `e${i}`, latex })));
  return kit;
}
// A field keeps the name it was created with in `options`; the textbox's name follows the cell.
const press = (kit: Kit, name: string, key: "onEnter" | "onDeleteOutOf") =>
  act(() => {
    const options = field(kit, name).options;
    if (key === "onEnter") options.onEnter();
    else options.onDeleteOutOf("left");
  });
const arrow = (kit: Kit, name: string, direction: "up" | "down") =>
  act(() => field(kit, name).options.onArrowOut(direction));
const side = (kit: Kit, name: string, direction: "left" | "right") =>
  act(() => field(kit, name).options.onMoveOutOf!(direction));
const tab = (name: string, shiftKey = false) =>
  act(() => void fireEvent.keyDown(box(name), { key: "Tab", shiftKey }));

it("D-7, RT-7 Enter goes to the blank row, continues a sequence, and leaves the table from the blank row", async () => {
  const kit = withTable(["y=x"], ["1"], ["2"]);
  act(() => box("x₁, row 1").focus());
  press(kit, "x₁, row 1", "onEnter"); // one value: no sequence, the blank row
  expect(box("x₁, row 2, blank")).toHaveFocus();
  act(() => field(kit, "x₁, row 2, blank").emitEdit("3"));
  expect(columns(kit)).toEqual([
    ["1", "3"],
    ["2", ""],
  ]);
  press(kit, "x₁, row 2, blank", "onEnter"); // the field created for the blank row; 1, 3 → 5
  expect(columns(kit)[0]).toEqual(["1", "3", "5"]);
  await waitFor(() => expect(box("x₁, row 3")).toHaveFocus());
  press(kit, "x₁, row 4, blank", "onEnter");
  // The table was the last item, so a new empty expression takes focus.
  expect(kit.engine.getSnapshot().rows.map((r) => r.type)).toEqual([
    "expression",
    "table",
    "expression",
  ]);
  expect(box("Expression 3")).toHaveFocus();
});

it("TABLES-29 Enter on an interior row of the first column inserts an empty row below", () => {
  const kit = withTable(["y=x"], ["1", "2", "3"], ["4", "5", "6"]);
  act(() => box("x₁, row 1").focus());
  press(kit, "x₁, row 1", "onEnter");
  expect(columns(kit)).toEqual([
    ["1", "", "2", "3"],
    ["4", "", "5", "6"],
  ]);
});

it("D-7 Tab and Shift+Tab move across columns and wrap rows, skipping the header slot, and select the cell entered", () => {
  const kit = withTable(["y=x"], ["1", "2"], ["3", "4"]);
  act(() => box("Column 2 header").focus());
  const select = vi.spyOn(field(kit, "x₁, row 1"), "select");
  tab("Column 2 header"); // past the header slot to row 1
  expect(box("x₁, row 1")).toHaveFocus();
  expect(select).toHaveBeenCalled();
  tab("x₁, row 1");
  expect(box("y₁, row 1")).toHaveFocus();
  tab("y₁, row 1");
  expect(box("x₁, row 2")).toHaveFocus();
  tab("x₁, row 2", true);
  expect(box("y₁, row 1")).toHaveFocus();
});

it("D-7 ArrowUp from row 1 enters the header and ArrowDown from the blank row leaves for the next item", () => {
  const kit = withTable(["y=x"], ["1"], ["2"], ["y=3"]);
  act(() => box("y₁, row 1").focus());
  arrow(kit, "y₁, row 1", "up");
  expect(box("Column 2 header")).toHaveFocus();
  arrow(kit, "Column 2 header", "up");
  expect(box("Expression 1")).toHaveFocus();
  act(() => box("y₁, row 1").focus());
  arrow(kit, "y₁, row 1", "down");
  expect(box("y₁, row 2, blank")).toHaveFocus();
  arrow(kit, "y₁, row 2, blank", "down");
  expect(box("Expression 3")).toHaveFocus();
});

it("D-7 ArrowLeft and ArrowRight cross cells only at the caret's edge", () => {
  const kit = withTable(["y=x"], ["1"], ["2"]);
  act(() => box("x₁, row 1").focus());
  side(kit, "x₁, row 1", "left"); // no cell to the left: the caret stays
  expect(box("x₁, row 1")).toHaveFocus();
  side(kit, "x₁, row 1", "right");
  expect(box("y₁, row 1")).toHaveFocus();
  expect(field(kit, "y₁, row 1").calls.at(-1)).toEqual({ method: "keystroke", arg: "Ctrl-Home" });
  side(kit, "y₁, row 1", "left");
  expect(box("x₁, row 1")).toHaveFocus();
  expect(field(kit, "x₁, row 1").calls.at(-1)).toEqual({ method: "keystroke", arg: "Ctrl-End" });
});

it("D-8 Backspace in an empty cell of an empty interior row deletes the row and selects the cell above", () => {
  const kit = withTable(["y=x"], ["1", "", "3"], ["4", "", "6"]);
  act(() => box("y₁, row 2, blank").focus());
  press(kit, "y₁, row 2, blank", "onDeleteOutOf");
  expect(columns(kit)).toEqual([
    ["1", "3"],
    ["4", "6"],
  ]);
  expect(box("y₁, row 1")).toHaveFocus();
  act(() => kit.engine.undo());
  expect(columns(kit)[0]).toEqual(["1", "", "3"]);
});

it("D-8 Backspace in the blank row goes to the last data row and Backspace in an empty row below a table enters its blank row", () => {
  const kit = withTable(["y=x"], ["1", "2"], ["3", "4"], [""]);
  act(() => box("y₁, row 3, blank").focus());
  press(kit, "y₁, row 3, blank", "onDeleteOutOf");
  expect(box("y₁, row 2")).toHaveFocus();
  act(() => box("Expression 3").focus());
  act(() => kit.fields.byLabel("Expression 3").options.onDeleteOutOf("left"));
  expect(kit.engine.getSnapshot().rows).toHaveLength(2);
  expect(box("x₁, row 3, blank")).toHaveFocus();
});

it("D-8 a cleared interior row stays until deleted and the table holds at most 1,000 rows", () => {
  const kit = withTable(["y=x"], ["1", "2", "3"], ["4", "5", "6"]);
  act(() => field(kit, "x₁, row 2").emitEdit(""));
  act(() => field(kit, "y₁, row 2").emitEdit(""));
  expect(columns(kit)).toEqual([
    ["1", "", "3"],
    ["4", "", "6"],
  ]);
  const full = Array.from({ length: 1000 }, (_, i) => String(i));
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: full },
        { latex: "y_{1}", values: [] },
      ],
    })
  );
  act(() => field(kit, "x₁, row 1001, blank").emitEdit("5"));
  expect(columns(kit)[0]).toHaveLength(1000);
  expect(kit.announcer.texts.at(-1)).toBe("Tables hold up to 1,000 rows.");
});

it("D-8 Add row to table n focuses the blank row and each data row has a Delete table n row k control", () => {
  const kit = withTable(["y=x"], ["1", "2"], ["3", "4"]);
  act(() => screen.getByRole("button", { name: "Add row to table 2" }).click());
  expect(box("x₁, row 3, blank")).toHaveFocus();
  act(() => screen.getByRole("button", { name: "Delete table 2 row 1" }).click());
  expect(columns(kit)).toEqual([["2"], ["4"]]);
  expect(box("x₁, row 1")).toHaveFocus();
  expect(screen.queryByRole("button", { name: "Delete table 2 row 2" })).toBeNull();
  act(() => kit.engine.undo());
  expect(columns(kit)[0]).toEqual(["1", "2"]);
});

it("D-9 Backspace in an empty later header deletes that column with its data and moves to the previous header", () => {
  const kit = withTable(["y=x"], ["1", "2"], ["3", "4"]);
  act(() => field(kit, "Column 2 header").emitEdit(""));
  press(kit, "Column 2 header", "onDeleteOutOf");
  const table = kit.engine.getSnapshot().rows.find((r) => r.id === "t")!;
  expect(table.columns!.map((c) => c.latex)).toEqual(["x_{1}"]);
  expect(columns(kit)).toEqual([["1", "2"]]);
  expect(box("Column 1 header")).toHaveFocus();
});

it("D-9 Backspace in the first column's empty header deletes the table, leaving an empty row; Undo brings it back", () => {
  const kit = withTable(["y=x"], ["1", "2"], ["3", "4"]);
  act(() => field(kit, "Column 1 header").emitEdit(""));
  press(kit, "Column 1 header", "onDeleteOutOf");
  const rows = () => kit.engine.getSnapshot().rows.map((r) => `${r.id}:${r.type}:${r.latex}`);
  expect(rows()).toEqual(["1:expression:y=x", "t:expression:"]);
  act(() => kit.engine.undo());
  expect(kit.engine.getSnapshot().rows.find((r) => r.id === "t")?.type).toBe("table");
});
