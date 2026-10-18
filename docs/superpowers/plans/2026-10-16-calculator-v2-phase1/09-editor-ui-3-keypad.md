# 09 editor-ui, part 3 of 5: keypad tables, rendering and input (Tasks 7 to 9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 3 of package `09-editor-ui.md`, which holds the package header, Working rules, Decisions,
Notes for consumers, the Row DOM and the ID coverage; they apply to every task here. Tasks run
in number order across the five parts. Paths that start with `ui/`, `styles/` or `icons/` are
under `src/components/calculator-v2/`.

---

### Task 7: Key tables, key repeat and the double-tap tracker

**Files:**

- Create: `ui/keypad/keys.ts`, `ui/keypad/key-repeat.ts`, `ui/keypad/double-tap.ts`
- Test: `ui/keypad/keys.test.ts`, `ui/keypad/timing.test.ts` (both node)

**Interfaces:**

- Consumes: (02) `MathFieldAction` (type only).
- Produces:

```ts
// ui/keypad/keys.ts
export type KeyBehaviour =
  | { type: "insert"; action: MathFieldAction }
  | { type: "enter" }
  | { type: "letters" } // the ABC key: visible ABC or 123, accessible name "ABC" on both pages, aria-pressed
  | { type: "shift" } // aria-pressed
  | { type: "functions" } // aria-expanded
  | { type: "audio" }; // aria-disabled until Phase 4 (K-9)
// lucide-react component names, kept as strings so keys.ts and its node tests never import React
export type KeyIcon =
  | "ArrowLeft"
  | "ArrowRight"
  | "Delete"
  | "CornerDownLeft"
  | "ArrowBigUp"
  | "Volume2";
export interface KeyDef {
  id: string;
  label: string; // visible text; "" for an icon key
  icon?: KeyIcon; // set only on the six icon keys (table below); Keypad draws it aria-hidden
  name: string; // accessible name, in words
  behaviour: KeyBehaviour;
  span: 1 | 2 | 3 | 4;
  tone: "key" | "operator" | "accent"; // TH-3 roles key, keyOperator, accent
  repeat: boolean; // true for left, right and backspace only (K-11)
}
export type KeyGroupId = "left" | "centre" | "right" | "letters" | "phone";
export interface KeyGroup {
  id: KeyGroupId;
  columns: number;
  rows: readonly (readonly KeyDef[])[];
}
export interface KeypadLayout {
  id: "tray" | "phone";
  page: "main" | "letters";
  groups: readonly KeyGroup[];
}
export const PHONE_KEYPAD_BELOW = 600; // container width < 600 → phone keypad (K-6)
export function keypadLayout(
  page: "main" | "letters",
  containerWidth: number,
  pointer: "fine" | "coarse",
  shift: boolean
): KeypadLayout;
// ui/keypad/key-repeat.ts
export const KEY_REPEAT_DELAY_MS = 400;
export const KEY_REPEAT_INTERVAL_MS = 80;
export interface KeyRepeat {
  start(fire: () => void): void; // fires at once, after 400 ms, then every 80 ms
  stop(): void;
}
export function createKeyRepeat(): KeyRepeat;
// ui/keypad/double-tap.ts
export const DOUBLE_TAP_MS = 300;
export interface DoubleTapTracker {
  record(rowId: string, latexAfter: string): void;
  matches(rowId: string, latexNow: string): boolean; // same row, same latex, elapsed <= 300 ms, not cleared
  clear(): void;
}
export function createDoubleTapTracker(now: () => number): DoubleTapTracker;
```

Key definitions (labels are Karman's own text). The six icon keys (`audio`, `left`, `right`,
`backspace`, `enter`, `shift`) have `label: ""` and the `icon` named in the label column; every
other key has no `icon`. The behaviour column is reading E2 of the package Decisions ("K-10 key
calls"): `a²` is `write`, the named symbols π, θ, ≤ and ≥ are `cmd`.

| ids                                                   | label                                     | name                                                                   | behaviour                                 | tone                    |
| ----------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- | ----------------------- |
| `x`, `y`                                              | x, y                                      | x, y                                                                   | typedText `x`, `y`                        | key                     |
| `squared`, `power`                                    | a², aᵇ                                    | Squared, Power                                                         | write `^2`; cmd `^`                       | operator                |
| `lparen`, `rparen`, `lt`, `gt`                        | ( ) < >                                   | Left parenthesis, Right parenthesis, Less than, Greater than           | typedText `(`, `)`, `<`, `>`              | operator                |
| `abs`, `comma`, `le`, `ge`                            | \|a\|, ",", ≤, ≥                          | Absolute value, Comma, Less than or equal to, Greater than or equal to | cmd `\|`; typedText `,`; cmd `\le`, `\ge` | operator                |
| `sqrt`, `pi`                                          | √, π                                      | Square root, Pi                                                        | cmd `\sqrt`, `\pi`                        | operator                |
| `0` to `9`, `point`                                   | digit, .                                  | digit, Decimal point                                                   | typedText digit, `.`                      | key                     |
| `divide`, `times`, `minus`, `plus`, `equals`          | ÷ × − + =                                 | Divide, Multiply, Minus, Plus, Equals                                  | typedText `/`, `*`, `-`, `+`, `=`         | operator                |
| `tilde`                                               | ~                                         | Tilde                                                                  | typedText `~`                             | operator                |
| `letters`                                             | ABC (main page), 123 (letters)            | ABC (both pages; `aria-pressed` shows the letters page)                | letters                                   | operator                |
| `audio`                                               | `Volume2` icon                            | Audio trace, available later                                           | audio                                     | operator                |
| `functions`                                           | functions                                 | Functions                                                              | functions                                 | operator                |
| `left`, `right`, `backspace`                          | `ArrowLeft`, `ArrowRight`, `Delete` icons | Left arrow, Right arrow, Backspace                                     | keystroke `Left`, `Right`, `Backspace`    | operator                |
| `enter`                                               | `CornerDownLeft` icon                     | Enter                                                                  | enter                                     | accent                  |
| `a` to `z`                                            | letter (capital under Shift)              | letter (capital under Shift)                                           | typedText letter (capital under Shift)    | key                     |
| `theta`, `prime`, `subscript`                         | θ, ′, aₙ                                  | Theta, Prime, Subscript                                                | cmd `\theta`; typedText `'`; cmd `_`      | key, operator, operator |
| `shift`                                               | `ArrowBigUp` icon                         | Shift                                                                  | shift                                     | operator                |
| `factorial`, `percent`, `lbracket`, `lbrace`, `colon` | ! % [ { :                                 | Factorial, Percent, Left bracket, Left brace, Colon                    | typedText `!`, `%`, `[`, `{`, `:`         | operator                |

- [ ] **Step 1: Write the failing tests.** `keys.test.ts`:

```ts
const ids = (group: KeyGroup) =>
  group.rows.map((row) => row.map((k) => (k.span > 1 ? `${k.id}*${k.span}` : k.id)));
const chars = (s: string) => s.split("");

it("K-1 the fine-pointer tray has the left, centre and right groups of the K-1 table", () => {
  const tray = keypadLayout("main", 900, "fine", false);
  expect(tray.groups.map((g) => [g.id, g.columns])).toEqual([
    ["left", 4],
    ["centre", 4],
    ["right", 2],
  ]);
  expect(ids(tray.groups[0])).toEqual([
    ["x", "y", "squared", "power"],
    ["lparen", "rparen", "lt", "gt"],
    ["abs", "comma", "le", "ge"],
    ["letters", "audio", "sqrt", "pi"],
  ]);
  expect(ids(tray.groups[1])).toEqual([
    ["7", "8", "9", "divide"],
    ["4", "5", "6", "times"],
    ["1", "2", "3", "minus"],
    ["0", "point", "equals", "plus"],
  ]);
  expect(ids(tray.groups[2])).toEqual([
    ["functions*2"],
    ["left", "right"],
    ["backspace*2"],
    ["enter*2"],
  ]);
  const byId = new Map(tray.groups.flatMap((g) => g.rows.flat()).map((k) => [k.id, k]));
  expect(byId.get("backspace")).toMatchObject({ id: "backspace", icon: "Delete", label: "" });
  expect(["left", "right", "enter", "audio"].map((id) => byId.get(id)!.icon)).toEqual([
    "ArrowLeft",
    "ArrowRight",
    "CornerDownLeft",
    "Volume2",
  ]);
  expect(byId.get("7")).toMatchObject({ label: "7", name: "7" });
  expect(byId.get("7")!.icon).toBeUndefined();
});

it("K-6 under 600 px the 7 x 6 phone keypad holds every tray key plus ~ whatever the pointer; wider coarse trays add ~ to the right group", () => {
  expect(keypadLayout("main", 599, "fine", false).id).toBe("phone");
  expect(keypadLayout("main", 599, "fine", false)).toEqual(
    keypadLayout("main", 599, "coarse", false)
  );
  for (const width of [320, 599]) {
    const phone = keypadLayout("main", width, "coarse", false);
    expect([phone.id, phone.groups[0].columns]).toEqual(["phone", 7]);
    expect(ids(phone.groups[0])).toEqual([
      ["functions*2", "left", "right", "tilde", "backspace*2"],
      ["x", "y", "squared", "7", "8", "9", "divide"],
      ["lparen", "rparen", "power", "4", "5", "6", "times"],
      ["lt", "gt", "sqrt", "1", "2", "3", "minus"],
      ["le", "ge", "pi", "0", "point", "equals", "plus"],
      ["letters", "abs", "comma", "audio", "enter*3"],
    ]);
  }
  expect(ids(keypadLayout("letters", 390, "coarse", false).groups[0])).toEqual([
    chars("abcdefg"),
    chars("hijklmn"),
    chars("opqrstu"),
    [...chars("vwxyz"), "theta", "shift"],
    ["subscript", "factorial", "percent", "lbracket", "lbrace", "tilde", "colon"],
    ["letters", "prime", "left", "right", "backspace", "enter*2"],
  ]);
  expect(keypadLayout("main", 844, "coarse", false).id).toBe("tray");
  expect(ids(keypadLayout("main", 600, "coarse", false).groups[2])).toEqual([
    ["functions*2"],
    ["left", "right"],
    ["tilde", "backspace"],
    ["enter*2"],
  ]);
});

it("K-3 the desktop letters page replaces the left and centre groups with 10 columns, and Shift capitalises", () => {
  const page = keypadLayout("letters", 900, "fine", false);
  expect(page.groups.map((g) => [g.id, g.columns])).toEqual([
    ["letters", 10],
    ["right", 2],
  ]);
  expect(ids(page.groups[0])).toEqual([
    chars("qwertyuiop"),
    [...chars("asdfghjkl"), "theta"],
    ["shift", ...chars("zxcvbnm"), "prime", "tilde"],
    ["letters*4", "subscript", "factorial", "percent", "lbracket", "lbrace", "colon"],
  ]);
  expect(page.groups[0].rows[2][0]).toMatchObject({ id: "shift", icon: "ArrowBigUp", label: "" });
  expect(keypadLayout("letters", 900, "fine", true).groups[0].rows[0][0]).toMatchObject({
    label: "Q",
    name: "Q",
    behaviour: { type: "insert", action: { op: "typedText", arg: "Q" } },
  });
});
```

`timing.test.ts`:

```ts
afterEach(() => vi.useRealTimers());

it("K-11 a held key fires at once, again after 400 ms, then every 80 ms until stopped; only arrows and Backspace repeat", () => {
  vi.useFakeTimers();
  const fire = vi.fn();
  const repeat = createKeyRepeat();
  repeat.start(fire);
  expect(fire).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(399);
  expect(fire).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(fire).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(160);
  expect(fire).toHaveBeenCalledTimes(4);
  repeat.stop();
  vi.advanceTimersByTime(1000);
  expect(fire).toHaveBeenCalledTimes(4);
  const all = (["main", "letters"] as const).flatMap((p) =>
    keypadLayout(p, 900, "coarse", false).groups.flatMap((g) => g.rows.flat())
  );
  expect([...new Set(all.filter((k) => k.repeat).map((k) => k.id))].sort()).toEqual([
    "backspace",
    "left",
    "right",
  ]);
});

it("K-7 a second = within 300 ms on the same row with no other input is a double tap", () => {
  let t = 0;
  const taps = createDoubleTapTracker(() => t);
  taps.record("1", "y=");
  t = 300;
  expect(taps.matches("1", "y=")).toBe(true);
  t = 301;
  expect(taps.matches("1", "y=")).toBe(false);
  t = 0;
  taps.record("1", "y=");
  expect(taps.matches("2", "y=")).toBe(false);
  expect(taps.matches("1", "y=x")).toBe(false);
  taps.clear();
  expect(taps.matches("1", "y=")).toBe(false);
});
```

- [ ] **Step 2: Run them and see them fail.** `npx vitest run src/components/calculator-v2/ui/keypad`.
      Expected: FAIL with `Failed to resolve import "./keys"` (and `./key-repeat`).
- [ ] **Step 3: Implement the three modules** from the table and these layouts:
      `containerWidth < PHONE_KEYPAD_BELOW` gives the phone keypad whatever the pointer (a narrow
      floating window on a desktop included), and the pointer only picks the tray's right group;
      tray main = left, centre and right (the right group by pointer, as the K-1 and K-6 tests
      show); tray letters = letters (10 columns) and the same right group; phone main and phone
      letters = one `phone` group of 7 columns. Under Shift, letter keys carry the capital in
      `label`, `name` and `arg`. Icon keys carry `label: ""` and their `KeyIcon`.
      `createKeyRepeat` uses the global `setTimeout` and `setInterval`.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 5 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/keypad
git commit -m "Add v2 keypad key tables, key repeat and the double-tap tracker (09 editor-ui)"
```

### Task 8: Keypad rendering, letters page and the audio key

**Files:**

- Create: `ui/keypad/Keypad.tsx`, `styles/keypad.css`
- Test: `ui/keypad/Keypad.test.tsx`

**Interfaces:**

- Consumes: Tasks 1 and 7; `EscapeContext` (layers `keypad`, `letters`).
- Produces: `KeypadProps` and `Keypad` exactly as 01 section 11, rendering the keypad DOM above;
  closed: the section stays mounted with `data-open="false"`, `aria-hidden="true"` and `inert`,
  and `button.kc-show-keypad` (`Show keypad`, lucide `Keyboard`, with the keypad's `data-layout`
  and `data-pointer`) renders at the bottom left.

- [ ] **Step 1: Write the failing tests** in `Keypad.test.tsx`:

```tsx
const keypad = (props: Partial<KeypadProps> = {}) => (
  <Keypad containerWidth={900} pointer="fine" open onOpenChange={vi.fn()} {...props} />
);
const groupIds = () =>
  [...document.querySelectorAll("[data-group]")].map((g) => g.getAttribute("data-group"));

it("K-1 the tray renders the K-1 groups in order and Hide and Show keypad report a student change", async () => {
  const onOpenChange = vi.fn();
  renderEditor(keypad({ onOpenChange }), { rows: [""] });
  const region = screen.getByRole("region", { name: "Keypad" });
  expect(region).toHaveAttribute("data-layout", "tray");
  expect(groupIds()).toEqual(["left", "centre", "right"]);
  const keys = [...region.querySelectorAll('[data-group="left"] [data-key]')].map((k) =>
    k.getAttribute("data-key")
  );
  expect(keys).toEqual(
    keypadLayout("main", 900, "fine", false)
      .groups[0].rows.flat()
      .map((k) => k.id)
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Hide keypad" }));
  expect(onOpenChange).toHaveBeenCalledWith(false, "student");
  cleanup();
  renderEditor(keypad({ open: false, onOpenChange }), { rows: [""] });
  expect(screen.queryByRole("region", { name: "Keypad" })).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: "Show keypad" }));
  expect(onOpenChange).toHaveBeenLastCalledWith(true, "student");
});

it("K-3 ABC switches the left and centre groups to the letters page and back; Shift is a pressed toggle", async () => {
  renderEditor(keypad(), { rows: [""] });
  const user = userEvent.setup();
  const abc = () => screen.getByRole("button", { name: "ABC", exact: true });
  expect(abc()).toHaveAttribute("aria-pressed", "false");
  expect(abc()).toHaveTextContent("ABC");
  await user.click(abc());
  expect(abc()).toHaveAttribute("aria-pressed", "true");
  expect(abc()).toHaveTextContent("123");
  expect(groupIds()).toEqual(["letters", "right"]);
  await user.click(screen.getByRole("button", { name: "Shift" }));
  expect(screen.getByRole("button", { name: "Shift" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Q", exact: true })).toBeInTheDocument();
  await user.click(abc());
  expect(groupIds()).toEqual(["left", "centre", "right"]);
});

it("K-9 the audio key sits on both main pages, disabled with its later-phase name, and not on letters pages", async () => {
  renderEditor(keypad(), { rows: [""] });
  const audio = screen.getByRole("button", { name: "Audio trace, available later" });
  expect(audio).toHaveAttribute("aria-disabled", "true");
  expect(audio).toHaveAttribute("title", "Audio trace, available later");
  await userEvent.setup().click(screen.getByRole("button", { name: "ABC", exact: true }));
  expect(screen.queryByRole("button", { name: "Audio trace, available later" })).toBeNull();
  cleanup();
  renderEditor(keypad({ containerWidth: 390, pointer: "coarse" }), { rows: [""] });
  expect(screen.getByRole("button", { name: "Audio trace, available later" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
});

it("A11Y-5 the keypad is a region named Keypad whose keys are named in words; ABC uses aria-pressed and Functions aria-expanded", () => {
  renderEditor(keypad({ pointer: "coarse" }), { rows: [""] });
  const region = screen.getByRole("region", { name: "Keypad" });
  for (const name of [
    "Squared",
    "Power",
    "Square root",
    "Pi",
    "Less than or equal to",
    "Absolute value",
    "Left arrow",
    "Tilde",
  ])
    expect(within(region).getByRole("button", { name, exact: true })).toBeInTheDocument();
  for (const button of within(region).getAllByRole("button"))
    expect(button.getAttribute("aria-label") ?? button.textContent).toMatch(/^[A-Za-z0-9][\w ,]*$/);
  expect(within(region).getByRole("button", { name: "ABC", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  expect(within(region).getByRole("button", { name: "Functions" })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/keypad/Keypad.test.tsx`. Expected: FAIL with
      `Failed to resolve import "./Keypad"`.
- [ ] **Step 3: Implement `Keypad` (rendering only; Task 9 adds input, Task 10 the panel) and
      `keypad.css`.**
  - State: `page` (`main` | `letters`) and `shift`; the layout is
    `keypadLayout(page, containerWidth, pointer, shift)`. Each group is a `div[role=group]` with
    `data-group` and the CSS variable `--kc-columns` set inline to `group.columns`. Each key is a
    `button.kc-key` with `aria-label` equal to `key.name`, `data-key`, `data-tone` and an inline
    grid column span of `key.span`. A key with `icon` renders only that lucide component with
    `aria-hidden="true"`, through
    `const KEY_ICONS: Record<KeyIcon, LucideIcon> = { ArrowLeft, ArrowRight, Delete, CornerDownLeft, ArrowBigUp, Volume2 }`
    (`LucideIcon` and the six components imported from `lucide-react` in `Keypad.tsx`, so
    `keys.ts` stays free of React); any other key renders `key.label` as text. The `letters` key
    is named `ABC` on both pages (visible `ABC` on the main page and `123` on the letters page)
    and carries `aria-pressed` (true on
    the letters page), `shift` carries `aria-pressed` (true while Shift is on), `functions` carries
    `aria-expanded` and `aria-controls` (the panel id), and `audio` carries
    `aria-disabled="true"` and a `title` equal to its name. `letters` toggles the page, `shift`
    toggles Shift, `Hide keypad` (lucide `ChevronDown`) calls `onOpenChange(false, "student")`
    and `Show keypad` calls `onOpenChange(true, "student")`.
  - Escape layers while open: `keypad` (closes with `onOpenChange(false, "student")`) and, on
    the letters page, `letters` (back to `main`). Closing the keypad resets the page and Shift.
  - `keypad.css`: the tray background `--kc-chrome`; tones `--kc-key`, `--kc-key-operator` and
    `--kc-accent` with `--kc-accent-label` text; tray `padding: 4px; gap: 8px` between groups and
    `gap: 4px` inside a group. Before the grid rule, the default declaration
    `.kc-keypad [data-group] { --kc-columns: 4; }` (03 Task 6's TH-3 `varFindings` accepts a
    `var(--kc…)` only when it is a role, curve, fill-alpha or chrome var or a `--kc-…:` declared in
    a scanned stylesheet, and the inline `--kc-columns` on each group is not a stylesheet
    declaration; the inline value still overrides this default, as Task 2's `--kc-row-color`
    does); then the grid
    (`grid-template-columns: repeat(var(--kc-columns), minmax(var(--kc-key-size), 1fr))`);
    `--kc-key-size: 32px` on `.kc-keypad` and `.kc-show-keypad`, and `44px` on either under
    `[data-pointer="coarse"]` and `[data-layout="phone"]`; `min-width` and
    `min-height: var(--kc-key-size)` on `.kc-key`, on `.kc-keypad-bar button` (Hide keypad, a
    lucide icon button that K-1 and K-6 measure with the keys) and on `.kc-show-keypad`; the phone keypad
    `padding-inline: 2px; column-gap: 0` with a 2 px transparent border inside each 44 px key
    (`background-clip: padding-box`), so 7 keys fit 320 px (K-6); `[data-open="false"]` is
    `transform: translateY(100%); visibility: hidden` (Task 14 adds the transitions). Every
    `var(--kc…)` `keypad.css` reads is a `ROLE_VARS` value, a 05 `tokens.css` token or one of
    its own declared `--kc-key-size` and `--kc-columns`.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 4 tests. Then
      `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`. Expected: PASS,
      4 tests (TH-3 `varFindings` over `scannedFiles(ROOT)`, now including `styles/keypad.css`,
      is `[]`; without the `--kc-columns` default it reports
      `src/components/calculator-v2/styles/keypad.css: --kc-columns`).
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/keypad src/components/calculator-v2/styles/keypad.css
git commit -m "Render the v2 desktop tray and phone keypads with letters pages (09 editor-ui)"
```

### Task 9: Key input: one adapter call per key, double-tap equals and key repeat

**Files:**

- Create: `ui/keypad/apply-key.ts`
- Modify: `ui/keypad/Keypad.tsx`
- Test: `ui/keypad/key-input.test.tsx`

**Interfaces:**

- Consumes: Tasks 1, 4, 7 and 8: `editThroughKeypad`, `insertRowBelow`, `performUndo`,
  `fieldTextbox`, `createKeyRepeat`, `createDoubleTapTracker`.
- Produces:

```ts
// ui/keypad/apply-key.ts
export interface KeyContext {
  engine: CalculatorEngine;
  focus: FocusController;
  announcer: Announcer | null;
  doubleTap: DoubleTapTracker;
}
export function keypadTarget(
  focus: FocusController,
  snapshot: EngineSnapshot
): { rowId: string; field: MathField } | null;
// focus.activeRowId(), else focus.lastFocusedRowId(), else snapshot.rows[0].id; null when that row has no registered field
export function pressKey(ctx: KeyContext, key: KeyDef): void; // "insert" and "enter" keys; others are the Keypad's own
```

- [ ] **Step 1: Write the failing tests** in `key-input.test.tsx`:

```tsx
afterEach(() => vi.useRealTimers());
const editor = () => (
  <>
    <ExpressionPanel {...panelProps({ keypadOpen: true })} />
    <Keypad containerWidth={900} pointer="fine" open onOpenChange={vi.fn()} />
  </>
);
const key = (name: string) => screen.getByRole("button", { name, exact: true });

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

it("K-9 activating the audio key by pointer or keyboard does nothing", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  act(() => kit.focus.focusRow("1", "end"));
  field.calls = [];
  const user = userEvent.setup();
  await user.click(key("Audio trace, available later"));
  key("Audio trace, available later").focus();
  await user.keyboard("{Enter}");
  expect(field.calls).toEqual([]);
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
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/keypad/key-input.test.tsx`. Expected: FAIL,
      5 of 6, because keys do not act yet: K-10's first `expect(field.calls).toEqual([call])`
      receives `[]`; K-3 throws at `key("w")` with
      `Unable to find an accessible element with the role "button" and name "w"` before its
      `toEqual`, because Task 8's Shift stays on after `Q` (only this task turns it off after a
      letter), so the key still reads `W`; K-7's `toEqual` of the `run` call receives
      `[]`; K-11 fails first on `toHaveAttribute("data-pressed", "true")`; T-13 fails on
      `announcer.texts` `toContain` the character-limit message (received `[]`). K-9 passes at
      once and guards Task 8's inert audio key through the input wiring added here.
- [ ] **Step 3: Implement `apply-key.ts` and wire the keys.**
  - `pressKey`: no target → nothing. `insert` on `equals` when
    `doubleTap.matches(rowId, field.latex())`: `engine.endEditGroup()`, then
    `editThroughKeypad(…, (f) => f.run([{ op: "keystroke", arg: "Backspace" }, { op: "typedText", arg: "~" }]))`,
    `engine.endEditGroup()`, `doubleTap.clear()`, announce `EDITOR_MESSAGES.tilde`. Any other
    `insert`: `editThroughKeypad(…, (f) => f[action.op](action.arg))`, exactly one adapter call;
    afterwards `equals` calls `doubleTap.record(rowId, field.latex())` and adds a one-shot
    `keydown` listener on `field.element` that clears the tracker (hardware typing between taps,
    and hardware `==` never converts); every other key calls `doubleTap.clear()`. `enter`:
    `insertRowBelow(engine, focus, announcer, rowId, textboxFocused ? "focus" : "activate")`,
    where `textboxFocused` is `fieldTextbox(field).getRootNode().activeElement === fieldTextbox(field)`.
  - `Keypad`: one `createDoubleTapTracker(() => performance.now())` per mount. Every key gets
    `onMouseDown={(e) => e.preventDefault()}` (focus stays in the row, K-10) and
    `data-pressed="true"` from `pointerdown` until `pointerup`, `pointercancel` or
    `pointerleave` (tone feedback that survives the prevented mousedown). Repeat keys start
    `createKeyRepeat()` on `pointerdown` with `pressKey` as the fire callback and stop with the
    press; the `click` that follows a pointer press is ignored. Other keys act on `click` (mouse,
    touch and keyboard). Under Shift a letter key types its capital, then Shift turns off. The
    `audio` key ignores activation.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 6 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/keypad
git commit -m "Wire v2 keypad input: one adapter call per key, double-tap tilde and key repeat (09 editor-ui)"
```
