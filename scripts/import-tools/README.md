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

Produces `groups.json`, `report.md`, `unpublish.sql`, `republish.sql`. You read `report.md`. Typo groups that tie go to "typo_review" and figure groups to "figure_review"; nothing is removed for those. **Needs your OK.**

**O4. Un-publish (live write, from your O3 OK).** Run `unpublish.dryrun.sql` through the connector first (it rolls back), then run `unpublish.sql` for real. Re-export to `$PIPE/live-<date>-2.json`, run the sweep again, and confirm no groups are left. `republish.sql` undoes it (it has a `republish.dryrun.sql` twin).

**O5. Migration A and backfill (live write). Needs your OK.**

```
npm run db:push          # applies 20261021000000_question_comparison_key.sql
k backfill --export $PIPE/live-<date>-2.json --out $PIPE/backfill.sql
```

Produces `backfill.sql` and `backfill.dryrun.sql` (keys look like `kn-2:<sha256>`). Run the `.dryrun.sql` first, then `backfill.sql`. Both end with a `SELECT` that prints `rows_still_null`. Some rows stay without a key by design: image and graph figure rows, rows with a broken answer key, and rows whose format disagrees with their choices. The comment at the end of `backfill.sql` counts the last two. To check live rows, run this after the backfill; the number should equal the broken-answer-key plus format-mismatch count in that comment (0 when there are none), because every keyable row now has a key:

```
SELECT count(*) FROM public.quiz_questions WHERE comparison_key IS NULL AND archived_at IS NULL AND publish_status IN ('publish_ready','publish_ready_with_verified_repair') AND NOT (figure_kind IS NOT NULL AND figure_kind <> 'table');
```

**O6. Migration B (live write). Needs your OK.**

```
npm run db:push          # applies 20261021000100_question_comparison_key_unique.sql
```

It fails safely, changing nothing, if a live duplicate remains. Apply it only after O4 and O5.

**O7. Corpus count (no OK needed).**

```
k corpus --c-index <final-current-plus-partial-question-records-*.json> --ledger <current-readiness-ledger.json> --export $PIPE/live-<date>-2.json --out $PIPE/corpus/
```

Produces `clusters.json`, `founder_pairs.json`, `report.md`. The summary line gives the unique count to compare against 10,000.

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

Then the existing stage path. After any staging, take a fresh export and re-run the backfill (newly staged rows need keys or the builder refuses). Then:

```
k intent open --log $PIPE/intents.jsonl --batch <batch> --action publish --question-ids <id,id> --sql-sha256 <sha> --now <time>
k publish --batch <batch> --readback <batch>-private-readback.json --sealed <batch>-sealed-preview.json --export $PIPE/live-<date>-3.json --intents $PIPE/intents.jsonl --out $PIPE/batches/<batch>/
```

Produces `publish.sql`, `rollback.sql`, their `.dryrun.sql` twins, `keys.json`, `precheck.json`. `publish.sql` starts with a guard that stops if the bank changed since the export. Run `publish.dryrun.sql`, show you the batch, run it on your OK, read it back, then close the intent. **Needs your OK for each batch** (or one standing OK, if you give it).

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
- `bank changed since export; take a fresh export`: raised by `publish.sql` itself when the bank moved after the export. Nothing was written. Re-export, re-run backfill if rows were staged, rebuild.
- `refused: the export has no comparison_key field on N rows: migration 20261021000000 and the key backfill are not applied ...`: apply migration A and the backfill (O5), then export again.
- `refused: duplicate check failed: <id> duplicate: same comparison key as <id>` (or `typo-level match`): a batch row duplicates another question. Pull it from the batch or set it aside; nothing was written. If migration B fails with a duplicate-key error, run `sweep` and un-publish (O3, O4), then retry; nothing changed.
- `error: writer lock held by <name> since <time>`: another session is writing. Wait, or release with that name once they are done. Lane and claims files use `.lock` files that clear on their own when a process dies; `error: ... is in use by another session; try again in a moment` just means retry.
- `error: clusters were built with normalizer ..., not ...: rebuild clusters`: the clusters file is out of date. Re-run `corpus`; your earlier answers are applied again and any that no longer match are listed as stale, not fatal.

```
