# Reviewed question import rules

Only sessions that import or review questions need this file. Design, website
and calculator sessions can skip it. It holds the detailed rules that used to
live in `CLAUDE.md`, moved here word for word.

Related contracts in this folder:
[`paid-processing-retirement.md`](./paid-processing-retirement.md),
[`reviewed-difficulty-contract.md`](./reviewed-difficulty-contract.md),
[`canonical-skill-read-contract.md`](./canonical-skill-read-contract.md),
[`approved-package-import-readiness.md`](./approved-package-import-readiness.md),
[`released-exam-figure-recreation.md`](./released-exam-figure-recreation.md).

## Released-exam ingestion

The old paid AI extraction, grading, figure interpretation and orchestration
entry points are retired. Use reviewed OpenAI content and the retained local
source/duplicate/schema/format checks; do not restore provider calls implicitly.
`npm run questions:import-reviewed -- <reviewed.json> <source.pdf> --dry-run`
validates source identity and explicit numeric difficulty without DB access.
An import remains draft until final source, answer, category, figure, duplicate
and current-version gates pass. See
[`docs/ingestion/paid-processing-retirement.md`](./paid-processing-retirement.md).
Essential app APIs and the separate tutor recap integration remain intact.

Reviewed independent generated answers use `kind=independently_confirmed_generated`,
`printed_answer=null`, the frozen generated-key artifact hash and at least two
distinct independent review hashes. Never label them printed/official keys.
The existing `missing_answer_key` status represents unavailable usable official
mapping, while `verified_answer` and private evidence preserve the independent
answer. Publication remains held; this does not restore paid processing.
The shared writer's opt-in `privateDraft` mode requires reviewed numeric
difficulty, explicit answer provenance and complete stable source identity,
forces `needs_review` so the database computes `is_live=false`, and rejects
replays targeting live/published rows. Legacy
callers retain their previous behavior. This internal option does not make a
preview eligible: exact canonical/legacy bindings and complete dependent-write
checks are required before a disposable local batch. The reviewed CLI still
has no private-draft flag; `--dry-run` does not access the database.

Numeric questions may store an explicitly reviewed `numeric_answer_set` in
answer provenance evidence. Version 1 contains distinct numeric answer strings,
the unchanged stored key, exact displayed/raw question hashes and stable source
identity, key artifact hash, two distinct review hashes and a rationale. The
server validates the binding before grading and keeps the set out of unanswered
student payloads. Missing sets keep single-key grading; malformed/stale sets
fail closed. No automatic solving, tolerance expansion or history regrading.

## How reviewed questions are displayed

These rules apply to the question renderer, `MathText`. Each one changes only
how a question is displayed. Approved source text is never altered.

- Reviewed exam underlining uses explicit `[[u]]...[[/u]]` display markers or
  exact attribute-free `<u>...</u>` source tokens in `MathText`. These are parsed
  into structured React underline spans, never general HTML. Preserve original
  exam text separately, verify each
  marked span against original page pixels, and keep surrounding context outside
  the markers. Malformed markers render literally. Existing KaTeX and blank
  rendering still applies inside each span.
- Reviewed prose italics use explicit `[[i]]...[[/i]]` or exact attribute-free
  `<i>...</i>` display tokens in `MathText`. Verify every span against original
  source pixels; preserve raw source text and answer provenance separately.
  Only balanced, nonempty tokens are structured React italics. Attributes,
  arbitrary HTML, malformed/nested markers and unmatched delimiters stay literal.
  Existing blanks, explicit math and underlined spans remain supported; this
  renderer support does not approve a question version or infer emphasis.
- Reviewed source inline math supports both `$...$` and `\(...\)` in
  `MathText`; display math uses `$$...$$`. Preserve approved source bytes and
  expressions. Do not strip commands, guess bare math or rewrite source packages
  to accommodate a renderer limitation.
- Math question stems and choices opt into narrowly specified exponential
  display support: complete `f(x) = a(b)^(x/n)` lines with matching variables and
  a positive integer denominator, complete numeric `f(x) = −b^x + c` lines,
  the exact comma-delimited inline clause `where f(x) = ab^x + c,`, and
  complete numeric exponential expressions introduced by `equation ` and
  followed by a sentence-ending period, such as `equation y = 5(2)^x + 9.`.
  Numeric bases must be positive. ASCII and Unicode minus signs are supported;
  unary minus stays outside the power, and additive constants stay outside the
  exponent. This changes display only; approved source bytes remain intact.
  Other prose, bare notation and existing explicit math remain unchanged.
- The same Math-only display opt-in supports complete `√(x²) = 24 − 5x`
  equation lines (matching single variable, integer terms) and the complete
  sentence-delimited defining clause `The function f is defined by
f(x) = (1/2)(x + 11).` (matching function/variable, positive integer
  denominator). The radical covers the square only; the stacked coefficient
  fraction leaves the following sum outside it. Source bytes, ordinary prose,
  explicit math and unsupported forms stay intact. Require source-pixel review
  for affected questions on the exact renderer before accepting display.
- Dashes and blanks stored as hyphen and underscore runs (founder, 2026-10-22:
  "any stringing of hyphens together is an em dash, any stringing of
  underscores together is a blank"; "no question should have more than one
  blank"). Display only, in prose (passages, stems, answer choices, table
  cells); approved source bytes keep the original characters. Code:
  `dash-blank-display.ts`.
  - Em dash: any run of 2+ hyphens (`--`, `---`, `-------`), a spaced run of
    3+ (`- - -`), a run split by one line break (`--` then `-` on the next
    line) and a hyphen touching an em dash (`-—`, `—--`) show as one `—`,
    dropping spaces or tabs beside it, so `evolution --- a` reads
    `evolution—a`.
  - Hyphen blank: a run of 5+ hyphens with a space or text edge on both sides
    (`suggests that ------`) sits where SAT prints a blank, so it shows as the
    blank. 5+ hyphens touching a word are an em dash.
  - Left literal: math (`$...$`, `$$...$$`, `\(...\)`), single hyphens and
    `- -` (minus signs such as `5 - -3`; also the OCR break `mid- - twentieth`),
    `--` before a digit (`x--1`), runs touching `|` or `:` (Markdown table rules
    `|---|`, `:---:`), a line of only hyphens in multi-line text (a horizontal
    rule), and anything inside a URL or `` `code` ``.
  - Blank: every run of 2+ underscores, glued to words or not, and spaced runs
    (`_ _ _`) show as the same fixed-width blank line. An underscore run
    followed by the word "blank" (screen-reader text captured with the source:
    `______blank`, `______ blank`, `______ [blank]`) is one blank and the word
    is hidden. Underscores in math, single underscores (`snake_case`), URLs and
    code stay literal.
  - The bare word "blank" counts as a blank only in passages (`treatBlankWord`).
    Stems and choices keep it as a word ("blank sheets of paper",
    "[Blank response field]").
- Single hyphens left with stray spaces (founder, 2026-10-22: "no misformatted
  text"). Display only, prose only. Code: `hyphen-spacing-display.ts`.
  - Lists: when 2 or more lines of a text start with `- `, those lines show a
    `• ` bullet (student notes, timelines). Lines holding `=`, `≤` or `≥` keep
    the hyphen.
  - Spaced minus signs: a text that is only `- 5`, `- 1/6` or `- (5/12)π`, and
    an equation line starting `- 6x + 48px = 96`, show the minus against its
    number (`-5`).
  - Split compounds: `cost- effective`, `three- striped`, `x- intercept` and a
    compound broken at a line end (`xy-` then `plane`, first part 5 letters or
    fewer) show joined with the hyphen (`cost-effective`, `xy-plane`). Kept:
    suspended hyphens before `and`/`or`/`to` (`plant- and animal-inspired`,
    `over- or underrepresented`), a following function word (`metals- among`,
    where the source meant an em dash; fix the source), and a one-letter second
    part (`(t- x)`).
  - After inline math, `\(xy\) -plane` shows as `xy-plane`.
  - Left as typed: suffix notation (`-ly`, `-ti`, `-s`), minus signs in
    equations (`x - y`, `y -x`), and the hyphen as a word joiner (`well-known`).

