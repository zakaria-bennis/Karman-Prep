# Karman Prep — Bug & Feature List (2026-04-28)

Captured from a working session with the user. Source: voice-dictated bug list
on 2026-04-28; diagnostics run same day.

---

## Sequencing

User said "in whatever order makes sense" (not strictly sequential). The plan:

| Order | Item                                                                                 | Effort    | Status                               |
| ----- | ------------------------------------------------------------------------------------ | --------- | ------------------------------------ |
| 1     | #1 Auto-pick node + slug typeahead                                                   | ~1 day    | Blocked on design answer (see below) |
| 2     | #5 + #6 Review UI: show all 4 explanation surfaces; collapse-by-default + expand-all | ~1 day    | Ready                                |
| 3     | #7 Drag-and-drop CSV dropzone                                                        | ~0.5 day  | Ready                                |
| 4     | #2 Confirm filename diagnostic with user                                             | varies    | Awaiting user verification           |
| 5     | #3 + #4 Web upload PDF → 4-session orchestration → folder-watch ingest               | 1–2 weeks | Architecture project — not started   |

The smaller items ship fast and remove the daily friction in the review
workflow. The big architecture (#3 + #4) is one project, not two.

---

## #1 — Auto-pick node + searchable slug typeahead in Review UI

**User pain.** When accepting a question in the Bank/Flagged Review tabs, the
admin has to pick a node from an 89-node list manually. Way too slow.

**Want.**

- Default node auto-picked from the row's `concept_slug`.
- Search box that filters nodes by keyword if the auto-pick is wrong.
- Same UX on both the Bank tab and the Flagged tab.

**State of the code (after slug↔node unification on 2026-04-28).**

- Slugs are 1:1 with curriculum nodes now. Every CSV row's `concept_slug`
  maps to exactly one curriculum node via `nodeIdFromSlug(slug)` in
  `src/lib/question-bank/taxonomy.ts`.
- `searchSlugs()` helper already exists in the same file.
- Review UI today: `src/app/admin/questions/review/ReviewClient.tsx`.
- This bug is now ~30 lines of UI: import `nodeIdFromSlug` + `searchSlugs`,
  default-pick the node, render a typeahead input that filters via
  `searchSlugs`. Half-day work.

---

## #2 — Wrong source_pdf filename ("2025-12-USV2") on imports of a different PDF

**User pain.** Uploaded a CSV from a different PDF; review UI still shows
`source_pdf = 2025-12-USV2`.

**Diagnostic verdict: not a code bug.** The CSV → DB → UI chain is intact.

- No hardcoded fallback string exists anywhere in the repo (verified via grep
  for `2025-12-USV2`, `202512usv2`, `202512`, `USV2` — zero matches).
- `BulkImportPanel.tsx:103-143` parses by header name (not position).
- `actions.ts:401` passes `source_pdf` straight through to `insertQuestion()`.
- `quiz.ts:158` inserts `source_pdf: input.source_pdf ?? null` with no
  fallback.
- DB schema (migration `020_question_ingestion.sql:31`) has no default value.
- `ReviewClient.tsx:316` displays the column value with no fallback text.

**Most likely cause.** The user re-uploaded a CSV from the previous routine
session, which had `source_pdf = "202512usv2.pdf"` baked into every row by
design (the routine writes the PDF being processed into every row's
`source_pdf` column).

**Action.** User to verify which CSV was actually uploaded. If it really
wasn't from `202512usv2.pdf`, send the file and rediagnose. Otherwise close
as expected behavior.

---

## #3 — Web upload PDF → 4 separate Claude Code sessions process by module → CSVs flow back

**User pain.** Single Claude Code sessions can't process a 75-page PDF (image
dimension cap blocks reads past ~30 pages at 200 DPI). Want a web button
that uploads a PDF, splits into 4 module-sized chunks, fans out to 4
Claude sessions, and merges results.

**Architecture recon (2026-04-28).** Substantial gaps:

- ✓ R2 binding (`env.R2`) wired in `wrangler.toml:64-67`
- ✓ Clerk admin gate works (`actions.ts:48-54` `guardAdmin()`)
- ✓ One cron trigger exists (`0 6 * * *` daily, syncs SAT dates)
- ✗ No Cloudflare Queues / Durable Objects / KV bindings configured
- ✗ No PDF-upload endpoint anywhere
- ✗ No Anthropic SDK in `package.json`; no `ANTHROPIC_API_KEY` in env;
  worker cannot invoke Claude today
- ✗ The `question-imports/runs/<ts>` folder structure is filesystem-only
  on the dev's machine — not in cloud storage

**What needs to be built (rough shape).**

1. Multipart PDF upload endpoint at `/api/admin/pdf-upload` — drops to
   R2 under `question-imports/uploads/<ts>/<filename>.pdf`
2. Cloudflare Queue binding + 5 messages enqueued: 1 "extract answer key"
   - 4 "process module N" jobs with the answer-key result fanned in
3. Queue consumer at `/api/workers/process-pdf-job` — adds Anthropic SDK
   dependency, calls Claude API with the PDF page range as multimodal input
4. Each consumer writes its CSV to R2 under
   `question-imports/runs/<ts>/<module>.csv`
5. Folder-watch poller (cron) reads new CSVs from R2 and ingests them into
   the bank — see #4

Coupled with #4. Estimated 1–2 weeks of focused work, including auth,
error handling, partial-failure recovery, and progress UI.

---

## #4 — Auto-import CSVs from a watched folder into review/flagged tabs

**User pain.** After the routine produces CSVs, the admin still has to
manually upload them. Want the review/flagged tabs to continuously poll a
folder and ingest anything that lands.

**State of the code.**

- Today: import is exclusively manual via `BankImportClient.tsx:110-124`
  (client-side parse → server action → direct DB insert).
- There's no folder-watch poller, no R2 inbox path conventions, no
  ingest-from-storage code path.

**What needs to be built.**

1. Cron worker that scans `r2://karmanprep-question-images/question-imports/runs/`
   for unprocessed CSVs (use a sentinel like `_processed` marker file).
2. Streams each CSV row through the same `actionBulkImport` codepath as
   today's manual import.
3. Polling cadence — open question for the user. Suggested: every 5 min
   on cron, plus a manual "scan now" button on `/admin/questions/import`.

**Coupled with #3.** Both should ship as one architecture project rather
than two phases — the storage path conventions need to match.

---

## #5 — Right + wrong answer explanations in CSV; step-by-step + Desmos for math

**User pain.** Believes the CSV doesn't capture per-choice explanations,
hint, or Desmos strategies.

**Diagnostic verdict.** The schema **already has all four fields**:

- `quiz_questions.explanation_text` — right-answer walkthrough
- `quiz_questions.explanation_per_choice` (JSONB) — per-choice explanations
  `{A: "...", B: "...", C: "...", D: "..."}`
- `quiz_questions.hint`
- `quiz_questions.desmos_strategy`

The CSV's 30-column header carries `explanation_text`, `explanation_a/b/c/d`,
`hint`, `desmos_strategy` — all are correctly persisted by the importer.

**Real issue.** The Bank/Flagged Review UI (`ReviewClient.tsx:396`) shows
ONLY `explanation_text` — per-choice explanations, hint, and desmos are
written to the DB but not rendered in the review surface. The per-node
`QuestionEditor.tsx:520-549` shows all four when expanded; the student
preview correctly shows only the hint.

**This collapses into #6.** The fix is rendering, not schema.

---

## #6 — UI: show all explanations + hint + desmos in Review tab; collapse-by-default with expand-all/collapse-all

**User pain.**

- Review cards are always expanded; long lists are hard to scan.
- Many fields the admin needs to see (per-choice explanations, hint,
  desmos strategy) are not rendered in the Review tab.

**Want.**

- Review cards collapsed by default. Click a card to expand.
- Expand-all / Collapse-all toggle at the top of the list.
- When expanded, show: question, choices, correct letter, all per-choice
  explanations, the right-answer walkthrough, the hint, and (for math)
  the desmos strategy.

**Implementation surface.** `src/app/admin/questions/review/ReviewClient.tsx`.
Read the per-choice JSONB column and render alongside the existing
`explanation_text`.

**Tied to #5.** Ships as one PR.

---

## #7 — Paste-CSV-from-Finder doesn't work

**User pain.** Copies a CSV from Finder, pastes into the import area,
only the filename pastes — not the file contents.

**Diagnostic note.** This is a browser-platform constraint, not a Karman
bug. Cmd+V from Finder gives the page only the filename string; the
browser cannot read the file's bytes via clipboard from a native file
selection.

**Real fix: drag-and-drop dropzone.** Drop a file from Finder onto a
target area; the browser exposes the bytes via `DataTransfer.files`.
Standard pattern, works in every modern browser, no permissions needed.

**Implementation surface.** `src/app/admin/questions/import/BankImportClient.tsx`.
Add a dropzone above the existing "Choose File / Paste CSV" UI; the
dropped file flows through the same parse path as the file picker.

---

## Working notes

- User prefers methodical phased work; ask design questions before coding.
- Voice dictation is in use — occasional fragments / typos.
- Never commit without explicit ask; never deploy without explicit ask.
- Type-check after each major change: `npx tsc --noEmit`.
- Branch: `zakaria/dev` (or current worktree branch).
