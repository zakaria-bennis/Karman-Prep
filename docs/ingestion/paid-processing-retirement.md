# Paid question processing retirement

The released-exam workflow uses reviewed OpenAI work and local validation. The old paid PDF extraction, model grading, generated explanations, figure interpretation and orchestration code is removed from the active tree. `pdf:extract`, `pdf:grade`, process-PDF and grade-only workflows are retired. Their previous code remains recoverable through Git history; no accounts, keys, data, stored jobs or source files were deleted.

The old upload and dispatch URLs keep admin authentication and return HTTP 410 without allocating a job, signing an upload or calling a provider. Historical jobs remain readable. Admin CSV import is retained as an existing adapter and is not a substitute for reviewed publication gates.

Keep the shared importer, duplicate checks, source identity/provenance, schemas, taxonomy, numeric difficulty contract, deterministic validators, local PDF rendering, answer matching and native figure components. These are used by the current workflow. The stage2 Python file now contains only the generated taxonomy reference and a retirement message; code generation remains compatible. The local PDF extraction helper no longer sends answer-key pages to a provider.

Use `npm run questions:preflight -- <questions.json> <source.pdf>` for no-write source checks. Use the reviewed JSON importer only with complete current release evidence; dry-run reviewed exports need no database credentials. Nothing in this retirement makes a question publish-ready. Semantic source/answer/figure/category review stays mandatory.

The separate dedup prototype at `/Users/zakariabennis/Documents/Codex/2026-10-06/task-6` is not yet a stable final-corpus release. Preserve existing duplicate protection until its checker and canonical-record/occurrence contract are integration-tested. Keep all per-occurrence version hashes, lineage, answer-content mappings, choice aliases and review holds. Do not merge or publish held records.

This scope is question processing. Essential application APIs, authentication, database/storage access, Desmos and the separate tutor recap integration remain. No provider configuration, billing or security settings were changed.

Rollback is restoring the prior code commit. There is no data rollback because no production records were changed. Rollback must not automatically resume paid processing; re-enabling provider calls would require an explicit new decision.
