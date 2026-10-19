# 05 editor-foundation, part 1 of 4: lint ignores, vendored MathQuill, its role colours and notices (Tasks 1 to 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of package `05-editor-foundation.md`, which holds the package header, Package rules,
the file table, Decisions (upstream facts, patches, MathQuill options, the adapter and announcer
contracts, speech text), Notes for the lead and the consumed 02 interfaces; they apply to every
task here. Tasks run in number order across the four parts.

---

### Task 1: Exclude `vendor/` from ESLint and Prettier (AR-5)

Runs before any vendored file exists, so lint-staged's `prettier --write` never rewrites
`mathquill.js` (index decision).

**Files:**

- Modify: `eslint.config.mjs` (add `"vendor/**"` to the final `ignores` array),
  `.prettierignore` (append `# Vendored third-party build output (AR-5)` and `vendor/`)
- Test: `src/components/calculator-v2/math-field/vendor.test.ts` (node)

**Interfaces:** Consumes ESLint 9 `ESLint#isPathIgnored` and Prettier 3 `getFileInfo`. Produces
nothing.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { ESLint } from "eslint";
import { getFileInfo } from "prettier";
import { expect, it } from "vitest";

it("AR-5 vendor/mathquill is excluded from ESLint and Prettier", async () => {
  const eslint = new ESLint({ cwd: process.cwd() });
  for (const file of ["vendor/mathquill/mathquill.js", "vendor/mathquill/mathquill.d.ts"])
    expect(await eslint.isPathIgnored(file), file).toBe(true);
  for (const file of ["vendor/mathquill/mathquill.js", "vendor/mathquill/README.md"])
    expect((await getFileInfo(file, { ignorePath: ".prettierignore" })).ignored, file).toBe(true);
  expect(readFileSync(".prettierignore", "utf8").split("\n")).toContain("vendor/");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/components/calculator-v2/math-field/vendor.test.ts -t "AR-5"`
Expected: FAIL, `vendor/mathquill/mathquill.js: expected false to be true`.

- [ ] **Step 3: Implement** the two edits above.

- [ ] **Step 4: Run it and see it pass**, then `npm run lint` and `npm run format:check` (PASS).

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs .prettierignore src/components/calculator-v2/math-field/vendor.test.ts
git commit -m "Exclude vendor/ from ESLint and Prettier before vendoring MathQuill (AR-5)"
```

### Task 2: Vendor MathQuill at `1cbc1c4128` with documented patches and role colours (AR-5; TH-3 via OI-34)

**Files:**

- Create: `vendor/mathquill/mathquill.js`, `mathquill.css`, `LICENSE`, `README.md`, `PATCHES.md`,
  `mathquill.d.ts`, `patches/0001-es-module-export.patch` …
  `patches/0009-autocommand-yields-to-operator-name.patch`
- Create: `src/components/calculator-v2/styles/math-field.css` (OI-34's accepted path, 03
  coordination note 6: it lands in the same commit as `mathquill.css`, because 03 Task 6's
  `TH-3, OI-34 …` test fails from the moment the vendored sheet exists)
- Modify: `src/components/calculator-v2/math-field/vendor.test.ts`
- Test (03's, unchanged here): `src/lib/calculator-v2/theme/no-raw-colours.test.ts`

**Interfaces:** Consumes the role custom properties of `ROLE_VARS` (03, `01-interfaces-runtime.md`
section 6): `--kc-text`, `--kc-boundary`, `--kc-focus-ring`, `--kc-focus-bar`,
`--kc-focus-bar-label`, `--kc-chrome`; and 03 Task 6's `vendorColourDecls` and `overrideFindings`
check, through its test. Produces `styles/math-field.css`, which 10's `styleSources` picks up among
"the other `styles/*.css` sorted", after `vendor/mathquill/mathquill.css` (AR-36 order). Produces the
module `vendor/mathquill/mathquill.js` (default export: the MathQuill object, no globals) typed by
`mathquill.d.ts`, internal to 05:

```ts
// vendor/mathquill/mathquill.d.ts: only the members MathField.ts and config.ts use (AR-5)
export interface MathQuillHandlers {
  edit?(mq: EditableMathQuill): void;
  enter?(mq: EditableMathQuill): void;
  upOutOf?(mq: EditableMathQuill): void;
  downOutOf?(mq: EditableMathQuill): void;
  deleteOutOf?(direction: -1 | 1, mq: EditableMathQuill): void;
}
export interface MathQuillConfig {
  substituteTextarea(): HTMLElement;
  overrideTypedText(text: string): void;
  overrideKeystroke(key: string, event: KeyboardEvent): void;
  handlers: MathQuillHandlers;
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
}
export interface EditableMathQuill {
  latex(): string;
  latex(value: string): EditableMathQuill;
  write(latex: string): EditableMathQuill;
  cmd(name: string): EditableMathQuill;
  keystroke(keys: string, event?: KeyboardEvent): EditableMathQuill;
  typedText(text: string): EditableMathQuill;
  select(): EditableMathQuill;
  clearSelection(): EditableMathQuill;
  selectionLatex(): string | null; // patches/0005
  focus(): EditableMathQuill;
  blur(): EditableMathQuill;
  reflow(): void;
  mathspeak(): string;
  revert(): HTMLElement;
}
export interface MathQuillInterface {
  MathField(element: HTMLElement, config: MathQuillConfig): EditableMathQuill;
}
declare const MathQuill: { getInterface(version: 3): MathQuillInterface };
export default MathQuill;
```

- [ ] **Step 1: Write the failing tests** (append to `vendor.test.ts`; new imports join the file's
      existing import lines, so `readdirSync` goes into the `node:fs` import)

```ts
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import path from "node:path";

const VENDOR = "vendor/mathquill";
const FULL_SHA = "1cbc1c4128ec87db3733bc99965522f7d62cde75";
const PATCH_FILES = [
  "0001-es-module-export.patch",
  "0002-no-window-global.patch",
  "0003-shadow-root-focus.patch",
  "0004-aria-label-is-the-name.patch",
  "0005-selection-latex.patch",
  "0006-strict-bracket-matching.patch",
  "0007-ellipsis-in-square-brackets.patch",
  "0008-katex-fonts.patch",
  "0009-autocommand-yields-to-operator-name.patch",
];
// files in vendor/mathquill/ that are not upstream build output, so have no sha256 row
const UNHASHED = ["PATCHES.md", "README.md", "mathquill.d.ts", "patches"];
const read = (file: string) => readFileSync(path.join(VENDOR, file), "utf8");
const sha256 = (file: string) =>
  createHash("sha256")
    .update(readFileSync(path.join(VENDOR, file)))
    .digest("hex");
// declarations of every CSS rule whose comma-separated selector list contains `selector`
function declarationsFor(css: string, selector: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((m) =>
      m[1]
        .split(",")
        .map((s) => s.trim())
        .includes(selector)
    )
    .map((m) => m[2]);
}

it("AR-5 README records the upstream URL, the full SHA of 1cbc1c4128 and the exact build command", () => {
  const readme = read("README.md");
  expect(readme).toContain("Upstream: https://github.com/mathquill/mathquill");
  const sha = /^Commit: ([0-9a-f]{40})$/m.exec(readme)?.[1];
  expect(sha?.startsWith("1cbc1c4128")).toBe(true);
  expect(sha).toBe(FULL_SHA);
  expect(readme).toContain(`git -C "$MQ" checkout ${FULL_SHA}`);
  expect(readme).toContain("make js css OMIT_FONT_FACE=true NO_INSTALL=1");
});
it("AR-5 every vendored file's sha256 matches the README", () => {
  const rows = [...read("README.md").matchAll(/^\| (\S+) +\| ([0-9a-f]{64}) +\|$/gm)];
  // derived, not listed: a new output file without a row, or a row naming no file, fails here
  const vendored = readdirSync(VENDOR)
    .filter((f) => !UNHASHED.includes(f) && !f.startsWith("."))
    .sort();
  expect(vendored).toEqual(expect.arrayContaining(["LICENSE", "mathquill.css", "mathquill.js"]));
  expect(rows.map((r) => r[1]).sort()).toEqual(vendored);
  for (const [, file, hash] of rows) expect(sha256(file), file).toBe(hash);
});
it("AR-5 PATCHES.md lists every local change and nothing else", () => {
  const listed = [...read("PATCHES.md").matchAll(/patches\/(\d{4}-[a-z0-9-]+\.patch)/g)];
  expect(readdirSync(path.join(VENDOR, "patches")).sort()).toEqual(PATCH_FILES);
  expect([...new Set(listed.map((m) => m[1]))].sort()).toEqual(PATCH_FILES);
  expect(read("PATCHES.md")).toContain("OMIT_FONT_FACE=true");
});
it("AR-5 the vendored output carries the patches", () => {
  const js = read("mathquill.js");
  const css = read("mathquill.css");
  expect(js.trimEnd().endsWith("export default MathQuillModule;")).toBe(true);
  expect(js).not.toMatch(/window\.MathQuill|noConflict/);
  expect(js).toContain("selectionLatex");
  expect(js).toContain("endsLongerOperatorName"); // patches/0009
  expect(css).not.toMatch(/@font-face|url\(/);
  expect(css).not.toMatch(/font(-family)?\s*:[^;}]*Symbola/);
  expect(declarationsFor(css, ".mq-math-mode").join(";")).toMatch(
    /font-family: KaTeX_Main, "Times New Roman", serif/
  );
  expect(declarationsFor(css, ".mq-math-mode var").join(";")).toMatch(
    /font-family: KaTeX_Math, "Times New Roman", serif/
  );
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/components/calculator-v2/math-field/vendor.test.ts -t "AR-5"`
Expected: FAIL, `ENOENT: no such file or directory, open 'vendor/mathquill/README.md'`.

- [ ] **Step 3: Implement.** Clone the pin into a temporary directory, make each patch as its own
      commit there, export it, build, copy:

```bash
KARMAN="$PWD"; WORK="$(mktemp -d)"; MQ="$WORK/mathquill"
git clone https://github.com/mathquill/mathquill.git "$MQ"
git -C "$MQ" checkout 1cbc1c4128ec87db3733bc99965522f7d62cde75
mkdir -p vendor/mathquill/patches
# after editing the files of patch N in "$MQ" (Decisions patch table, bodies below):
git -C "$MQ" diff > "vendor/mathquill/patches/000N-<name>.patch"
git -C "$MQ" -c user.name=vendor -c user.email=vendor@localhost commit -qam "000N"
# after patch 0009:
(cd "$MQ" && npm ci --ignore-scripts && make js css OMIT_FONT_FACE=true NO_INSTALL=1)
cp "$MQ/build/mathquill.js" "$MQ/build/mathquill.css" "$MQ/LICENSE" "$KARMAN/vendor/mathquill/"
```

Patch bodies where the table is not enough:

```ts
// 0003 src/controller.ts
containerHasFocus() {
  const active = (this.container.getRootNode() as Document | ShadowRoot).activeElement;
  return !!active && this.container.contains(active);
}
// 0003 src/services/saneKeyboardEvents.util.ts, in onPaste
if ((textarea.getRootNode() as Document | ShadowRoot).activeElement !== textarea) textarea.focus();
// 0004 src/services/textarea.ts, updateMathspeak(): the editable `else` branch that called
// textarea.setAttribute('aria-label', label + mathspeak + ariaPostLabel) is removed; a comment
// says the embedding adapter owns aria-label.
// 0005 src/publicapi.ts, class EditableField
selectionLatex(): string | null {
  const selection = this.__controller.cursor.selection;
  return selection ? this.__controller.cleanLatex(selection.join('latex')) : null;
}
// 0007 src/commands/math/basicSymbols.ts (replaces the LatexCmds['.'] factory)
class Dot extends DigitGroupingChar {
  constructor() {
    super('.', h('span', { class: 'mq-digit' }, [h.text('.')]), '.');
  }
  createLeftOf(cursor: Cursor) {
    const l1 = cursor[L];
    const l2 = l1 && l1[L];
    const bracket = cursor.parent && cursor.parent.parent;
    if (l1 instanceof Dot && l2 instanceof Dot && bracket instanceof Bracket &&
        bracket.sides[L].ch === '[') {
      cursor[L] = l2[L];
      new Fragment(l2, l1).remove();
      (LatexCmds as LatexCmdsAny).ldots('\\ldots').createLeftOf(cursor);
      return;
    }
    super.createLeftOf(cursor);
  }
}
LatexCmds['.'] = () => new Dot();
// 0009 src/commands/math/basicSymbols.ts, class Letter. In createLeftOf's loop that tries the
// letter-run suffix `str` from longest to shortest, the auto-command fires only when
//   autoCmds.hasOwnProperty(str) && !this.endsLongerOperatorName(cursor.options, str.length)
// and otherwise the loop goes on to the next shorter `str` (no other line of the loop changes).
endsLongerOperatorName(opts: CursorOptions, length: number): boolean {
  const names = opts.autoOperatorNames;
  let run = '';
  let l: NodeRef = this;
  for (let i = 0; l instanceof Letter && i < (names._maxLength || 0); i++, l = l[L]) {
    run = l.letter + run;
    if (run.length > length && names.hasOwnProperty(run)) return true;
  }
  return false;
}
```

`0008`: in `src/css/mixins/fonts.less` set `@symbola: KaTeX_Main, "Times New Roman", serif;` and
`@times: KaTeX_Main, "Times New Roman", serif;` and add
`@math-italic: KaTeX_Math, "Times New Roman", serif;`. In `src/css/math.less` split
`var, .mq-text-mode, .mq-nonSymbola { font-family: @times; line-height: .9; }` into
`var { font-family: @math-italic; line-height: .9; }` and
`.mq-text-mode, .mq-nonSymbola { font-family: @times; line-height: .9; }`; set
`.mq-sans-serif` to `sans-serif, KaTeX_Main, serif`, `.mq-monospace` to
`monospace, KaTeX_Main, serif` and `.mq-operator-name` to `@symbola`. The existing
`&, .mq-editable-field { font-family: @symbola; }` inside `.mq-math-mode` then gives
`.mq-math-mode` its `KaTeX_Main`.

Write `README.md` with these lines (hash rows from `shasum -a 256`, sorted by file name):

````markdown
# MathQuill (vendored)

Upstream: https://github.com/mathquill/mathquill
Commit: 1cbc1c4128ec87db3733bc99965522f7d62cde75
Version: 0.10.1 (package.json at that commit, jQuery-free master)
Licence: MPL-2.0 (LICENSE, copied unchanged)
Local changes: PATCHES.md

## Build (Node 22, from the repository root)

```sh
WORK="$(mktemp -d)"; MQ="$WORK/mathquill"
git clone https://github.com/mathquill/mathquill.git "$MQ"
git -C "$MQ" checkout 1cbc1c4128ec87db3733bc99965522f7d62cde75
for p in "$PWD"/vendor/mathquill/patches/*.patch; do git -C "$MQ" apply "$p"; done
(cd "$MQ" && npm ci --ignore-scripts && make js css OMIT_FONT_FACE=true NO_INSTALL=1)
cp "$MQ/build/mathquill.js" "$MQ/build/mathquill.css" "$MQ/LICENSE" vendor/mathquill/
```

## Files

| File          | sha256   |
| ------------- | -------- |
| LICENSE       | <64 hex> |
| mathquill.css | <64 hex> |
| mathquill.js  | <64 hex> |
````

`PATCHES.md` holds the patch table of this plan's Decisions (each row names
`patches/000N-….patch`), a "Build options" section (`OMIT_FONT_FACE=true` drops the Symbola
`@font-face`, AR-39; `NO_INSTALL=1` because `npm ci --ignore-scripts` ran first) and an "Adapter
settings (no source change)" section (`disableCopyPaste: true` for AR-14 and T-5; history chords
prevented in `overrideKeystroke` for KB-2). Then run the README block again in a second temporary
directory with its final `cp` pointed at a scratch folder, and check that `shasum -a 256` of the
three rebuilt files equals the table (this proves the recorded command is exact).

- [ ] **Step 4: See the vendored colours fail 03's override check (TH-3, OI-34).** Preconditions,
      from the worktree root: `grep -c "every one of whose colour declarations is overridden" docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`
      prints 1 (OI-34 accepted and applied by 03 Task 6 Step 1; if it prints 0 because OI-34 was
      rejected, do "If OI-34 was rejected" below instead of Steps 4 and 5), and
      `grep -c '"#ccc"' src/lib/calculator-v2/theme/no-raw-colours.test.ts` prints 0 (Note A
      below; otherwise stop and ask the lead).

Run: `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts -t "OI-34"`
Expected: FAIL in `TH-3, OI-34 every colour declaration of the vendored MathQuill sheet is
overridden from a role by a later calculator stylesheet`: `overrideFindings` returns 39
`"<selector> { <property> }"` strings, one for each selector and property of the table below.

The pinned build's colour declarations, read from `src/css/editable.less`, `math.less` and
`selections.less` at `1cbc1c4128` (patch 0008 changes fonts only). "×n" counts the selectors
LESS writes for the rule; `-moz-box-shadow` is skipped by the check, and the cursor's
`border-left: 1px solid currentColor` and `svg { fill: currentColor }` are not entries:

| Vendored selectors                                                                                                                | Declarations                                                                                           | Override (same selectors, after it)                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `.mq-editable-field`, `.mq-math-mode .mq-editable-field` (×2)                                                                     | `border: 1px solid gray`                                                                               | `border-color: var(--kc-boundary)`                                                                          |
| `.mq-editable-field.mq-focused`, `.mq-math-mode .mq-editable-field.mq-focused` (×2)                                               | `-webkit-box-shadow` and `box-shadow: #8bd 0 0 1px 2px, inset #6ae 0 0 2px 0`; `border-color: #709AC0` | `box-shadow: none`; `border-color: var(--kc-focus-ring)`                                                    |
| `.mq-editable-field .mq-latex-command-input` (×1)                                                                                 | `border: 1px solid gray`                                                                               | `border-color: var(--kc-boundary)`                                                                          |
| `.mq-editable-field .mq-latex-command-input.mq-hasCursor` (×1)                                                                    | `border-color: ActiveBorder`                                                                           | `border-color: var(--kc-focus-ring)`                                                                        |
| `.mq-math-mode *` (×1)                                                                                                            | `border-color: black`                                                                                  | `border-color: var(--kc-text)`                                                                              |
| `.mq-math-mode .mq-empty` (×1)                                                                                                    | `background: rgba(0,0,0,.2)`                                                                           | `background: var(--kc-chrome)` (Note B)                                                                     |
| `.mq-math-mode .mq-text-mode.mq-hasCursor` (×1)                                                                                   | `box-shadow: inset darkgray 0 .1em .2em`                                                               | `box-shadow: inset 0 0.1em 0.2em var(--kc-boundary)`                                                        |
| `.mq-math-mode .mq-overarc`, `.mq-math-mode .mq-overarrow` (×2)                                                                   | `border-top: 1px solid black`                                                                          | `border-top-color: var(--kc-text)`                                                                          |
| `.mq-math-mode .mq-selection`, `.mq-editable-field .mq-selection`, and each with a descendant `.mq-non-leaf` or `.mq-scaled` (×6) | `background: #B4D5FE !important`                                                                       | `background: var(--kc-focus-bar) !important`; also `color` and `border-color: var(--kc-focus-bar-label)`    |
| the same six with `.mq-selection.mq-blur` in place of `.mq-selection` (×6)                                                        | `background: #D4D4D4 !important`; `color: black`; `border-color: black`                                | `background: var(--kc-chrome) !important`; `color: var(--kc-text)`; `border-color: var(--kc-text)` (Note B) |

- [ ] **Step 5: Write `src/components/calculator-v2/styles/math-field.css`** exactly as below.
      Every rule sits outside any at-rule and repeats the vendored selectors verbatim, so equal
      specificity and its later place in `CALCULATOR_V2_CSS` win the cascade; `!important` stays
      wherever the vendored declaration has it. The caret rule is not an entry (the caret is
      `currentColor` at the pin) but pins it to the text role on every skin. No hex, colour
      function, named colour or `@media` appears (03's TH-3 scans and AR-19 read this file too).

```css
/* Role colours for the vendored MathQuill rules (TH-3, OI-34); 05 Task 2 */
.mq-editable-field .mq-cursor {
  border-left-color: var(--kc-text);
}

.mq-editable-field,
.mq-math-mode .mq-editable-field,
.mq-editable-field .mq-latex-command-input {
  border-color: var(--kc-boundary);
}

.mq-editable-field.mq-focused,
.mq-math-mode .mq-editable-field.mq-focused {
  box-shadow: none;
  border-color: var(--kc-focus-ring);
}

.mq-editable-field .mq-latex-command-input.mq-hasCursor {
  border-color: var(--kc-focus-ring);
}

.mq-math-mode * {
  border-color: var(--kc-text);
}

.mq-math-mode .mq-overarc,
.mq-math-mode .mq-overarrow {
  border-top-color: var(--kc-text);
}

.mq-math-mode .mq-empty {
  background: var(--kc-chrome);
}

.mq-math-mode .mq-text-mode.mq-hasCursor {
  box-shadow: inset 0 0.1em 0.2em var(--kc-boundary);
}

.mq-math-mode .mq-selection,
.mq-editable-field .mq-selection,
.mq-math-mode .mq-selection .mq-non-leaf,
.mq-editable-field .mq-selection .mq-non-leaf,
.mq-math-mode .mq-selection .mq-scaled,
.mq-editable-field .mq-selection .mq-scaled {
  background: var(--kc-focus-bar) !important;
  color: var(--kc-focus-bar-label);
  border-color: var(--kc-focus-bar-label);
}

.mq-math-mode .mq-selection.mq-blur,
.mq-editable-field .mq-selection.mq-blur,
.mq-math-mode .mq-selection.mq-blur .mq-non-leaf,
.mq-editable-field .mq-selection.mq-blur .mq-non-leaf,
.mq-math-mode .mq-selection.mq-blur .mq-scaled,
.mq-editable-field .mq-selection.mq-blur .mq-scaled {
  background: var(--kc-chrome) !important;
  color: var(--kc-text);
  border-color: var(--kc-text);
}
```

- [ ] **Step 6: Run them and see them pass.**

```bash
npx vitest run src/components/calculator-v2/math-field/vendor.test.ts -t "AR-5"
npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts
npx tsc --noEmit
```

Expected: PASS (5 AR-5 tests; `no-raw-colours.test.ts` 7 tests, among them
`TH-3, OI-34 …` with `overrideFindings` `[]` and the raw-colour and `--kc-` variable scans now
reading `math-field.css`). `tsc` passes: the `.d.ts` is included through `**/*.ts` and
`skipLibCheck` is on.

- [ ] **Step 7: Commit**

```bash
git add vendor/mathquill src/components/calculator-v2/math-field/vendor.test.ts src/components/calculator-v2/styles/math-field.css
git commit -m "Vendor MathQuill 1cbc1c4128 as an ES module with documented patches and role colours (AR-5, TH-3)"
```

**If OI-34 was rejected** (decided before wave 0, so check Step 4's first grep before Step 3: it
prints 0 and the lead confirms the rejection; 03 Task 6's vendored test then asserts
`rawColourFindings(MQ_CSS, <its text>)` is `[]`): skip Steps 4 and 5 and create no
`math-field.css`. In Step 3, after patch 0009 and before the build, make
`patches/0010-colour-roles.patch` the same way (files `src/css/editable.less`, `src/css/math.less`,
`src/css/selections.less`): each declaration of the table above takes its override value in place,
keeping `!important`; the `.box-shadow(…)` mixin call in `editable.less` becomes `.box-shadow(none)`,
so `-moz-box-shadow` loses its hex too; the cursor's `currentColor` becomes `var(--kc-text)`. Append
`"0010-colour-roles.patch"` to `PATCH_FILES` and its row to `PATCHES.md` ("TH-3: MathQuill colours
from the calculator roles"), rerun the README build check, then run Step 6 (with
`no-raw-colours.test.ts` asserting the vendored sheet has no raw colour) and commit with
`vendor/mathquill` and `vendor.test.ts` only.

**Notes for the lead (this part edits no other plan file).**

- **A. 03 Task 6's upstream colour list does not match the pin.** Its `TH-3, OI-34 …` test
  asserts that each listed colour, `"#ccc"` among them, is a token of some vendored value. At
  `1cbc1c4128` the empty block is `rgba(0,0,0,.2)` (no `#ccc` anywhere), the caret is
  `currentColor`, the selection has no `Highlight` or `HighlightText`, and the blurred selection is
  `#D4D4D4`. With `"#ccc"` in the list that test fails whatever `math-field.css` holds. Before
  wave 1, in `03-foundations.md` Task 6 (and in the test file if 03 has merged) replace `"#ccc"`
  with `"rgba"` and append `"#d4d4d4"`, `"darkgray"` and `"activeborder"`; correct note 6's
  colour list to the table above.
- **B. `--kc-chrome`, not `--kc-key-operator`, for the empty block and the blurred selection.**
  03 note 6 proposes `--kc-key-operator`, but 03 Task 3 maps `keyOperator` and `list` both to
  `surface` on dark skins, so on every dark skin empty blocks and a blurred selection would be
  invisible on a row (rows rest on `--kc-list`). `--kc-chrome` differs from `--kc-list` on every
  skin (it is why 09's list buttons press to it), and `text` reaches 7:1 on it (`TEXT_BACKGROUNDS`).
  Update note 6's role text to match.
- **C. Ownership rows.** Add `src/components/calculator-v2/styles/math-field.css` to 05's
  **Owns** line in `00-index.md` section 2, and to the file table in `05-editor-foundation.md`
  with the responsibility "Role colours over every vendored MathQuill colour declaration (TH-3,
  OI-34)". Under a rejected OI-34, add patch 0010's row to that file's patch table instead.
- **D. Consumers restyling MathQuill.** `math-field.css` sorts after `graph.css`, `keypad.css` and
  `list.css` in `CALCULATOR_V2_CSS`, so a later package that restyles these selectors there needs
  higher specificity than the vendored selector.

### Task 3: Notices for MathQuill, KaTeX, its fonts and the lazy chunk's packages (AR-5)

**Files:**

- Modify: `public/calculator-notices.txt`, `src/components/calculator-v2/math-field/vendor.test.ts`

**Interfaces:** Produces notice entries in the file's existing format (a `name version (licence)`
line, a line of 60 `=`, the licence text), which 13's AR-62 metafile test extends. The file already
has a stale `katex 0.16.45 (MIT)` entry (v1's list, line 204 at `08c8c76`) while `package.json` and
`package-lock.json` pin katex `0.18.2`; that entry is replaced in place, never duplicated.

- [ ] **Step 1: Write the failing tests** (append to `vendor.test.ts`)

```ts
// entry rules are exactly 60 "=" (the MPL-2.0 text has its own shorter "===" underline)
const RULE = /^={60}$/;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// the entry from its header line up to the next header (a line followed by a "====" line)
function noticeBlock(text: string, header: RegExp): string | null {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => header.test(l));
  if (start < 0) return null;
  let end = start + 2;
  while (end < lines.length && !(lines[end + 1] !== undefined && RULE.test(lines[end + 1]))) end++;
  return lines.slice(start, end).join("\n");
}
function katexFontFiles(): string[] {
  const css = readFileSync("node_modules/katex/dist/katex.min.css", "utf8");
  return [...new Set([...css.matchAll(/url\(fonts\/([^)]+)\)/g)].map((m) => m[1]))].sort();
}
const katexVersion = (): string =>
  JSON.parse(readFileSync("node_modules/katex/package.json", "utf8")).version;
function missingNotices(text: string): string[] {
  const missing: string[] = [];
  const katex = katexVersion();
  const katexLicence = norm(readFileSync("node_modules/katex/LICENSE", "utf8"));
  const mq = noticeBlock(text, /^mathquill 0\.10\.1 \(MPL-2\.0\)$/);
  if (
    !mq ||
    !mq.includes("https://github.com/mathquill/mathquill") ||
    !mq.includes(FULL_SHA) ||
    !norm(mq).includes(norm(read("LICENSE")))
  )
    missing.push("mathquill");
  const kb = noticeBlock(text, new RegExp(`^katex ${escapeRe(katex)} \\(MIT\\)$`));
  if (!kb || !norm(kb).includes(katexLicence)) missing.push("katex");
  const fonts = noticeBlock(text, new RegExp(`^KaTeX fonts \\(katex ${escapeRe(katex)}, MIT\\)$`));
  if (!fonts || !norm(fonts).includes(katexLicence)) missing.push("KaTeX fonts");
  for (const file of katexFontFiles()) if (!fonts?.split("\n").includes(file)) missing.push(file);
  return missing;
}
const NOTICES = "public/calculator-notices.txt";

it("AR-5 calculator-notices.txt has MathQuill, KaTeX and every KaTeX font file the calculator serves", () => {
  const text = readFileSync(NOTICES, "utf8");
  expect(katexFontFiles()).toHaveLength(60);
  expect(missingNotices(text)).toEqual([]);
  // exactly one KaTeX entry, at the installed version (the stale v1 entry was replaced)
  expect(text.split("\n").filter((l) => /^katex \S+ \(MIT\)$/.test(l))).toEqual([
    `katex ${katexVersion()} (MIT)`,
  ]);
});
it("AR-5 the notices check fails when an entry is missing", () => {
  const text = readFileSync(NOTICES, "utf8");
  expect(missingNotices(text.replace(/^mathquill 0\.10\.1 \(MPL-2\.0\)$/m, "x"))).toContain(
    "mathquill"
  );
  expect(missingNotices(text.replaceAll("KaTeX_Main-Regular.woff2", "x"))).toContain(
    "KaTeX_Main-Regular.woff2"
  );
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/components/calculator-v2/math-field/vendor.test.ts -t "AR-5"`
Expected: FAIL in the first new test only, which reports
`["mathquill", "katex", "KaTeX fonts", "KaTeX_AMS-Regular.ttf", …]`. The negative-control test
"AR-5 the notices check fails when an entry is missing" passes before and after the
implementation: it checks `missingNotices` itself, which reports the removed entries whether or
not the file already has them. The Task 1 and Task 2 tests still pass.

- [ ] **Step 3: Implement.** Edit `public/calculator-notices.txt` by hand or with a one-off,
      uncommitted script; the Step 1 tests fix the content. Format of every entry (the file's
      existing format): a `name version (licence)` header line, a line of exactly 60 `=`, the
      licence text from the package's `LICENSE` file without trailing whitespace, then two blank
      lines before the next header. Two edits:
  1. Replace the stale `katex 0.16.45 (MIT)` entry in place (its header line through the line
     before the next header, `@babel/runtime 7.29.2 (MIT)` at `08c8c76`) with the entry for the
     installed version, `katex <node_modules/katex/package.json version> (MIT)`, rule and
     `node_modules/katex/LICENSE`, followed by the same two blank lines. Every other v1 entry
     stays byte-identical, and no second `katex … (MIT)` header line appears anywhere in the
     file.
  2. Append after the last existing entry, in this order: a section header
     `Karman calculator v2: additional notices`, a rule and the line
     `The v2 calculator bundles the following software under its respective licence.`; then
     `mathquill 0.10.1 (MPL-2.0)`, a rule, the lines
     `Upstream: https://github.com/mathquill/mathquill`,
     `Commit: 1cbc1c4128ec87db3733bc99965522f7d62cde75` and
     `Local changes: vendor/mathquill/PATCHES.md`, a blank line and `vendor/mathquill/LICENSE`;
     then `KaTeX fonts (katex <version>, MIT)`, a rule, the line
     `Font files served with the calculator:`, the 60 file names that `url(fonts/…)` names in
     `node_modules/katex/dist/katex.min.css` (deduplicated, sorted, one per line, exactly as
     `katexFontFiles()` lists them), a blank line and `node_modules/katex/LICENSE`; then one entry
     each for `react`, `react-dom`, `scheduler`, `lucide-react` and `zod`, in that order, with
     header `<name> <version> (<license>)` taken from that package's
     `node_modules/<name>/package.json` `version` and `license` fields, a rule and
     `node_modules/<name>/LICENSE`.
     The file ends with exactly one newline.

- [ ] **Step 4: Run them and see them pass.**

- [ ] **Step 5: Commit**

```bash
git add public/calculator-notices.txt src/components/calculator-v2/math-field/vendor.test.ts
git commit -m "Add MathQuill, KaTeX, KaTeX font and lazy-chunk notices (AR-5)"
```
