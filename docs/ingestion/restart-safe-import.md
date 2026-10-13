# Restart-safe JSON import (local operator workflow)

This supplements the existing `import-json-direct.ts` and publish gate. It does
not publish questions by itself.

1. Freeze and review an extracted JSON file. Keep its source PDF name stable.
2. Run the importer with a checkpoint on persistent local storage:

   ```sh
   npx tsx --env-file=.env.local scripts/pdf-pipeline/import-json-direct.ts \
     /path/to/frozen-questions.json /path/to/source.pdf \
     --checkpoint /path/to/source-import.checkpoint.json
   ```

3. If interrupted, rerun the **same command** with the same frozen JSON and
   checkpoint. Changed JSON or source PDF name is rejected. Successful rows
   are skipped; errored rows retry. If the question insert committed before an
   interruption, the importer checks and fills missing choices, answer-key
   evidence, answer mirror, and figure asset. Conflicting existing data stays
   an error for review. Keep the one-writer rule; this reconciliation is not a
   concurrent transaction.
4. `review_held` rows remain private. Resolve their review findings and run the
   existing publish gate. Import completion is not publication proof. The
   importer prints the approved `quiz_questions_live` count separately.
5. For a validated ready backlog, periodically run:

   ```sh
   node --env-file=.env.local scripts/pdf-pipeline/check-publication-stall.mjs \
     --source-pdf source.pdf --state /path/to/source-publication-progress.json \
     --ready-backlog 42
   ```

   Use only the count of independently validated questions currently ready for
   publication. Do not count held or merely imported rows. Run this check every
   few minutes; it exits 2 after 15 minutes without growth for that source PDF
   in the approved student view while the ready backlog is positive, or if the
   approved count falls. The state file is local
   and must be kept between checks. It does not schedule itself.

No importer or stall check should run concurrently with another production
writer. This checkout's code must be integrated and deployed by the Mac owner
after its pending action is resolved.

## Release rubric

The checkpoint proves only that importer writes completed. A question is ready
for the student website only after the release owner verifies:

- source document/version, section, module, question number, page, and order;
- complete stem and any passage, figure, table, math notation, and answer choices;
- SAT domain, topic, and concept placement;
- exact and semantic duplicate checks against the existing catalog;
- official or independently verified answer with preserved provenance and a
  matching answer key; and
- publish-gate approval, matching catalog count/seal, and student-facing Math
  and Reading/Writing smoke checks.

Any uncertain item stays private for per-question review. Keep a rollback
manifest for each published batch. A `review_held` checkpoint status never
authorizes publication.
