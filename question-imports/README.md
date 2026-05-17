# Question imports

PDF → CSV → Karman question bank pipeline.

## How to use it

1. **Drop PDFs in [`incoming/`](incoming/).** SAT practice tests, problem
   sets, College Board released material — anything where each
   page is a question or a short cluster of questions and the
   answer key sits at the end of the document.
2. **Kick off the routine in a fresh Claude Code session.** Paste the
   prompt from [`ROUTINE_PROMPT.md`](ROUTINE_PROMPT.md). It reads every
   PDF in `incoming/`, vision-processes the pages, classifies each
   question against the locked SAT taxonomy, and writes:
   - `questions.csv` — clean rows, ready to go live
   - `questions_needs_review.csv` — flagged rows (inferred answer
     disagrees with key, hand-correction visible, garbled
     formatting, etc.)
   - `import-log.json` — per-run audit trail

   Output goes to [`runs/<ISO timestamp>/`](runs/). Processed PDFs are
   moved to [`done/`](done/) so re-runs only see new files.

3. **Inspect the CSVs.** First few batches especially — eyeball the
   `concept_slug` and `correct_answer` columns to make sure the
   routine is calibrating reasonably. The routine is opinionated
   but not infallible; the CSV step is your safety net before
   anything hits the database.
4. **Upload both CSVs to `/admin/questions/import`.** The importer
   accepts the routine's full 30-column schema. Clean rows go
   live in the question bank; flagged rows land with
   `import_status = 'needs_review'` and are hidden from students
   until you triage them.
5. **Triage flagged rows in `/admin/questions/review`.** Filter by
   flag type / domain / source PDF. For each row: **Accept**
   (optionally pick a curriculum node so the question goes live
   in that node's Learn quiz pool) or **Reject** (DELETE).

## Folder layout

```
question-imports/
├── incoming/         # drop PDFs here
├── done/             # routine moves processed PDFs here
├── runs/             # one timestamped subdirectory per routine run
├── README.md         # this file
└── ROUTINE_PROMPT.md # the prompt to paste into a Claude Code session
```

`incoming/`, `done/`, and `runs/` are gitignored — only the README
and the routine prompt live in version control.

## Re-imports are safe

The importer enforces a unique `(source_pdf, content_hash)` index.
Re-uploading the same CSV silently skips rows that are already in
the database. To force a re-import after editing a question in the
source PDF, delete the affected row in `/admin/questions/review`
first, then re-run the routine.

## When the routine misfires

- **A whole batch is mislabeled.** Likely a prompt regression.
  Open `ROUTINE_PROMPT.md`, adjust the offending rule (e.g.
  "calibrate difficulty against full College Board spread"),
  re-run on the same PDF. Routine is fully resumable from
  `import-log.json`.
- **One row is wrong.** Just hand-edit the CSV before uploading.
  Faster than fixing the prompt.
- **Routine over-flags.** Loosen the `partial_emit` rules in the
  prompt. Routine should err on the side of letting questions
  land as `ok` and trusting the human review on edge cases —
  not the other way around.
