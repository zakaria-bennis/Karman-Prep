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

## The sequence

**O1. Lock and export (no OK needed).**

```
k lock acquire --path $PIPE/writer.lock --holder <your-name> --now <time>
```

Run `sql/live_export.sql` through the database connector. Save the result exactly as returned to `$PIPE/live-<date>.json`. It is one JSON object with `exported_at`, `row_count`, `fingerprint` and `rows`. Every tool reads it. There are no ledger counts to refresh by hand: `corpus` (O7) takes live status from this export.

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

Produces `clusters.json`, `founder_pairs.json`, `report.md`. A question that is open or parked in the problem lane is never picked as the canonical copy, so promotions made by `lane` survive a re-run (`--lane` defaults to `lane.json` in `--out` or one folder up). `--decision-log` names the saved answer log if it is not `founder_decisions.json` in `--out`. The summary line gives the unique count to compare against 10,000.

**O8. Close matches (you answer).**

```
k pairs render --pairs $PIPE/corpus/founder_pairs.json --out $PIPE/corpus/founder_pairs.html
```

Send you the HTML page. You answer same or different and copy back the result into `decisions.json`:

```
k pairs apply --pairs $PIPE/corpus/founder_pairs.json --decisions $PIPE/corpus/decisions.json --clusters $PIPE/corpus/clusters.json --now <time>
```

Your answers are appended to `founder_decisions.json` next to `clusters.json`. Re-running `corpus` applies them again; answers that no longer match are reported, not fatal.

**O9. Review, publish (live write per batch). Needs your OK for each batch.**

```
k slice --reviewer <name> --clusters $PIPE/corpus/clusters.json --lane $PIPE/lane.json --ledger <ledger> --now <time>
k lint --reviewed <batch>-reviewed-import-ready.json --frozen <batch>-frozen-inputs-import-ready.json --clusters $PIPE/corpus/clusters.json --lane $PIPE/lane.json --now <time>
```

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

2. **Export**: run `sql/live_export.sql`, save `$PIPE/live-<date>-3.json`.
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
