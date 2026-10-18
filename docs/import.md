# Question import — rules for the import session

Read this only when you are running or changing the SAT question import
(PDF → CSV → `/admin/questions/import`). Other sessions (site, practice UI,
payments) do not need it, and `CLAUDE.md` deliberately does not repeat it.

## Where things live

| What                          | Where                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Operator walkthrough          | [`question-imports/README.md`](../question-imports/README.md)                                          |
| Paste-ready routine prompt    | [`question-imports/ROUTINE_PROMPT.md`](../question-imports/ROUTINE_PROMPT.md)                          |
| Design + full behaviour rules | [`docs/ingestion/routine.md`](./ingestion/routine.md)                                                  |
| Schema, importer, review UI   | [`docs/ingestion/spec.md`](./ingestion/spec.md)                                                        |
| Why ChatGPT / Gemini          | ADRs [0003](./adr/0003-chatgpt-custom-gpt-imports.md), [0004](./adr/0004-gemini-local-pdf-pipeline.md) |
| Current pipeline state        | [`docs/ingestion/pipeline-as-of-2026-05-24.md`](./ingestion/pipeline-as-of-2026-05-24.md)              |

If the importer changes, update `ROUTINE_PROMPT.md` in the same PR.

## Output contract

- Two CSVs per run, 30-column schema (`CSV_HEADERS` in
  `src/components/admin/BulkImportPanel.tsx`): `questions.csv` (all rows
  `import_status = ok`) and `questions_needs_review.csv`.
- Taxonomy is locked: 8 domains, 89 concept slugs
  (`src/lib/question-bank/taxonomy.ts`). Never invent slugs.
- Dedupe is `(source_pdf, content_hash)`; re-uploads skip existing rows.
  Passages are part of the hash.
- Runs write to `question-imports/runs/<ISO timestamp>/` with an
  `import-log.json`. Processed PDFs move to `done/`.

## Content rules

- **Difficulty**: integer 1–7 (1–2 easy, 3–4 medium, 5–6 hard, 7 rare).
- **Explanations**: per-choice for math and R&W. 60–70% should name the
  SAT trap behind the most tempting wrong choice.
- **Hints**: one sentence, a nudge that does not reveal the operation.
- **Desmos tips**: math only, only when graphing beats algebra; blank otherwise.
- **Passages**: one passage per row, no sharing. Public-domain sources only.
  Literature gets `passage_intro`. Cross-text questions use `passage_a` +
  `passage_b` and leave `passage` blank.
- **Free response**: `question_format = numeric_entry`, no choices, no
  per-choice explanations, `correct_answer` is the value,
  `numeric_tolerance` is the ± range.

## Answer key handling

Solve each question independently, then compare with the printed key.
Vision-process every key page as an image, since text extraction misses
pen marks.

- Inferred matches key → `answer_source = extracted`, `ok`.
- Hand-correction on the key wins over the printed letter →
  `hand_corrected`. If it disagrees with the inferred answer, still use
  the hand-correction and mark `needs_review`.
- Inferred disagrees with key, or no key → `inferred`, `needs_review`.

## Flagging

Every `needs_review` row needs a one-line `import_flag_reason` that tells
the reviewer what to look at.

- `skip`: unsolvable as printed (missing stem, choice, or required diagram).
- `partial_emit`: solvable with cosmetic damage, key disagreement, or a
  visible hand-correction.
- Test: could a competent student answer it from what is on the page?
  Yes → `partial_emit`, no → `skip`. Err toward letting rows land as `ok`.

## Reference

`routine.md` §4–§7 holds the full rules and examples. If this file and
`routine.md` disagree, `routine.md` wins; fix this file.
