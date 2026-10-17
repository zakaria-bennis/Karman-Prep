# 02 parser: parser, printer, operator names, deadline, corpus registry and the spec-ID checker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Package:** key `parser`, increment 1A, wave 0, no dependencies. Every task includes the Global Constraints and section 4 rules of `00-index.md`. Names and types are those of `01-interfaces.md`
sections 0 to 2 and the `check-spec-ids.mjs` block of section 16; anything else is _internal_. Gates run under Node 22 (`n exec 22 <command>`); never visit Desmos sites or copy Desmos material.
**IDs (29):** PR-3, PR-4, PR-7 to PR-27, PR-29, PR-37 to PR-40, PR-42. **Open items:** OI-9, OI-13, OI-14 (Task 1), OI-27 (Task 7). **Review Focus item 1** of `00-index.md` is Task 10's first
test. **Files** paths are written in full from `src/lib/calculator-v2/` (`core/corpus/runners.ts`, `dev-counters.ts`); paths starting `docs/`, `scripts/` or `tests/` are repo-relative.
`core/latex/` holds `ast.ts`, `errors.ts`, `limits.ts` (_internal_ leaf with the five limit constants, re-exported by `index.ts`, so parser modules never import `index.ts` at run time),
`operator-names.ts`, `normalize.ts`, `tokens.ts`, `parser.ts` (levels 5 to 8), `atoms.ts` (10, 11), `calls.ts`, `letters.ts`, `function-head.ts`, `printer.ts`, `index.ts`.
**Contributions made (00-index 5.3, for 15-release-gates):** counted corpus cases for PR-41 (owner 15; Task 7, `parse-literals.ts`), NM-42 (07; Task 10, `parse-errors.ts`), PR-2 (05; Task 11).

<!-- prettier-ignore-start -->

## Grammar contract
Choices appendix A section 2 leaves open; the parser follows them and the corpus pins them.

- **G1 Tokens.** Whitespace is ignored except inside digits and for adjacency (G6, G7, G12). Digits: `[0-9]` with at most one `.` (a `.` starts digits only before a digit; a `.` directly after a
  digits token that already holds a `.` is the symbol `.`, so `1.2.3` is `syntax` at the second `.`: no rule accepts a `.` after a number, in Task 7 or after Task 10), inner whitespace dropped
  from `text`. `\name` is command `name`; `\` plus a non-letter is a command of that character, except `\%`, the symbol `%`. `\operatorname{n}` with `isBuiltinName(n)` is one command `n` over the
  whole text; other `\operatorname`, `\text`, `\mathrm` stay commands of those names. `;` is `unsupported` (FN-80); any other character outside the token types is `syntax` at its span.
- **G2 Levels.** `row := rel end`; `rel := sum (relop sum)*`; `sum := term (("+"|"-") term)*`; `term := unary (mulop unary | factor)*`, the second form being implicit multiplication while
  `startsFactor`; `unary := ("-"|"+")* factor` in a loop (`-` wraps `neg`, `+` adds nothing); `factor := builtinCall | postfix`; `postfix := atom ("^" exponent | "\%" | "^{\circ}")*`. Mulops:
  `*`, `\cdot` (from `\times`), `/` (from `\div`), and `\operatorname{of}` right after a factor whose node is `pct` (PR-7); `of` elsewhere is `syntax`. So `-2x` is `(mul (neg (num 2)) (id x))`.
- **G3 startsFactor:** digits, a letter, `(`, `{`, `[`, a raw `|` only when no bar is open (G11), and any command except the operators and closer `cdot`, `le`, `ge`, `rvert`, `of`, which are
  `syntax` wherever an atom is due (so unsupported commands fail as atoms wherever they appear). **G4 Single-token arguments** (`^`, `_`, `\frac`, `\sqrt` without braces): a braced group, one
  character split off a digits token (the remainder keeps its end), one letter (no PR-14) or one atom command (Greek, `\pi`, `\tau`). Any other command fails at itself: `syntax`
  for G3's five, else `unsupported` as G6 reports a command atom (`x^\infty`, `\sqrt\pm`, also `x^\frac12`); any other token is `syntax`.
- **G5 Superscripts.** `^{\circ}` (the only form after normalization) is the postfix degree sign. A `^` exponent directly after another is `syntax` (PR-19); a degree sign, `\%` or closing bracket
  between them makes it legal.
- **G6 Identifiers.** A Latin letter is `id`, except `e`: `const e` unless `_` follows (then `id "e_{…}"`, OI-27). Greek identifiers (`\alpha`…): alpha beta gamma delta epsilon varepsilon zeta
  eta theta vartheta iota kappa lambda mu nu xi rho varrho sigma varsigma upsilon phi varphi chi psi omega; any other command as an atom is `unsupported`. `_` follows only a Latin or Greek
  identifier (or `\log`) and holds letters and digits, unsplit (`a_1` names `a_{1}`). PR-14: a digits token with no `.` and no inner whitespace starting exactly where a Latin identifier ends,
  with no explicit subscript, becomes its subscript.
- **G7 Letter runs.** Adjacent letter tokens form a run; `splitLetterRuns` replaces, left to right, the longest `OPERATOR_NAMES` or `AUTO_COMMANDS` entry starting at each position with one
  command token over its letters. Member names never match; letters in a `_{…}` group are never split. `pi`, `tau` are constants, `theta`, `phi` Greek identifiers, `sqrt` is `\sqrt`, `cbrt` is
  `\sqrt` with index `(num 3)`; `nthroot`, `infinity`, `infty`, `sum`, `prod`, `int` are `unsupported`.
- **G8 Built-in calls.** A command naming an `OPERATOR_NAMES` entry with a category is a built-in; unshipped (`!isShippedBuiltin`) is `unsupported` at the name before anything else is read;
  `with`, `for`, `and`, `or` are `unsupported`. After the name: optional `_` base (`log` only) and `^` power, each once, either order. A following `(` group holds the arguments (PR-25; the call
  is a level-11 atom taking postfix); otherwise the PR-24 run: leading signs, then factors while `startsFactor` and the next token is not a built-in. An empty run before a built-in takes that
  call as its argument (`\sin\cos x`); any other empty run is `syntax`. Power `neg(num 1)` on sin cos tan csc sec cot sinh cosh tanh csch sech coth renames to `arc…`; another power gives
  `pow(call, power)`. `log` args are `[x]` or `[x, base]`.
- **G9 Roots.** `\sqrt` takes an optional `[index]` sum, then a braced group, a `(` group (pasted `sqrt(x)`) or a G4 token. **G10 Groups.** `(` and `{` in atom position hold comma-separated sums,
  an empty part being `syntax`; one part is that sum. A `(` group with two parts is a `point` and with three or more `point-arity` over the group; a `{` group with two or more parts is `syntax`
  at its first top-level comma. `[` and `\{` are `unsupported` (lists, piecewise).
- **G11 Bars.** `\lvert … \rvert` is `abs`. A raw `|` in atom position opens a raw bar; in operator position it closes the innermost open bar when that is raw, opens one (implicit multiplication)
  when none is open, and is `syntax` when the innermost is `\lvert` (G3 leaves it to the `\lvert` group, which reports it where `\rvert` is due: `\left|x|y|\right|` is `syntax` at the first `|`,
  span 8 to 9). This reads PR-21's "closes one otherwise" as "closes an open one", so `2|x-3|` and `|x||y|` parse.
- **G12 Relations.** `=`, `<`, `>`, `\le`, `\ge`, and `<` or `>` with an adjacent `=`. Left to right, the first op that mixes `=` with anything, adds a second `=` or reverses direction is
  `relation-chain` at its span. Relations exist only at row level; elsewhere a relop is `syntax`.
- **G13 Limits.** Entering a group, fraction argument, root index or argument, bar, exponent, subscript or call argument list adds 1 to depth; a braced or `(` argument (exponent, subscript,
  fraction or root argument, argument list) counts once, never again as a group, so 64 nested `^{…}` exponents parse. Depth 65 is `too-deep` at the opener. A `RangeError` maps to `too-deep`, any
  other throw to `syntax` (detail `internal: <name>`); more than `MAX_TREE_NODES` nodes is `too-many-nodes` at `{0, normalized.length}`.
- **G14 Spans.** A node spans its first token's start to its last token's end in the normalized text; `syntax` points at the unexpected token (`end` is `{len, len}`), `unsupported` at the
  construct's first token. Empty or blank input is `syntax` at `{0, 0}`, detail `empty`.
- **G15 Recorded choices.** (1) Function heads are Latin only: `functionDefinitionHead` takes a Latin letter as the name and Latin letters as parameters, so `\alpha(x)=x` and `f(\theta)=\theta`
  are no heads and parse as products (PR-23's and RC-4's "single letter" read as the Latin letters SAT functions use; G6's Greek identifiers stay plain names). (2) `\text{}`, `\mathrm{}` and
  `\operatorname{}` with an empty group are half-typed `syntax` (MathQuill leaves `\operatorname{}` when a name is deleted, Review Focus item 1); PR-9's `unsupported` covers a group holding a
  name that is not allowlisted.

**Case lists.** A line starts with its rules (`PR-10:`) and holds entries `n: latex => tree`, `n: latex => !code` or `n: latex => "text"` separated by ` ;; `; an entry without `=>` repeats the
line's first code. LaTeX is raw (double each backslash in the TS string), `(empty)` is `""`, and `[rows: …]` gives `rows`, several rows separated by ` | ` (space, bar, space; no row here contains
it). Entries become `t(n, rules, latex, tree, rows?)`, `x(n, rules, latex, code)` (Task 7 builders) or `v(n, rules, latex, text, rows?)` (Task 8; `display` is the text).

## Task 1: Open items OI-9, OI-13 and OI-14 (spec text)
**Files:** Modify `docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` (section 3, lines 121 to 124; section 7.3 **Shipped-part IDs**, lines 373 to 380). **Interfaces:** none.
- [ ] **Step 1:** `grep -c "The two v2 settings v1" docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` prints `1`.
- [ ] **Step 2: OI-13.** Replace the last three lines of the "Existing contracts kept" bullet with:
```markdown
  question, question export entry points, scoring and persistence untouched. Display size and
  reverse contrast, two settings v1 lacks, persist for the page session across questions (section
  10.3 item 6); everything else is fresh per question.
```
- [ ] **Step 3: OI-9 and OI-14.** Both add AR-10, which appears once where OI-9 puts it; RC-17 follows RC-7 (OI-14). Replace the whole paragraph with:
```markdown
**Shipped-part IDs.** Each of these IDs also names behaviour that a later-phase ID delivers, and
each resolves by the shipped-part rule: V1-7, V1-39; PR-9, PR-12, PR-16, PR-17, PR-20, PR-26,
PR-41, PR-44; RC-2, RC-3, RC-6, RC-7, RC-17, RC-19, RC-21; NM-9, NM-18, NM-22, NM-25, NM-42; G-4,
G-15; POI-2; FN-1, FN-4, FN-6, FN-11, FN-17; TR-20, TR-28, TR-32, TR-35, TR-38, TR-40, TR-42,
TR-46, TR-47, TR-48, TR-49, TR-50, TR-52, TR-53, TR-55, TR-56, TR-59, TR-67, TR-70, TR-72, TR-73,
TR-79; AR-10, AR-14, AR-16, AR-25, AR-37, AR-45, AR-48, AR-58, AR-60; API-1, API-5, API-6, API-7,
API-8, API-9, API-10; L-9; T-3, T-12; S-9; KB-1, KB-5; SC-2, SC-13; AN-4, AN-13; A11Y-2, A11Y-5,
A11Y-6, A11Y-11; TH-2, TH-8, TH-10, TH-15, TH-17.
```
- [ ] **Step 4:** Verify; expected `1 1 1 1 1 0`, then Prettier passes:
```bash
F=docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md
for s in "Display size and$" "PR-41, PR-44; RC-2, RC-3, RC-6, RC-7, RC-17, RC-19" "TR-79; AR-10, AR-14, AR-16, AR-25, AR-37, AR-45, AR-48, AR-58, AR-60;" \
  "API-8, API-9, API-10; L-9;" "TH-2, TH-8, TH-10, TH-15, TH-17." "The two v2 settings v1"; do printf "%s " "$(grep -c "$s" $F)"; done; npx prettier --check $F
```
- [ ] **Step 5:** `git commit -am "Resolve open items OI-9, OI-13 and OI-14 in the calculator v2 overview"`

## Task 2: Corpus types, registry, runner routing and scaffolds (PR-39, PR-40)
**Files:** Create `core/latex/ast.ts` (types only), `core/latex/errors.ts`, `core/corpus/types.ts`, `core/corpus/runners.ts`, `core/corpus/index.ts`, `core/corpus/cases/index.ts`, the 18 case
files `core/corpus/cases/<key>.ts` of `01-interfaces.md` 2.1 and `core/corpus/corpus.test.ts`. **Interfaces:** produces `ast.ts` types, `errors.ts` and the corpus declarations of
`01-interfaces.md` sections 1 and 2 exactly; consumes nothing.
- [ ] **Step 1: Write the failing test** `core/corpus/corpus.test.ts`. Later tasks name a test file's relative imports where they decide the Step 2 message (Vite reports the first unresolvable
  import in source order); other imports are `vitest`, `node:` modules and the names used.
```ts
import { readdirSync, readFileSync } from "node:fs"; import { describe, expect, it } from "vitest";
import { CORPUS_FILES } from "./cases/index"; import { CORPUS } from "./index"; import { CORPUS_RUNNERS, isParseOnly, runnerFor } from "./runners";
import { EXPECTED_FIELDS, expectedFields, inputKind, type CorpusCase, type ExpectedField } from "./types";
const ORDER = ("parse-literals parse-operators parse-calls parse-relations parse-errors printer sat-forms classify-rows classify-definitions " +
  "classify-relations display-numbers display-complex domain-real domain-functions keys graph question-dialect paste").split(" ");
const FIELDS: string[] = ["id", "rules", "input", "rows", "settings", ...EXPECTED_FIELDS];
const base: CorpusCase = { id: "a-1", rules: ["PR-39"], input: { latex: "x" } };
describe("golden corpus registry", () => {
  it("PR-39 one static registry holds every case file in section 2.1 order, each under 700 lines", () => {
    const dir = new URL("./cases/", import.meta.url);
    expect(Object.keys(CORPUS_FILES)).toEqual(ORDER);
    expect(readdirSync(dir).filter((f) => f !== "index.ts").map((f) => f.replace(/\.ts$/, "")).sort()).toEqual([...ORDER].sort());
    for (const key of ORDER) expect(readFileSync(new URL(`${key}.ts`, dir), "utf8").split("\n").length).toBeLessThan(700);
    expect(CORPUS).toEqual(Object.values(CORPUS_FILES).flat());
  });
  it("PR-40 every case has a unique file-prefixed id, spec-ID rules, only known fields and a readable shape", () => {
    const seen = new Set<string>();
    for (const [key, cases] of Object.entries(CORPUS_FILES)) for (const c of cases) {
      expect([c.id, seen.has(c.id), Object.keys(c).filter((k) => !FIELDS.includes(k))]).toEqual([expect.stringMatching(new RegExp(`^${key}-\\d+$`)), false, []]);
      seen.add(c.id);
      expect(c.rules.length > 0 && c.rules.every((r) => /^[A-Z][A-Z0-9]*-\d+$/.test(r)) && expectedFields(c).length > 0 === (key !== "graph")).toBe(true);
    }
    expect(EXPECTED_FIELDS).toEqual(["tree", "latex", "kind", "chips", "display", "error"]);
    expect([{ latex: "x" }, { keys: ["x"] }, { question: "x", context: "cell" as const }, { pastedQuestionMath: "x" }].map(inputKind))
      .toEqual(["latex", "keys", "question", "pastedQuestionMath"]);
    expect(expectedFields({ ...base, error: "syntax", tree: "(id x)" })).toEqual(["tree", "error"]);
  });
  it("PR-39 runnerFor routes each expected field to exactly one of the five runners", () => {
    expect(CORPUS_RUNNERS.map((r) => `${r.owner}:${r.input}`).join(" ")).toBe("02:latex 04:latex 05:keys 12:question 13:pastedQuestionMath");
    const keys = { keys: ["x"] }, pasted = { pastedQuestionMath: "x" };
    const routes: [CorpusCase, ExpectedField, string | null][] = [[{ ...base, tree: "(id x)" }, "tree", "02"],
      [{ ...base, latex: "x" }, "latex", "02"], [{ ...base, error: "too-deep" }, "error", "02"], [{ ...base, rows: ["a=1"], error: "syntax" }, "error", "04"],
      [{ ...base, error: "cycle" }, "error", "04"], [{ ...base, kind: "value" }, "kind", "04"], [{ ...base, input: keys, latex: "x" }, "latex", "05"],
      [{ ...base, input: keys, kind: "value" }, "kind", null], [{ ...base, input: { question: "x" }, display: "1" }, "display", "12"],
      [{ ...base, input: pasted, tree: "(id x)" }, "tree", "13"], [{ ...base, input: pasted, chips: ["x"] }, "chips", null], [base, "tree", null]];
    for (const [c, field, owner] of routes) expect(runnerFor(c, field)?.owner ?? null).toBe(owner);
    expect(isParseOnly({ ...base, settings: { complex: true }, error: "syntax" })).toBe(false);
  });
});
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/corpus/corpus.test.ts` FAILS: `Failed to resolve import "./cases/index"`.
- [ ] **Step 3: Implement** per `01-interfaces.md` 2 and 2.2: `CORPUS_RUNNERS` is the 2.2 table in order, 02's fields `["tree", "latex", "error"]`, 04's `["kind", "chips", "display", "error"]`;
  `runnerFor` is null for an absent field, else the row matching `inputKind(c.input)` whose fields hold it, a latex `error` going to 02 when `isParseOnly(c)`, else 04. Relative imports only
  (section 0). Each case file starts as `import type { CorpusCase } from "../types";` plus `const cases: CorpusCase[] = []; export default cases;` (11 stay scaffolds, `00-index.md` 5.1);
  `cases/index.ts` default-imports all 18 in `ORDER`.
- [ ] **Step 4:** the Step 2 command PASSES (3 tests).
- [ ] **Step 5:** `git add src/lib/calculator-v2 && git commit -m "Add the calculator v2 golden corpus registry and runner routing (PR-39, PR-40)"`

## Task 3: Spec-ID checker (`--ids`, `--packages`, `--files`)
**Files:** Create `scripts/calculator-v2/check-spec-ids.mjs`, `tests/unit/calculator-v2/check-spec-ids.test.ts`. **Interfaces:** consumes `CORPUS` (dynamic import at run time); produces the
section 16 block, JSDoc-typed, plus _internal_ `scanFiles(root: string, only?: readonly string[]): string[]` (sorted repo-relative POSIX paths matching `SCANNED_GLOBS` and, when given,
an `only` glob) and `INDEX_PATH`; 15-release-gates later adds `phaseIds` and `--phase`. These tests check tooling: no title leads with an ID; sources use the fictitious prefix `QQ-`.
- [ ] **Step 1: Write the failing test** (`C` is `import * as C from "../../../scripts/calculator-v2/check-spec-ids.mjs"`; `EXPECTED_FIELDS` and `type CorpusCase` come from
  `../../../src/lib/calculator-v2/core/corpus/types`, which Task 2 created):
```ts
describe("check-spec-ids", () => {
  it("expandIds expands ranges, commas, semicolons and a trailing period", () => {
    expect([C.expandIds("QQ-7 to QQ-9, QQ-12; ZZ-1."), C.expandIds("V1-1 to V1-2, A11Y-2")]).toEqual([["QQ-7", "QQ-8", "QQ-9", "QQ-12", "ZZ-1"], ["V1-1", "V1-2", "A11Y-2"]]);
    for (const bad of ["QQ-3 to ZZ-5", "QQ-9 to QQ-3", "QQ"]) expect(() => C.expandIds(bad)).toThrow(bad);
  });
  it("packageIds reads the 00-index allocation: 29 IDs for 02 and 391 unique in 14 packages", () => {
    expect(C.INDEX_PATH).toBe("docs/superpowers/plans/2026-10-16-calculator-v2-phase1/00-index.md");
    const map = C.packageIds(readFileSync(C.INDEX_PATH, "utf8")), all = [...map.values()].flat();
    expect([[...map.keys()].join(" "), all.length, new Set(all).size]).toEqual(["02 03 04 05 06 07 08 09 10 11 12 13 14 15", 391, 391]);
    expect(map.get("02")).toEqual(C.expandIds("PR-3, PR-4, PR-7 to PR-27, PR-29, PR-37 to PR-40, PR-42"));
  });
  it("titledIds reads IDs leading it, test, describe and test.describe titles only", () => {
    const source = ['it("QQ-1 a", f);', 'test("QQ-2, QQ-3 and QQ-4 b", f);', 'describe("QQ-5 c", f);', 'test.describe("QQ-6 d", f);',
      "it(`QQ-7 ${name}`, f);", 'it.skip("QQ-8 e", f);', 'it.todo("QQ-9 f");', 'split("QQ-10 g");', 'it("see QQ-11 h", f);',
      'it("QQ-12x i", f);', "it('QQ-130 j', f);"].join("\n");
    expect([...C.titledIds(source)].sort()).toEqual(["QQ-1", "QQ-130", "QQ-2", "QQ-3", "QQ-4", "QQ-5", "QQ-6", "QQ-7"]);
  });
  it("corpusIds counts rules of cases with an expected field; missingIds keeps order and drops found and repeats", () => {
    const bare = { id: "a-1", rules: ["QQ-1"], input: { latex: "1" } } as CorpusCase;
    expect([C.corpusIds([bare]), ...EXPECTED_FIELDS.map((f) => C.corpusIds([{ ...bare, [f]: "x" } as unknown as CorpusCase]))]).toEqual([new Set(), ...Array(6).fill(new Set(["QQ-1"]))]);
    expect(C.missingIds(["QQ-2", "QQ-1", "QQ-2", "QQ-3"], new Set(["QQ-3"]))).toEqual(["QQ-2", "QQ-1"]);
  });
  it("scanFiles finds regular test files by anchored SCANNED_GLOBS", () => {
    const files = C.scanFiles(process.cwd()), want = ["tests/unit/calculator-v2/check-spec-ids.test.ts", "src/lib/calculator-v2/core/corpus/corpus.test.ts", "tests/calculator/layout.spec.ts"];
    expect([C.SCANNED_GLOBS, want.every((f) => files.includes(f)), files.some((f) => f.includes("node_modules") || f.endsWith(".mjs")),
      files.every((f) => /\.(spec|test)\.tsx?$/.test(f)) && !files.some((f) => f.includes("-snapshots/"))])
      .toEqual([["src/**/*.test.{ts,tsx}", "tests/**/*.spec.ts", "tests/unit/**/*.test.ts"], true, false, true]);
  });
  it("the CLI exits 1 naming an untested ID, 0 for a titled one, 2 for a bad package or glob, and 1 when --files leaves out the titling file", () => {
    const run = (...a: string[]) => spawnSync(process.execPath, ["--import", "tsx", "scripts/calculator-v2/check-spec-ids.mjs", ...a], { encoding: "utf8" });
    const missing = run("--ids", "QQ-999"), qq1 = (globs: string) => run("--ids", "QQ-1", "--files", globs).status; // only this file's titledIds fixture titles QQ-1
    expect([missing.status, missing.stderr.includes("  QQ-999"), run("--ids", "PR-39").status, run("--packages", "99").status]).toEqual([1, true, 0, 2]);
    expect(["tests/unit/**/*.test.ts", "src/**/*.test.{ts,tsx},tests/**/*.spec.ts", "nope/*.test.ts", ""].map(qq1)).toEqual([0, 1, 2, 2]);
  }, 60_000);
});
```
- [ ] **Step 2:** `npx vitest run tests/unit/calculator-v2/check-spec-ids.test.ts` FAILS: `Failed to resolve import "../../../scripts/calculator-v2/check-spec-ids.mjs"`.
- [ ] **Step 3: Implement** like `scripts/build/check-release-env.mjs` (pure exports; the CLI runs only when `import.meta.url === pathToFileURL(process.argv[1]).href`):
```text
expandIds   strip one trailing "."; split on , and ; then trim; a piece is /^[A-Z][A-Z0-9]*-\d+$/ or "ID to ID" with one prefix and non-decreasing numbers; else throw an Error naming the piece
packageIds  per line: /^### (\d{2}) / sets the package, any other #, ## or ### heading clears it; the first /^- \*\*IDs:\*\* (.+)$/ under a package is expanded; Map in file order
titledIds   titles /(?<![\w.$])(test\.describe|describe|test|it)\s*\(\s*(["'`])((?:\\.|(?!\2)[^\\])*)\2/g; leading IDs /^[A-Z][A-Z0-9]*-\d+(?![\w-])(?:(?:\s*,\s*|\s+and\s+)[A-Z][A-Z0-9]*-\d+(?![\w-]))*/
corpusIds   rules of cases where any EXPECTED_FIELDS member (listed locally; the test catches drift) is defined
scanFiles   readdirSync(join(root, top), { recursive: true, withFileTypes: true }) for top src and tests; keeps regular files only (isFile(), so a
            directory such as tests/visual/regression.spec.ts-snapshots/ is never read), outside node_modules, as repo-relative POSIX paths matching a
            glob regex new RegExp("^" + converted + "$"): converted escapes every regex metacharacter except * { } (so "." becomes "\."), then maps
            "**/" -> "(?:.*/)?", "*" -> "[^/]*", "{a,b}" -> "(?:a|b)"; with only, a path must also match one of its globs (same conversion); sorted
CLI         --ids <list> (expandIds) | --packages 02,03 (packageIds of INDEX_PATH); unknown package or no mode: usage on stderr, exit 2. --files <globs> may follow any
            mode: only = its value split on commas outside {…}; an empty or missing value, or a glob matching no scanFiles(ROOT) path: usage, exit 2. Found = titledIds
            over scanFiles(ROOT, only) plus corpusIds(CORPUS) (cases count whatever --files says), CORPUS from await import(pathToFileURL(join(ROOT,
            "src/lib/calculator-v2/core/corpus/index.ts")).href), ROOT two levels above the script. All found: stdout "check-spec-ids: all <n> IDs covered", exit 0;
            else stderr "check-spec-ids: <k> of <n> IDs have no test title or counted corpus rules entry:" and one "  <ID>" line each, exit 1
```
- [ ] **Step 4:** the Step 2 command PASSES (6 tests).
- [ ] **Step 5:** `git add scripts/calculator-v2 tests/unit/calculator-v2 && git commit -m "Add the calculator v2 spec-ID checker"`

## Task 4: Deadline and development counters
**Files:** Create `core/deadline.ts`, `dev-counters.ts`, `core/deadline.test.ts` (it also tests the counters, as this package owns no other test file beside them). **Interfaces:** produces
`01-interfaces.md` 1.1 exactly. AR-48 and AR-61 belong to 07 and 11, so no title leads with them.
- [ ] **Step 1: Write the failing test:**
```ts
import { afterEach, describe, expect, it, vi } from "vitest"; import * as D from "./deadline"; import { bumpDevCounter } from "../dev-counters";
describe("deadline", () => {
  it("createDeadline throws DeadlineExceeded with the row id once ms have elapsed; NO_DEADLINE never throws; budgets 250, 1000, 500 ms", () => {
    let now = 1000;
    const deadline = D.createDeadline(250, () => now, "row-3");
    now = 1249; expect(() => deadline.check()).not.toThrow();
    now = 1250; expect(() => deadline.check()).toThrow(expect.objectContaining({ name: "DeadlineExceeded", rowId: "row-3" }));
    expect([() => deadline.check(), () => D.NO_DEADLINE.check()].map((f) => { try { f(); return null; } catch (e) { return e instanceof D.DeadlineExceeded; } })).toEqual([true, null]);
    expect([D.ROW_VALUE_DEADLINE_MS, D.REGRESSION_DEADLINE_MS, D.POI_DEADLINE_MS]).toEqual([250, 1000, 500]);
  });
});
describe("development counters", () => {
  afterEach(() => { vi.unstubAllEnvs(); globalThis.__karmanCalculatorCounters = undefined; });
  it("bumpDevCounter creates and updates the global counters outside production, and does nothing in production", () => {
    for (const [name, delta] of [["workers", 1], ["workers", 1], ["workers", -1], ["calculators", 1]] as const) bumpDevCounter(name, delta);
    expect(globalThis.__karmanCalculatorCounters).toEqual({ calculators: 1, workers: 1, reflows: 0 });
    globalThis.__karmanCalculatorCounters = undefined; vi.stubEnv("NODE_ENV", "production"); bumpDevCounter("reflows", 1);
    expect(globalThis.__karmanCalculatorCounters).toBeUndefined();
  });
});
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/deadline.test.ts` FAILS: `Failed to resolve import "./deadline"`.
- [ ] **Step 3: Implement.** `createDeadline` records `start = now()`; `check()` throws `new DeadlineExceeded(rowId)` once `now() - start >= ms`; the error's name is `DeadlineExceeded`, message
  `deadline exceeded` (plus ` for row <id>` when `rowId` is set); `NO_DEADLINE` is frozen. `bumpDevCounter` returns when `process.env.NODE_ENV === "production"` (no `typeof process` guard, so
  bundlers fold it), else applies `??=` with `{ calculators: 0, workers: 0, reflows: 0 }` and adds `delta`; the `declare global` `var` line carries `// eslint-disable-next-line no-var`.
- [ ] **Step 4:** the Step 2 command PASSES (2 tests).
- [ ] **Step 5:** `git add src/lib/calculator-v2 && git commit -m "Add the calculator v2 deadline and development counters"`

## Task 5: Operator-name allowlist (PR-12)
**Files:** Create `core/latex/operator-names.ts`, `core/latex/operator-names.test.ts`. **Interfaces:** produces the `operator-names.ts` block of `01-interfaces.md` section 1 exactly (consumers:
Tasks 6 and 9; packages 05 for T-3 and 09 for K-4).
- [ ] **Step 1: Write the failing test** (`O` is `import * as O from "./operator-names"`):
```ts
const names = () => O.OPERATOR_NAMES.map((n) => n.name);
describe("operator-name allowlist", () => {
  it("PR-12 parser names, MathQuill autoOperatorNames and panel entries come from one list; members are separate", () => {
    expect([new Set(names()).size, O.mathQuillAutoOperatorNames(), names().every(O.isBuiltinName)]).toEqual([104, names().join(" "), true]);
    for (const e of O.panelCategories().flatMap((c) => c.entries)) expect(O.isBuiltinName(e.name) && O.isShippedBuiltin(e.name)).toBe(true);
    expect([O.AUTO_COMMANDS.join(" "), O.mathQuillAutoCommands()]).toEqual(Array(2).fill("sqrt cbrt nthroot pi theta tau phi infinity infty sum prod int"));
    expect(O.MEMBER_NAMES.join(" ")).toBe("null p pleft pright score dof stderr conf lower upper estimate");
    for (const m of O.MEMBER_NAMES) expect(O.isBuiltinName(m) || O.mathQuillAutoOperatorNames().split(" ").includes(m)).toBe(false);
  });
  it("PR-12 Phase 1 ships exactly the trig, inverse trig, exp, ln and log functions", () => {
    expect(O.SHIPPED_PHASE).toBe(1);
    expect(O.OPERATOR_NAMES.filter((n) => n.category !== null && O.isShippedBuiltin(n.name)).map((n) => n.name).join(" "))
      .toBe("sin cos tan csc sec cot arcsin arccos arctan arccsc arcsec arccot exp ln log");
    expect(O.OPERATOR_NAMES.filter((n) => n.category === null).map((n) => n.name).join(" ")).toBe("with for and or of");
    expect([O.OPERATOR_NAMES.find((n) => n.name === "arctan")?.arity, ["mean", "sinh", "nope"].map(O.isShippedBuiltin)]).toEqual([[1, 2], [false, false, false]]);
  });
  it("PR-12 panelCategories gives categories 1, 2 and 8 with K-5 actions", () => {
    expect(O.CATEGORY_HEADINGS.join("|")).toBe("Trig|Inverse trig|Statistics|List operations|Visualizations|Probability distributions|" +
      "Inference|Calculus|Hyperbolic trig|Geometry|Custom colors|Number theory|Matrices|Complex|Advanced");
    const cats = O.panelCategories(), [trig, inverse, calculus] = cats;
    expect(cats.map((c) => `${c.id} ${c.heading}: ${c.entries.map((e) => e.label).join(" ")}`)).toEqual(["1 Trig: sin cos tan csc sec cot",
      "2 Inverse trig: sin⁻¹ cos⁻¹ tan⁻¹ csc⁻¹ sec⁻¹ cot⁻¹", "8 Calculus: exp ln log logₐ"]);
    expect(calculus.entries.map((e) => e.name).join(" ")).toBe("exp ln log log");
    expect(trig.entries[0]).toEqual({ name: "sin", label: "sin", spoken: "sine", actions: [{ op: "write", arg: "\\sin\\left(\\right)" }, { op: "keystroke", arg: "Left" }] });
    expect([inverse.entries[0].actions[0], calculus.entries[3].actions]).toEqual([{ op: "write", arg: "\\sin^{-1}\\left(\\right)" },
      [{ op: "cmd", arg: "\\log" }, { op: "cmd", arg: "_" }]]);
  });
});
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/latex/operator-names.test.ts` FAILS: `Failed to resolve import "./operator-names"`.
- [ ] **Step 3: Implement.** `OPERATOR_NAMES` in this order (K-4 category numbers; entries `name:phase:arity`, `v` = `"variadic"`, `1,2` = `[1, 2]`; phases from K-4 and appendix B; the five
  category-`null` operators come last with arity `[2]`):
```text
1  sin:1:1 cos:1:1 tan:1:1 csc:1:1 sec:1:1 cot:1:1 | 2  arcsin:1:1 arccos:1:1 arctan:1:1,2 arccsc:1:1 arcsec:1:1 arccot:1:1
3  mean:2:v median:2:v min:2:v max:2:v quartile:2:2 quantile:2:2 stdev:2:v stdevp:2:v var:2:v varp:2:v cov:3:2 covp:3:2 mad:2:v corr:3:2
   spearman:3:2 stats:3:1 count:2:v total:2:v
4  repeat:3:2 join:3:v sort:3:1,2 shuffle:3:1,2 unique:3:1 | 5  histogram:3:1,2 dotplot:3:1 boxplot:3:1
6  normaldist:3:0,1,2 tdist:3:1 chisqdist:3:1 uniformdist:3:0,1,2 binomialdist:3:2 poissondist:3:1 geodist:3:1 discretedist:3:1,2
   pdf:3:2 cdf:3:2,3 inversecdf:3:2 random:3:0,1,2,3
7  ztest:3:2,4 ttest:3:1,2 zproptest:3:2,4 chisqtest:3:v chisqgof:3:2 | 8  exp:1:1 ln:1:1 log:1:1,2
9  sinh:2:1 cosh:2:1 tanh:2:1 csch:2:1 sech:2:1 coth:2:1 arcsinh:2:1 arccosh:2:1 arctanh:2:1 arccsch:2:1 arcsech:2:1 arccoth:2:1
10 polygon:4:v distance:4:2 midpoint:4:2 | 11 rgb:4:3 hsv:4:3 okhsv:4:3 oklab:4:3 oklch:4:3
12 lcm:2:v gcd:2:v mod:2:2 ceil:2:1 floor:2:1 round:2:1,2 sign:2:1 nPr:2:2 nCr:2:2 | 13 det:4:1 trace:4:1 rref:4:1 rank:4:1 rows:4:1 columns:4:1 transpose:4:1
14 real:4:1 imag:4:1 conj:4:1 arg:4:1 | 15 tone:4:1,2 | -  with:4 for:2 and:4 or:4 of:1
```
  `panelCategories()` lists per category id, in order, the shipped names that have a panel presentation (in `OPERATOR_NAMES` order) and drops empty categories, so typed-only names such as
  `arcsinh` never appear. Phase 1 presentations: sin to cot labelled by name, spoken `sine`, `cosine`, `tangent`, `cosecant`, `secant`, `cotangent`, actions `write \<name>\left(\right)` then
  `keystroke Left`; arcsin to arccot labelled `sin⁻¹` to `cot⁻¹`, spoken `inverse sine` to `inverse cotangent`, writing `\<base>^{-1}\left(\right)` then `Left`; `exp` (`exponential`), `ln`
  (`natural log`) and `log` (`log`) like sin; a second `log` labelled `logₐ`, spoken `log base a`, with the two `cmd` actions. `isBuiltinName` is membership in the 104 names;
  `isShippedBuiltin(n)` is `phase <= SHIPPED_PHASE` for a known name, else `false`.
- [ ] **Step 4:** the Step 2 command PASSES (3 tests).
- [ ] **Step 5:** `git add src/lib/calculator-v2 && git commit -m "Add the calculator v2 operator-name allowlist (PR-12)"`

## Task 6: Normalizer and tokenizer (PR-3, PR-4)
**Files:** Create `core/latex/normalize.ts`, `core/latex/normalize.test.ts`, `core/latex/tokens.ts`, `core/latex/tokens.test.ts`. **Interfaces:** consumes `isBuiltinName`, `SourceSpan`,
`ParseError`; produces `normalizeLatex`, `tokenize`, `Token`, `SymbolChar` (section 1).
- [ ] **Step 1: Write the failing tests** (`normalize.test.ts`, then `tokens.test.ts`); only PR-3 and PR-4 titles lead with IDs (Task 8 owns PR-7, PR-8, Task 7 PR-10, Task 10 PR-38).
```ts
const N = normalizeLatex;
const CASES: [string, string][] = [["\\dfrac{1}{2}+\\tfrac{3}{4}", "\\frac{1}{2}+\\frac{3}{4}"],
  ["\\left(x\\right)\\cdot\\left[y\\right]+\\left\\{z\\right.", "(x)\\cdot[y]+\\{z"], ["\\left|x\\right|", "\\lvert x\\rvert "],
  ["\\displaystyle2\\,x\\;y\\:z\\!w\\ v\\quad u", "2xyzwv u"], ["2\\times3\\div4", "2\\cdot3/4"],
  ["a\\le b\\leq c\\leqslant d\\ge e\\geq f\\geqslant g\\lt h\\gt i", "a\\le b\\le c\\le d\\ge e\\ge f\\ge g< h> i"],
  ["\\operatorname{sin}x+\\mathrm{ln}y+\\text{of}+\\text{hello}", "\\operatorname{sin}x+\\operatorname{ln}y+\\operatorname{of}+\\text{hello}"],
  ["\\leftarrow\\timesx", "\\leftarrow\\timesx"]];
it("PR-3 normalizeLatex rewrites fractions, delimiters, spacing, operators and operator names, idempotently", () => {
  for (const [input, out] of CASES) expect([N(input), N(out)]).toEqual([out, out]);
});
it("PR-4 normalizeLatex maps the Unicode math characters, including all ten subscript digits, to LaTeX", () => {
  expect([N("x₁₂+y²³−3–2×4·5÷6"), N("2π+θ+τ"), N("x≤1≥0"), N("a₀₁₂₃₄₅₆₇₈₉")])
    .toEqual(["x_{12}+y^{23}-3-2\\cdot 4\\cdot 5/6", "2\\pi +\\theta +\\tau ", "x\\le 1\\ge 0", "a_{0123456789}"]);
});
it("normalizeLatex escapes raw percent and writes every degree sign as ^{\\circ}", () => {
  expect([N("44%+5\\%"), N("30°+40\\degree+50^\\circ")]).toEqual(["44\\%+5\\%", "30^{\\circ}+40^{\\circ}+50^{\\circ}"]);
});
// tokens.test.ts
const sp = (start: number, end: number) => ({ start, end });
const kinds = (s: string) => (tokenize(s) as Token[]).map((k) => (k.t === "digits" ? k.text : k.t));
it("tokenize joins digits across spaces and keeps at most one decimal point", () => {
  expect(tokenize("2 3+.5")).toEqual([{ t: "digits", text: "23", span: sp(0, 3) }, { t: "symbol", ch: "+", span: sp(3, 4) },
    { t: "digits", text: ".5", span: sp(4, 6) }, { t: "end", span: sp(6, 6) }]);
  expect([kinds("1.2.3"), (tokenize("ab") as Token[])[1]]).toEqual([["1.2", "symbol", "3", "end"], { t: "letter", ch: "b", span: sp(1, 2) }]);
});
it("PR-3 tokenize reads commands, allowlisted operator names and escaped symbols", () => {
  expect(tokenize("\\operatorname{sin}x\\%\\{")).toEqual([{ t: "command", name: "sin", span: sp(0, 18) }, { t: "letter", ch: "x", span: sp(18, 19) },
    { t: "symbol", ch: "%", span: sp(19, 21) }, { t: "command", name: "{", span: sp(21, 23) }, { t: "end", span: sp(23, 23) }]);
  expect(kinds("\\operatorname{}")).toEqual(["command", "open", "close", "end"]);
});
it("tokenize reports a character outside the grammar with its span", () => {
  expect([tokenize("x@y"), tokenize("[1;2]")]).toMatchObject([{ code: "syntax", span: sp(1, 2) }, { code: "unsupported", span: sp(2, 3) }]);
});
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/latex/normalize.test.ts src/lib/calculator-v2/core/latex/tokens.test.ts` FAILS: `Failed to resolve import "./normalize"`
  (normalize.test.ts) and `Failed to resolve import "./tokens"` (tokens.test.ts).
- [ ] **Step 3: Implement.** `normalizeLatex` in order: (1) one Unicode pass: `−` `–` to `-`; `×` `·` to `\cdot `; `÷` to `/`; `π` `θ` `τ` to `\pi ` `\theta ` `\tau `; `≤` `≥` to `\le ` `\ge `; a
  run of `²`/`³` to `^{…}`; a run of `₀`…`₉` to `_{…}`; `°` to `^{\circ}`. (2) A `%` not after `\` becomes `\%`. (3) Whole-command rewrites (a name ends at the first non-letter): `\dfrac`
  `\tfrac` to `\frac`; `\left|` to `\lvert `; `\right|` to `\rvert `; `\left.` `\right.` then `\left` `\right` removed; `\displaystyle` `\,` `\;` `\:` `\!` `\ ` `\quad` removed; `\times` to
  `\cdot`; `\div` to `/`; `\leq` `\leqslant` to `\le`; `\geq` `\geqslant` to `\ge`; `\lt` to `<`; `\gt` to `>`; `\degree` and `^\circ` to `^{\circ}`; `\operatorname{n}`, `\mathrm{n}`, `\text{n}`
  to `\operatorname{n}` when `isBuiltinName(n)`. `tokenize` follows G1.
- [ ] **Step 4:** the Step 2 command PASSES (6 tests).
- [ ] **Step 5:** `git add src/lib/calculator-v2 && git commit -m "Add the calculator v2 LaTeX normalizer and tokenizer (PR-3, PR-4)"`

## Task 7: Parser skeleton, tree helpers, literals and names (PR-10, PR-11, PR-14, PR-15; OI-27)
**Files:** Create `core/latex/limits.ts`, `core/latex/parser.ts`, `core/latex/atoms.ts`, `core/latex/index.ts`, `core/latex/ast.test.ts`; modify `core/latex/ast.ts`,
`core/corpus/cases/parse-literals.ts`, `core/corpus/corpus.test.ts` and (OI-27) `docs/superpowers/specs/calculator-v2/a-math-semantics.md`. **Interfaces:** `index.ts` exports the section 1
constants, `ParseOptions`, `ParseResult`, `parseLatex` and re-exports `normalizeLatex`, `toSExpr`, `treesEqual`, `countNodes` (Tasks 9 and 11 add `functionDefinitionHead`, `printLatex`).
_Internal_, `ParserState` being `{ tokens: Token[]; pos: number; depth: number; bars: ("raw" | "lvert")[]; readonly normalized: string; readonly options: ParseOptions }`:
```ts
// parser.ts
export class ParseFailure extends Error { readonly error: ParseError; constructor(error: ParseError); }
export function createParserState(tokens: Token[], normalized: string, options: ParseOptions): ParserState;
export function fail(code: ParseErrorCode, span: SourceSpan, detail: string): never; // throws ParseFailure
export function peek(state: ParserState, offset?: number): Token; export function take(state: ParserState): Token;
export function enter<T>(state: ParserState, opener: Token, body: () => T): T; // G13 depth
export function parseRow(state: ParserState): Node; export function parseSum(state: ParserState): Node; export function startsFactor(state: ParserState): boolean;
// atoms.ts (GREEK_IDENTIFIERS per G6; parseFactor is a built-in call (Task 9) or parsePostfix; takeSingleArgument per G4)
export const GREEK_IDENTIFIERS: ReadonlySet<string>; export function parseFactor(state: ParserState): Node;
export function parsePostfix(state: ParserState): Node; export function parseAtom(state: ParserState): Node; export function takeSingleArgument(state: ParserState): Node;
```
- [ ] **Step 1: Write the failing tests:** `ast.test.ts` (imports `countNodes`, `toSExpr`, `treesEqual` from `./index`, `type Node` from `./ast`); the case-file builders and `parse-literals`
  cases; the runner appended to `corpus.test.ts` (adds `parseLatex`, `toSExpr` from `../latex/index` and `casesFor` to the `./index` import). Each case file of this package (`FILE` is its name)
  declares only the builders it uses and imports only their types (`no-unused-vars` is an error): `t` and `x` in `parse-literals`, `parse-relations` and `parse-calls`; `t`, `x` and `v` (Task 8)
  in `parse-operators`; only `x` in `parse-errors`; only `p` in `printer` (Task 11); `t` and `q` in `sat-forms` (Task 12). The helper tests lead with no ID: Task 11 owns PR-37 and Task 10 PR-38.
```ts
const s = { start: 0, end: 0 }, x: Node = { kind: "id", name: "x", span: s }, n = (value: number): Node => ({ kind: "num", value, span: s });
const chain: Node = { kind: "rel", ops: ["<=", "<"], operands: [n(0), x, n(10)], span: s }, root: Node = { kind: "root", arg: x, index: n(3), span: s };
it("PR-40 toSExpr writes the corpus tree notation", () => {
  expect([chain, root, { kind: "neg", arg: n(0.5), span: s } as Node, { kind: "rel", ops: ["="], operands: [x, { kind: "const", name: "pi", span: s }], span: s } as Node,
    { kind: "call", name: "log", args: [x, { kind: "id", name: "b", span: s }], span: s } as Node].map(toSExpr)).toEqual(["(rel (<= <) (num 0) (id x) (num 10))",
    "(root (id x) (num 3))", "(neg (num 0.5))", "(rel = (id x) (const pi))", "(call log (id x) (id b))"]);
});
it("treesEqual ignores spans and compares every other field; countNodes counts every node", () => {
  expect([treesEqual(chain, { ...chain, span: { start: 3, end: 9 } }), treesEqual(chain, { ...chain, ops: ["<", "<"] }),
    treesEqual(root, { ...root, index: null })]).toEqual([true, false, false]);
  expect([countNodes(x), countNodes(root), countNodes(chain)]).toEqual([1, 3, 4]);
});
// cases/<FILE>.ts builders (a separate module, so this x is not the Node above); x needs `import type { CorpusCase, RowErrorCode } from "../types"`
const t = (n: number, rules: string[], latex: string, tree: string, rows?: string[]): CorpusCase =>
  ({ id: `${FILE}-${n}`, rules, input: { latex }, ...(rows ? { rows } : {}), tree });
const x = (n: number, rules: string[], latex: string, error: RowErrorCode): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, error });
// corpus.test.ts, appended
const RUNNER = "src/lib/calculator-v2/core/corpus/corpus.test.ts", latexOf = (c: CorpusCase) => (c.input as { latex: string }).latex;
describe("golden corpus parse runner", () => {
  it("PR-39 casesFor returns exactly the cases whose rules name the ID", () => {
    const cases = casesFor("PR-10");
    expect(cases.length >= 8 && cases.every((c) => c.rules.includes("PR-10")) && !casesFor("PR-1").includes(cases[0])).toBe(true);
  });
  for (const field of ["tree", "error"] as const)
    for (const c of CORPUS.filter((k) => runnerFor(k, field)?.file === RUNNER))
      it(`${c.rules.join(", ")} ${c.id} ${field}`, () => {
        const r = parseLatex(latexOf(c));
        if (field === "error") expect(r.ok ? "parsed" : r.error.code).toBe(c.error);
        else expect(r.ok ? toSExpr(r.tree) : `${r.error.code}: ${r.error.detail}`).toBe(c.tree);
      });
});
```
```text
PR-10: 1: 12 => (num 12) ;; 2: 0.5 => (num 0.5) ;; 3: .5 => (num 0.5) ;; 4: 5. => (num 5) ;; 5: 2 3 => (num 23) ;; 6: -5 => (neg (num 5))
PR-10: 7: 2e3 => (mul (mul (num 2) (const e)) (num 3)) ;; 8: 1.2.3 => !syntax ;; 34: 2\pi => (mul (num 2) (const pi))
PR-11: 9: A => (id A) ;; 10: a => (id a) ;; 11: a_{1} => (id a_{1}) ;; 12: a_1 => (id a_{1}) ;; 13: a_{01} => (id a_{01}) ;; 14: v_{max} => (id v_{max})
PR-11: 15: x_{12} => (id x_{12}) ;; 16: \alpha => (id \alpha) ;; 17: \alpha_{2} => (id \alpha_{2}) ;; 18: x_{1+2} => !syntax ;; 19: \Delta => !unsupported
PR-14: 20: x1 => (id x_{1}) ;; 21: a12 => (id a_{12}) ;; 22: 2x1 => (mul (num 2) (id x_{1})) ;; 23: x 1 => (mul (id x) (num 1)) ;; 24: x1.5 => (mul (id x) (num 1.5))
PR-15: 25: e => (const e) ;; 26: \pi => (const pi) ;; 27: \tau => (const tau) ;; 28: i => (id i) ;; 29: \theta => (id \theta) ;; 30: E => (id E)
PR-15: 31: e_{3} => (id e_{3}) ;; 32: 2e_{3} => (mul (num 2) (id e_{3}))
PR-15, PR-14: 33: e3 => (mul (const e) (num 3))
PR-39, PR-40, PR-41: 35: x_{1} => (id x_{1})
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/latex/ast.test.ts src/lib/calculator-v2/core/corpus/corpus.test.ts` FAILS: `Failed to resolve import "./index"` (ast.test.ts) and
  `Failed to resolve import "../latex/index"` (corpus.test.ts).
- [ ] **Step 3: Implement** the `ast.ts` helpers per section 1; `limits.ts` (`MAX_ROWS = 100`, `MAX_ROW_CHARACTERS = 2048`, `MAX_TREE_NODES = 2000`, `MAX_NESTING_DEPTH = 64`,
  `MAX_FUNCTION_PARAMS = 8`). `parseLatex`: normalize; blank input per G14; tokenize (a `ParseError` result is the error); `parseRow` on `createParserState`; a `ParseFailure` becomes
  `{ ok: false, error, normalized }`; never rethrow. Grammar so far: G2 with `+`, `-` and implicit multiplication, `parseRow` as sum then `end`, atoms per G6, other commands as atoms
  `unsupported`, other tokens `syntax`; values `Number(text)`. `startsFactor` is true exactly for a digits token, a letter or any command (so `2\pi` multiplies); Task 8 completes G3.
- [ ] **Step 4: Apply OI-27.** In PR-15 replace `Every other letter is an identifier. (Phase 1;` with the line below; in PR-36 insert `` `2e3` gives `2e_{3}` (T-4, PR-15), `` before
  `` `<=` gives `\le` ``. 05 adds the keystroke case to `keys.ts`, 04 the e₃ chip case on `2e_{3}`.
```markdown
Every other letter is an identifier. `e_{…}` with any subscript is an ordinary identifier distinct from the constant e, so typed `2e3` (T-4 gives `2e_{3}`) is 2·e₃ with an add-slider chip for e₃. (Phase 1;
```
- [ ] **Step 5:** the Step 2 command PASSES (every `parse-literals` case, 3 helper tests) and
  `grep -c "is 2·e₃ with an add-slider chip for e₃" docs/superpowers/specs/calculator-v2/a-math-semantics.md` prints `1`.
- [ ] **Step 6:** `git add src/lib/calculator-v2 docs/superpowers/specs && git commit -m "Parse calculator v2 numbers, names and constants (PR-10, PR-11, PR-14, PR-15, OI-27)"`

## Task 8: Operators, groups, fractions, roots, powers, postfix, bars, points and relations (PR-3, PR-4, PR-7, PR-8, PR-16 to PR-22, PR-27, PR-29)
**Files:** Modify `core/latex/parser.ts`, `core/latex/atoms.ts`; fill `core/corpus/cases/parse-operators.ts` and `core/corpus/cases/parse-relations.ts`. **Interfaces:** consumes Task 7's
internals; produces nothing new.
- [ ] **Step 1: Write the failing cases** (1 to 78 in `parse-operators.ts`, the `PR-29` lines in `parse-relations.ts`). Value cases 70 to 78 carry `display` and no `tree`, so `runnerFor` sends
  them to 04's `semantics.corpus.test.ts` (`01-interfaces.md` 2.2), which compares `formatValue(evaluateLatex(…))` from 04 Task 9 on, and this package's runner skips them. They pin what trees
  cannot: `pct` divides by 100 (PR-7), unary minus sits below `^` (PR-17), products group left to right (PR-18), τ is 2π (PR-15). They are this package's own cases for its own IDs,
  so no `00-index.md` 5.3 row is needed; a wrong value fails 04's gate. `parse-operators.ts` also declares:
```ts
const v = (n: number, rules: string[], latex: string, display: string, rows?: string[]): CorpusCase =>
  ({ id: `${FILE}-${n}`, rules, input: { latex }, ...(rows ? { rows } : {}), display });
```
```text
PR-3: 1: \dfrac{1}{2} => (div (num 1) (num 2)) ;; 2: \tfrac{1}{2} => (div (num 1) (num 2)) ;; 3: 2\times3 => (mul (num 2) (num 3))
PR-3: 4: 6\div2 => (div (num 6) (num 2)) ;; 5: \left(x+1\right) => (add (id x) (num 1))
PR-4: 6: x² => (pow (id x) (num 2)) ;; 7: 3−2 => (sub (num 3) (num 2)) ;; 8: 2×3 => (mul (num 2) (num 3)) ;; 9: x₁ => (id x_{1})
PR-7: 10: 44\% => (pct (num 44)) ;; 11: 44% => (pct (num 44)) ;; 12: p\%\operatorname{of}q => (mul (pct (id p)) (id q)) ;; 14: \operatorname{of}3 => !syntax
PR-7: 13: 25\%\operatorname{of}80 => (mul (pct (num 25)) (num 80))
PR-8: 15: 30^{\circ} => (deg (num 30)) ;; 16: 30^\circ => (deg (num 30)) ;; 17: 30° => (deg (num 30)) ;; 18: 30\degree => (deg (num 30))
PR-16: 19: 1+2\cdot3 => (add (num 1) (mul (num 2) (num 3))) ;; 20: 2\cdot3^{2} => (mul (num 2) (pow (num 3) (num 2))) ;; 23: 2*3 => (mul (num 2) (num 3))
PR-16: 21: 1-2-3 => (sub (sub (num 1) (num 2)) (num 3)) ;; 22: 6/2\cdot3 => (mul (div (num 6) (num 2)) (num 3)) ;; 25: -2x => (mul (neg (num 2)) (id x))
PR-16: 24: 2\cdot-3 => (mul (num 2) (neg (num 3))) ;; 49: \frac12 => (div (num 1) (num 2)) ;; 50: {x+1}2 => (mul (add (id x) (num 1)) (num 2))
PR-17: 26: -x^{2} => (neg (pow (id x) (num 2))) ;; 27: -2^{2} => (neg (pow (num 2) (num 2))) ;; 28: (-2)^{2} => (pow (neg (num 2)) (num 2))
PR-18: 29: 6\div2(1+2) => (mul (div (num 6) (num 2)) (add (num 1) (num 2))) ;; 30: 1/2x => (mul (div (num 1) (num 2)) (id x))
PR-18: 31: \frac{1}{2x} => (div (num 1) (mul (num 2) (id x))) ;; 32: 6/2/3 => (div (div (num 6) (num 2)) (num 3))
PR-19: 33: x^{2} => (pow (id x) (num 2)) ;; 34: x^23 => (mul (pow (id x) (num 2)) (num 3)) ;; 35: a^{b^{c}} => (pow (id a) (pow (id b) (id c)))
PR-19: 36: a^b^c => !syntax ;; 37: a^{b}^{c} => !syntax ;; 38: x^{-1} => (pow (id x) (neg (num 1))) ;; 39: 2^x => (pow (num 2) (id x)) ;; 40: x^\pi => (pow (id x) (const pi))
PR-20: 41: x^{2}\% => (pct (pow (id x) (num 2))) ;; 42: 2x\% => (mul (num 2) (pct (id x))) ;; 43: x^{2}^{\circ} => (deg (pow (id x) (num 2))) ;; 44: 2x^{\circ} => (mul (num 2) (deg (id x)))
PR-27: 45: \sqrt{x} => (root (id x)) ;; 46: \sqrt[3]{x} => (root (id x) (num 3)) ;; 47: \sqrt2x => (mul (root (num 2)) (id x)) ;; 48: \sqrt(x+1) => (root (add (id x) (num 1)))
PR-21: 51: \left|x\right| => (abs (id x)) ;; 52: |x| => (abs (id x)) ;; 53: |x|-|y| => (sub (abs (id x)) (abs (id y))) ;; 58: |x => !syntax
PR-21: 54: ||x|-1| => (abs (sub (abs (id x)) (num 1))) ;; 55: 2|x-3| => (mul (num 2) (abs (sub (id x) (num 3)))) ;; 59: \left|x| => !syntax
PR-21: 56: |x||y| => (mul (abs (id x)) (abs (id y))) ;; 57: \left|x-\left|y\right|\right| => (abs (sub (id x) (abs (id y)))) ;; 67: \left|x|y|\right| => !syntax
PR-22: 60: (1,2) => (point (num 1) (num 2)) ;; 61: (x) => (id x) ;; 62: (a+1,b) => (point (add (id a) (num 1)) (id b)) ;; 64: (1,2,3) => !point-arity
PR-22: 63: \left(1,2\right) => (point (num 1) (num 2)) ;; 65: 1,2 => !syntax ;; 66: (,) => !syntax ;; 68: {1,2} => !syntax ;; 69: {1,2,3} => !syntax
PR-7: 70: 44\% => "0.44" ;; 71: 25\%\operatorname{of}80 => "20" ;; 72: p\%\operatorname{of}q [rows: p=25 | q=80] => "20"
PR-17: 73: -2^{2} => "-4" ;; 74: (-2)^{2} => "4"
PR-18: 75: 6\div2(1+2) => "9" ;; 76: 1/2a [rows: a=4] => "2"
PR-15: 77: \tau => "6.28318530718" ;; 78: e => "2.71828182846"
PR-29: 1: x<y => (rel < (id x) (id y)) ;; 2: x\ge3 => (rel >= (id x) (num 3)) ;; 3: x\le3 => (rel <= (id x) (num 3)) ;; 6: x<=3 => (rel <= (id x) (num 3))
PR-29: 7: 0\le x<10 => (rel (<= <) (num 0) (id x) (num 10)) ;; 8: 3>x>1 => (rel (> >) (num 3) (id x) (num 1)) ;; 9: y=2x => (rel = (id y) (mul (num 2) (id x)))
PR-29: 10: a<x>b => !relation-chain ;; 11: x=y<3 ;; 12: x=y=3 ;; 14: =3 => !syntax ;; 15: x= => !syntax ;; 16: (x<1) => !syntax
PR-29, PR-3: 4: x\leq3 => (rel <= (id x) (num 3)) ;; 13: x\gt1 => (rel > (id x) (num 1))
PR-29, PR-4: 5: x≥3 => (rel >= (id x) (num 3))
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/corpus/corpus.test.ts -t "parse-operators|parse-relations"` FAILS (for example `parse-operators-19` receives `unsupported: …` for
  `1+2\cdot3`: Task 7's `startsFactor` accepts `\cdot`, and `parseAtom` rejects it as an atom).
- [ ] **Step 3: Implement** G2's mulops, G3, G4, G5, G9 (not the letter-run `sqrt`), G10 in full (`[` and `\{` included), G11 (the bar stack in `ParserState.bars`, read by `startsFactor`), G12
  (`parseRow` becomes `rel` then `end`), `\frac` with two G4 arguments and the postfix loop (`^`, `\%`, `^{\circ}`); `!`, `'`, `.` and `~` end the loop (Task 10).
- [ ] **Step 4:** `npx vitest run src/lib/calculator-v2/core/corpus/corpus.test.ts` PASSES.
- [ ] **Step 5:** `git commit -am "Parse calculator v2 operators, roots, powers, postfix signs, bars, points and relations (PR-3, PR-4, PR-7, PR-8, PR-16 to PR-22, PR-27, PR-29)"`

## Task 9: Letter runs, built-in and user calls (PR-12, PR-13, PR-23 to PR-27)
**Files:** Create `core/latex/calls.ts`, `core/latex/letters.ts`, `core/latex/letters.test.ts`, `core/latex/function-head.ts`, `core/latex/function-head.test.ts`; modify `core/latex/atoms.ts`,
`core/latex/index.ts`, `core/corpus/cases/parse-calls.ts`, `core/corpus/corpus.test.ts`. **Interfaces:** consumes Task 5's allowlist and Task 7's internals. Produces
`functionDefinitionHead(input: string): { name: string; params: string[] } | null` (re-exported; 04's RC-4 pre-scan builds `ParseOptions.userFunctions` with it). _Internal_:
`splitLetterRuns(tokens: Token[]): Token[]` (G7); `parseBuiltinCall(state: ParserState, name: Extract<Token, { t: "command" }>): Node` (G8); `parseArgumentList(state: ParserState): Node[]` (a `(`
group of one or more comma-separated sums).
- [ ] **Step 1: Write the failing tests** (`function-head.test.ts` importing `./function-head`; `letters.test.ts` importing `./letters`, then `tokenize`, `type Token` from `./tokens`; the runner
  change, importing `functionDefinitionHead` from `../latex/function-head`; the `FILE = "parse-calls"` cases):
```ts
it("PR-23 functionDefinitionHead finds f(p1,…,pn)= heads for single letters", () => {
  expect(["f(x)=x^{2}", "g(a,b)=a+b", "P(t)=500(1.03)^{t}", "f_{1}(x)=x", "f\\left(x\\right)=x"].map(functionDefinitionHead)).toEqual([
    { name: "f", params: ["x"] }, { name: "g", params: ["a", "b"] }, { name: "P", params: ["t"] }, { name: "f_{1}", params: ["x"] }, { name: "f", params: ["x"] }]);
  expect(["y=2x", "f(2)=3", "f(x)", "f(x)<3", "a(x-h)^{2}+k=y", "f(xy)=1", "ln(x)=2", "", "\\alpha(x)=x", "f(\\theta)=\\theta"]
    .map(functionDefinitionHead)).toEqual(Array(10).fill(null)); // the last two: G15, Latin-only heads
});
it("PR-13 splitLetterRuns takes the longest name, breaks runs at whitespace and leaves subscripts and members alone", () => {
  const split = (s: string) => splitLetterRuns(tokenize(s) as Token[]).map((k) => (k.t === "command" ? `\\${k.name}` : k.t === "letter" ? k.ch : k.t)).join(" ");
  expect(["arcsinx", "2pix", "pleft", "si n", "v_{max}"].map(split))
    .toEqual(["\\arcsin x end", "digits \\pi x end", "p l e f t end", "s i n end", "v symbol open m a x close end"]);
  expect(splitLetterRuns(tokenize("sinx") as Token[])[0]).toEqual({ t: "command", name: "sin", span: { start: 0, end: 3 } });
});
// corpus.test.ts: the runner now calls parseLatex(latexOf(c), { userFunctions: userFunctionsFor(c) })
const userFunctionsFor = (c: CorpusCase) => new Set([...(c.rows ?? []), latexOf(c)].flatMap((row) => functionDefinitionHead(row)?.name ?? []));
```
```text
PR-13: 1: mx => (mul (id m) (id x)) ;; 2: sinx => (call sin (id x)) ;; 3: 2pix => (mul (mul (num 2) (const pi)) (id x)) ;; 4: lnx => (call ln (id x))
PR-13: 5: arcsinx => (call arcsin (id x)) ;; 6: costheta => (call cos (id \theta)) ;; 7: taux => (mul (const tau) (id x)) ;; 8: xy => (mul (id x) (id y))
PR-13: 11: sqrtx => (root (id x)) ;; 12: sinhx => !unsupported
PR-12, PR-13: 9: 3p+4=19 => (rel = (add (mul (num 3) (id p)) (num 4)) (num 19)) ;; 10: pleft => (mul (mul (mul (mul (id p) (id l)) (const e)) (id f)) (id t))
PR-23: 13: f(2) => (mul (id f) (num 2)) ;; 14: f(2) [rows: f(x)=x^{2}] => (call f (num 2)) ;; 19: \sin(x) => (call sin (id x))
PR-23: 15: a(x-h)^{2}+k => (add (mul (id a) (pow (sub (id x) (id h)) (num 2))) (id k)) ;; 16: f(x)=x^{2} => (rel = (call f (id x)) (pow (id x) (num 2)))
PR-23: 17: f_{1}(3) [rows: f_{1}(t)=t] => (call f_{1} (num 3)) ;; 18: g(1,2) [rows: g(a,b)=a+b] => (call g (num 1) (num 2))
PR-24: 20: \sin2x => (call sin (mul (num 2) (id x))) ;; 21: \sin x+1 => (add (call sin (id x)) (num 1)) ;; 23: \ln x^{2} => (call ln (pow (id x) (num 2)))
PR-24: 22: \sin x\cos x => (mul (call sin (id x)) (call cos (id x))) ;; 24: \sin2\pi x => (call sin (mul (mul (num 2) (const pi)) (id x)))
PR-24: 25: \sin-x => (call sin (neg (id x))) ;; 26: \sin x\cdot2 => (mul (call sin (id x)) (num 2)) ;; 27: \sin x/2 => (div (call sin (id x)) (num 2))
PR-24: 28: 2\sin x => (mul (num 2) (call sin (id x))) ;; 29: \sin\cos x => (call sin (call cos (id x))) ;; 30: \sin => !syntax
PR-24: 31: \sin\frac{x}{2} => (call sin (div (id x) (num 2))) ;; 52: \sin|x| => (call sin (abs (id x))) ;; 53: \sin\sqrt{x} => (call sin (root (id x)))
PR-25: 32: \sin(x)y => (mul (call sin (id x)) (id y)) ;; 33: \sin(x)^{2} => (pow (call sin (id x)) (num 2)) ;; 34: \sin\left(x\right) => (call sin (id x))
PR-25: 35: \arctan(1,2) => (call arctan (num 1) (num 2)) ;; 36: \operatorname{arccot}(x) => (call arccot (id x))
PR-26: 37: \sin^{2}x => (pow (call sin (id x)) (num 2)) ;; 38: \ln^{2}x => (pow (call ln (id x)) (num 2)) ;; 39: \sin^{-1}x => (call arcsin (id x))
PR-26: 40: \cos^{-1}(0.5) => (call arccos (num 0.5)) ;; 41: \cot^{-1}x => (call arccot (id x)) ;; 42: \ln^{-1}x => (pow (call ln (id x)) (neg (num 1)))
PR-26: 43: \sin^{2}(x) => (pow (call sin (id x)) (num 2))
PR-27: 44: \log x => (call log (id x)) ;; 45: \log_{2}8 => (call log (num 8) (num 2)) ;; 46: \log_28 => (call log (num 8) (num 2)) ;; 49: \ln x => (call ln (id x))
PR-27: 47: \log_{b}x => (call log (id x) (id b)) ;; 48: \log_{2}(8) => (call log (num 8) (num 2)) ;; 50: \exp x => (call exp (id x)) ;; 51: cbrtx => (root (id x) (num 3))
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/latex/function-head.test.ts src/lib/calculator-v2/core/latex/letters.test.ts src/lib/calculator-v2/core/corpus/corpus.test.ts` FAILS:
  `Failed to resolve import "./function-head"` (function-head.test.ts), `Failed to resolve import "./letters"` (letters.test.ts) and `Failed to resolve import "../latex/function-head"`
  (corpus.test.ts).
- [ ] **Step 3: Implement.** `splitLetterRuns` (G7) runs in `parseLatex` between `tokenize` and `createParserState`; `parseFactor` calls `parseBuiltinCall` on a built-in command (G8); an
  identifier in `options.userFunctions` followed by `(` becomes a `call` over `parseArgumentList`. `functionDefinitionHead` tokenizes `normalizeLatex(input)` (null on a tokenizer error) and
  matches a Latin letter, an optional subscript (`_` with one letter or digit, or a braced run of them), `(`, Latin `letter` tokens each followed by `,` or `)`, `)` and the symbol `=` (G15: a
  Greek command as name or parameter gives null); the name uses G6's identifier format. Case 12 leads with PR-13 alone: Task 10 owns PR-9.
- [ ] **Step 4:** the Step 2 command PASSES.
- [ ] **Step 5:** `git add src/lib/calculator-v2 && git commit -m "Parse calculator v2 letter runs and function calls (PR-13, PR-23 to PR-27)"`

## Task 10: Parse never throws: unsupported notation, limits, half-typed input (PR-9, PR-38)
**Files:** Create `core/latex/parse.test.ts`; modify `core/latex/parser.ts`, `core/latex/atoms.ts`, `core/latex/calls.ts`, `core/latex/index.ts`; fill `core/corpus/cases/parse-errors.ts`.
**Interfaces:** consumes `parseLatex`, `countNodes`, `isParseErrorCode`, `MAX_TREE_NODES`, `MAX_NESTING_DEPTH`; produces nothing new.
- [ ] **Step 1: Write the failing tests** (`parse.test.ts`, whose first test is Review Focus item 1, imports `parseLatex`, `countNodes`, `MAX_TREE_NODES`, `MAX_NESTING_DEPTH` and
  `type ParseResult` from `./index` and `isParseErrorCode` from `./errors`; then the `FILE = "parse-errors"` cases: the list below, then case 51, NM-42's counted case):
```ts
const code = (s: string) => { const r = parseLatex(s); return r.ok ? "ok" : r.error.code; };
const spanOf = (s: string) => { const r = parseLatex(s); return r.ok ? null : [r.error.code, r.error.span.start, r.error.span.end]; };
const inRange = (r: ParseResult) => r.ok || (r.error.span.start >= 0 && r.error.span.start <= r.error.span.end && r.error.span.end <= r.normalized.length);
describe("parse never throws", () => {
  it("PR-38 half-typed MathQuill structures return syntax errors", () => {
    for (const input of ["\\frac{}{}", "x^{}", "\\sqrt{}", "2+", "\\left(", "\\operatorname{}", "="]) expect([code(input), inRange(parseLatex(input))]).toEqual(["syntax", true]);
  });
  it("PR-38 errors carry their code and the span of the offending text", () => {
    expect(["x\\pm1", "2+", "(1,2,3)", "a<x>b", "  ", "\\left|x|y|\\right|"].map(spanOf)).toEqual([["unsupported", 1, 4], ["syntax", 2, 2],
      ["point-arity", 0, 7], ["relation-chain", 3, 4], ["syntax", 0, 0], ["syntax", 8, 9]]);
  });
  it("PR-38 the node and depth limits give too-many-nodes and too-deep", () => {
    expect([MAX_TREE_NODES, MAX_NESTING_DEPTH, spanOf("(".repeat(65) + "x" + ")".repeat(65))]).toEqual([2000, 64, ["too-deep", 64, 65]]);
    expect(["x+".repeat(999) + "x", "x+".repeat(1000) + "x", "-".repeat(5000) + "x", "(".repeat(64) + "x" + ")".repeat(64), "\\frac{".repeat(5000)].map(code))
      .toEqual(["ok", "too-many-nodes", "too-many-nodes", "ok", "too-deep"]);
    expect([64, 65].map((k) => code("x^{".repeat(k) + "1" + "}".repeat(k)))).toEqual(["ok", "too-deep"]);
  });
  it("PR-38 2,000 seeded random fragment strings never throw and keep spans in range", () => {
    const parts = "x 2 . + - ^ _ { } ( ) [ | \\frac \\sqrt \\left( \\right) \\sin \\log = < \\le , \\% ! e \\pi \\operatorname{ \\cdot f a_ \\lvert \\rvert ° ²".split(" ").concat(" ");
    let seed = 20261016;
    const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    for (let i = 0; i < 2000; i++) {
      let input = "";
      for (let j = 1 + Math.floor(next() * 12); j > 0; j--) input += parts[Math.floor(next() * parts.length)];
      const r = parseLatex(input, { userFunctions: new Set(["f"]) });
      expect(inRange(r) && (r.ok ? countNodes(r.tree) <= 2000 : isParseErrorCode(r.error.code)), input).toBe(true);
    }
  });
});
```
```text
PR-9: 1: \pm1 => !unsupported ;; 2: x\mp1 ;; 3: x\ne3 ;; 4: x\neq3 ;; 5: x\approx3 ;; 6: \infty ;; 7: \text{hello} ;; 8: \begin{matrix}1\end{matrix} ;; 9: y\sim x
PR-9: 10: y~x => !unsupported ;; 11: 3! ;; 12: x^{2}! ;; 13: 2x! ;; 14: -3! ;; 15: 3!^{2} ;; 16: T.score ;; 17: [1,2] ;; 18: \{x>0:1\} ;; 19: y=x^{2}\{x>0\}
PR-9: 20: \sum_{n=1}^{3}n => !unsupported ;; 21: \prod_{n=1}^{3}n ;; 22: \int_{0}^{1}xdx ;; 23: \frac{d}{dx}x^{2} ;; 24: f'(x) ;; 25: x\operatorname{with}x=1
PR-9: 26: x>0\operatorname{and}y>0 => !unsupported ;; 27: x>0\operatorname{or}y>0 ;; 28: \operatorname{mean}(1,2) ;; 29: mean(1,2) ;; 30: \sinh x ;; 31: \cosh^{-1}x
PR-9: 32: \operatorname{foo}(x) => !unsupported ;; 33: nthrootx ;; 34: infinity ;; 52: x^\infty ;; 53: [1...5] ;; 54: x\operatorname{for}
PR-11: 55: \omicron => !unsupported
PR-38: 35: \frac{}{} => !syntax ;; 36: x^{} ;; 37: \sqrt{} ;; 38: 2+ ;; 39: \left( ;; 40: \operatorname{} ;; 41: = ;; 42: ) ;; 43: (x ;; 44: x) ;; 45: \frac{1}
PR-38: 46: x@y => !syntax ;; 47: (empty) ;; 48: x_{} ;; 49: \text{} ;; 50: \sqrt[]{x}
```
  Case 51 follows them as the TS line ``x(51, ["NM-42", "PR-38"], `-${Array(500).fill("xy").join("+")}=2x`, "too-many-nodes")`` (2,004 nodes, 1,503 characters). Cases 11 to 15
  assert Phase 1's `unsupported` for `!` (PR-20's `!` cases join with NM-15 in Phase 2); case 31 becomes `(call arccosh (id x))` under PR-26 when FN-68 ships.
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/latex/parse.test.ts src/lib/calculator-v2/core/corpus/corpus.test.ts -t "PR-9|PR-38"` FAILS: at least the depth test, the first test
  (`\operatorname{}` is still `unsupported`) and `parse-errors` cases 10 to 16, 23, 24, 40, 49 and 51 (no node limit yet; cases 17 to 19 and 52 to 55 already pass: Tasks 7 to 9 implemented
  G4, G6, G8 and G10's `[` and `\{`).
- [ ] **Step 3: Implement** the `MAX_NESTING_DEPTH` check in `enter`, G13's node, `RangeError` and internal-error rules, and the PR-9 detections still missing: `!`, `'`, `~` in postfix or
  operator position; `.` after an `id` or `call` (member access; elsewhere `syntax`); `\frac` whose numerator is the letter `d` and denominator `d` then one letter; `\text`, `\mathrm`,
  `\operatorname` with an empty group `syntax` (G15), with content `unsupported`. Nothing calls `eval`, `new Function` or string `setTimeout` (AR-44).
- [ ] **Step 4:** `npx vitest run src/lib/calculator-v2/core` PASSES.
- [ ] **Step 5:** `git add src/lib/calculator-v2 && git commit -m "Report unsupported calculator v2 notation and parse limits without throwing (PR-9, PR-38)"`

## Task 11: Printer (PR-37)
**Files:** Create `core/latex/printer.ts`, `core/latex/printer.test.ts`; modify `core/latex/index.ts`, `core/corpus/cases/printer.ts`, `core/corpus/corpus.test.ts` (the runner's fields become
`["tree", "latex", "error"]`, `printLatex` imported from `../latex/printer`; a `latex` case runs `` expect(r.ok ? printLatex(r.tree) : `${r.error.code}: ${r.error.detail}`).toBe(c.latex) ``).
**Interfaces:** consumes `parseLatex`, `treesEqual`, `functionDefinitionHead`, `CORPUS`; produces `printLatex(tree: Node): string` (re-exported by `index.ts`; 12-transfer-core's TR-35 check).
- [ ] **Step 1: Write the failing tests** (`printer.test.ts` imports `printLatex` from `./printer`; `parseLatex`, `treesEqual` and `functionDefinitionHead` from `./index`; `CORPUS` from
  `../corpus/index`; `type CorpusCase` from `../corpus/types`; then the `FILE = "printer"` cases: `n: latex => printed`, each `p(n, latex, printed, rows?)`):
```ts
const latexOf = (c: CorpusCase) => (c.input as { latex: string }).latex;
const optionsFor = (c: CorpusCase) => ({ userFunctions: new Set([...(c.rows ?? []), latexOf(c)].flatMap((r) => functionDefinitionHead(r)?.name ?? [])) });
it("PR-37 printing any parsed corpus tree and parsing it again gives the same tree", () => {
  let checked = 0;
  for (const c of CORPUS.filter((k) => "latex" in k.input)) {
    const first = parseLatex(latexOf(c), optionsFor(c));
    if (!first.ok) continue;
    const printed = printLatex(first.tree), again = parseLatex(printed, optionsFor(c));
    expect(again.ok && treesEqual(again.tree, first.tree) && printLatex(again.tree) === printed, `${c.id}: ${printed}`).toBe(true);
    checked++;
  }
  const big = parseLatex("1" + "0".repeat(400));
  expect([checked > 150, big.ok && printLatex(big.tree)]).toEqual([true, "1" + "0".repeat(309)]);
});
// cases/printer.ts builder; the expected field is latex
const p = (n: number, latex: string, printed: string, rows?: string[]): CorpusCase =>
  ({ id: `${FILE}-${n}`, rules: ["PR-37"], input: { latex }, ...(rows ? { rows } : {}), latex: printed });
```
```text
PR-37: 1: y=mx+b => y=m\cdot x+b ;; 2: \dfrac{1}{2} => \frac{1}{2} ;; 3: 2x => 2x ;; 4: -x^{2} => -x^{2} ;; 5: \sin2x => \sin\left(2x\right)
PR-37: 6: \sin^{2}x => \sin\left(x\right)^{2} ;; 7: \log_{2}8 => \log_{2}\left(8\right) ;; 8: |x|-|y| => \left|x\right|-\left|y\right| ;; 9: (1,2) => \left(1,2\right)
PR-37: 10: 0\le x<10 => 0\le x<10 ;; 11: a-(b-c) => a-\left(b-c\right) ;; 12: (a+b)c => \left(a+b\right)\cdot c ;; 13: 1/2x => \frac{1}{2}\cdot x
PR-37: 14: 2\pi x => 2\pi\cdot x ;; 15: x^{2}\% => x^{2}\% ;; 16: 30° => 30^{\circ} ;; 17: e_{3} => e_{3} ;; 18: \alpha x => \alpha\cdot x ;; 19: 0.0000001 => 0.0000001
PR-37: 20: \operatorname{arccot}(x) => \operatorname{arccot}\left(x\right) ;; 21: -2x => -2\cdot x ;; 22: -(2x) => -\left(2x\right) ;; 23: x-(-y) => x--y
PR-37: 24: (x^{2})^{3} => \left(x^{2}\right)^{3} ;; 25: f(2) [rows: f(x)=x^{2}] => f\left(2\right) ;; 26: \sqrt[3]{x} => \sqrt[3]{x} ;; 27: 2(x+1) => 2\left(x+1\right)
PR-37: 28: \frac{a}{b}^{2} => \left(\frac{a}{b}\right)^{2} ;; 29: \sin(x)y => \sin\left(x\right)\cdot y ;; 30: x\pi => x\cdot\pi ;; 31: 2\cdot3 => 2\cdot3
PR-37: 32: \tan^{-1}x => \arctan\left(x\right) ;; 33: \ln^{-1}x => \ln\left(x\right)^{-1} ;; 34: x\ge-y => x\ge-y ;; 35: 1000000000000000000000 => 1000000000000000000000
```
  Last, PR-2's counted case 36 (`p` fixes PR-37): ``{ id: `${FILE}-36`, rules: ["PR-2"], input: { latex: "y=\\sqrt{x}+\\frac{3}{4}" }, tree: "(rel = (id y) (add (root (id x)) (div (num 3) (num 4))))" }``.
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/latex/printer.test.ts src/lib/calculator-v2/core/corpus/corpus.test.ts -t "PR-37"` FAILS: `Failed to resolve import "./printer"`
  (printer.test.ts) and `Failed to resolve import "../latex/printer"` (corpus.test.ts).
- [ ] **Step 3: Implement** `printLatex` with these canonical forms ("wrap" means `\left(…\right)`):
```text
num      plainDecimal (below); a non-finite value prints "1" and 309 zeros  |  id, const as stored (e, \pi, \tau)  |  div \frac{A}{B}
add/sub  L+R, L-R; wrap R when add or sub  |  neg -A; wrap A when add, sub, mul or neg
mul      wrap L when add/sub, R when add/sub/mul; juxtapose only when L is num and printed R starts with a Latin letter or "\", else \cdot
pow      B^{E}; wrap B unless num, id, const, call, abs, root, pct, deg, fact or point  |  pct/deg/fact A\%, A^{\circ}, A!; wrap A when add, sub, mul, neg or rel
abs, root, point, rel   \left|A\right|; \sqrt{A} or \sqrt[N]{A}; \left(A,B\right); operands joined by = < > \le \ge
call     \name for sin cos tan csc sec cot arcsin arccos arctan sinh cosh tanh coth exp ln log arg det gcd max min, \operatorname{name} for other
         built-ins, the bare name for user functions; then \left(args joined by ","\right); log with two args is \log_{B}\left(X\right)
join     one space only where a command name would run into a following Latin letter (\pi x)
```
  _Internal_ (`printer.ts`): `function plainDecimal(v: number): string` is `String(v)` with any exponent expanded into positional digits, no rounding (cases 19 and 35 pin both signs).
- [ ] **Step 4:** `npx vitest run src/lib/calculator-v2/core` PASSES.
- [ ] **Step 5:** `git add src/lib/calculator-v2 && git commit -m "Print calculator v2 trees as canonical MathQuill LaTeX (PR-37)"`

## Task 12: SAT forms (PR-42)
**Files:** Fill `core/corpus/cases/sat-forms.ts` (`FILE = "sat-forms"`; `t`, and `q`, which differs only in `input: { question }`); modify `core/corpus/corpus.test.ts`. **Interfaces:** produces
case ids `sat-forms-1` to `sat-forms-38` for 04 (kinds), 07 (`from-analysis.test.ts`) and 12 (TR- outcomes, PR-44). The systems carry their partner row: 13 (two linear equations), 14
(linear–quadratic) and 22 (inequalities).
- [ ] **Step 1: Write the failing test**, appended to `corpus.test.ts` (it reuses `CORPUS_FILES`, `parseLatex`, `latexOf` and `userFunctionsFor`):
```ts
it("PR-42 sat-forms holds cases 1 to 38 and every typed SAT form parses", () => {
  const cases = CORPUS_FILES["sat-forms"], typed = cases.filter((c) => "latex" in c.input);
  expect([new Set(cases.map((c) => c.id)), typed.length]).toEqual([new Set(Array.from({ length: 38 }, (_, k) => `sat-forms-${k + 1}`)), 35]);
  for (const c of typed) expect(parseLatex(latexOf(c), { userFunctions: userFunctionsFor(c) }).ok, c.id).toBe(true);
});
```
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/core/corpus/corpus.test.ts -t "PR-42"` FAILS: the section 5.1 scaffold holds no cases, so the id set is empty and `typed.length` is 0.
- [ ] **Step 3: Write the cases** (rules `["PR-42"]`). Entries 35 to 37 (`question:`) use `q`: the question-dialect mixed number, percent and degree, compared by 12-transfer-core's runner from
  wave 6; 32 to 34 are their typed twins, compared now.
```text
PR-42: 1: y=2x+3 => (rel = (id y) (add (mul (num 2) (id x)) (num 3))) ;; 2: y-1=2(x+3) => (rel = (sub (id y) (num 1)) (mul (num 2) (add (id x) (num 3))))
PR-42: 3: 2x+3y=6 => (rel = (add (mul (num 2) (id x)) (mul (num 3) (id y))) (num 6)) ;; 13: y=x+2 [rows: y=2x+3] => (rel = (id y) (add (id x) (num 2)))
PR-42: 4: y=2(x-3)^{2}+1 => (rel = (id y) (add (mul (num 2) (pow (sub (id x) (num 3)) (num 2))) (num 1)))
PR-42: 14: y=x^{2} [rows: y=x+2] => (rel = (id y) (pow (id x) (num 2)))
PR-42: 5: y=(x-1)(x+3) => (rel = (id y) (mul (sub (id x) (num 1)) (add (id x) (num 3)))) ;; 12: y=-x+4 => (rel = (id y) (add (neg (id x)) (num 4)))
PR-42: 6: y=x^{2}+2x-3 => (rel = (id y) (sub (add (pow (id x) (num 2)) (mul (num 2) (id x))) (num 3)))
PR-42: 7: P(t)=500(1.03)^{t} => (rel = (call P (id t)) (mul (num 500) (pow (num 1.03) (id t)))) ;; 8: y=(1.20)^{x/4} => (rel = (id y) (pow (num 1.2) (div (id x) (num 4))))
PR-42: 9: y=100(0.95)^{x} => (rel = (id y) (mul (num 100) (pow (num 0.95) (id x)))) ;; 10: f(x)=3x-2 => (rel = (call f (id x)) (sub (mul (num 3) (id x)) (num 2)))
PR-42: 11: f(4) [rows: f(x)=3x-2] => (call f (num 4)) ;; 16: x^{2}+y^{2}=25 => (rel = (add (pow (id x) (num 2)) (pow (id y) (num 2))) (num 25))
PR-42: 15: (x-2)^{2}+(y+1)^{2}=9 => (rel = (add (pow (sub (id x) (num 2)) (num 2)) (pow (add (id y) (num 1)) (num 2))) (num 9))
PR-42: 17: y=\left|x-3\right| => (rel = (id y) (abs (sub (id x) (num 3)))) ;; 18: y=\sqrt{x+4} => (rel = (id y) (root (add (id x) (num 4))))
PR-42: 19: y=\frac{1}{x-2} => (rel = (id y) (div (num 1) (sub (id x) (num 2)))) ;; 21: y>2x+1 => (rel > (id y) (add (mul (num 2) (id x)) (num 1)))
PR-42: 20: y=\frac{x^{2}-4}{x-2} => (rel = (id y) (div (sub (pow (id x) (num 2)) (num 4)) (sub (id x) (num 2))))
PR-42: 22: y\le2x+1 [rows: y<-2x+4] => (rel <= (id y) (add (mul (num 2) (id x)) (num 1))) ;; 23: -2<x\le5 => (rel (< <=) (neg (num 2)) (id x) (num 5))
PR-42: 24: 1<y<3 => (rel (< <) (num 1) (id y) (num 3)) ;; 25: y\ge x-1 => (rel >= (id y) (sub (id x) (num 1))) ;; 27: x=y^{2} => (rel = (id x) (pow (id y) (num 2)))
PR-42: 26: y<-2x+4 => (rel < (id y) (add (mul (neg (num 2)) (id x)) (num 4))) ;; 28: x^{2}=4 => (rel = (pow (id x) (num 2)) (num 4))
PR-42: 29: y^{2}=9 => (rel = (pow (id y) (num 2)) (num 9)) ;; 30: 3>2 => (rel > (num 3) (num 2)) ;; 31: (2,3) => (point (num 2) (num 3))
PR-42: 32: \left(2+\frac{1}{2}\right) => (add (num 2) (div (num 1) (num 2))) ;; 33: 25\%\operatorname{of}80 => (mul (pct (num 25)) (num 80))
PR-42: 34: \sin(30^{\circ}) => (call sin (deg (num 30))) ;; 38: 2x+5=17 => (rel = (add (mul (num 2) (id x)) (num 5)) (num 17))
PR-42: 35: question: 2\frac{1}{2} => (add (num 2) (div (num 1) (num 2))) ;; 36: question: 25\% => (pct (num 25)) ;; 37: question: \sin 30^{\circ} => (call sin (deg (num 30)))
```
- [ ] **Step 4:** the Step 2 command PASSES (the test above and every typed tree case) on Tasks 7 to 9's grammar; a failure is a parser defect, fixed in its module within this task with the input
  added to that grammar's case file.
- [ ] **Step 5:** `git commit -am "Add the SAT form cases to the calculator v2 golden corpus (PR-42)"`

## Task 13: Package gate
- [ ] **Step 1:** `npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02 --files "src/lib/calculator-v2/core/latex/**/*.test.ts,src/lib/calculator-v2/core/{deadline,corpus/corpus}.test.ts,tests/unit/calculator-v2/check-spec-ids.test.ts"`
  (the test files 02 owns, `00-index.md` section 2; its corpus cases still count) prints `check-spec-ids: all 29 IDs covered`, exit 0.
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2 tests/unit/calculator-v2` PASSES.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint && npm run format:check && node scripts/check-file-sizes.mjs` each exit 0; every created file is under 700 lines.
- [ ] **Step 4:** The AR-44 scan below prints nothing. Commit only a gate fix (naming the ID). PR-7, PR-9 (`\ne`), PR-18, PR-24 and PR-26 stay open REA defaults (`00-index.md` section 8).
```bash
grep -rnE "new Function|\beval\(|set(Timeout|Interval)\(\s*['\"]" src/lib/calculator-v2 scripts/calculator-v2
```

<!-- prettier-ignore-end -->
