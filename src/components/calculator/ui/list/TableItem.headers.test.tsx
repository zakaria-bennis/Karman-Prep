// @vitest-environment jsdom
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { ExpressionPanel } from "./ExpressionPanel";
import { panelProps, renderEditor } from "./__fixtures__/render-editor";

type Kit = ReturnType<typeof renderEditor>;
const box = (name: string) => screen.getByRole("textbox", { name });
const stored = (kit: Kit) => kit.engine.getSnapshot().rows.find((r) => r.id === "t")!.columns!;

function withColumns(headers: string[], values: string[][] = []) {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: headers.map((latex, k) => ({ latex, values: values[k] ?? [] })),
    })
  );
  return kit;
}

it("D-9 typing a name in the header slot adds a data column in the next colour, at most 10", () => {
  const kit = withColumns(["x_{1}", "y_{1}"], [["1"], ["2"]]);
  act(() => box("Column 2 header").focus());
  act(() => box("New column header").focus());
  act(() => kit.fields.byLabel("New column header").emitEdit("y_{2}"));
  const columns = stored(kit);
  expect(columns.map((c) => c.latex)).toEqual(["x_{1}", "y_{1}", "y_{2}"]);
  expect(columns[2].color).not.toBe(columns[1].color);
  expect(box("Column 3 header")).toHaveFocus(); // the slot became the header in place
  expect(box("New column header")).toBeInTheDocument(); // and a new slot follows it
  cleanup();
  const ten = withColumns(Array.from({ length: 10 }, (_, k) => (k === 0 ? "x" : `y_{${k}}`)));
  act(() => box("Column 10 header").focus());
  expect(ten.engine.getSnapshot().rows.at(-1)!.columns).toHaveLength(10);
  expect(screen.queryByRole("textbox", { name: "New column header" })).toBeNull();
});

it("D-9 Backspace in the empty header slot moves to the last header and deletes nothing", () => {
  const kit = withColumns(
    ["x_{1}", "y_{1}"],
    [
      ["1", "2"],
      ["3", "4"],
    ]
  );
  act(() => box("New column header").focus());
  act(() => kit.fields.byLabel("New column header").options.onDeleteOutOf("left"));
  expect(box("Column 2 header")).toHaveFocus();
  expect(stored(kit).map((c) => c.values)).toEqual([
    ["1", "2"],
    ["3", "4"],
  ]);
});

it("D-10 Enter in a header moves to its row 1 cell and an expression header shows computed values", async () => {
  const kit = withColumns(
    ["x_{1}", "y_{1}"],
    [
      ["2", "3"],
      ["7", "8"],
    ]
  );
  act(() => box("Column 2 header").focus());
  act(() => kit.fields.byLabel("Column 2 header").options.onEnter());
  expect(box("y₁, row 1")).toHaveFocus();
  act(() => kit.fields.byLabel("Column 2 header").emitEdit("x_{1}^{2}"));
  await waitFor(() =>
    expect(
      screen.getByRole("gridcell", { name: "x₁ squared, row 2, computed, 9" })
    ).toBeInTheDocument()
  );
  expect(screen.queryByRole("textbox", { name: /squared/ })).toBeNull();
  act(() => kit.engine.undo());
  expect(stored(kit)[1].values).toEqual(["7", "8"]); // the typed values come back with the name
});
