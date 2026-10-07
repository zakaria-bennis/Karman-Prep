# Canonical skill read contract

The approved 39-skill catalog is the canonical classification lane. Persist exact skill/domain IDs in the frozen `approved_tags` private evidence already written by the reviewed importer. Read them through `fetchCatalogQuestionPool`; keep old `concept_slug`, `node_id`, attempts, profiles and learning history unchanged. No 39-to-89 mapping, production migration or new public-client permission is required for this read foundation.

## Implemented local foundation

- Metadata lives at `answer_key_entries.raw_model_response.approved_tags` for official keys and `.evidence.approved_tags` for generated keys. The service-only reader supports both, rejects ambiguous duplicate keys, verifies exact catalog labels/domain/source/D hashes, and paginates deterministic metadata reads.
- Requested skill must be one of the actual 39 IDs. Subject/domain/topic and exact difficulty interval 1–7 are filtered independently of old nodes. Invalid or injected scope strings reject before a database call.
- Student delivery requires both current database publication gates and private evidence `student_publication_allowed=true`. Current pilot remains false. An approved canonical tag alone never makes a draft playable.
- Delivered question/choice/figure/key/review content must match the separately frozen `approved_tags.question_payload_sha256` seal. The seal excludes database UUIDs, display order and legacy node links, but includes actual student fields, choice-letter content, active key and review text. Missing/changed seals fail closed. A seal is integrity evidence, not independent release approval; create/bind it only after exact source, answer, figure, renderer and identity gates pass. Current pilot adapter deliberately does not fabricate this final seal.
- Read-only `actionCatalogPracticePool` checks real student/admin role and returns the existing answer-free student DTO. `actionCatalogAssignmentPool` checks current tutor/admin relationship before reading and returns the same safe preview. Neither starts an attempt, publishes, creates an assignment, sends a message or writes history.

This is a concrete pool/read foundation, **not a completed canonical quiz or tutor assignment flow**. No canonical play CTA is enabled yet. Existing legacy quiz actions and their strict node schema stay intact.

## Next bounded implementation

Create the explicit canonical practice session lane, rather than widening the old node regex or copying skill IDs into legacy node columns. Recommended additive schema: nullable `quiz_attempts.catalog_skill_id` plus a separate scope marker, with legacy `node_id` preserved for old attempts; canonical attempts use their own owned immutable question/version snapshot and atomic start/response/complete path. Keep response ownership/retry/resume semantics, and do not update legacy node mastery counters from a canonical skill session. Enable `/learn/practice/[skillId]` only against that tested session contract. Add real tutor assignment binding only after current student relationship, selected immutable reviewed versions, role denial and revoked access are tested. This is an engineering task, not a request to manually map 89 legacy slugs.

Before a large release, measure/index the two JSON paths or project reviewed tags into an additive canonical binding table; never backfill tags from label similarity or infer mastery from old lesson status. A schema choice remains local until its migration/readback/rollback and separately reviewed production release.

## Verification boundary

Synthetic unit/query/action tests cover both key envelopes, private holds, difficulty/publication filters, no legacy mapping, pagination, duplicate/conflicting/stale evidence, post-review text edits, answer separation and linked/revoked assignment preview. Disposable database readback and actual PostgREST query results are recorded outside the repository. Production authenticated browser persistence and canonical session UI remain separate gates. Box/source releases and all historical data are preserved.


## Source formatting and annotation gate

Text equality and the delivery seal protect bytes; neither establishes visual fidelity. Keep every source annotation until its purpose is explicitly resolved in an exact-version display binding. A trailing note can carry an essential underline, italic span, unit, table header/footer, graph boundary or shading condition. Do not drop it as metadata or leave it accidentally appended to option D. Preserve it as supported explicit display structure or faithful question/figure content; otherwise hold the question. Maintain original source pixels and approval lineage separately from G identity normalization.

Current MathText renders reviewed `<u>...</u>` and `[[u]]...[[/u]]` underlines plus supported explicit math; it does not render arbitrary HTML or prose italic markers. passage_intro is a separate italic attribution field, not a replacement for italic spans inside passages/choices. Source-required prose italics or unsupported stacked math therefore need a source-bound display amendment and renderer acceptance before publication. The new exact24 approved-C display derivative repairs four exponent/unit losses without changing approved words or G identities, but does not clear the newly identified Q206/Q222/Q200 italic holds. Q283 now has a separately hash-verified F binding and content-addressed same-origin asset in the new v3 derivative; final render acceptance is recorded separately, never inferred from a cached figure preview.

The frozen delivered snapshot includes actual question/passage markers, structured figure/chart/geometry data, table captions/headers/rows/footer notes, choice text/table data and figure accessibility text. Tests reject seals after such content is removed. Essential asset bytes must additionally bind to the immutable F digest/version; an unchanged URL alone cannot prove an unchanged image. Compare source pixels with the actual student renderer at phone/desktop in both themes, including underlined/italic spans, source units, fractions, table notes and figure labels. Keep a per-item receipt; plain-text equality and zero KaTeX/overflow errors do not substitute for that receipt. This pilot has no native table payloads, so synthetic table preservation tests do not clear corpus table fidelity.
