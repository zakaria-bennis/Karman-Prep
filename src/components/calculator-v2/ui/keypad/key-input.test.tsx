// @vitest-environment jsdom
// Testing Library's ByRoleOptions has no `exact` (that option is Playwright's): a string `name`
// already matches the whole accessible name, so `x` never finds a longer name.
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator-v2/core/latex/limits";
import { ExpressionPanel } from "../list/ExpressionPanel";
import type { FakeCall } from "../list/__fixtures__/fake-math-field";
import { panelProps, renderEditor } from "../list/__fixtures__/render-editor";
import { EDITOR_MESSAGES } from "../list/messages";
import { performUndo } from "../list/row-actions";
import { fieldTextbox } from "../list/row-model";
import { Keypad } from "./Keypad";

afterEach(() => vi.useRealTimers());
const editor = () => (
  <>
    <ExpressionPanel {...panelProps({ keypadOpen: true })} />
    <Keypad containerWidth={900} pointer="fine" open onOpenChange={vi.fn()} />
  </>
);
const key = (name: string) => screen.getByRole("button", { name });

it("K-10 each key inserts through exactly one adapter call and focus stays in the row", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  const cases: [string, FakeCall][] = [
    ["x", { method: "typedText", arg: "x" }],
    ["7", { method: "typedText", arg: "7" }],
    ["Multiply", { method: "typedText", arg: "*" }],
    ["Divide", { method: "typedText", arg: "/" }],
    ["Squared", { method: "write", arg: "^2" }],
    ["Power", { method: "cmd", arg: "^" }],
    ["Square root", { method: "cmd", arg: "\\sqrt" }],
    ["Absolute value", { method: "cmd", arg: "|" }],
    ["Less than or equal to", { method: "cmd", arg: "\\le" }],
    ["Pi", { method: "cmd", arg: "\\pi" }],
    ["Left arrow", { method: "keystroke", arg: "Left" }],
    ["Backspace", { method: "keystroke", arg: "Backspace" }],
  ];
  for (const [name, call] of cases) {
    field.calls = [];
    await user.click(key(name));
    expect(field.calls).toEqual([call]);
    expect(fieldTextbox(field)).toHaveFocus();
  }
  await user.click(key("Enter"));
  expect(kit.engine.getSnapshot().rows).toHaveLength(2);
  expect(fieldTextbox(kit.fields.forRow("2"))).toHaveFocus();
});

it("K-9 the audio key starts and stops the keyboard trace of the keypad's row without editing it", async () => {
  const kit = renderEditor(editor(), { rows: ["y=x"] });
  const field = kit.fields.forRow("1");
  act(() => kit.focus.focusRow("1", "end"));
  field.calls = [];
  const user = userEvent.setup();
  await user.click(key("Audio trace"));
  expect(kit.trace.state?.rowId).toBe("1");
  expect(key("Audio trace")).toHaveAttribute("aria-pressed", "true");
  key("Audio trace").focus();
  await user.keyboard("{Enter}");
  expect(kit.trace.state).toBeNull();
  const edits = ["write", "cmd", "typedText", "run", "latex"];
  expect(field.calls.filter((c) => edits.includes(c.method))).toEqual([]); // stopping refocuses the row
});

it("K-3 Shift capitalises the next letter only", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  await user.click(key("ABC"));
  await user.click(key("Shift"));
  field.calls = [];
  await user.click(key("Q"));
  await user.click(key("w"));
  expect(field.calls).toEqual([
    { method: "typedText", arg: "Q" },
    { method: "typedText", arg: "w" },
  ]);
  expect(key("Shift")).toHaveAttribute("aria-pressed", "false");
});

it("K-7, A11Y-2 a second = within 300 ms becomes ~ in one undo step and is announced as tilde", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  await user.click(key("y"));
  await user.click(key("Equals"));
  field.calls = [];
  await user.click(key("Equals"));
  expect(field.calls).toEqual([
    {
      method: "run",
      arg: [
        { op: "keystroke", arg: "Backspace" },
        { op: "typedText", arg: "~" },
      ],
    },
  ]);
  expect(kit.engine.getSnapshot().rows[0].latex).toBe("y~");
  expect(kit.announcer.texts).toContain(EDITOR_MESSAGES.tilde);
  act(() => performUndo(kit.engine, kit.announcer));
  expect(kit.engine.getSnapshot().rows[0].latex).toBe("y=");
  for (const name of ["x", "Equals", "x", "Equals"]) await user.click(key(name));
  expect(kit.engine.getSnapshot().rows[0].latex).toBe("y=x=x=");
});

it("K-11 Backspace repeats while held, after 400 ms then every 80 ms, and marks the press for tone feedback", () => {
  vi.useFakeTimers();
  const kit = renderEditor(editor(), { rows: ["123456"] });
  const field = kit.fields.forRow("1");
  act(() => kit.focus.focusRow("1", "end"));
  field.calls = [];
  const backspace = key("Backspace");
  fireEvent.pointerDown(backspace, { pointerType: "mouse" });
  expect(backspace).toHaveAttribute("data-pressed", "true");
  act(() => vi.advanceTimersByTime(399));
  expect(field.calls).toHaveLength(1);
  act(() => vi.advanceTimersByTime(81));
  expect(field.calls).toHaveLength(3);
  fireEvent.pointerUp(backspace);
  fireEvent.click(backspace);
  act(() => vi.advanceTimersByTime(500));
  expect(field.calls).toHaveLength(3);
  expect(backspace).not.toHaveAttribute("data-pressed");
});

it("T-13, NM-42 a keypad key at the 2,048-character limit is refused with the status message and leaves the row unchanged", async () => {
  const long = "1".repeat(MAX_ROW_CHARACTERS);
  const kit = renderEditor(editor(), { rows: [long] });
  act(() => kit.focus.focusRow("1", "end"));
  await userEvent.setup().click(key("7"));
  expect(kit.engine.getSnapshot().rows[0].latex).toBe(long);
  expect(kit.announcer.texts).toContain(EDITOR_MESSAGES.charLimit);
});
