# 05 editor-foundation, part 4 of 4: harness page, keystroke corpus, round trip and package gate (Tasks 8 to 11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 4 of package `05-editor-foundation.md`, which holds the package header, Package rules,
the file table, Decisions (upstream facts, patches, MathQuill options, the adapter and announcer
contracts, speech text), Notes for the lead and the consumed 02 interfaces; they apply to every
task here. Tasks run in number order across the four parts.

---

### Task 8: Harness page and adapter browser tests (AR-42, API-15, T-11)

**Files:**

- Create: `tests/calculator/fixture/v2/env.d.ts`, `tests/calculator/fixture/v2/math-field.html`,
  `tests/calculator/fixture/v2/math-field.tsx`
- Test: `tests/calculator/v2/math-field.spec.ts`

**Interfaces:** Consumes Tasks 6 and 7, `MAX_ROW_CHARACTERS` (02). Produces the page
`/v2/math-field.html?fields=<n, default 2>&maxLength=<n, default MAX_ROW_CHARACTERS>` and:

```ts
// tests/calculator/fixture/v2/env.d.ts (a global declaration file, no imports)
declare module "*.css?inline" {
  const css: string;
  export default css;
}
// tests/calculator/fixture/v2/math-field.tsx
export type HarnessEventType =
  | "edit"
  | "enter"
  | "arrow-out"
  | "delete-out"
  | "focus"
  | "blur"
  | "refused";
export interface HarnessEvent {
  field: number;
  type: HarnessEventType;
  detail: string | null;
}
export interface MathFieldHarness {
  fields: MathField[];
  events: HarnessEvent[];
  keydowns: string[]; // `${key}:${defaultPrevented}` of each keydown reaching the shadow root, except Control, Meta, Shift and Alt
  shadow: ShadowRoot;
}
declare global {
  interface Window {
    __mathFieldHarness?: MathFieldHarness;
  }
}
```

The page body is `<div id="host"></div>` and loads
`./math-field.tsx` as a module. The script imports `katex/dist/katex.min.css` at document scope,
attaches an open shadow root to `#host`, adds one `<style>` holding `tokens.css?inline` (via
`@/components/calculator-v2/styles/tokens.css?inline`), `mathquill.css?inline` (via
`../../../../vendor/mathquill/mathquill.css?inline`) and
`.row { display: block; padding: 8px; font: var(--kc-size-math) var(--kc-font-math); }`, creates
one `div.row[data-field=i]` per field with `createMathField(row, { ariaLabel: "Expression i+1",
maxLength, … })` whose callbacks push `HarnessEvent`s, adds a bubbling `keydown` listener on the
shadow root that returns at once for a modifier key
(`if (["Control", "Meta", "Shift", "Alt"].includes(event.key)) return;`, because Playwright's
`press("Control+z")` also sends a keydown for each modifier) and otherwise pushes
`` `${event.key}:${event.defaultPrevented}` `` to `keydowns`, sets `window.__mathFieldHarness`,
then `document.body.dataset.ready = "true"`. The page uses no React.

- [ ] **Step 1: Write the failing browser tests**

```ts
import { expect, test, type Page } from "@playwright/test";

async function open(page: Page, query = "") {
  await page.goto(`/v2/math-field.html${query}`);
  await page.locator("body[data-ready=true]").waitFor();
}
const textarea = (page: Page, i = 0) => page.locator("#host textarea").nth(i);
const fieldEl = (page: Page, i = 0) => page.locator("#host .kc-math-field").nth(i);
const latexOf = (page: Page, i = 0) =>
  page.evaluate((n) => window.__mathFieldHarness!.fields[n].latex(), i);
const eventLog = (page: Page, types: string[]) =>
  page.evaluate(
    (t) =>
      window
        .__mathFieldHarness!.events.filter((e) => t.includes(e.type))
        .map((e) => `${e.field}:${e.type}:${e.detail}`),
    types
  );

const pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors.length = 0;
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("AR-42 typing, focus, blur and the caret echo work inside the shadow root", async ({
  page,
}) => {
  await open(page);
  await fieldEl(page, 0).click();
  await page.keyboard.type("y=x^2");
  expect(await latexOf(page)).toBe("y=x^{2}");
  expect(
    await page.evaluate(() => {
      const host = document.getElementById("host")!;
      return [
        document.activeElement === host,
        host.shadowRoot!.activeElement === host.shadowRoot!.querySelector("textarea"),
      ];
    })
  ).toEqual([true, true]);
  await page.keyboard.press("ArrowLeft");
  await expect(fieldEl(page, 0).locator(".mq-aria-alert")).not.toHaveText(""); // patch 0003
  await fieldEl(page, 1).click();
  expect(await eventLog(page, ["focus", "blur"])).toEqual([
    "0:focus:null",
    "0:blur:null",
    "1:focus:null",
  ]);
  expect(await eventLog(page, ["edit"])).toContain("0:edit:y=x^{2}");
});
test("AR-42 the adapter methods drive the field", async ({ page }) => {
  await open(page);
  expect(
    await page.evaluate(() => {
      const f = window.__mathFieldHarness!.fields[0];
      const shadow = window.__mathFieldHarness!.shadow;
      const out: (string | null)[] = [];
      f.latex("x+1");
      out.push(f.latex());
      f.write("\\frac{1}{2}");
      out.push(f.latex());
      f.latex("");
      f.cmd("\\sqrt");
      f.typedText("x");
      out.push(f.latex());
      f.keystroke("Right");
      f.typedText("+1");
      out.push(f.latex());
      f.select();
      out.push(f.selectedLatex());
      f.clearSelection();
      out.push(f.selectedLatex());
      f.latex("y=x^{2}+\\frac{3}{4}");
      out.push(f.speechText());
      f.focus();
      out.push(shadow.activeElement?.tagName ?? null);
      f.blur();
      out.push(shadow.activeElement?.tagName ?? null);
      return out;
    })
  ).toEqual([
    "x+1",
    "x+1\\frac{1}{2}",
    "\\sqrt{x}",
    "\\sqrt{x}+1",
    "\\sqrt{x}+1",
    null,
    "y equals x squared plus 3 fourths",
    "TEXTAREA",
    null,
  ]);
});
test("AR-42 keyboard selection, reflow and setInputMode work inside the shadow root", async ({
  page,
}) => {
  await open(page);
  await textarea(page, 0).focus();
  await page.keyboard.type("x+1");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  expect(await page.evaluate(() => window.__mathFieldHarness!.fields[0].selectedLatex())).toBe(
    "+1"
  );
  expect(
    await page.evaluate(() => {
      const before = globalThis.__karmanCalculatorCounters?.reflows ?? 0;
      window.__mathFieldHarness!.fields[0].reflow();
      return (globalThis.__karmanCalculatorCounters?.reflows ?? 0) - before;
    })
  ).toBe(1);
  await page.evaluate(() => window.__mathFieldHarness!.fields[0].setInputMode("none"));
  await expect(textarea(page, 0)).toHaveAttribute("inputmode", "none");
  expect(await latexOf(page)).toBe("x+1");
});
test("AR-42 Enter, Up, Down and Backspace or Delete at an edge raise events", async ({ page }) => {
  await open(page);
  await textarea(page, 0).focus();
  await page.keyboard.type("x");
  for (const key of ["Enter", "ArrowUp", "ArrowDown", "Home", "Backspace", "End", "Delete"])
    await page.keyboard.press(key);
  expect(await eventLog(page, ["enter", "arrow-out", "delete-out"])).toEqual([
    "0:enter:null",
    "0:arrow-out:up",
    "0:arrow-out:down",
    "0:delete-out:left",
    "0:delete-out:right",
  ]);
  expect(await latexOf(page)).toBe("x");
});
test("AR-42 native undo, redo, copy, cut and MathQuill paste are disabled in the field", async ({
  page,
}) => {
  await open(page);
  await textarea(page, 0).focus();
  await page.keyboard.type("x");
  for (const chord of ["Control+z", "Meta+z", "Control+Shift+z", "Meta+Shift+z", "Control+y"])
    await page.keyboard.press(chord);
  const keydowns = await page.evaluate(() => window.__mathFieldHarness!.keydowns);
  // only the chord keys (the harness skips modifier keydowns; Shift+z sends key "Z")
  expect(keydowns.filter((k) => /^[zZy]:/.test(k))).toEqual([
    "z:true",
    "z:true",
    "Z:true",
    "Z:true",
    "y:true",
  ]);
  expect(
    await page.evaluate(async () => {
      const f = window.__mathFieldHarness!.fields[0];
      const t = window.__mathFieldHarness!.shadow.querySelector("textarea")!;
      const fire = (event: Event) => (t.dispatchEvent(event), event.defaultPrevented);
      const prevented = [
        fire(new Event("paste", { bubbles: true, cancelable: true })),
        fire(
          new InputEvent("beforeinput", {
            inputType: "historyUndo",
            bubbles: true,
            cancelable: true,
          })
        ),
      ];
      f.select();
      prevented.push(fire(new Event("copy", { bubbles: true, cancelable: true })));
      prevented.push(fire(new Event("cut", { bubbles: true, cancelable: true })));
      // MathQuill's cut path would act in a setTimeout; read after it would have run
      await new Promise((resolve) => setTimeout(resolve, 50));
      return [...prevented, f.latex(), f.selectedLatex()];
    })
  ).toEqual([true, true, true, true, "x", "x"]);
});
test("AR-42 a keystroke past maxLength is refused and leaves the field unchanged", async ({
  page,
}) => {
  await open(page, "?fields=1&maxLength=8");
  await textarea(page).focus();
  await page.keyboard.type("x+123456");
  await page.keyboard.type("7");
  expect(await latexOf(page)).toBe("x+123456");
  expect(await eventLog(page, ["refused"])).toEqual(["0:refused:char-limit"]);
});
test("API-15 mounting MathFields defines no window.MathQuill", async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => "MathQuill" in window)).toBe(false);
});
test("T-11 the hidden textarea has the typing attributes and inputmode follows setInputMode", async ({
  page,
}) => {
  await open(page);
  const attributes = () =>
    textarea(page).evaluate((t) =>
      ["autocapitalize", "autocorrect", "spellcheck", "inputmode"].map((a) => t.getAttribute(a))
    );
  expect(await attributes()).toEqual(["off", "off", "false", "text"]);
  await page.evaluate(() => window.__mathFieldHarness!.fields[0].setInputMode("none"));
  expect(await attributes()).toEqual(["off", "off", "false", "none"]);
  await page.evaluate(() => window.__mathFieldHarness!.fields[0].setInputMode("text"));
  expect(await attributes()).toEqual(["off", "off", "false", "text"]);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/math-field.spec.ts`
Expected: FAIL, every test times out waiting for `body[data-ready=true]` (Vite answers the missing
`/v2/math-field.html` with its SPA fallback page).

- [ ] **Step 3: Implement** the three fixture files as described.

- [ ] **Step 4: Run them and see them pass** on every engine:

Run: `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari --project=calculator-ios --project=calculator-android tests/calculator/v2/math-field.spec.ts`
Expected: PASS (8 tests × 5 projects), then `npx tsc --noEmit` and `npm run lint` PASS. The
harness runs under the fixture server's `process.env.NODE_ENV = "development"` define, so the
`reflows` dev counter is live there.

- [ ] **Step 5: Commit**

```bash
git add tests/calculator/fixture/v2 tests/calculator/v2/math-field.spec.ts
git commit -m "Add the MathField harness and adapter browser tests (AR-42, API-15, T-11)"
```

### Task 9: Keystroke corpus and its runner (PR-36, T-1 to T-4, T-6 to T-9)

**Files:**

- Modify: `src/lib/calculator-v2/core/corpus/cases/keys.ts` (replaces 02's scaffold array),
  `tests/calculator/v2/math-field.spec.ts`

**Interfaces:** Consumes `CorpusCase`, `CORPUS`, `runnerFor` (02, relative imports), `parseLatex`,
`toSExpr` (02). Produces 56 `keys` cases. A key string of length 1 is typed; longer strings are
MathQuill key names mapped by the runner: `Left` `ArrowLeft`, `Right` `ArrowRight`, `Up` `ArrowUp`,
`Down` `ArrowDown`, `Backspace`, `Del` `Delete`, `Home`, `End`, `Shift-Left` `Shift+ArrowLeft`,
`Shift-Right` `Shift+ArrowRight`; any other name fails the test.

- [ ] **Step 1: Write the failing tests: the runner and the 56 cases.** Append the runner to
      `math-field.spec.ts` (its imports go to the top of the file), then replace 02's scaffold
      array in `keys.ts` with the cases below. Each case's test title starts with its `rules`, so
      this step titles PR-36, T-1 to T-4 and T-6 to T-9 (Owning tasks, package header):

```ts
import CORPUS_KEYS from "../../../src/lib/calculator-v2/core/corpus/cases/keys";
import { CORPUS } from "../../../src/lib/calculator-v2/core/corpus";
import { runnerFor } from "../../../src/lib/calculator-v2/core/corpus/runners";
import { parseLatex, toSExpr } from "../../../src/lib/calculator-v2/core/latex";

const RUNNER = "tests/calculator/v2/math-field.spec.ts";
const KEY_NAMES: Record<string, string> = {
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Backspace: "Backspace",
  Del: "Delete",
  Home: "Home",
  End: "End",
  "Shift-Left": "Shift+ArrowLeft",
  "Shift-Right": "Shift+ArrowRight",
};
async function typeKeys(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    if (key.length === 1) await page.keyboard.type(key);
    else if (KEY_NAMES[key]) await page.keyboard.press(KEY_NAMES[key]);
    else throw new Error(`unknown key name ${key}`);
  }
}
const keyCases = CORPUS.filter((c) => runnerFor(c, "latex")?.file === RUNNER);

test("PR-36 this runner owns every keys.ts case", () => {
  expect(keyCases).toEqual([...CORPUS_KEYS]);
  expect(keyCases).toHaveLength(56);
});
for (const c of keyCases) {
  const keys = (c.input as { keys: string[] }).keys;
  test(`${c.rules.join(", ")} ${c.id} typing ${keys.join(" ")} gives ${c.latex}`, async ({
    page,
  }) => {
    await open(page, "?fields=1");
    await textarea(page).focus();
    await typeKeys(page, keys);
    const latex = await latexOf(page);
    expect(latex).toBe(c.latex);
    if (c.tree !== undefined) {
      const parsed = parseLatex(latex);
      expect(parsed.ok ? toSExpr(parsed.tree) : parsed.error.code).toBe(c.tree);
    }
  });
}
```

`keys.ts` keeps `import type { CorpusCase } from "../types";` and `export default cases;` and
holds these cases in this order (`id` is `keys-<n>`; keys are written here as typed text with named
keys in braces; in the file each case is `input: { keys: [...] }` with one array element per
character or name):

| n   | rules      | keys                   | latex                           | tree                                                              |
| --- | ---------- | ---------------------- | ------------------------------- | ----------------------------------------------------------------- |
| 1   | PR-36, T-2 | `y=x^2{Right}+3/4`     | `y=x^{2}+\frac{3}{4}`           | `(rel = (id y) (add (pow (id x) (num 2)) (div (num 3) (num 4))))` |
| 2   | PR-36, T-6 | `x^2+1`                | `x^{2}+1`                       | `(add (pow (id x) (num 2)) (num 1))`                              |
| 3   | PR-36, T-1 | `e^-x`                 | `e^{-x}`                        | `(pow (const e) (neg (id x)))`                                    |
| 4   | PR-36, T-2 | `3x/4`                 | `\frac{3x}{4}`                  | `(div (mul (num 3) (id x)) (num 4))`                              |
| 5   | PR-36, T-3 | `y=sqrtx{Right}+pi`    | `y=\sqrt{x}+\pi`                | `(rel = (id y) (add (root (id x)) (const pi)))`                   |
| 6   | PR-36, T-4 | `x1`                   | `x_{1}`                         | `(id x_{1})`                                                      |
| 7   | PR-36, T-4 | `<=`                   | `\le`                           | none                                                              |
| 8   | PR-36, T-3 | `sinx`                 | `\sin x`                        | `(call sin (id x))`                                               |
| 9   | PR-36      | `mx`                   | `mx`                            | `(mul (id m) (id x))`                                             |
| 10  | PR-36, T-4 | `2e3` (OI-27)          | `2e_{3}`                        | `(mul (num 2) (id e_{3}))`                                        |
| 11  | T-1        | `x^-1`                 | `x^{-1}`                        | `(pow (id x) (neg (num 1)))`                                      |
| 12  | T-1        | `x^2{Right}y`          | `x^{2}y`                        | `(mul (pow (id x) (num 2)) (id y))`                               |
| 13  | T-2        | `1+2/3`                | `1+\frac{2}{3}`                 | `(add (num 1) (div (num 2) (num 3)))`                             |
| 14  | T-3        | `cbrtx`                | `\sqrt[3]{x}`                   | `(root (id x) (num 3))`                                           |
| 15  | T-3        | `nthroot4{Right}x`     | `\sqrt[4]{x}`                   | `(root (id x) (num 4))`                                           |
| 16  | T-3        | `theta`                | `\theta`                        | `(id \theta)`                                                     |
| 17  | T-3        | `tau`                  | `\tau`                          | `(const tau)`                                                     |
| 18  | T-3        | `phi`                  | `\phi`                          | `(id \phi)`                                                       |
| 19  | T-3        | `infinity`             | `\infty`                        | none                                                              |
| 20  | T-3        | `infty`                | `\infty`                        | none                                                              |
| 21  | T-3        | `sumn=1{Up}5{Right}n`  | `\sum_{n=1}^{5}n`               | none                                                              |
| 22  | T-3        | `prodn=1{Up}5{Right}n` | `\prod_{n=1}^{5}n`              | none                                                              |
| 23  | T-3        | `int0{Up}1{Right}x`    | `\int_{0}^{1}x`                 | none                                                              |
| 24  | T-4        | `x<=1`                 | `x\le1`                         | `(rel <= (id x) (num 1))`                                         |
| 25  | T-4        | `x>=1`                 | `x\ge1`                         | `(rel >= (id x) (num 1))`                                         |
| 26  | T-4        | `a_12`                 | `a_{12}`                        | `(id a_{12})`                                                     |
| 27  | T-4        | `a12`                  | `a_{12}`                        | `(id a_{12})`                                                     |
| 28  | T-4        | `v_max`                | `v_{max}`                       | `(id v_{max})`                                                    |
| 29  | T-6        | `x^2-1`                | `x^{2}-1`                       | `(sub (pow (id x) (num 2)) (num 1))`                              |
| 30  | T-6        | `x^2=1`                | `x^{2}=1`                       | `(rel = (pow (id x) (num 2)) (num 1))`                            |
| 31  | T-6        | `x^2<1`                | `x^{2}<1`                       | `(rel < (pow (id x) (num 2)) (num 1))`                            |
| 32  | T-6        | `x^2>1`                | `x^{2}>1`                       | `(rel > (pow (id x) (num 2)) (num 1))`                            |
| 33  | T-6        | `x^2~1`                | `x^{2}\sim1`                    | none                                                              |
| 34  | T-6, T-8   | `(x^2,1`               | `\left(x^{2},1\right)`          | `(point (pow (id x) (num 2)) (num 1))`                            |
| 35  | T-6        | `a_2+1`                | `a_{2}+1`                       | `(add (id a_{2}) (num 1))`                                        |
| 36  | T-6        | `x^+1`                 | `x^{+1}`                        | none                                                              |
| 37  | T-7        | `2*3`                  | `2\cdot3`                       | `(mul (num 2) (num 3))`                                           |
| 38  | T-7        | `y~x`                  | `y\sim x`                       | none                                                              |
| 39  | T-7        | `5%`                   | `5\%`                           | `(pct (num 5))`                                                   |
| 40  | T-7        | `[1...5`               | `\left[1\ldots5\right]`         | none                                                              |
| 41  | T-7        | `[1,2,...,5`           | `\left[1,2,\ldots,5\right]`     | none                                                              |
| 42  | T-7        | `1...`                 | `1...`                          | none                                                              |
| 43  | T-8        | `(x`                   | `\left(x\right)`                | `(id x)`                                                          |
| 44  | T-8        | `(x)+1`                | `\left(x\right)+1`              | `(add (id x) (num 1))`                                            |
| 45  | T-8        | `[x`                   | `\left[x\right]`                | none                                                              |
| 46  | T-8        | `{x`                   | `\left\{x\right\}`              | none                                                              |
| 47  | T-8        | `\|x\|+1`              | `\left\|x\right\|+1`            | `(add (abs (id x)) (num 1))`                                      |
| 48  | T-8        | `(1,2]`                | `\left(\left[1,2\right]\right)` | none                                                              |
| 49  | T-8        | `[1,2)`                | `\left[\left(1,2\right)\right]` | none                                                              |
| 50  | T-9        | `sin`                  | `\sin`                          | none                                                              |
| 51  | T-9        | `ln`                   | `\ln`                           | none                                                              |
| 52  | T-2, T-6   | `y=x^2+3/4`            | `y=x^{2}+\frac{3}{4}`           | `(rel = (id y) (add (pow (id x) (num 2)) (div (num 3) (num 4))))` |
| 53  | T-2        | `1/2x`                 | `\frac{1}{2x}`                  | `(div (num 1) (mul (num 2) (id x)))`                              |
| 54  | T-8        | `[x]+1`                | `\left[x\right]+1`              | none                                                              |
| 55  | T-8        | `{x}+1` (see below)    | `\left\{x\right\}+1`            | none                                                              |
| 56  | T-3        | `midpoint`             | `\operatorname{midpoint}`       | none                                                              |

Cases 7, 19 to 23, 33, 36, 38, 40 to 42, 45, 46, 48 to 51 and 54 to 56 carry no tree: they do not
parse in Phase 1 (PR-9 `unsupported`, or a bare relation or name). Case 47's keys are `|`, `x`,
`|`, `+`, `1` and its latex is `\left|x\right|+1` (the table escapes the pipes). Case 55's keys are
`{`, `x`, `}`, `+`, `1` (typed braces, not a named key). Case 52 is T-2's own example, with no
arrow: `+` leaves the non-empty exponent (T-6) and `/` takes `3` as the numerator. Case 53 proves
the caret stays in the denominator after `/` (the typed half of PR-18, which only this runner can
check). Cases 44, 47, 54 and 55 type the closing `)`, `|`, `]` and `}`, which step over the
inserted closer (T-8). Case 56 is the operator name that contains the auto-command `int` (patch
0009; without it the field holds `midpo\int`). `keys.ts` stays under 700 lines.

- [ ] **Step 2: Run them, then see them fail against scratch edits.** The behaviour the cases
      check landed in Tasks 2, 4 and 6 (the patched build, `mathQuillOptions` and the adapter), so
      the first run passes at once; record it.

Run: `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/math-field.spec.ts -g "keys-|PR-36"`
Expected: PASS (57 tests: 56 cases and the ownership test).

Then make these temporary edits, which together break at least one case of every rule the cases
carry, and run the same command again:

| File           | Scratch edit                                               | Cases that must fail (rule)               |
| -------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `config.ts`    | `charsThatBreakOutOfSupSub: ""`                            | keys-2, keys-29 to keys-35, keys-52 (T-6) |
| `config.ts`    | `autoSubscriptNumerals: false`                             | keys-6, keys-10, keys-27 (T-4)            |
| `config.ts`    | `typingSlashWritesDivisionSymbol: true`                    | keys-4, keys-13, keys-53 (T-2)            |
| `config.ts`    | `typingAsteriskWritesTimesSymbol: true`                    | keys-37 (T-7)                             |
| `config.ts`    | `restrictMismatchedBrackets: false`                        | keys-48, keys-49 (T-8)                    |
| `config.ts`    | `autoOperatorNames: "sin"`                                 | keys-51 (T-9), keys-56 (T-3)              |
| `MathField.ts` | `overrideKeystroke` returns at once when `key === "Right"` | keys-12 (T-1), keys-1, keys-5, keys-15    |

Expected: FAIL, with every case in the last column among the failures (keys-1 to keys-10 carry
PR-36), for example `keys-12` with `Expected: "x^{2}y"` and `Received: "x^{2y}"`. Other cases may
fail too. `PR-36 this runner owns every keys.ts case` still passes: it reads the case list, not the
field.

- [ ] **Step 3: Implement.** Revert the scratch edits
      (`git checkout -- src/components/calculator-v2/math-field`); no other code. A case that
      still fails after the revert is a MathQuill behaviour question for the lead (a numbered
      patch or a capture), never an edited expectation.

- [ ] **Step 4: Run them and see them pass** on all five calculator projects:

Run: `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari --project=calculator-ios --project=calculator-android tests/calculator/v2/math-field.spec.ts -g "keys-|PR-36"`
Expected: PASS (57 tests per project: 56 cases and the ownership test). Also `npx vitest run src/lib/calculator-v2/core/corpus`
(02's corpus test still passes; `keys` cases are not parse-only) and
`npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,05` reports PR-36, T-1 to T-4 and
T-6 to T-9 covered.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculator-v2/core/corpus/cases/keys.ts tests/calculator/v2/math-field.spec.ts
git commit -m "Add the keystroke corpus and its MathField runner (PR-36, T-1 to T-9)"
```

### Task 10: Round trip of the LaTeX corpus through the MathField (PR-2)

**Files:**

- Modify: `tests/calculator/v2/math-field.spec.ts`

**Interfaces:** Consumes `CORPUS`, `inputKind` (02), `parseLatex`, `functionDefinitionHead`,
`treesEqual` (02), the harness `?maxLength=` query.

- [ ] **Step 1: Write the failing test**

```ts
import { inputKind } from "../../../src/lib/calculator-v2/core/corpus/types";
import { functionDefinitionHead, treesEqual } from "../../../src/lib/calculator-v2/core/latex";

test("PR-2 every latex corpus case parses to the same tree after a MathField round trip", async ({
  page,
}) => {
  await open(page, "?fields=1&maxLength=1000000");
  const cases = CORPUS.filter((c) => inputKind(c.input) === "latex");
  const inputs = cases.map((c) => (c.input as { latex: string }).latex);
  const outputs = await page.evaluate((list) => {
    const f = window.__mathFieldHarness!.fields[0];
    return list.map((latex) => {
      f.latex(latex);
      return f.latex();
    });
  }, inputs);
  const failures: string[] = [];
  let compared = 0;
  cases.forEach((c, i) => {
    const names = [...(c.rows ?? []), inputs[i]].flatMap(
      (r) => functionDefinitionHead(r)?.name ?? []
    );
    const options = { userFunctions: new Set(names) };
    const before = parseLatex(inputs[i], options);
    if (!before.ok) return; // error cases have no tree to compare
    compared++;
    const after = parseLatex(outputs[i], options);
    if (!after.ok || !treesEqual(before.tree, after.tree))
      failures.push(`${c.id}: ${inputs[i]} -> ${outputs[i]}`);
  });
  expect(failures).toEqual([]);
  expect(compared).toBeGreaterThanOrEqual(cases.filter((c) => c.tree !== undefined).length);
});
```

- [ ] **Step 2: Run it, then see it fail against a scratch edit.**
      `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/math-field.spec.ts -g "PR-2"`.
      Expected: PASS once Tasks 4 and 6 are in (it was written after them, so record the run: a
      pass on first run is the expected result here). To see it fail, temporarily make
      `toMathFieldLatex` return its input unchanged and rerun. Expected: FAIL in
      `expect(failures).toEqual([])`, and the received array contains the line
      `parse-operators-2: \tfrac{1}{2} -> ` (02's `\tfrac{1}{2}` case; MathQuill cannot read
      `\tfrac`, so the field is left empty and the output after `->` is the empty string). Any
      other corpus case using `\displaystyle`, `\leqslant`, `\geqslant` or a spacing command is
      listed the same way. Restore the function (`git checkout -- src/components/calculator-v2/math-field`).

- [ ] **Step 3: Implement.** Nothing beyond Tasks 4 and 6. If a case fails, the fix is a rewrite in
      `toMathFieldLatex` with a `load-latex.test.ts` case, or a numbered patch, never a skip.

- [ ] **Step 4: Run it and see it pass** on all five calculator projects:
      `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari --project=calculator-ios --project=calculator-android tests/calculator/v2/math-field.spec.ts -g "PR-2"`.
      Expected: PASS (1 test per project).

- [ ] **Step 5: Commit**

```bash
git add tests/calculator/v2/math-field.spec.ts
git commit -m "Round-trip the LaTeX corpus through the MathField (PR-2)"
```

### Task 11: Operator names, panel buttons and digit grouping in the browser; package gate (T-3, T-9, T-10)

**Files:**

- Modify: `tests/calculator/v2/math-field.spec.ts`

**Interfaces:** Consumes `mathQuillAutoOperatorNames`, `panelCategories` (02).

- [ ] **Step 1: Write the failing tests**

```ts
import {
  mathQuillAutoOperatorNames,
  panelCategories,
} from "../../../src/lib/calculator-v2/core/latex/operator-names";

test("T-3 every non-member allowlist name types as an upright operator name", async ({ page }) => {
  await open(page, "?fields=1");
  const names = mathQuillAutoOperatorNames().split(" ");
  const outputs = await page.evaluate((list) => {
    const f = window.__mathFieldHarness!.fields[0];
    return list.map((name) => {
      f.latex("");
      f.typedText(name);
      return f.latex();
    });
  }, names);
  const wrong = names
    .map((name, i) => [name, outputs[i]] as const)
    .filter(([name, out]) => out !== `\\${name}` && out !== `\\operatorname{${name}}`);
  expect(wrong).toEqual([]);
});
test("T-9 panel entries insert the name with empty parentheses and the caret inside; typed names do not", async ({
  page,
}) => {
  await open(page, "?fields=1");
  const entries = panelCategories()
    .flatMap((c) => c.entries)
    .filter(
      (e) =>
        e.actions.length === 2 &&
        e.actions[0].op === "write" &&
        e.actions[0].arg.endsWith("\\left(\\right)") &&
        e.actions[1].op === "keystroke" &&
        e.actions[1].arg === "Left"
    );
  expect(entries.length).toBe(15); // six trig, six inverse trig, exp, ln, log (log_a is a template)
  const out = await page.evaluate(
    (list) => {
      const f = window.__mathFieldHarness!.fields[0];
      return list.map((e) => {
        f.latex("");
        f.run(e.actions);
        f.typedText("x");
        const fromPanel = f.latex();
        f.latex("");
        f.typedText(e.name);
        return [fromPanel, f.latex()];
      });
    },
    entries.map((e) => ({ name: e.name, actions: e.actions }))
  );
  entries.forEach((e, i) => {
    const parsed = parseLatex(out[i][0]);
    expect(parsed.ok ? toSExpr(parsed.tree) : parsed.error.code, e.name).toBe(
      `(call ${e.name} (id x))`
    );
    expect(out[i][1], e.name).not.toContain("\\left(");
  });
});
test("T-10 rows group integer digits in threes; LaTeX and speech stay ungrouped", async ({
  page,
}) => {
  await open(page);
  await textarea(page, 0).focus();
  await page.keyboard.type("1234567");
  await textarea(page, 1).focus(); // blur ends MathQuill's typing-time grouping suppression
  await expect(fieldEl(page, 0).locator(".mq-group-start")).toHaveCount(2);
  await expect(fieldEl(page, 0).locator(".mq-group-leading-1")).toHaveCount(1);
  await expect(fieldEl(page, 0).locator(".mq-suppress-grouping")).toHaveCount(0);
  // a thin space is about 1/6 to 1/5 em: the group gap is 0.1 to 0.25 of the digit's font size
  const gapInEm = await fieldEl(page, 0)
    .locator(".mq-group-start")
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.marginLeft) / parseFloat(style.fontSize);
    });
  expect(gapInEm).toBeGreaterThanOrEqual(0.1);
  expect(gapInEm).toBeLessThanOrEqual(0.25);
  expect(
    await page.evaluate(() => {
      const f = window.__mathFieldHarness!.fields[0];
      return [f.latex(), f.speechText()];
    })
  ).toEqual(["1234567", "1234567"]);
});
```

- [ ] **Step 2: Run them and see each one fail against a scratch edit.** The code they check
      landed in Tasks 4 and 6, so make three temporary edits in `config.ts` and `MathField.ts`:
      `autoOperatorNames: "sin"`, `enableDigitGrouping: false`, and `run()` skipping `keystroke`
      actions. Then run:

Run: `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/math-field.spec.ts -g "T-3 every|T-9 panel|T-10 rows"`
Expected: FAIL. T-3 lists every name except `sin`; T-9 gets something other than
`(call sin (id x))` for `\sin\left(\right)x`; T-10 finds 0 `.mq-group-start`.

- [ ] **Step 3: Implement.** Revert the three scratch edits (`git checkout -- src/components/calculator-v2/math-field`);
      no other code. With patch 0009 in the build, `midpoint` passes (it is the one name that
      contains an auto-command, Notes for the lead, item 5). Any other T-3 failure naming an
      allowlist entry goes to the lead, never to a relaxed assertion.

- [ ] **Step 4: Run the package gate.**

```bash
npm run test:calculator -- --project=calculator-chrome --project=calculator-safari tests/calculator/v2/math-field.spec.ts
npm run test:calculator -- --project=calculator-firefox --project=calculator-ios --project=calculator-android tests/calculator/v2/math-field.spec.ts
npx vitest run src/components/calculator-v2 src/lib/calculator-v2/core/corpus
npx tsc --noEmit && npm run lint && npm run format:check && npm test
node scripts/check-file-sizes.mjs
npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,05
```

Expected: all PASS; the first command is the wave 1 gate of index section 3, and the second runs
the same whole spec (harness tests, the 56 keys cases, PR-2, T-3, T-9 and T-10) on the other three
projects, so all five projects of the 1A release's `npm run test:calculator` have run every test
in `math-field.spec.ts` (69 per project: 8 in Task 8, 57 in Task 9, 1 in Task 10, 3 in Task 11)
before 05 merges. `check-spec-ids` reports PR-2, PR-36, AR-5, AR-42, T-1 to T-4 and T-6 to T-11
covered.

- [ ] **Step 5: Commit**

```bash
git add tests/calculator/v2/math-field.spec.ts
git commit -m "Check operator names, panel insertion and digit grouping in the browser (T-3, T-9, T-10)"
```
