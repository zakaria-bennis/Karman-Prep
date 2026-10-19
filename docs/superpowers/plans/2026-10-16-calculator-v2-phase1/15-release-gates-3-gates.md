# 15 release-gates, part 3 of 3: visual baselines, perf budgets, the AR-65 spec and the phase gate (Tasks 10 to 13)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 3 of 3 of package `15-release-gates.md`, which holds the package header (Goal, IDs, IDs by task, Owns), the Rules R1 to R6 and the Notes for the lead; they apply to every task here, and "R<n>" and "Notes for the lead" below refer to that file. Tasks run in number order across the three parts; this part starts where part 2 (`15-release-gates-2-parity.md`, Tasks 7 to 9) ends.

---

### Task 10: Visual baselines (FN-15; contributions L-3 and AR-41)

**Files:** Create `tests/calculator/v2/visual.spec.ts` and its baselines in `tests/calculator/v2/visual.spec.ts-snapshots/`.

**Interfaces:** Consumes 08's harness `/v2/graph.html?skin=&rows=&w=&h=` (`[data-rendered-revision]`, `canvas[data-layer="curves"]`); 10's harness `/v2/calculator.html?skin=&w=&h=&rows=` with `globalThis.__shell.handle.calculator` (`focusExpression(id: string): void`, `activateExpression(id: string): void`); 09's row DOM (`.kc-list-panel`, `li[data-row-id][data-focused][data-active]`, `.kc-row-number`); `defaultViewport`, `worldToPx`, `ViewSpec` (06); `globalThis.__calculatorHarness` and `__karmanCalculatorCounters.reflows` (01 sections 1.1 and 8.1); 14's `?questions=transfer` diagnostic set (served module `/v2/transfer-questions.ts`; t2's stem "The function $f$ is defined by $f(x)=x^{2}-3$. Let $g(x)=f(x)+3$."), its DOM contract (a `[data-transfer-control]` anchor right after its item, holding the control's `button`) and the AR-10 keyboard transfer; the diagnostic's "Skip this question". Produces the snapshots `fn-15-x-two-thirds-ivory.png`, `fn-15-x-two-thirds-observatory.png`, `l-3-focused-<skin>.png`, `l-3-active-<skin>.png` (ivory, observatory) and `ar-41-transferred-row.png`.

- [ ] **Step 1: Write the tests** (`test.beforeEach` skips every project but calculator-chrome: one baseline set; `enc(rows)` is `encodeURIComponent(JSON.stringify(rows))`; `cursor(p)` is `p.locator(".mq-cursor")`, masked in every screenshot; imports: `expect`, `test`, `type Page`, `type Route` (`@playwright/test`), `defaultViewport`, `worldToPx`, `type ViewSpec` (`../../../src/lib/calculator-v2/plot/viewport`), `trackPageErrors` (`./parity-helpers`), then `trackPageErrors();` so page and console errors fail each test, as in the parity specs).

```
const VIEW: ViewSpec = { viewport: defaultViewport({ width: 800, height: 600 }), size: { width: 800, height: 600 }, dpr: 1 };
async function graphPage(p: Page, rows: string[], skin = "ivory") { await p.goto(`/v2/graph.html?skin=${skin}&w=800&h=600&rows=${enc(rows)}`); await expect.poll(() => p.evaluate(() => { const e = globalThis.__calculatorHarness?.engine; const l = document.querySelector("#root")?.shadowRoot?.querySelector("[data-rendered-revision]");
  return !!e && e.getSnapshot().geometry.size === 1 && l?.getAttribute("data-rendered-revision") === String(e.getSnapshot().revision); })).toBe(true); }
const curves = (p: Page) => p.evaluate(async () => { const c = document.querySelector("#root")!.shadowRoot!.querySelector<HTMLCanvasElement>('canvas[data-layer="curves"]')!; const d = await crypto.subtle.digest("SHA-256", c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data); return { w: c.width, h: c.height, sha: [...new Uint8Array(d)].join(".") }; });
const inkAt = (p: Page, x: number, y: number) => p.evaluate(([x, y]) => { const c = document.querySelector("#root")!.shadowRoot!.querySelector<HTMLCanvasElement>('canvas[data-layer="curves"]')!; const s = c.width / c.getBoundingClientRect().width;
  const d = c.getContext("2d")!.getImageData(Math.round(x * s) - 1, Math.round(y * s) - 1, 3, 3).data; let a = 0; for (let i = 3; i < d.length; i += 4) a = Math.max(a, d[i]); return a; }, [x, y]);
test("FN-15 y=x^{1/3} and y=x^{2/3} paint at x = -4 (y ≈ -1.587401052 and 2.519842100)", async ({ page }) => { for (const [latex, y] of [["y=x^{1/3}", -1.587401052], ["y=x^{2/3}", 2.5198421]] as const) {
    await graphPage(page, [latex]); const [px, py] = worldToPx(VIEW, -4, y); expect(await inkAt(page, px, py), latex).toBeGreaterThanOrEqual(128); }
  for (const skin of ["ivory", "observatory"]) { await graphPage(page, ["y=x^{2/3}"], skin); await expect(page.locator("#root")).toHaveScreenshot(`fn-15-x-two-thirds-${skin}.png`); } });
test("FN-15 y=x^{2/3} and y=\\sqrt[3]{x^{2}} paint identical pixels for -10 ≤ x ≤ 10 in the default view", async ({ page }) => { await graphPage(page, ["y=x^{2/3}"]); const a = await curves(page); await graphPage(page, ["y=\\sqrt[3]{x^{2}}"]); expect(await curves(page)).toEqual(a); });
test("L-3 the gutter numbers the rows, and the focused and the active row show the focus bar and outline in light and dark skins", async ({ page }) => { for (const skin of ["ivory", "observatory"]) {
    await page.goto(`/v2/calculator.html?skin=${skin}&w=800&h=600&rows=${enc(["y=2x+3", "x^{2}+y^{2}=25", "(2,3)"])}`); await page.evaluate(() => document.fonts.ready); const list = page.locator(".kc-list-panel");
    await expect(list.locator(".kc-row-number")).toHaveText(["1", "2", "3"]); await page.evaluate(() => globalThis.__shell!.handle.calculator.focusExpression("2")); await expect(page.locator('li[data-row-id="2"]')).toHaveAttribute("data-focused", "true");
    await expect(list).toHaveScreenshot(`l-3-focused-${skin}.png`, { mask: [cursor(page)] }); await page.locator("#outside").focus(); await page.evaluate(() => globalThis.__shell!.handle.calculator.activateExpression("3"));
    await expect(page.locator('li[data-row-id="3"]')).toHaveAttribute("data-active", "true"); await expect(list).toHaveScreenshot(`l-3-active-${skin}.png`, { mask: [cursor(page)] }); } });
const ROW = "y=\\sqrt{x}(x+1)"; // parentheses and a square root (AR-41)
const T2_SENTENCE = "Let $g(x)=f(x)+3$."; // the second sentence of 14's t2 stem
const press = (p: Page, name: string) => p.getByRole("button", { name, exact: true }).evaluate((el: HTMLElement) => el.click());
async function openT2(p: Page) { // the served fixture module gets ROW in place of t2's g(x); the source file is untouched
  await p.route(/\/v2\/transfer-questions\.ts(\?|$)/, async (route) => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(T2_SENTENCE, () => "Let $y=\\\\sqrt{x}(x+1)$.") }); });
  await p.setViewportSize({ width: 1280, height: 800 }); await p.goto("/?flow=diagnostic&calc=v2&questions=transfer", { waitUntil: "domcontentloaded" }); await press(p, "Skip this question"); }
async function transferRow(p: Page) { const control = p.locator(`xpath=//*[@data-transfer-control][preceding-sibling::*[1][.//annotation[normalize-space()="${ROW}"]]]//button`);
  await expect(control).toHaveCount(1); await control.focus(); await p.keyboard.press("Enter"); // a real keyboard transfer (AR-10); the calculator opens docked at 1280 px
  await expect.poll(() => p.evaluate(() => globalThis.__calculatorHarness?.engine.getExpressions().map((e) => e.latex ?? "") ?? [])).toEqual([expect.stringContaining("\\sqrt{x}")]); }
const rowShot = (p: Page) => expect(p.locator('[data-calculator-host] li[data-row-id]').first()).toHaveScreenshot("ar-41-transferred-row.png", { mask: [cursor(p)] });
test("AR-41 a row with parentheses and a square root transferred with the fonts warm sets the baseline", async ({ page }) => { await openT2(page);
  await page.evaluate(() => Promise.all([document.fonts.load("16px KaTeX_Main"), document.fonts.load("italic 16px KaTeX_Math")])); await transferRow(page); await rowShot(page); });
test("AR-41 the same row transferred before the fonts are warm matches that baseline after reflow", async ({ page }) => { const held: Route[] = []; let hold = true; await page.route(/KaTeX_[\w-]+\.woff2/, (route) => (hold ? held.push(route) : route.continue()));
  await openT2(page); await transferRow(page);
  expect(await page.evaluate(() => document.fonts.check("16px KaTeX_Main"))).toBe(false); const reflows = await page.evaluate(() => globalThis.__karmanCalculatorCounters?.reflows ?? 0);
  hold = false; for (const route of held.splice(0)) await route.continue(); await expect.poll(() => page.evaluate(() => globalThis.__karmanCalculatorCounters?.reflows ?? 0)).toBeGreaterThan(reflows); await rowShot(page); });
```

- [ ] **Step 2: Run them and see them fail.** `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/visual.spec.ts`. Expected: FAIL, `A snapshot doesn't exist at …visual.spec.ts-snapshots/fn-15-x-two-thirds-ivory-calculator-chrome-darwin.png` (the pixel assertions already pass; Playwright writes the missing files, which Step 3 re-records from the named tests and reviews).
- [ ] **Step 3: Record and review the baselines.** Run the warm AR-41 test, the FN-15 tests and the L-3 test with `--update-snapshots` (`-g "FN-15|L-3|AR-41 a row"`), then open every PNG with the Read tool and check: the cube-root curve crosses x = −4 above the axis and is smooth through 0; the gutter shows 1, 2, 3, the focus bar and a 2 px outline sit on row 2 (focused) and row 3 (active) only; the radical and parentheses in the AR-41 row are KaTeX-shaped and unclipped. A wrong image is an R3 fix in 08, 09 or 05, never a re-record.
- [ ] **Step 4: Run them and see them pass.** Step 2's command, twice. Expected: PASS, including the cold-font AR-41 test against the warm baseline.
- [ ] **Step 5: Commit.** `git add tests/calculator/v2/visual.spec.ts tests/calculator/v2/visual.spec.ts-snapshots && git commit -m "Add calculator v2 visual baselines (FN-15, L-3, AR-41)"`

### Task 11: Perf budgets (AR-34, AR-51, TR-75; resolves OI-20)

**Files:** Modify `docs/superpowers/specs/calculator-v2/c-transfer.md` (TR-75); Create `tests/calculator/v2/perf.spec.ts`; Modify `tests/unit/calculator-v2/standalone-budget.test.ts` (AR-34 baseline check) and `docs/calculator-v2-bundle-baseline.json` (its `perf` block, written by the spec).

**Interfaces:** Consumes `classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>` and `classifyChoice(choice: ChoiceInput, stem: StemInput | null): TransferItem | null` (12, imported in the page from `/@fs<abs path>/src/lib/calculator-transfer/classify.ts`, which the Vite fixture serves because `fs.allow` holds the root); `CORPUS_FILES.keys` (05's `cases/keys.ts`); `formatBaseline(baseline: BundleBaseline): Promise<string>` and `BundleBaseline["perf"]` (`{ method: "warm-module-graph"; firstOpenMs: number; firstOpenThrottledMs: number; reopenMs: number }`, 11); `CalculatorEngine.HelperExpression(spec: { latex: string }): HelperExpression` (07). Produces nothing else. AR-51 method (deviation recorded in 00-index section 7; its corrected wording is in Notes for the lead): the spec observes Chromium's `long-animation-frame` entries rather than the `longtask` observer AR-51 names, because only they attribute work to scripts. A frame counts when its `blockingDuration` is above 0 (a task, plus render time for the longest task, over 50 ms) and one of its `scripts[]` entries has a `sourceURL` matching `CALC_CODE` or an `invoker` matching `KEY_INPUT` (a keyboard or input listener: during the typing window focus is in the calculator and V1-46 shows its keys never reach the quiz, so this catches calculator work dispatched by React's delegated listeners, whose `sourceURL` is react-dom). Known limit: `scripts[]` lists only entry points of 5 ms or more, names the script that registered each one and omits rendering, so calculator work run from React's scheduler (`MessagePort.onmessage`, such as passive effects) or split into entries under 5 ms is not attributed.

- [ ] **Step 1: Apply OI-20 to `c-transfer.md`.** In TR-75 replace `with the calculator chunk cached and the calculator not yet mounted in this question` with `after the calculator module has already been imported on this page (by prefetch() or an earlier question's open) and with the calculator not yet mounted in this question`; `grep -c "after the calculator module has already been imported on this page" docs/superpowers/specs/calculator-v2/c-transfer.md` prints `1`; `npx prettier --check` on the file passes.
- [ ] **Step 2: Write the failing tests** (`test.beforeEach` skips every project but calculator-chrome, R5; `test.describe.configure({ mode: "serial" })`; `const errors = trackPageErrors();` at file scope; `SIZE` is 1280×800; `throttle(p, rate)` sends CDP `Emulation.setCPUThrottlingRate`; `freshPage(browser, rate)` opens a page in a new context at `SIZE`, calls `watchErrors(page, errors)`, goes to `/?flow=diagnostic&calc=v2`, waits for `networkidle`, then throttles when `rate > 1`; the AR-34 test calls `test.setTimeout(180_000)` first, because it loads seven fresh pages and opens the calculator ten times, against the config's 45 s; imports: `expect`, `test`, `type Page` (`@playwright/test`), `readFileSync`, `writeFileSync` (`node:fs`), `resolve` (`node:path`), `CORPUS_FILES` (`../../../src/lib/calculator-v2/core/corpus/cases/index`), `formatBaseline` and `type BundleBaseline` (`../../../scripts/build/check-calculator-v2-bundle.mjs`), `trackPageErrors`, `watchErrors` (`./parity-helpers`)).

```
const openToFocusedRow = (p: Page) => p.evaluate(() => new Promise<number>((done) => { const t0 = performance.now(); document.querySelector<HTMLElement>('[aria-label="Toggle Karman calculator"]')!.click();
  const tick = () => { const root = document.querySelector("[data-calculator-host]")?.shadowRoot; if (root?.activeElement?.closest("li[data-row-id]") && root.querySelector(".mq-editable-field")) done(performance.now() - t0); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
const measured: Partial<NonNullable<BundleBaseline["perf"]>> = {};
test("AR-34 first open to a focused editable row takes at most 800 ms, 2,500 ms at 4x CPU throttling, and reopening at most 100 ms", async ({ browser }) => { test.setTimeout(180_000); const warm = await freshPage(browser, 1); await openToFocusedRow(warm); await warm.context().close(); // warm-module-graph: one discarded open
  const runs = { first: [] as number[], throttled: [] as number[], reopen: [] as number[] };
  for (let i = 0; i < 3; i++) { const p = await freshPage(browser, 1); runs.first.push(await openToFocusedRow(p)); await p.getByRole("button", { name: "Close calculator", exact: true }).click(); await expect(p.locator("[data-calculator-window]")).toBeHidden(); runs.reopen.push(await openToFocusedRow(p)); await p.context().close();
    const slow = await freshPage(browser, 4); runs.throttled.push(await openToFocusedRow(slow)); await slow.context().close(); }
  Object.assign(measured, { method: "warm-module-graph", firstOpenMs: Math.ceil(Math.max(...runs.first)), firstOpenThrottledMs: Math.ceil(Math.max(...runs.throttled)), reopenMs: Math.ceil(Math.max(...runs.reopen)) });
  expect([measured.firstOpenMs! <= 800, measured.firstOpenThrottledMs! <= 2500, measured.reopenMs! <= 100], JSON.stringify(runs)).toEqual([true, true, true]); });
test.afterAll(async () => { if (process.env.RECORD_CALCULATOR_PERF !== "1" || measured.method !== "warm-module-graph") return; const path = "docs/calculator-v2-bundle-baseline.json";
  writeFileSync(path, await formatBaseline({ ...(JSON.parse(readFileSync(path, "utf8")) as BundleBaseline), perf: measured as NonNullable<BundleBaseline["perf"]> })); });
const QUESTIONS = Array.from({ length: 20 }, (_, i) => ({ stem: { text: `If $${i + 3}p+4=${i + 19}$, $f(x)=${i + 2}x+1$ and $y>${i + 1}x+1$ with $y\\le-x+${i + 4}$, which point lies on $x^{2}+y^{2}=${i + 25}$?`, serializedFunctionLines: false },
  choices: ["A", "B", "C", "D"].map((letter, j) => ({ letter, text: `$${i + j + 1}$` })) }));
test("TR-75 classification takes at most 10 ms per question under 4x CPU throttling", async ({ page }) => { await page.setViewportSize(SIZE); await page.goto("/?flow=diagnostic&calc=v2"); const url = `/@fs${resolve("src/lib/calculator-transfer/classify.ts")}`;
  await page.evaluate(async (u) => { await import(u); }, url); await throttle(page, 4); const times = await page.evaluate(async ({ u, questions }) => { const { classifyStem, classifyChoice } = await import(u);
    return questions.map((q) => { const t0 = performance.now(); classifyStem(q.stem); for (const c of q.choices) classifyChoice(c, q.stem); return performance.now() - t0; }); }, { u: url, questions: QUESTIONS });
  expect(Math.max(...times), times.join(", ")).toBeLessThanOrEqual(10); });
test("TR-75 press to visible row takes at most 400 ms under 4x CPU throttling once the module is imported and the calculator is not mounted (OI-20)", async ({ page }) => { await page.setViewportSize(SIZE); await page.goto("/?flow=practice&calc=v2");
  await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click(); await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toBeVisible(); await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await page.getByRole("button", { name: "Fixture retake", exact: true }).click(); await expect(page.locator("[data-calculator-host]")).toHaveCount(0); await throttle(page, 4);
  const ms = await page.evaluate(() => new Promise<number>((done) => { const control = [...document.querySelectorAll<HTMLElement>('[aria-label^="Transfer to Calculator: "]')].find((b) => !b.getAttribute("aria-label")!.startsWith("Transfer to Calculator: choice"))!; const t0 = performance.now(); control.click();
    const tick = () => { const f = document.querySelector("[data-calculator-host]")?.shadowRoot?.querySelector("li[data-row-id] .mq-root-block"); if (f?.textContent && f.getBoundingClientRect().height > 0) done(performance.now() - t0); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
  expect(ms).toBeLessThanOrEqual(400); });
const CALC_CODE = /\/(calculator-v2|calculator-transfer)\/|\/vendor\/mathquill\//; const KEY_INPUT = /\.on(keydown|keypress|keyup|beforeinput|input|textinput|compositionend)$/i; // LoAF invoker "<target>.on<type>"
const KEY: Record<string, string> = { Right: "ArrowRight", Left: "ArrowLeft", Up: "ArrowUp", Down: "ArrowDown" };
test("AR-51 typing the Phase 1 keystroke corpus leaves no long task attributed to calculator code", async ({ page }) => {
  await page.addInitScript(() => { const seen: unknown[] = ((globalThis as { __loaf?: unknown[] }).__loaf = []); new PerformanceObserver((l) => { for (const e of l.getEntries()) seen.push(e.toJSON()); }).observe({ type: "long-animation-frame", buffered: true }); });
  await page.setViewportSize(SIZE); await page.goto("/?flow=diagnostic&calc=v2"); await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click(); const row = page.getByRole("textbox", { name: "Expression 1", exact: true }); await expect(row).toBeVisible(); await page.waitForTimeout(500);
  const start = await page.evaluate(() => performance.now()); const cases = CORPUS_FILES.keys.filter((c) => "keys" in c.input); expect(cases.length).toBeGreaterThan(0);
  for (const c of cases) { await page.evaluate(() => globalThis.__calculatorHarness!.engine.setExpression({ id: "1", latex: "" })); await row.click(); for (const k of (c.input as { keys: string[] }).keys) await (k.length === 1 ? page.keyboard.type(k) : page.keyboard.press(KEY[k] ?? k)); }
  await page.waitForTimeout(500); const long = await page.evaluate(({ t, code, key }) => { const [c, k] = [new RegExp(code), new RegExp(key, "i")]; return ((globalThis as { __loaf?: { startTime: number; duration: number; blockingDuration: number; scripts: { sourceURL: string; invoker: string }[] }[] }).__loaf ?? [])
    .filter((e) => e.startTime >= t && e.blockingDuration > 0 && e.scripts.some((s) => c.test(s.sourceURL) || k.test(s.invoker))).map((e) => `${Math.round(e.duration)} ms, blocking ${Math.round(e.blockingDuration)} ms: ${e.scripts.map((s) => `${s.invoker} ${s.sourceURL}`).join(" | ")}`); }, { t: start, code: CALC_CODE.source, key: KEY_INPUT.source });
  expect(long).toEqual([]); });
test("AR-51 the main thread analyses rows but never evaluates them: with worker messages held a row has its kind and no value", async ({ page }) => {
  await page.addInitScript(() => { const g = globalThis as { __hold?: boolean; __held?: [Worker, unknown, StructuredSerializeOptions | undefined][] }; g.__held = []; const Native = Worker;
    globalThis.Worker = class extends Native { postMessage(m: unknown, t?: StructuredSerializeOptions | Transferable[]): void { const o = Array.isArray(t) ? { transfer: t } : t; const type = (m as { type?: string } | null)?.type;
      if (g.__hold && (type === "state" || type === "evaluate")) g.__held!.push([this, m, o]); else super.postMessage(m, o); } } as typeof Worker; }); // one signature for both Worker overloads (strict tsc)
  await page.setViewportSize(SIZE); await page.goto("/?flow=diagnostic&calc=v2"); await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click(); const row = page.getByRole("textbox", { name: "Expression 1", exact: true }); await expect(row).toBeVisible();
  await page.evaluate(() => ((globalThis as { __hold?: boolean }).__hold = true)); await row.click(); await page.keyboard.type("2+3"); await page.waitForTimeout(400); // the first held state arms AR-49's 1,500 ms watchdog; 400 ms leaves a wide margin
  expect(await page.evaluate(() => { const e = globalThis.__calculatorHarness!.engine; const r = e.getSnapshot().rows[0]; const h = e.HelperExpression({ latex: "2+3" }); const n = h.numericValue; h.destroy(); return { kind: r.kind, value: r.value, valueText: r.valueText, helperNaN: Number.isNaN(n) }; }))
    .toEqual({ kind: "value", value: null, valueText: null, helperNaN: true });
  await page.evaluate(() => { const g = globalThis as { __hold?: boolean; __held?: [Worker, unknown, StructuredSerializeOptions | undefined][] }; g.__hold = false; for (const [w, m, t] of g.__held!.splice(0)) w.postMessage(m, t); });
  await expect(page.locator("[data-calculator-host] li[data-row-id]").first().locator(".kc-row-value > [aria-hidden='true']")).toHaveText("= 5"); });
```

In `standalone-budget.test.ts` add:

```
it("AR-34 the committed baseline records the warm-module-graph perf measurements within budget", () => { const { perf } = JSON.parse(readFileSync("docs/calculator-v2-bundle-baseline.json", "utf8")) as BundleBaseline;
  expect(perf?.method).toBe("warm-module-graph"); expect([perf!.firstOpenMs <= 800, perf!.firstOpenThrottledMs <= 2500, perf!.reopenMs <= 100]).toEqual([true, true, true]); });
```

- [ ] **Step 3: Run them and see the baseline check fail.** `npx vitest run tests/unit/calculator-v2/standalone-budget.test.ts -t "AR-34"`. Expected: FAIL, `expected undefined to be 'warm-module-graph'` (`perf` is `null`). Then `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/perf.spec.ts`. Expected: PASS on first run (R4); a budget miss is an R3 fix in the package that owns the slow path (10 or 11 for opening, 12 or 14 for transfer, 05 or 09 for typing), never a looser budget.
- [ ] **Step 4: Record and see it pass.** `RECORD_CALCULATOR_PERF=1 npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/perf.spec.ts -g "AR-34"`, then `npx vitest run tests/unit/calculator-v2/standalone-budget.test.ts` and `npx prettier --check docs/calculator-v2-bundle-baseline.json`. Expected: PASS; `git diff` shows only the `perf` block.
- [ ] **Step 5: Commit.** `git add docs/superpowers/specs/calculator-v2/c-transfer.md tests/calculator/v2/perf.spec.ts tests/unit/calculator-v2/standalone-budget.test.ts docs/calculator-v2-bundle-baseline.json && git commit -m "Add calculator v2 perf budgets and record them beside the bundle baseline (AR-34, AR-51, TR-75, OI-20)"`
- [ ] **Step 6: Mutation checks** (R4; `RECORD_CALCULATOR_PERF` unset, so no mutated run writes the baseline; command for each: `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/perf.spec.ts -g "<title start>"`; after each, `git checkout -- <file>`, rerun to PASS, and `git status --short docs/calculator-v2-bundle-baseline.json` prints nothing). "A busy loop of n ms" is `const end = performance.now() + n; while (performance.now() < end);`:
  - `"AR-34 first open"`: in `src/components/calculator-v2/host/quiz-host.ts` start `mountQuizCalculator` with a busy loop of 900 ms. Expected: FAIL at the budget `toEqual([true, true, true])`, its first entry `false` (every first open takes over 900 ms; reopening does not mount again).
  - `"TR-75 classification"`: in `src/lib/calculator-transfer/classify.ts` start `classifyStem` with a busy loop of 20 ms. Expected: FAIL at `expect(Math.max(...times), …).toBeLessThanOrEqual(10)`.
  - `"TR-75 press to visible"`: in `src/components/calculator-v2/transfer/apply.ts` start `applyTransfer` with a busy loop of 500 ms. Expected: FAIL at `expect(ms).toBeLessThanOrEqual(400)`.
  - `"AR-51 typing"`: in `src/components/calculator-v2/math-field/MathField.ts` add a busy loop of 60 ms right before `this.options.onEdit(after)`. Expected: FAIL at `expect(long).toEqual([])`, received entries whose scripts name `/calculator-v2/` or `/vendor/mathquill/` code or a key or input listener.
  - `"AR-51 the main thread"`: in `src/lib/calculator-v2/core/api/helper-expression.ts` make `HelperRegistry.create` set the new helper's `numericValue` to the number `evaluateLatex(spec.latex)` (04) gives, before it posts `evaluate`. Expected: FAIL at the `toEqual`, received `helperNaN: false`.

### Task 12: The AR-65 spec under `next dev`

**Files:** Create `tests/e2e/calculator-v2.spec.ts` (run by 11's `playwright.calculator-v2-e2e.config.ts`, whose `testMatch` already names it; `playwright.config.ts` ignores it for `npm run test:e2e`).

**Interfaces:** Consumes 11's config (port 3100, `DEV_IMPERSONATE_CLERK_ID=dev_seed_admin`, `CALCULATOR_V2_ROLLOUT=admins`, `tests/e2e/global-setup.ts` seeding); the practice route that 11's smoke opens (`tests/e2e/local-quiz-audit.spec.ts`), used here only to open and graph; `/diagnostic`, whose static `DIAGNOSTIC_QUESTIONS` (`src/data/diagnostic-questions.ts:565-568`) list the 15 Reading and Writing questions first and then Math, starting with alg-1 "If $3x + 5 = 26$, what is the value of $x$?" (its `$x$` is a lone symbol, denied by TR-10, so the stem has one control), and `dev_seed_admin` has no diagnostic result (`scripts/seed-dev.mjs`), so the page does not redirect; `globalThis.__calculatorHarness` (section 8.1) and 11's DOM contract. Imports: `expect`, `test`, `type Page` (`@playwright/test`).

- [ ] **Step 1: Write the tests.**

```
const trigger = (p: Page) => p.getByRole("button", { name: "Toggle Karman calculator", exact: true }); const side = (p: Page) => p.getByRole("button", { name: "Open Karman calculator", exact: true });
const row = (p: Page) => p.getByRole("textbox", { name: "Expression 1", exact: true }); const frame = (p: Page) => p.locator("[data-calculator-window]"); const latex = (p: Page) => p.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions().map((e) => e.latex ?? ""));
const RW_FIRST = 15; // Reading and Writing questions before the first Math question on /diagnostic
async function consent(p: Page) { await p.addLocatorHandler(p.getByRole("dialog", { name: /Help us debug/i }), (d) => d.getByRole("button", { name: "Decline" }).click()); } // before navigation: the fixed banner can mount late and cover any later click
async function practice(p: Page) { await consent(p); await p.goto("/learn/math"); if (!(await p.getByRole("button", { name: "Start Quiz" }).isVisible())) await p.getByRole("button", { name: "Linear equations (one variable)" }).first().click(); await p.getByRole("button", { name: "Start Quiz" }).first().click(); await expect(trigger(p)).toBeVisible(); }
async function diagnosticMath(p: Page) { await consent(p); await p.goto("/diagnostic"); for (let i = 0; i < RW_FIRST; i++) await p.getByRole("button", { name: "Skip this question", exact: true }).click();
  await expect(p.locator("annotation").filter({ hasText: "3x + 5 = 26" }).first()).toBeAttached(); await expect(trigger(p)).toBeVisible(); }
async function graphParabola(p: Page) { const worker = p.waitForEvent("worker"); await trigger(p).click(); await row(p).click(); await p.keyboard.type("y=x^2"); expect(new URL((await worker).url()).pathname).toMatch(/^\/_next\//);
  await expect.poll(() => p.evaluate(() => globalThis.__calculatorHarness?.engine.getSnapshot().geometry.get("1")?.kind)).toBe("curve"); expect((await latex(p))[0]).toBe("y=x^{2}"); }
test("AR-65 practice: v2 opens for dev_seed_admin and graphs y=x^2 with the worker from /_next/", async ({ page }) => { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 800 }); await practice(page); await graphParabola(page); expect(errors).toEqual([]); });
test("AR-65 diagnostic: on the first Math question v2 graphs y=x^2 with the worker from /_next/, docks on a transfer at 1280 px and goes full screen at 390 px", async ({ page }) => { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 800 }); await diagnosticMath(page); await graphParabola(page); await expect(frame(page)).toHaveAttribute("data-mode", "floating");
  const stem = page.getByRole("button", { name: /^Transfer to Calculator: (?!choice)/ }); await expect(stem).toHaveCount(1); await stem.focus(); await page.keyboard.press("Enter"); // 3x + 5 = 26
  await expect(frame(page)).toHaveAttribute("data-mode", "docked"); await expect(page.getByRole("complementary", { name: "Karman calculator", exact: true })).toBeVisible();
  await expect.poll(async () => (await latex(page)).map((l) => l.replace(/\s/g, ""))).toEqual(["y=x^{2}", "3x+5=26"]);
  await page.setViewportSize({ width: 390, height: 844 }); await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen"); await expect(page.getByRole("dialog", { name: "Karman calculator", exact: true })).toHaveAttribute("aria-modal", "true");
  await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await side(page).click(); await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen"); expect(errors).toEqual([]); });
```

- [ ] **Step 2: Run them.** Stop any `next dev` in the worktree, copy `.env.local` (R1), then `npx playwright test --config=playwright.calculator-v2-e2e.config.ts tests/e2e/calculator-v2.spec.ts`. Expected: PASS on first run (R4). The transfer, dock and full-screen checks run on the diagnostic's static questions; the practice test needs only the quiz 11's smoke already opens. A failure is an R3 fix in the package that owns the step (11 for opening and window modes, 12 for classification, 14 for the transfer).
- [ ] **Step 3: Commit.** `git add tests/e2e/calculator-v2.spec.ts && git commit -m "Add the calculator v2 next dev spec for practice and the diagnostic (AR-65)"`
- [ ] **Step 4: Mutation checks** (R4; command for each: Step 2's command with `-g "<title start>"`, no other `next dev` running; after each, `git checkout -- <file>` and rerun to PASS):
  - `"AR-65 practice"`: in `src/lib/calculator-v2/worker/create.ts` make `createComputeWorker` construct its Worker from `URL.createObjectURL(new Blob([""], { type: "text/javascript" }))` in place of the `compute.worker.ts` URL. Expected: FAIL in `graphParabola` at `expect(new URL((await worker).url()).pathname).toMatch(/^\/_next\//)` (a `blob:` URL).
  - `"AR-65 diagnostic"`: in `src/components/calculator/use-transfer-bridge.ts` delete the docking store write that 14 Task 11 added to `transfer()`. Expected: FAIL at `expect(frame(page)).toHaveAttribute("data-mode", "docked")`, received `"floating"`.

### Task 13: Phase gate and 1B hand-off

**Files:** none new (R3 fixes only).

**Interfaces:** Consumes every command of `01-interfaces-integration.md` section 16.

- [ ] **Step 1: Spec IDs.** `npx tsx scripts/calculator-v2/check-spec-ids.mjs --phase 1`. Expected: `check-spec-ids: all 391 IDs covered`, exit 0. Every listed ID is an R3 fix in its owning package (00-index section 2), with a titled test or a counted corpus case.
- [ ] **Step 2: Common checks** (00-index section 3, gate environment of section 1): `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run cf:build`, `node scripts/check-file-sizes.mjs`. Expected: all pass.
- [ ] **Step 3: Browser suites.** `npm run test:calculator` (all five projects: the unmodified v1 specs for AR-8 and every v2 spec, including the parity specs, visual and perf), `npm run test:e2e`, `npm run test:visual:regression`, `npx playwright test --config=playwright.calculator-v2-e2e.config.ts` (11's smoke and AR-65). Expected: all pass with no updated baselines.
- [ ] **Step 4: Build output.** On the Step 2 `cf:build` output: `node scripts/build/check-calculator-v2-bundle.mjs` (AR-32, AR-33 with the standalone rule, AR-66 discovery, TR-74) exits 0 with no baseline update, and `npx playwright test --config=playwright.cf-preview.config.ts` passes (AR-66).
- [ ] **Step 5: Hand off.** Report to the lead: each step's result, the R3 fix commits by package, any test a mutation check strengthened (R4), and the recorded `perf` values. The lead then runs the 1B release of `00-index.md` section 1 (`release.sh`, then every AR-65 step by an admin on production, including docking on a transfer at 1280 px) and records the REA confirmations of section 8; this package never runs `cf:deploy`.
