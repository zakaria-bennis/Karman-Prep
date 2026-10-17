# 09 editor-ui, part 5 of 5: harness page and browser checks (Tasks 13 to 15)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 5 of package `09-editor-ui.md`, which holds the package header, Working rules, Decisions,
Notes for consumers, the Row DOM and the ID coverage; they apply to every task here. Tasks run
in number order across the five parts. Paths that start with `ui/`, `styles/` or `icons/` are
under `src/components/calculator-v2/`.

---

### Task 13: Editor harness page and browser checks for rows, history and templates

**Files:**

- Create: `tests/calculator/fixture/v2/editor.html`, `tests/calculator/fixture/v2/editor.tsx`,
  `tests/calculator/v2/editor.spec.ts`

**Interfaces:**

- Consumes (07): `mountHarness(options: HarnessOptions): { engine: CalculatorEngine; destroy(): void }`
  from `tests/calculator/fixture/v2/harness-kit.tsx`, with
  `HarnessOptions { root: HTMLElement; css: string[]; skin?: SkinId; options?: CalculatorOptions; render(engine: CalculatorEngine): React.ReactNode }`
  (it attaches a shadow root to `root`, provides `SkinContext` and calls
  `exposeEngineForTests(engine)`); `EngineContext`;
  `globalThis.__calculatorHarness: { engine: CalculatorEngine }`. (05)
  `createAnnouncer(region: HTMLElement): Announcer`,
  `LiveRegion(props: { onReady(region: HTMLElement): void }): JSX.Element` (calls `onReady` once,
  in a layout effect), `AnnouncerContext` (default `null`; `useAnnouncer()` throws while it is
  null), `src/components/calculator-v2/styles/tokens.css`, `vendor/mathquill/mathquill.css`
  (both with `?inline`). Tasks 1 to 12.
- Produces: `/v2/editor.html` with query parameters `rows` (URL-encoded JSON `string[]`, ids
  `"1"…"n"`), `layout` (`desktop` default, `stacked`), `pointer` (`fine` | `coarse`, default from
  `matchMedia("(any-pointer: coarse)")`), `width` (container px, default 900), `keypad=open`,
  `skin` (`SkinId`, default `ivory`); and, in `editor.tsx`:

```ts
export interface EditorQuery {
  rows: string[] | null; // null: keep the engine's blank row
  layout: "desktop" | "stacked";
  pointer: "fine" | "coarse";
  width: number;
  keypadOpen: boolean;
  skin: SkinId;
}
export function readEditorQuery(search: string, coarsePointer: boolean): EditorQuery;
export function EditorHarness(props: { engine: CalculatorEngine; query: EditorQuery }): JSX.Element;
declare global {
  var __editorHarness: { graphResizes: number } | undefined;
}
```

- [ ] **Step 1: Write the harness test helpers and the failing tests** in `editor.spec.ts`:

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";

const open = (page: Page, rows: string[], query = "") =>
  page.goto(`/v2/editor.html?rows=${encodeURIComponent(JSON.stringify(rows))}${query}`);
const field = (page: Page, n: number) =>
  page.getByRole("textbox", { name: `Expression ${n}`, exact: true });
const latexes = (page: Page) =>
  page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getSnapshot().rows.map((r) => r.latex)
  );
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};
const transitions = (target: Locator) =>
  target.evaluate((el) =>
    el.getAnimations().map((a) => ({
      property: (a as CSSTransition).transitionProperty,
      duration: a.effect!.getTiming().duration,
    }))
  );

test("R-3 each row has Delete; Enter inserts a row below and focuses it; Up and Down leave a row only at its edge", async ({
  page,
}) => {
  await open(page, ["a", "\\frac{1}{2}", "b"]);
  await expect(
    page.getByRole("button", { name: "Delete expression 3", exact: true })
  ).toBeVisible();
  await field(page, 1).focus();
  await page.keyboard.press("Enter");
  await expect(field(page, 2)).toBeFocused();
  await expect.poll(() => latexes(page)).toEqual(["a", "", "\\frac{1}{2}", "b"]);
  await page.keyboard.press("ArrowDown");
  await expect(field(page, 3)).toBeFocused();
  await page.keyboard.press("ArrowRight"); // into the numerator
  await page.keyboard.press("ArrowDown"); // numerator to denominator: same row
  await expect(field(page, 3)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(field(page, 4)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(field(page, 3)).toBeFocused();
});

test("R-9 Backspace and Delete in an empty row delete it and move to the neighbour's edge; the last row only empties", async ({
  page,
}) => {
  await open(page, ["y=x", "", "y=2"]);
  await field(page, 2).focus();
  await page.keyboard.press("Backspace");
  await expect.poll(() => latexes(page)).toEqual(["y=x", "y=2"]);
  await expect(field(page, 1)).toBeFocused();
  await page.keyboard.type("+1");
  await expect.poll(() => latexes(page)).toEqual(["y=x+1", "y=2"]);
  await open(page, ["a", "", "b"]);
  await field(page, 2).focus();
  await page.keyboard.press("Delete");
  await expect.poll(() => latexes(page)).toEqual(["a", "b"]);
  await page.keyboard.type("c");
  await expect.poll(() => latexes(page)).toEqual(["a", "cb"]);
  await open(page, ["y"]);
  await field(page, 1).focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect.poll(() => latexes(page)).toEqual([""]);
  await expect(field(page, 1)).toBeFocused();
});

test("KB-2 MathQuill's own undo never runs, and the toolbar Undo removes a burst of typing in one step", async ({
  page,
}) => {
  await open(page, [""]);
  await field(page, 1).focus();
  await page.keyboard.type("abc");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => latexes(page)).toEqual(["abc"]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => latexes(page)).toEqual([""]);
});

test("KB-5 Clear all removes every row in one undo step, keeps settings and viewport, focuses the empty row and announces", async ({
  page,
}) => {
  await open(page, ["y=x", "a=2", "y=ax"]);
  await page.evaluate(() => {
    const engine = globalThis.__calculatorHarness!.engine;
    engine.updateSettings({ angleMode: "degrees" });
    engine.setMathBounds({ left: -5, right: 5, bottom: -3, top: 3 });
  });
  await page.getByRole("button", { name: "Edit list", exact: true }).click();
  await page.getByRole("button", { name: "Clear all expressions", exact: true }).click();
  await expect(page.getByRole("list", { name: "Expressions" }).getByRole("listitem")).toHaveCount(
    1
  );
  await expect(field(page, 1)).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("All expressions cleared. Undo is available.");
  const after = await page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot());
  expect(after).toMatchObject({
    rows: [{ latex: "" }],
    settings: { angleMode: "degrees" },
    viewport: { left: -5, right: 5, bottom: -3, top: 3 },
  });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => latexes(page)).toEqual(["y=x", "a=2", "y=ax"]);
});

test("L-3 the focused row draws the focus-bar number and a 2 px focus-ring outline", async ({
  page,
}) => {
  await open(page, ["y=x", "2+3"]);
  await field(page, 2).focus();
  const row = page.locator('li[data-row-id="2"]');
  const role = (name: string) =>
    row.evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
  await expect(row).toHaveCSS("outline-style", "solid");
  await expect(row).toHaveCSS("outline-width", "2px");
  await expect(row).toHaveCSS("outline-color", rgb(await role("--kc-focus-ring")));
  await expect(row.locator(".kc-row-number")).toHaveCSS(
    "background-color",
    rgb(await role("--kc-focus-bar"))
  );
  await expect(page.locator('li[data-row-id="1"]')).toHaveCSS("outline-style", "none");
});

test("R-5 the value sits below the math, right-aligned", async ({ page }) => {
  await open(page, ["2+3"]);
  const value = page.locator('li[data-row-id="1"] .kc-row-value');
  await expect(value).toContainText("= 5");
  await expect(value).toHaveCSS("text-align", /^(end|right)$/);
  const math = (await page.locator('li[data-row-id="1"] .kc-row-field').boundingBox())!;
  expect((await value.boundingBox())!.y).toBeGreaterThanOrEqual(math.y + math.height - 1);
});

test("K-5 Functions templates land in the row with the caret inside", async ({ page }) => {
  await open(page, [""], "&keypad=open");
  await field(page, 1).focus();
  const keypad = page.getByRole("region", { name: "Keypad" });
  await keypad.getByRole("button", { name: "Functions", exact: true }).click();
  await keypad.getByRole("group", { name: "Trig" }).getByRole("button").first().click();
  await expect(field(page, 1)).toBeFocused();
  await page.keyboard.type("x");
  await expect.poll(() => latexes(page)).toEqual(["\\sin\\left(x\\right)"]);
  await keypad.getByRole("button", { name: "Functions", exact: true }).click();
  await keypad.getByRole("group", { name: "Calculus" }).getByRole("button").nth(3).click();
  await page.keyboard.type("2");
  await expect.poll(async () => (await latexes(page))[0]).toContain("\\log_{2}");
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/editor.spec.ts`.
      Expected: FAIL in every test: the fixture serves its index page for the missing
      `/v2/editor.html`, so `getByRole('textbox', { name: 'Expression 1', exact: true })` and
      `__calculatorHarness` are not found.
- [ ] **Step 3: Write `editor.html` and `editor.tsx`.** `editor.html` is the fixture's
      `index.html` shape (a `<div id="root">`) with `<script type="module" src="./editor.tsx">`
      and the title `Calculator v2 editor harness`. In `editor.tsx`:
  - `readEditorQuery` reads `new URLSearchParams(search)` (which already decodes the
    parameters): `rows` with `JSON.parse` (absent → `null`), `width` with `Number`, the others
    as listed, with the defaults above; `coarsePointer` gives the `pointer` default.
  - `EditorHarness` keeps `announcer` in state (`useState<Announcer | null>(null)`) and creates
    `focus = useMemo(() => createFocusController(engine), [engine])`,
    `escape = useMemo(createEscapeStack, [])` and `open` state (initially `query.keypadOpen`).
    It renders `EngineContext`, `FocusContext` and `EscapeContext` providers around
    `<LiveRegion onReady={(region) => setAnnouncer(createAnnouncer(region))} />` and, only once
    `announcer` is non-null, an `AnnouncerContext` provider holding the editor subtree, so
    `ExpressionPanel`'s `useAnnouncer()` never runs without one; an effect destroys the
    announcer on unmount. Nothing inside any render sets rows or history.
  - The editor subtree is a frame `width: <width>px; height: 600px` (column flex): a top area
    (row for `desktop`, column for `stacked`) with `ExpressionPanel` in a column sized
    `expressionsCollapsed ? "auto" : "40%"` (no transition) and a stand-in graph
    `div[data-testid="graph-stand-in"]` (flex 1, `position: relative`, `--kc-paper`) holding a
    `Settings` button at its top right (`position: absolute; top: 8px; right: 8px`) that toggles
    `SettingsPopover` anchored to it, rendered inside the stand-in so the stand-in is the
    popover's offset parent (Task 15's S-1 test), and a `ResizeObserver` that increments
    `globalThis.__editorHarness.graphResizes`; below it `Keypad` with `containerWidth` from a
    `ResizeObserver` on the frame. `onToggleKeypad`, Show and Hide set `open`;
    `onTouchFocusRow` opens the keypad. An Escape `keydown` on the frame calls
    `escape.handleEscape()` and `preventDefault()` when it returns true. Colours only from
    `var(--kc-*)`.
  - Module level, which sets the rows and clears history before `mountHarness`'s caller
    returns control to the test:

```tsx
globalThis.__editorHarness = { graphResizes: 0 };
const query = readEditorQuery(location.search, matchMedia("(any-pointer: coarse)").matches);
const { engine } = mountHarness({
  root: document.getElementById("root")!,
  css: [tokensCss, mathquillCss, listCss, keypadCss, settingsCss], // each imported with ?inline
  skin: query.skin,
  render: (engine) => <EditorHarness engine={engine} query={query} />,
});
if (query.rows) engine.setExpressions(query.rows.map((latex, i) => ({ id: String(i + 1), latex })));
engine.clearHistory(); // before the first test step, so Undo starts disabled
```

- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 7 tests on each
      project. A failure here is in Tasks 2 to 10's code with real MathQuill; fix it in the owning
      file in this task, rerun that file's own component tests
      (`npx vitest run src/components/calculator-v2/ui`, Expected: PASS) and, when the fix
      touches `styles/`, `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`
      (Expected: PASS, 4 tests).
- [ ] **Step 5: Commit** (the `ui` and `styles` paths stage any Step 4 fix; with none they add
      nothing).

```bash
git add tests/calculator/fixture/v2/editor.html tests/calculator/fixture/v2/editor.tsx tests/calculator/v2/editor.spec.ts src/components/calculator-v2/ui src/components/calculator-v2/styles
git commit -m "Add the v2 editor harness and browser checks for rows, history and templates (09 editor-ui)"
```

### Task 14: Keypad sizes, double-tap and keypad motion in the browser

**Files:**

- Modify: `styles/keypad.css`, `styles/list.css`, `tests/calculator/v2/editor.spec.ts`

**Interfaces:**

- Consumes: Task 13's `open`, `field`, `latexes`, `transitions`; Task 8's key and control sizes
  and Task 10's panel placement CSS; tokens `--kc-duration-instant` (100 ms),
  `--kc-duration-fast` (200 ms), `--kc-ease-standard`.
- Produces: the AN-1, AN-2 and AN-11 transitions and `touch-action: manipulation` in CSS.

- [ ] **Step 1: Write the tests** (append to `editor.spec.ts`). K-1, K-6 and K-4 measure CSS that
      Tasks 8 and 10 already wrote (jsdom has no layout): they are guards, expected to pass at
      once, and fail only if a later change breaks those sizes or placements. K-7, AN-1, AN-2
      and AN-11 are this task's failing tests.

```ts
const keyBoxes = async (keypad: Locator) =>
  Promise.all((await keypad.getByRole("button").all()).map(async (b) => (await b.boundingBox())!));
const fromValue = (target: Locator, property: string) =>
  target.evaluate((el, p) => {
    const a = el.getAnimations().find((x) => (x as CSSTransition).transitionProperty === p);
    return a ? String((a.effect as KeyframeEffect).getKeyframes()[0][p]) : null;
  }, property);

test("K-1 fine-pointer tray keys and the Hide keypad control are at least 32 x 32 px", async ({
  page,
}) => {
  await open(page, [""], "&keypad=open&pointer=fine&width=900");
  const keypad = page.getByRole("region", { name: "Keypad" });
  await expect(keypad).toHaveAttribute("data-layout", "tray");
  await expect(keypad.getByRole("button", { name: "Hide keypad" })).toBeVisible();
  for (const box of await keyBoxes(keypad))
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(32);
});

test("K-6 containers under 600 px use the 7 x 6 keypad with 44 px keys whatever the pointer, and wider ones the tray, every key at least 44 px on coarse pointers", async ({
  page,
}) => {
  const cases = [
    [320, "phone", "coarse", 390, 844],
    [599, "phone", "coarse", 640, 844],
    [599, "phone", "fine", 640, 844], // a narrow floating window on a desktop
    [600, "tray", "coarse", 640, 844],
    [844, "tray", "coarse", 844, 390],
  ] as const;
  for (const [width, layout, pointer, vw, vh] of cases) {
    await page.setViewportSize({ width: vw, height: vh });
    await open(page, [""], `&keypad=open&pointer=${pointer}&width=${width}`);
    const keypad = page.getByRole("region", { name: "Keypad" });
    await expect(keypad).toHaveAttribute("data-layout", layout);
    await expect(keypad.getByRole("button", { name: "Tilde", exact: true })).toBeVisible();
    for (const box of await keyBoxes(keypad))
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await keypad.getByRole("button", { name: "ABC", exact: true }).click();
    for (const box of await keyBoxes(keypad))
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  }
});

test("K-4 the Functions panel scrolls directly above the keypad from 560 px and covers the keypad area below 560 px", async ({
  page,
}) => {
  const cases = [
    [900, "above", 1280, 800],
    [390, "cover", 390, 844],
  ] as const;
  for (const [width, placement, vw, vh] of cases) {
    await page.setViewportSize({ width: vw, height: vh });
    await open(page, [""], `&keypad=open&pointer=coarse&width=${width}`);
    await field(page, 1).focus();
    const keypad = page.getByRole("region", { name: "Keypad" });
    await keypad.getByRole("button", { name: "Functions", exact: true }).click();
    const panel = page.locator(".kc-functions-panel");
    await expect(panel).toHaveAttribute("data-placement", placement);
    await expect.poll(() => transitions(panel), { intervals: [16] }).toEqual([]); // AN-2 ended
    await expect(panel).toHaveCSS("overflow-y", "auto");
    const p = (await panel.boundingBox())!;
    const k = (await keypad.boundingBox())!;
    if (placement === "above") {
      await expect(panel).toHaveCSS("max-height", "240px");
      expect(Math.abs(p.y + p.height - k.y)).toBeLessThanOrEqual(1);
    } else {
      for (const d of [p.x - k.x, p.y - k.y, p.width - k.width, p.height - k.height])
        expect(Math.abs(d)).toBeLessThanOrEqual(1);
    }
  }
});

test("K-7 double-tapping the keypad = gives one ~ in one undo step, announces tilde; hardware == stays", async ({
  page,
  isMobile,
}) => {
  await open(page, [""], "&keypad=open");
  await field(page, 1).focus();
  const keypad = page.getByRole("region", { name: "Keypad" });
  const equals = keypad.getByRole("button", { name: "Equals", exact: true });
  await expect(equals).toHaveCSS("touch-action", "manipulation");
  await keypad.getByRole("button", { name: "y", exact: true }).click();
  if (isMobile) {
    await equals.tap();
    await equals.tap();
  } else await equals.dblclick();
  await expect.poll(async () => (await latexes(page))[0]).toMatch(/^y\\sim\s*$/);
  await expect(page.getByRole("status")).toHaveText("tilde");
  await expect(page.locator('li[data-row-id="1"] .kc-row-error')).toHaveText(
    "This calculator doesn't support that notation."
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => latexes(page)).toEqual(["y="]);
  await field(page, 1).focus();
  await page.keyboard.press("End");
  await page.keyboard.type("==");
  await expect.poll(async () => (await latexes(page))[0]).not.toContain("\\sim");
});

test("AN-1 the keypad slides on translateY over 200 ms with ease-standard and is visibility:hidden once hidden", async ({
  page,
}) => {
  await open(page, [""]);
  const tray = page.locator(".kc-keypad");
  await expect(tray).toHaveCSS("visibility", "hidden");
  await page.getByRole("button", { name: "Show keypad" }).click();
  await expect
    .poll(() => transitions(tray), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 200 });
  await expect(tray).toHaveCSS("transition-timing-function", /cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  await page.getByRole("button", { name: "Hide keypad" }).click();
  await expect
    .poll(() => transitions(tray), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 200 });
  await expect(tray).toHaveCSS("visibility", "hidden");
});

test("AN-2 the Functions panel fades in rising 8 px over 200 ms and fades out over 100 ms", async ({
  page,
}) => {
  await open(page, [""], "&keypad=open");
  await field(page, 1).focus();
  const functions = page.getByRole("button", { name: "Functions", exact: true });
  const panel = page.locator(".kc-functions-panel");
  await functions.click();
  await expect
    .poll(() => transitions(panel), { intervals: [16] })
    .toEqual(
      expect.arrayContaining([
        { property: "opacity", duration: 200 },
        { property: "transform", duration: 200 },
      ])
    );
  expect(await fromValue(panel, "transform")).toMatch(
    /translateY\(8px\)|matrix\(1, 0, 0, 1, 0, 8\)/
  );
  await functions.click();
  await expect(panel).toHaveAttribute("inert"); // a fading panel takes no second tap
  await expect
    .poll(() => transitions(panel), { intervals: [16] })
    .toEqual([{ property: "opacity", duration: 100 }]);
  await expect(panel).toHaveCount(0);
});

test("AN-11 keys and toolbar buttons change background tone over 100 ms on press, with no scale or shadow", async ({
  page,
}) => {
  await open(page, [""], "&keypad=open&pointer=fine");
  const roleOf = (target: Locator, name: string) =>
    target.evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
  const cases = [
    [page.getByRole("button", { name: "7", exact: true }), "--kc-key", "--kc-key-operator"],
    [page.getByRole("button", { name: "Divide", exact: true }), "--kc-key-operator", "--kc-key"],
    [page.getByRole("button", { name: "Add item" }), "--kc-list", "--kc-chrome"],
  ] as const;
  for (const [target, restRole, pressedRole] of cases) {
    await expect(target).toHaveCSS("transition-property", "background-color");
    await expect(target).toHaveCSS("transition-duration", "0.1s");
    const rest = await target.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(rest).toBe(rgb(await roleOf(target, restRole)));
    await target.hover();
    await page.mouse.down();
    await expect(target).toHaveCSS("transform", "none");
    await expect(target).toHaveCSS("box-shadow", "none");
    await expect(target).not.toHaveCSS("background-color", rest);
    await expect(target).toHaveCSS("background-color", rgb(await roleOf(target, pressedRole)));
    await page.mouse.up();
  }
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios --project=calculator-android tests/calculator/v2/editor.spec.ts -g "K-1|K-6|K-4|K-7|AN-1|AN-2|AN-11"`.
      Expected: the guards K-1, K-6 and K-4 PASS (Task 8's sizes, including `Hide keypad`, and
      Task 10's placement); K-7 FAILS on `toHaveCSS("touch-action", "manipulation")` (received
      `auto`); AN-1 and AN-2 FAIL when the `transitions()` poll times out at `[]`; AN-11 FAILS
      first on `toHaveCSS("transition-property", "background-color")` (received `all`, the
      initial value).
- [ ] **Step 3: Add the CSS.** In `keypad.css` (the keypad becomes visible at once and hidden
      only after its slide):

```css
.kc-key {
  touch-action: manipulation;
  transition: background-color var(--kc-duration-instant) var(--kc-ease-standard);
}
/* AN-11 press tone: the other 10.3 key role (package Decisions, "Press tone is a 10.3 role") */
.kc-key[data-tone="key"]:is(:active, [data-pressed="true"]) {
  background-color: var(--kc-key-operator);
}
.kc-key[data-tone="operator"]:is(:active, [data-pressed="true"]) {
  background-color: var(--kc-key);
}
.kc-key[data-tone="accent"]:is(:active, [data-pressed="true"]) {
  background-color: var(--kc-key-operator);
  color: var(--kc-text); /* --kc-accent-label is measured only on the accent */
}
.kc-keypad {
  transition:
    transform var(--kc-duration-fast) var(--kc-ease-standard),
    visibility 0s linear var(--kc-duration-fast);
}
.kc-keypad[data-open="true"] {
  transition:
    transform var(--kc-duration-fast) var(--kc-ease-standard),
    visibility 0s linear 0s;
}
.kc-functions-panel {
  transition:
    opacity var(--kc-duration-fast) var(--kc-ease-standard),
    transform var(--kc-duration-fast) var(--kc-ease-standard);
}
.kc-functions-panel[data-state="enter"] {
  opacity: 0;
  transform: translateY(8px);
}
.kc-functions-panel[data-state="closing"] {
  opacity: 0;
  transition: opacity var(--kc-duration-instant) var(--kc-ease-standard);
}
```

In `list.css`, every button of the panel (toolbar, tab, hint action, Delete, Expand list) gets
the same `background-color` transition, a resting `background-color: var(--kc-list)` and an
`:active` `background-color: var(--kc-chrome)` (the tab's swatch is its glyph, drawn in
`currentColor` from `--kc-row-color`, so the tab's background is free for the tone). Every pressed background is a 10.3 role whose
label pair 03's TH-1 suite already measures in all 12 skins (`text` and `textSecondary` at 7:1 on
key, keyOperator and chrome), so no `color-mix()` colour and no unmeasured pair is drawn.

- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 7 tests on each
      project. Then `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`.
      Expected: PASS, 4 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/styles/keypad.css src/components/calculator-v2/styles/list.css tests/calculator/v2/editor.spec.ts
git commit -m "Add v2 keypad press, slide and panel motion with browser checks of sizes and double-tap (09 editor-ui)"
```

### Task 15: List and settings motion in the browser

**Files:**

- Modify: `styles/list.css`, `styles/settings.css`, `tests/calculator/v2/editor.spec.ts`

**Interfaces:**

- Consumes: Tasks 6, 11 and 13 to 14 (`data-motion`, `data-list-state`, `.kc-list-body`,
  `.kc-settings[data-state]`, Task 11's popover placement, Task 13's top-right `Settings`
  anchor, `transitions`, `fromValue`, `__editorHarness`).
- Produces: the AN-3, AN-4 and AN-5 transitions in CSS, and the S-1 placement guard.

- [ ] **Step 1: Write the failing tests** (append to `editor.spec.ts`):

```ts
test("AN-3 Collapse and Expand list move the list on transform over 200 ms and resize the graph once each, at the end", async ({
  page,
}) => {
  await open(page, ["y=x"]);
  const resizes = () => page.evaluate(() => globalThis.__editorHarness!.graphResizes);
  await page.waitForTimeout(100);
  const base = await resizes();
  await page.getByRole("button", { name: "Collapse list" }).click();
  await expect
    .poll(() => transitions(page.locator(".kc-list-body")), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 200 });
  expect(await resizes()).toBe(base);
  await expect.poll(resizes).toBe(base + 1);
  await page.waitForTimeout(300);
  expect(await resizes()).toBe(base + 1);
  await page.getByRole("button", { name: "Expand list" }).click();
  await expect
    .poll(() => transitions(page.locator(".kc-list-body")), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 200 });
  expect(await resizes()).toBe(base + 1);
  await expect.poll(resizes).toBe(base + 2);
  await page.waitForTimeout(300);
  expect(await resizes()).toBe(base + 2);
});

test("AN-4 the settings popover fades in rising 4 px over 100 ms and fades out over 100 ms", async ({
  page,
}) => {
  await open(page, [""]);
  const settings = page.getByRole("button", { name: "Settings" });
  const popover = page.locator(".kc-settings");
  await settings.click();
  await expect
    .poll(() => transitions(popover), { intervals: [16] })
    .toEqual(
      expect.arrayContaining([
        { property: "opacity", duration: 100 },
        { property: "transform", duration: 100 },
      ])
    );
  expect(await fromValue(popover, "transform")).toMatch(
    /translateY\(-4px\)|matrix\(1, 0, 0, 1, 0, -4\)/
  );
  await page.keyboard.press("Escape");
  await expect(popover).toHaveAttribute("inert"); // a fading popover takes no input
  await expect
    .poll(() => transitions(popover), { intervals: [16] })
    .toEqual([{ property: "opacity", duration: 100 }]);
  await expect(popover).toHaveCount(0);
  await expect(settings).toBeFocused();
});

test("S-1 the settings popover opens below its Settings control with right edges aligned", async ({
  page,
}) => {
  await open(page, [""]);
  const settings = page.getByRole("button", { name: "Settings", exact: true });
  await settings.click();
  const popover = page.getByRole("dialog", { name: "Graph settings" });
  await expect(popover).toBeVisible();
  await expect.poll(() => transitions(popover), { intervals: [16] }).toEqual([]); // AN-4 ended
  const a = (await settings.boundingBox())!;
  const p = (await popover.boundingBox())!;
  expect(Math.abs(p.x + p.width - (a.x + a.width))).toBeLessThanOrEqual(1);
  expect(p.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
});

test("AN-5 rows grow in over 200 ms and collapse out over 100 ms without moving another row's caret", async ({
  page,
}) => {
  await open(page, ["y=x", "a=2", "b=3"]);
  await field(page, 1).focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({ id: "9", latex: "y=3" })
  );
  await expect
    .poll(() => transitions(page.locator('li[data-row-id="9"]')), { intervals: [16] })
    .toContainEqual({ property: "grid-template-rows", duration: 200 });
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.removeExpression({ id: "2" }));
  const ghost = page.locator('li[data-row-id="2"]');
  await expect(ghost).toHaveAttribute("data-motion", "exit");
  await expect
    .poll(() => transitions(ghost), { intervals: [16] })
    .toContainEqual({ property: "grid-template-rows", duration: 100 });
  await expect(ghost).toHaveCount(0);
  await page.keyboard.type("2");
  await expect.poll(() => latexes(page)).toEqual(["y=2x", "b=3", "y=3"]);
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/editor.spec.ts -g "AN-3|AN-4|AN-5|S-1"`.
      Expected: AN-3, AN-4 and AN-5 FAIL, each `expect.poll` on `transitions()` times out at
      `[]`. S-1 PASSES at once: it is a guard of Task 11's placement and Task 13's anchor (jsdom
      has no layout, so this is the first test that measures them), like Task 14's K-1.
- [ ] **Step 3: Add the CSS.** `list.css` (the list body's collapsed transform also applies to
      Task 6's first `expanding` commit, `data-enter="true"`) and `settings.css`:

```css
/* list.css */
.kc-list-body {
  transition: transform var(--kc-duration-fast) var(--kc-ease-standard);
}
.kc-list-panel[data-list-state="collapsing"] .kc-list-body,
.kc-list-body[data-enter="true"] {
  transform: translateX(-100%);
}
.kc-list-panel[data-layout="stacked"][data-list-state="collapsing"] .kc-list-body,
.kc-list-panel[data-layout="stacked"] .kc-list-body[data-enter="true"] {
  transform: translateY(100%);
}
.kc-row {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--kc-duration-fast) var(--kc-ease-standard);
}
.kc-row:is([data-motion="enter"], [data-motion="exit"]) {
  grid-template-rows: 0fr;
}
.kc-row[data-motion="exit"] {
  transition-duration: var(--kc-duration-instant);
}
.kc-row-inner {
  min-height: 0;
  overflow: hidden; /* its 4 px padding (Task 2) keeps inner focus outlines inside the clip */
}
/* settings.css */
.kc-settings {
  transition:
    opacity var(--kc-duration-instant) var(--kc-ease-standard),
    transform var(--kc-duration-instant) var(--kc-ease-standard);
}
.kc-settings[data-state="enter"] {
  opacity: 0;
  transform: translateY(-4px);
}
.kc-settings[data-state="closing"] {
  opacity: 0;
  transition: opacity var(--kc-duration-instant) var(--kc-ease-standard);
}
```

- [ ] **Step 4: Run them and see them pass.** Same command, then the whole spec on the wave gate
      projects:
      `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/editor.spec.ts`.
      Expected: PASS, 18 tests on each project (7 from Task 13, 7 from Task 14, 4 from this
      task). Then `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`.
      Expected: PASS, 4 tests. Then
      `npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 09`. Expected: exit 0.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/styles/list.css src/components/calculator-v2/styles/settings.css tests/calculator/v2/editor.spec.ts
git commit -m "Add v2 list, row and settings motion with browser checks (09 editor-ui)"
```
