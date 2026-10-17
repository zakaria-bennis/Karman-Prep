# 13 paste-standalone, part 2 of 5: paste corpus, paste plan, field registry and clipboard listeners (Tasks 3 to 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 2 of package `13-paste-standalone.md`, which holds the package header, the Consumes list,
the package-internal names, the DOM contract, the Decisions and the Notes for the lead; they apply
to every task here. Tasks run in number order across the five parts; each part starts where the
previous one ends.

---

### Task 3: Question math, the paste corpus and its runner (T-12; PR-1 paste dialect; OI-6)

**Files:**

- Modify: `src/lib/calculator-v2/core/corpus/cases/paste.ts` (replaces 02's one-line scaffold)
- Modify: `src/lib/calculator-transfer/clipboard.test.ts` (adds the corpus runner and the PR-1 paste test)
- Check only: `docs/superpowers/specs/calculator-v2/a-math-semantics.md` (OI-6 text, applied by 12)
- Check only: `docs/superpowers/plans/2026-10-16-calculator-v2-phase1/00-index.md` (section 5.3 PR-1 row, added by the lead under 12's precondition P2)

**Interfaces:**

- Consumes: `CorpusCase`, `CORPUS`, `runnerFor(c: CorpusCase, field: ExpectedField): CorpusRunner | null` (02); `parseLatex(input: string, options?: ParseOptions): ParseResult`, `toSExpr(tree: Node): string` (02); `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult` (04; `RowAnalysis.tree: Node | null`); `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string` (12, already imported by task 1); `toPasteLatex` (task 2); `extractClipboardText` (task 1).
- Produces: 19 `pastedQuestionMath` cases `paste-1` … `paste-19`. Encoding fixed here: an input that starts with `<` is the `text/html` flavour, whose `text/plain` flavour is the parsed document's `body.textContent`; any other input is `text/plain` alone. Fields `latex` (the row LaTeX the paste writes: `toPasteLatex` of the single extracted line, before MathQuill's write, decision 12), `tree`, `kind`, `error`. Also the `PR-1`-titled paste-dialect test that 12's precondition P2 asks of this package (12's Task 3 covers question dialect and Task 13 typed and API input; this test covers paste input, the third dialect PR-1 names).

- [ ] **Step 1: Check the OI-6 spec text and the PR-1 index row** (index 6.1: 12 applies PR-1 and PR-6; this package adds the code, the corpus case and the PR-1 paste test)

```sh
grep -cF "is question dialect and goes through TR-7 first, like Transfer; other pasted text is paste input." docs/superpowers/specs/calculator-v2/a-math-semantics.md
grep -cF "Typed and API input, and pasted text that is not rendered question math, keep the product meaning" docs/superpowers/specs/calculator-v2/a-math-semantics.md
grep -cE '^\| PR-1 +\| 12 +\| 13: pasted plain text and pasted rendered question math \(OI-6\) parse to the tree of their typed twin, clipboard\.test\.ts +\|' docs/superpowers/plans/2026-10-16-calculator-v2-phase1/00-index.md
```

Expected: `1`, `1` and `1`. If either of the first two prints `0`, stop and report to the lead that
12's OI-6 text is missing; do not edit the spec (the replacement text is 12's). If the third prints
`0`, report to the lead that 12's precondition P2 row
`| PR-1 | 12 | 13: pasted plain text and pasted rendered question math (OI-6) parse to the tree of their typed twin, clipboard.test.ts |`
is missing from 00-index section 5.3 (the lead adds it; this package does not edit 00-index), and
continue with Step 2.

- [ ] **Step 2: Write the failing runner and the failing PR-1 test** (02's one-line `paste.ts`
      scaffold stays as it is; the 19 cases are written in Step 4)

Append the runner and the PR-1 test to `clipboard.test.ts`; their imports go to the top of the
file and `describe` joins the existing `vitest` import. The PR-1 test pastes cases 1, 6, 11 and 12
(plain text) and 14, 15 and 16 (rendered question math) of Step 4's table and checks that the
pasted row parses, through `parseLatex` and through `analyzeRows`, to the tree of its typed twin:
for the plain-text cases the LaTeX typing gives (written out in `TYPED_TWIN`, the same strings as
the cases' `latex` column), for the question-math cases the TR-7 output
`normalizeQuestionMath(tex, "math")` of the annotation TeX (`QUESTION_TEX`):

```ts
import { CORPUS } from "@/lib/calculator-v2/core/corpus";
import { runnerFor } from "@/lib/calculator-v2/core/corpus/runners";
import { parseLatex, toSExpr } from "@/lib/calculator-v2/core/latex";
import { analyzeRows } from "@/lib/calculator-v2/core/analysis";
import { toPasteLatex } from "@/components/calculator-v2/chrome/paste-latex";

const RUNNER = "src/lib/calculator-transfer/clipboard.test.ts";
const pasteCases = CORPUS.filter((c) =>
  (["tree", "latex", "kind", "error"] as const).some((f) => runnerFor(c, f)?.file === RUNNER)
);
function pastedRowLatex(input: string): string {
  const html = input.startsWith("<") ? input : null;
  const plain =
    html === null
      ? input
      : (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "");
  const content = extractClipboardText(plain, html);
  if (content.kind !== "math" || content.lines.length !== 1)
    throw new Error(`expected one math line: ${JSON.stringify(content)}`);
  return toPasteLatex(content.lines[0]);
}
describe("paste corpus", () => {
  it("T-12 the paste corpus covers plain notation, Unicode, inline, display and annotation-free KaTeX copies", () => {
    expect(pasteCases.map((c) => c.id)).toEqual(
      Array.from({ length: 19 }, (_, i) => `paste-${i + 1}`)
    );
  });
  for (const c of pasteCases) {
    it(`${c.rules.join(", ")} ${c.id}`, () => {
      if (!("pastedQuestionMath" in c.input))
        throw new Error(`${c.id} needs pastedQuestionMath input`);
      const latex = pastedRowLatex(c.input.pastedQuestionMath);
      if (c.latex !== undefined) expect(latex).toBe(c.latex);
      if (c.tree !== undefined) {
        const parsed = parseLatex(latex);
        expect(parsed.ok ? toSExpr(parsed.tree) : parsed.error.code).toBe(c.tree);
      }
      if (c.kind !== undefined || c.error !== undefined) {
        const row = analyzeRows([{ id: "1", latex, hidden: false }], {
          angleMode: "radians",
          complex: false,
        }).rows[0];
        if (c.kind !== undefined) expect(row.kind).toBe(c.kind);
        if (c.error !== undefined) expect(row.error?.code).toBe(c.error);
      }
    });
  }
});

const R = String.raw;
// what typing the same math gives (T-12: "the LaTeX typing gives")
const TYPED_TWIN: Readonly<Record<string, string>> = {
  "paste-1": R`\sqrt{x}`,
  "paste-6": R`y=\sqrt{x}+\pi`,
  "paste-11": R`2\frac{1}{2}`,
  "paste-12": R`x^{2}-3\cdot x\le\pi`,
};
// the x-tex annotation of the rendered question math in cases 14 to 16
const QUESTION_TEX: Readonly<Record<string, string>> = {
  "paste-14": R`y=\dfrac{3}{4}x-1{,}250`,
  "paste-15": R`2\frac{1}{2}+x\le7`,
  "paste-16": R`2\frac{1}{2}`,
};
function treeOf(latex: string): string {
  const parsed = parseLatex(latex);
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
  return toSExpr(parsed.tree);
}
it("PR-1 pasted plain text and pasted rendered question math parse to the tree of their typed twin (OI-6)", () => {
  const twins: Record<string, string> = { ...TYPED_TWIN };
  for (const [id, tex] of Object.entries(QUESTION_TEX))
    twins[id] = normalizeQuestionMath(tex, "math"); // TR-7 output
  for (const [id, twin] of Object.entries(twins)) {
    const c = pasteCases.find((k) => k.id === id);
    if (!c || !("pastedQuestionMath" in c.input))
      throw new Error(`${id} is missing from the paste corpus`);
    const pasted = pastedRowLatex(c.input.pastedQuestionMath);
    expect(treeOf(pasted), id).toBe(treeOf(twin));
    const row = analyzeRows([{ id: "1", latex: pasted, hidden: false }], {
      angleMode: "radians",
      complex: false,
    }).rows[0];
    expect(row.tree ? toSExpr(row.tree) : null, id).toBe(treeOf(twin));
  }
  // OI-6: the same digits are a product as paste input and a mixed number as question math
  expect(treeOf(twins["paste-11"])).toBe("(mul (num 2) (div (num 1) (num 2)))");
  expect(treeOf(twins["paste-16"])).toBe("(add (num 2) (div (num 1) (num 2)))");
  expect(twins["paste-16"]).toBe(R`\left(2+\frac{1}{2}\right)`);
});
```

- [ ] **Step 3: Run them and see them fail** — `npx vitest run src/lib/calculator-transfer/clipboard.test.ts -t "T-12|PR-1"`; Expected: FAIL, the T-12 coverage test with `expected [] to deeply equal [ 'paste-1', … ]` and the PR-1 test with `paste-1 is missing from the paste corpus` (the scaffold has no cases).
- [ ] **Step 4: Write the 19 cases in `paste.ts` and see them pass**

`paste.ts` keeps `import type { CorpusCase } from "../types";` and `export default cases;`, with
three local helpers (relative imports only, no `@/`):

```ts
const R = String.raw;
const mathml = "<mi>y</mi><mo>=</mo><mn>2</mn><mi>x</mi>";
const annotated = (tex: string) =>
  `<span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow>${mathml}</mrow><annotation encoding="application/x-tex">${tex}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">y=2x</span></span>`;
const display = (tex: string) =>
  `<span class="katex-display">${annotated(tex).replace("<math xmlns", '<math display="block" xmlns')}</span>`;
const bare = `<span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML">${mathml}</math></span><span class="katex-html" aria-hidden="true">y=2x</span></span>`;
```

Every case has `rules: ["T-12"]` and `input: { pastedQuestionMath: <input> }`:

| n   | input                                                                 | latex                              | tree                                                                  | kind    | error  |
| --- | --------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- | ------- | ------ |
| 1   | `sqrt(x)`                                                             | `\sqrt{x}`                         | `(root (id x))`                                                       | curve-y |        |
| 2   | `x^2`                                                                 | `x^{2}`                            | `(pow (id x) (num 2))`                                                | curve-y |        |
| 3   | `pi`                                                                  | `\pi`                              | `(const pi)`                                                          | value   |        |
| 4   | `x<=1`                                                                | `x\le1`                            | `(rel <= (id x) (num 1))`                                             | region  |        |
| 5   | `x1`                                                                  | `x_{1}`                            | `(id x_{1})`                                                          |         |        |
| 6   | `y=sqrt(x)+pi`                                                        | `y=\sqrt{x}+\pi`                   | `(rel = (id y) (add (root (id x)) (const pi)))`                       | curve-y |        |
| 7   | `2*3`                                                                 | `2\cdot3`                          | `(mul (num 2) (num 3))`                                               | value   |        |
| 8   | `x^-1`                                                                | `x^{-1}`                           | `(pow (id x) (neg (num 1)))`                                          | curve-y |        |
| 9   | `a12`                                                                 | `a_{12}`                           | `(id a_{12})`                                                         |         |        |
| 10  | `sinx`                                                                | `sinx`                             | `(call sin (id x))`                                                   | curve-y |        |
| 11  | `2 1/2` (plain text: product, OI-6)                                   | `2\frac{1}{2}`                     | `(mul (num 2) (div (num 1) (num 2)))`                                 | value   |        |
| 12  | `x²−3·x≤π` (Unicode-only)                                             | `x^{2}-3\cdot x\le\pi`             | `(rel <= (sub (pow (id x) (num 2)) (mul (num 3) (id x))) (const pi))` | region  |        |
| 13  | `3÷4≥−x` (Unicode-only)                                               | `3\div4\ge-x`                      | `(rel >= (div (num 3) (num 4)) (neg (id x)))`                         | region  |        |
| 14  | `annotated(…)` of `y=\dfrac{3}{4}x-1{,}250` (copied inline segment)   | `y=\frac{3}{4}x-1250`              | `(rel = (id y) (sub (mul (div (num 3) (num 4)) (id x)) (num 1250)))`  | curve-y |        |
| 15  | `display(…)` of `2\frac{1}{2}+x\le7` (copied display segment)         | `\left(2+\frac{1}{2}\right)+x\le7` | `(rel <= (add (add (num 2) (div (num 1) (num 2))) (id x)) (num 7))`   | region  |        |
| 16  | `annotated(…)` of `2\frac{1}{2}` (OI-6: pasted question mixed number) | `\left(2+\frac{1}{2}\right)`       | `(add (num 2) (div (num 1) (num 2)))`                                 | value   |        |
| 17  | `bare` (KaTeX copy without annotation)                                | `y=2x`                             | `(rel = (id y) (mul (num 2) (id x)))`                                 | curve-y |        |
| 18  | `2+`                                                                  | `2+`                               |                                                                       |         | syntax |
| 19  | `x₁·y`                                                                | `x_{1}\cdot y`                     | `(mul (id x_{1}) (id y))`                                             |         |        |

Cases 11 and 16 are OI-6's pair: the same digits mean 1 as plain paste input and 5/2 as pasted
question math. Each `latex` is the `toPasteLatex` output the paste writes to MathQuill, not the
field's `latex()` after the write (decision 12): paste-10 holds `sinx`, which the row then
shows as `\sin x`.

Run the runner and 02's corpus tests (`runnerFor` coverage): `npx vitest run src/lib/calculator-transfer/clipboard.test.ts src/lib/calculator-v2/core/corpus`; Expected: PASS (this task's 21 tests in `clipboard.test.ts`, namely the T-12 coverage test, the 19 case tests and the PR-1 test, plus task 1's 12, plus 02's corpus tests). A wrong `latex` from 12's `normalizeQuestionMath` on case 14, 15 or 16, or a PR-1 tree mismatch on those cases, is reported to 12 under the "Before starting" rule of `13-paste-standalone.md`, with the input and both strings; a PR-1 mismatch between the `parseLatex` tree and the `analyzeRows` tree is reported to 04 the same way.

- [ ] **Step 5: Commit** — `git add src/lib/calculator-v2/core/corpus/cases/paste.ts src/lib/calculator-transfer/clipboard.test.ts && git commit -m "Add the paste corpus, route pasted question math through TR-7 and check the paste dialect shares the parser (T-12, PR-1, OI-6)"`

### Task 4: Paste plan (AR-14)

**Files:**

- Create: `src/components/calculator-v2/chrome/paste-plan.ts`, `src/components/calculator-v2/chrome/paste-plan.test.ts`

**Interfaces:**

- Consumes: `ClipboardContent`, `PASTE_MESSAGES` (task 1, section 15); `toPasteLatex(line: string): string` (task 2); `MAX_ROWS = 100`, `MAX_ROW_CHARACTERS = 2048` (02); `EDITOR_MESSAGES.rowLimit`, `EDITOR_MESSAGES.charLimit` (09); `ExpressionState` and the `CalculatorEngine` members `setExpressions(list: ExpressionState[]): void`, `updateSettings(partial: SettingsUpdate): void`, `endEditGroup(): void`, `readonly settings: CalculatorSettings` (07); `MathField.write(latex: string): void` (05).
- Produces: `PastePlan`, `nextRowIds`, `planPaste`, `PasteEffects`, `applyPastePlan` (signatures in the package-internal names of `13-paste-standalone.md`).

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from "vitest";
import type { ExpressionState } from "@/lib/calculator-v2/core/api/types";
import { PASTE_MESSAGES } from "@/lib/calculator-transfer/clipboard";
import { EDITOR_MESSAGES } from "../ui/list/messages";
import { applyPastePlan, nextRowIds, planPaste, type PasteEffects } from "./paste-plan";
const R = String.raw;
const rows = (...latex: string[]): ExpressionState[] =>
  latex.map((l, i) => ({ id: String(i + 1), latex: l }));

it("AR-14 one math line pasted into a field is written at the caret after T-12 conversion", () => {
  expect(planPaste({ kind: "math", lines: ["x^2"] }, { field: true }, rows("1+"))).toEqual({
    type: "write",
    latex: "x^{2}",
  });
});
it("AR-14 multi-line math, pairs and pastes outside a field append rows, the first filling an empty last row", () => {
  expect(
    planPaste({ kind: "math", lines: ["y=2x", "y=3x"] }, { field: true }, rows("1", ""))
  ).toEqual({
    type: "rows",
    expressions: [
      { id: "2", latex: "y=2x" },
      { id: "3", latex: "y=3x" },
    ],
    focusRowId: "3",
  });
  expect(planPaste({ kind: "math", lines: ["x^2"] }, { field: false }, rows("1"))).toEqual({
    type: "rows",
    expressions: [{ id: "2", latex: "x^{2}" }],
    focusRowId: "2",
  });
  expect(
    planPaste(
      {
        kind: "pairs",
        pairs: [
          ["1", "2"],
          ["pi", "x^2"],
        ],
      },
      { field: false },
      rows("y=x")
    )
  ).toEqual({
    type: "rows",
    expressions: [
      { id: "2", latex: R`\left(1,2\right)` },
      { id: "3", latex: R`\left(\pi,x^{2}\right)` },
    ],
    focusRowId: "3",
  });
});
it("AR-14 refusals, tables and empty clipboards change nothing", () => {
  expect(planPaste({ kind: "refused", reason: "drop" }, { field: true }, rows(""))).toEqual({
    type: "announce",
    message: PASTE_MESSAGES.refused,
  });
  expect(
    planPaste({ kind: "table", headers: [null], columns: [["1"]] }, { field: true }, rows(""))
  ).toEqual({ type: "announce", message: PASTE_MESSAGES.table });
  expect(planPaste({ kind: "empty" }, { field: false }, rows(""))).toEqual({ type: "none" });
});
it("AR-14 a paste past 100 rows or 2,048 characters inserts nothing and gives the limit message", () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), latex: "1" }));
  expect(planPaste({ kind: "math", lines: ["2"] }, { field: false }, full)).toEqual({
    type: "announce",
    message: EDITOR_MESSAGES.rowLimit,
  });
  expect(
    planPaste({ kind: "math", lines: ["2"] }, { field: false }, [
      ...full.slice(0, 99),
      { id: "100", latex: "" },
    ])
  ).toEqual({ type: "rows", expressions: [{ id: "100", latex: "2" }], focusRowId: "100" });
  expect(
    planPaste({ kind: "math", lines: ["1", "2".repeat(2049)] }, { field: true }, rows(""))
  ).toEqual({ type: "announce", message: EDITOR_MESSAGES.charLimit });
});
it("AR-14 new row ids continue after the largest decimal id", () => {
  expect(nextRowIds([{ id: "1" }, { id: "7" }, { id: "graph" }], 2)).toEqual(["8", "9"]);
  expect(nextRowIds([{ id: "a" }], 1)).toEqual(["1"]);
});
it("AR-14 applying a plan: one write between edit-group ends, or one setExpressions after expanding a collapsed list, then reveal", () => {
  const calls: string[] = [];
  const effects = {
    engine: {
      settings: { expressionsCollapsed: true },
      endEditGroup: () => calls.push("end"),
      updateSettings: (s: object) => calls.push(`settings ${JSON.stringify(s)}`),
      setExpressions: (l: ExpressionState[]) => calls.push(`set ${l.length}`),
    },
    field: { write: (l: string) => calls.push(`write ${l}`) },
    announce: (t: string) => calls.push(`announce ${t}`),
    reveal: (id: string) => calls.push(`reveal ${id}`),
  } as unknown as PasteEffects;
  applyPastePlan({ type: "write", latex: "x^{2}" }, effects);
  applyPastePlan(
    { type: "rows", expressions: [{ id: "2", latex: "x" }], focusRowId: "2" },
    effects
  );
  applyPastePlan({ type: "announce", message: "m" }, effects);
  applyPastePlan({ type: "none" }, effects);
  expect(calls).toEqual([
    "end",
    "write x^{2}",
    "end",
    'settings {"expressionsCollapsed":false}',
    "set 1",
    "reveal 2",
    "announce m",
  ]);
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator-v2/chrome/paste-plan.test.ts`; Expected: FAIL, `Failed to resolve import "./paste-plan"`.
- [ ] **Step 3: Implement `paste-plan.ts`** per decisions 1, 6 and 7.
  - `planPaste(content, target, rows)`, by `content.kind`:
    - `empty` gives `{ type: "none" }`.
    - `refused` gives `{ type: "announce", message: PASTE_MESSAGES.refused }`.
    - `table` gives `{ type: "announce", message: PASTE_MESSAGES.table }`.
    - `math` with exactly one line and `target.field` true gives
      `{ type: "write", latex: toPasteLatex(lines[0]) }`.
    - Every other `math` and every `pairs` result builds the entry list: for `math`, each line
      through `toPasteLatex`; for `pairs`, each pair `[x, y]` becomes the string `\left(`, then
      `toPasteLatex(x)`, then `,`, then `toPasteLatex(y)`, then `\right)`.
  - Entry list checks, in this order:
    1. An entry longer than `MAX_ROW_CHARACTERS` gives
       `{ type: "announce", message: EDITOR_MESSAGES.charLimit }`.
    2. Ids: when `rows` is not empty and the last row's `latex ?? ""` is `""`, the first entry
       takes that row's id and the other `n - 1` entries take `nextRowIds(rows, n - 1)`;
       otherwise all `n` entries take `nextRowIds(rows, n)`.
    3. When `rows.length` plus the number of ids from `nextRowIds` exceeds `MAX_ROWS`, the result
       is `{ type: "announce", message: EDITOR_MESSAGES.rowLimit }`.
    4. Otherwise `{ type: "rows", expressions, focusRowId }`, where `expressions` pairs each id
       with its entry as `{ id, latex }` in entry order and `focusRowId` is the last entry's id.
  - `nextRowIds(rows, count)`: `start` is one more than the largest `Number(id)` among the ids that
    match `/^[1-9][0-9]*$/` (a decimal id without leading zeros), or `1` when none match; it
    returns the `count` decimal strings `start`, `start + 1`, and so on.
  - `applyPastePlan(plan, effects)`: `none` does nothing; `announce` calls
    `effects.announce(message)`; `write` calls `engine.endEditGroup()`, `field?.write(latex)`,
    `engine.endEditGroup()`; `rows` calls `engine.updateSettings({ expressionsCollapsed: false })`
    only when `engine.settings.expressionsCollapsed` is true, then
    `engine.setExpressions(plan.expressions)` once, then `effects.reveal(plan.focusRowId)`. This is
    the call order the last test asserts.
- [ ] **Step 4: Run them and see them pass** — Step 2's command; Expected: PASS (6 tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator-v2/chrome/paste-plan.ts src/components/calculator-v2/chrome/paste-plan.test.ts && git commit -m "Plan where pasted math goes and apply it as one step (AR-14)"`

### Task 5: Field registry and the shadow-root clipboard listeners (AR-14, T-5)

**Files:**

- Create: `src/components/calculator-v2/chrome/field-registry.ts`, `src/components/calculator-v2/chrome/clipboard-bridge.ts`, `src/components/calculator-v2/chrome/clipboard-bridge.test.ts`

**Interfaces:**

- Consumes: `type MathFieldFactory = (host: HTMLElement, options: MathFieldOptions) => MathField` (09, `ui/list/math-field-factory.ts`); `MathField` (its `element`, `selectedLatex(): string | null`, `keystroke(keys: string): void` and `destroy(): void` members), `MathFieldOptions` (05); `extractClipboard(data: DataTransfer): ClipboardContent`, `ClipboardContent` (task 1).
- Produces: `trackFields(base: MathFieldFactory): MathFieldFactory` (registers the very object `base` returns, keyed by its `element`, in a module `WeakMap`, and replaces that object's `destroy` with one that forgets it and then calls the original, so `fieldFor` returns the same reference the factory returned); `fieldFor(target: EventTarget | null): MathField | null` (the registered field whose element is the target or the target's closest `.kc-math-field` ancestor); `installClipboardBridge(root: ShadowRoot, deps: ClipboardBridgeDeps): () => void`.

- [ ] **Step 1: Write the failing tests** (first line `// @vitest-environment jsdom`)

```ts
import { afterEach, expect, it, vi } from "vitest";
import type { MathField, MathFieldOptions } from "../math-field/MathField";
import type { ClipboardContent } from "@/lib/calculator-transfer/clipboard";
import { installClipboardBridge } from "./clipboard-bridge";
import { fieldFor, trackFields } from "./field-registry";

type Selection = { latex: string | null };
function fakeField(host: HTMLElement, selection: Selection): MathField {
  const element = host.appendChild(document.createElement("span"));
  element.className = "kc-math-field";
  element.appendChild(document.createElement("textarea"));
  const noop = () => {};
  return {
    element,
    focus: noop,
    blur: noop,
    latex: () => "",
    write: vi.fn(),
    cmd: noop,
    keystroke: vi.fn(),
    typedText: noop,
    run: noop,
    select: noop,
    clearSelection: noop,
    selectedLatex: () => selection.latex,
    reflow: noop,
    setInputMode: noop,
    speechText: () => "",
    destroy: vi.fn(),
  } as unknown as MathField;
}
function setup(selection: Selection = { latex: null }) {
  const host = document.body.appendChild(document.createElement("div"));
  const root = host.attachShadow({ mode: "open" });
  const create = trackFields((h) => fakeField(h, selection));
  const field = create(root.appendChild(document.createElement("div")), {} as MathFieldOptions);
  const plain = root.appendChild(document.createElement("textarea"));
  const button = root.appendChild(document.createElement("button"));
  const apply = vi.fn<(content: ClipboardContent, field: MathField | null) => void>();
  const remove = installClipboardBridge(root, { apply });
  return {
    field,
    textarea: field.element.querySelector("textarea")!,
    plain,
    button,
    apply,
    remove,
  };
}
function transfer(data: Record<string, string>) {
  const map = new Map(Object.entries(data));
  return {
    get types() {
      return [...map.keys()];
    },
    files: { length: 0 },
    items: [],
    getData: (t: string) => map.get(t) ?? "",
    setData: (t: string, v: string) => void map.set(t, v),
  };
}
function fire(target: EventTarget, type: string, data: object, property = "clipboardData") {
  const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, property, { value: data });
  target.dispatchEvent(event);
  return event;
}
afterEach(() => document.body.replaceChildren());

it("AR-14 fieldFor finds the tracked MathField of a target and forgets it on destroy", () => {
  const { field, textarea, plain } = setup();
  expect([fieldFor(textarea), fieldFor(field.element), fieldFor(plain), fieldFor(null)]).toEqual([
    field,
    field,
    null,
    null,
  ]);
  field.destroy();
  expect(fieldFor(textarea)).toBeNull();
});
it("AR-14 a capture-phase paste listener on the shadow root takes the DataTransfer before MathQuill's textarea", () => {
  const { textarea, field, apply } = setup();
  const inner = vi.fn();
  textarea.addEventListener("paste", inner);
  const event = fire(textarea, "paste", transfer({ "text/plain": "x^2" }));
  expect(apply).toHaveBeenCalledWith({ kind: "math", lines: ["x^2"] }, field);
  expect([event.defaultPrevented, inner.mock.calls.length]).toEqual([true, 0]);
});
it("AR-14 a paste outside a MathField inserts rows; a plain text box keeps the native paste", () => {
  const { button, plain, apply } = setup();
  fire(button, "paste", transfer({ "text/plain": "y=x\ny=2x" }));
  expect(apply).toHaveBeenLastCalledWith({ kind: "math", lines: ["y=x", "y=2x"] }, null);
  expect(fire(plain, "paste", transfer({ "text/plain": "x" })).defaultPrevented).toBe(false);
  expect(apply).toHaveBeenCalledTimes(1);
});
it("AR-14 drops are refused, dragover is cancelled, and the remover detaches every listener", () => {
  const { textarea, apply, remove } = setup();
  expect(fire(textarea, "dragover", transfer({}), "dataTransfer").defaultPrevented).toBe(true);
  expect(
    fire(textarea, "drop", transfer({ "text/plain": "x" }), "dataTransfer").defaultPrevented
  ).toBe(true);
  expect(apply).toHaveBeenCalledWith({ kind: "refused", reason: "drop" }, null);
  remove();
  expect(fire(textarea, "paste", transfer({ "text/plain": "x" })).defaultPrevented).toBe(false);
});
it("T-5 copy writes the field's selected LaTeX as text/plain; with no selection the copy is left alone", () => {
  const selection: Selection = { latex: String.raw`\frac{3}{4}` };
  const { textarea } = setup(selection);
  const data = transfer({});
  expect(fire(textarea, "copy", data).defaultPrevented).toBe(true);
  expect(data.getData("text/plain")).toBe(String.raw`\frac{3}{4}`);
  selection.latex = null;
  const none = transfer({});
  expect([fire(textarea, "copy", none).defaultPrevented, none.types]).toEqual([false, []]);
});
it("T-5 cut copies the selection and deletes it with Backspace", () => {
  const { textarea, field } = setup({ latex: "x^{2}" });
  const data = transfer({});
  expect(fire(textarea, "cut", data).defaultPrevented).toBe(true);
  expect([data.getData("text/plain"), vi.mocked(field.keystroke).mock.calls]).toEqual([
    "x^{2}",
    [["Backspace"]],
  ]);
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator-v2/chrome/clipboard-bridge.test.ts`; Expected: FAIL, `Failed to resolve import "./clipboard-bridge"`.
- [ ] **Step 3: Implement.** `installClipboardBridge` adds capture-phase listeners on `root` and returns a function removing all five. The target is `event.composedPath()[0]`.
  - `paste`: `field = fieldFor(target)`; when `field` is null and the target is a `textarea`, an `input` or `isContentEditable`, return (native paste). Otherwise `preventDefault()`, `stopPropagation()`, then `deps.apply(event.clipboardData ? extractClipboard(event.clipboardData) : { kind: "empty" }, field)`.
  - `copy` and `cut`: `latex = fieldFor(target)?.selectedLatex()`; when `latex` and `event.clipboardData` exist, `setData("text/plain", latex)`, `preventDefault()`, `stopPropagation()`, and for `cut` then `field.keystroke("Backspace")`.
  - `dragover`: `preventDefault()`. `drop`: `preventDefault()`, `stopPropagation()`, `deps.apply({ kind: "refused", reason: "drop" }, null)`.
- [ ] **Step 4: Run them and see them pass** — Step 2's command; Expected: PASS (6 tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator-v2/chrome && git commit -m "Add the shadow-root paste, copy, cut and drop listeners (AR-14, T-5)"`
