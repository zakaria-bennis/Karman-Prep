# Local changes to MathQuill 1cbc1c4128

Every change to the pinned upstream source is one patch file below. Each is the `git diff` of one
commit made on top of the previous patch, starting from
`1cbc1c4128ec87db3733bc99965522f7d62cde75`, so `git apply` applies them in file-name order (see
the build block in README.md). Nothing else in `mathquill.js`, `mathquill.css` or `LICENSE`
differs from what that build writes.

## Patches

| Patch                                                    | Files                                                          | Change                                                                                                                                                                                                                                                                         | For                  |
| -------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `patches/0001-es-module-export.patch`                    | `src/intro.js`, `src/outro.js`, `Makefile`                     | intro `(function() {` becomes `var MathQuillModule = (function() {`; `outro.js` becomes `return MathQuill;` then `}());` (the jQuery v1 shim goes); the `$(BUILD_JS)` recipe gains a last line `printf '\nexport default MathQuillModule;\n' >> $@`                            | API-15, 01 section 9 |
| `patches/0002-no-window-global.patch`                    | `src/publicapi.ts`                                             | delete `MathQuill.noConflict = …;`, `var origMathQuill = window.MathQuill;` and `window.MathQuill = MathQuill;`                                                                                                                                                                | API-15               |
| `patches/0003-shadow-root-focus.patch`                   | `src/controller.ts`, `src/services/saneKeyboardEvents.util.ts` | `containerHasFocus()` and the paste re-focus check read `activeElement` from `getRootNode()` instead of `document`                                                                                                                                                             | AR-42                |
| `patches/0004-aria-label-is-the-name.patch`              | `src/services/textarea.ts`                                     | `updateMathspeak()` no longer writes the editable textarea's `aria-label` (static math unchanged); a comment says the embedding adapter owns `aria-label`                                                                                                                      | A11Y-3, A11Y-4       |
| `patches/0005-selection-latex.patch`                     | `src/publicapi.ts`                                             | `EditableField` gains `selectionLatex(): string \| null` (the selection's cleaned LaTeX, or `null` when nothing is selected)                                                                                                                                                   | T-5 copy (13)        |
| `patches/0006-strict-bracket-matching.patch`             | `src/commands/math/commands.ts`                                | `matchBrack` drops the interval clause `\|\| { '(': ']', '[': ')' }[this.sides[L].ch] === node.sides[R].ch`                                                                                                                                                                    | T-8                  |
| `patches/0007-ellipsis-in-square-brackets.patch`         | `src/commands/math/basicSymbols.ts`                            | `LatexCmds['.']` builds a `Dot`; typing a third `.` after two `.` directly inside `\left[…\right]` replaces them with `\ldots`                                                                                                                                                 | T-7                  |
| `patches/0008-math-font-stack.patch` | `src/css/mixins/fonts.less`, `src/css/math.less` | `.mq-math-mode` text and variables in `var(--kc-font-math, "Times New Roman", serif)` (the calculator's Times stack), variables italic, no Symbola in any `font-family` | AR-39 (10 tests it) |
| `patches/0009-autocommand-yields-to-operator-name.patch` | `src/commands/math/basicSymbols.ts`                            | in `Letter.createLeftOf` (its `checkAutoCmds` loop), an auto-command match `str` does not fire when a longer suffix of the same letter run (up to `autoOperatorNames._maxLength` letters) is in `autoOperatorNames`, so typed `midpoint` stays one operator name instead of `midpo\int` | T-3, PR-13           |
| `patches/0011-subscript-breaks-out-on-operator.patch`    | `src/commands/math/commands.ts`                                | in `SupSub.finalizeTree`'s `endsL.write`, `breaksOut` (`cursor[L] && !cursor[R] && !cursor.selection` and `ch` in `charsThatBreakOutOfSupSub`) is computed first and the `autoSubscriptNumerals` subscript branch runs only when it is false, so typed `a_2+1` gives `a_{2}+1`; an empty subscript still keeps its first character (`a_+` gives `a_{+}`) | T-6                  |
| `patches/0012-revert-releases-focus-blur.patch` | `src/services/focusBlur.ts`, `src/publicapi.ts`, `src/controller.ts` | `revert()` removes the textarea focus and blur handlers, then clears `blurTimeout` and `textareaSelectionTimeout`, removes the window `blur` listener and hides the cursor (stopping its blink interval, which the cancelled blur would have stopped), so a field reverted while focused leaves no listener or timer; `removeTextareaEventListener` becomes public so `revert()` can call it | AR-60 (10 tests it) |

Number 0010 is reserved for the colour-roles patch a rejected OI-34 would have needed and is not
used; 0011 is made on top of 0009.

## Build options

- `OMIT_FONT_FACE=true` drops the Symbola `@font-face` rule (and with it every CSS `url()`), so the
  sheet loads no Symbola font; patch 0008 maps the families to KaTeX (AR-39).
- `NO_INSTALL=1` because `npm ci --ignore-scripts` ran first; the Makefile then skips its own
  `npm ci`, which would run install scripts.
- Only the `js` and `css` targets are built: no minified file, no `basic` build and no fonts are
  vendored.

## Adapter settings (no source change)

These behaviours come from the options the calculator's adapter passes, not from a patch:

- `disableCopyPaste: true` (AR-14, T-5): the calculator's own clipboard bridge owns copy, cut and
  paste; the adapter also prevents their default actions on the textarea.
- History chords (`Ctrl-Z`, `Meta-Z`, `Ctrl-Shift-Z`, `Meta-Shift-Z`, `Ctrl-Y`) are prevented in
  `overrideKeystroke` and never reach MathQuill, so the calculator's own undo and redo handle them
  (KB-2).
