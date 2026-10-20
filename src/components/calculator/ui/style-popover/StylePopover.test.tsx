// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ExpressionPanel } from "../list/ExpressionPanel";
import { LONG_PRESS_MS } from "../list/menu-trigger";
import { panelProps, renderEditor } from "../list/__fixtures__/render-editor";

const tab = (name: string) => screen.getByRole("button", { name });
const stored = (kit: ReturnType<typeof renderEditor>, id: string) =>
  kit.engine.getExpressions().find((e) => e.id === id)!;

async function openWithShiftEnter(name: string) {
  await waitFor(() => expect(tab(name)).toBeInTheDocument());
  act(() => {
    fireEvent.keyDown(tab(name), { key: "Enter", shiftKey: true });
  });
  return screen.getByRole("region", { name: "Options Menu" });
}

it("STYLES-20, -22, -24 Shift+Enter on a curve's icon opens Lines, the line styles and the colour tiles; Escape returns to the icon", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const menu = await openWithShiftEnter("Hide expression 1");
  expect(tab("Hide options: expression 1")).toHaveAttribute("aria-expanded", "true");
  expect(within(menu).getByRole("checkbox", { name: "Lines visible" })).toHaveFocus();
  const style = within(menu).getByRole("radiogroup", { name: "Style" });
  expect(
    within(style)
      .getAllByRole("radio")
      .map((r) => r.getAttribute("aria-label"))
  ).toEqual(["Solid", "Dashed", "Dotted"]);
  const user = userEvent.setup();
  await user.click(within(style).getByRole("radio", { name: "Dashed" }));
  expect(stored(kit, "1").lineStyle).toBe("dashed");
  const picker = within(menu).getByRole("group", { name: "Color Picker" });
  const tiles = within(within(picker).getByRole("listbox", { name: "Standard" })).getAllByRole(
    "option"
  );
  expect(tiles.map((t) => t.getAttribute("aria-label"))).toEqual([
    "red",
    "blue",
    "green",
    "orange",
    "purple",
    "black",
  ]);
  await user.click(tiles[3]);
  expect(stored(kit, "1").color).toBe("c5");
  expect(tiles[3]).toHaveAttribute("aria-selected", "true");
  kit.engine.undo();
  expect(stored(kit, "1").color).not.toBe("c5"); // STYLES-49: one undo step
  act(() => kit.pressEscape());
  expect(screen.queryByRole("region", { name: "Options Menu" })).toBeNull();
  expect(tab("Hide expression 1")).toHaveFocus();
});

it("STYLES-29 Lines off hides the row and leaves only the heading", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const menu = await openWithShiftEnter("Hide expression 1");
  await userEvent.setup().click(within(menu).getByRole("checkbox", { name: "Lines visible" }));
  expect(stored(kit, "1").hidden).toBe(true);
  expect(within(menu).queryByRole("radiogroup", { name: "Style" })).toBeNull();
});

it("STYLES-22 a point offers Points and its shapes", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["(1,2)"] });
  const menu = await openWithShiftEnter("Hide expression 1");
  expect(within(menu).getByRole("checkbox", { name: "Points visible" })).toBeChecked();
  await userEvent.setup().click(within(menu).getByRole("radio", { name: "Open" }));
  expect(stored(kit, "1").pointStyle).toBe("open");
});

it("STYLES-18, -20, -21 a short click hides; a long-press opens without hiding; a click on the open icon closes it", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
    await waitFor(() => expect(tab("Hide expression 1")).toBeInTheDocument());
    fireEvent.click(tab("Hide expression 1"));
    expect(stored(kit, "1").hidden).toBe(true);
    fireEvent.click(tab("Show expression 1"));
    const icon = tab("Hide expression 1");
    fireEvent.pointerDown(icon);
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS + 10);
    });
    fireEvent.pointerUp(icon);
    fireEvent.click(icon);
    expect(screen.getByRole("region", { name: "Options Menu" })).toBeInTheDocument();
    expect(stored(kit, "1").hidden).toBe(false);
    fireEvent.click(tab("Hide options: expression 1"));
    expect(screen.queryByRole("region", { name: "Options Menu" })).toBeNull();
    expect(stored(kit, "1").hidden).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

it("STYLES-20 in Edit list mode a click on the icon opens the options", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Edit list" }));
  await user.click(tab("Show options: expression 1"));
  expect(screen.getByRole("region", { name: "Options Menu" })).toBeInTheDocument();
});
