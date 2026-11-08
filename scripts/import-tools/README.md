# kimport: question import tools

## What this does (plain English)

- It finds questions that are the same question twice, in the live bank and in all the files we captured.
- It writes the SQL to hide live duplicates and to publish new questions safely. It never runs SQL itself.
- Every live write waits for your OK. Every SQL file also comes with a `.dryrun.sql` twin that does the same checks and then rolls back, so nothing is saved.
- Nothing is ever deleted. "Un-publish" only sets the row back to `needs_human_review`.
- It keeps a problem lane for questions that cannot be fixed yet, and hands reviewers small slices.

## Setup

Run everything from the repo root. `PIPE` is the working folder (outside Box Drive, which is read-only). `k` runs the tool; it uses the repo-relative path, so it works in any checkout (zsh does not split a `k` variable, so use a function):

```
PIPE=/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/pipeline
k() { python3 -I scripts/import-tools/kimport-cli.py "$@"; }
```

**Dry runs.** Each SQL file has a twin, for example `unpublish.sql` and `unpublish.dryrun.sql`. The twin is identical except the final `COMMIT;` is `ROLLBACK;`. To try a file through the connector, run ONLY the `.dryrun.sql` file, exactly as it is. Never wrap a real `.sql` file in your own `BEGIN ... ROLLBACK`: those files already contain `BEGIN;` and `COMMIT;`, so they would save for real.

Tests: `python3 -I -m unittest discover -s scripts/import-tools/tests -t scripts/import-tools`

Times are ISO-8601, for example `--now 2026-10-21T09:00:00Z`.

## Autopilot (the usual way now)

```
k autopilot --pipe $PIPE            # stage, seal and publish every new READY batch, no prompts
k autopilot --pipe $PIPE --dry      # read-only: export, build, run every dry run; writes nothing
k autopilot --pipe $PIPE --max-rows 300
k autopilot --pipe $PIPE --retry 'r2-fix-*'   # also take folders the ledger lists as refused or published (by name pattern)
k autopilot-refresh --pipe $PIPE --run auto-<timestamp> --now <time>   # the after-run step below, for an earlier run
```

The founder gave a standing OK to publish rows that pass every automatic check. `k autopilot` runs the bulk sequence (pipeline/bulk-1/RUN.md) by itself: writer lock for the whole run, export, `k stage --batches --skip-refused`, every `.dryrun.sql`, stage intent, stage files, readback, `k seal --hold-failing`, fresh export, `k publish --bulk`, publish intent, every publish dry run, publish files, visible count, intent closed, claims of published rows released. Each run's files are in `$PIPE/auto-<timestamp>/` with `run.log`. A passing connection error is retried (a write only after its dry-run twin shows it did not land). Any other error stops the run: a publish stopped part-way is rolled back (dry run first) and its intent closed as `rolled_back`; a write that never ran is closed as `not_applied`; a stage stopped part-way or a readback that differs leaves its intent open, so nothing runs again until a person has looked. With no new READY batch it returns at once.

- `$PIPE/autopilot-state.json`: every batch folder already handled (published, held, refused, stopped) with its run, plus the rows held at seal. Batches listed there are never staged again. `k autopilot-record` enters a run done by hand (bulk-1 is recorded).
- `$PIPE/autopilot-status.json`: the factory view after every run: last run and result, a plain-English message, published per run, visible count, rows held, refusals by reason, batches waiting, last error.
- **Held at seal.** `k seal --hold-failing --lane $PIPE/lane.json --now <time>` seals the rows the app's catalog scope check accepts and writes the others to `held.json` with the reason; they go into the lane as `classification_review` and are not published.
- **Corrected batches.** A batch whose rows are all rows held earlier (same stable ids) is an evidence update, not a new stage: the drafts are read back, every question, choice and answer key column must equal what the corrected row would insert (only `raw_model_response` may differ), the corrected evidence must pass the seal check, and `evidence-NN.sql` replaces only that column under the same locks and snapshot guards. The rows then go through readback, seal and publish with the rest; their lane items are resolved when they go live.
- **QA corrections.** A batch of corrected versions of questions `k qa hide` took off the site goes back in place, on the same rows, with the stage files (see QA corrections below).
- **Corrected batches for live rows.** A fix batch (folder `...-fix-<n>`, or READY saying "corrected evidence") whose rows are already published is an evidence-only correction of the live rows (`kimport/live_fix.py`), run before any stage file: a fresh read-only readback of the live rows; every question, choice and answer key column the corrected row would write (the same `ts/stage-rows.ts` importer path stage uses) must equal the live row except the three columns publish sets; the evidence may differ only in the skill review record (`D_original_record`, `independent_D_record`, `independent_D_review_sha256`, `D_classification_*`) and the bookkeeping naming the corrected batch (`schema`, `approved_tags.pilot_row_sha256`, `approved_tags.tag_binding_manifest_sha256`). The new evidence keeps `student_publication_allowed: true` and the stored `question_payload_sha256`; run through `ts/seal-readback.ts` against the live row it must pass the app's scope check, allow publication and recompute exactly the stored seal. `live/live-evidence-NN.sql` (one transaction per chunk, export fingerprint guard, each row locked and matched to its snapshot) changes only `raw_model_response`; each has a `.dryrun.sql` twin and `live-rollback-NN.sql` puts the old evidence back. Intent `evidence_live`; readback verified; claims of corrected rows released. The status file counts them in `evidence_corrected_total`.
- **Duplicates of live rows and the duplicate map.** After every run, rows refused because they duplicate a live row (same comparison key, content hash, normalized text or source question; not typo-level or in-run matches) go in the lane as `already_live` (resolved; `k lane slice` never hands them out) and are dropped from every claim. After a run that published anything, the autopilot takes a fresh export and re-runs `k corpus` with it (same C index, ledger and lane; `corpus/founder_decisions.json` is re-applied), so occurrences duplicating newly live questions become members and are not sliced; a published occurrence that still comes out canonical is recorded as `already_live` too. `corpus_unique_not_live` in the status file is the latest count.
- **Other refusals go in the lane.** After every run (not dry runs), each row of a batch refused whole at stage (for example a stage-rows.ts error or a preflight refusal) and each refused row that is not a duplicate (figure gate, would be held again, other) goes in the lane as `extraction_repair` with the detail `stage refused (<batch>): <first reason>`, so a reviewer sees it. Rows refused as duplicates, live rows, items already live or published, and items already open are left alone; a parked item stays parked. `refused_to_lane` in the run record is the count.

## The sequence (by hand)

**O1. Lock and export (no OK needed).**

```
k lock acquire --path $PIPE/writer.lock --holder <your-name> --now <time>
```

Export with `k export --out $PIPE/live-<date>.json` (read-only). It runs the `sql/live_export.sql` row query in 100-row pages through the supabase CLI (10-row pages for a page that keeps failing, retries on a dropped connection), reads the bank's count and fingerprint before and after, and keeps the file only when both agree with the rows; otherwise it starts over. Each row's `raw_model_response` is cut down to its `student_publication_allowed` flag, the only part any export reader uses, so the file is about 6 MB instead of 26. Running `sql/live_export.sql` whole through the connector still works but often fails on the large result. It is one JSON object with `exported_at`, `row_count`, `fingerprint` and `rows`. Every tool reads it. There are no ledger counts to refresh by hand: `corpus` (O7) takes live status from this export.

**O2. Read back US V2 RW M2 Q11 (no OK needed).** Read the row through the connector and record the outcome:

```
k intent list --log $PIPE/intents.jsonl
k intent close --log $PIPE/intents.jsonl --intent-id <id> --outcome <outcome> --readback-sha256 <sha> --now <time>
```

**O3. Sweep (needs your OK on the un-publish list).**

```
k sweep --export $PIPE/live-<date>.json --out $PIPE/sweep/
```

Produces `groups.json`, `report.md`, `unpublish.sql`, `republish.sql`. You read `report.md`. Typo groups that tie go to "typo_review", and groups with a figure (tables, images, graphs, choices that are tables) go to "figure_review"; nothing is removed for those. **Needs your OK.**

For each typo_review or figure_review group, a person looks at the copies and picks the one to keep. Then:

```
k sweep resolve --groups $PIPE/sweep/groups.json --export $PIPE/live-<date>.json --group <n or a copy id> --keep <id> [--remove <id,id>] --out $PIPE/sweep/resolve-<n>/
```

`--group` is the group's position in `groups.json` (counting from 1) or any copy id in it. `--remove` defaults to every other copy; name a subset when some "copies" turn out to be different questions (a figure group is grouped by text only). Ids outside the group are refused. It writes the same guarded `unpublish.sql` and `republish.sql`, with `.dryrun.sql` twins. **Needs your OK**, like O4.

**O4. Un-publish (live write, from your O3 OK).** Run `unpublish.dryrun.sql` through the connector first (it rolls back), then run `unpublish.sql` for real. Do the same for each `resolve-<n>/` folder you approved. Re-export to `$PIPE/live-<date>-2.json`, run the sweep again, and confirm the only groups left are figure groups whose copies a person found to be different questions. Before O6, every exact and ocr_typo group must be un-published and every figure_review or typo_review group resolved (exact table duplicates are figure_review groups, and they would block migration B). `republish.sql` undoes it (it has a `republish.dryrun.sql` twin). Once migration B is in, `republish.sql` cannot bring back an exact duplicate: the unique rule refuses a second live copy with the same key, so that block stops with a duplicate-key error and nothing changes.

**O5. Migration A and backfill (live write). Needs your OK.**

Migration A (`supabase/migrations/20261021000000_question_comparison_key.sql`) is applied when this branch merges to `main` (`db-deploy.yml` applies new migrations to production), or by `npm run db:push`. It only adds the empty `comparison_key` column. Migration B is not in `supabase/migrations`, so neither path applies it (see O6).

```
k backfill --export $PIPE/live-<date>-2.json --out $PIPE/backfill.sql
```

Produces `backfill.sql` and `backfill.dryrun.sql` (keys look like `kn-2:<sha256>`). Run the `.dryrun.sql` first, then `backfill.sql`. Both end with a `SELECT` that prints `rows_still_null`. Some rows stay without a key by design: image, graph and choice-table figure rows, rows with a broken answer key, and rows whose format disagrees with their choices.

The comments at the end of `backfill.sql` count the skipped rows twice: once for live rows (not archived, publish-ready) and once for the rest. To check live rows, run this after the backfill. It leaves out figure rows the key cannot represent, so the number should equal the live line's broken-answer-key plus format-mismatch count (0 when there are none), because every other live row now has a key:

```
SELECT count(*) FROM public.quiz_questions q WHERE q.comparison_key IS NULL AND q.archived_at IS NULL AND q.publish_status IN ('publish_ready','publish_ready_with_verified_repair') AND (q.figure_kind IS NULL OR q.figure_kind = 'table') AND q.image_url IS NULL AND q.image_storage_path IS NULL AND q.figure_svg IS NULL AND q.figure_graph_data IS NULL AND q.figure_chart_data IS NULL AND q.figure_geometry_data IS NULL AND NOT EXISTS (SELECT 1 FROM public.answer_choices c WHERE c.question_id = q.id AND c.choice_table_data IS NOT NULL);
```

Archived rows are keyed too. That is harmless: the unique rule and the publish duplicate check ignore archived rows.

**O6. Migration B (live write, separate PR). Needs your OK.**

Migration B (the unique rule) lives at `scripts/import-tools/sql/migration_b_unique_comparison_key.sql`, outside `supabase/migrations`, so merging this branch never applies it. Add it later, in its own PR, as `supabase/migrations/<YYYYMMDDHHMMSS>_question_comparison_key_unique.sql`, only after O5 is verified and this check returns no rows:

```
SELECT comparison_key, count(*) FROM public.quiz_questions WHERE comparison_key IS NOT NULL AND archived_at IS NULL AND publish_status IN ('publish_ready','publish_ready_with_verified_repair') GROUP BY 1 HAVING count(*) > 1;
```

If it returns rows, a live duplicate is left: run the sweep again and finish O4 first. Merging that PR (or `npm run db:push`) applies it. It fails safely, changing nothing, if a live duplicate remains.

**O7. Corpus count (no OK needed).**

```
k corpus --c-index <final-current-plus-partial-question-records-*.json> --ledger <current-readiness-ledger.json> --export $PIPE/live-<date>-2.json --out $PIPE/corpus/ --lane $PIPE/lane.json
```

Produces `clusters.json`, `founder_pairs.json`, `report.md`. Occurrences the C index cannot give text for (none, a text for an older B version with no newer C text on disk, or a text that does not parse) can be filled from hand re-read texts with `--extra-c-records <file>` (default: `reread-records.json` in `--out`, if present, so the autopilot's re-runs keep them). Each record names the B package and page image it was read from; it is used only when those match the ledger, and `clusters.json` `inputs.load` says how many were used or refused. A question that is open or parked in the problem lane is never picked as the canonical copy, so promotions made by `lane` survive a re-run (`--lane` defaults to `lane.json` in `--out` or one folder up). `--decision-log` names the saved answer log if it is not `founder_decisions.json` in `--out`. The summary line gives the unique count to compare against 10,000.

**New exam forms** (captured after the readiness ledger; `pipeline/new-exams/`). Their occurrences are in a supplementary ledger `new-exam-ledger.json` (rows shaped like readiness-ledger items, `"origin": "new_exam_capture"`, bucket `new_exam`, holds such as `new_exam_visual_review`, `new_exam_key_not_official`, `new_exam_identity_inferred`) and their transcribed texts in `new-exam-c-records.json` (the same `kimport-reread-records-v1` file shape, records with `"origin": "new_exam_capture"`, the text and its sha256, the key, `answer_kind` `official` only for a printed key, and the copied source PDF sha256). `k corpus` reads both from `--out` by default (or `--extra-ledger` / `--extra-c-records`, each repeatable); a record is used only when its source hash matches its ledger row and its text still has the recorded hash. `k slice` and `--release-done` read the new-exam ledger too (default: next to `--clusters`, or `<lane folder>/corpus/`). A transcriber-solved key is never `official`: it still needs two independent solves at review.

**O8. Close matches (you answer).**

```
k pairs render --pairs $PIPE/corpus/founder_pairs.json --out $PIPE/corpus/founder_pairs.html
```

Send you the HTML page. You answer same or different and copy back the result into `decisions.json`:

```
k pairs apply --pairs $PIPE/corpus/founder_pairs.json --decisions $PIPE/corpus/decisions.json --clusters $PIPE/corpus/clusters.json --now <time>
```

A first pass can sort the pairs for you, so you only look at the unclear ones (writes files, applies nothing):

```
k pairs auto --pairs $PIPE/corpus/founder_pairs.json --clusters $PIPE/corpus/clusters.json --out $PIPE/corpus/auto-pairs
```

It skips pairs already in `founder_decisions.json` and writes `same.json`, `different.json`, `unclear.json`, `sample.md` (counts and random examples with the differing words side by side) and `decisions-proposed.json` (same and different only, keyed by pair id: the `--decisions` file for `pairs apply`, once you have OKed the sample). Same: identical after formatting-only changes (quotes, italics, dash spellings, spacing, LaTeX vs unicode math, `[Underlined portion: ...]` vs an underline, question-number and Section lines, a prompt printed before instead of after the passage) or only scanning typos within the typo rule. Different: a number, name, word, variable or correct answer differs. Unclear: everything else (a blank, sentence or choice on one side only, punctuation, a lost sign or exponent, two real words a letter apart, a text that relies on a table). Rules: `kimport/autopairs.py`.

Your answers are appended to `founder_decisions.json` next to `clusters.json`. Re-running `corpus` applies them again; answers that no longer match are reported, not fatal.

**O9. Review, publish (live write per batch). Needs your OK for each batch.**

```
k slice --reviewer <name> --clusters $PIPE/corpus/clusters.json --lane $PIPE/lane.json --ledger <ledger> --now <time>
k lint --reviewed <batch>-reviewed-import-ready.json --frozen <batch>-frozen-inputs-import-ready.json --clusters $PIPE/corpus/clusters.json --lane $PIPE/lane.json --now <time>
```

**Publish gate (no broken question goes in).** Every "fail"-level check of the live QA audit (`kimport/qa_static.py` `LEVELS`, with `ts/qa-check.ts --gate`, judged the way main's question screen displays the text: hyphen runs as em dashes, `______ blank` as one blank, list bullets, currency as prose) runs on every new or corrected row before anything is written (`kimport/qa_gate.py`). `k lint` pulls a failing row to the lane as `PF_QA` (`extraction_repair`, the detail names the check, for example `PF_QA: mojibake: choice C: ...`) and prints the "review"-level findings as `warning <id> <check>: ...` lines without pulling the row. The stage prechecks run the same checks again on the row the importer builds (`k stage`, `k stage --batches`, QA correction batches, so the autopilot too) and refuse it with `qa gate: <check>: <detail>` (status file bucket `qa_gate`; the autopilot hands it to the lane like other refusals). The catalog-lane seal checks stay with seal and publish. Since the independent audit of 2026-10-26 (`pipeline/audit-20261026/REPORT.md`) the fail level also has (`kimport/qa_bank_checks.py`): `plain_text_math` (a math question shows hand-typed math outside math delimiters: a caret exponent such as `(1.85)^x` or `x^2`, a root written `√(...)`, a fraction written `(a)/(b)` or with a slash (`g = 14 − x/23`, `(5/16)x`, `−11/8`, `x/y`), a hyphen for a minus sign (`y = -2x`, `(-9, 0)`, `3-x`), a star for times (`68*68`), or a number left as text just before the typeset math that continues it (`172,000` before `(0.035)^x`); prose slashes such as and/or, km/h, g/mol, `5 m/s` and dates such as 10/26/2026, and "a 3-hour trip", do not count), `money_as_math` (two dollar amounts with prose between them that main's MathText pairs as `$...$` math, by main's currency rule ported from `currency-dollar-delimiters.ts`, for example "round (like $25.00), just-below (like $24.99)") and `copyright_line` ("©2019 by Name", "Copyright 2004", "(c) 2010"). **Live-bank checks** (`kimport/bank_gate.py`, the second audit of 2026-10-26: 1cb952fe went live as a QA correction although it is the same question as live 725a09a2). Stage (`k stage`, `k stage --batches`, so the autopilot), the QA correction precheck and the publish precheck compare every row with the live rows of the run's export: `live_duplicate` refuses a row that is the same question as a live row, by `k qa certify`'s rule (`kimport/qa_dupes.py`: formatting, choice order and line order set aside, a "Notes:" heading or list bullets dropped, and the founder's rules: up to three words that differ only in spelling, suffix or a typo, or that are added or left out ("[planter]", "at Fairmont University", "the equation shown", also when a part of the text moved), with the same numbers and math signs, the keyed answer unchanged, and nearly the same punctuation); `key_conflicts_printed_twin` (`kimport/qa_keys.py`) refuses a row whose key is generated when a live twin with a printed key (the same passage and stem by the same rule, or in Reading and Writing word-for-word the same choices with a passage and stem at least 0.6 alike) keys another of its choices. Both are fail level, so stage refuses with `qa gate: <check>: ...`, the publish precheck refuses the publish (`duplicate check failed: <id> duplicate: same question as live <id>`), certify fails them bank-wide, and `k lint --export <live export>` pulls them as `PF_QA` (lint has no bank without `--export`). A QA correction's hidden or sweep twins are never live, so they do not count. The review level has `numeric_rejects_sat_decimal`: a typed-answer key that is a fraction, a repeating decimal or a decimal too long for the box, whose accepted answers (the reviewed numeric answer set, else the key, within `numeric_tolerance`, graded as main's `evaluateQuizAnswer`) refuse a decimal the SAT accepts (cut off or rounded to fill 5 characters, 6 with a minus sign: 2/7 as .2857, 0.285, 0.286).

Then stage and publish. Publishing one batch goes in this exact order (the full
per-batch command list, with every database write marked, is in
`$PIPE/STAGE_HOWTO.md`):

1. **Stage** the batch: on a fresh export,

   ```
   k stage --batch $PIPE/batches/<batch>/ --export <export> --pdf <source exam pdf> --out $PIPE/batches/<batch>/stage/ --intents $PIPE/intents.jsonl
   ```

   writes `stage.sql` (+ `stage.dryrun.sql`), `readback.sql`, `stage-preview.json` and `precheck.json`. The rows are built by the app's own `importQuestion()` (`ts/stage-rows.ts` runs it against a recording client, after the same frozen-manifest gates as `import-json-direct.ts`), inserted as private drafts with `comparison_key` set. The precheck is publish's duplicate check (key and typo level, archived rows ignored) plus the source tuple, content hash and normalized text already in the export; refused rows are listed in `precheck.json` and nothing else is written unless `--skip-refused`. `stage.sql` opens with the export fingerprint guard. Open a `stage` intent, dry run, **your OK**, run `stage.sql`, then run `readback.sql` and seal it:

   ```
   k seal --readback <saved readback.sql result> --batch $PIPE/batches/<batch>/ --out $PIPE/batches/<batch>/stage/sealed-preview.json
   ```

   It checks every stored row equals what was inserted, seals each row with the app's `catalogQuestionPayloadHash` (`ts/seal-readback.ts`) and writes `private-readback.json`, `private-scope.json` and `sealed-preview.json`. Close the intent.

2. **Export**: `k export --out $PIPE/live-<date>-3.json`.
3. **Backfill, if needed**: `k publish` refuses when some other keyable row has no key (rows staged or added since the last backfill, for example other batches). The batch's own rows never need it: `publish.sql` sets their key. If it refuses, run `k backfill` on that export, apply it (dry run first), and go on.
4. **Private readback**: the `stage/private-readback.json` that `k seal` wrote.
5. **Fresh export** after the readback (the builder refuses an export older than the readback): `$PIPE/live-<date>-4.json`.
6. **Build**:

   ```
   k publish --batch <batch> --readback $PIPE/batches/<batch>/stage/private-readback.json --sealed $PIPE/batches/<batch>/stage/sealed-preview.json --export $PIPE/live-<date>-4.json --intents $PIPE/intents.jsonl --out $PIPE/batches/<batch>/
   ```

   Produces `publish.sql`, `rollback.sql`, their `.dryrun.sql` twins, `keys.json`, `precheck.json`. `precheck.json` holds `publish_sql_sha256` (the sha256 of `publish.sql`) and `question_ids`. The builder refuses while any intent is open, so the intent is opened after it.

7. **Open the intent** with the values from `precheck.json`:

   ```
   k intent open --log $PIPE/intents.jsonl --batch <batch> --action publish --question-ids <question_ids, comma-separated> --sql-sha256 <publish_sql_sha256> --now <time>
   ```

8. Run `publish.dryrun.sql` (it rolls back). `publish.sql` starts with a guard that stops if the bank changed since the export.
9. **Your OK** for the batch (or one standing OK, if you give it).
10. Run `publish.sql`.
11. **Read back** the rows.
12. `k intent close --log $PIPE/intents.jsonl --intent-id <id> --outcome verified --readback-sha256 <sha> --now <time>` (`rolled_back` or `not_applied` if it did not go through).

**Needs your OK for each batch.**

**Many batches at once (bulk run).** The same steps for every batch folder with a READY file, as one run:

```
k stage --batches $PIPE/batches/*/ --name <run> --export <export> --out $PIPE/<run>/stage/ --intents $PIPE/intents.jsonl --skip-refused --chunk-size 200
k seal --readback <saved readback-NN results ...> --preview $PIPE/<run>/stage/stage-preview.json --out $PIPE/<run>/stage/sealed-preview.json
k publish --bulk --batch <run> --readback $PIPE/<run>/stage/private-readback.json --sealed $PIPE/<run>/stage/sealed-preview.json --export <fresh export> --intents $PIPE/intents.jsonl --out $PIPE/<run>/publish/ --chunk-size 200
```

Each batch is checked as `--batch` checks it, with its own exam PDF, found by the reviewed rows' `source_document_id` and `source_pdf` file name: first `<pipeline>/new-exams/<source_document_id>/source/<source_pdf>` (new-exam forms), then `<exams>/<source_document_id>/<source_pdf>` (ledger exams, `original_exam.pdf`), checked against the frozen manifest and the rows' `sourceVersion.sha256`. The precheck also compares every row with every other row of the run. With `--skip-refused`, refused rows and whole refused batches are listed in `precheck.json` and left out. The Management API refuses a request over a few MB, so `--chunk-size` splits the SQL into `stage-01.sql`, `stage-02.sql`, ... (and `publish-NN.sql`, `rollback-NN.sql`), each one transaction. Each chunk checks that the bank, leaving out this run's own rows, is still the exported bank, so the chunks can run in any order, each chunk's dry run works on its own, and any other change to the bank stops the chunks not yet run. Readback is split into `readback-NN.sql` of 100 rows. `precheck.json` lists the chunks; its `stage_sql_sha256` / `publish_sql_sha256` is the sha256 of all chunk files joined in order (use it for the run's one intent).

**Figure lane (the founder checks every figure).** Figure questions are rebuilt in `$PIPE/figures/<occurrence id>/` (`original.png` source crop, `figure.json` with the figure fields as the quiz reads them plus stem, choices and answer, `status.json` with `drafting`, `ready_for_founder`, `approved` or `rejected`, a round and a history). The founder decides at `/dev/figure-review` (dev server only, localhost only; J approve, F reject with a note, U undo), which writes `status.json` at once.

```
k figures slice --reviewer <name> --clusters $PIPE/corpus/clusters.json --lane $PIPE/lane.json --ledger <ledger> --now <time>
k figures submit --figures $PIPE/figures --id <id> --by <name> --now <time>   # checks figure.json, then ready_for_founder
k figures rework --figures $PIPE/figures [--reviewer <name>]                 # rejected, with his notes
k figures no-figure --figures $PIPE/figures --id <id> --reviewer <name> --note <what original.png shows> --now <time>
k figures status --figures $PIPE/figures
```

`slice` takes one copy per not-live figure_review group plus open `needs_figure` lane items, and never hands out an id (or another copy in its group) that already has a folder. **Figure gate** (`kimport/figure_gate.py`, one check for stage, bulk stage and publish, so the autopilot too): a row with a figure, or with a figure folder, is refused (`figure gate: ...`, counted as `figure_gate`) unless its `status.json` is `approved`, `figure.json` is byte for byte the file he approved (`approved_file_sha256`), and the reviewed batch row, the importer's row and (at publish) the private readback row carry exactly figure.json's figure fields (`figure_kind`, table, chart, geometry, SVG, alt text, table choices; null and absent are equal). Rows without a figure are not affected. **No figure after all.** When `original.png` shows only text, equations and choices (a false figure flag), `k figures no-figure` sets `status.json` to `no_figure`, releases the claim and appends the id and the copies of its figure group to `$PIPE/figures/no-figure.json`, the one record of these findings. `figure_gate.is_figure_question` is the one rule corpus, lint and the gate apply: a listed id is a text question, so the next `k corpus` (it reads `figures/` beside the lane file, or `--figures`) clusters it by text with its twins, `k slice` hands it to reviewers, and the gate needs no approval for it (a row for it that still carries figure fields is refused). The corpus figure flag itself counts a bare "graph" or "image" only in a bracketed description (`[Graph: ...]`, in the stem or a choice) or when the graph or image is "shown": prose like "the graph of y = 2x in the xy-plane" is not a figure. The importer carries every kind the quiz renders: table (`figure_table_data`), chart (`figure_chart_data`), geometry (`figure_geometry_data`, balanced-v1 and renderable) and a hand-drawn SVG (`figure_kind` image, `figure_svg` plus `image_alt`, no `image_url`), each Zod-checked in `src/lib/question-bank/import-figure.ts`. An SVG must pass `src/lib/figures/svg-figure-check.ts` (the quiz's inert tag and attribute subset; no script, style, comment, DOCTYPE, URL or namespaced attribute; at most 400,000 characters and 8,000 elements) or the importer refuses it; it is never rewritten. The seal (`catalogQuestionPayloadHash`) covers `figure_svg` because the student payload carries it, and the student quiz inlines it through the same sanitizer as fetched SVG files. Figure rows keep a NULL `comparison_key`; their duplicates are the founder's figure review.

**Checked-spec route (founder-authorized 2026-11-01).** His words: "All the figures should be updated to this new model... All the figure questions should have these new updated figures, and everything should now be uploaded to the live question bank." He does not review each figure, so a figure drawn by the figure engine (every figure in `figure.json` a FigureSpec: `figure_spec`, one spec or an ordered list, and `choice_figure_spec`; no older figure field) passes the figure gate in place of his approval when it is submitted (`ready_for_founder`, `figure.json` the submitted bytes), (a) `scripts/figures/check-spec.ts` (run again by the gate, in `FIGURE_ENGINE_DIR`, default the solid3d worktree) finds no issue, (b) `visual-verdict.json` beside it says `match` (`{schema: "karman-figure-visual-verdict-v1", verdict, occurrence_id or stable_question_ids, figure_sha256: figure_gate.spec_sha256 of exactly the specs judged, original_sha256 of original.png, reviewer, at}`), and (c) the answer certification and lint gates pass as always. His own approval keeps working for every kind of figure. A reviewed batch row carries the figure as `figure_spec` and `choice_figure_specs` (`{letter: spec}`); the importer writes neither, so `kimport.stage.carry_figure_specs` puts them on the staged question and choices, the gate compares them with `figure.json`, and the seal covers them (`catalogQuestionPayloadHash`: `figure_spec` in the payload, `choice_figure_spec` in the choice mapping only when set; the import branch's copy of that code is main's).

**An engine figure is the question's figure everywhere (2026-11-02).** Every "does this row have a figure" check counts a `figure_spec` of the shape the screen draws (one FigureSpec, or an ordered list of 1 to 4, each with a known `type`: `figure_gate.spec_problem`, and its TypeScript copy in `ts/qa-check.ts`, both copied from main's `storedSpecTypes` and `MAX_FIGURES`; `tests/test_figure_spec_seen.py` checks the copies against the engine checkout), and a choice's `choice_figure_spec` the same way: the QA audit and the import publish gate (`qa-check.ts` `renderedFigure` returns `spec`; `figure_referenced_missing`, `choice_empty`), lint (`PF_FIGURE`) and `figure.json` validation. A spec of any other shape is `figure_invalid` (fail level) and does not count, so a text that points at a figure it does not have is still refused. The engine's own parser and checks run on every spec in the figure gate (check-spec.ts). `k figures submit` stores a list as a list, with one render per figure (`figure-1.svg`, `figure-2.svg` ...; `choice-<letter>-<n>.svg` for a choice holding a list; none for a table). Batch builders take a figure only through `figure_gate.cleared_figure` (the founder's approval or the checked-spec route) and put it on the row with `figure_gate.row_figure_fields` (exactly the fields the gate compares, `figure_spec` lists verbatim); `pipeline/figure-redraw/held-01/_tools/build_led.py` and `build_new.py` do.

**Figures on live questions.** `k figures publish-specs` writes `figure_spec` / `choice_figure_spec` on live rows in place, resealed with the app's own code (`ts/figure-seal-check.ts`); the older figure fields stay as they are, so undoing it means clearing `figure_spec` (`restore.sql` puts every before value back). Input lines: `{question_id, stable_question_id, kind: figure|table|chart, figure_spec, choice_specs, transcribed_labels, choice_labels, check_ok: true, visual_verdict_path}`; every refusal is listed in `plan.json` (see `kimport/figure_publish.py`). `k figures convert-live --kind table|chart` (read-only) writes such lines for live tables and charts from the engine's own converters (`ts/figure-engine-tool.ts`, in the engine checkout), checked by check-spec, marked `visual_verdict: "mechanical"`; publish-specs accepts that only for tables and charts, and only for specs equal to the conversion of the row's live data (what students already see drawn).

```
k figures convert-live --kind table --pipe $PIPE --now <time>    # also --kind chart; writes qa/convert-live-*/publish-specs-*.jsonl
k figures publish-specs --lines <lines.jsonl> --pipe $PIPE --now <time> --dry   # plan + dry run, nothing written
k figures publish-specs --lines <lines.jsonl> --pipe $PIPE --now <time>         # live write, coordinator's OK first
```

Problem questions. `--reason` is one of: needs_figure, asset_hold, no_answer_key, answer_dispute, extraction_repair, skill_unclear, difficulty_unclear, classification_review, variant_review, broken_or_excluded (this last one also needs `--clusters`, so the next copy becomes the canonical). When a new campaign starts, `k lane requeue --lane $PIPE/lane.json --reason <reason>` moves parked and open items of that reason back to open.

```
k lane set-aside --lane $PIPE/lane.json --id <id> --reason <reason> --detail "<why>" --now <time> [--clusters ...]
k lane attempt --lane $PIPE/lane.json --id <id> --method <how> --failed --now <time>
k lane summary --lane $PIPE/lane.json --now <time>
k slice --reviewer <name> --lane $PIPE/lane.json --release
k slice --lane $PIPE/lane.json --ledger <ledger> --release-done
```

The last two give back a reviewer's claims, and drop claims that are resolved or live.

**O10. After 3 batches (no OK needed).** Measure questions per hour and the rework share from the lane summary above. When done, release the writer lock:

```
k lock release --path $PIPE/writer.lock --holder <your-name>
```

`--holder` is always required. A readable lock from a session that died is released by passing that session's name (the `error: writer lock held by <name>` message from `lock acquire` shows it). `--force` only removes a lock file that cannot be read.

## Live-bank QA: hide problem questions, restore them after a fix

```
k qa hide --results $PIPE/qa/results-r1.jsonl $PIPE/qa/results-r2.jsonl $PIPE/qa/results-r3.jsonl [--ids $PIPE/qa/static-ids.json] --pipe $PIPE --now <time> --dry
k qa hide --results ... [--ids ...] --pipe $PIPE --now <time>          # live write
k qa restore --ids <ids file> --results ... [--audit <current audit ids>] --pipe $PIPE --now <time> [--dry] [--skip-refused]
```

Hidden: verdict key_wrong, broken, unsure, minor_typo or minor; a line with flags or a mismatch and no verdict yet (still being reviewed); every id in an `--ids` file (a JSON list of ids or of objects with an id, or one id per line). Stays live: clean, key_ok, a line with `clean: true`, and pending (not checked yet). Any other verdict is listed under `unknown_verdicts_not_hidden`; a real run refuses until `kimport/qa_hide.py` names it. A later line for the same id wins.

`k qa hide` takes the writer lock, exports, and writes `$PIPE/qa/hide-<time>/hide.sql` (+ `.dryrun.sql`): the export fingerprint guard, then per row a guard that it is still live and unchanged, then publish_status `needs_human_review`, import_status `needs_review`, import_flag_reason `qa:<verdict>: <fix>` and archived_at `now()` (a corrected version goes back on the same row: see QA corrections below). Intent `qa_hide`, dry run, real file, readback, intent closed. The rows go in `$PIPE/qa/hidden.jsonl` with their previous values, and `$PIPE/qa/restore.sql` (+ `.dryrun.sql`) is rewritten: it puts back exactly every row QA still hides. `--dry` writes no lock, intent or log and runs only the dry run. Archived rows drop out of `/admin/questions/review`, the default admin preview and the private student view.

`k qa restore` republishes listed rows only when QA hid them, the results no longer call them unresolved, the audit list (`--audit`) no longer names them, their state is still what the hide left, and no other live row has the same comparison key, content hash or normalized text (so the QA-hidden twin of a corrected live copy stays hidden: never two live copies). The guard is a fresh export, so the fix may have changed the content. It appends to `$PIPE/qa/restored.jsonl`.

## QA corrections: put a corrected version of a hidden question back on the site

A question `k qa hide` took off the site comes back corrected **on the same row** (same `quiz_questions.id`), not as a new row. Reasons, from the live schema (2026-10-22): the unique index `quiz_questions_source_identity_unique` (source_version, section, module, number, occurrence) and `quiz_questions_pdf_hash_uniq` (source_pdf, content_hash) cover archived rows too, so a second row for the same source question cannot be inserted while the hidden one exists (the stage guards refuse it, and the insert would abort its chunk if they did not); and `question_responses`, `catalog_practice_responses` and `catalog_assignment_items` point at `quiz_questions.id` with no cascade, so the row cannot be deleted. Keeping one row per source question means no other tool has to learn about replacements. `quiz_questions_live` filters on `is_live` and `publish_status` (not `archived_at`); `is_live` is generated (import_status ok and archived_at null). No triggers on `quiz_questions`, `answer_choices` or `answer_key_entries`; nothing references `answer_choices` or `answer_key_entries`.

**Reviewer.** Rebuild the question with the normal builders, with the SAME stable_question_id and the same source tuple (source_version, section, module, number, occurrence), fix what QA found (key, stray text, OCR typo, missing blank, numeric answer set), and hand the batch in as usual (folder e.g. `<batch>-qa-1`, READY as usual). Every row of the batch must be a question QA hid; a batch that mixes hidden and other rows is refused whole. No `replaces` field and no new stable id: lint sees the same canonical stable id it saw the first time.

**Legacy source identities.** Rows imported before the strict identity rule (the 2023-03 and 2023-05 forms) are stored with module `UNSPECIFIED` and section `reading` or `writing`, which stage-rows' preflight cannot read for a new row. A correction keeps the hidden row's identity exactly as stored: the autopilot hands `ts/stage-rows.ts` the stored source tuples of the export's QA-hidden rows, and of the private drafts a QA correction left when it was held at seal (rows still in `qa/hidden.jsonl`: the correction rewrote the same row, so its evidence fix batch keeps that identity) (`qa_correct.kept_identities`, a fifth `<keep-identities.json>` argument), and a row whose section or module the strict rule cannot read may keep one of them verbatim only when its `source_section`, `source_module` and `source_question_number` (and the PDF's version) equal it exactly (`src/lib/question-bank/kept-source-identity.ts`; the output row says `kept_source_identity: true`). Anything else stays refused ("missing stable source identity"): a new row, or a correction naming another value (for example `MNone` for a row stored as `UNSPECIFIED`). For kept rows the one-module rule counts source version and module only, since those imports split one Reading and Writing module into two sections. The stable id is then checked against the hidden row's evidence as for any correction. The "Final website gates are incomplete" check is unchanged.

**Autopilot** (`kimport/qa_correct.py`). A batch whose every row's source question is a QA-hidden row (archived_at set, import_flag_reason `qa:...`, needs_human_review / needs_review) is a QA correction batch. The autopilot reads the hidden rows back (`qa/hidden-readback.sql`, read-only) and refuses a row when: not exactly one bank row for its source question; the row is no longer QA-hidden; its answer key names another stable id or none (read under either evidence envelope; a row with none is fixed with `k qa fix-legacy`, below); source_occurrence differs; the corrected payload carries source assets (the row keeps its own); nothing changed in the question, the choices or the accepted answers the key evidence lists (the reviewed numeric answer set: a new list is a real correction, since the site grades against it) (use `k qa restore`); or the stage duplicate checks (comparison key, typo-level text, content hash, normalized text, source question) match ANY OTHER bank row or another row of the run. One exception: a row QA still hides (`qa/hidden.jsonl`, not restored or corrected) that is QA-hidden in the export and shares the corrected content hash or normalized text is the duplicate twin QA hid on purpose; it does not block the correction (`qa-precheck.json` lists it under `hidden_twins_allowed`, and the SQL hash and text guards let exactly that row through, only while it is still QA-hidden and not live). Any other row students cannot see (not is_live, not publish_ready, or archived: an old never-published draft, "No answer key entry", "Certified duplicate of ...") does not block a correction either (`not_live`; the publish gate refuses such a row later if it is the same question as a live one). A batch taken again with `--retry` after some of its rows were published leaves those rows out (`already_corrected` in `qa-precheck.json`: the live row still holds the content recorded in `qa/corrections.jsonl`) and corrects the rest. A row the duplicate sweep un-published ("duplicate of <id>; un-published by sweep", private, not archived) counts as such a twin too, but only while no row of its duplicate group (the sweep's canonical, or another row un-published for it) is live; the SQL rechecks that. A live twin, or a sweep twin whose group has a live row, still blocks, and the refusal names the live row. The publish step honours the same list: `publish-NN.sql`'s per-row content-hash count and comparison-key guard leave out exactly the twins in the run's `qa/qa-precheck.json` (`hidden_twins_allowed`, also listed in `publish/precheck.json`), only while each is still hidden; every other row still counts. `qa/qa-NN.sql` (one transaction per chunk, `.dryrun.sql` twin, run after the stage and evidence files): fingerprint of the bank without this run's rows, then per row: lock it, require row, choices and answer key to equal the readback exactly and still be QA-hidden, the stage guards against every other row, then make it the private draft stage would have inserted: every column from the corrected payload (question and mirror), every other column back to its default (archived_at NULL, explanation and grader columns cleared; id and created_at kept), comparison_key set, choices and answer key replaced (unsealed, student_publication_allowed false). Then readback, seal and publish with the run's staged rows; a row held at seal stays a private draft (a later evidence fix batch publishes it). `qa/qa-rollback-NN.sql` puts the hidden row back exactly, only while the correction is still unpublished. After publish, one line per row goes in `$PIPE/qa/corrections.jsonl` (question_id, stable_question_id, batch, qa_reason, content_hash_v2 and correct_answer before and after, run, at); the row then no longer counts as hidden and `$PIPE/qa/restore.sql` is rewritten without it. The ledger marks the batch `"qa": true`; the run counts `qa_corrected`.

A QA-hidden row whose question has a figure must pass the founder's figure gate before anything is written (an approved `$PIPE/figures/<stable id>/` matching the row); a row that went live before the figure lane is refused in `qa/qa-precheck.json` until its figure is approved, instead of stopping the run at publish.

**Finishing a stopped run.** `k autopilot --pipe $PIPE --resume <run> [--dry]` finishes a run that stopped after its rows were written, read back and sealed but before publish (for example at the figure gate), once the cause is fixed. It refuses unless that run's result is `stopped`, all its batches are still `stopped` by it (or, for a run from before the ledger fix of 2026-10-26, still show the earlier refusal it took them from with `--retry`), its one stage intent closed `verified`, and it either built no publish files or its publish intent closed `not_applied` (the publish dry run failed, so the real file never ran). Under a new run id (`auto-<time>-resume`) it takes the writer lock and a fresh export, runs the old run's readback files again (the rows must still be exactly what was written, still private drafts), seals again with `--hold-failing`, and then runs the normal publish sequence (duplicate checks, figure gate, publish intent, dry runs, publish, visible count, ledger, claims, `qa/corrections.jsonl`). Nothing is written again before publish.

## QA: which stable id a hidden question has, and fixing legacy rows

```
k qa ids --pipe $PIPE --now <time> [--ids <more ids>] [--rows <saved ids result or full dump>]
k qa ids --pipe $PIPE --now <time> --write-approved          # after the coordinator reviewed the candidate
k qa fix-legacy --fixes $PIPE/qa/fixes-r1.jsonl $PIPE/qa/fixes-r2.jsonl ... --pipe $PIPE --now <time> [--ids <ids>] --plan | --dry
k qa fix-legacy --fixes ... --pipe $PIPE --now <time> [--ids <ids>]   # live write
```

**`k qa ids`** (`kimport/qa_ids.py`, read-only) writes `$PIPE/qa/hidden-id-map.candidate.json` for every id in `qa/hidden.jsonl` (plus `--ids`). The stable id is read with `answer_evidence.stable_question_id`, the reading `qa_correct` uses: an independently confirmed generated key keeps `approved_tags` under `evidence`, so a query on `raw_model_response->'approved_tags'` alone sees no stable id for those rows (that is how 25 rows first looked like older imports). Each row is cross-checked against its source tuple (the ledger exam whose `source_sha256` is the row's `source_version`, same section, module and number) and its corpus cluster. Status: `evidence` (mapped), `ambiguous` (the readings disagree, several key rows, or another bank row's evidence names the same id: a person decides), `legacy` (the evidence names no stable id), `not_found`. `--write-approved` writes `hidden-id-map.json` and `hidden-stable-ids.json` (which lint reads) from the candidate; an ambiguous or not-found row keeps its current entry.

**`k qa fix-legacy`** (`kimport/qa_legacy.py`) is for `legacy` rows: no stable id in the evidence, so no QA correction batch can name them. It applies the reviewer's line from `fixes-*.jsonl` (decision `fix`) in place, same id: `corrected_question_text`, `corrected_choices`, `corrected_key` (correct_answer and verified_answer, answer_key_status `corrected_key_verified`, is_correct on the choices). `selected_official_answer` and the answer key row are not touched (a reviewer's answer is never labelled official). A text or choice change recomputes `content_hash_v2` with import-core's text-only formula, only on a row whose stored hash that formula reproduces and that has no figure or table data. Refused: a student-visible row (hide it first), a row whose evidence names a stable id (use a QA correction batch), a fix that changes the passage or a table, a numeric answer set beyond the key (sets bind to a source tuple), a key that is not one of the choices, two fix lines that disagree, a fix that changes nothing, a content hash another row has. It never changes publish_status, import_status, import_flag_reason or archived_at, so the row stays hidden; once the results no longer call it unresolved, `k qa restore` republishes a QA-hidden row. A row that was never served (publish_status needs_human_review or blocked_answer_dispute from the start, so `k qa hide` skipped it as "not live") stays unserved.

Sequence, as for `k qa hide`: writer lock, no open intent, fresh export, a read-only snapshot of the rows (`snapshot.sql`), then `qa/fix-legacy-<time>/fix-legacy.sql` (+ `.dryrun.sql`): the export fingerprint guard, then per row a lock and a guard that the row, its choices and its one answer key equal the snapshot exactly and the row is still not visible with no stable id, the update, and a check that the key is the one correct choice. Intent `qa_fix-legacy`, dry run, real file, readback (`readback.sql`), intent closed; one line per row in `$PIPE/qa/legacy-fixes.jsonl` (before and after). `fix-legacy-rollback.sql` puts the old values back, only while the fixed values are still in place. `--plan` builds the files and `plan.json` only (with `--export` and `--snapshot` it reads no database); `--dry` also runs the dry run.

## QA: change the skill or difficulty label of live questions

```
k qa retag --decisions $PIPE/qa/skill-recheck/decisions.jsonl --pipe $PIPE --now <time> --dry   # read-only plan + dry run
k qa retag --decisions $PIPE/qa/skill-recheck/decisions.jsonl --pipe $PIPE --now <time>         # live write, founder's OK first
```

`kimport/qa_retag.py` (run by `qa_run.run_retag`, the `k qa hide` sequence: writer lock, no open intent, fresh export for the fingerprint guard plus a full read-only REST export of the live rows, `plan.json`, `retag.sql` + `.dryrun.sql`, intent, dry run, real file, readback, intent closed, `qa/retags.jsonl`). Input lines `{id, stable_question_id, field: "skill" | "difficulty", live, new, reason, by, at, [domain]}`; `id` may be the live uuid or the stable id, and must resolve to exactly one live row. It changes only labels: difficulty sets `difficulty_level` and its band `difficulty`; a skill sets the evidence `approved_tags` (catalog_skill_id, skill_label, catalog_domain_id, domain_label), a new skill review record (`independent_D_record`, the decision's sha256 as `independent_D_review_sha256`; the old record kept under `label_retags`), and `domain` / `topic_cluster` when the domain changes. The payload seal covers those columns, so `ts/retag-check.ts` recomputes it with the app's `catalogQuestionPayloadHash` and checks the result with the app's scope reader and the catalog lane's filters. Each row block stops the whole file unless the row, its one answer key entry and the live value are exactly what the export and the decision say. Refused (listed in `plan.json` and the summary): skills not in `approved-skill-taxonomy.json`, difficulty outside 1 to 7, a domain that is not the skill's, the other subject, rows not live or not served now, an original-D-record skill lane, and lines for one row and field from two reviewers. One reviewer's latest line wins; a latest line with new == live is dropped as no change. `restore.sql` puts the old labels and evidence back exactly. `retag-plan.md` beside the decisions file is the founder's summary (counts by field and reviewer, skill moves, every change, refusals).

## QA: Bluebook text fixes on live questions

```
k qa normalize --pipe $PIPE --now <time> --dry   # read-only plan + dry run
k qa normalize --pipe $PIPE --now <time>         # live write, coordinator's OK first
```

`kimport/qa_normalize_text.py` holds the mechanical fixes of `$PIPE/qa/bluebook-style/STYLE.md` (curly quotes, closed em dashes, en dashes, minus signs, stacked fractions and `{,}` inside math, `%` / `$` / unit spacing, stray spaces, the standard blank, the notes intro and bullets, thousands commas). It splits each field as main's MathText does and changes only what it is sure of; the rest is listed in `plan.json` as left as is. `kimport/qa_normalize.py` (run by `qa_run.run_normalize`, the `k qa retag` sequence) plans every student-visible row: the words and numbers must stay the same in order, the stored `comparison_key` and `content_hash_v2` must be reproducible, and no new live duplicate (the bank gate's rule) or hash another row holds may result. `ts/normalize-check.ts` then reseals each row with the app's own code (payload seal `catalogQuestionPayloadHash`, numeric answer set text hashes, `computeContentHashV2`), reads it back through the scope reader and `reviewedNumericAnswers`, and refuses any row whose display (qa-check's `checkRow` and `displaySegments`) changes beyond the intended characters. The source-package hashes (`content_sha256`, `B_package_sha256`, D records) stay; the change is recorded in the evidence under `text_normalizations`. Files of about 600 kB, each one transaction with a fingerprint guard over the rows the run leaves alone; `restore.sql` puts every field, hash and evidence back; `qa/normalizations.jsonl` keeps before and after per row.

## QA: step-by-step explanations on live questions

```
k qa explain-check --lines <lines.jsonl> --pipe $PIPE --now <time> [--live-rows <live-full.json>]  # read-only, no lock
k qa explain --lines <lines.jsonl> --pipe $PIPE --now <time> [--batch 2500] --dry   # lock, plan + dry run, nothing written
k qa explain --lines <lines.jsonl> --pipe $PIPE --now <time> [--batch 2500]         # live write, coordinator's OK first
```

Replaces `explanation_text` (and `explanation_per_choice` when a line gives it) on live rows in place; the rows stay live throughout. Input lines `{question_id, stable_question_id, explanation_text, explanation_sha256_before, [explanation_per_choice]}`, where `explanation_sha256_before` is the sha256 of the row's explanation when the line was written (`kimport.explanation_rules.sha256_text`; null when it had none). Writers can import `kimport/explanation_rules.py` (text rules, the stated answer) and run `k qa explain-check` (adds the app's KaTeX, screen split, grader and reseal; writes `refused.jsonl`). Rules: 200 to 2,500 characters; math only inside `\( \)` (the screen does not draw `\[ \]`; no `$` outside math); every span parses with KaTeX and is exactly what main's MathText split finds; no en dash; a negative number outside math uses `−` (U+2212); plain text (no HTML, Markdown or display markers); the stated final answer is the key (multiple choice: the letter; numeric: a value the app's grader accepts with the row's reviewed numeric answers). `ts/explain-check.ts` reseals with `catalogQuestionPayloadHash` (it covers both explanation columns) and checks `content_hash_v2`, the numeric answers and the catalog lane's reading do not change. Each row block stops its file unless the guarded columns, the explanation and the evidence are what the export shows; the evidence records the change under `explanation_replacements`. A line whose text the row already has is skipped, so the same file can run again; `--batch N` changes the first N rows and lists the rest as deferred. Files of about `--max-file-kb` (600) each one transaction; `restore.sql` puts every value back; `qa/explanations.jsonl` keeps the before text. Unlike the older routes, `--dry` takes and releases the writer lock. Resealing closes a student's open practice session on those questions (PR #244 then starts a fresh one; completed sessions keep their snapshot), so run a run's files back to back and prefer few large runs.

## QA certificate: every question students can see

```
k qa certify --pipe $PIPE --now <time> [--export <saved visible export>]
k qa certify --pipe $PIPE --now <time> --reuse $PIPE/qa/certify-<time>   # again on an earlier run's export and render (static checks re-run)
```

Read-only (`kimport/qa_certify.py`, `kimport/qa_answers.py`). It takes a fresh REST export of every row students can see (`is_live` and publish_status `publish_ready` or `publish_ready_with_verified_repair`, the rows `quiz_questions_live` serves), runs the static checks under main's display rules, renders every row on current `origin/main` code (a throwaway worktree with the dev-only `/dev/qa-render` route copied in, never committed; a dev server on a free port; laptop 1280x800 and phone 390x844; all render checks; the server and worktree are removed afterwards), and certifies each answer. An answer is certified by: its latest QA verdict (`qa/results-r*.jsonl`) clean or key_ok on the text and key still live (`qa/blind-live*.json`); or, for a QA-corrected row (`qa/corrections.jsonl`, still as corrected) or a row published after the QA snapshot (its batch folders, found by the answer key's `tag_binding_manifest_sha256` whatever the tag-binding file is called), answer evidence that holds: the OFFICIAL printed key (reviewed row `reviewed_answer.kind` official, `printed_answer`) plus at least one agreeing BLIND solver, or, for a generated or overridden key, at least two agreeing BLIND solvers. Blind means a blind subagent, the QA round's blind solve, a recertify blind solve, or the transcriber where its record says `key_exposed_to_solver: false` and it is not the reviewer's own pass; a reviewer's own solve (which may have seen the printed key) is listed but never counts (founder's zero-doubt bar, 2026-10-23). Reviewers add blind re-solves in `$PIPE/qa/blind-resolve/<reviewer>-<n>.jsonl` (format in `pipeline/qa/QA_BRIEF.md`, "Blind re-solve (2026-10-23)"; `kimport/qa_evidence.py` `BlindResolves`): each distinct `solver_run` is one blind solve, compared with the live key; agreeing means the site would grade the answer correct (the reviewed numeric answer set, for example 25 through 34, and `numeric_tolerance`, as `quiz-session.ts` grades). One that disagrees FAILS the row (`blind_solve_disagrees`) until `$PIPE/qa/blind-resolve/adjudications.jsonl` records `key_confirmed` with at least two further agreeing blind re-solves in `confirming_runs`; `key_wrong` and `unclear` keep it failing. A line that breaks the format is not counted and is listed, per file with the reason, under "Blind re-solve lines not counted" in the certificate. `kimport/qa_evidence.py` lists every evidence format it reads (batch reviewed rows, independent-d-review, config.json, spec.json, reviewer-blind-solves, blind-answers including the solver_A / solver_B / text_only form, `reviews/*`, `repair/recertify-*.json`, `repair/key-audit.json`, the QA round's solves) and the solver each belongs to; one solver counts once however many files repeat its solve, and a record marked `key_exposed_to_solver: true` is not a solve. Anything else is uncertified. Live duplicates fail too (`live_duplicate`, `kimport/qa_dupes.py`): live rows with the same fingerprint (underline and italic tokens, math delimiters, blank style, quotes, dash style, list bullets, case, spacing and a closing period set aside; passage and stem compared as sorted lines or sentences, choices sorted, the answer as the correct choice's text or the numeric value, figure data as is), or near copies (the same text with choices differing by a typo, or the same choices and answer with text differing by a typo: at most two places of at most two characters, the same numbers); every copy in a group fails and the certificate lists the groups. Output: `$PIPE/qa/certificate-<date>.md` and `.json` (counts, and every visible id that fails a fail-level static check or any render check, or is uncertified, with the reason), `$PIPE/qa/uncertified-<date>.json` (the uncertified rows for a blind re-solve: ids, batch, reason, solvers on record, no keys) split into `uncertified-r1.json`, `-r2.json`, `-r3.json` by the reviewer whose batch folder it is (`r1-*`, `oct-r1-*`, `r1-qa-*` ...; anything else to r3); the run's export, static and render files are in `$PIPE/qa/certify-<time>/`.

## If something goes wrong

Messages are quoted from the tool. A `refused:` line means the SQL builder wrote nothing; an `error:` line means that command did not finish.

- `error: open intent(s) must be closed by a readback first: batch ...`: a publish or un-publish was started and never read back. Read the rows back, then `intent close`. A second publish is refused until you do.
- `refused: the export ... is older than the private readback ...; run sql/live_export.sql again and save a fresh export` (also "save a fresh export"): take a new export and rebuild.
- `bank changed since export; take a fresh export`: raised by `publish.sql` itself when the bank moved after the export. Nothing was written. Close the open intent with `--outcome not_applied`, then go back to step 2 of O9 (export, backfill if needed, readback, fresh export, build).
- `error: ... has no image_url ... field: the export is from an older sql/live_export.sql`: run the current `sql/live_export.sql` again.
- `refused: the export has no comparison_key field on N rows: migration 20261021000000 and the key backfill are not applied ...`: apply migration A and the backfill (O5), then export again.
- `refused: duplicate check failed: <id> duplicate: same comparison key as <id>` (or `typo-level match`): a batch row duplicates another question. Pull it from the batch or set it aside; nothing was written. If migration B fails with a duplicate-key error, run `sweep` and un-publish (O3, O4), then retry; nothing changed.
- `error: writer lock held by <name> since <time>`: another session is writing. Wait, or release with that name once they are done. Lane and claims files use `.lock` files that clear on their own when a process dies; `error: ... is in use by another session; try again in a moment` just means retry.
- `error: clusters were built with normalizer ..., not ...: rebuild clusters`: the clusters file is out of date. Re-run `corpus`; your earlier answers are applied again and any that no longer match are listed as stale, not fatal.
