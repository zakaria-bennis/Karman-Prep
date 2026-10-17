# 05 editor-foundation, part 3 of 4: MathField adapter, announcer and design tokens (Tasks 6 and 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 3 of package `05-editor-foundation.md`, which holds the package header, Package rules,
the file table, Decisions (upstream facts, patches, MathQuill options, the adapter and announcer
contracts, speech text), Notes for the lead and the consumed 02 interfaces; they apply to every
task here. Tasks run in number order across the four parts.

---

### Task 6: The MathField adapter (contract tests; AR-5 additions)

The adapter is what AR-42 describes, but AR-42 is "verified by browser test" and those tests are
Task 8's, so the jsdom and import-scan tests here are titled by contract (`createMathField …`,
`MathField.ts is the only module …`). The two `vendor.test.ts` additions keep AR-5 (owned by
Task 1).

**Files:**

- Create: `src/components/calculator-v2/math-field/MathField.ts`
- Test: `src/components/calculator-v2/math-field/MathField.test.ts` (jsdom); modify `vendor.test.ts`

**Interfaces:** Consumes Tasks 2, 4 and 5; `MathFieldAction` (02); `bumpDevCounter` (02).
Produces exactly 01 section 9:

```ts
// src/components/calculator-v2/math-field/MathField.ts (the only importer of vendor/mathquill)
export interface MathFieldOptions {
  ariaLabel: string; // "Expression n" (A11Y-3)
  maxLength: number; // MAX_ROW_CHARACTERS; longer writes are refused unchanged (T-13)
  onEdit(latex: string): void;
  onEnter(): void;
  onArrowOut(direction: "up" | "down"): void; // caret cannot move further (R-3)
  onDeleteOutOf(direction: "left" | "right"): void; // Backspace or Delete at an edge (R-9)
  onFocus(): void;
  onBlur(): void;
  onRefused(reason: "char-limit"): void;
}
export interface MathField {
  readonly element: HTMLElement;
  focus(): void;
  blur(): void;
  latex(): string;
  latex(value: string): void;
  write(latex: string): void;
  cmd(name: string): void;
  keystroke(keys: string): void;
  typedText(text: string): void;
  run(actions: readonly MathFieldAction[]): void;
  select(): void;
  clearSelection(): void;
  selectedLatex(): string | null; // T-5 copy (13 uses it in the App copy listener)
  reflow(): void; // bumps the "reflows" dev counter
  setInputMode(mode: "none" | "text"): void; // T-11
  speechText(): string; // T-5
  destroy(): void;
}
export function createMathField(host: HTMLElement, options: MathFieldOptions): MathField;
```

Algorithm (bodies the signatures do not determine):

```ts
// one MQ interface per module: MathQuill.getInterface(3), created on first use
// MQ.MathField(span, config) with config: MathQuillConfig =
//   { ...mathQuillOptions(), substituteTextarea, overrideTypedText, overrideKeystroke, handlers }
// transact: every edit except latex(value) goes through it, so onEdit fires once per change
private transact(apply: () => void): void {
  if (this.destroyed) return;
  const before = this.mq.latex();
  this.silent++;
  try { apply(); } finally { this.silent--; }
  const after = this.mq.latex();
  if (after.length > this.options.maxLength) {
    this.silent++;
    try { this.mq.latex(before); } finally { this.silent--; }
    this.options.onRefused("char-limit");
    return;
  }
  if (after !== this.lastLatex) { this.lastLatex = after; this.options.onEdit(after); }
}
// latex(value): silent++, mq.latex(toMathFieldLatex(value)); over maxLength -> restore, onRefused;
//   lastLatex = mq.latex(); never onEdit. write(latex) -> transact(() => mq.write(toMathFieldLatex(latex)))
// run(actions) -> one transact applying each action with the method its op names
// hooks: overrideTypedText(text) -> transact(() => mq.typedText(text));
//   overrideKeystroke(key, event) -> isNativeHistoryChord(key) ? event.preventDefault()
//     : transact(() => mq.keystroke(key, event))
// handlers: edit -> if silent === 0, emit when mq.latex() !== lastLatex; enter -> onEnter;
//   upOutOf/downOutOf -> onArrowOut("up"/"down"); deleteOutOf(dir) -> onDeleteOutOf(dir < 0 ? "left" : "right")
//   (every handler returns early while mq is unassigned or the field is destroyed; creation runs
//   silent and lastLatex starts as "")
// harness and consumers find the textbox as field.element.querySelector("textarea")
// textarea listeners, added in substituteTextarea when it creates the textarea (so before
//   MathQuill binds its own): focus -> onFocus, blur -> onBlur,
//   beforeinput with inputType historyUndo | historyRedo -> preventDefault,
//   copy | cut | paste -> preventDefault (no stopPropagation: 13's capture-phase bridge on the
//   shadow root has already run; MathQuill, configured with disableCopyPaste, never edits on them)
// speechText(): "" for empty LaTeX, else latexToSpeech(latex) || mq.mathspeak().trim()
// destroy(): idempotent; removes the listeners first (no callbacks), then mq.blur(), mq.revert(),
//   element.remove(); afterwards every method is a no-op and latex() returns ""
```

- [ ] **Step 1: Write the failing tests** (`MathField.test.ts`; the directive is its first line)

```ts
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createMathField, type MathField, type MathFieldOptions } from "./MathField";

const mounted: MathField[] = [];
afterEach(() => mounted.splice(0).forEach((f) => f.destroy()));
function mount(overrides: Partial<MathFieldOptions> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const options: MathFieldOptions = {
    ariaLabel: "Expression 1",
    maxLength: 2048,
    onEdit: vi.fn(),
    onEnter: vi.fn(),
    onArrowOut: vi.fn(),
    onDeleteOutOf: vi.fn(),
    onFocus: vi.fn(),
    onBlur: vi.fn(),
    onRefused: vi.fn(),
    ...overrides,
  };
  const field = createMathField(host, options);
  mounted.push(field);
  const textarea = field.element.querySelector("textarea")!;
  return { host, field, options, textarea };
}

it("createMathField: typedText and keystroke edit the field and onEdit fires once per change", () => {
  const { field, options } = mount();
  field.typedText("y=x^2");
  field.keystroke("Right");
  field.typedText("+3/4");
  expect(field.latex()).toBe("y=x^{2}+\\frac{3}{4}");
  expect(options.onEdit).toHaveBeenCalledTimes(2);
  expect(options.onEdit).toHaveBeenLastCalledWith("y=x^{2}+\\frac{3}{4}");
});
it("createMathField: latex(value) loads silently; write, cmd and run edit at the caret", () => {
  const { field, options } = mount();
  field.latex("x+1");
  expect(options.onEdit).not.toHaveBeenCalled();
  field.write("\\frac{1}{2}");
  expect(field.latex()).toBe("x+1\\frac{1}{2}");
  field.latex("");
  field.cmd("\\sqrt");
  field.typedText("x");
  expect(field.latex()).toBe("\\sqrt{x}");
  field.latex("");
  field.run([
    { op: "write", arg: "\\sin\\left(\\right)" },
    { op: "keystroke", arg: "Left" },
  ]);
  expect(options.onEdit).toHaveBeenLastCalledWith("\\sin\\left(\\right)");
  field.typedText("t");
  expect(field.latex()).toBe("\\sin\\left(t\\right)");
  field.latex("\\displaystyle\\tfrac{1}{2}");
  expect(field.latex()).toBe("\\frac{1}{2}");
});
it("createMathField: an edit past maxLength is refused and leaves the field unchanged", () => {
  const { field, options } = mount({ maxLength: 8 });
  field.latex("x+1");
  field.typedText("23456");
  expect(field.latex()).toBe("x+123456"); // exactly 8 characters are accepted
  field.typedText("7");
  expect(field.latex()).toBe("x+123456");
  field.latex("123456789");
  expect(field.latex()).toBe("x+123456");
  expect(options.onRefused).toHaveBeenCalledTimes(2);
  expect(options.onRefused).toHaveBeenCalledWith("char-limit");
  expect(options.onEdit).toHaveBeenCalledTimes(1);
});
it("createMathField: Enter, Up, Down and Backspace or Delete at an edge raise their callbacks", () => {
  const { field, options } = mount();
  field.typedText("\n");
  field.keystroke("Up");
  field.keystroke("Down");
  field.latex("x");
  field.keystroke("Home");
  field.keystroke("Backspace");
  field.keystroke("End");
  field.keystroke("Del");
  expect(options.onEnter).toHaveBeenCalledTimes(1);
  expect(vi.mocked(options.onArrowOut).mock.calls).toEqual([["up"], ["down"]]);
  expect(vi.mocked(options.onDeleteOutOf).mock.calls).toEqual([["left"], ["right"]]);
  expect(field.latex()).toBe("x");
});
it("createMathField: focus, blur and selection work through the adapter", () => {
  const { field, options, textarea } = mount();
  field.focus();
  expect(document.activeElement).toBe(textarea);
  expect(options.onFocus).toHaveBeenCalledTimes(1);
  field.latex("y=x^{2}");
  field.select();
  expect(field.selectedLatex()).toBe("y=x^{2}");
  field.clearSelection();
  expect(field.selectedLatex()).toBeNull();
  field.blur();
  expect(options.onBlur).toHaveBeenCalledTimes(1);
});
it("createMathField: the textarea is named by ariaLabel and setInputMode switches inputmode", () => {
  const { field, textarea } = mount();
  expect(
    ["autocapitalize", "autocorrect", "spellcheck", "inputmode", "aria-label"].map((a) =>
      textarea.getAttribute(a)
    )
  ).toEqual(["off", "off", "false", "text", "Expression 1"]);
  field.setInputMode("none");
  expect(textarea.getAttribute("inputmode")).toBe("none");
  field.typedText("x");
  field.focus();
  field.blur();
  expect(textarea.getAttribute("aria-label")).toBe("Expression 1"); // patch 0004
});
it("createMathField: native undo, redo, copy, cut and paste never reach MathQuill", async () => {
  const { field, textarea } = mount();
  field.typedText("x");
  const fire = (event: Event) => (textarea.dispatchEvent(event), event.defaultPrevented);
  // key, code, keyCode and which are all set (jsdom leaves keyCode and which at 0 otherwise),
  // so the chord reads as Ctrl-Z etc. whichever property MathQuill's key normaliser uses
  const chord = (key: string, modifiers: KeyboardEventInit) => {
    const keyCode = key.toLowerCase() === "z" ? 90 : 89;
    return new KeyboardEvent("keydown", {
      key,
      code: keyCode === 90 ? "KeyZ" : "KeyY",
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    });
  };
  const chords: [string, KeyboardEvent][] = [
    ["Ctrl-Z", chord("z", { ctrlKey: true })],
    ["Meta-Z", chord("z", { metaKey: true })],
    ["Ctrl-Shift-Z", chord("Z", { ctrlKey: true, shiftKey: true })],
    ["Meta-Shift-Z", chord("Z", { metaKey: true, shiftKey: true })],
    ["Ctrl-Y", chord("y", { ctrlKey: true })],
  ];
  for (const [name, event] of chords) expect(fire(event), name).toBe(true);
  expect(
    fire(
      new InputEvent("beforeinput", { inputType: "historyUndo", bubbles: true, cancelable: true })
    )
  ).toBe(true);
  expect(fire(new Event("paste", { bubbles: true, cancelable: true }))).toBe(true);
  // copy and cut with a selection: prevented, and MathQuill neither deletes nor changes the
  // selection (its cut path would act in a setTimeout, so wait one task before reading)
  field.select();
  for (const type of ["copy", "cut"])
    expect(fire(new Event(type, { bubbles: true, cancelable: true })), type).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect([field.latex(), field.selectedLatex()]).toEqual(["x", "x"]);
});
it("createMathField: speechText reads the parser tree and falls back to MathQuill for unparsed input", () => {
  const { field } = mount();
  expect(field.speechText()).toBe("");
  field.latex("y=x^{2}+\\frac{3}{4}");
  expect(field.speechText()).toBe("y equals x squared plus 3 fourths");
  field.latex("x+");
  expect(field.speechText()).toMatch(/plus/);
});
it("createMathField: reflow bumps the reflows counter and destroy is idempotent", () => {
  const { host, field, options } = mount();
  const before = globalThis.__karmanCalculatorCounters?.reflows ?? 0;
  field.reflow();
  expect(globalThis.__karmanCalculatorCounters?.reflows).toBe(before + 1);
  field.destroy();
  field.destroy();
  field.typedText("x");
  expect(host.childElementCount).toBe(0);
  expect(field.latex()).toBe("");
  expect(options.onEdit).not.toHaveBeenCalled();
});
```

(API-15 is checked only by Task 8's browser test in part 4, the contribution that index 5.3
lists.)

Append to `vendor.test.ts`:

```ts
it("AR-5 mathquill.d.ts declares only members MathField.ts calls", () => {
  const dts = read("mathquill.d.ts");
  const body = /interface EditableMathQuill \{([^}]*)\}/.exec(dts)![1];
  const members = [...new Set([...body.matchAll(/^\s+(\w+)\(/gm)].map((m) => m[1]))];
  const adapter = readFileSync("src/components/calculator-v2/math-field/MathField.ts", "utf8");
  for (const name of [...members, "getInterface", "MathField"])
    expect(adapter, name).toMatch(new RegExp(`\\.${name}\\(`));
});
it("MathField.ts is the only module under src/ that imports vendor/mathquill, types included", () => {
  // static `from "…"`, side-effect `import "…"` and dynamic `import("…")` specifiers.
  // Test files and __fixtures__/ are skipped (03's scan rules): 03's seam-boundaries.test.ts
  // and 07's worker/import-graph.test.ts hold vendor/mathquill import strings as synthetic input.
  const SPECIFIER = /(\bfrom|\bimport)\s*\(?\s*["'][^"']*vendor\/mathquill/;
  const importers = (readdirSync("src", { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => !/\.test\.tsx?$/.test(f) && !f.includes("__fixtures__"))
    .map((f) => path.join("src", f))
    .filter((f) => SPECIFIER.test(readFileSync(f, "utf8")));
  expect(importers).toEqual(["src/components/calculator-v2/math-field/MathField.ts"]);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/components/calculator-v2/math-field/MathField.test.ts src/components/calculator-v2/math-field/vendor.test.ts`
Expected: FAIL. `MathField.test.ts` fails with `Failed to resolve import "./MathField"`. In
`vendor.test.ts`, "AR-5 mathquill.d.ts declares only members MathField.ts calls" fails with
`ENOENT: no such file or directory, open 'src/components/calculator-v2/math-field/MathField.ts'`,
and "MathField.ts is the only module under src/ that imports vendor/mathquill, types included"
fails with the diff `expected [] to deeply equal [ 'src/components/calculator-v2/math-field/MathField.ts' ]`
(no importer exists yet). The Tasks 1 to 3 tests still pass.

- [ ] **Step 3: Implement** `MathField.ts`: a private class `KarmanMathField implements MathField`
      built by `createMathField`; `substituteTextarea` creates the textarea with
      `host.ownerDocument.createElement("textarea")` and the attributes of the adapter contract;
      `MathQuill` is imported from `"../../../../vendor/mathquill/mathquill.js"` and its types with
      `import type` from `"../../../../vendor/mathquill/mathquill"` (both in this file only); the
      config passed to `MathField` spreads `mathQuillOptions()` (Task 4) and adds the four hooks.

- [ ] **Step 4: Run them and see them pass**, then `npx tsc --noEmit` and `npm run lint` (PASS).
      If the clipboard test finds the LaTeX or the selection changed after `cut`, MathQuill's own
      handler acted despite `disableCopyPaste`: the adapter's `cut` listener (bound before
      MathQuill's, in `substituteTextarea`) then also calls `event.stopImmediatePropagation()`,
      `vendor/mathquill/PATCHES.md`'s "Adapter settings (no source change)" section records it,
      and that file joins the Step 5 commit. Never relax the assertion.

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator-v2/math-field/MathField.ts src/components/calculator-v2/math-field/MathField.test.ts src/components/calculator-v2/math-field/vendor.test.ts
git commit -m "Add the MathField adapter over vendored MathQuill (AR-42)"
```

### Task 7: Announcer, live region and design tokens (01 section 9 contracts)

The tests here are titled by the contract they pin (`createAnnouncer …`, `LiveRegion …`,
`useAnnouncer …`, `tokens.css …`). A11Y-2 (09), AN-13 and AN-14 (10) are verified by their owners
against the rendered calculator (Notes for the lead, item 1).

**Files:**

- Create: `src/components/calculator-v2/ui/a11y/announcer.ts`,
  `src/components/calculator-v2/styles/tokens.css`
- Test: `src/components/calculator-v2/ui/a11y/announcer.test.tsx` (jsdom),
  `src/components/calculator-v2/ui/a11y/tokens.test.ts` (node)

**Interfaces:** Produces exactly 01 section 9 and nothing more (the 50 ms clear gap is a
module-private constant, `const CLEAR_MS = 50`, not exported):

```ts
// src/components/calculator-v2/ui/a11y/announcer.ts
export interface AnnounceOptions {
  delayMs?: number;
  key?: string;
} // same key replaces a pending one
export interface Announcer {
  announce(text: string, options?: AnnounceOptions): void;
  cancel(key: string): void;
  destroy(): void;
}
export function createAnnouncer(region: HTMLElement): Announcer; // role="status", aria-live="polite"
export const AnnouncerContext: React.Context<Announcer | null>; // createContext<Announcer | null>(null)
export function useAnnouncer(): Announcer; // throws Error("useAnnouncer must be used inside AnnouncerContext")
export function LiveRegion(props: { onReady(region: HTMLElement): void }): JSX.Element;
// createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", style:
// visually hidden (absolute, 1 px, clip-path inset(50%), nowrap) }); onReady once, in a layout effect
```

`announce(text, { delayMs = 0, key })` first cancels the pending entry with the same `key` (both of
its timers), then schedules an entry of two timers: a clear (`region.textContent = ""`) at
`max(0, delayMs - CLEAR_MS)` and a write (`region.textContent = text`) at
`max(delayMs, CLEAR_MS)`. So the text lands exactly at `delayMs` when `delayMs >= 50`, at 50 ms
when `delayMs` is below 50, and the region is empty for the 50 ms before every write (equal text
is read again). `cancel(key)` clears whichever of that entry's timers has not run, so a cancel
between the clear and the write writes nothing; entries without a key are cancelled only by
`destroy`. `destroy` clears every timer, empties the region and makes later calls no-ops. All
timers take function arguments (AR-44). `tokens.css` is exactly:

```css
:host {
  --kc-duration-instant: 100ms;
  --kc-duration-fast: 200ms;
  --kc-duration-normal: 400ms;
  --kc-ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
  --kc-font-ui: Arial, sans-serif;
  --kc-font-math: KaTeX_Main, "Times New Roman", serif;
  --kc-size-ui: 14px;
  --kc-size-math: 18px;
  --kc-size-axis: 13px;
}
@media (prefers-reduced-motion: reduce) {
  :host {
    --kc-duration-instant: 0ms;
    --kc-duration-fast: 0ms;
    --kc-duration-normal: 0ms;
  }
}
:host([data-reduced-motion="true"]) {
  --kc-duration-instant: 0ms;
  --kc-duration-fast: 0ms;
  --kc-duration-normal: 0ms;
}
```

- [ ] **Step 1: Write the failing tests** (`announcer.test.tsx`, directive first, then
      `tokens.test.ts`)

```tsx
// @vitest-environment jsdom
import { render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnnouncerContext, LiveRegion, createAnnouncer, useAnnouncer } from "./announcer";

afterEach(() => vi.useRealTimers());
function setup(initialText = "") {
  vi.useFakeTimers();
  const region = document.createElement("div");
  region.textContent = initialText;
  return { region, announcer: createAnnouncer(region) };
}

it("createAnnouncer writes the text exactly delayMs after announce and empties the region 50 ms before", () => {
  const { region, announcer } = setup("Angle mode degrees");
  announcer.announce("Expression 2 equals 9", { delayMs: 750, key: "value" });
  vi.advanceTimersByTime(699); // t = 699
  expect(region.textContent).toBe("Angle mode degrees");
  vi.advanceTimersByTime(1); // t = 700: cleared
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(49); // t = 749
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 750: written
  expect(region.textContent).toBe("Expression 2 equals 9");
  announcer.announce("Calculator cleared for this question.", { delayMs: 500, key: "reset" });
  vi.advanceTimersByTime(499);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // exactly 500 ms after the call
  expect(region.textContent).toBe("Calculator cleared for this question.");
});
it("createAnnouncer re-reads equal text: below 50 ms it empties at once and writes at 50 ms", () => {
  const { region, announcer } = setup("Expression 2 equals 9");
  announcer.announce("Expression 2 equals 9");
  vi.advanceTimersByTime(0);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(49);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1);
  expect(region.textContent).toBe("Expression 2 equals 9");
  announcer.announce("Expression 2 equals 9", { delayMs: 20 });
  vi.advanceTimersByTime(0);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(50);
  expect(region.textContent).toBe("Expression 2 equals 9");
});
it("createAnnouncer replaces a pending same-key announcement before or after its clear", () => {
  const { region, announcer } = setup();
  announcer.announce("Expression 1 equals 2", { delayMs: 750, key: "value" }); // t = 0
  vi.advanceTimersByTime(500);
  announcer.announce("Expression 1 equals 3", { delayMs: 750, key: "value" }); // t = 500
  vi.advanceTimersByTime(300); // t = 800: the first one would have been written at 750
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(449); // t = 1249
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 1250
  expect(region.textContent).toBe("Expression 1 equals 3");
  announcer.announce("Expression 1 equals 4", { delayMs: 750, key: "value" }); // t = 1250
  vi.advanceTimersByTime(720); // t = 1970: cleared at 1950, write due at 2000
  expect(region.textContent).toBe("");
  announcer.announce("Expression 1 equals 5", { delayMs: 750, key: "value" }); // t = 1970
  vi.advanceTimersByTime(30); // t = 2000: the replaced write does not run
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(720); // t = 2720
  expect(region.textContent).toBe("Expression 1 equals 5");
});
it("createAnnouncer cancel(key) stops both timers, including a write due after the clear ran", () => {
  const { region, announcer } = setup("Expression 1 equals 3");
  announcer.announce("Angle mode degrees", { delayMs: 100, key: "mode" });
  announcer.cancel("mode");
  vi.advanceTimersByTime(1000);
  expect(region.textContent).toBe("Expression 1 equals 3"); // neither timer ran
  announcer.announce("Angle mode radians", { delayMs: 750, key: "mode" });
  vi.advanceTimersByTime(720); // cleared at 700, write due at 750
  expect(region.textContent).toBe("");
  announcer.cancel("mode");
  vi.advanceTimersByTime(1000);
  expect(region.textContent).toBe("");
});
it("createAnnouncer destroy stops every pending write and empties the region", () => {
  const { region, announcer } = setup("old");
  announcer.announce("Cleared", { delayMs: 10 });
  announcer.destroy();
  announcer.announce("After");
  vi.advanceTimersByTime(1000);
  expect(region.textContent).toBe("");
});
it("LiveRegion is one polite status region, never an alert, ready once", () => {
  const onReady = vi.fn();
  const { container, rerender } = render(<LiveRegion onReady={onReady} />);
  rerender(<LiveRegion onReady={onReady} />);
  const region = screen.getByRole("status");
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.getAttribute("aria-atomic")).toBe("true");
  expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(onReady).toHaveBeenCalledWith(region);
});
it("useAnnouncer returns the provided announcer and throws outside AnnouncerContext", () => {
  const announcer = createAnnouncer(document.createElement("div"));
  const { result } = renderHook(() => useAnnouncer(), {
    wrapper: ({ children }) => (
      <AnnouncerContext.Provider value={announcer}>{children}</AnnouncerContext.Provider>
    ),
  });
  expect(result.current).toBe(announcer);
  expect(() => renderHook(() => useAnnouncer())).toThrow(
    "useAnnouncer must be used inside AnnouncerContext"
  );
});
```

```ts
// tokens.test.ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync("src/components/calculator-v2/styles/tokens.css", "utf8");
const declarations = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
const ZERO = {
  "--kc-duration-instant": "0ms",
  "--kc-duration-fast": "0ms",
  "--kc-duration-normal": "0ms",
};

it("tokens.css declares the 01 section 9 motion, font and size tokens on :host", () => {
  expect(declarations(/^:host \{([^}]*)\}/m.exec(css)![1])).toEqual({
    "--kc-duration-instant": "100ms",
    "--kc-duration-fast": "200ms",
    "--kc-duration-normal": "400ms",
    "--kc-ease-standard": "cubic-bezier(0.22, 1, 0.36, 1)",
    "--kc-font-ui": "Arial, sans-serif",
    "--kc-font-math": 'KaTeX_Main, "Times New Roman", serif',
    "--kc-size-ui": "14px",
    "--kc-size-math": "18px",
    "--kc-size-axis": "13px",
  });
  expect(css).not.toMatch(/@font-face|url\(/);
});
it("tokens.css sets every duration to 0ms under prefers-reduced-motion and data-reduced-motion", () => {
  const media = /@media \(prefers-reduced-motion: reduce\) \{\s*:host \{([^}]*)\}/.exec(css)![1];
  const attribute = /:host\(\[data-reduced-motion="true"\]\) \{([^}]*)\}/.exec(css)![1];
  expect(declarations(media)).toEqual(ZERO);
  expect(declarations(attribute)).toEqual(ZERO);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/components/calculator-v2/ui/a11y`
Expected: FAIL, `Failed to resolve import "./announcer"` and `ENOENT … tokens.css`.

- [ ] **Step 3: Implement** `announcer.ts` (no JSX, `createElement`; `onReady` kept in a ref and
      called from `useLayoutEffect(…, [])`) and `tokens.css` as above.

- [ ] **Step 4: Run them and see them pass.**

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator-v2/ui/a11y src/components/calculator-v2/styles/tokens.css
git commit -m "Add the polite announcer, live region and calculator design tokens"
```
