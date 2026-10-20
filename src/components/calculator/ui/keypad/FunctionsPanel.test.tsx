// @vitest-environment jsdom
// Testing Library's ByRoleOptions has no `exact` (that option is Playwright's): a string `name`
// already matches the whole accessible name, so `panelButton` drops the plan's `exact: true`.
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CATEGORY_HEADINGS, panelCategories } from "@/lib/calculator/core/latex/operator-names";
import { ExpressionPanel } from "../list/ExpressionPanel";
import { panelProps, renderEditor } from "../list/__fixtures__/render-editor";
import { fieldTextbox } from "../list/row-model";
import { Keypad } from "./Keypad";

const editor = () => (
  <>
    <ExpressionPanel {...panelProps({ keypadOpen: true })} />
    <Keypad containerWidth={900} layout="desktop" pointer="fine" open onOpenChange={vi.fn()} />
  </>
);
const key = (name: string) => screen.getByRole("button", { name });

afterEach(() => vi.useRealTimers());
const panelButton = (name: string) =>
  within(screen.getByRole("group", { name: "Functions" })).getByRole("button", { name });

it("K-4 Functions panel shows the shipped categories 1, 2 and 8 in K-4 order under CATEGORY_HEADINGS, category 8 holding exp, ln, log, logₐ only", async () => {
  expect(panelCategories().map((c) => c.id)).toEqual([1, 2, 8]);
  expect([CATEGORY_HEADINGS[0], CATEGORY_HEADINGS[1], CATEGORY_HEADINGS[7]]).toEqual([
    "Trig",
    "Inverse trig",
    "Calculus",
  ]);
  renderEditor(editor(), { rows: [""] });
  await userEvent.setup().click(key("Functions"));
  const panel = screen.getByRole("group", { name: "Functions" });
  expect(
    within(panel)
      .getAllByRole("heading")
      .map((h) => h.textContent)
  ).toEqual(["Trig Functions", "Inverse Trig Functions", "Calculus"]); // shown upper case
  const labels = (heading: string) =>
    within(within(panel).getByRole("group", { name: heading }))
      .getAllByRole("button")
      .map((b) => b.textContent);
  expect(labels("Trig")).toEqual(["sin", "cos", "tan", "csc", "sec", "cot"]);
  expect(labels("Inverse trig")).toEqual(["sin−1", "cos−1", "tan−1", "csc−1", "sec−1", "cot−1"]);
  expect(labels("Calculus")).toEqual(["exp", "ln", "log", "loga"]); // −1 and a are typeset
});

it("VIS-KEYPAD-41 the Functions panel is the same popover above the keypad at every width", async () => {
  for (const width of [449, 900]) {
    renderEditor(
      <Keypad
        containerWidth={width}
        layout="desktop"
        pointer="coarse"
        open
        onOpenChange={vi.fn()}
      />,
      { rows: [""] }
    );
    await userEvent.setup().click(key("Functions"));
    const panel = screen.getByRole("group", { name: "Functions" });
    expect(panel.closest(".kc-keypad-keys")).not.toBeNull();
    expect(panel).not.toHaveAttribute("data-placement");
    cleanup();
  }
});

it("A11Y-5 the Functions panel is a group named Functions, one heading per category, buttons named by their spoken text", async () => {
  renderEditor(editor(), { rows: [""] });
  await userEvent.setup().click(key("Functions"));
  const panel = screen.getByRole("group", { name: "Functions" });
  expect(key("Functions")).toHaveAttribute("aria-expanded", "true");
  expect(key("Functions")).toHaveAttribute("aria-controls", panel.id);
  for (const category of panelCategories()) {
    const group = within(panel).getByRole("group", { name: category.heading });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label"))
    ).toEqual(category.entries.map((e) => e.spoken));
  }
});

it("K-5 a panel button inserts its template in one run call, closes the panel and returns focus to the row; Escape returns to the Functions key", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  const [trig, , calculus] = panelCategories();
  await user.click(key("Functions"));
  field.calls = [];
  await user.click(key(trig.entries[0].spoken));
  expect(field.calls).toEqual([
    {
      method: "run",
      arg: [
        { op: "write", arg: "\\sin\\left(\\right)" },
        { op: "keystroke", arg: "Left" },
      ],
    },
    { method: "focus", arg: undefined },
  ]);
  expect(key("Functions")).toHaveAttribute("aria-expanded", "false");
  expect(fieldTextbox(field)).toHaveFocus();
  await user.click(key("Functions"));
  field.calls = [];
  await user.click(key(calculus.entries[3].spoken));
  expect(field.calls[0]).toEqual({
    method: "run",
    arg: [
      { op: "cmd", arg: "\\log" },
      { op: "cmd", arg: "_" },
    ],
  });
  await user.click(key("Functions"));
  within(screen.getByRole("group", { name: "Functions" }))
    .getAllByRole("button")[0]
    .focus();
  act(() => kit.pressEscape()); // one press closes only the panel, above the keypad
  expect(screen.queryByRole("group", { name: "Functions" })).toBeNull();
  expect(key("Functions")).toHaveFocus();
  expect(screen.getByRole("region", { name: "Keypad" })).toBeInTheDocument();
});

it("K-5 every shipped entry of categories 1, 2 and 8 inserts its own template in one run call and closes the panel", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  const entries = panelCategories().flatMap((c) => c.entries);
  expect(entries).toHaveLength(16);
  for (const entry of entries) {
    await user.click(key("Functions"));
    field.calls = [];
    await user.click(panelButton(entry.spoken));
    expect(field.calls[0]).toEqual({ method: "run", arg: entry.actions });
    expect(screen.queryByRole("group", { name: "Functions" })).toBeNull();
    expect(fieldTextbox(field)).toHaveFocus();
  }
});

//  T-9 browser test runs these actions in a real MathField, types x and gets \sin\left(x\right).
it("T-9 the functions panel's sin button inserts \\sin\\left(\\right) with the caret inside, so typing x gives \\sin\\left(x\\right)", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  const sin = panelCategories()[0].entries[0];
  expect(sin.actions).toEqual([
    { op: "write", arg: "\\sin\\left(\\right)" },
    { op: "keystroke", arg: "Left" },
  ]);
  await user.click(key("Functions"));
  field.calls = [];
  await user.click(panelButton(sin.spoken));
  expect(field.calls.filter((c) => c.method === "run")).toEqual([
    { method: "run", arg: sin.actions },
  ]);
});

// No spec ID: AN-2's owning test is a browser test.
it("Functions panel lifecycle: a closing panel is inert at once and unmounts after its closing duration", () => {
  vi.useFakeTimers();
  renderEditor(editor(), { rows: [""], durationMs: 100 });
  fireEvent.click(key("Functions"));
  const panel = screen.getByRole("group", { name: "Functions" });
  expect(panel).toHaveAttribute("data-state", "open");
  expect(panel).not.toHaveAttribute("inert");
  fireEvent.click(key("Functions"));
  expect(panel).toHaveAttribute("data-state", "closing");
  expect(panel).toHaveAttribute("inert");
  expect(key("Functions")).toHaveAttribute("aria-expanded", "false");
  act(() => vi.advanceTimersByTime(99));
  expect(panel).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(panel).not.toBeInTheDocument();
});

it("KB-3 switching to the letters page closes the Functions panel at once with its Escape layer; the next Escape closes the letters page", () => {
  const kit = renderEditor(editor(), { rows: [""], durationMs: 100 });
  fireEvent.click(key("Functions"));
  expect(screen.getByRole("group", { name: "Functions" })).toBeInTheDocument();
  fireEvent.click(key("ABC"));
  // No closing duration: the reference's popover is gone with the page switch.
  expect(screen.queryByRole("group", { name: "Functions" })).toBeNull();
  const keypad = screen.getByRole("region", { name: "Keypad" });
  expect(keypad).toHaveAttribute("data-page", "letters");
  act(() => kit.pressEscape());
  expect(keypad).toHaveAttribute("data-page", "main");
  expect(keypad).toHaveAttribute("data-open", "true");
  // Back on the main page the panel stays shut until the Functions key opens it again.
  expect(key("Functions")).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("group", { name: "Functions" })).toBeNull();
});
