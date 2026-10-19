# 05 editor-foundation, part 2 of 4: MathQuill options, LaTeX loading, speech text and digit groups (Tasks 4 and 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 2 of package `05-editor-foundation.md`, which holds the package header, Package rules,
the file table, Decisions (upstream facts, patches, MathQuill options, the adapter and announcer
contracts, speech text), Notes for the lead and the consumed 02 interfaces; they apply to every
task here. Tasks run in number order across the four parts.

---

### Task 4: MathQuill configuration and LaTeX loading (contract tests)

The options here serve T-1 to T-4, T-6 to T-10, AR-42 and PR-2, but these node tests only pin
option values and string rewrites, so they are titled by contract (`mathQuillOptions …`,
`toMathFieldLatex …`). The IDs' own tests are the typing and round-trip tests of Tasks 8 to 11
(Owning tasks, package header).

**Files:**

- Create: `src/components/calculator-v2/math-field/config.ts`, `load-latex.ts`
- Test: `src/components/calculator-v2/math-field/config.test.ts`, `load-latex.test.ts` (node)

**Interfaces:** Consumes `mathQuillAutoOperatorNames`, `mathQuillAutoCommands`, `MEMBER_NAMES`
(02). Imports nothing from `vendor/mathquill/` (01 section 9: `MathField.ts` is its only
importer). Produces, internal to 05:

```ts
// config.ts
export const CHARS_THAT_BREAK_OUT_OF_SUPSUB = "+-=<>~,"; // T-6, T-1
export const NATIVE_HISTORY_CHORDS: readonly string[]; // Ctrl-Z Meta-Z Ctrl-Shift-Z Meta-Shift-Z Ctrl-Y
export function isNativeHistoryChord(key: string): boolean;
export interface MathQuillOptions {
  autoOperatorNames: string;
  autoCommands: string;
  charsThatBreakOutOfSupSub: string;
  autoSubscriptNumerals: boolean;
  disableAutoSubstitutionInSubscripts: boolean;
  restrictMismatchedBrackets: boolean;
  enableDigitGrouping: boolean;
  disableCopyPaste: boolean;
  typingAsteriskWritesTimesSymbol: boolean;
  typingPercentWritesPercentOf: boolean;
  typingSlashWritesDivisionSymbol: boolean;
  typingSlashCreatesNewFraction: boolean;
} // the same members as mathquill.d.ts MathQuillConfig minus the four hooks
export function mathQuillOptions(): MathQuillOptions; // the options table, read on each call
// load-latex.ts
export function toMathFieldLatex(latex: string): string;
// \displaystyle -> "", \tfrac -> \frac, \leqslant -> \le, \geqslant -> \ge, \lvert -> \left|,
// \rvert -> \right|, \, \; \: \! -> ""; whole commands only (/(?![a-zA-Z])/); all else unchanged
```

- [ ] **Step 1: Write the failing tests**

```ts
// config.test.ts
import { expect, it } from "vitest";
import {
  MEMBER_NAMES,
  mathQuillAutoCommands,
  mathQuillAutoOperatorNames,
} from "@/lib/calculator-v2/core/latex/operator-names";
import {
  CHARS_THAT_BREAK_OUT_OF_SUPSUB,
  NATIVE_HISTORY_CHORDS,
  isNativeHistoryChord,
  mathQuillOptions,
} from "./config";

const config = mathQuillOptions();

it("mathQuillOptions makes '/' take the preceding term as a numerator (both slash options off)", () => {
  expect(config.typingSlashWritesDivisionSymbol).toBe(false);
  expect(config.typingSlashCreatesNewFraction).toBe(false);
});
it("mathQuillOptions takes autoOperatorNames and autoCommands from operator-names.ts, member names excluded", () => {
  expect(config.autoOperatorNames).toBe(mathQuillAutoOperatorNames());
  expect(config.autoCommands).toBe(mathQuillAutoCommands());
  const names = config.autoOperatorNames.split(" ");
  for (const member of MEMBER_NAMES) expect(names).not.toContain(member);
  expect(config.autoCommands.split(" ")).toEqual(
    expect.arrayContaining([
      "sqrt",
      "cbrt",
      "nthroot",
      "pi",
      "theta",
      "tau",
      "phi",
      "infinity",
      "infty",
      "sum",
      "prod",
      "int",
    ])
  );
});
it("mathQuillAutoOperatorNames has an auto-command only as a name's last letters, and only in midpoint", () => {
  const commands = mathQuillAutoCommands().split(" ");
  const names = mathQuillAutoOperatorNames().split(" ");
  // an occurrence ending before the last letter fires mid-name; patch 0009 cannot help it
  expect(names.filter((n) => commands.some((c) => n.slice(0, -1).includes(c)))).toEqual([]);
  // an occurrence ending the name is what patch 0009 handles (keys case 56)
  expect(names.filter((n) => commands.some((c) => n.length > c.length && n.endsWith(c)))).toEqual([
    "midpoint",
  ]);
});
it("mathQuillOptions turns on autoSubscriptNumerals and disableAutoSubstitutionInSubscripts", () => {
  expect(config.autoSubscriptNumerals).toBe(true);
  expect(config.disableAutoSubstitutionInSubscripts).toBe(true);
});
it("CHARS_THAT_BREAK_OUT_OF_SUPSUB is exactly + - = < > ~ , and mathQuillOptions uses it", () => {
  expect(CHARS_THAT_BREAK_OUT_OF_SUPSUB).toBe("+-=<>~,");
  expect(config.charsThatBreakOutOfSupSub).toBe("+-=<>~,");
});
it("mathQuillOptions turns off typingAsteriskWritesTimesSymbol and typingPercentWritesPercentOf", () => {
  expect(config.typingAsteriskWritesTimesSymbol).toBe(false);
  expect(config.typingPercentWritesPercentOf).toBe(false);
});
it("mathQuillOptions turns on restrictMismatchedBrackets", () =>
  expect(config.restrictMismatchedBrackets).toBe(true));
it("mathQuillOptions sets no autoParenthesizedFunctions", () =>
  expect("autoParenthesizedFunctions" in config).toBe(false));
it("mathQuillOptions turns on enableDigitGrouping", () =>
  expect(config.enableDigitGrouping).toBe(true));
it("mathQuillOptions turns on disableCopyPaste, NATIVE_HISTORY_CHORDS lists the five chords and no other option is set", () => {
  expect(config.disableCopyPaste).toBe(true);
  expect(NATIVE_HISTORY_CHORDS).toEqual([
    "Ctrl-Z",
    "Meta-Z",
    "Ctrl-Shift-Z",
    "Meta-Shift-Z",
    "Ctrl-Y",
  ]);
  expect(isNativeHistoryChord("Meta-Shift-Z")).toBe(true);
  expect(isNativeHistoryChord("Ctrl-A")).toBe(false);
  expect(Object.keys(config).sort()).toEqual([
    "autoCommands",
    "autoOperatorNames",
    "autoSubscriptNumerals",
    "charsThatBreakOutOfSupSub",
    "disableAutoSubstitutionInSubscripts",
    "disableCopyPaste",
    "enableDigitGrouping",
    "restrictMismatchedBrackets",
    "typingAsteriskWritesTimesSymbol",
    "typingPercentWritesPercentOf",
    "typingSlashCreatesNewFraction",
    "typingSlashWritesDivisionSymbol",
  ]);
});

// load-latex.test.ts
import { expect, it } from "vitest";
import { toMathFieldLatex } from "./load-latex";

it("toMathFieldLatex rewrites the PR-3 spellings MathQuill cannot read", () => {
  expect(toMathFieldLatex("\\displaystyle\\tfrac{1}{2}")).toBe("\\frac{1}{2}");
  expect(toMathFieldLatex("x\\leqslant3")).toBe("x\\le3");
  expect(toMathFieldLatex("x\\geqslant 3")).toBe("x\\ge 3");
  expect(toMathFieldLatex("2\\,3\\;4\\:5\\!6")).toBe("23456");
  expect(toMathFieldLatex("\\lvert x\\rvert")).toBe("\\left| x\\right|");
});
it("toMathFieldLatex leaves every other command alone", () => {
  for (const s of [
    "\\leq3",
    "\\le x",
    "\\geq",
    "\\frac{1}{2}",
    "\\left|x\\right|",
    "a\\ b",
    "\\text{sin}x",
    "\\operatorname{arcsec}x",
    "x^{\\circ}",
  ])
    expect(toMathFieldLatex(s), s).toBe(s);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/components/calculator-v2/math-field/config.test.ts src/components/calculator-v2/math-field/load-latex.test.ts`
Expected: FAIL, `Failed to resolve import "./config"` and `"./load-latex"`.

- [ ] **Step 3: Implement** `config.ts` (`mathQuillOptions()` returns a new object holding exactly
      the twelve option rows of the Decisions table; the `autoOperatorNames` and `autoCommands`
      strings are read on each call; no import from `vendor/`) and `load-latex.ts` (one
      `replace` with
      `/\\(displaystyle|tfrac|leqslant|geqslant|lvert|rvert)(?![a-zA-Z])|\\[,;:!]/g` and a lookup
      table).

- [ ] **Step 4: Run them and see them pass.**

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator-v2/math-field/config.ts src/components/calculator-v2/math-field/config.test.ts src/components/calculator-v2/math-field/load-latex.ts src/components/calculator-v2/math-field/load-latex.test.ts
git commit -m "Add the MathQuill configuration and LaTeX loading rewrites (T-2 to T-10, PR-2)"
```

### Task 5: Speech text and digit groups (T-5 contribution, T-10)

**Files:**

- Create: `src/components/calculator-v2/math-field/speech.ts`, `digit-groups.ts`
- Test: `src/components/calculator-v2/math-field/speech.test.ts`, `digit-groups.test.ts` (node)

**Interfaces:** Consumes `parseLatex`, `functionDefinitionHead`, `Node` (02); `CORPUS` (02).
Produces exactly 01 section 9 (the spoken-name list and the denominator words stay
module-private):

```ts
// speech.ts
export function latexToSpeech(latex: string): string; // "y equals x squared plus 3 fourths"
// digit-groups.ts
export function groupIntegerDigits(text: string): string; // T-10: U+2009 every 3 integer digits
```

- [ ] **Step 1: Write the failing tests**

```ts
// speech.test.ts
import { expect, it } from "vitest";
import { latexToSpeech } from "./speech";

it("T-5 speech text for the T-5 examples", () => {
  expect(latexToSpeech("y=x^{2}+\\frac{3}{4}")).toBe("y equals x squared plus 3 fourths");
  expect(latexToSpeech("y=\\sqrt{x}+\\pi")).toBe("y equals Start Root, x, End Root plus pi");
});
it("T-5 speech text covers every Phase 1 tree head", () => {
  const cases: [string, string][] = [
    ["", ""],
    ["2x", "2 x"],
    ["3\\cdot4", "3 times 4"],
    ["x^{3}", "x cubed"],
    ["x^{4}", "x Superscript, 4, Baseline"],
    ["e^{-x}", "e Superscript, negative x, Baseline"],
    ["\\frac{1}{2}", "1 half"],
    ["\\frac{5}{2}", "5 halves"],
    ["\\frac{1}{3}", "1 third"],
    ["\\frac{2}{3}", "2 thirds"],
    ["\\frac{x}{12}", "Start Fraction, x Over 12, End Fraction"],
    ["\\sqrt[3]{x}", "Start Cube Root, x, End Cube Root"],
    ["\\sqrt[4]{x}", "Start Root Index 4, x, End Root"],
    ["\\left|x-1\\right|", "Start Absolute Value, x minus 1, End Absolute Value"],
    ["-\\left(x+1\\right)", "negative left parenthesis x plus 1 right parenthesis"],
    ["a-\\left(b+c\\right)", "a minus left parenthesis b plus c right parenthesis"],
    ["\\left(x+1\\right)^{2}", "left parenthesis x plus 1 right parenthesis squared"],
    ["\\sin\\left(x+1\\right)", "sine of left parenthesis x plus 1 right parenthesis"],
    ["\\sin x^{2}", "sine of x squared"],
    ["\\sin^{2}x", "left parenthesis sine of x right parenthesis squared"],
    ["\\log_{2}x", "log base 2 of x"],
    ["\\ln x", "natural log of x"],
    ["\\left(2,3\\right)", "left parenthesis 2 comma 3 right parenthesis"],
    ["0\\le x<10", "0 less than or equal to x less than 10"],
    ["y\\ge2x+1", "y greater than or equal to 2 x plus 1"],
    ["A_{1}+\\theta", "upper A sub 1 plus theta"],
    ["44\\%", "44 percent"],
    ["30^{\\circ}", "30 degrees"],
    ["f(x)=x^{2}", "f of x equals x squared"],
  ];
  for (const [latex, speech] of cases) expect(latexToSpeech(latex), latex).toBe(speech);
});
it("T-5 speech text names integer fractions with denominators 2 to 10 by their ordinal words", () => {
  const singular = [
    "half",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  const plural = [
    "halves",
    "thirds",
    "fourths",
    "fifths",
    "sixths",
    "sevenths",
    "eighths",
    "ninths",
    "tenths",
  ];
  singular.forEach((word, i) => {
    const d = i + 2;
    expect(latexToSpeech(`\\frac{1}{${d}}`)).toBe(`1 ${word}`);
    expect(latexToSpeech(`\\frac{2}{${d}}`)).toBe(`2 ${plural[i]}`);
    expect(latexToSpeech(`\\frac{10}{${d}}`)).toBe(`10 ${plural[i]}`);
  });
  expect(latexToSpeech("\\frac{1}{11}")).toBe("Start Fraction, 1 Over 11, End Fraction");
  expect(latexToSpeech("\\frac{1.5}{2}")).toBe("Start Fraction, 1.5 Over 2, End Fraction");
});
it("T-5 speech text speaks every Phase 1 function name as words", () => {
  const cases: [string, string][] = [
    ["\\sin x", "sine of x"],
    ["\\cos x", "cosine of x"],
    ["\\tan x", "tangent of x"],
    ["\\csc x", "cosecant of x"],
    ["\\sec x", "secant of x"],
    ["\\cot x", "cotangent of x"],
    ["\\arcsin x", "arc sine of x"],
    ["\\arccos x", "arc cosine of x"],
    ["\\arctan x", "arc tangent of x"],
    ["\\operatorname{arccsc}x", "arc cosecant of x"],
    ["\\operatorname{arcsec}x", "arc secant of x"],
    ["\\operatorname{arccot}x", "arc cotangent of x"],
    ["\\ln x", "natural log of x"],
    ["\\log x", "log of x"],
    ["\\exp x", "exp of x"],
  ];
  for (const [latex, speech] of cases) expect(latexToSpeech(latex), latex).toBe(speech);
});
it("T-5 LaTeX that does not parse has no tree speech", () => {
  expect(latexToSpeech("x+")).toBe("");
  expect(latexToSpeech("\\frac{}{}")).toBe("");
});
it("T-10 speech text never contains digit grouping", () => {
  expect(latexToSpeech("1234567")).toBe("1234567");
  expect(latexToSpeech("12345.678+1")).toBe("12345.678 plus 1");
});

// digit-groups.test.ts
import { expect, it } from "vitest";
import { CORPUS } from "@/lib/calculator-v2/core/corpus";
import { groupIntegerDigits } from "./digit-groups";

it("T-10 integer parts of results group in threes with U+2009; fractions, exponents and words do not", () => {
  const t = "\u2009";
  expect(groupIntegerDigits("1234567.891")).toBe(`1${t}234${t}567.891`);
  expect(groupIntegerDigits("-1234")).toBe(`-1${t}234`);
  expect(groupIntegerDigits("999")).toBe("999");
  expect(groupIntegerDigits("0.123456")).toBe("0.123456");
  expect(groupIntegerDigits("1.09951162778×10^12")).toBe("1.09951162778×10^12");
  expect(groupIntegerDigits("1234+5678i")).toBe(`1${t}234+5${t}678i`);
  expect(groupIntegerDigits("(1234, -5678)")).toBe(`(1${t}234, -5${t}678)`);
  expect(groupIntegerDigits("undefined")).toBe("undefined");
});
it("T-10 corpus display strings never contain U+2009", () => {
  for (const c of CORPUS)
    if (c.display !== undefined) expect(c.display, c.id).not.toContain("\u2009");
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/components/calculator-v2/math-field/speech.test.ts src/components/calculator-v2/math-field/digit-groups.test.ts`
Expected: FAIL, `Failed to resolve import "./speech"` and `"./digit-groups"`.

- [ ] **Step 3: Implement.** `latexToSpeech` follows the Decisions speech table, the denominator
      words and the spoken-name list (internal `speak(node: Node, source: string): string`,
      `precedence(node: Node): number`, `wrap(text: string): string`, and the module-private
      `SPOKEN_NAMES` and `DENOMINATOR_WORDS` constants, not exported), joins with single spaces
      and trims. `groupIntegerDigits` is
      `text.replace(/(^|[^0-9.])([0-9]{4,})/g, (_, pre, run) => pre + run.replace(/\B(?=(\d{3})+$)/g, "\u2009"))`
      (runs after `.` are fractional and skipped; exponents never reach four digits).

- [ ] **Step 4: Run them and see them pass.**

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator-v2/math-field/speech.ts src/components/calculator-v2/math-field/speech.test.ts src/components/calculator-v2/math-field/digit-groups.ts src/components/calculator-v2/math-field/digit-groups.test.ts
git commit -m "Speak rows from the parser tree and group result digits (T-5, T-10)"
```
