// @vitest-environment jsdom
import { act, screen, waitFor, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { ExpressionPanel } from "./ExpressionPanel";
import { panelProps, renderEditor } from "./__fixtures__/render-editor";
import { insertTableItem } from "./row-actions";

const box = (name: string) => screen.getByRole("textbox", { name });
const tableOf = (kit: ReturnType<typeof renderEditor>, id: string) =>
  kit.engine.getSnapshot().rows.find((r) => r.id === id)!;

it("D-5 a new table shows headers x1 and y1, one blank row and focus in its first cell", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => void insertTableItem(kit.engine, kit.focus, kit.announcer, "1"));
  expect(kit.fields.byLabel("Column 1 header").latex()).toBe("x_{1}");
  expect(kit.fields.byLabel("Column 2 header").latex()).toBe("y_{1}");
  expect(screen.getAllByRole("textbox", { name: /, row 1, blank$/ })).toHaveLength(2);
  expect(screen.queryAllByRole("textbox", { name: /, row 2/ })).toHaveLength(0);
  expect(box("x₁, row 1, blank")).toHaveFocus();
});

it("D-5 typing table into an empty row converts it at once and other words stay math", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["", ""] });
  act(() => kit.fields.forRow("2").emitEdit("note"));
  expect(tableOf(kit, "2").type).toBe("expression");
  act(() => kit.fields.forRow("1").emitEdit("table"));
  expect(tableOf(kit, "1").type).toBe("table");
  expect(box("x₁, row 1, blank")).toHaveFocus();
  act(() => kit.engine.undo());
  expect(tableOf(kit, "1").type).toBe("expression");
});

it("D-5 a blank header slot shows right of the last column only while a cell or header has focus", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => kit.engine.insertTableAfter("1"));
  expect(screen.queryByRole("textbox", { name: "New column header" })).toBeNull();
  act(() => box("x₁, row 1, blank").focus());
  expect(box("New column header")).toBeInTheDocument();
  act(() => box("x₁, row 1, blank").blur());
  expect(screen.queryByRole("textbox", { name: "New column header" })).toBeNull();
});

it("D-19 the table is named Table n, k columns, m rows and each cell header, row r, including blank cells", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2", "3"] },
        { latex: "y_{1}", values: ["4", "", "6"] },
      ],
    })
  );
  const grid = screen.getByRole("grid", { name: "Table 2, 2 columns, 3 rows" });
  expect(within(grid).getAllByRole("row")).toHaveLength(5); // headers, three data rows, the blank row
  expect(box("x₁, row 3")).toBeInTheDocument();
  expect(box("y₁, row 2, blank")).toBeInTheDocument();
  expect(box("y₁, row 4, blank")).toBeInTheDocument();
  expect(kit.fields.byLabel("x₁, row 3").latex()).toBe("3");
});

it("D-19 a computed cell reads header, row r, computed, value and is read-only", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["2", "3"] },
        { latex: "x_{1}^{2}", values: [] },
      ],
    })
  );
  await waitFor(() =>
    expect(
      screen.getByRole("gridcell", { name: "x₁ squared, row 2, computed, 9" })
    ).toBeInTheDocument()
  );
  expect(screen.queryByRole("textbox", { name: /squared, row 2/ })).toBeNull();
  expect(
    screen.getByRole("gridcell", { name: "x₁ squared, row 1, computed, 4" })
  ).toHaveTextContent("4");
});
