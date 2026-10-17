# 13 paste-standalone, part 1 of 5: clipboard extractor and calculator notation to LaTeX (Tasks 1 to 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of package `13-paste-standalone.md`, which holds the package header, the Consumes list,
the package-internal names, the DOM contract, the Decisions and the Notes for the lead; they apply
to every task here. Tasks run in number order across the five parts; each part starts where the
previous one ends.

---

### Task 1: Clipboard extractor (AR-14)

**Files:**

- Create: `src/lib/calculator-transfer/clipboard.ts`, `src/lib/calculator-transfer/clipboard.test.ts`

**Interfaces:**

- Consumes: `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string` (12, imported as `./normalize`).
- Produces: section 15 exactly: `ClipboardContent`, `extractClipboard(data: DataTransfer): ClipboardContent`, `extractClipboardText(plain: string, html: string | null): ClipboardContent`, `readSystemClipboard(): Promise<ClipboardContent | { kind: "unavailable" }>`, `PASTE_MESSAGES`; plus (package-internal) `MAX_TABLE_COLUMNS = 10`, `delimitedRows(text: string, separator: "," | "\t"): string[][] | null`, `KatexCopy { mathml: string; html: string }` and `dedupeKatexPlainText(plain: string, copies: readonly KatexCopy[]): string`.

- [ ] **Step 1: Write the failing tests** (`clipboard.test.ts`; first line `// @vitest-environment jsdom`, because the HTML cases use `DOMParser`)

````ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  MAX_TABLE_COLUMNS,
  PASTE_MESSAGES,
  dedupeKatexPlainText,
  delimitedRows,
  extractClipboard,
  extractClipboardText,
  readSystemClipboard,
} from "./clipboard";
import { normalizeQuestionMath } from "./normalize";

// like a browser DataTransfer: a file shows in `types` only as "Files"; its MIME type is on
// `items[i].type` and `files[i].type`
function transfer(data: Record<string, string>, fileTypes: string[] = []): DataTransfer {
  const files = fileTypes.map((type) => ({ type }));
  return {
    types: [...Object.keys(data), ...(files.length ? ["Files"] : [])],
    files,
    items: [
      ...Object.keys(data).map((type) => ({ kind: "string", type })),
      ...files.map(({ type }) => ({ kind: "file", type })),
    ],
    getData: (t: string) => data[t] ?? "",
  } as unknown as DataTransfer;
}
const katex = (tex: string) =>
  `<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">${tex}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><svg></svg>x</span></span>`;
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]
  );
}
function setClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
}
// like ClipboardItem: getType rejects with NotFoundError for a type the item does not list
const item = (data: Record<string, string>) => ({
  types: Object.keys(data),
  getType: async (t: string) => {
    if (!(t in data)) throw new DOMException(`${t} is not on the clipboard`, "NotFoundError");
    return { text: async () => data[t] };
  },
});
afterEach(() => setClipboard(undefined));

it("AR-14 PASTE_MESSAGES holds the refusal and table copy", () => {
  expect(PASTE_MESSAGES).toEqual({
    refused: "Figures, images and saved graphs can't be pasted into the calculator.",
    table: "This table can't be pasted into the calculator.",
  });
  expect(MAX_TABLE_COLUMNS).toBe(10);
});
it("AR-14 files and images are refused, KaTeX's own SVG is not an image, and blank text is empty", () => {
  expect(extractClipboard(transfer({}, ["image/png"]))).toEqual({
    kind: "refused",
    reason: "image",
  });
  // the image's MIME type only on files (an empty items list) is still an image
  const filesOnly = { types: ["Files"], items: [], files: [{ type: "image/jpeg" }] };
  expect(extractClipboard({ ...filesOnly, getData: () => "" } as unknown as DataTransfer)).toEqual({
    kind: "refused",
    reason: "image",
  });
  expect(extractClipboard(transfer({ "text/plain": "x" }, ["application/pdf"]))).toEqual({
    kind: "refused",
    reason: "file",
  });
  expect(
    extractClipboard(
      transfer({ "text/html": '<p>graph <img src="g.png"></p>', "text/plain": "graph" })
    )
  ).toEqual({ kind: "refused", reason: "image" });
  expect(
    extractClipboard(transfer({ "text/html": katex("\\sqrt{x}"), "text/plain": "xx" }))
  ).toEqual({ kind: "math", lines: ["\\sqrt{x}"] });
  expect(extractClipboard(transfer({ "text/plain": "  \n " }))).toEqual({ kind: "empty" });
});
it("AR-14 saved graphs, links, markup and code are refused as files; math with < and > is not", () => {
  for (const text of [
    '{"graphState":{}}',
    "expressions: [1]",
    "https://example.com/g.png",
    "<img src=x>",
    "```y=x```",
    "\\includegraphics{g}",
  ])
    expect(extractClipboardText(text, null)).toEqual({ kind: "refused", reason: "file" });
  expect(extractClipboardText("x<y>z", null)).toEqual({ kind: "math", lines: ["x<y>z"] });
});
it("AR-14 plain lines are raw math lines; two or more coordinate pairs are pairs", () => {
  expect(extractClipboardText("$y=x^2$\n\n  y=2x  \r\n", null)).toEqual({
    kind: "math",
    lines: ["y=x^2", "y=2x"],
  });
  expect(extractClipboardText("(1,2) (3, 4); (\\frac{1}{2},-5)", null)).toEqual({
    kind: "pairs",
    pairs: [
      ["1", "2"],
      ["3", "4"],
      ["\\frac{1}{2}", "-5"],
    ],
  });
  expect(extractClipboardText("(f(1,2),3)\n(4,5)", null)).toEqual({
    kind: "pairs",
    pairs: [
      ["f(1,2)", "3"],
      ["4", "5"],
    ],
  });
  expect(extractClipboardText("(2,3)", null)).toEqual({ kind: "math", lines: ["(2,3)"] });
  expect(extractClipboardText("11", null)).toEqual({ kind: "math", lines: ["11"] });
});
it("AR-14 the CSV and TSV tokenizer keeps quoted fields, escaped quotes and embedded line breaks", () => {
  expect(delimitedRows('"a,b",c\n"1""2",3\n"line\nbreak",4', ",")).toEqual([
    ["a,b", "c"],
    ['1"2', "3"],
    ["line\nbreak", "4"],
  ]);
  expect(delimitedRows('"open,1\n2,3', ",")).toBeNull();
  expect(extractClipboardText('"open,1\n2,3', null)).toEqual({
    kind: "math",
    lines: ['"open,1', "2,3"],
  });
});
it("AR-14 a first row of names becomes the headers only when more rows follow; 1 to 10 columns", () => {
  expect(extractClipboardText("x\ty\n1\t2\n3\t4", null)).toEqual({
    kind: "table",
    headers: ["x", "y"],
    columns: [
      ["1", "3"],
      ["2", "4"],
    ],
  });
  expect(extractClipboardText("x₁,y_1,time 2\n1,2,3\n4,5,6", null)).toEqual({
    kind: "table",
    headers: ["x₁", "y_1", "time 2"],
    columns: [
      ["1", "4"],
      ["2", "5"],
      ["3", "6"],
    ],
  });
  expect(extractClipboardText("pi\te\n1\t2", null)).toEqual({
    kind: "table",
    headers: [null, null],
    columns: [
      ["pi", "1"],
      ["e", "2"],
    ],
  });
  expect(extractClipboardText("2x\ty\n1\t2", null)).toEqual({
    kind: "table",
    headers: [null, null],
    columns: [
      ["2x", "1"],
      ["y", "2"],
    ],
  });
  expect(extractClipboardText("x\ty", null)).toEqual({
    kind: "table",
    headers: [null, null],
    columns: [["x"], ["y"]],
  });
  const digits = (n: number) => Array.from({ length: n }, (_, i) => String(i));
  const ten = digits(10).join("\t"); // MAX_TABLE_COLUMNS columns: kept
  expect(extractClipboardText(`${ten}\n${ten}`, null)).toEqual({
    kind: "table",
    headers: Array(10).fill(null),
    columns: digits(10).map((d) => [d, d]),
  });
  const wide = digits(11).join("\t");
  expect(extractClipboardText(`${wide}\n${wide}`, null)).toEqual({
    kind: "table",
    headers: [],
    columns: [],
  });
  expect(extractClipboardText("f(x,y)=x\ny=2", null)).toEqual({
    kind: "math",
    lines: ["f(x,y)=x", "y=2"],
  });
});
it("AR-14 one HTML table: thead, tfoot and header-cell rows skipped, the KaTeX annotation read once", () => {
  const html = `<table><thead><tr><th>x</th><th>y</th></tr></thead><tbody><tr><td>${katex("\\frac{1}{2}")}</td><td>3</td></tr><tr><th>4</th><td>5</td></tr></tbody><tfoot><tr><td>sum</td><td>8</td></tr></tfoot></table>`;
  expect(extractClipboardText("ignored", html)).toEqual({
    kind: "table",
    headers: ["x", "y"],
    columns: [
      ["\\frac{1}{2}", "4"],
      ["3", "5"],
    ],
  });
  expect(
    extractClipboardText("1\n2", "<table><tr><td>1</td></tr><tr><td>2</td></tr></table>")
  ).toEqual({ kind: "table", headers: [null], columns: [["1", "2"]] }); // one column: kept
  expect(
    extractClipboardText("", "<table><tr><td>1</td></tr></table><table><tr><td>2</td></tr></table>")
  ).toEqual({ kind: "table", headers: [], columns: [] });
});
it("AR-14 rendered question math comes once from each x-tex annotation, through normalizeQuestionMath (OI-6)", () => {
  const html = `<p>If ${katex("y=\\dfrac{3}{4}x")} and <span class="katex-display">${katex("x=1{,}200")}</span></p>`;
  const lines = [
    normalizeQuestionMath("y=\\dfrac{3}{4}x", "math"),
    normalizeQuestionMath("x=1{,}200", "math"),
  ];
  expect(extractClipboardText("If y=34x… and x=1,200", html)).toEqual({ kind: "math", lines });
  expect(lines).toEqual(["y=\\frac{3}{4}x", "x=1200"]);
});
it("AR-14 KaTeX HTML without an annotation uses the plain text with the repeated MathML text removed", () => {
  const html =
    '<span class="katex"><span class="katex-mathml"><math><mi>y</mi><mo>=</mo><mn>2</mn><mi>x</mi></math></span><span class="katex-html" aria-hidden="true">y=2x</span></span>';
  expect(extractClipboardText("y=2x\ny=2x", html)).toEqual({ kind: "math", lines: ["y=2x"] });
  expect(dedupeKatexPlainText("y = 2x\ny=2x", [{ mathml: "y=2x", html: "y=2x" }])).toBe("y=2x");
  // the cursor moves past each HTML copy, so "x=1" is not taken out of the first copy's "x=12"
  expect(
    dedupeKatexPlainText("x=12x=12, x=1x=1", [
      { mathml: "x=12", html: "x=12" },
      { mathml: "x=1", html: "x=1" },
    ])
  ).toBe("x=12,x=1");
  // fallback: a MathML text that is not found, or no copies, halves or trims the plain text
  expect(dedupeKatexPlainText("y=2x y=2x", [{ mathml: "q", html: "q" }])).toBe("y=2x");
  expect(dedupeKatexPlainText(" x+1 ", [])).toBe("x+1");
  expect(extractClipboardText("y=2x\ny=2x", "<p>y=2x</p>")).toEqual({
    kind: "math",
    lines: ["y=2x", "y=2x"],
  });
});
it("AR-14 an annotation-free KaTeX fraction, whose MathML and HTML texts differ, keeps one copy", () => {
  // KaTeX's HTML puts the denominator first and adds U+200B struts, so the two copies differ
  const html =
    '<span class="katex"><span class="katex-mathml"><math><mrow><mfrac><mn>3</mn><mn>4</mn></mfrac><mi>x</mi></mrow></math></span><span class="katex-html" aria-hidden="true"><span class="vlist"><span>4</span><span class="vlist-s">\u200b</span><span>3</span></span><span>x</span></span></span>';
  const plain = "34x\n4\u200b3x";
  expect(dedupeKatexPlainText(plain, [{ mathml: "34x", html: "4\u200b3x" }])).toBe("43x");
  expect(extractClipboardText(plain, html)).toEqual({
    kind: "math",
    lines: [normalizeQuestionMath("43x", "math")],
  });
});
it("AR-14 readSystemClipboard reads text and HTML, refuses images and reports unavailable", async () => {
  setClipboard({ read: async () => [item({ "text/plain": "y=x\ny=2x" })] });
  expect(await readSystemClipboard()).toEqual({ kind: "math", lines: ["y=x", "y=2x"] });
  // a text/plain-only item: getType("text/html") would reject, so it is never asked for
  const plainOnly = item({ "text/plain": "y=3x" });
  const getType = vi.spyOn(plainOnly, "getType");
  setClipboard({ read: async () => [plainOnly] });
  expect(await readSystemClipboard()).toEqual({ kind: "math", lines: ["y=3x"] });
  expect(getType.mock.calls).toEqual([["text/plain"]]);
  setClipboard({ read: async () => [item({ "application/x-other": "z" })] });
  expect(await readSystemClipboard()).toEqual({ kind: "empty" });
  setClipboard({
    read: async () => [item({ "text/html": katex("y=\\dfrac{1}{2}x"), "text/plain": "y=12x" })],
  });
  expect(await readSystemClipboard()).toEqual({
    kind: "math",
    lines: [normalizeQuestionMath("y=\\dfrac{1}{2}x", "math")],
  });
  setClipboard({ read: async () => [item({ "image/png": "png" })] });
  expect(await readSystemClipboard()).toEqual({ kind: "refused", reason: "image" });
  setClipboard({ readText: async () => "x^2" });
  expect(await readSystemClipboard()).toEqual({ kind: "math", lines: ["x^2"] });
  setClipboard({
    read: async () => {
      throw new DOMException("denied", "NotAllowedError");
    },
  });
  expect(await readSystemClipboard()).toEqual({ kind: "unavailable" });
  setClipboard(undefined);
  expect(await readSystemClipboard()).toEqual({ kind: "unavailable" });
});
it("AR-14 v2 never imports v1's paste module or calls its parsers", () => {
  const files = [
    ...walk("src/components/calculator-v2"),
    ...walk("src/lib/calculator-v2"),
    "src/lib/calculator-transfer/clipboard.ts",
  ].filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const v1 =
    /from\s+["'](?:@\/lib\/calculator\/paste|(?:\.\.\/)+(?:lib\/)?calculator\/paste)["']|\b(?:parseText|parseTransfer|tablePayload|numericCell|normalizeMath)\s*\(/;
  expect(files.filter((f) => v1.test(readFileSync(f, "utf8")))).toEqual([]);
});
````

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/lib/calculator-transfer/clipboard.test.ts`
Expected: FAIL, `Failed to resolve import "./clipboard"`.

- [ ] **Step 3: Implement `clipboard.ts`** (no `window`, `document` or `navigator` at module scope, AR-2; imports only `./normalize`)

`extractClipboard(data)`: return `{ kind: "refused", reason: "image" }` when any entry of `data.types` matches `/^image\/|svg/i`, or any `type` in `Array.from(data.items ?? [])` or `Array.from(data.files ?? [])` matches `/^image\//` (browsers list a pasted or dropped file in `types` only as `Files`; its MIME type is on the item and the file); else when `data.files.length > 0` or a type is `Files` or matches `/pdf|graph/i`, return reason `"file"`; else `extractClipboardText(data.getData("text/plain"), data.getData("text/html") || null)`.

`extractClipboardText(plain, html)` runs these rules in order:

1. **HTML** (non-empty `html`): parse with `new DOMParser().parseFromString(html, "text/html")`;
   record `copies: KatexCopy[]`, one per `.katex` element that holds a `.katex-mathml`, in
   document order (`mathml` is that element's `.katex-mathml` `textContent`, `html` its
   `.katex-html` `textContent` or `""`); then remove every `.katex-html` element (KaTeX's visual
   copy, which holds its SVG).
   - `img, svg, canvas, picture, video, audio, object, embed, iframe` present: refused `"image"`.
   - One `table`: rows are `table.rows` minus those inside `thead` or `tfoot` and those whose
     cells are all `TH` without `scope="row"`; the first skipped row is the header candidate. Cell
     text: clone the cell, replace each `math` element with the text of its
     `annotation[encoding="application/x-tex"]` (read once), take `textContent`, trim. Width is the
     longest row (shorter rows padded with `""`). `headers` are the candidate's cell texts when it
     has `width` cells, else `null` per column. Columns are the transposed rows. Width 0 or above
     `MAX_TABLE_COLUMNS` gives `headers: []` and `columns: []`.
   - Two or more tables: `{ kind: "table", headers: [], columns: [] }`.
   - One or more x-tex annotations: `math` with one line per non-empty trimmed annotation text, in
     document order, each through `normalizeQuestionMath(tex, "math")` (OI-6).
   - KaTeX markup without an annotation (`.katex` or `math` present):
     `normalizeQuestionMath(dedupeKatexPlainText(plain, copies), "math")` as one line (`empty` when
     the deduplicated text is blank).
   - Otherwise continue with the plain text.
2. **Plain text** (`\r\n` and `\r` become `\n`):
   - Blank: `empty`.
   - Matches any of `/\b[a-z][a-z0-9+.-]*:\/\//i`, `/\b(?:data|blob|javascript):/i`, `/```/`,
     `/\\(?:includegraphics|href|url|html)\b/`,
     `/<\/?(?:a|img|svg|div|span|p|br|table|script|style|iframe|object|embed|html|body|head)\b[^>]*>/i`,
     `/^\s*[[{]\s*["']/`, `/\b(?:graphState|expressions)\s*:/`: refused `"file"`.
   - Coordinate pairs (v1's `coordinatePairs` rule from `src/lib/calculator/paste.ts:92-123`,
     reimplemented here: whitespace, commas and semicolons between `( … )` groups, one top-level
     comma per group, `\left`/`\right` ignored, coordinates trimmed and left raw): two or more give
     `pairs`.
   - A tab anywhere: `delimitedRows(text, "\t")`; else a line break and a comma, with
     `delimitedRows(text, ",")` giving at least two rows that all have the same width of at least
     2 and no cell with unbalanced `()`, `[]` or `{}`: a table. When more than one row follows and
     every first-row cell matches `/^[A-Za-z][A-Za-z0-9₀-₉_ ]*$/` and is not `pi` or `e` (case
     insensitive), the first row becomes `headers`; else `headers` are `null`. Width above
     `MAX_TABLE_COLUMNS` gives `headers: []`, `columns: []`. A `null` tokenizer result falls through.
   - Otherwise `math`: split on `\n`, trim, strip one surrounding `$$…$$` or `$…$`, trim, drop empty lines.

`delimitedRows` is v1's `delimited()` (`src/lib/calculator/paste.ts:126-150`) returning `null` where
v1 throws.

`dedupeKatexPlainText(plain, copies)` (decision 2), where `strip(t)` is
`t.replace(/[\s\u200b]+/g, "")`:

1. `s = strip(plain)`, `cursor = 0`.
2. For each copy with a non-empty `m = strip(copy.mathml)`: `i = s.indexOf(m, cursor)`; when
   `i < 0`, return the fallback; else `s = s.slice(0, i) + s.slice(i + m.length)` and
   `cursor = i + strip(copy.html).length`.
3. With at least one non-empty `m`, return `s`; with none, return the fallback.
4. Fallback: when `s0 = strip(plain)` has even length and both halves are equal, one half; else
   `plain.trim()`.

`readSystemClipboard()` (decision 14):

1. `navigator.clipboard?.read` present: `items = await navigator.clipboard.read()`. Any item with a
   type matching `/^image\//` gives refused `"image"`. Else take the first item whose `types`
   include `text/plain` or `text/html`; none gives `{ kind: "empty" }`. `plain` is
   `await (await item.getType("text/plain")).text()` only when `types` include `text/plain`, else
   `""`; `html` is read the same way only when `types` include `text/html`, else `null`. A
   rejection of a listed flavour's `getType` or `text()` counts as that flavour being absent.
   Return `extractClipboardText(plain, html || null)`.
2. Else `navigator.clipboard?.readText` present: `extractClipboardText(await readText(), null)`.
3. A missing API, or a rejection of `read()` or `readText()` itself, gives
   `{ kind: "unavailable" }`.

- [ ] **Step 4: Run them and see them pass** — Step 2's command; Expected: PASS (12 tests). Then run
      03's import scans, which cover the new module (AR-1 importer rule, AR-2 node load):
      `npx vitest run src/components/calculator/seam-boundaries.test.ts`; Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/lib/calculator-transfer/clipboard.ts src/lib/calculator-transfer/clipboard.test.ts && git commit -m "Add the v2 clipboard extractor (AR-14)"`

### Task 2: Calculator notation to LaTeX (T-12)

**Files:**

- Create: `src/components/calculator-v2/chrome/paste-latex.ts`, `src/components/calculator-v2/chrome/paste-latex.test.ts`

**Interfaces:**

- Consumes: `OPERATOR_NAMES: readonly OperatorName[]`, `AUTO_COMMANDS: readonly string[]` (02, `core/latex/operator-names.ts`); in the test only, `parseLatex(input: string, options?: ParseOptions): ParseResult` and `toSExpr(tree: Node): string` (02, `core/latex`).
- Produces: `AUTO_COMMAND_LATEX: Readonly<Record<string, string>>`, `toPasteLatex(line: string): string`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from "vitest";
import { parseLatex, toSExpr } from "@/lib/calculator-v2/core/latex";
import { AUTO_COMMANDS } from "@/lib/calculator-v2/core/latex/operator-names";
import { AUTO_COMMAND_LATEX, toPasteLatex } from "./paste-latex";
const R = String.raw;
const cases = (pairs: [string, string][]) =>
  expect(pairs.map(([input]) => toPasteLatex(input))).toEqual(pairs.map(([, out]) => out));
const tree = (latex: string) => {
  const parsed = parseLatex(latex);
  return parsed.ok ? toSExpr(parsed.tree) : parsed.error.code;
};

it("T-12 sqrt(x), x^2, pi, <= and x1 become the LaTeX typing gives", () => {
  cases([
    ["sqrt(x)", R`\sqrt{x}`],
    ["x^2", "x^{2}"],
    ["pi", R`\pi`],
    ["<=", R`\le`],
    ["x1", "x_{1}"],
    ["y=sqrt(x)+pi", R`y=\sqrt{x}+\pi`],
    ["x<=1", R`x\le1`],
    ["x>=1", R`x\ge1`],
    ["a12", "a_{12}"],
    ["a_12", "a_{12}"],
    ["v_max", "v_{max}"],
    ["x^-1", "x^{-1}"],
    ["e^x", "e^{x}"],
    ["2*3", R`2\cdot3`],
    ["5%", R`5\%`],
    ["y~x", R`y\sim x`],
    ["$x^2$", "x^{2}"],
  ]);
});
it("T-12 names split as typing splits them; operator names stay letters for MathQuill", () => {
  cases([
    ["2pix", R`2\pi x`],
    ["spin", R`s\pi n`],
    ["sinx", "sinx"],
    ["sin(x)", R`sin\left(x\right)`],
    ["theta", R`\theta`],
    ["mx", "mx"],
    ["log2", "log2"],
  ]);
});
it("T-12 roots, brackets, exponents and integer fractions", () => {
  cases([
    ["sqrt2", R`\sqrt{2}`],
    ["sqrt(x+sqrt(2))", R`\sqrt{x+\sqrt{2}}`],
    ["cbrt(8)", R`\sqrt[3]{8}`],
    ["nthroot(4,x)", R`\sqrt[4]{x}`],
    ["(x+1)(x-1)", R`\left(x+1\right)\left(x-1\right)`],
    ["|x|+1", R`\left|x\right|+1`],
    ["[1,2]", R`\left[1,2\right]`],
    ["x^(2x+1)", R`x^{\left(2x+1\right)}`],
    ["x^2y", "x^{2}y"],
    ["2^10", "2^{10}"],
    ["x^pi", R`x^{\pi}`],
    ["3/4x", R`\frac{3}{4}x`],
    ["x/2", "x/2"],
    ["2 1/2", R`2\frac{1}{2}`],
    ["(1,2", "(1,2"],
  ]);
});
it("T-12 Unicode operators are normalised in plain text and in LaTeX lines", () => {
  cases([
    ["x²−3·x≤π", R`x^{2}-3\cdot x\le\pi`],
    ["3÷4≥−x", R`3\div4\ge-x`],
    ["y≤√(x)+x³", R`y\le\sqrt{x}+x^{3}`],
    ["x₁×y₂", R`x_{1}\cdot y_{2}`],
    ["θ²", R`\theta^{2}`],
    [R`\frac{1}{2}−x²`, R`\frac{1}{2}-x^{2}`],
    [R`x\le 3·y`, R`x\le 3\cdot y`],
    [R`\frac{1}{2}x+\sqrt{3}`, R`\frac{1}{2}x+\sqrt{3}`],
    // table 4.1's √(…) rule in a LaTeX line: a group, a number or a letter becomes the radicand
    [R`\frac{1}{2}+√(x)`, R`\frac{1}{2}+\sqrt{x}`],
    [R`\pi+√2x`, R`\pi+\sqrt{2}x`],
    [R`√{x}+\pi`, R`\sqrt{x}+\pi`],
  ]);
});
it("T-12 whitespace separates: no subscript, fraction or letter run spans it; joining sides get \\cdot", () => {
  cases([
    ["2 3", R`2\cdot3`], // not 23
    ["x 2", R`x\cdot2`], // not x_{2} (PR-14)
    ["m ax", R`m\cdot ax`], // not the name max (PR-13)
    ["2 x", "2x"],
    ["sin x", "sinx"],
    ["1 / 2", "1/2"],
    ["2 1/2", R`2\frac{1}{2}`],
    ["sqrt (x)", R`\sqrt{x}`],
    ["x^ 2", "x^{2}"],
    ["y = 2x + 1", "y=2x+1"],
  ]);
});
it("T-12 decision 12: where typing reads the text differently, the pasted row keeps its raw meaning", () => {
  // [pasted text, LaTeX that typing the same characters gives] -> [pasted tree, typed tree]
  const pairs: [string, string][] = [
    ["x/2", R`\frac{x}{2}`],
    ["3/4x", R`\frac{3}{4x}`],
    ["x^2y", "x^{2y}"],
    ["sinx", R`\sin x`],
  ];
  expect(pairs.map(([text, typed]) => [tree(toPasteLatex(text)), tree(typed)])).toEqual([
    ["(div (id x) (num 2))", "(div (id x) (num 2))"],
    ["(mul (div (num 3) (num 4)) (id x))", "(div (num 3) (mul (num 4) (id x)))"],
    ["(mul (pow (id x) (num 2)) (id y))", "(pow (id x) (mul (num 2) (id y)))"],
    ["(call sin (id x))", "(call sin (id x))"],
  ]);
});
it("T-12 every auto-command of the PR-12 allowlist has a LaTeX form", () => {
  expect(Object.keys(AUTO_COMMAND_LATEX).sort()).toEqual([...AUTO_COMMANDS].sort());
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator-v2/chrome/paste-latex.test.ts`; Expected: FAIL, `Failed to resolve import "./paste-latex"`.
- [ ] **Step 3: Implement `paste-latex.ts`**

`AUTO_COMMAND_LATEX`: `sqrt` `\sqrt`, `cbrt` `\sqrt[3]`, `nthroot` `\sqrt[n]`, `pi` `\pi`, `theta`
`\theta`, `tau` `\tau`, `phi` `\phi`, `infinity` and `infty` `\infty`, `sum` `\sum`, `prod`
`\prod`, `int` `\int`. Commands are emitted as `\name` followed by one space only when the next
output character is a Latin letter (`\pi x`, `\le1`, `\cdot3`).

`toPasteLatex(line)`:

1. Trim; strip one surrounding `$$…$$` or `$…$`; trim.
2. **A line that contains `\`** (LaTeX already): map only Unicode (`−` `–` to `-`; `×` `·` to
   `\cdot`; `÷` `\div`; `≤` `\le`; `≥` `\ge`; `π` `\pi`; `θ` `\theta`; `τ` `\tau`; `²` `^{2}`; `³`
   `^{3}`; subscript digits after a letter to `_{digits}`) and `√` by table 4.1's `√(…)` rule:
   followed by a balanced `( … )` it gives `\sqrt{…}` of the group's contents (mapped the same
   way, parentheses dropped); followed by a number literal or one Latin letter, `\sqrt{…}` of it;
   followed by `{`, `\sqrt` (the braced group is the radicand); otherwise `\sqrt`. Return it.
3. **Plain text**: map Unicode to plain notation (`−` `–` `-`; `×` `·` `*`; `≤` `<=`; `≥` `>=`; `π`
   `pi`; `θ` `theta`; `τ` `tau`; `²` `^2`; `³` `^3`; `√` `sqrt`; subscript digits after a letter to
   digits; `÷` kept as a token), then tokenize into number literals (`\d+(\.\d*)?|\.\d+`), letter
   runs, whitespace runs, `<=`, `>=` and single characters. Split each letter run left to right
   taking the longest of `OPERATOR_NAMES` names and `AUTO_COMMANDS` that starts at each position,
   else one letter (PR-13), giving name, auto-command and letter pieces. Emit:
   - auto-command constants as their command; `sqrt`, `cbrt` take the next balanced `( … )` group
     (converted recursively, parentheses dropped as the radicand's delimiters, decision 12) or the
     next number, letter or constant;
     `nthroot( a , b )` with a top-level comma gives `\sqrt[a]{b}`;
   - name pieces as their letters (MathQuill's `autoOperatorNames` makes them operator names, as
     typing does);
   - a letter piece directly followed by a digit run gives `_{digits}` (PR-14); `_` followed by
     `{…}` is kept, else by a letter-and-digit run gives `_{run}`;
   - `^` followed by `{…}` is kept; by a `( … )` group gives `^{\left(…\right)}`; by an optional
     sign and a number, letter or constant gives `^{…}` and the exponent ends there (decision 12);
     otherwise `^` stays;
   - balanced `(` `)` and `[` `]` give `\left(` `\right)` and `\left[` `\right]`; with an even count
     of `|`, they alternate `\left|` and `\right|`; unbalanced brackets stay as typed;
   - `<=` `\le`, `>=` `\ge`, `*` `\cdot`, `÷` `\div`, `%` `\%`, `~` `\sim`;
   - an integer literal directly followed by `/` and an integer literal gives `\frac{a}{b}` (TR-7's
     plain-text rule; the next factor stays outside, decision 12); any other `/` stays a slash;
   - whitespace runs (decision 12): `^`, `sqrt` and `cbrt` skip one before their operand
     (`sqrt (x)`, `x^ 2`). The subscript and integer-fraction rules take only tokens that touch,
     and letter runs end at whitespace, so no other rule reaches across it (`1 / 2` stays `1/2`,
     0.5 under PR-18). A remaining run is written as `\cdot` where the two sides would join if
     written together: after a number literal when the next emitted text starts with a digit or
     `.` (`2 3`, not 23), and after a letter piece when it starts with a digit or a Latin letter
     (`x 2`, not x₂ by PR-14; `m ax`, not the name max by PR-13). Every other run is dropped
     (`2 x`, `sin x`, `2 1/2`). `\ ` is never written: 02's normalizer removes it (PR-3), so the
     two sides would join;
   - everything else as written.

- [ ] **Step 4: Run them and see them pass** — Step 2's command; Expected: PASS (7 tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator-v2/chrome/paste-latex.ts src/components/calculator-v2/chrome/paste-latex.test.ts && git commit -m "Convert pasted calculator notation to typed LaTeX (T-12)"`
