# 12 transfer-core, part 2 of 5: question-math lexer and segment grammar (Tasks 4 and 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 2 of 5 of package `12-transfer-core.md`, which holds the package header, Conventions
(test helpers `REAL`, `stem`, `N`, `verdicts`, `rowsOf`, `P`, `seeded`, `latexOf`, `analysed`),
Decisions, Deliberate deviations, Preconditions and the ID coverage; they apply to every task
here. Tasks run in number order across the five parts. `ct/` is `src/lib/calculator-transfer/`,
`tr/` is `src/components/calculator-v2/transfer/` and `cases/` is `src/lib/calculator-v2/core/corpus/cases/`.

---

### Task 4: Question-math lexer (TR-8, TR-9)

**Files:** Create `ct/lex.ts`; Test `ct/lex.test.ts`.

**Interfaces:**

- Consumes: nothing (string processing only, AR-3).
- Produces (package-internal; Task 10's `tr/rename.ts` also uses it):

```ts
export type QTokenKind =
  | "num"
  | "name"
  | "pi"
  | "fn"
  | "op"
  | "rel"
  | "open"
  | "close"
  | "absOpen"
  | "absClose"
  | "frac"
  | "sqrt"
  | "comma"
  | "semi"
  | "amp"
  | "newline"
  | "begin"
  | "end"
  | "sysOpen"
  | "sysClose";
export interface QToken {
  kind: QTokenKind;
  text: string;
  start: number;
  end: number;
} // UTF-16 offsets into the lexed string
// text: num as written; name canonical ("x", "a_{1}", "\\alpha_{2}"); fn without backslash ("sin"); op "+" "-" "*" "/" "^" "_";
// rel "=" "<" ">" "<=" ">="; open/close "(" ")" "{" "}" "[" "]"; begin/end the environment name; otherwise the source text
export type LexResult =
  | { ok: true; tokens: QToken[] }
  | { ok: false; rule: "TR-8" | "TR-9"; detail: string };
export const SEGMENT_FUNCTIONS: readonly string[]; // sin cos tan csc sec cot arcsin arccos arctan sinh cosh tanh ln log exp
export const GREEK_IDENTIFIERS: readonly string[]; // alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi rho sigma upsilon phi chi psi omega
export const UNIT_WORDS: readonly string[]; // cm mm km ft yd mi in hr kg lb oz mL
export function lexQuestionMath(latex: string): LexResult; // input is normalizeQuestionMath output
```

- [ ] **Step 1: Write the failing tests** (`rule(s)` is `"ok"` or the result's rule; `kinds(s)` maps tokens to `` `${kind}:${text}` `` and throws on failure):

```ts
it("TR-8 table 4.2's allowed forms lex to tokens with source offsets", () => {
  expect(kinds("y=2x+3")).toEqual(["name:y", "rel:=", "num:2", "name:x", "op:+", "num:3"]);
  expect(kinds("\\frac{1}{2}\\cdot x\\div\\sqrt[3]{a_1}")).toEqual([
    "frac:\\frac",
    "open:{",
    "num:1",
    "close:}",
    "open:{",
    "num:2",
    "close:}",
    "op:*",
    "name:x",
    "op:/",
    "sqrt:\\sqrt",
    "open:[",
    "num:3",
    "close:]",
    "open:{",
    "name:a_{1}",
    "close:}",
  ]);
  expect(kinds("\\left|x\\right|\\le\\pi")).toEqual([
    "absOpen:\\left|",
    "name:x",
    "absClose:\\right|",
    "rel:<=",
    "pi:\\pi",
  ]);
  expect(kinds("\\sin^{-1}x+\\log_{2}8+\\alpha_{2}")).toEqual([
    "fn:sin",
    "op:^",
    "open:{",
    "op:-",
    "num:1",
    "close:}",
    "name:x",
    "op:+",
    "fn:log",
    "op:_",
    "open:{",
    "num:2",
    "close:}",
    "num:8",
    "op:+",
    "name:\\alpha_{2}",
  ]);
  expect(kinds("\\left\\{\\begin{array}{l}y=x\\\\y>2\\end{array}\\right.")).toEqual([
    "sysOpen:\\left\\{",
    "begin:array",
    "name:y",
    "rel:=",
    "name:x",
    "newline:\\\\",
    "name:y",
    "rel:>",
    "num:2",
    "end:array",
    "sysClose:\\right.",
  ]);
  expect(kinds("\\begin{aligned}2x+y&=5\\end{aligned}")).toEqual([
    "begin:aligned",
    "num:2",
    "name:x",
    "op:+",
    "name:y",
    "amp:&",
    "rel:=",
    "num:5",
    "end:aligned",
  ]);
  expect(kinds("ln x+sin(x);(1,2)")).toEqual([
    "fn:ln",
    "name:x",
    "op:+",
    "fn:sin",
    "open:(",
    "name:x",
    "close:)",
    "semi:;",
    "open:(",
    "num:1",
    "comma:,",
    "num:2",
    "close:)",
  ]);
  const r = lexQuestionMath("y = a_1x");
  expect(r.ok && r.tokens.map((t) => [t.start, t.end])).toEqual([
    [0, 1],
    [2, 3],
    [4, 7],
    [7, 8],
  ]);
});
it("TR-8 any other token or command means no control", () => {
  for (const s of [
    "\\Delta x",
    "\\tau",
    "x\\lt3",
    "\\operatorname{abs}(x)",
    "3!",
    "\\{1\\}",
    "\\lvert x\\rvert",
    "\\vec{v}",
    "x:y",
    "1.2.3",
    "2\\ x",
    "x\\qquad y",
    "√2",
    "\\frac12", // D3
    "\\sqrt2", // D3
    "x|y",
    "\\left.x\\right|",
    "a\\\\b",
    "x&y",
    "\\csch x",
    "\\arcsec x",
    "x_{1+2}",
    "*",
  ])
    expect(rule(s), s).toBe("TR-8");
});
it("TR-9 every excluded token of table 4.2 means no control", () => {
  const excluded = [
    "i+2",
    "2i",
    "f'(x)",
    "f^\\prime",
    "abc+1",
    "[2,5]",
    "\\begin{pmatrix}1\\\\2\\end{pmatrix}",
    "\\begin{array}{cc}1&2\\end{array}",
    "x=?",
    "1,2,\\ldots,10",
    "1+\\cdots+n",
    "\\dots",
    "1+...+n",
    "x\\approx3",
    "y\\sim x",
    "a\\cong b",
    "a\\equiv b",
    "x\\ne3",
    "x\\neq3",
    "\\pm2",
    "\\mp2",
    "\\infty",
    "x\\in A",
    "x\\notin A",
    "A\\subset B",
    "A\\cup B",
    "A\\cap B",
    "x\\to2",
    "p\\Rightarrow q",
    "p\\iff q",
    "12\\text{ cm}",
    "\\mathrm{kg}",
    "\\textrm{ft}",
    "\\mbox{in}",
    "90^\\circ",
    "90^{\\circ}",
    "90°",
    "\\$12.50",
    "15\\%",
    "€5",
    "£5",
    "¢5",
    "\\angle B",
    "\\measuredangle B",
    "\\triangle ABC",
    "\\overleftrightarrow{AB}",
    "\\overrightarrow{AB}",
    "\\widehat{A}",
    "AB\\parallel CD",
    "AB\\perp CD",
    "\\square",
    "\\odot",
    "\\circ",
    "\\overline{AB}",
    "12cm",
    "5 mm", // D2
    "3km",
    "6ft",
    "2yd",
    "4mi",
    "2in",
    "3hr",
    "5kg",
    "2lb",
    "8oz",
    "250mL",
  ];
  for (const s of excluded) expect(rule(s), s).toBe("TR-9");
});
it("TR-9 the exclusions are exact", () => {
  for (const s of [
    "x_{i}",
    "ab+1",
    "x cm",
    "\\sin x",
    "sin x",
    "ln2",
    "2\\pi",
    "\\theta",
    "\\sinh x",
  ])
    expect(rule(s), s).toBe("ok");
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/lex.test.ts`. Expected: FAIL, `Failed to resolve import "./lex"`.
- [ ] **Step 3: Implement** a single left-to-right scanner that skips whitespace and returns at the first failure:
  - Digits with at most one `.` (`.5` allowed) → `num`; `.` directly after a number, a stray `.` and `...` (TR-9 first) fail.
  - Letter runs by decision 5 (a unit word after a digit with or without spaces between them, D2). An identifier letter, and equally a Greek identifier command (`\alpha`, …), may take `_{[A-Za-z0-9]+}` or `_c` (one letter or digit) into its `name` token, written canonically (`a_1` → `a_{1}`, `\alpha_2` → `\alpha_{2}`); any other subscript → `TR-8`.
  - Commands: `\frac`, `\sqrt` (each must be followed, after spaces, by `{`, or `\sqrt` by `[`, and a `\sqrt` index's `]` by `{`; a brace-less argument is `TR-8` by D3) → `frac`/`sqrt`; `\cdot`, `\div` → `op` `*`, `/`; `\le`, `\ge` → `rel`; `\pi` → `pi`; `\` + a `SEGMENT_FUNCTIONS` name → `fn`; `\` + a `GREEK_IDENTIFIERS` name → `name`; `\left(`, `\right)` → `open`/`close` `(`/`)`; `\left|`, `\right|` → `absOpen`/`absClose`; `\left\{` → `sysOpen`; `\right.` → `sysClose`; `\\` → `newline` and `&` → `amp`, both only inside an environment; `\begin{e}`/`\end{e}`: `cases`, `aligned`, `gathered` and `array` whose column spec is one of `{l}`, `{c}`, `{r}` → `begin`/`end`; the matrix environments and multi-column arrays → `TR-9`; other environments → `TR-8`.
  - The TR-9 set: identifier `i`; `'`, `\prime`; three-letter runs; `[` or `]` outside a `\sqrt` index; `?`; `\ldots \cdots \dots`, `...`; `\approx \sim \cong \equiv \ne \neq \pm \mp \infty \in \notin \subset \cup \cap \to \Rightarrow \iff`; non-space `\text \mathrm \textrm \mbox`; `\circ`, `°`, `\degree`; `\$ $ ¢ € £ ¥`; `\%`; `\angle \measuredangle \triangle \overleftrightarrow \overrightarrow \widehat \parallel \perp \square \odot \overline`; units after a digit.
  - Symbols `+ - / ^ _ = < > ( ) { } , ;` map to their kinds; everything else (including `*`, `!`, `:`, `|`, `√`, unknown commands and decision 4's list) → `TR-8`.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS (4 tests).
- [ ] **Step 5: Commit** `git add src/lib/calculator-transfer && git commit -m "Lex question math against the transfer allow and exclude lists (TR-8, TR-9)"`.

### Task 5: Segment grammar, types and Phase 1 gates (TR-10 to TR-14, TR-18, TR-21, TR-77)

**Files:** Create `ct/segment.ts`; Test `ct/segment.test.ts`.

**Interfaces:**

- Consumes: Task 4's `lexQuestionMath(latex: string): LexResult`, `QToken`, `QTokenKind`;
  in tests only, Task 3's `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string`.
- Produces (package-internal):

```ts
export const TRANSFER_PHASE: number; // 1; later phases raise it (TR-77)
export const SEGMENT_LIMITS: {
  readonly characters: 2048;
  readonly tokens: 600;
  readonly depth: 64;
}; // characters: 02's MAX_ROW_CHARACTERS and depth: 02's MAX_NESTING_DEPTH, repeated (AR-3);
// tokens: a plan value, the safe proxy for 02's MAX_TREE_NODES (2,000) of decision 7 (t tokens ≤ 2t − 1 nodes)
export interface RowDefinition {
  name: string;
  type: "value" | "function";
  param: string | null;
}
export interface SegmentRow {
  latex: string; // normalised LaTeX of the row (a system line with & removed, trimmed)
  kind: "expression" | "equation" | "inequality" | "function";
  defines: RowDefinition | null;
  names: string[]; // names used as values, first appearance, without the defined name and the parameter
  calls: string[]; // question-function names called, first appearance, without the definition head
  pointNames: string[]; // names used inside point coordinates, first appearance, without the parameter (decision 8's t gate)
}
export type SegmentKind = "expression" | "equation" | "inequality" | "function" | "system";
export type SegmentResult =
  | { ok: true; kind: SegmentKind; rows: SegmentRow[] }
  | { ok: false; rule: string; detail: string };
export function classifySegment(
  latex: string,
  role: "stem" | "choice",
  functionNames: ReadonlySet<string>
): SegmentResult;
```

- [ ] **Step 1: Write the failing tests** (`S(l, role = "stem", fns = [])` = `classifySegment(N(l), role, new Set(fns))`; `verdict` gives `kind` or `rule`):

```ts
it("TR-10 lone numbers, identifiers, numeric powers and bare function references get no control in the stem", () => {
  for (const s of [
    "x",
    "5",
    "-5",
    "+5",
    "3.25",
    ".5",
    "\\frac{3}{4}",
    "-\\frac{3}{4}",
    "2\\frac{1}{2}",
    "-2\\frac{1}{2}",
    "x_{1}",
    "a_n",
    "x^{2}",
    "x^2",
    "y^{-1}",
    // a numeric power is any TR-10 lone number: fractions of integers and mixed numbers too
    "x^{\\frac{1}{2}}",
    "y^{-\\frac{2}{3}}",
    "x^{2\\frac{1}{2}}",
    "f(x)",
    "g(t)",
    "h(x_{1})",
    "r",
    "\\theta",
  ])
    expect(verdict(s), s).toBe("TR-10");
  for (const s of [
    "2x",
    "\\sqrt{50}",
    "2^{10}",
    "-x",
    "x+1",
    "f(3)",
    "\\pi",
    "x^{y}",
    "\\frac{x}{2}",
  ])
    expect(verdict(s), s).toBe("expression");
});
it("TR-10 does not apply to a whole answer choice", () => {
  for (const s of [
    "x",
    "5",
    "\\frac{3}{4}",
    "2\\frac{1}{2}",
    "x^{2}",
    "x^{\\frac{1}{2}}",
    "y^{-\\frac{2}{3}}",
    "f(x)",
  ])
    expect(verdict(s, "choice"), s).toBe("expression");
});
it("TR-11 a segment is an expression, an equation or a same-direction inequality; other chains get no control", () => {
  const cases: [string, string][] = [
    ["2x+1", "expression"],
    ["y=2x+3", "equation"],
    ["3p+4=19", "equation"],
    ["y>2x+1", "inequality"],
    ["0\\le x<10", "inequality"],
    ["-2<x\\le5", "inequality"],
    ["5>y\\ge-1", "inequality"],
    ["3p+4>19", "inequality"],
    ["0<x>2", "TR-11"],
    ["x=y<3", "TR-11"],
    ["x<y=3", "TR-11"],
    ["x=y=3", "TR-11"],
    ["1<x\\ge0", "TR-11"],
  ];
  for (const [s, v] of cases) expect(verdict(s), s).toBe(v);
});
it("TR-11 relations below the top level and dangling operators are not well-formed forms", () => {
  for (const s of [
    "(x=2)",
    "\\frac{x<1}{2}",
    "2+",
    "=3",
    "x==2",
    "y=",
    "x^",
    "x^2^3",
    "\\sqrt{}",
    "\\frac{1}{}",
    "()",
    "(1,2,3)",
    "\\sin",
    "\\log_{2}",
    "x+\\left|y",
    "1,2",
  ])
    expect(verdict(s), s).toBe("TR-8");
});
it("TR-12 a cases, aligned, gathered or one-column array block is a system with one row per line and & removed", () => {
  const sys = (s: string) => {
    const r = S(s);
    return r.ok ? [r.kind, r.rows.map((w) => w.latex)] : r.rule;
  };
  expect(sys("\\begin{cases}y=2x\\\\y=x+1\\end{cases}")).toEqual(["system", ["y=2x", "y=x+1"]]);
  expect(sys("\\begin{aligned}2x+y&=5\\\\x-y&=1\\\\\\end{aligned}")).toEqual([
    "system",
    ["2x+y=5", "x-y=1"],
  ]);
  expect(sys("\\begin{gathered}y\\ge x^{2}\\\\y<4\\end{gathered}")).toEqual([
    "system",
    ["y\\ge x^{2}", "y<4"],
  ]);
  expect(sys("\\left\\{\\begin{array}{l}y=2x+1\\\\y>x\\end{array}\\right.")).toEqual([
    "system",
    ["y=2x+1", "y>x"],
  ]);
  expect(sys("\\begin{cases} y = 2x \\\\ y = x + 1 \\end{cases}")).toEqual([
    "system",
    ["y = 2x", "y = x + 1"],
  ]);
});
it("TR-12 every system line must be an equation or inequality passing every rule, and a piecewise definition gets no control", () => {
  const cases: [string, string][] = [
    ["\\begin{cases}y=2x\\\\2x\\end{cases}", "TR-12"],
    ["\\begin{cases}y=2x\\\\y\\ne3\\end{cases}", "TR-9"],
    ["\\begin{cases}y=2x\\\\0<y>2\\end{cases}", "TR-11"],
    ["f(x)=\\begin{cases}x&x<0\\\\2x&x\\ge0\\end{cases}", "TR-12"],
    ["\\begin{cases}y=2x\\end{cases}+1", "TR-12"],
    ["\\begin{cases}\\end{cases}", "TR-12"],
    ["\\begin{cases}y=\\sinh x\\\\y=1\\end{cases}", "TR-77"],
  ];
  for (const [s, v] of cases) expect(verdict(s), s).toBe(v);
});
it("TR-13 function definitions, variable definitions and other single equations are one row each", () => {
  const r = (s: string, fns: string[] = []) => {
    const v = S(s, "stem", fns);
    return v.ok ? [v.kind, v.rows.length, v.rows[0].defines] : v.rule;
  };
  expect(r("P(t)=500(1.03)^{t}")).toEqual([
    "function",
    1,
    { name: "P", type: "function", param: "t" },
  ]);
  expect(r("f_{1}(x)=x^{2}")).toEqual([
    "function",
    1,
    { name: "f_{1}", type: "function", param: "x" },
  ]);
  expect(r("C=8h+15")).toEqual(["equation", 1, { name: "C", type: "value", param: null }]);
  expect(r("3p+4=19")).toEqual(["equation", 1, null]);
  expect(r("y=2x+3")).toEqual(["equation", 1, null]);
  expect(r("g(x)=f(x,1)", ["f"])).toBe("TR-13");
});
it("TR-14 circle equations are equations", () => {
  for (const s of ["(x-2)^2+(y+1)^2=9", "x^{2}+y^{2}=25", "(x+3)^{2}+y^{2}=\\frac{1}{4}"])
    expect(verdict(s), s).toBe("equation");
});
it("TR-18 a name before ( is a call only when it is a question function name", () => {
  const v = S("y=a(x+3)");
  expect(v.ok && [v.kind, v.rows[0].calls, v.rows[0].names]).toEqual([
    "equation",
    [],
    ["y", "a", "x"],
  ]);
  const w = S("y=a(x+3)", "stem", ["a"]);
  expect(w.ok && w.rows[0].calls).toEqual(["a"]);
  const g = S("g(x)=f(x+1)+f(2)", "stem", ["f"]);
  expect(g.ok && [g.kind, g.rows[0].calls, g.rows[0].names]).toEqual(["function", ["f"], []]);
});
it("TR-21 the classifier is narrowed wherever the v2 core reports a row error, with a 600-token cap standing in for the node limit", () => {
  for (const s of [
    "x+y",
    "e=2",
    "\\pi=3",
    "a=a+1",
    "(x,2)+1",
    "P=(1,y)",
    "f(r)=\\pi r^{2}",
    "f(x)=f(x-1)+1",
    "1+".repeat(1025) + "1", // 2,051 characters
    "1+".repeat(300) + "1", // 601 characters and 601 tokens: only the token cap rejects it
    "y=" + "(".repeat(65) + "x" + ")".repeat(65),
    "2^{".repeat(65) + "1" + "}".repeat(65),
    "y=\\sqrt{" + "\\frac{1}{".repeat(64) + "x" + "}".repeat(65),
  ])
    expect(verdict(s), s.slice(0, 20)).toBe("TR-21");
  for (const s of [
    "x+2y=1",
    "t=2",
    "P=(1,2)",
    "f(t)=t+1",
    "1+".repeat(299) + "1", // 599 tokens
    "-" + "1+".repeat(299) + "1", // exactly 600 tokens
    "y=" + "(".repeat(64) + "x" + ")".repeat(64),
    "2^{".repeat(64) + "1" + "}".repeat(64),
  ])
    expect(verdict(s), s.slice(0, 20)).not.toMatch(/^TR-/);
  const tokens = (s: string) => {
    const r = lexQuestionMath(N(s));
    return r.ok ? r.tokens.length : r.rule;
  };
  expect([
    tokens("1+".repeat(300) + "1"),
    tokens("1+".repeat(299) + "1"),
    tokens("-" + "1+".repeat(299) + "1"),
  ]).toEqual([601, 599, 600]);
  expect(SEGMENT_LIMITS).toEqual({ characters: 2048, tokens: 600, depth: 64 });
});
it("TR-77 Phase 1 blocks hyperbolic functions, θ, r outside a definition of another name, pairs and function coordinates; the t gate needs dependencies", () => {
  for (const s of [
    "\\sinh x",
    "y=\\cosh(x)",
    "\\tanh2",
    "\\sin\\theta=\\frac{3}{5}",
    "2\\pi r",
    "r=5",
    "y=r+1",
    "(\\cos t,\\sin t)",
    "(2,5)",
    "(1,2),(3,4)",
    "(1,2);(3,4)",
    "(h,k)",
    "(2a,0)",
  ])
    expect(verdict(s), s).toBe("TR-77");
  expect(verdict("f(2)=5", "stem", ["f"])).toBe("TR-77");
  // P=(t,2) passes here; classify.ts applies decision 8's t gate once dependencies are known (Task 7)
  for (const s of ["A=\\pi r^{2}", "C=2\\pi r", "P=(1,2)", "f(2)=5", "P=(t,2)"])
    expect(verdict(s), s).toBe("equation");
  const p = S("P=(t,2)");
  expect(p.ok && [p.rows[0].names, p.rows[0].pointNames]).toEqual([["t"], ["t"]]);
  expect(TRANSFER_PHASE).toBe(1);
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/segment.test.ts`. Expected: FAIL, `Failed to resolve import "./segment"`.
- [ ] **Step 3: Implement `classifySegment`** with decision 6's order:
  1. Over 2,048 characters → `TR-21` (detail `limits`); lex (fail → its rule); over 600 tokens → `TR-21` (detail `limits`; decision 7's proxy for too-many-nodes).
  2. Systems: a `begin` token is valid only as the first token (after an optional `sysOpen`) with its matching `end` last (before the `sysClose` that must then close it); otherwise `TR-12`. Split the inner tokens on `newline`, drop empty lines; no lines → `TR-12`; each line's `latex` is `latex.slice(first.start, last.end).replace(/&/g, "").trim()` and is classified as a row; an expression line → `TR-12`; any line's own rejection is the result.
  3. Rows: a recursive-descent recogniser (`relation chain` of `sum`s; `sum` of `term`s with `+`/`-`; `term` of factors with `*`, `/` or juxtaposition; `factor` = optional sign then `postfix`; `postfix` = `atom` with at most one `^` exponent, where the exponent is `{sum}`, a `num`, a one-letter `name` or `pi`; `atom` = `num`, `name`, `pi`, `( sum )` or a point `( sum , sum )`, `absOpen sum absClose`, `frac {sum}{sum}`, `sqrt [sum]? {sum}`, a question-function call `name ( sum )`, or `fn` with an optional `^` exponent (and for `log` an optional `_` base) then `( sum )` (two arguments only for `arctan`) or a PR-24 run of `postfix` factors). Failure → `TR-8`; a question-function call without exactly one argument → `TR-13`. A top-level `comma` or `semi` is allowed only between points (a pair segment). The recogniser carries a depth counter by 02's G13 rule (decision 7): entering a `( … )` group or point, an `absOpen … absClose` bar, a `frac` argument, a `sqrt` index or argument, a `^` exponent, a `_` subscript or base, or a call argument list adds 1, and a braced or `(` argument of those counts once, never again as a group; reaching depth 65 → `TR-21` (detail `too-deep`). It also records, per row, the names used inside point coordinates (`pointNames`).
  4. Head: tokens `name ( name ) =` with exactly one `=` define a function (the head name joins the call set for the body); `name =` with `name` not `x`, `y` defines a value. Kind: no relation → expression; one `=` → function (head) or equation; same-direction `<`/`<=` or `>`/`>=` only → inequality; anything else → `TR-11`. `names`, `calls` and `pointNames` leave out the defined name and the function's own parameter.
  5. Stem only: TR-10's lone forms over the token list → `TR-10`. A _lone number_ is `[sign] num`, `[sign] frac{num}{num}` or the normalised mixed number `[sign] ( num + frac{num}{num} )`, with `sign` a `+` or `-` op token and `( )` the `\left(`/`\right)` tokens. The lone forms are a lone number; `name`; `name ^ { lone number }` or `name ^ num` (a numeric power: TR-10's lone number, which the numeric constant of the spec's term table includes, so `x^{2}`, `y^{-1}`, `x^{\frac{1}{2}}`, `y^{-\frac{2}{3}}` and `x^{\left(2+\frac{1}{2}\right)}`); `name ( name )`.
  6. Decision 8's `segment.ts` gates (`TR-77`; the `r`-through-dependencies and `t` gates are Task 7's), then decision 7's segment-level narrowing (`TR-21`). Numeric constants (for function coordinates) use only `num`, signs, `frac`, `sqrt`, `pi`, parentheses, `*`, `/` and integer powers.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS (11 tests).
- [ ] **Step 5: Commit** `git add src/lib/calculator-transfer && git commit -m "Classify question math segments by type with Phase 1 gates (TR-10 to TR-14, TR-18, TR-21, TR-77)"`.
