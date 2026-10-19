# KARMAN Prep question import process

Prepared for Zakaria Bennis and Claude Code on October 17, 2026. All dates and times are UTC.

## Purpose and starting point

Continue the existing released-exam import pipeline. Use the saved source packages, independent solutions, review evidence, importer, publication gate, and ledgers. The job is to turn every agreed source occurrence into a verified live question, a certified duplicate linked to a live question, or an evidence-backed genuinely broken question.

The established path is:

**Original PDF → indexed source occurrence → extracted and normalized content → source and answer review → live-bank deduplication → complete assets and classification → importer validation and dry run → private database stage → exact stored-payload seal and guarded publication → production and student-catalog readback → reconciled ledger and next cursor.**

This is a continuation guide, not a request to replace the importer or redesign the database. It distinguishes the workflow recorded in the existing publication task from details Claude must inspect in the current checkout. No Mac files, application code, or production database were changed to prepare this document.

### What is verified and what must be refreshed

- **Last verified published-catalog checkpoint:** 2,624 questions on October 16 at approximately 10:26. The final ten additions passed production answer and student-payload checks; 36 focused ledger/count tests passed.
- **Interrupted next operation:** the publication task subsequently claimed it had published October 2025 US V2 RW M2 Q11, a country/year table, and was about to check the live row and count. The session failed on a coding usage limit at approximately 10:32. There is no recorded final readback proving that row or a total of 2,625. Reconcile it first.
- **Current checked and privately loaded totals:** unknown. Neither a cumulative review total nor a current private-stage total can be inferred from 2,624.
- **Current checkout and production state:** must be inspected. Recorded task messages are evidence of previous operations; they do not establish today's branch, deployed revision, database contents, running processes, or authenticated session.

The historical `2025-10_US_V1_MATH_M1_Q06` cursor is an asset hold, not an instruction to restart there blindly. Later work had already moved to US V2. Read the latest saved cursor and reconcile the interrupted operation before choosing the next candidate.

## 1. Locate the existing inputs and implementation

These are recorded locations from the October 16 handoff and publication history. Verify that they exist in the actual working environment before using them.

| Resource | Recorded location or name | Use |
|---|---|---|
| Active task workspace | `/Users/zakariabennis/Documents/Codex/2026-10-11/task-3` | Recent manifests, snapshots, ledgers, source outcomes, and release work |
| Repository within that workspace | `karman-release` | Inspect its actual branch, changes, scripts, schema, and app code |
| Recorded repository | https://github.com/zakaria-bennis/Karman-Prep | Project reference; do not assume GitHub main contains the latest local work |
| Original PDFs | `/Users/zakariabennis/Library/CloudStorage/Box-Box/SAT_Digital/Released_Exams` | Source of truth for printed question content |
| Extracted source images | `/Users/zakariabennis/Documents/Codex/2026-10-05/task/agent-a-output` | Reusable source captures and corpus/per-exam indexes |
| Corpus index | `corpus-index.json` and per-exam indexes under the extracted-image root | Resolve source exam, version, module, question, and image evidence |
| Reviewed-question importer | `scripts/pdf-pipeline/import-reviewed-questions.ts` | Existing importer validation, dry-run/export behavior, and reviewed input contract |
| Publication gate | `publish-gate.mjs` | Locate the actual file and callers; inspect current guards and supported invocation |
| Catalog scope | `src/lib/question-bank/catalog-question-scope.ts` | Application publication/visibility rules and related delivery checks |
| Production site | https://karmanprep.com | Student-facing application |
| Admin importer | https://karmanprep.com/admin/questions/import | Recorded supported bulk import and SVG asset-upload route |
| Existing infrastructure | KARMAN Supabase database and Cloudflare Worker `karmanprep` with its existing R2 binding | Database records and production asset storage |

Read repository instructions, the README, `docs/handoff.md` if present, package scripts, and the importer/gate code. Preserve unrelated uncommitted work. Confirm the existing database target through the authorized project configuration; do not create a replacement database or change storage bindings.

**Not verified here:** the original extraction command, OCR engine, complete script inventory, exact import JSON schema, database table/column definitions, names of the required binding-hash fields, CLI flags, deployed commit, and current production count. Derive these from the existing checkout and artifacts. This guide intentionally does not supply guessed SQL, new schema migrations, or made-up commands.

## 2. Count the right things

The workflow has several different units. Keep them separate in code, ledger reconciliation, and progress reports.

### Source occurrence

A question appearing at a particular exam/version/module/question position. A stable recorded example is `2025-10_US_V1_MATH_M1_Q06`. Two occurrences can represent the same underlying question, and source captures or corrected packages can be revisions of one occurrence.

Preserve both the stable identity and the exact source/package revision used for a decision. Hashes prevent a review of one revision from silently approving another.

### Unique published question

A production question that passes the application's actual publication and delivery rules. Multiple source occurrences may map to one live question. The database-wide published catalog can also include questions outside the selected source inventory.

### Checked, privately loaded, and published

- **Checked:** the specified source/content/answer reviews are complete for the identified revision. State which checks and which source scope the number covers.
- **Privately loaded:** the question and associated records exist in staging/private review state. It is not yet a verified student-visible question.
- **Published:** exact production IDs, answer records, required bindings, payload seals, and application visibility have passed readback.

These are progress measures, not three disjoint final categories. A published question may also have been checked and privately staged earlier. Do not add those numbers together.

### Historical inventory sizes

- **5,794 occurrences across 62 exams:** the selected released-source inventory reported October 16. It is not a count of unique questions or proof that every available PDF is included.
- **11,920 raw occurrences:** a broader capture/revision count. It is not 11,920 unique usable questions.
- **“Total possible questions”:** the owner's term for cleaned candidates that need only deduplication before upload. Count only candidates that genuinely meet that readiness definition. Do not substitute all raw occurrences, all pending records, or a desired target. A reliable current value has not been established.

### Catalog count versus raw live rows

On October 16 around 07:26, reconciliation found **2,525 published-catalog questions versus 2,707 raw `is_live` rows**. The 182-row difference was older non-ready data. A previous claim that the difference proved another publisher was running was incorrect.

Use the current application scope and delivery checks. Do not count only `is_live`, and do not permanently subtract 182 as a shortcut. A later check also found that the student skill pool required answer-record binding hashes that a simpler SQL count did not cover. Database counts must therefore be paired with the app's row-level eligibility and payload validation.

## 3. Inventory the original sources without redoing completed work

### Existing approach

The project already has PDFs, extracted source images, corpus/per-exam indexes, and saved outputs referred to as A/B/C/D/CF. Recent publication work reused these packages and joined evidence using stable source identity and exact hashes. Those letter labels alone do not establish the current contents or responsibilities of each output; inspect them before joining.

### Procedure

1. Enumerate the agreed PDF set from the existing inventory. Preserve the PDFs read-only.
2. Resolve the exact exam date, region, version, subject, module, and question number through the saved index.
3. Locate the corresponding source capture and existing extraction package. Confirm that the capture includes the entire passage, question, choices, and any essential figure/table or continuation.
4. Identify competing revisions. Use the current reviewed source/package hashes; do not merge content from an old capture with answers from a corrected revision.
5. Reuse completed extraction and review where the source and reviewed payload are unchanged. Extract again only for a missing or defective package, a new source, or a changed revision.
6. Record any source coverage gap explicitly. An unreadable file, missing page, or incomplete crop is an extraction/evidence hold until the original source has been checked.

**Output:** one traceable occurrence with its exact source evidence and links to the current extraction/review package. At this point it is not assumed unique, valid, or ready to publish.

## 4. Normalize text, mathematics, tables, and figures

Keep the student question faithful to its source while correcting supported extraction errors. Source fidelity includes meaning-bearing typography.

### Text and Reading and Writing

- Preserve passages, prompts, all answer choices, blanks, paragraph structure, poem line breaks, notes, and titles.
- Preserve exactly which words are underlined or italicized. The existing renderer has been used with supported `<u>` markup; inspect the current accepted markup rather than introducing a new format.
- Fix OCR spacing, capitalization, or punctuation only when the source resolves it or an explicit reviewed correction supports it.
- Do not silently proofread the author's printed wording into a different question. A source typo can be retained with a review note if the question remains unambiguous and the answer still holds.

Recorded examples from October 16 include restoring capital “It” where the image had it, preserving a poem's line breaks, and keeping a comma outside the exact printed underline. An earlier proposed punctuation fix was rejected because it was not present in the source.

### Mathematics

- Preserve fraction structure, signs, roots, exponents, subscripts, parentheses, inequalities, units, and requested quantities.
- Make grouping explicit in the supported renderer representation. Do not allow OCR to turn an exponent, denominator, or subscript into ordinary adjacent text.
- Keep exact source values. Changes in numbers or answer format can distinguish a legitimate variant from a duplicate.
- Test the structured representation through the shared question renderer and importer. Do not invent a bespoke layout for each question.

### Native tables

The existing pipeline supports structured tables in the database and a shared table renderer. Many previously visual-held items were released through this route without an external image upload.

Check caption, headers, row/column order, every data cell, units, and any table content inside choices. Preserve relationships between table values and the question. An actual source conflict must not be disguised by changing variable labels to make the table fit.

### Figures and images

Use the reviewed source-bound figure/SVG where the question requires it. Do not omit a graph, essential diagram, or choice image merely to move the question through the text-only importer.

Choose among the **existing** supported representations:

1. No figure, for a genuinely text-only item.
2. A native structured table, when the source can be faithfully represented by the supported table schema.
3. A reviewed figure asset using the supported upload/storage path.

**Known staging failure:** on October 16 around 08:22, a text-only private row inherited `figure_kind='image'` when figure data was omitted. The exact private row was corrected to a null figure and resealed before publication. For text-only rows, verify explicit absence of figure data through the current importer contract and the stored readback; never assume omission and null have the same effect.

**Output:** a complete candidate in the existing structured content format, plus an explicit record of source-supported corrections. Any content change invalidates affected downstream hashes and review bindings until they are refreshed.

## 5. Establish semantic validity and independently verify answers

Schema-valid text can still be an unusable question. Answer review must evaluate the exact displayed content, not merely repeat the printed key.

### Required checks

1. Confirm the question has the information needed to solve it and asks a coherent, determinate task.
2. Reuse a saved independent solution only if it belongs to the exact source and normalized content revision. Otherwise solve the current question.
3. Compare the independently verified answer with the printed/source key. Keep both and document any discrepancy.
4. For multiple choice, verify the correct answer text and its current choice ID/letter. Ensure there is exactly one defensible choice and that no extraction error created identical or ambiguous options.
5. For numeric entry, determine the full valid response set allowed by the prompt, then test the application's actual grading rules for equivalent forms, permitted precision, and rejection of incorrect near values.
6. Attach the answer evidence and classification evidence to the exact source/content/choice version using the binding mechanism already implemented.

### Printed answer conflicts

The owner prefers an independently verified correct answer over an erroneous printed key. That requires a defensible solution from intact source content, not an unsupported override. Preserve the printed answer and the reasoning for the correction in the existing evidence format. If the source remains ambiguous, hold it for resolution.

### Numeric answer sets

The recorded workflow verified both `2.4` and `4.8` for a quadratic that accepted either root, then checked that the application accepted both from the bound answer set. Another question tested `7/3` and `2.333` while rejecting nearby values and an inapplicable larger root. These are examples of question-specific grading checks, not blanket tolerance rules for all numeric questions.

### Source defect versus repairable package defect

- A dropped symbol, truncated crop, missing choice, or OCR error is first an extraction/assembly problem. Repair it from source where possible.
- A wrong printed key can be corrected after independent verification when the actual question is sound.
- Contradictory printed data, an unresolved variable/table mismatch, insufficient information, or multiple equally defensible choices may be a genuine question defect.
- A package marked “broken” upstream is not enough to classify the source question as BROKEN. Inspect the stated defect and the original evidence.

**Output:** source-bound validity and answer evidence, with any unresolved issue held explicitly. Do not certify readiness from answer-letter agreement alone.

## 6. Deduplicate against the live bank and review variants

### Existing guards

Recorded importer/publication work checked source identity, content hashes, and matching stems against the live database. Full content and answer comparisons were used when stems matched. Use the current implementations and refresh the production preflight immediately before staging/release as appropriate.

### Decision procedure

1. Look for the same source occurrence or already imported stable identity. An interrupted prior import should be reconciled, not inserted again.
2. Look for exact normalized content/hash matches in the current live bank.
3. Inspect candidate stem matches and near matches using the full passage, prompt, table/figure, numbers, choices, and requested answer.
4. Compare correct answer **text/value**, with a mapping between choice orders. A changed letter alone does not make a new question.
5. Record one decision for the occurrence: unique candidate, certified duplicate linked to a verified live ID, or unresolved variant hold.
6. Preserve the matching evidence and current source/content hashes so the decision can be reused safely.

### Examples from the established workflow

- **Reordered choices:** October Asia V1 RW M1 Q23 matched a live October US V3 question with “Likewise” under another letter. It was excluded as a duplicate.
- **Changed numerical problem:** October US V1's triathlon question used 17.700 mph and numeric entry; the similar live question used 19.3 mph and multiple choice. It passed separate review as a distinct variant.
- **Generic stem, different data:** a question with the same generic wording but different data lists/table and answer was reviewed as a variant rather than automatically suppressed.
- **Substantively different text:** US V1 RW M1 Q06 used different examples and choices from V2, passed a separate variant review, and was included in the verified 2,624 checkpoint.
- **One changed distractor:** the later US V1 RW M2 Q06 was rejected by the importer stem guard and recorded as a semantic-duplicate hold. A guard rejection by itself is not proof of a certified duplicate; preserve the exact decision and inspect its evidence before promoting its terminal status.

An occurrence can be terminally CERTIFIED_DUPLICATE only when it links to a specific question that is actually live and the equivalence is justified. A match to another unpublished candidate is a useful deduplication lead, but the duplicate still needs a live representative before final closure. Keep one canonical candidate and avoid staging both while that is resolved.

## 7. Complete assets and bind the reviewed version

### Asset path already recorded

The authenticated KARMAN admin bulk importer uploads SVG data URLs through the existing Cloudflare R2 binding. An earlier queue contained 53 reviewed SVG rows awaiting that route; the number is historical and must be refreshed from the ledger.

Before release:

- Confirm the asset belongs to the exact occurrence and source revision.
- Check the reviewed figure's labels, units, geometry/data, and choice association.
- Use the existing authorized upload route and retain the stored asset reference returned by it.
- Verify the reference in the exact question payload, and check that the production asset resolves through the application's supported delivery path.
- Refresh any asset-dependent payload hashes or bindings when the asset or its reference changes.

The prior admin session was signed out. If it is still unavailable, keep affected questions in an asset hold and continue independent nonvisual or native-table work. Do not manufacture an asset URL, set a false no-figure flag, create a new storage account, or call a missing upload a broken question.

### Classification and version bindings

The established workflow includes subject/module/source metadata, skill classification, classification evidence, and answer/content binding checks. A private-stage publication guard previously caught a missing classification envelope. Another October 16 check found that the student skill pool required **two version-binding hashes in each answer record**; some rows had passed a SQL count without satisfying that delivery rule.

Inspect the current code to identify the exact field names, version inputs, and hashing functions. Generate bindings through that implementation. Never fabricate hashes or copy a binding from a different question/revision. Metadata repair is justified only when the exact production payload still matches the saved source/review evidence. Verify the repaired row through application scope and payload checks afterward.

## 8. Validate and freeze an import batch

Use `scripts/pdf-pipeline/import-reviewed-questions.ts` and its existing schema. Discover its supported commands and flags from the checkout; do not substitute a new ad hoc importer because a candidate fails validation.

### Preflight checklist

- Stable source identity and correct revision
- Complete passage/stem/choices or numeric-response content
- Supported text/math/table/figure representation
- Correct answer mapping or accepted numeric answer set
- Current independent answer and source evidence
- Complete classification and required version bindings
- Required stored assets, or a supported native table/no-figure representation
- Live-bank duplicate and variant decision
- Successful importer validation and dry run/export checks
- Focused renderer/grading tests for the affected content types

Freeze the reviewed candidate list and its content/answer/asset hashes into the existing manifest/export format. Keep stable IDs and the exact payload versions that passed the checks. A later content edit requires the affected checks and hashes to be recomputed before using that manifest.

Record the proposed production IDs and rollback references through the current workflow. Rollback files document a reversible change; their existence does not authorize running them indiscriminately.

### Practical evidence checklist

The following describes the information needed to trace a question. It is **not an actual database schema or import JSON contract**; map it to the existing artifacts and types rather than creating new fields blindly.

| Evidence group | Information to retain |
|---|---|
| Identity | Stable occurrence ID, exam/version/subject/module/question, source revision |
| Source | Original PDF reference, page/capture, source/package hashes |
| Content | Exact normalized payload, choices/tables/figure references, payload hash |
| Corrections | Original value, corrected value, source-supported reason and evidence |
| Answer | Printed key, independent solution, chosen answer mapping/set, version-bound evidence |
| Classification | Existing skill/topic assignment and its required evidence/bindings |
| Deduplication | Candidate live matches, comparison result, certified target live ID if applicable |
| Release | Frozen manifest, exact database IDs, private snapshot, seal, guarded release and rollback reference |
| Verification | Production readback, app-scope/payload results, verification time |
| Disposition | Terminal result or precise pending reason, next required action, ledger/cursor reference |

## 9. Stage privately and seal the exact stored payload

Recent successful releases used the following sequence:

1. Run importer validation and the current production duplicate preflight on the frozen reviewed records.
2. Insert/load the scoped question, choice, answer, and associated evidence records in private review state through the established workflow.
3. Read back the exact stored records by their expected IDs.
4. Compare source identity, content, choice order, answers, tables, figure fields, classification, and required bindings with the reviewed manifest.
5. Resolve any supported private-stage discrepancy, then rerun the affected validation and recompute the snapshot/seal.
6. Use the production student-payload code to calculate the required seals from the **actual stored snapshot**.
7. Save the private snapshot and release evidence before publication.

The private stage is important because defaults, serialization, or missing associated records can make the stored payload differ from the preview. A successful insert is not proof that the intended payload was stored. The recorded no-figure default and missing classification-envelope incidents were caught at this boundary.

During the October 16 executor interruption, fourteen questions remained private after passing source, answer, importer, and duplicate checks. On resumption, the task first compared current Supabase rows with the saved private snapshot, then computed production seals and published the matching rows. Follow that pattern for interrupted work.

## 10. Publish through the existing gate

Locate `publish-gate.mjs`, the current release helpers, and the callers used by the recent manifests. Inspect the exact predicates before writing. Recorded releases used scoped, guarded, reversible publication SQL after private-stage readback and sealing.

The required invariant is that the rows being published are the same versions that passed review and staging. Guards have been described in the publication history as checking source identity, content, choices, answer evidence, and stored payload/seal state.

- Keep one production writer. Parallel workers may prepare/review separate source slices, but they must not race staging or release operations.
- Keep writes bounded to the reviewed IDs. Module-scale preparation can be released in smaller reversible transaction groups.
- If a guard fails, determine which identity, content, answer, binding, or state changed. Re-read the affected rows and fix the cause within the existing workflow.
- Do not bypass a duplicate guard, remove a visibility requirement, or mark a row live merely to increase the count.
- Do not perform unrelated repairs to older production rows just because they appear in a broad count query.

Publication and application deployment are separate operations. A data release does not prove that local renderer/importer code is deployed. If a batch depends on a code change, verify the deployed implementation through the project's actual deployment workflow before claiming the student payload is supported. No deployment command is established by this document.

## 11. Verify production and actual student eligibility

Read back the precise released IDs. The catalog total is a useful reconciliation check, not a replacement for row-level verification.

### For every released row

- Expected stable/source identity and production ID
- Intended publication state under the app's current visibility predicate
- Complete question content and correct choice order/count
- Matching answer key and correct choice text/value, or correct numeric answer set
- Correct tables and figure/no-figure fields
- Required skill/classification bindings and answer-record version hashes
- Production payload seal matching the reviewed/stored content
- Required asset reference present and deliverable
- Eligibility through the actual student catalog/skill-pool checks

For numeric questions, verify grading behavior on valid equivalents and representative invalid inputs when the answer representation is new or changed. For native tables, verify stored cells and shared-renderer behavior. Do not use student progress, attempts, or other unrelated records as test fixtures.

### Visual verification should stay bounded

Use the shared renderer and automated structural/payload checks across the batch. Inspect at most **five representative difficult rendered questions**, concentrating on the types affected by a change: stacked fractions, roots/exponents, source underlines, native tables, complex figures, or narrow-screen layouts.

Do not create a screenshot-by-screenshot visual audit of every question. Source-content review still has to be reliable, but unchanged source images and prior review evidence should be reused. When common renderer code changes, cover relevant mobile/desktop layouts and rerun the affected regression tests.

The October 16 checkpoint established focused tests and individual new-row delivery checks. It did **not** establish a fresh authenticated end-to-end student-browser test of the entire site. Keep that limitation explicit in any broader quality claim.

## 12. Record outcomes and reconcile the ledger

### Terminal outcomes

**LIVE**

The occurrence maps to a valid unique question in the published application catalog. The exact ID, answer, assets, classification, required bindings, and student payload have been verified. Record the live ID and verification evidence.

**CERTIFIED_DUPLICATE**

The occurrence is equivalent to a specific verified live question. Record that target live ID, full comparison evidence, and any answer-choice mapping. It contributes to resolved source coverage without creating another unique live question.

**BROKEN**

A genuine source/question defect prevents a defensible usable question after reasonable source-supported repair attempts. Record the precise defect, supporting source evidence, and why a correction cannot currently be justified. An upstream package label is insufficient.

### Temporary working states

PENDING covers incomplete review, missing evidence, variant review, repairable extraction, an essential asset/upload hold, authentication, private staging, an interrupted release, or uncertain post-publication readback. Keep these reasons separate so another worker can act on them. None is automatically BROKEN.

### Reconciliation procedure

1. Update each affected occurrence from its saved decision and exact production readback.
2. Update source/module totals and the aggregate ledger using the existing reconciliation logic.
3. Within the same selected inventory, verify that LIVE + CERTIFIED_DUPLICATE + BROKEN + PENDING equals the inventoried occurrence count, with each occurrence assigned once.
4. Separately compute the database-wide published-catalog count through the app's current scope and delivery checks.
5. Reconcile the expected count delta to the exact released IDs. Separate new rows from metadata repairs, already-live matches, duplicate decisions, and changes outside this source inventory.
6. Save a cursor containing the actual next actionable question plus preserved earlier holds. A single blocked asset must not hide independent ready work.
7. Run the focused ledger/count regressions and record the measurement time.

Use saved manifests and decision files for reconciliation. Do not reopen the entire question bank because a summary counter is stale.

### Historical aggregate caution

At approximately 09:57 on October 16, the selected inventory was reported as 2,374 live, 22 certified duplicates, 20 broken, and 3,378 pending, totaling 5,794. Later publication and duplicate reconciliation superseded that snapshot. Around 10:08, the task specifically reported that the ten October Asia duplicate decisions had been incorporated and the aggregate duplicate count was 32. It did not provide a fully refreshed final four-category aggregate at the end of the interrupted session.

Do not mix those timestamps into a fabricated current breakdown. Refresh the existing ledger cheaply from the later manifests and decisions.

## 13. Resume efficiently after interruption

Use this order at the start of Claude Code's continuation:

1. **Inspect the working environment.** Confirm the real checkout/worktree, branch, uncommitted changes, source artifacts, required services, and actual importer/gate implementation. Check whether an importer/publisher is already running before becoming the sole writer.
2. **Read the latest checkpoint artifacts.** Start with the latest release manifest, private snapshot if present, source outcomes, `current-readiness-ledger.json`, and `pending-next-cursor.json`. Use their content, timestamps, and hashes rather than filename order alone.
3. **Reconcile the unverified US V2 RW M2 Q11 operation.** Locate the manifest or planned/staged IDs for this country/year table and inspect its actual database state. Do not increment 2,624 or retry an insert based solely on the last message.
4. **Choose the correct recovery branch.**
   - Already published and fully valid: record verified readback and complete the missing ledger/cursor update; do not import again.
   - Present privately and unchanged: reuse matching review evidence, re-read the exact snapshot, seal, and continue through the publication gate.
   - Absent: retry only the scoped missing work through normal validation and staging.
   - Partial or mismatched: reconcile the exact affected IDs/associated records and resolve the discrepancy before release. Leave them pending until verified.
5. **Measure the real baseline.** Report a fresh published-catalog total and timestamp, plus checked/private-loaded totals only if measured.
6. **Select the next ready source slice.** Preserve US V1 Math M1 Q06's asset hold and any other unresolved evidence. Use the reconciled cursor rather than returning to an already-completed text queue.
7. **Reuse approvals and evidence for unchanged work.** Refresh only checks whose inputs or external state changed, particularly live deduplication and database readback.
8. **Process a practical batch end to end.** Review, freeze, stage, seal, publish, read back, and reconcile. Continue with independent ready questions while an asset-dependent subset remains held.
9. **Leave a restartable checkpoint.** Save exact IDs/hashes, release outcome, pending reasons, and next actionable source/question. A process stopping between publication and ledger write must not cause duplication on restart.

The historical October US V1 reconciliation near 10:30 reported 57 live, four certified repeats, seven Math asset holds, and 30 other holds across 98 occurrences. Read the latest per-question decisions to distinguish those other holds and the semantic-duplicate review from terminal outcomes. October Asia V1's last full source report near 09:39 was 64 live, ten duplicates, 13 awaiting evidence, and 11 held. Both are historical source checkpoints, not current production totals.

## 14. Common failures and the correct response

| Symptom | What it may mean | Focused response |
|---|---|---|
| Importer/schema rejection | Missing field, unsupported representation, stale reviewed format | Inspect the exact validation error and current schema; repair only the affected record and rerun its checks |
| Question labeled broken upstream | Defective extraction/package or genuine source defect | Inspect original evidence; repair recoverable assembly/OCR before considering BROKEN |
| Printed key disagrees with solution | Wrong key, bad extraction, or ambiguous question | Verify exact source, independently solve, preserve the discrepancy; publish a corrected answer only when defensible |
| Same stem in live bank | Exact duplicate or distinct variant | Compare passage, data, figures, choices, requested quantity, and answer; keep a live-ID-linked decision |
| Correct answer letter changes across versions | Reordered choices | Map by answer text/value and preserve the mapping |
| Text-only row stores an image flag | Database default or incomplete input | Correct the exact private figure representation through the supported path; re-read and reseal |
| SQL count includes a row that fails skill-pool delivery | Missing classification/version bindings or another app predicate | Inspect current app rules; use exact saved evidence for scoped repairs, then rerun row-level eligibility and payload checks |
| Private payload differs from preview | Defaults, serialization, stale input, incomplete related rows | Keep private; compare the full stored snapshot, correct the cause, regenerate affected evidence/seal |
| Payload seal or publication guard fails | Changed content/answer/binding/state | Re-read the affected records and trace the changed input; never bypass the guard |
| SVG upload unavailable | Missing supported asset route/session | Retain reviewed asset and pending reason; continue nonvisual/native-table candidates |
| Lost executor or coding usage limit | Execution interruption | Preserve artifacts; on resume reconcile database state before retrying. Do not classify content as broken |
| Count jump or ledger mismatch | Different count scope, stale summary, external changes, or unrecorded release | Compare scope and exact IDs before inferring another writer; refresh from saved manifests |
| Expired/denied action approval | Tool authorization state needs resolution | Stop repeating the same expired request or rewriting around a denial; identify the exact action/blocker and use the supported approval route if required |
| Tests pass but new UI behavior is absent in production | Local code may not be deployed | Verify deployed revision and the authorized deployment path before claiming production support |

## 15. Keep throughput high without weakening checks

- Parallelize independent source review, answer solving, classification, and preparation. Give each reviewer a nonoverlapping source slice and exact revision/hash inputs.
- Have reviewers return completed candidate records, evidence, duplicate/variant findings, and explicit holds. One writer integrates and releases them.
- Cache source extraction, source images, independent solutions, deduplication evidence, renderer results, and hashes. Reuse them when their inputs have not changed.
- Refresh production-state checks where freshness matters. Cached review does not prove a question has not since been imported elsewhere.
- Work in module-sized or otherwise sensible batches. There is no mandatory batch size of 100, and five questions is not a stop condition. Keep individual writes small enough to inspect and reverse safely.
- Use targeted tests for the changed content types and focused ledger/count regressions. Do not repeatedly audit all previously cleared questions.
- If no publication is occurring for roughly 15 minutes, identify the actual bottleneck and move an independent ready slice forward where possible. Do not relax validity, deduplication, or publication gates to manufacture progress.
- Report substantial verified progress, a material blocker, or a decision needed. Avoid claiming background progress when no process or verified result supports it.

## 16. Artifacts to reuse

Discover the actual paths in the task workspace and repository; some are task-root relative. Inspect their contents and dates before assuming they are the latest.

| Artifact | Purpose |
|---|---|
| `release-source-occurrence-inventory.json` | Selected source coverage and occurrence identity |
| `current-readiness-ledger.json` | Current readiness/final-state reconciliation |
| `readiness-db-delta.json` | Ledger versus database reconciliation |
| `pending-next-cursor.json` | Restart location and outstanding holds |
| `october-question-continuation-2624.json` | Last fully verified published checkpoint and linked release/rollback evidence |
| `october-question-continuation-2614.json` and `october-question-continuation-2608.json` | Earlier release checkpoints for delta reconciliation |
| `oct25asiav1-source-status-20261016.json` | Per-source outcomes and unresolved evidence/asset issues |
| `oct25asiav1-five-release-manifest.json` | Reviewed October Asia release and associated references |
| `oct25asiav1-source-five-release-manifest.json` | Later source-reviewed October Asia slice |
| `oct25asiav1-rw-three-release-manifest.json` | Reading/Writing release evidence |
| `oct25usv1-numeric-followup4-release-manifest.json` | Numeric-answer release evidence |
| `oct25usv1-rw-plain-two-release-manifest.json` | Text Reading/Writing release evidence |
| `catalog-2578-to-2597-reconciliation.json` | Historical count/ID reconciliation |
| `sep25usv4-math-m1-nonvisual14-private-snapshot.json` | Example of a saved private stage successfully resumed after disconnection |
| Other `*release-manifest.json`, source outcome files, private snapshots, reviewer evidence, and rollback SQL | Exact row histories, staged state, decisions, and recovery references |

Do not invent an artifact for the interrupted US V2 release if none exists. Search the actual recent files and production source identity, then establish the outcome from evidence.

## 17. Completion and reporting

An individual release is complete when the exact reviewed questions are verified in production and student delivery, and the manifest, ledger, counts, and cursor are reconciled.

The released-source phase is complete when the agreed source inventory is fully enumerated and every occurrence is LIVE, CERTIFIED_DUPLICATE linked to a live ID, or genuinely BROKEN with evidence. Remaining extraction, review, asset, authentication, staging, or readback holds mean the work is still pending. State any source coverage outside the selected inventory.

Use a compact progress report:

- Published catalog: current verified total, timestamp, and verified new IDs/count since the last checkpoint
- Selected source progress: LIVE / CERTIFIED_DUPLICATE / BROKEN / PENDING, with inventory scope and measurement time
- Checked and privately loaded: separate measured totals, or explicitly unknown
- Cleaned candidates needing only deduplication: measured value under the owner's definition, or unknown
- What changed: releases, certified live duplicates, supported fixes, and genuine source defects
- Next action: exact source/module/question or a precise required access/asset step

Do not report a target as achieved from raw occurrence counts, claim an upload is published before readback, or count repaired metadata as newly imported questions.

## Evidence and dates

The operational history is the existing KARMAN publication task (ID `01a12c0f-f39e-701b-b2d6-e048f231c03d`), read on October 17, 2026, together with `KARMAN_CLAUDE_CODE_HANDOFF_UPDATED.md` prepared October 16 and its original version. The following recorded events anchor the procedures above:

- October 16 around 04:56–07:08: fourteen US V4 Math M1 questions passed frozen importer and duplicate checks, remained private across an executor interruption, then were read back, sealed with production payload code, and published in guarded groups.
- October 16 around 07:26: 2,525 published catalog versus 2,707 raw live rows reconciled; the concurrent-writer inference was withdrawn.
- October 16 around 08:22–08:33: omitted figure input caused an incorrect image default in private staging; explicit no-figure correction and resealing preceded release.
- October 16 around 08:51–09:39: missing version-binding evidence was identified as a student-pool issue; eight earlier October and four November Asia V3 rows received evidence-backed repairs and row-level verification.
- October 16 around 09:34–09:39: a numeric question's two valid responses were bound to exact content and accepted by the application validator.
- October 16 around 10:08: the saved October Asia duplicate decisions were reflected in a reported aggregate duplicate count of 32.
- October 16 around 10:26: final fully verified 2,624 checkpoint, ten new October US V1 questions, and 36 focused tests.
- October 16 around 10:30–10:32: US V1 source reconciliation, movement to US V2 RW M2 Q11, publication claim awaiting readback, then usage-limit failure.

These dates establish historical evidence, not a fresh production inspection. The current checkout, stored rows, and actual application predicates remain authoritative when continuing.
