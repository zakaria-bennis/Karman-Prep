# 13 paste-standalone, part 4 of 5: paste, refusals, shortcuts and title-bar colours in the browser (Tasks 9 to 11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 4 of package `13-paste-standalone.md`, which holds the package header, the Consumes list,
the package-internal names, the DOM contract, the Decisions and the Notes for the lead; they apply
to every task here. Tasks run in number order across the five parts; each part starts where the
previous one ends.

---

### Task 9: Paste in the browser (L-13, AR-14, T-12)

**Files:**

- Modify: `docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` (T-12, OI-37)
- Create: `tests/calculator/v2/paste.spec.ts`

**Interfaces:**

- Consumes: the quiz fixture `/?flow=practice&calc=v2` and window DOM contract (11: `[data-calculator-window]`, `[data-calculator-titlebar]`, `[data-calculator-host]`, the "Toggle Karman calculator" and "Open Karman calculator" buttons); `globalThis.__calculatorHarness: { engine: CalculatorEngine } | undefined` (07) with `engine.getExpressions(): ExpressionState[]`, `setBlank(): void`, `setExpressions(list: ExpressionState[]): void`; 09's row DOM (`li[data-row-id]`, `data-active="true"` on the active row); this package's DOM contract.
- Produces: the spec helpers below, reused by tasks 10 and 11.

- [ ] **Step 1: Check the OI-37 decision and apply its spec text.** Run
      `grep -cE '^\| OI-37 .*\| (accepted|amended) [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/superpowers/specs/calculator-v2/open-items.md`;
      Expected: `1`. Any other output: stop and ask the lead (a rejection re-plans decision 12 and
      tasks 2, 3 and 9, 00-index section 6.2). Then in T-12 replace
      `into the same LaTeX that typing it would produce`
      with
      `` into the LaTeX that typing its meaning would produce, keeping the raw PR-18 meaning where typing the same characters builds something else: `sqrt(x)` pastes as `\sqrt{x}`, `3/4x` as `\frac{3}{4}x`, `x/2` as `x/2` and `x^2y` as `x^{2}y` `` (OI-37's text in `open-items.md`).
      Check: `grep -cF "into the LaTeX that typing its meaning would produce" docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` prints `1`.
- [ ] **Step 2: Write the browser tests.** The top of `paste.spec.ts`:

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";
const R = String.raw;
const REFUSED = "Figures, images and saved graphs can't be pasted into the calculator.";
const TABLE = "This table can't be pasted into the calculator.";
const trigger = (page: Page) =>
  page.getByRole("button", { name: "Toggle Karman calculator", exact: true });
const side = (page: Page) =>
  page.getByRole("button", { name: "Open Karman calculator", exact: true });
const row = (page: Page, n = 1) =>
  page.getByRole("textbox", { name: `Expression ${n}`, exact: true });
const pasteButton = (page: Page) =>
  page.getByRole("button", { name: "Paste into calculator", exact: true });
const frame = (page: Page) => page.locator("[data-calculator-window]");
const latex = (page: Page) =>
  page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getExpressions().map((e) => e.latex ?? "")
  );
const setRows = (page: Page, rows: string[]) =>
  page.evaluate((r) => {
    const e = globalThis.__calculatorHarness!.engine;
    e.setBlank();
    e.setExpressions(r.map((l, i) => ({ id: String(i + 1), latex: l })));
  }, rows);
const focusedRow = (page: Page) =>
  page.evaluate(
    () =>
      document
        .querySelector("[data-calculator-host]")!
        .shadowRoot!.activeElement?.closest("[data-row-id]")
        ?.getAttribute("data-row-id") ?? null
  );
const announced = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as { __announced: string[] }).__announced);
const problems: string[] = [];
test.beforeEach(({ page }) => {
  problems.length = 0;
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
});
test.afterEach(() => expect(problems).toEqual([]));
async function openV2(page: Page) {
  await page.goto("/?flow=practice&calc=v2");
  const { width, height } = page.viewportSize()!;
  await (width <= 767 || height <= 500 ? side(page) : trigger(page)).click();
  await expect(row(page)).toBeVisible();
  await page.evaluate(() => {
    const region = document
      .querySelector("[data-calculator-host]")!
      .shadowRoot!.querySelector('[role="status"]')!;
    const seen: string[] = [];
    let last = "";
    (globalThis as unknown as { __announced: string[] }).__announced = seen;
    new MutationObserver(() => {
      const text = region.textContent?.trim() ?? "";
      if (text && text !== last) seen.push(text);
      last = text;
    }).observe(region, { childList: true, subtree: true, characterData: true });
  });
}
type FileSpec = { name: string; type: string }[];
async function dispatch(
  target: Locator,
  type: "paste" | "drop",
  data: Record<string, string>,
  files: FileSpec = []
) {
  await target.evaluate(
    (el, [t, d, f]) => {
      const dt = new DataTransfer();
      for (const [mime, value] of Object.entries(d)) dt.setData(mime, value);
      for (const file of f)
        dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], file.name, { type: file.type }));
      const event = new Event(t, { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(event, t === "paste" ? "clipboardData" : "dataTransfer", { value: dt });
      el.dispatchEvent(event);
    },
    [type, data, files] as const
  );
}
async function stubClipboard(page: Page, items: Record<string, string>[] | "deny") {
  await page.evaluate((spec) => {
    const read = async () => {
      if (spec === "deny") throw new DOMException("Read permission denied.", "NotAllowedError");
      return spec.map((entry) => ({
        types: Object.keys(entry),
        // like ClipboardItem.getType: an unlisted type rejects (decision 14)
        getType: async (mime: string) => {
          if (!(mime in entry))
            throw new DOMException(`${mime} is not on the clipboard`, "NotFoundError");
          return new Blob([entry[mime]], { type: mime });
        },
      }));
    };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { read } });
  }, items);
}
// decision 10: a shadow-root layer lies inside the shadow host, below the light-DOM title bar
async function insideHost(page: Page, layer: Locator) {
  const [host, box] = await Promise.all([
    page.locator("[data-calculator-host]").boundingBox(),
    layer.boundingBox(),
  ]);
  return (
    box!.x >= host!.x - 0.5 &&
    box!.y >= host!.y - 0.5 &&
    box!.x + box!.width <= host!.x + host!.width + 0.5 &&
    box!.y + box!.height <= host!.y + host!.height + 0.5
  );
}
```

The tests:

```ts
test("L-13 the Paste button inserts clipboard math as rows and focuses or activates the last inserted row", async ({
  page,
  isMobile,
}) => {
  await openV2(page);
  await stubClipboard(page, [{ "text/plain": "y=2x+1\n(1,2)" }]);
  await pasteButton(page).click();
  await expect.poll(() => latex(page)).toEqual(["y=2x+1", R`\left(1,2\right)`]);
  // decision 1: DOM focus on a fine pointer; on a coarse pointer row 2 becomes the active row
  if (isMobile)
    await expect(
      page.locator('[data-calculator-host] [data-row-id="2"][data-active="true"]')
    ).toHaveCount(1);
  else await expect.poll(() => focusedRow(page)).toBe("2");
});
test("L-13 when reading is denied the Paste button opens Math to paste; Insert adds rows; Cancel and Escape change nothing", async ({
  page,
}) => {
  await openV2(page);
  await stubClipboard(page, "deny");
  const box = page.getByRole("textbox", { name: "Math to paste", exact: true });
  await pasteButton(page).click();
  await expect(box).toBeVisible();
  expect(await insideHost(page, page.locator("[data-kc-paste-box]"))).toBe(true);
  await box.fill("y=3x\n(2,5)");
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await expect.poll(() => latex(page)).toEqual(["y=3x", R`\left(2,5\right)`]);
  await expect(box).toBeHidden();
  await pasteButton(page).click();
  await box.fill("x=9");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(box).toBeHidden();
  await expect(pasteButton(page)).toBeFocused();
  await pasteButton(page).click();
  await box.fill("x=9");
  await box.press("Escape");
  await expect(box).toBeHidden();
  await expect(frame(page)).toBeVisible();
  expect(await latex(page)).toEqual(["y=3x", R`\left(2,5\right)`]);
});
test("L-13 the Paste button refuses images and tables with a status message and inserts nothing", async ({
  page,
}) => {
  await openV2(page);
  await setRows(page, ["y=x"]);
  await stubClipboard(page, [{ "image/png": "png" }]);
  await pasteButton(page).click();
  await expect.poll(() => announced(page)).toContain(REFUSED);
  await stubClipboard(page, [{ "text/plain": "x\ty\n1\t2\n3\t4" }]);
  await pasteButton(page).click();
  await expect.poll(() => announced(page)).toContain(TABLE);
  expect(await latex(page)).toEqual(["y=x"]);
});
test("L-13 on Chromium the Paste button reads the real system clipboard", async ({
  page,
  context,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== "chromium", "Playwright grants clipboard permissions on Chromium only");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await openV2(page);
  await page.evaluate(() => navigator.clipboard.writeText("y=4x"));
  await pasteButton(page).click();
  await expect.poll(() => latex(page)).toEqual(["y=4x"]);
});
test("AR-14 one line pasted into a row is written at the caret as one undo step", async ({
  page,
}) => {
  await openV2(page);
  await row(page).click();
  await page.keyboard.type("1+");
  await dispatch(row(page), "paste", { "text/plain": "x^2" });
  await expect.poll(() => latex(page)).toEqual(["1+x^{2}"]);
  await page.keyboard.press("ControlOrMeta+KeyZ");
  await expect.poll(() => latex(page)).toEqual(["1+"]);
});
test("AR-14 multi-line math and coordinate pairs pasted into a row become new rows in one undo step", async ({
  page,
}) => {
  await openV2(page);
  await setRows(page, ["y=x"]);
  await row(page).click();
  await dispatch(row(page), "paste", { "text/plain": "y=2x\ny=3x" });
  await expect.poll(() => latex(page)).toEqual(["y=x", "y=2x", "y=3x"]);
  await dispatch(row(page), "paste", { "text/plain": "(1,2) (3,4)" });
  await expect
    .poll(() => latex(page))
    .toEqual(["y=x", "y=2x", "y=3x", R`\left(1,2\right)`, R`\left(3,4\right)`]);
  await row(page).focus();
  await page.keyboard.press("ControlOrMeta+KeyZ");
  await expect.poll(() => latex(page)).toEqual(["y=x", "y=2x", "y=3x"]);
});
test("AR-14 question math is read once from its x-tex annotation and MathQuill adds no second copy", async ({
  page,
}) => {
  await openV2(page);
  await row(page).click();
  const html =
    '<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>y</mi></mrow><annotation encoding="application/x-tex">y=\\dfrac{1}{2}x</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">y=21x</span></span>';
  await dispatch(row(page), "paste", { "text/html": html, "text/plain": "y=21xy=21x" });
  await expect.poll(() => latex(page)).toEqual([R`y=\frac{1}{2}x`]);
});
test("AR-14 files, images and drops are refused and a pasted table inserts nothing", async ({
  page,
}) => {
  await openV2(page);
  await setRows(page, ["y=x"]);
  await dispatch(row(page), "paste", {}, [{ name: "graph.png", type: "image/png" }]);
  await expect.poll(() => announced(page)).toContain(REFUSED);
  // the drop is checked on its own: only announcements made after it count (05 empties the
  // region before every write, so an equal message is recorded again)
  const beforeDrop = (await announced(page)).length;
  await dispatch(row(page), "drop", { "text/plain": "x" });
  await expect.poll(async () => (await announced(page)).slice(beforeDrop)).toContain(REFUSED);
  const beforeTable = (await announced(page)).length;
  await dispatch(row(page), "paste", { "text/plain": "a,b\n1,2\n3,4" });
  await expect.poll(async () => (await announced(page)).slice(beforeTable)).toContain(TABLE);
  expect(await latex(page)).toEqual(["y=x"]);
});
// Decision 12: after sqrt the parentheses are the radicand's delimiters, so the typed sequence
// for sqrt(x) is deliberate: s q r t opens the root, x is the radicand, ArrowRight leaves the root.
// Typing the literal characters "(" and ")" would give \sqrt{\left(x\right)} instead.
const TYPED: [string, string[]][] = [
  ["y=sqrt(x)+pi", ["y", "=", "s", "q", "r", "t", "x", "ArrowRight", "+", "p", "i"]],
  ["x^2+1", ["x", "^", "2", "+", "1"]],
  ["x<=1", ["x", "<", "=", "1"]],
  ["a12", ["a", "1", "2"]],
  ["sinx", ["s", "i", "n", "x"]],
  ["2*3", ["2", "*", "3"]],
];
test("T-12 pasted calculator notation gives the LaTeX that typing the same notation gives", async ({
  page,
}) => {
  await openV2(page);
  for (const [text, keys] of TYPED) {
    await setRows(page, ["", ""]);
    await row(page, 1).click();
    for (const key of keys)
      await (key.length === 1 ? page.keyboard.type(key) : page.keyboard.press(key));
    await row(page, 2).click();
    await dispatch(row(page, 2), "paste", { "text/plain": text });
    await expect
      .poll(
        async () => {
          const [typed, pasted] = await latex(page);
          return typed !== "" && pasted === typed;
        },
        { message: text }
      )
      .toBe(true);
  }
});
// Decision 12's named differences: the pasted row keeps the text's raw PR-18 meaning where typing
// the same characters builds something else ([text, keys, typing's LaTeX, the paste's LaTeX]).
const READ_DIFFERENTLY: [string, string[], string, string][] = [
  ["x/2", ["x", "/", "2"], R`\frac{x}{2}`, "x/2"],
  ["3/4x", ["3", "/", "4", "x"], R`\frac{3}{4x}`, R`\frac{3}{4}x`],
  ["x^2y", ["x", "^", "2", "y"], "x^{2y}", "x^{2}y"],
];
test("T-12 pasted notation that typing reads differently gives decision 12's documented LaTeX", async ({
  page,
}) => {
  await openV2(page);
  for (const [text, keys, typed, pasted] of READ_DIFFERENTLY) {
    await setRows(page, ["", ""]);
    await row(page, 1).click();
    for (const key of keys) await page.keyboard.type(key);
    await row(page, 2).click();
    await dispatch(row(page, 2), "paste", { "text/plain": text });
    await expect.poll(() => latex(page), { message: text }).toEqual([typed, pasted]);
  }
});
```

- [ ] **Step 3: Run them** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/paste.spec.ts -g "L-13|AR-14|T-12"`; Expected: PASS on first run (they check tasks 1 to 8 together). A failure is a fix in this package's `src/components/calculator-v2/chrome/` or `src/lib/calculator-transfer/clipboard.ts`, or a report to the owning package under the "Before starting" rule of `13-paste-standalone.md`.
- [ ] **Step 4: Run every project** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari --project=calculator-android --project=calculator-ios tests/calculator/v2/paste.spec.ts -g "L-13|AR-14|T-12"`; Expected: PASS (10 tests × 5 projects, the real-clipboard test skipped outside Chromium). A typed LaTeX in `READ_DIFFERENTLY` that differs on one engine is reported to 05 with the engine, the keys and both strings; a pasted one is a fix in `paste-latex.ts`.
- [ ] **Step 5: Commit** — `git add docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md tests/calculator/v2/paste.spec.ts && git commit -m "Resolve OI-37 in T-12 and check v2 paste, the Paste button and Math to paste in five browsers (L-13, AR-14, T-12)"`

### Task 10: Refusal announcements and OI-26 (A11Y-2 and T-13 contributions)

**Files:**

- Modify: `docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` (A11Y-2, OI-26)
- Modify: `tests/calculator/v2/paste.spec.ts`

**Interfaces:**

- Consumes: task 9 helpers; `EDITOR_MESSAGES.rowLimit` ("The calculator holds at most 100 expressions.") and `EDITOR_MESSAGES.charLimit` ("Each expression can be up to 2,048 characters.") from `src/components/calculator-v2/ui/list/messages.ts` (09; the module holds only the `as const` copy object and `import type` lines, so a Playwright spec can import it without loading the v2 runtime).
- Produces: index 5.3 contributions "13: an over-long paste is refused and the row is unchanged" (T-13) and "13: paste refusals and invalid paste payloads (OI-26)" (A11Y-2).

- [ ] **Step 1: Apply the OI-26 spec text.** In A11Y-2, replace
      `transfer refusals are announced only by the TR-67 region, A11Y-11), and the double-tap tilde (K-7)`
      with
      `transfer refusals are announced only by the TR-67 region, A11Y-11), paste refusals and invalid paste payloads (AR-14, AR-16, D-14), the D-8 table row limit message, and the double-tap tilde (K-7)`.
      Check: `grep -cF "paste refusals and invalid paste payloads (AR-14, AR-16, D-14), the D-8 table row limit message" docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md` prints `1`.
- [ ] **Step 2: Write the tests** (append to `paste.spec.ts`; the import goes to the top of the
      file and the two constants join `REFUSED` and `TABLE`, so the limit copy cannot drift from
      09's `messages.ts`)

```ts
import { EDITOR_MESSAGES } from "../../../src/components/calculator-v2/ui/list/messages";
const ROW_LIMIT = EDITOR_MESSAGES.rowLimit; // "The calculator holds at most 100 expressions."
const CHAR_LIMIT = EDITOR_MESSAGES.charLimit; // "Each expression can be up to 2,048 characters."

test("T-13, NM-42 an over-long paste is refused with the status message and leaves the row unchanged", async ({
  page,
}) => {
  await openV2(page);
  await row(page).click();
  await page.keyboard.type("1+");
  await dispatch(row(page), "paste", { "text/plain": "2".repeat(2100) });
  await expect.poll(() => announced(page)).toContain(CHAR_LIMIT);
  await dispatch(row(page), "paste", { "text/plain": `y=x\n${"3".repeat(2100)}` });
  await expect
    .poll(async () => (await announced(page)).filter((t) => t === CHAR_LIMIT).length)
    .toBe(2);
  expect(await latex(page)).toEqual(["1+"]);
});
test("A11Y-2 paste refusals and invalid paste payloads are announced in the calculator's live region (OI-26)", async ({
  page,
}) => {
  await openV2(page);
  await setRows(page, ["y=x"]);
  const steps: [() => Promise<void>, string][] = [
    [() => dispatch(row(page), "paste", {}, [{ name: "g.png", type: "image/png" }]), REFUSED],
    [() => dispatch(row(page), "drop", {}, [{ name: "g.png", type: "image/png" }]), REFUSED],
    [
      () => dispatch(row(page), "paste", { "text/plain": '{"graphState":{"expressions":[]}}' }),
      REFUSED,
    ],
    [() => dispatch(row(page), "paste", { "text/plain": "x\ty\n1\t2\n3\t4" }), TABLE],
    [
      () =>
        dispatch(row(page), "paste", {
          "text/plain": Array.from({ length: 100 }, (_, i) => `y=${i}`).join("\n"),
        }),
      ROW_LIMIT, // 1 row + 100 new rows > MAX_ROWS (decision 7)
    ],
  ];
  for (const [act, message] of steps) {
    const before = (await announced(page)).length;
    await act();
    await expect
      .poll(async () => (await announced(page)).slice(before), { message })
      .toContain(message);
  }
  expect(await latex(page)).toEqual(["y=x"]);
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("[data-calculator-host]")!
          .shadowRoot!.querySelectorAll('[role="alert"]').length
    )
  ).toBe(0);
});
```

- [ ] **Step 3: Run them** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/paste.spec.ts -g "T-13|A11Y-2"`; Expected: PASS on first run (the announcements come from tasks 4 and 8; the spec text now lists them). Then all five projects: `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari --project=calculator-android --project=calculator-ios tests/calculator/v2/paste.spec.ts -g "T-13|A11Y-2"`; Expected: PASS (2 tests × 5 projects).
- [ ] **Step 4: Commit** — `git add docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md tests/calculator/v2/paste.spec.ts && git commit -m "Resolve OI-26: list paste refusals in A11Y-2 and check their announcements"`

### Task 11: Keyboard shortcuts and title-bar colours across engines (KB-1, L-12)

**Files:**

- Modify: `tests/calculator/v2/paste.spec.ts`

**Interfaces:**

- Consumes: `shippedShortcutRows(phase?: number): ShortcutRow[]` (task 6; `help-content.ts` uses only relative imports, so the spec imports it as `../../../src/components/calculator-v2/chrome/help-content`); `SKIN_IDS` (03, `src/lib/calculator-v2/theme/skins.ts`, the 12 skin ids); the `--kcc-chrome`, `--kcc-text` and `--kcc-boundary` tokens that 03's `calculator-chrome.generated.css` sets on `html[data-theme]` as hex strings (11's TH-2 test reads them the same way); 08's graph surface (`role="img"`, name starting "Graph from"); `EngineSnapshot.viewport: Viewport` and `EngineSnapshot.settings.keypad: boolean` (07).

- [ ] **Step 1: Write the tests** (append; the imports go to the top and `helpButton` and `hex` join
      the helpers)

```ts
import { shippedShortcutRows } from "../../../src/components/calculator-v2/chrome/help-content";
import { SKIN_IDS } from "../../../src/lib/calculator-v2/theme/skins";
const helpButton = (page: Page) =>
  page.getByRole("button", { name: "Keyboard shortcuts and help", exact: true });
// "rgb(r, g, b)" -> "#rrggbb", as 11's quiz-chrome-theme.spec.ts converts computed colours
const hex = (css: string) =>
  `#${css
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("")}`;

test("KB-1 the title bar's Keyboard shortcuts popover lists the Phase 1 shortcuts and help; Escape closes it and focus returns", async ({
  page,
}) => {
  await openV2(page);
  await helpButton(page).click();
  const popover = page.getByRole("dialog", { name: "Keyboard shortcuts and help", exact: true });
  await expect(popover).toBeVisible();
  await expect(helpButton(page)).toHaveAttribute("aria-expanded", "true");
  expect(await insideHost(page, popover)).toBe(true); // decision 10: never over the title bar
  const rows = await popover
    .locator("tbody tr")
    .evaluateAll((trs) =>
      trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent ?? ""))
    );
  expect(rows).toEqual(shippedShortcutRows().map((r) => [r.keys, r.where, r.action]));
  for (const text of ["y=x^2", "f(x)=2x+1", "x=3", "(2,3)", "Paste button", "2^53"])
    await expect(popover).toContainText(text);
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(helpButton(page)).toBeFocused();
  await expect(frame(page)).toBeVisible();
});
test("KB-1 every Phase 1 shortcut works in Chromium, Firefox and WebKit", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "hardware-keyboard sweep; 10's K-2 test covers a hardware keyboard on calculator-ios"
  );
  await openV2(page);
  const count = async () => (await latex(page)).length;
  const keypad = () =>
    page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().settings.keypad);
  const view = () =>
    page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().viewport);
  await row(page).click();
  await page.keyboard.type("1");
  await page.keyboard.press("Enter");
  await expect.poll(() => focusedRow(page)).toBe("2");
  await page.keyboard.press("ArrowUp");
  await expect.poll(() => focusedRow(page)).toBe("1");
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => focusedRow(page)).toBe("2");
  await page.keyboard.press("Alt+Enter");
  await expect.poll(count).toBe(3);
  await expect.poll(() => focusedRow(page)).toBe("3");
  for (const [key, rows] of [
    ["Control+KeyZ", 2],
    ["Meta+KeyZ", 1],
    ["Control+KeyY", 2],
    ["Meta+Shift+KeyZ", 3],
    ["Control+KeyZ", 2],
    ["Control+Shift+KeyZ", 3],
  ] as const) {
    await row(page).focus();
    await page.keyboard.press(key);
    await expect.poll(count, { message: key }).toBe(rows);
  }
  await row(page).focus();
  for (const [key, open] of [
    ["Control+KeyK", true],
    ["Alt+KeyK", false],
    ["Control+KeyK", true],
  ] as const) {
    await page.keyboard.press(key);
    await expect.poll(keypad, { message: key }).toBe(open);
  }
  await page.keyboard.press("Escape");
  await expect.poll(keypad).toBe(false);
  await expect(frame(page)).toBeVisible();
  await page.getByRole("img", { name: /^Graph from/ }).focus();
  const home = await view();
  const span = (v: typeof home) => v.right - v.left;
  const height = (v: typeof home) => v.top - v.bottom;
  const rounded = (n: number) => Math.round(n * 1e6) / 1e6 + 0; // + 0 turns -0 into 0
  // pan by 10% of the visible range: ArrowRight and ArrowUp move the view right and up (08)
  for (const [key, dx, dy] of [
    ["ArrowRight", 0.1, 0],
    ["ArrowLeft", -0.1, 0],
    ["ArrowUp", 0, 0.1],
    ["ArrowDown", 0, -0.1],
  ] as const) {
    const before = await view();
    await page.keyboard.press(key);
    const moved = async () => {
      const v = await view();
      return [(v.left - before.left) / span(before), (v.bottom - before.bottom) / height(before)];
    };
    await expect.poll(async () => (await moved()).map(rounded), { message: key }).toEqual([dx, dy]);
  }
  // zoom in (range x 0.8) or out (range x 1.25) about the centre
  const centre = (v: typeof home) => [(v.left + v.right) / 2, (v.bottom + v.top) / 2];
  for (const [key, ratio] of [
    ["Shift+Equal", 0.8],
    ["Equal", 0.8],
    ["Minus", 1.25],
  ] as const) {
    const before = await view();
    await page.keyboard.press(key);
    await expect
      .poll(async () => span(await view()) / span(before), { message: key })
      .toBeCloseTo(ratio, 6);
    const after = await view();
    expect(height(after) / height(before), key).toBeCloseTo(ratio, 6);
    centre(after).forEach((c, i) => expect(c, key).toBeCloseTo(centre(before)[i], 6));
  }
  await page.keyboard.press("Home");
  await expect
    .poll(async () => Object.values(await view()).map((n) => n.toFixed(9)))
    .toEqual(Object.values(home).map((n) => n.toFixed(9)));
  await row(page).focus();
  await page.keyboard.press("Escape");
  await expect(frame(page)).toBeHidden();
});
test("L-12 the title bar takes its colours from the TH-5 chrome sheet: Paste and Keyboard shortcuts in all 12 skins", async ({
  page,
}) => {
  await openV2(page);
  for (const skin of SKIN_IDS) {
    await page.evaluate((s) => document.documentElement.setAttribute("data-theme", s), skin);
    const seen = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const token = (name: string) => root.getPropertyValue(name).trim().toLowerCase();
      const bar = getComputedStyle(document.querySelector("[data-calculator-titlebar]")!);
      const buttons = ["paste", "shortcuts"].map((key) => {
        const s = getComputedStyle(document.querySelector(`[data-kc-title-button="${key}"]`)!);
        const drawn = ["top", "right", "bottom", "left"].filter(
          (side) => s.getPropertyValue(`border-${side}-style`) !== "none"
        );
        return {
          key,
          color: s.color,
          background: s.backgroundColor,
          borders: drawn.map((side) => s.getPropertyValue(`border-${side}-color`)),
        };
      });
      const sheet = [
        "chrome",
        "text",
        "text-secondary",
        "boundary",
        "focus",
        "accent",
        "accent-label",
      ];
      return {
        chrome: token("--kcc-chrome"),
        text: token("--kcc-text"),
        boundary: token("--kcc-boundary"),
        all: sheet.map((role) => token(`--kcc-${role}`)), // 03's CHROME_VARS
        bar: bar.backgroundColor,
        buttons,
      };
    });
    expect(hex(seen.bar), `${skin} title bar`).toBe(seen.chrome);
    for (const b of seen.buttons) {
      expect(hex(b.color), `${skin} ${b.key} colour`).toBe(seen.text);
      // transparent (the bar's --kcc-chrome shows through) or one of the chrome sheet's colours
      expect(
        b.background === "rgba(0, 0, 0, 0)" || seen.all.includes(hex(b.background)),
        `${skin} ${b.key} background ${b.background}`
      ).toBe(true);
      // every border side 11's .titleSlot > button draws uses --kcc-boundary
      for (const border of b.borders)
        expect(hex(border), `${skin} ${b.key} border`).toBe(seen.boundary);
    }
  }
});
```

- [ ] **Step 2: Run them** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari tests/calculator/v2/paste.spec.ts -g "KB-1|L-12"`; Expected: PASS on first run (the shortcuts are 08's, 09's and 10's; the popover is tasks 6 and 8; the title-bar colours are 11's `.titleSlot > button` rule and 03's chrome sheet). A failing shortcut is reported to its owner with the engine and key; a colour mismatch is reported to 11 with the skin, the button and both values. Then the popover and L-12 tests on the touch projects (the sweep skips itself there): `npm run test:calculator -- --project=calculator-ios --project=calculator-android tests/calculator/v2/paste.spec.ts -g "KB-1 the title bar|L-12"`; Expected: PASS (2 tests × 2 projects).
- [ ] **Step 3: Commit** — `git add tests/calculator/v2/paste.spec.ts && git commit -m "Check every Phase 1 shortcut, the help popover and the title-bar colours across engines (KB-1, L-12)"`
