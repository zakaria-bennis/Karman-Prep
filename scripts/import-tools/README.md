# kimport: question import tools

## What this does (plain English)

- It finds questions that are the same question twice, in the live bank and in all the files we captured.
- It writes the SQL to hide live duplicates and to publish new questions safely. It never runs SQL itself.
- Every live write waits for your OK, and every SQL file is tried first inside `BEGIN ... ROLLBACK`.
- Nothing is ever deleted. "Un-publish" only sets the row back to `needs_human_review`.
- It keeps a problem lane for questions that cannot be fixed yet, and hands reviewers small slices.

## Setup

Run everything from the repo root. `PIPE` is the working folder (outside Box Drive, which is read-only):

```
PIPE=/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/pipeline
K="python3 -I scripts/import-tools/kimport-cli.py"
```

Tests: `python3 -I -m unittest discover -s scripts/import-tools/tests -t scripts/import-tools`

Times are ISO-8601, for example `--now 2026-10-21T09:00:00Z`.

## The sequence

**O1. Lock and export (no OK needed).**

```
$K lock acquire --path $PIPE/writer.lock --holder <your-name> --now <time>
```

Run `sql/live_export.sql` through the database connector. Save the result exactly as returned to `$PIPE/live-<date>.json`. It is one JSON object with `exported_at`, `row_count`, `fingerprint` and `rows`. Every tool reads it. Then refresh the ledger counts.

**O2. Read back US V2 RW M2 Q11 (no OK needed).** Read the row through the connector and record the outcome:

```
$K intent list --log $PIPE/intents.jsonl
$K intent close --log $PIPE/intents.jsonl --intent-id <id> --outcome <outcome> --readback-sha256 <sha> --now <time>
```

**O3. Sweep (needs your OK on the un-publish list).**

```
$K sweep --export $PIPE/live-<date>.json --out $PIPE/sweep/
```

Produces `groups.json`, `report.md`, `unpublish.sql`, `republish.sql`. You read `report.md`. Typo groups that tie go to "typo_review" and figure groups to "figure_review"; nothing is removed for those. **Needs your OK.**

**O4. Un-publish (live write, from your O3 OK).** Try `unpublish.sql` first inside `BEGIN ... ROLLBACK` through the connector, then run it for real (it is one `BEGIN ... COMMIT`). Re-export to `$PIPE/live-<date>-2.json`, run the sweep again, and confirm no groups are left. `republish.sql` undoes it.

**O5. Migration A and backfill (live write). Needs your OK.**

```
npm run db:push          # applies 20261021000000_question_comparison_key.sql
$K backfill --export $PIPE/live-<date>-2.json --out $PIPE/backfill.sql
```

Produces `backfill.sql` (keys look like `kn-2:<sha256>`). Dry-run it in `BEGIN ... ROLLBACK`, then run it. Re-export and confirm the null key count is 0 for live rows. Image and graph figure rows get no key on purpose.

**O6. Migration B (live write). Needs your OK.**

```
npm run db:push          # applies 20261021000100_question_comparison_key_unique.sql
```

It fails safely, changing nothing, if a live duplicate remains. Apply it only after O4 and O5.

**O7. Corpus count (no OK needed).**

```
$K corpus --c-index <final-current-plus-partial-question-records-*.json> --ledger <current-readiness-ledger.json> --export $PIPE/live-<date>-2.json --out $PIPE/corpus/
```

Produces `clusters.json`, `founder_pairs.json`, `report.md`. The summary line gives the unique count to compare against 10,000.

**O8. Close matches (you answer).**

```
$K pairs render --pairs $PIPE/corpus/founder_pairs.json --out $PIPE/corpus/founder_pairs.html
```

Send you the HTML page. You answer same or different and copy back the result into `decisions.json`:

```
$K pairs apply --pairs $PIPE/corpus/founder_pairs.json --decisions $PIPE/corpus/decisions.json --clusters $PIPE/corpus/clusters.json --now <time>
```

Your answers are appended to `founder_decisions.json` next to `clusters.json`. Re-running `corpus` applies them again; answers that no longer match are reported, not fatal.

**O9. Review, publish (live write per batch). Needs your OK for each batch.**

```
$K slice --reviewer <name> --clusters $PIPE/corpus/clusters.json --lane $PIPE/lane.json --ledger <ledger> --now <time>
$K lint --reviewed <batch>-reviewed-import-ready.json --frozen <batch>-frozen-inputs-import-ready.json --clusters $PIPE/corpus/clusters.json --lane $PIPE/lane.json --now <time>
```

Then the existing stage path. After any staging, take a fresh export and re-run the backfill (newly staged rows need keys or the builder refuses). Then:

```
$K intent open --log $PIPE/intents.jsonl --batch <batch> --action publish --question-ids <id,id> --sql-sha256 <sha> --now <time>
$K publish --batch <batch> --readback <batch>-private-readback.json --sealed <batch>-sealed-preview.json --export $PIPE/live-<date>-3.json --intents $PIPE/intents.jsonl --out $PIPE/batches/<batch>/
```

Produces `publish.sql`, `rollback.sql`, `keys.json`, `precheck.json`. `publish.sql` starts with a guard that stops if the bank changed since the export. Dry-run in `BEGIN ... ROLLBACK`, show you the batch, run it on your OK, read it back, then close the intent. **Needs your OK for each batch** (or one standing OK, if you give it).

Problem questions:

```
$K lane set-aside --lane $PIPE/lane.json --id <id> --reason <reason> --detail "<why>" --now <time> [--clusters ...]
$K lane attempt --lane $PIPE/lane.json --id <id> --method <how> --failed --now <time>
$K lane summary --lane $PIPE/lane.json --now <time>
$K slice --reviewer <name> --release        # give back a reviewer's claims
```

**O10. After 3 batches (no OK needed).** Measure questions per hour and the rework share from the lane summary above. When done: `$K lock release --path $PIPE/writer.lock --holder <your-name>`.

## If something goes wrong

- **"open intent"**: a publish or un-publish was started and never read back. Read the rows back, then `intent close`. A second publish is refused until you do.
- **"export is older than the private readback" / "bank changed since export; take a fresh export"**: the data moved. Take a new export and rebuild.
- **"no comparison_key field" or a staged row has no key**: migration A or the backfill is missing. Re-export and re-run the backfill.
- **Duplicate key** (migration B fails, or "duplicate check failed"): two live questions are the same. Run `sweep`, un-publish, then retry. Nothing was changed.
- **"lock is held by ..."**: another session is writing. Wait. If the holder is gone, `lock release --force` removes an unreadable lock file. Lane and claims files use their own `.lock` files that clear automatically when the process dies.
- **Stale clusters**: `clusters.json` is older than the export or the reviewed batch. Re-run `corpus`; your earlier answers are re-applied.
- **Any `refused:` message** means nothing was written. Fix the named cause and run again.
