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
