// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { ExpressionPanel } from "./ExpressionPanel";
import { panelProps, renderEditor } from "./__fixtures__/render-editor";

type Kit = ReturnType<typeof renderEditor>;
const tab = (n: number) => screen.getByRole("button", { name: `Hide: Expression ${n}` });
const rows = (kit: Kit) => kit.engine.getSnapshot().rows;

function createTable(n: number) {
  fireEvent.contextMenu(screen.getByRole("textbox", { name: `Expression ${n}` }));
  const menu = screen.getByRole("menu", { name: `Options for expression ${n}` });
  fireEvent.click(within(menu).getByRole("menuitem", { name: "Create table" }));
}

it("D-13 Create table from y=x^2 inserts x1 -2 to 2 and a computed x1^2 column in the row's colour", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x^{2}"] });
  await waitFor(() => expect(tab(1)).toBeInTheDocument());
  createTable(1);
  const table = rows(kit)[1];
  expect(table.type).toBe("table");
  expect(table.columns!.map((c) => c.latex)).toEqual(["x_{1}", "x_{1}^{2}"]);
  expect(table.columns!.every((c) => c.color === rows(kit)[0].color)).toBe(true);
  await waitFor(() =>
    expect(
      screen.getByRole("gridcell", { name: "x₁ squared, row 1, computed, 4" })
    ).toBeInTheDocument()
  );
});

it("D-13 f(x)=E heads the computed column f(x1)", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["f\\left(x\\right)=3x"],
  });
  createTable(1); // a function definition has no gutter tab; right-click on the row opens it
  expect(rows(kit)[1].columns![1].latex).toBe("f\\left(x_{1}\\right)");
});

it("D-13 a toast says Table created. with Undo, is announced, and focus selects the first x cell", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  await waitFor(() => expect(tab(1)).toBeInTheDocument());
  const select = () => kit.fields.byLabel("x₁, row 1").calls;
  createTable(1);
  expect(screen.getByRole("textbox", { name: "x₁, row 1" })).toHaveFocus();
  expect(select().some((c) => c.method === "focus")).toBe(true);
  expect(screen.getByText("Table created.")).toBeInTheDocument();
  expect(kit.announcer.texts.at(-1)).toBe("Table created. Undo is available.");
  const toast = screen.getByText("Table created.").closest<HTMLElement>("[data-toast]")!;
  act(() => within(toast).getByRole("button", { name: "Undo" }).click());
  expect(rows(kit)).toHaveLength(1);
  expect(screen.queryByText("Table created.")).toBeNull();
});

it("D-13 a row with no function opens no menu, and Escape closes the menu back to the tab", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["x=3", "y=x"] });
  await waitFor(() => expect(tab(1)).toBeInTheDocument());
  expect(fireEvent.contextMenu(tab(1))).toBe(true); // not cancelled: the browser's menu shows
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.keyDown(tab(2), { key: "F10", shiftKey: true });
  expect(screen.getByRole("menuitem", { name: "Create table" })).toHaveFocus();
  act(() => kit.pressEscape());
  expect(screen.queryByRole("menu")).toBeNull();
  expect(tab(2)).toHaveFocus();
});
