# Reviewed difficulty import contract

Local implementation of the user-approved D rating workflow. No production migration, re-rating, deployment or publication is included.

D assigns the final integer 1–7 using the full Math/R&W rubric in `question-imports/chatgpt/KarmanGPT.txt` §7 and B's verified solution. Keep difficulty separate from skill/category. Reassess after substantive wording or figure-information changes. Confidence expresses editorial certainty, not measured first-try success probability. The historical success anchors remain guidance, not observed rates.

## Actual D contract alignment

The implementation was checked against D's actual `difficulty/schema-v1.0.0/record.schema.json` and `difficulty/engineering-contract-v1.0.0/examples.json` / `CONTRACT-ALIGNMENT.md`, under the separate `agent-d-output` folder. No D file was edited.

D's canonical rubric label is `KarmanGPT-historical-rubric-v1.0.0`. Its engineering adapter explicitly aliases that label to `karman-legacy-1-7-v1`, retaining `D_difficulty_rubric_version`. Numeric rating, rationale and confidence are unchanged. The website adapter accepts that actual engineering contract and preserves the original record, both version labels and B/D release lineage in a separate audit artifact.

`difficulty_solution_sha256` is the verified B teacher.json byte hash. `difficulty_content_sha256` is the reviewed B student.json byte hash, **not** the distinct package file-hash-map checksum `content_sha256`. Neither source hash nor package identity is replaced with a newly invented value. Final C/CF text changes require verified re-review and an updated assessment binding, rather than silently using the older B rating.

D's engineering records are assessment metadata, with `website_import_ready: false`. A definitive difficulty does not clear skill uncertainty, source quality holds, withdrawn exam readiness or final website gates.

## Database-free local export

Supply `{ "candidates": [...] }` with an explicit website row and independently verified source identity per candidate. Identity must include stable question ID, the complete B source_version, D_output_version, D_classifications_sha256, accepted_solution_sha256, source_quality_hold=false and current_version=true. The caller must establish the last two from the current frozen manifests and quality controls; they are assertions to verify, not defaults supplied by this adapter.

Use D's actual engineering `{ "records": [...] }` artifact, not a raw skill classification file:

```sh
npx tsx scripts/question-audit/export-reviewed-difficulty.ts candidates.json D-assessments.json source.pdf new-local-export-folder
npx tsx scripts/pdf-pipeline/import-json-direct.ts new-local-export-folder/reviewed-questions.json source.pdf --dry-run
```

The first command requires a fresh local output directory and writes a final-format preview plus a separate lossless audit JSON. It neither loads database credentials nor constructs a database client. The second command automatically selects strict reviewed mode from the export's `import_policy` marker, validates all rows and prints assessments without contacting the database. Omitting a reviewed flag cannot silently send a marked export through legacy defaults.

Each joined row must match the exact question ID, D release/hash, B output version/manifest/final version, package checksum, student-content checksum and verified solution checksum. Duplicate identities, missing assessments, stale versions and skill/difficulty/withdrawal holds abort the whole export. Existing website-row difficulty labels cannot override D's numeric rating.

The output keeps `website_import_ready: false` even if a candidate row mistakenly supplied true. Non-dry-run reviewed import rejects such previews before checking credentials or constructing a client. This local formatting/export check does not certify the separate content, answer, figure, taxonomy, duplicate or final website gates and never promotes questions to publish-ready.

## Reviewed website row fields

The website row carries the exact numeric rating, rationale, editorial confidence, engineering rubric label, solution/student-content hashes, separate difficulty/skill uncertainty and selectability flags, withdrawn-readiness flag, explicit source-quality/current-version assertions and website readiness. B/D version lineage also remains in the export and original assessment audit. Numeric strings are rejected at the D JSON contract. All seven integers persist unchanged.

`rowToReviewedImportInput` permits incomplete website readiness only with explicit preview mode. Normal reviewed normalization requires completed website readiness and all other local hold flags clear. It returns assessment metadata separately from the database question payload, so rationale/evidence do not enter student question text.

## Core writer and compatibility

The shared writer's `{ difficultyPolicy: "reviewed" }` mode requires an exact numeric 1–7. No defaults, truncation or recovery from a legacy band occur in that path. The compatibility enum is derived one-way: 1–2 foundational, 3–4 intermediate, 5–6 advanced, 7 mastery. Never derive the reviewed number back from that band. Duplicate imports skip existing rows; they do not change a prior rating, student attempt, response or mastery history.

Legacy callers retain their existing defaults and historical mappings to avoid silently changing unrelated imports. They must not be used for the approved A/B/C/CF/D/E workflow. The older API extraction orchestrator is not automatically upgraded because it lacks D's reviewed contract. The 39-skill patch, all 89 legacy IDs, diagnostic scoring, adaptive selection and mastery thresholds are unchanged.

Review evidence is retained in immutable source/export JSON and the lossless audit artifact. No dedicated difficulty-rationale/confidence database columns are added here. Broader legacy changes, historical re-rating or persistent audit-storage schema changes would require separate scope. Hash comparison against supplied identity is not itself byte authentication: the final consumer must verify the actual approved source bytes and all current controls before import.
