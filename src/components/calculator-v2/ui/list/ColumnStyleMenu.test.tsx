// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ExpressionPanel } from "./ExpressionPanel";
import { panelProps, renderEditor } from "./__fixtures__/render-editor";

type Kit = ReturnType<typeof renderEditor>;
const icon = () => screen.getByRole("button", { name: "Points for y₁" });
const menu = () => screen.queryByRole("dialog", { name: "Style for y₁" });
const column = (kit: Kit, k = 1) =>
  kit.engine.getSnapshot().rows.find((r) => r.id === "t")!.columns![k];

function withTable() {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2"] },
        { latex: "y_{1}", values: ["3", "4"] },
        { latex: "y_{2}", values: ["5", "6"] },
      ],
    })
  );
  return kit;
}

it("D-12 activating the column icon toggles its points and the icon shows an outline when hidden", async () => {
  const kit = withTable();
  expect(icon()).toHaveAttribute("aria-pressed", "true");
  await userEvent.setup().click(icon());
  expect(column(kit).hidden).toBe(true);
  expect(icon()).toHaveAttribute("aria-pressed", "false");
  expect(icon().querySelector("svg")).toHaveAttribute("data-hidden", "true");
  expect(screen.queryByRole("button", { name: "Points for x₁" })).toBeNull(); // the first column has none
});

it("D-12 long-press, right-click or Shift+F10 opens the style menu with points, shape, lines, line style and colours", () => {
  const kit = withTable();
  fireEvent.contextMenu(icon());
  const dialog = menu()!;
  expect(within(dialog).getByRole("checkbox", { name: "Show points" })).toBeChecked();
  expect(within(dialog).getByRole("checkbox", { name: "Show points" })).toHaveFocus();
  for (const name of ["Filled circle", "Open circle", "Cross", "Solid", "Dashed", "Dotted"])
    expect(within(dialog).getByRole("radio", { name })).toBeInTheDocument();
  expect(within(dialog).getByRole("checkbox", { name: "Connect points" })).not.toBeChecked();
  expect(within(dialog).getAllByRole("radio", { name: /^Colour \d$/ })).toHaveLength(6);
  fireEvent.click(within(dialog).getByRole("radio", { name: "Cross" }));
  expect(column(kit).pointStyle).toBe("cross");
  // F-A1: the swatches follow Desmos's picker order, orange (c5) before purple (c4).
  fireEvent.click(within(dialog).getByRole("radio", { name: "Colour 4" }));
  expect(column(kit).color).toBe("c5");
  fireEvent.click(within(dialog).getByRole("radio", { name: "Colour 5" }));
  expect(column(kit).color).toBe("c4");
  act(() => kit.pressEscape());
  expect(menu()).toBeNull();
  fireEvent.keyDown(icon(), { key: "F10", shiftKey: true });
  expect(menu()).not.toBeNull();
  act(() => kit.pressEscape());
  vi.useFakeTimers();
  try {
    fireEvent.pointerDown(icon(), { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(600));
    expect(menu()).not.toBeNull();
    fireEvent.pointerUp(icon(), { pointerType: "touch" });
    fireEvent.click(icon()); // the click that ends a long-press does not toggle the points
    expect(column(kit).hidden).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

it("D-12 turning lines on joins the column's points in row order", () => {
  const kit = withTable();
  fireEvent.contextMenu(icon());
  fireEvent.click(screen.getByRole("checkbox", { name: "Connect points" }));
  fireEvent.click(screen.getByRole("radio", { name: "Dotted" }));
  expect(column(kit)).toMatchObject({ lines: true, lineStyle: "dotted" });
  act(() => kit.engine.undo());
  expect(column(kit).lineStyle).toBeUndefined();
});

it("D-12 Escape closes the style menu and returns focus to the column icon", () => {
  const kit = withTable();
  fireEvent.contextMenu(icon());
  act(() => kit.pressEscape());
  expect(menu()).toBeNull();
  expect(icon()).toHaveFocus();
});

it("D-9 Delete column in the style menu removes the column and its data, one undo step", () => {
  const kit = withTable();
  fireEvent.contextMenu(icon());
  fireEvent.click(screen.getByRole("button", { name: "Delete column" }));
  expect(kit.engine.getSnapshot().rows.find((r) => r.id === "t")!.columns).toHaveLength(2);
  expect(menu()).toBeNull();
  act(() => kit.engine.undo());
  expect(column(kit).latex).toBe("y_{1}");
});
