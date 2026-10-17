// @vitest-environment jsdom
import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { MAX_ROW_CHARACTERS, MAX_ROWS } from "@/lib/calculator-v2/core/latex/limits";
import { panelProps, renderEditor, textbox, type EditorKit } from "./__fixtures__/render-editor";
import { ExpressionPanel } from "./ExpressionPanel";
import { EDITOR_MESSAGES } from "./messages";

const toolbarNames = () =>
  within(screen.getByRole("toolbar", { name: "List tools" }))
    .getAllByRole("button")
    .map((b) => b.getAttribute("aria-label"));
const latexes = (kit: EditorKit) => kit.engine.getSnapshot().rows.map((r) => r.latex);

it("KB-2 Undo and Redo follow Add item in each toolbar and are aria-disabled at the ends of the stack", () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: [""] });
  expect(toolbarNames()).toEqual(["Add item", "Undo", "Redo", "Edit list", "Collapse list"]);
  cleanup();
  renderEditor(<ExpressionPanel {...panelProps({ layout: "stacked" })} />, { rows: [""] });
  expect(toolbarNames()).toEqual([
    "Add item",
    "Keypad",
    "Undo",
    "Redo",
    "Edit list",
    "Collapse list",
  ]);
  expect(screen.getByRole("button", { name: "Undo" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("button", { name: "Redo" })).toHaveAttribute("aria-disabled", "true");
});

it("KB-2 typing in one row is one undo step until 1,000 ms without edits or a focus change", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["", ""] });
  const [f1, f2] = [kit.fields.forRow("1"), kit.fields.forRow("2")];
  expect(kit.clock.now).toBe(0);
  act(() => {
    kit.focus.focusRow("1", "end");
    f1.emitEdit("a"); // t = 0
    kit.clock.now = 999;
    f1.emitEdit("ab"); // 999 ms after the last edit: the same step
    kit.clock.now = 1998;
    f1.emitEdit("abc"); // 999 ms after "ab" (1,998 after the step began): still the same step
    kit.clock.now = 2998;
    f1.emitEdit("abcd"); // exactly 1,000 ms after "abc": a new step
    kit.focus.focusRow("2", "end");
    kit.clock.now = 3000;
    f2.emitEdit("z"); // after a focus change: a new step
    kit.focus.focusRow("1", "end");
    kit.clock.now = 3100;
    f1.emitEdit("abcde"); // after another focus change, 102 ms after "abcd": a new step
  });
  const user = userEvent.setup();
  const undo = screen.getByRole("button", { name: "Undo" });
  for (const expected of [
    ["abcd", "z"],
    ["abcd", ""],
    ["abc", ""],
    ["", ""],
  ]) {
    await user.click(undo);
    expect(latexes(kit)).toEqual(expected);
  }
  expect(f1.latex()).toBe("");
  expect(undo).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByRole("button", { name: "Redo" }));
  expect(latexes(kit)).toEqual(["abc", ""]);
});

it("R-10 Clear all and setBlank leave exactly one empty row numbered 1, and Clear all focuses it", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", "a=2", "y=a"] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Edit list" }));
  expect(screen.getByRole("button", { name: "Edit list" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Clear all expressions" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(latexes(kit)).toEqual([""]);
  expect(textbox(1)).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.getByRole("button", { name: "Edit list" })).toHaveFocus();
  expect(screen.queryByRole("button", { name: "Clear all expressions" })).toBeNull();
  act(() => {
    kit.engine.setExpressions([
      { id: "1", latex: "y=x" },
      { id: "2", latex: "y=2" },
    ]);
    kit.engine.setBlank();
  });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(document.querySelector(".kc-row-number")!.textContent).toBe("1");
});

it("T-13, NM-42 a typed edit past 2,048 characters is refused with a status message and leaves the row unchanged", () => {
  const long = "1".repeat(MAX_ROW_CHARACTERS);
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: [long] });
  const field = kit.fields.forRow("1");
  act(() => field.emitEdit(`${long}2`));
  expect(latexes(kit)).toEqual([long]);
  expect(field.latex()).toBe(long);
  act(() => field.options.onRefused("char-limit"));
  expect(kit.announcer.texts).toEqual([EDITOR_MESSAGES.charLimit, EDITOR_MESSAGES.charLimit]);
});

it("A11Y-2 the row limit, Clear all, Undo and Redo are announced through the status region, never role=alert", async () => {
  const rows = Array.from({ length: MAX_ROWS }, (_, i) => `a_{${i}}=${i}`);
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add item" }));
  expect(kit.engine.getSnapshot().rows).toHaveLength(MAX_ROWS);
  await user.click(screen.getByRole("button", { name: "Edit list" }));
  await user.click(screen.getByRole("button", { name: "Clear all expressions" }));
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await user.click(screen.getByRole("button", { name: "Redo" }));
  expect(kit.announcer.texts.filter((t) => !t.startsWith("Expression "))).toEqual([
    EDITOR_MESSAGES.rowLimit,
    EDITOR_MESSAGES.clearAll,
    EDITOR_MESSAGES.undone,
    EDITOR_MESSAGES.redone,
  ]);
  expect(document.querySelector('[role="alert"]')).toBeNull();
});
