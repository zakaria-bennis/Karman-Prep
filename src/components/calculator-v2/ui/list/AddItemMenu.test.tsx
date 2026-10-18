// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ExpressionPanel } from "./ExpressionPanel";
import { panelProps, renderEditor } from "./__fixtures__/render-editor";

const addItem = () => screen.getByRole("button", { name: "Add item" });
const menu = () => screen.queryByRole("menu", { name: "Add item" });
const ids = (kit: ReturnType<typeof renderEditor>) =>
  kit.engine.getSnapshot().rows.map((r) => [r.id, r.type]);

it("S-2 Add item is a menu button whose menu holds Add expression then Add table and nothing else", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: [""] });
  expect(addItem()).toHaveAttribute("aria-haspopup", "menu");
  expect(addItem()).toHaveAttribute("aria-expanded", "false");
  await userEvent.setup().click(addItem());
  expect(addItem()).toHaveAttribute("aria-expanded", "true");
  const items = within(menu()!).getAllByRole("menuitem");
  expect(items.map((i) => i.getAttribute("aria-label"))).toEqual(["Add expression", "Add table"]);
  expect(items.map((i) => i.textContent)).toEqual(["Expression", "Table"]);
  expect(items[0]).toHaveFocus();
  await userEvent.setup().click(addItem());
  expect(menu()).toBeNull();
});

it("S-10 Enter, Space and ArrowDown open the menu with focus on the first item; arrows wrap; Home and End; Tab and Escape close it", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: [""] });
  const user = userEvent.setup();
  for (const key of ["{Enter}", " ", "{ArrowDown}"]) {
    addItem().focus();
    await user.keyboard(key);
    const items = within(menu()!).getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{End}");
    expect(items[1]).toHaveFocus();
    act(() => kit.pressEscape());
    expect(menu()).toBeNull();
    expect(addItem()).toHaveFocus();
  }
  await user.keyboard("{Enter}");
  await user.keyboard("{Tab}");
  expect(menu()).toBeNull();
  expect(addItem()).toHaveFocus();
});

it("S-10 a pointer press outside closes the menu and reaches its target", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const user = userEvent.setup();
  await user.click(addItem());
  await user.click(screen.getByRole("button", { name: "Undo" }));
  expect(menu()).toBeNull();
  await user.click(addItem());
  fireEvent.pointerDown(screen.getByRole("list", { name: "Expressions" }));
  expect(menu()).toBeNull();
  expect(kit.engine.getSnapshot().rows).toHaveLength(1); // the press in the list added no row
});

it("S-11 the menu sits below the button on the desktop layout and to its right on the stacked layout, inside the calculator", async () => {
  renderEditor(<ExpressionPanel {...panelProps({ layout: "desktop" })} />, { rows: [""] });
  await userEvent.setup().click(addItem());
  expect(menu()).toHaveAttribute("data-placement", "below");
  expect(addItem().closest(".kc-list-panel, section, [data-list-state]")?.contains(menu())).toBe(
    true
  );
});

it("S-11 on the stacked layout the menu opens to the right of the button", async () => {
  renderEditor(<ExpressionPanel {...panelProps({ layout: "stacked" })} />, { rows: [""] });
  await userEvent.setup().click(addItem());
  expect(menu()).toHaveAttribute("data-placement", "right");
});

it("S-12 Add expression inserts after the last active row and Add table replaces an empty active row, each one undo step", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", "", "y=2"] });
  const user = userEvent.setup();
  // No row has been active: a new expression goes at the end.
  await user.click(addItem());
  await user.click(screen.getByRole("menuitem", { name: "Add expression" }));
  expect(kit.engine.getSnapshot().rows.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  act(() => kit.focus.activateRow("1"));
  await user.click(addItem());
  await user.click(screen.getByRole("menuitem", { name: "Add expression" }));
  expect(kit.engine.getSnapshot().rows.map((r) => r.id)).toEqual(["1", "5", "2", "3", "4"]);
  act(() => kit.focus.activateRow("2"));
  await user.click(addItem());
  await user.click(screen.getByRole("menuitem", { name: "Add table" }));
  expect(ids(kit)).toEqual([
    ["1", "expression"],
    ["5", "expression"],
    ["2", "table"],
    ["3", "expression"],
    ["4", "expression"],
  ]);
  act(() => kit.engine.undo());
  expect(ids(kit)[2]).toEqual(["2", "expression"]);
});

it("S-13 the inserted item is announced, for example Table 2 added", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  const user = userEvent.setup();
  act(() => kit.focus.activateRow("1"));
  await user.click(addItem());
  await user.click(screen.getByRole("menuitem", { name: "Add table" }));
  expect(kit.announcer.texts.at(-1)).toBe("Table 2 added");
  await user.click(addItem());
  await user.click(screen.getByRole("menuitem", { name: "Add expression" }));
  expect(kit.announcer.texts.at(-1)).toMatch(/^Expression \d added$/);
});
