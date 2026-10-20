// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
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
  for (const typed of ["t", "ta", "tab", "tabl", "table"])
    act(() => kit.fields.forRow("1").emitEdit(typed)); // letter by letter, as MathQuill reports it
  expect(tableOf(kit, "1").type).toBe("table");
  expect(box("x₁, row 1, blank")).toHaveFocus();
  act(() => kit.engine.undo());
  expect(tableOf(kit, "1").type).toBe("expression");
});

it("D-5, TABLES-2 the blank header slot and its read-only column show right of the last column, focused or not", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => kit.engine.insertTableAfter("1"));
  expect(box("New column header")).toBeInTheDocument();
  // one slot cell per body row (a new table has the blank row), hidden from the grid's reading
  expect(document.querySelectorAll(".kc-table-slot")).toHaveLength(1);
  act(() => box("x₁, row 1, blank").focus());
  act(() => box("x₁, row 1, blank").blur());
  expect(box("New column header")).toBeInTheDocument();
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

it("D-16, TABLES-48 Zoom to fit table n fits the plotted points by the reference rule and is disabled when nothing is plotted", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() =>
    kit.engine.setView({
      viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
      size: { width: 800, height: 600 },
      dpr: 1,
    })
  );
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: [] },
        { latex: "y_{1}", values: [] },
      ],
    })
  );
  const fit = () => screen.getByRole("button", { name: "Zoom to fit table 2" });
  expect(fit()).toHaveAttribute("aria-disabled", "true");
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["10", "30"] },
        { latex: "y_{1}", values: ["100", "200"] },
      ],
    })
  );
  await waitFor(() => expect(fit()).not.toHaveAttribute("aria-disabled"));
  act(() => fit().click());
  const { left, right, bottom, top } = kit.engine.getSnapshot().viewport;
  expect([left, right, bottom, top].map((v) => Math.round(v))).toEqual([-15, 45, -100, 300]);
});

it("D-5 deleting a table leaves an empty expression row with the caret and Undo restores it", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => void kit.engine.insertTableAfter("1"));
  act(() => screen.getByRole("button", { name: "Delete table 2" }).click());
  expect(tableOf(kit, "2").type).toBe("expression");
  expect(box("Expression 2")).toHaveFocus();
  act(() => kit.engine.undo());
  expect(tableOf(kit, "2").type).toBe("table");
  expect(screen.getByRole("grid", { name: "Table 2, 2 columns, 0 rows" })).toBeInTheDocument();
});

it("K-2 a touch focus on a table cell lets the shell open the keypad", () => {
  const onTouchFocusRow = vi.fn();
  const kit = renderEditor(<ExpressionPanel {...panelProps({ onTouchFocusRow })} />, {
    rows: ["y=x"],
  });
  act(() => void kit.engine.insertTableAfter("1"));
  const textbox = box("x₁, row 1, blank");
  act(() => box("y₁, row 1, blank").focus()); // a keyboard focus is not a touch
  expect(onTouchFocusRow).not.toHaveBeenCalled();
  fireEvent.pointerDown(textbox, { pointerType: "touch" });
  act(() => textbox.focus());
  expect(onTouchFocusRow).toHaveBeenCalledWith(tableOf(kit, "2").id);
});

const regressionTable = (kit: ReturnType<typeof renderEditor>) =>
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["12", "25", "325"] },
        { latex: "y_{1}", values: ["3", "5", "10"] },
      ],
    })
  );

it("RT-28 Add Regression adds a Linear table regression whose panel shows the equation and statistics", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  regressionTable(kit);
  const add = await screen.findByRole("button", { name: "Add Regression" });
  act(() => add.click());
  expect(kit.engine.getExpressions().find((s) => s.id === "t")!.regression?.type).toBe("linear");
  expect(kit.engine.getSnapshot().rows).toHaveLength(2); // no row below: the regression is the table's
  expect(screen.queryByRole("button", { name: "Add Regression" })).toBeNull();
  const panel = await waitFor(() => {
    const el = document.querySelector<HTMLElement>("[data-table-regression]");
    if (el === null) throw new Error("no panel");
    return el;
  });
  await waitFor(() =>
    expect(within(panel).getByRole("img", { name: /^Regression Equation:/ })).toBeInTheDocument()
  );
  expect(within(panel).getByRole("button", { name: "Linear Regression" })).toBeInTheDocument();
  expect(within(panel).getByRole("region", { name: "Statistics" })).toBeInTheDocument();
  expect(within(panel).getByRole("button", { name: "plot" })).toBeInTheDocument();
});

it("RT-29 the model dropdown lists the nine models and picking one refits", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  regressionTable(kit);
  const add = await screen.findByRole("button", { name: "Add Regression" });
  act(() => add.click());
  act(() => screen.getByRole("button", { name: "Linear Regression" }).click());
  const options = screen.getAllByRole("option").map((o) => o.getAttribute("aria-label"));
  expect(options).toEqual([
    "Linear Regression",
    "Quadratic Regression",
    "Cubic Regression",
    "Quartic Regression",
    "Exponential Regression",
    "Logarithmic Regression",
    "Power Regression",
    "Logistic Regression",
    "Sinusoidal Regression",
  ]);
  act(() => screen.getByRole("option", { name: "Quadratic Regression" }).click());
  expect(kit.engine.getExpressions().find((s) => s.id === "t")!.regression?.type).toBe("quadratic");
  await waitFor(() =>
    expect(
      screen.getByRole("img", { name: /^Regression Equation:/ }).querySelector("[data-latex]")
    ).toHaveAttribute("data-latex", "y=-0.000438273x^{2}+0.170062x+1.02236")
  );
});

it("RT-8, K-8 the column style menu's Add Regression uses that column, on every layout", async () => {
  for (const layout of ["desktop", "stacked"] as const) {
    const kit = renderEditor(<ExpressionPanel {...panelProps({ layout })} />, { rows: ["y=x"] });
    regressionTable(kit);
    await screen.findByRole("button", { name: "Add Regression" });
    fireEvent.contextMenu(screen.getByRole("button", { name: "Points for y₁" }));
    const menu = screen.getByRole("dialog", { name: "Style for y₁" });
    act(() => within(menu).getByRole("button", { name: "Add Regression" }).click());
    const state = kit.engine.getExpressions().find((s) => s.id === "t")!;
    expect(state.regression?.columns).toEqual({ x: 0, y: 1 });
    cleanup();
  }
});

it("D-6 a cell with a cell error shows the marker and its tooltip; the header error likewise (parity 17, 18)", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2"] },
        { latex: "y_{1}", values: ["1,2", "5"] },
        { latex: "x_{1}", values: ["3", "4"] },
      ],
    })
  );
  const grid = screen.getByRole("grid", { name: "Table 2, 3 columns, 2 rows" });
  const analysis = tableOf(kit, "t").table!.analysis.columns;
  expect(analysis[1].cellErrors[0]!.message).toBe("Points are written like this: (1, 2).");
  expect(analysis[2].error).not.toBeNull();

  // One marker for the bad cell and one for each bad header (x₁ is defined twice); no others.
  const markers = within(grid).getAllByRole("button", { name: "Error" });
  expect(markers).toHaveLength(3);
  const cell = box("y₁, row 1");
  expect(cell).toHaveAttribute("aria-invalid", "true");
  const tipId = cell.getAttribute("aria-describedby")!;
  expect(document.getElementById(tipId)).toHaveTextContent("Points are written like this: (1, 2).");
  expect(box("y₁, row 2")).not.toHaveAttribute("aria-invalid");
  expect(box("y₁, row 2")).not.toHaveAttribute("aria-describedby");

  // The marker sits in the bad cell and opens the same tooltip on focus.
  const cellMarker = markers.find((m) => m.getAttribute("aria-describedby") === tipId)!;
  expect(cellMarker).toHaveClass("kc-cell-warning");
  expect(cellMarker.closest('[role="gridcell"]')).toContainElement(cell);
  expect(screen.queryByRole("tooltip")).toBeNull();
  act(() => cellMarker.focus());
  expect(screen.getByRole("tooltip")).toHaveTextContent("Points are written like this: (1, 2).");
  act(() => cellMarker.blur());
  expect(screen.queryByRole("tooltip")).toBeNull();

  // A header's own error: the marker is in its column header, and its field is described by it.
  const headerMarkers = markers.filter((m) => m.closest('[role="columnheader"]') !== null);
  expect(headerMarkers).toHaveLength(2);
  for (const [marker, name] of [
    [headerMarkers[0], "Column 1 header"],
    [headerMarkers[1], "Column 3 header"],
  ] as const) {
    const header = box(name);
    expect(header).toHaveAttribute("aria-invalid", "true");
    expect(marker.closest('[role="columnheader"]')).toContainElement(header);
    expect(header.getAttribute("aria-describedby")).toBe(marker.getAttribute("aria-describedby"));
    act(() => marker.focus());
    expect(screen.getByRole("tooltip")).toHaveTextContent(analysis[2].error!.message);
    act(() => marker.blur());
  }
  expect(box("Column 2 header")).not.toHaveAttribute("aria-invalid");
});

it("RT-6, TABLES-28 29 data rows collapse to rows 1-7, 18 more rows, the last 4; Show all expands", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const xs = Array.from({ length: 29 }, (_, i) => String(i + 1));
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: xs },
        { latex: "y_{1}", values: xs },
      ],
    })
  );
  expect(screen.getByText("18 more rows")).toBeInTheDocument();
  const shown = () =>
    screen
      .getAllByRole("textbox", { name: /^x₁, row \d+/ })
      .map((b) => b.getAttribute("aria-label"));
  expect(shown()).toEqual([
    ...[1, 2, 3, 4, 5, 6, 7, 26, 27, 28, 29].map((r) => `x₁, row ${r}`),
    "x₁, row 30, blank",
  ]);
  act(() => screen.getByRole("button", { name: "Show all" }).click());
  expect(screen.queryByText("18 more rows")).toBeNull();
  expect(shown()).toHaveLength(30);
});

it("RT-6 28 data rows show in full", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const xs = Array.from({ length: 28 }, (_, i) => String(i + 1));
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: xs },
        { latex: "y_{1}", values: xs },
      ],
    })
  );
  expect(screen.queryByText(/more rows/)).toBeNull();
});

it("RT-28 the column menu's Add Regression is greyed on a column that cannot be regressed and gone once a regression exists", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2", "3"] },
        { latex: "y_{1}", values: ["3", "5", "10"] },
        { latex: "y_{2}", values: ["1", "", ""] },
      ],
    })
  );
  await screen.findByRole("button", { name: "Add Regression" });
  fireEvent.contextMenu(screen.getByRole("button", { name: "Points for y₂" }));
  const menu = screen.getByRole("dialog", { name: "Style for y₂" });
  const greyed = within(menu).getByRole("button", { name: "Add Regression" });
  expect(greyed).toHaveAttribute("aria-disabled", "true");
  act(() => greyed.click());
  expect(kit.engine.getExpressions().find((s) => s.id === "t")!.regression).toBeUndefined();
  act(() => screen.getAllByRole("button", { name: "Add Regression" })[0].click());
  fireEvent.keyDown(menu, { key: "Escape" });
  fireEvent.contextMenu(screen.getByRole("button", { name: "Points for y₁" }));
  const second = screen.getByRole("dialog", { name: "Style for y₁" });
  expect(within(second).queryByRole("button", { name: "Add Regression" })).toBeNull();
});
