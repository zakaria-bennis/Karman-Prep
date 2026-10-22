// @vitest-environment jsdom
// R-5 click to copy (owner, 2026-10-22): a row's value is a "Copy value" button that copies the
// value as shown, shows a check and "Copied" beside it for 1.2 s and announces "Copied"; and T-7's
// "% of" rows evaluate and parse as on Desmos.
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { panelProps, renderEditor, rowItem, textbox } from "./__fixtures__/render-editor";
import { copiedValueText, copyText } from "./copy-value";
import { ExpressionPanel } from "./ExpressionPanel";
import { COPIED_FADE_MS, COPIED_SHOW_MS } from "./RowValue";

const flush = () => act(async () => undefined);

function stubClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: spy }, configurable: true });
  return spy;
}

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
});

const copyButton = (rowId: string) =>
  within(rowItem(rowId)).findByRole("button", { name: "Copy value" });
const note = (rowId: string) => rowItem(rowId).querySelector(".kc-row-copied");

it("T-7 5% of 40 evaluates to 2, and [5% of a,b] parses, offering sliders for a and b", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["5\\%\\operatorname{of}40", "\\left[5\\%\\operatorname{of}a,b\\right]"],
  });
  await copyButton("1");
  const [pct, list] = kit.engine.getSnapshot().rows;
  expect(pct.valueText).toBe("2");
  expect(rowItem("1").querySelector(".kc-row-value-box")).toHaveTextContent("2");
  expect(list.error?.code).toBe("too-many-variables");
  expect(list.chips).toEqual(["a", "b"]);
  const line = within(within(rowItem("2")).getByRole("group", { name: "add slider:" }));
  expect(line.getAllByRole("button").map((b) => b.textContent)).toEqual(["a", "b", "all"]);
});

it("R-5 a click copies the value as shown, shows Copied with a check beside it, announces it, and fades after 1.2 s", async () => {
  const writeText = stubClipboard(() => Promise.resolve());
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["12340+5", "y=x"] });
  const button = await copyButton("1");
  vi.useFakeTimers();
  fireEvent.click(button);
  await flush();
  expect(writeText).toHaveBeenCalledWith("12345"); // shown as 12 345, copied without the thin space
  expect(note("1")).toHaveTextContent("Copied");
  expect(note("1")).toHaveAttribute("data-phase", "shown");
  expect(note("1")).toHaveAttribute("aria-hidden", "true");
  expect(note("1")!.querySelector("svg")).not.toBeNull();
  expect(kit.announcer.texts).toContain("Copied");
  // the note follows the value, inside the value line
  const line = rowItem("1").querySelector(".kc-row-value-line")!;
  expect([...line.children].map((c) => c.className)).toEqual([
    "kc-row-value-copy",
    "kc-row-copied",
  ]);
  act(() => vi.advanceTimersByTime(COPIED_SHOW_MS));
  expect(note("1")).toHaveAttribute("data-phase", "leaving");
  act(() => vi.advanceTimersByTime(COPIED_FADE_MS));
  expect(note("1")).toBeNull();
  // the textbox's description is still just the value
  expect(textbox(1)).toHaveAccessibleDescription(/equals 12345/);
  expect(textbox(1)).not.toHaveAccessibleDescription(/Copy value/);
});

it("R-5 a row shown as a fraction copies the fraction; the fraction toggle beside it never copies", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["\\frac{7}{12}"] });
  const user = userEvent.setup();
  const writeText = stubClipboard(() => Promise.resolve()); // after setup, which stubs its own
  await copyButton("1");
  const toggle = rowItem("1").querySelector<HTMLElement>(".kc-row-fraction")!;
  await user.click(toggle);
  expect(writeText).not.toHaveBeenCalled();
  expect(note("1")).toBeNull();
  expect(rowItem("1").querySelector(".kc-row-value-fraction")).not.toBeNull();
  await user.click(await copyButton("1"));
  await flush();
  expect(writeText).toHaveBeenCalledWith("7/12");
  expect(writeText).toHaveBeenCalledTimes(1);
});

it("R-5 Enter or Space on the focused value copies it; a pointer press keeps focus in the math", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["1+1"] });
  const user = userEvent.setup();
  const writeText = stubClipboard(() => Promise.resolve()); // after setup, which stubs its own
  const button = await copyButton("1");
  act(() => button.focus());
  await user.keyboard("{Enter}");
  await flush();
  expect(writeText).toHaveBeenLastCalledWith("2");
  await user.keyboard(" ");
  await flush();
  expect(writeText).toHaveBeenCalledTimes(2);
  expect(button).toHaveFocus();
  // a mouse press is cancelled, so focus stays where it was
  expect(fireEvent.mouseDown(button)).toBe(false);
});

it("R-5 a failed copy shows nothing, announces nothing and does not throw", async () => {
  const writeText = stubClipboard(() => Promise.reject(new Error("denied")));
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["1+1"] });
  fireEvent.click(await copyButton("1"));
  await flush();
  expect(writeText).toHaveBeenCalled();
  expect(note("1")).toBeNull();
  expect(kit.announcer.texts).not.toContain("Copied");
});

it("copyText falls back to execCommand(copy) without the async clipboard and restores focus", async () => {
  const exec = vi.fn(() => true);
  Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
  const input = document.createElement("input");
  document.body.append(input);
  input.focus();
  expect(await copyText("42")).toBe(true);
  expect(exec).toHaveBeenCalledWith("copy");
  expect(document.activeElement).toBe(input);
  expect(document.querySelector("textarea[aria-hidden]")).toBeNull();
  exec.mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(await copyText("42")).toBe(false);
  input.remove();
});

it("copiedValueText joins a list's shown boxes and writes a fraction as n/d", () => {
  expect(copiedValueText(["1", "2", "…"], null)).toBe("1, 2, …");
  expect(copiedValueText(["0.125"], { n: -1, d: 8 })).toBe("-1/8");
});

it("R-5 on a touch tap the value copies too", async () => {
  const writeText = stubClipboard(() => Promise.resolve());
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["3\\cdot4"] });
  const button = await copyButton("1");
  fireEvent.pointerDown(button, { pointerType: "touch" });
  fireEvent.click(button);
  await flush();
  expect(writeText).toHaveBeenCalledWith("12");
  expect(screen.getByText("Copied")).toBeInTheDocument();
});
