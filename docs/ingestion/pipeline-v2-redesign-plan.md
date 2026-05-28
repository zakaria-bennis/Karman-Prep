# Karman Prep PDF Ingestion Pipeline v2 Redesign Plan

## Purpose

Create a verification-first SAT question ingestion pipeline that uses the existing v1 pipeline as a baseline but changes the publishing model from high-throughput import to conservative, evidence-backed publication.

The goal is **near-zero published errors**, not zero flags. When uncertain, the system should block or route to human review rather than guess.

---

## V2 North Star

A question may enter the student-facing database only when all of the following are true:

- Source lineage is complete.
- The question has been reconstructed from source evidence.
- The selected official answer has been resolved from the printed key and any manual corrections.
- The verified answer has been independently checked.
- Required figures/tables/charts/graphs are attached and complete.
- Irrelevant calculator/sidebar visuals are ignored.
- Math notation is KaTeX-safe and repaired or blocked when suspicious.
- Open-ended numeric answers are normalized and equivalence-checked.
- The primary curriculum slug is valid and confidence-checked.
- Explanations are generated only after answer verification.
- Reading/Writing explanations are thorough and QA-checked.
- Every grader/model conclusion is stored for review.
- Server-side KaTeX validation passes.
- Manual review is complete when required.

---

## Current V1 Baseline

V1 currently works as:

```text
PDF upload/local file
→ Claude Sonnet whole-PDF extraction
→ Gemini figure bbox/crop
→ JSON to CSV
→ direct DB import
→ explanation fill
→ multi-vote grader
→ job complete
```

The biggest V1 risks are:

- Whole-PDF extraction does too much in one LLM call.
- Answer-key evidence is collapsed into one `correct_answer` field.
- Red-ink/manual answer corrections are not first-class data.
- Source lineage is not granular enough for review.
- Figures depend on extractor-provided `has_figure`.
- Repeated Desmos/calculator panels may be mistaken for problem figures.
- Math notation problems are detected but not repaired.
- KaTeX is not strictly server-side validated before publishing.
- Explanations are generated before full answer verification.
- Import paths, grader systems, and taxonomy sources drift.

---

## V2 Implementation Phases

### Phase 1 — Publish Safety Layer

Purpose: make the current pipeline safer without rewriting extraction.

Add:

- `publish_status`
- `grader_runs`
- `source_assets`
- `answer_key_entries`
- `content_hash_v2`
- strict server-side KaTeX validation script
- updated `quiz_questions_live` view

Key rule:

```sql
select *
from quiz_questions
where publish_status in ('publish_ready', 'publish_ready_with_verified_repair');
```

`import_status` remains ingestion metadata only. It should not control student visibility.

### Phase 2 — Answer-Key Correction System

Purpose: handle printed keys, red-ink corrections, cross-outs, and selected official answers.

New concepts:

```text
printed_answer
manual_correction_answer
selected_official_answer
verified_answer
correct_answer
```

Answer-key parser must store:

- printed answer
- crossed-out status
- manual correction presence
- manual correction color
- manual correction answer
- correction confidence
- selected official answer
- selection reason
- answer-key crop path

Questions with unclear corrections route to human review.

### Phase 3 — Source Asset Lineage

Purpose: make manual review reliable.

Store per-question assets:

- full page image
- question crop
- expanded question crop
- answer-key crop
- figure/table/chart/graph crops
- calculator/sidebar artifacts
- background UI artifacts

Every question review page should let the reviewer compare the website-rendered version against the original evidence.

### Phase 4 — Visual Relevance System

Purpose: distinguish real problem visuals from repeated calculator/sidebar artifacts.

Visual classes:

- `problem_required_visual`
- `calculator_artifact`
- `background_ui_artifact`
- `uncertain_visual`

Repeated Desmos/calculator panels should be detected by recurring location and visual similarity across math pages.

If a visual is repeated across multiple math questions, appears in the left sidebar, and is not referenced by the stem, classify it as irrelevant and do not use it for solving.

### Phase 5 — Math Notation Repair

Purpose: convert suspicious OCR/math notation into verified repairs or
review flags. The defining principle of Phase 5 is **caution over
coverage**: the goal is not to auto-fix every suspicious math expression,
but to auto-fix only obvious OCR notation errors and preserve a full
audit trail for everything else.

#### Storage model

Two text fields per repairable column. The active website value can
diverge from the original extraction once Phase 5 fires, but the
original is always recoverable.

| Table          | Active column    | Immutable snapshot         |
| -------------- | ---------------- | -------------------------- |
| quiz_questions | `question_text`  | `raw_question_text`        |
| answer_choices | `choice_text`    | `raw_choice_text`          |

`raw_*_text` is NOT NULL and backfilled to the current active value on
existing rows during the migration. New imports set it in
`import-csv-direct.mjs`. Phase 5 may overwrite the active column for
verified low-risk repairs only; the raw column is never mutated.

#### Detection (pure regex, scripts/lib/math-notation-patterns.mjs)

| Pattern                          | Example         | Default risk tier      |
| -------------------------------- | --------------- | ---------------------- |
| `bare_digit_after_letter`        | `x2` → `x^2`    | low_risk_ocr           |
| `ambiguous_fraction`             | `1/2x`          | medium_risk_grouping   |
| `ambiguous_rational`             | `x+1/x-1`       | medium_risk_grouping   |
| `sqrt_without_parens`            | `sqrt x+1`      | medium_risk_grouping   |

The detector deliberately excludes chemistry subscripts (`CO2`, `H2O`),
multi-digit suffixes (`x12`), and already-parenthesized forms.

#### Risk tiers (5 values, mirror DB CHECK)

1. **low_risk_ocr** — single canonical interpretation; eligible for
   auto-repair if all 8 conditions pass.
2. **medium_risk_grouping** — parenthesization ambiguous; ALWAYS
   routes to human review.
3. **high_risk_answer_changing** — repair would change the verified
   answer; routes to `blocked_answer_dispute`.
4. **open_ended_uncertain** — `numeric_entry` questions; bumped here
   by `refineRiskTier` so they never auto-repair.
5. **visual_unclear** — Gemini Vision flagged the source crop as
   unclear; routes to `unrepairable_from_source`.

#### 8-condition auto-repair gate

A low-risk repair auto-applies ONLY when all 8 are true:

1. Pattern is `low_risk_ocr` (single canonical candidate).
2. Phase 3 source crop visually supports the repair.
3. Vision confidence ≥ 0.95.
4. ≥ 2 independent solvers agree on the post-repair answer.
5. Repair does NOT change the already-verified answer.  
   (Per user policy: "a model could choose a repair just because it
   makes the key work" — answer-key agreement is necessary but not
   sufficient.)
6. Repair does not create an answer-key dispute.
7. Question is not open-ended with ambiguous notation.
8. `repaired_text !== raw_text` (sanity).

Any failure → `suggested_repair_needs_review`. Eight green → 
`verified_auto_repair`, which surfaces in `publish_status` as
`publish_ready_with_verified_repair` so admins can spot-check.

#### Repair process

```text
detect patterns       (math-notation-patterns.mjs — pure regex)
↓
refine risk tier      (math-notation-logic.mjs — pure)
↓
vision confirmation   (Gemini Flash on Phase 3 question crop)
↓
solver vote × 2       (Gemini + DeepSeek on raw + repaired)
↓
sympy equivalence     (Python subprocess; CI-only)
↓
evaluate 8-cond gate  (math-notation-logic.mjs — pure)
↓
INSERT math_repair_records (append-only audit trail)
↓
if verified_auto_repair → UPDATE quiz_questions.question_text
                         or answer_choices.choice_text
↓
roll up question status → math_notation_status
                          math_notation_checked_at = NOW()
```

#### Status outputs (5 values, mirror DB CHECK)

| Status                          | Publish-gate effect            |
| ------------------------------- | ------------------------------ |
| `no_repair_needed`              | passes (no Phase 5 gate fires) |
| `verified_auto_repair`          | `publish_ready_with_verified_repair` |
| `suggested_repair_needs_review` | `needs_human_review`           |
| `ambiguous_repair`              | `blocked_answer_dispute`       |
| `unrepairable_from_source`      | `needs_human_review`           |

#### Opt-in publish-gate

`math_notation_checked_at IS NULL` → Phase 5 gates short-circuit, same
pattern as Phase 3's `source_assets_processed_at`. Pre-Phase-5 rows are
never newly flagged by the migration alone.

#### Implementation files

| File                                                      | Role                              |
| --------------------------------------------------------- | --------------------------------- |
| `supabase/migrations/…_pdf_ingestion_v2_phase5.sql`       | Schema + view + indexes           |
| `scripts/lib/math-notation-patterns.mjs`                  | Pure regex detection              |
| `scripts/lib/math-notation-logic.mjs`                     | Pure risk-tier + 8-cond gate      |
| `scripts/lib/math-equivalence.mjs`                        | Python subprocess wrapper         |
| `scripts/python/sympy-check.py`                           | SymPy equivalence script (CI)     |
| `scripts/pdf-pipeline/repair-math-notation.mjs`           | Stage 8 runner (orchestrate.mjs)  |
| `scripts/v2-phase5/verify-math-repair-flow.mjs`           | DB-level verifier                 |
| `src/lib/pipeline-v2/math-notation-patterns.test.ts`      | Vitest (24 tests)                 |
| `src/lib/pipeline-v2/math-notation-logic.test.ts`         | Vitest (30 tests)                 |

#### Cost

Per PDF (~30 questions, ~10 detections after filtering):

- Gemini Flash vision confirmation: ~10 × $0.0002 = $0.002
- Gemini Flash + DeepSeek solver vote: ~10 × 2 × $0.0003 = $0.006
- SymPy: free (runs in CI compute)

Total ≈ **$0.01/PDF**. Adds ~30s to the orchestrator wall time.

#### Deferred (Phase 5.5)

- `passage` and `explanation_text` repair (scope-limited to
  `question_text` + `choice_text` per user decision).
- Mathpix integration — currently substituting Gemini Vision on
  Phase 3 crops to avoid a paid third-party dependency.
- Digit-between-letters cases like `e2x` (too ambiguous for one
  canonical repair; deferred until LLM-driven detection lands).
- Sign ambiguity `-x^2` vs `(-x)^2` (no clean regex signature; will
  surface via solver disagreement instead).

### Phase 6 — Answer Verification and Arbitration

Purpose: treat the answer key as 95% reliable but not authoritative.
The defining principle of Phase 6 is **never auto-flip** — when the
model panel disagrees with the stored answer key, the system records
a suggested answer and routes the row to human review.

#### Typed solver roles (Pass 1 panel, parallel)

| Role identifier                  | Model            | Job                          |
| -------------------------------- | ---------------- | ---------------------------- |
| `deepseek_primary_solver`        | DeepSeek V3      | Primary text reasoner        |
| `groq_independent_solver`        | Llama 3.3 70B    | Independent re-solve         |
| `gemini_flash_visual_checker`    | Gemini 2.5 Flash | **Visual** checker (sees source crop) |

#### Typed escalation roles (Pass 2)

| Role identifier                  | Model            | Job                          |
| -------------------------------- | ---------------- | ---------------------------- |
| `gemini_pro_visual_escalation`   | Gemini 2.5 Pro   | Visual / math dispute arbiter |
| `claude_opus_reasoning_arbiter`  | Claude Opus 4.7  | Reasoning + R&W arbiter      |
| `sympy_equivalence_checker`      | SymPy 1.13       | Open-ended numeric equivalence (CI-only) |

#### Typed dispute categories

| Category                       | When it fires                                              |
| ------------------------------ | ---------------------------------------------------------- |
| `none`                         | Panel majority agreed with key — happy path                |
| `answer_key_dispute`           | Phase 2 already flagged the key as disputed                |
| `visual_dispute`               | Math + has a required visual; Flash often disagrees        |
| `math_notation_dispute`        | Phase 5 flagged the question's math notation               |
| `math_equivalence_dispute`     | Pure math; numeric_entry; or post-Pro reasoning disputes   |
| `rw_reasoning_dispute`         | Reading/Writing — always routed to Opus                    |
| `unanswerable_question`        | All Pass 1 voters reported `is_answerable=false`           |
| `extraction_error`             | MC question with <4 answer_choices                         |

#### Visual input fallback chain

Phase 6's visual roles (Flash + Pro escalation) ask Gemini for the
**expanded_question_crop** by default. The chain:

1. `expanded_question_crop` — primary; preserves a little context.
2. `question_crop` — tight crop; fallback when expanded isn't present.
3. `page_image` — full page; last resort for visual-relevance / missing-figure disputes.

For exact math-notation checks (the Phase 5 cross-talk path), the
order swaps: tight `question_crop` first, expanded second.

#### Evidence-based dispute routing

The router classifies each non-happy-path question:

1. **R&W** → Claude Opus (reasoning-heavy by nature).
2. **Math numeric_entry** → SymPy first; escalate to Pro on
   `inconclusive` or `not_equivalent`.
3. **Math + Phase 5 math notation flag** → SymPy first; escalate
   to Pro on disagreement.
4. **Math + visual (image_url, required visual asset, "the graph
   above" phrasing)** → Gemini Pro.
5. **Answer-key already disputed (Phase 2)** → run BOTH Pro AND
   Opus and compare.
6. **Pure math reasoning, no visual or notation** → Pro first.
7. **Ambiguous routing** → run BOTH Pro AND Opus.

`escalation_disagrees` is a real terminal state: when both Pro and
Opus run but produce different answers, the row blocks with that
status and waits for human review.

#### Cautious never-auto-flip policy

When the full cascade (Pass 1 panel + Pro/Opus/SymPy) agrees on an
answer that **differs** from the stored `selected_official_answer`:

- `answer_verification_status = 'model_consensus_disagrees_with_key'`
- `suggested_verified_answer = <panel consensus answer>`
- `publish_status = 'blocked_answer_dispute'` (set by publish-gate)
- Admin reviews the row in the preview UI, sees the stored key + all
  grader votes + the suggested answer, and decides.

Phase 6 v1 **never** mutates `selected_official_answer` automatically.
A future Phase 6.5 may relax this for narrowly-defined safe cases
(unanimous panel + high arbiter confidence + no visual / notation
flags), but the current default is human-in-the-loop.

#### Failed voters captured in grader_runs

Unlike the legacy `multi-vote-grader.mjs`, Phase 6 writes a
`grader_runs` row for **every** voter — including those that errored.
Failed voters have `selected_answer=NULL` and the error message in
`raw_response_json.error`. This makes "the panel was 2/3 because
Llama was rate-limited" visible at the SELECT level instead of an
invisible silent drop.

#### Implementation files

| File                                                       | Role                              |
| ---------------------------------------------------------- | --------------------------------- |
| `supabase/migrations/…_pdf_ingestion_v2_phase6.sql`        | 4 new columns + signals view      |
| `scripts/lib/grader-roles.mjs`                             | Typed role / dispute / status enums |
| `scripts/lib/grader-normalize.mjs`                         | Letter + numeric + SymPy equivalence |
| `scripts/lib/grader-prompts.mjs`                           | Typed-role prompt builders + asset resolver |
| `scripts/lib/grader-persistence.mjs`                       | grader_runs + grader_votes + verdict writes |
| `scripts/lib/verifier-routing.mjs`                         | Typed dispute router + verdict reconciler |
| `scripts/question-audit/verify-answers.mjs`                | Stage 10 runner                   |
| `scripts/v2-phase6/verify-answer-flow.mjs`                 | DB-level verifier                 |
| `src/lib/pipeline-v2/grader-roles.test.ts`                 | Vitest (9 tests)                  |
| `src/lib/pipeline-v2/grader-normalize.test.ts`             | Vitest (21 tests)                 |
| `src/lib/pipeline-v2/verifier-routing.test.ts`             | Vitest (21 tests)                 |

#### Cost

Per PDF (~30 questions, ~5 disputes after Pass 1):

- Pass 1 (3 typed voters × 30 q): ~$0.03
- Pass 2 (Pro/Opus on 5 disputes): ~$0.025
- SymPy on open-ended:             free (CI)

Total ≈ **$0.06/PDF**. Adds ~45s to the orchestrator wall time.

#### Deferred (Phase 6.5)

- Auto-flip for narrowly-defined low-risk cases (8-condition gate
  analogous to Phase 5).
- A 4th typed pass that re-uses the Phase 5 source crop + SymPy bridge
  to verify whether an `escalation_disagrees` dispute was actually
  caused by notation OCR.
- Per-subject confidence calibration for the Pass 1 panel (right now
  every role weighs equally regardless of whether DeepSeek tends to
  outperform Groq on math, etc.).

### Phase 7 — Explanation Generation After Verification

Purpose: prevent polished explanations for broken or unverified
questions. The defining principle of Phase 7 is **gate before fill**
— Phase 6 must reach a verdict, the pre-fill eligibility gate must
pass, and only THEN does Phase 7 generate a polished student-facing
explanation.

#### New 14-stage pipeline

```text
 1. extract structure              (Claude Sonnet → JSON)
 2. extract figures                (Page render + bbox + R2)
 3. generate CSV                   (JSON → 32-column CSV)
 4. import to database             (publish_status='draft')
 5. extract answer key             (Phase 2)
 6. extract question crops         (Phase 3)
 7. classify visual relevance      (Phase 4)
 8. repair math notation           (Phase 5)
 9. verify answers                 (Phase 6) ← MOVED UP from old Stage 10
10. check fill eligibility         (Phase 7 NEW)
11. fill explanations v2           (Phase 7 NEW — replaces fill-all.mjs)
12. qa explanations                (Phase 7 NEW)
13. validate KaTeX
14. publish gate
```

#### Pre-fill eligibility gate (Stage 10)

Blocks fill for any row meeting one of these conditions. Blocked
rows get an admin-facing diagnostic note (visible in the preview
UI, NOT shown to students); their legacy explanation fields stay
empty.

| Category        | Condition |
| --------------- | --------- |
| STRUCTURAL      | corrupt_question, duplicate_detected, empty question_text, MC <4 choices |
| ANSWER KEY      | missing_answer_key, correction_unclear, correction_disputed, missing_answer_key, unverifiable, question_unanswerable, probably_wrong, formatting_error |
| SOURCE          | references visual but no required asset (only fires after Phase 3 ran) |
| MATH NOTATION   | math_notation_status ∈ {suggested_repair_needs_review, ambiguous_repair, unrepairable_from_source} |
| VERIFICATION    | publish_status=blocked_answer_dispute; answer_verification_status ∈ {model_consensus_disagrees_with_key, escalation_disagrees, unanswerable, verifier_error} |
| KATEX / SLUG    | blocked_katex_error, blocked_slug_uncertain |

#### explanation_v2 JSONB (canonical bundle)

```json
{
  "version": "explanation_v2_v1",
  "generated_at": "2026-05-27T20:00:00Z",
  "generator_role": "explanation_v2_generator_sonnet",
  "generator_model": "claude-sonnet-4-6",
  "status": "qa_passed",
  "correct_reasoning": "…why the verified answer is correct…",
  "choices": {
    "A": {
      "explanation": "…",
      "evidence": "…",                // required for R&W; "" OK for math
      "misconception_note": null,     // OPTIONAL — null when no genuine trap
      "internal_category": null       // OPTIONAL admin-only analytics label
    },
    "B": { … }, "C": { … }, "D": { … }
  },
  "normal_tip": "…" | null,
  "desmos_tip": "…" | null,           // Math only
  "acceptable_forms": ["0.5", "1/2"], // Math numeric_entry only
  "slug_alignment": {                  // R&W only
    "slug": "transitions",
    "confidence": 0.9,
    "reason": "…"
  },
  "qa_notes": { … } | null
}
```

Legacy fields are MIRRORED from this for back-compat:

- `explanation_text` ← `explanation_v2.correct_reasoning`
- `explanation_per_choice` ← `{A,B,C,D}` choice explanations
- `desmos_strategy` ← `explanation_v2.desmos_tip` (math only)

The JSONB is the source of truth going forward.

#### Tiered Sonnet → Opus policy

| Tier | Default model | Escalation triggers |
| ---- | ------------- | ------------------- |
| Generator | Sonnet 4.6 | R&W dispute; Phase 6 used Opus arbitration; dual passage (a + b); passage >800 chars; retry after attempt-1 QA fail |
| Critic    | Sonnet 4.6 | Opus-generated explanation on a disputed R&W row; caller explicitly escalates after Sonnet critic was inconclusive |

#### Schema + LLM critic QA (Stage 12)

Hybrid: **deterministic schema validation runs first**. If schema
fails, the LLM critic is skipped and the row goes to needs_human_
review. If schema passes, the Sonnet critic evaluates the
explanation against:

- Does correct_reasoning actually support the verified answer?
- Does each wrong-choice explanation match the actual choice text?
- For R&W: does cited evidence exist in the passage?
- For Math: are reasoning steps correct?
- Is `misconception_note` (when present) genuine vs. forced?
- Is `normal_tip` durable + useful?
- Does `slug_alignment.slug` match the question's actual concept?
- Is student-facing language natural / tutor-like?

Critic verdicts:

| Verdict | Action |
| ------- | ------ |
| `pass` | status='qa_passed'. Done. |
| `fail_fixable` (attempt 1) | One repair-retry with Opus generator + critic's findings in prompt. |
| `fail_fixable` (attempt 2) | status='qa_failed'. |
| `fail_serious` | No retry — status='qa_failed'. Common cases: explanation contradicts the verified answer; cited evidence doesn't exist; question itself appears broken. |

Cost cap: **max 2 generation calls per question** (1 initial + 1 repair).

#### Statuses (explanation_v2_status)

| Status | Meaning |
| ------ | ------- |
| `not_started` | Phase 7 has never touched this row (legacy). |
| `skipped_not_eligible` | Pre-fill gate blocked. Admin diagnostic note recorded. |
| `generated` | Generator ran; QA not yet complete (transient). |
| `qa_passed` | Schema + critic both passed. Eligible for publish. |
| `qa_failed` | Schema fail OR critic fail_serious OR 2nd-attempt fail. |
| `needs_human_review` | Operator-flagged for review. |
| `stale_answer_changed` | Phase 6 changed the verified answer after fill. Existing explanation may be wrong; regenerate after dispute resolves. |

#### Opt-in publish-gate (4 new gates)

`explanation_v2_filled_at IS NULL` → all 4 Phase 7 gates
short-circuit. Same opt-in pattern as Phase 3 / 5 / 6 markers.
Legacy rows are never newly flagged just because the migration ran.

#### Failed voters captured (append-only audit)

`explanation_qa_records` table — one row per QA attempt (max 2).
Captures the schema verdict + critic verdict + the explanation_v2
snapshot at that attempt. Lets a reviewer see what attempt 1
produced even after attempt 2 overwrote the live column.

#### Cost

Per PDF (~30 questions, ~5 retries):

- Stage 11 gen × 30 (Sonnet default, Opus on ~20%): ~$0.90
- Stage 12 critic × 30 (Sonnet): ~$0.60
- Stage 12 retry × ~5 (Opus): ~$0.50

Total ≈ **$2/PDF**. Adds ~90s to the orchestrator wall time.

#### Deferred (Phase 7.5)

- Auto-retry on critic `fail_serious` cases that match
  recoverable failure patterns (e.g. cited-evidence-not-found
  might just be a misquote that a fresh attempt can fix).
- Backfill mode: a CLI flag that targets legacy rows by
  `source_pdf` or `question_id` and runs Phase 7 against them
  with explicit operator consent.
- Optional Gemini Flash critic for cheap consistency checks
  alongside the Sonnet critic.
- Internal-category normalization: post-pass that maps free-text
  `misconception_note` into the optional `internal_category` enum
  for analytics dashboards.

### Phase 8 — Consolidation

Purpose: reduce drift between parallel implementations of the same
logic. **Refactor only — no new features.** Ships as **four small
sequential PRs** so each consolidation is small, reviewable, and
independently revertable. Cleanup comes last because we should not
delete old paths until replacements are proven by real PDF runs.

#### PR 8.1 — Shared import core + JSON-direct transport (this PR)

- `src/lib/question-bank/import-core.ts` is the new canonical
  question-import library. Both admin upload (`bulk-import.ts`) and
  orchestrator import (`scripts/pdf-pipeline/import-json-direct.ts`)
  call it.
- The shared core handles: validation, `content_hash_v2`,
  `quiz_questions` insert with `raw_question_text` mirror,
  `answer_choices` insert with `raw_choice_text` mirror,
  `answer_key_entries` Phase 1 seeding, `selected_official_answer`
  + `answer_key_status` mirroring, `source_assets` figure_crop
  registration.
- Pipeline goes from 14 → **13 stages**: Stages 3 (emit CSV) + 4
  (import CSV) merge into one Stage 3 (JSON-direct import). The
  CSV intermediate is gone from the orchestrator.
- `json-to-import-csv.mjs` demoted to debug-only.
- `import-csv-direct.mjs` marked deprecated; kept as a one-off CLI
  for operators who need to import a hand-edited CSV.
- Drive-by fix: the orchestrator's old path was silently reading
  `src/data/curriculum.ts` (which no longer exists since the
  curriculum migration) — so every orchestrator-imported row got
  `node_id=null`. The new path uses `nodeIdFromSlug` from the
  canonical `@/lib/question-bank/taxonomy`, fixing this.

#### PR 8.2 — Canonical taxonomy generation (this PR)

- `src/data/curriculum/` remains the canonical TypeScript source.
- `scripts/sync-taxonomy.ts` (invoked via `npm run sync:taxonomy`)
  now emits **six** generated artifacts from one command:
  - `question-imports/chatgpt/taxonomy.txt` (pre-existing)
  - `question-imports/chatgpt/KarmanGPT.txt` §6 (pre-existing)
  - `question-imports/stage2_classify.py` (pre-existing)
  - `docs/ingestion/routine.md` §12 (pre-existing)
  - **NEW** `scripts/lib/taxonomy.generated.mjs` — frozen ESM
    constants for `.mjs` scripts: SUBJECTS, ANSWER_FORMATS,
    DIFFICULTY_LEVELS, DOMAINS, READING_DOMAINS, MATH_DOMAINS,
    CLUSTER_BY_DOMAIN, TOPIC_CLUSTERS, CONCEPT_SLUGS,
    CONCEPT_SLUG_VALUES, SLUG_TO_NODE_ID, SLUG_TO_DOMAIN,
    RW_NODE_IDS, MATH_NODE_IDS + helper functions
    (isValidDomain, isValidSlug, nodeIdFromSlug, subjectFromDomain,
    clusterFromSlug).
  - **NEW** `scripts/lib/prompts/taxonomy-fragment.txt` — prompt
    fragment runtime prompt builders read instead of carrying a
    hardcoded slug block.
- **NEW CI stale-check**: `.github/workflows/ci.yml` has a new
  `taxonomy-stale-check` job that runs `npm run sync:taxonomy` then
  fails the build if `git status --porcelain` is non-empty —
  meaning anyone edited the curriculum without regenerating.
  Local fix: `npm run sync:taxonomy && git add -u`.
- Active consumer migrated in this PR: `extract-with-gemini.mjs`
  (the LOCKED_TAXONOMY block + DOMAINS / TOPIC_CLUSTERS /
  CONCEPT_SLUGS inlined arrays — 124 lines removed, replaced by
  one import statement).
- Deprecated consumers (`import-csv-direct.mjs`,
  `generate-explanation-text.mjs`, `audit-csv.mjs`,
  `recover-domain-bug.mjs`) keep their inlined arrays for now and
  get migrated in PR 8.4 cleanup.
- Vitest at `src/lib/pipeline-v2/taxonomy-generated.test.ts`
  round-trips the .mjs file against the TS source: every slug,
  every domain, every node-id, every helper function output is
  compared. Catches generator bugs that the git-diff stale-check
  cannot.

#### PR 8.3 — Typed legacy-grader audit modules (this PR)

- `verify-answers.mjs` remains the Phase 6 canonical answer
  verifier. **No new grader-framework.mjs.** Phase 6's shared
  modules are the framework.
- Four typed audit modules added in `scripts/pdf-pipeline/audit/`:
  - `check-well-formedness.mjs` — deterministic-first sanity
    checks (empty stems, missing choices, duplicate choice texts,
    invalid correct_answer letters, non-numeric numeric_entry
    answers, question_text duplicating passage, overly-long
    choices). No LLM call when deterministic checks pass.
  - `check-slug-alignment.mjs` — Sonnet asks if the assigned
    `concept_slug` matches the tested skill. Escalates to Opus
    on low confidence or slug mismatch. BLOCKING when model
    confidently suggests a different slug at ≥0.85 confidence.
  - `check-figure-coherence.mjs` — Gemini Flash compares the
    attached figure to what the question text references.
    Escalates to Gemini Pro on low confidence or BLOCKING-severity
    finding. Three finding types: question_mismatch (BLOCKING),
    low_visibility (WARNING), unreferenced (NOTICE).
  - `check-explanation-consistency.mjs` — Sonnet cross-checks
    `explanation_v2.correct_reasoning` against the verified
    answer + evidence + per-choice naturalness. Escalates to
    Opus on serious_drift. Distinct from Phase 7's QA critic:
    that one gates publish; this one persists findings for
    admin spot-check after publish.
- All four modules write findings to the existing
  `question_findings` table (no migration needed — the table has
  the right CHECK constraints + UNIQUE on (question_id, source,
  code) so re-runs UPSERT cleanly).
- Stage 12 wrapper `scripts/pdf-pipeline/audit/run-audits.mjs`
  runs all four in sequence with per-module eligibility guards.
  Inserted into orchestrator BETWEEN qa_explanations (Stage 11)
  and validate-KaTeX (now Stage 13). Pipeline grows 13 → 14 stages.
- New publish-gate `gateUnresolvedBlockingFinding` (opt-in via
  `answer_verified_at` OR `explanation_v2_filled_at` non-null)
  reads unresolved BLOCKING findings and routes affected rows to
  `needs_human_review` (or the suggested_publish_status the
  finding's detail JSONB carries).
- `multi-vote-grader.mjs` + `llm-grader.mjs` stay in repo as
  deprecated fallbacks. Deletion deferred to PR 8.4 once real
  PDF runs confirm parity.
- 33 new vitests at `src/lib/pipeline-v2/findings.test.ts` +
  `check-well-formedness.test.ts`.

#### Cost (Phase 8.3)

Per PDF (~30 questions, eligibility-gated):

- well-formedness: ~0 (deterministic by default; LLM only on suspect rows)
- slug-alignment: 30 Sonnet calls ≈ $0.45
- figure-coherence: ~10 Flash calls ≈ $0.002 (most rows have no figure)
- explanation-consistency: 30 Sonnet calls ≈ $0.45

Total ≈ **$0.90/PDF**; +~30s wall time. Escalations to Opus/Pro
add ~$0.05/PDF on disputed rows.

#### PR 8.4 — Final cleanup (planned)

- Remove deprecated scripts, dead workflows, obsolete docs, stale
  prompt files, and old import/grader paths — but only after one
  or two real PDF runs confirm the replacements work.
- This PR introduces NO new behavior. Pure deletion.

---

## Proposed V2 Orchestrator

```text
0. Download PDF from R2
1. Render pages
2. Classify page quality
3. Detect repeated UI/calculator artifacts
4. Segment question crops
5. Extract answer key with red-correction awareness
6. Reconstruct questions
7. Detect/classify visual assets
8. Repair math notation where needed
9. Normalize to KaTeX
10. Verify curriculum slug
11. Import draft questions + source assets
12. Run independent solver panel
13. Verify answer key
14. Arbitrate disputes
15. Generate explanations for verified questions
16. QA explanations
17. Strict KaTeX validation
18. Batch audit
19. Set publish_status
20. Complete job
```

---

## Initial Acceptance Criteria

A v2-imported question is publishable only if:

- `publish_status` is `publish_ready` or `publish_ready_with_verified_repair`.
- source PDF, page, module, question number, and crops are stored.
- answer-key entry is resolved.
- every grader run is stored.
- answer verification passed.
- visual requirements passed.
- slug validation passed.
- explanation QA passed.
- KaTeX validation passed.

---

# Phase 1 Implementation Spec — Publish Safety Layer

## Objective

Make the existing v1 pipeline safer before changing extraction logic.

Phase 1 should not rewrite the extractor. It should add the database and validation infrastructure that prevents questionable imported rows from becoming student-facing.

The central change is:

```text
import_status = ingestion metadata
publish_status = student visibility gate
```

A row should no longer become live just because `import_status = 'ok'`.

---

## Phase 1 Scope

Implement these changes first:

1. Add `publish_status` to `quiz_questions`.
2. Replace the live view so student-facing questions come only from `publish_status`.
3. Add append-only `grader_runs` table.
4. Add `source_assets` table.
5. Add initial `answer_key_entries` table shell, even if Phase 2 fills it more deeply.
6. Add `content_hash_v2`.
7. Add strict server-side KaTeX validation.
8. Add a `publish-gate` script that computes whether a question can publish.
9. Modify the orchestrator/import path so new rows start as `draft` or `needs_human_review`, not automatically live.
10. Modify fill and grade scripts so they can target the current PDF/job instead of the entire bank.

---

## Phase 1 Non-Goals

Do not yet implement:

- full red-ink correction parsing
- per-question crop segmentation redesign
- repeated Desmos/sidebar artifact detection
- Mathpix-based notation repair
- full answer-key extraction redesign
- unified importer rewrite
- full replacement of the whole-PDF Claude extraction step

Those belong in Phase 2+.

---

## 1. Database Migration

Create a migration named something like:

```text
supabase/migrations/YYYYMMDDHHMMSS_pdf_ingestion_v2_phase1.sql
```

### 1.1 Add `publish_status`

```sql
alter table public.quiz_questions
add column if not exists publish_status text not null default 'draft'
check (
  publish_status in (
    'draft',
    'publish_ready',
    'publish_ready_with_verified_repair',
    'needs_human_review',
    'blocked_missing_visual',
    'blocked_katex_error',
    'blocked_slug_uncertain',
    'blocked_answer_dispute',
    'corrupt_question',
    'duplicate_detected',
    'rejected'
  )
);

create index if not exists quiz_questions_publish_status_idx
on public.quiz_questions(publish_status);
```

### 1.2 Add answer-verification fields

```sql
alter table public.quiz_questions
add column if not exists selected_official_answer text,
add column if not exists verified_answer text,
add column if not exists answer_key_status text,
add column if not exists answer_verification_status text;

create index if not exists quiz_questions_answer_key_status_idx
on public.quiz_questions(answer_key_status);

create index if not exists quiz_questions_answer_verification_status_idx
on public.quiz_questions(answer_verification_status);
```

Recommended allowed `answer_key_status` values, enforced later in app code first:

```text
printed_key_used_no_correction
corrected_key_verified
correct
probably_wrong
unverifiable
formatting_error
missing_answer_key
question_unanswerable
correction_unclear
correction_disputed
```

### 1.3 Add `content_hash_v2`

```sql
alter table public.quiz_questions
add column if not exists content_hash_v2 text;

create index if not exists quiz_questions_content_hash_v2_idx
on public.quiz_questions(content_hash_v2);
```

Do not immediately make this unique until backfilled and collision-tested.

Recommended v2 hash input:

```text
subject | domain | answer_format | passage_intro | passage | passage_a | passage_b | question_text | choice_a | choice_b | choice_c | choice_d
```

Use `sha256`, not SHA-1.

---

## 2. Replace Live View Logic

Current v1 uses `is_live` / `quiz_questions_live` logic tied to `import_status`. Phase 1 should move student visibility to `publish_status`.

Create or replace the live view:

```sql
create or replace view public.quiz_questions_live as
select *
from public.quiz_questions
where publish_status in ('publish_ready', 'publish_ready_with_verified_repair');
```

Acceptance rule:

```text
No question should be student-facing unless publish_status is publish_ready or publish_ready_with_verified_repair.
```

Keep `import_status` for admin/debugging only.

---

## 3. Add `grader_runs`

Purpose: preserve every model conclusion instead of overwriting evidence in `quiz_questions.grader_votes`.

```sql
create table if not exists public.grader_runs (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,

  run_group_id uuid,
  grader_role text not null,
  provider text not null,
  model text not null,

  selected_answer text,
  normalized_answer text,
  confidence numeric,
  answer_key_match boolean,
  is_answerable boolean,

  suspected_formatting_issue boolean,
  formatting_flags jsonb not null default '[]'::jsonb,
  visual_flags jsonb not null default '[]'::jsonb,
  reasoning_summary text,
  choice_analysis_json jsonb,

  raw_response_json jsonb,
  input_hash text,
  output_hash text,
  cost_estimate numeric,

  created_at timestamptz not null default now()
);

create index if not exists grader_runs_question_id_idx
on public.grader_runs(question_id, created_at desc);

create index if not exists grader_runs_run_group_id_idx
on public.grader_runs(run_group_id);

create index if not exists grader_runs_role_model_idx
on public.grader_runs(grader_role, provider, model);
```

`quiz_questions.grader_votes` can remain as the latest summary for UI badges. `grader_runs` becomes the audit source of truth.

---

## 4. Add `source_assets`

Purpose: store original evidence for review.

```sql
create table if not exists public.source_assets (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.quiz_questions(id) on delete cascade,

  pdf_job_id uuid references public.pdf_processing_jobs(id) on delete set null,
  source_pdf text,
  page_number int,

  asset_type text not null check (
    asset_type in (
      'page_image',
      'question_crop',
      'expanded_question_crop',
      'figure_crop',
      'table_crop',
      'chart_crop',
      'graph_crop',
      'answer_key_crop',
      'calculator_artifact',
      'background_ui_artifact'
    )
  ),

  asset_path text not null,
  public_url text,
  bbox jsonb,

  crop_complete boolean,
  relevance text check (relevance in ('required', 'optional', 'irrelevant', 'uncertain')),
  repeated_across_pages boolean not null default false,
  use_in_solving boolean not null default false,

  validation_status text,
  notes text,
  raw_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists source_assets_question_id_idx
on public.source_assets(question_id);

create index if not exists source_assets_pdf_page_idx
on public.source_assets(source_pdf, page_number);

create index if not exists source_assets_type_idx
on public.source_assets(asset_type);
```

In Phase 1, populate this at least for existing figure images and source PDFs where available. Later phases will add page/question crops.

---

## 5. Add Initial `answer_key_entries`

Phase 2 will deepen this, but Phase 1 should add the table now so downstream scripts can start writing structured answer-key evidence.

```sql
create table if not exists public.answer_key_entries (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.quiz_questions(id) on delete cascade,

  printed_answer text,
  printed_answer_crossed_out boolean,

  manual_correction_present boolean not null default false,
  manual_correction_color text,
  manual_correction_answer text,
  manual_correction_confidence numeric,

  selected_official_answer text,
  selection_reason text,

  answer_key_crop_path text,
  answer_key_page int,
  answer_key_bbox jsonb,

  status text,
  raw_model_response jsonb,

  created_at timestamptz not null default now()
);

create index if not exists answer_key_entries_question_id_idx
on public.answer_key_entries(question_id);

create index if not exists answer_key_entries_status_idx
on public.answer_key_entries(status);
```

Phase 1 compatibility behavior:

- For current pipeline rows, create a simple entry where `printed_answer = correct_answer`, `selected_official_answer = correct_answer`, and `status = 'printed_key_used_no_correction'`.
- Phase 2 will replace this with correction-aware parsing.

---

## 6. Strict Server-Side KaTeX Validation

Create:

```text
scripts/question-audit/validate-katex.mjs
```

Purpose: render every KaTeX-containing field server-side with strict error behavior before publication.

Install/use existing `katex` package. If not already available server-side, add it to dependencies.

Validation should check:

- `question_text`
- `passage`
- `passage_intro`
- `passage_a`
- `passage_b`
- answer choice text
- `explanation_text`
- `explanation_per_choice`
- `desmos_strategy`
- `hint`
- `figure_table_data`
- `figure_chart_data`

Implementation principle:

```js
katex.renderToString(latex, {
  throwOnError: true,
  displayMode,
  output: 'htmlAndMathml'
});
```

The script should:

1. Extract inline and display math spans from each text field.
2. Validate each span.
3. Write results to `question_findings` or a new `validation_results` output.
4. Optionally update `publish_status = 'blocked_katex_error'` if strict mode fails.

Do not change the frontend `MathText.tsx` fallback behavior yet. Frontend resilience is still useful. The strict validation belongs server-side.

---

## 7. Add Publish Gate Script

Create:

```text
scripts/pdf-pipeline/publish-gate.mjs
```

Purpose: compute final `publish_status` after import, grading, explanation, and validation.

Inputs:

- `--source-pdf <filename>`
- optional `--job-id <uuid>`
- optional `--question-id <uuid>`

Checks:

```text
source lineage present
answer format valid
R&W has A-D choices
Math numeric_entry has numeric/equivalence path
selected official answer present
verified answer present or grader consensus present
slug is valid
slug confidence acceptable if available
required visual assets attached
KaTeX validation passed
explanation present
explanation QA passed if available
grader runs stored
manual review complete if required
```

Phase 1 can implement a simpler initial gate:

```text
- valid slug
- explanation_text non-empty
- correct_answer non-empty
- answer choices exist for MC
- KaTeX validation passes
- no blocking findings
- grader_votes verdict is verified / verified_pro / verified_opus
```

Initial status mapping:

```text
verified + KaTeX pass + no blocking findings → publish_ready
needs_review/import flag/blocking finding → needs_human_review
KaTeX fail → blocked_katex_error
grader likely_wrong/pass split → blocked_answer_dispute
missing figure/image_url when figure required → blocked_missing_visual
invalid slug → blocked_slug_uncertain
```

---

## 8. Modify Import Behavior

In `scripts/pdf-pipeline/import-csv-direct.mjs`, new rows should not become live automatically.

Initial recommended behavior:

```text
if row.import_status === 'ok': publish_status = 'draft'
if row.import_status === 'needs_review': publish_status = 'needs_human_review'
```

Then `publish-gate.mjs` promotes rows to `publish_ready` only after validation.

Do not let `import_status='ok'` directly imply student visibility.

---

## 9. Modify Fill/Grade Targeting

Current issue: `fill-all.mjs` and `multi-vote-grader.mjs --from-db` can process the entire bank, not only the current PDF/job.

Add CLI filters:

```bash
node scripts/content-generation/fill-all.mjs --source-pdf 202603asiav1.pdf
node scripts/question-audit/multi-vote-grader.mjs --from-db --source-pdf 202603asiav1.pdf
```

Update sub-scripts to accept:

- `--source-pdf`
- `--question-ids-file`
- `--job-id` if feasible
- `--force`

This makes per-job cost/time predictable and prevents one PDF job from touching unrelated rows.

---

## 10. Modify Multi-Vote Grader Storage

Keep writing `quiz_questions.grader_votes`, but also insert each individual model result into `grader_runs`.

For Pass 1, store separate rows:

```text
gemini_flash_solver
deepseek_solver
groq_llama_solver
```

For Pass 2:

```text
gemini_pro_tiebreaker
```

For Pass 3:

```text
claude_opus_arbiter
```

Each row should include:

- selected answer
- confidence if available
- answer key match
- reasoning summary
- formatting/visual flags if available
- raw response JSON
- input hash
- output hash
- cost estimate when possible

---

## 11. Phase 1 Orchestrator Update

Update current orchestrator order minimally:

```text
1. extract structure
2. extract figures
3. generate CSV
4. import to DB as draft/needs_human_review
5. fill explanations for current source_pdf only
6. multi-vote grade current source_pdf only and write grader_runs
7. validate KaTeX
8. run publish gate
9. complete job
```

This preserves v1 behavior but adds safety gates.

---

## 12. Acceptance Tests

Add tests or scripted checks for:

### Live view safety

- A row with `import_status='ok'` but `publish_status='draft'` should not appear in `quiz_questions_live`.
- A row with `publish_status='publish_ready'` should appear.
- A row with `publish_status='needs_human_review'` should not appear.

### Grader run storage

- Running the grader creates rows in `grader_runs`.
- Re-running the grader appends new `grader_runs`, not overwrites old ones.
- `quiz_questions.grader_votes` still updates as latest summary.

### KaTeX validation

- Valid math passes.
- Broken math such as `$\\frac{1}{2$` fails.
- Failing KaTeX sets or recommends `blocked_katex_error`.

### Publish gate

- Verified clean question promotes to `publish_ready`.
- Split/disputed grader result becomes `blocked_answer_dispute`.
- Invalid slug becomes `blocked_slug_uncertain`.
- Missing required figure becomes `blocked_missing_visual`.

### Current-job filtering

- `fill-all --source-pdf X.pdf` fills only X.pdf rows.
- `multi-vote-grader --source-pdf X.pdf` grades only X.pdf rows.

---

## 13. Rollback Plan

Phase 1 should be reversible without data loss.

Rollback steps:

1. Revert `quiz_questions_live` to old `is_live` behavior if needed.
2. Keep new columns/tables; do not drop immediately.
3. Set all new rows' `publish_status` to `draft` if uncertain.
4. Disable `publish-gate.mjs` in orchestrator if it causes operational issues.
5. Existing v1 import can continue because new fields are additive.

Do not remove `import_status`, `grader_votes`, or existing figure behavior in Phase 1.

---

## 14. Phase 1 Deliverable Checklist

Phase 1 is complete when:

- [ ] Migration adds `publish_status`, `content_hash_v2`, answer verification fields.
- [ ] Migration adds `grader_runs`.
- [ ] Migration adds `source_assets`.
- [ ] Migration adds `answer_key_entries`.
- [ ] `quiz_questions_live` uses `publish_status`.
- [ ] Importer inserts new rows as `draft` or `needs_human_review`.
- [ ] Fill scripts can target `--source-pdf`.
- [ ] Grader can target `--source-pdf`.
- [ ] Grader writes append-only `grader_runs`.
- [ ] Strict KaTeX validation script exists.
- [ ] Publish gate script exists.
- [ ] Orchestrator runs KaTeX validation and publish gate after grading.
- [ ] Admin review can at least see `publish_status` and grader summary.
- [ ] Student-facing view excludes all non-publish-ready rows.

---

# Phase 2 Implementation Spec — Answer-Key Correction System

## Objective

Make answer-key handling evidence-based and correction-aware.

The current v1 pipeline collapses answer-key information into `correct_answer`. Phase 2 separates answer-key evidence from verified answer truth.

The key distinction is:

```text
printed_answer = what the original printed key says
manual_correction_answer = what handwritten/red correction says
selected_official_answer = what the pipeline treats as the official key after reading corrections
verified_answer = what independent solving/arbitration concludes
correct_answer = active answer used by the website after verification/manual approval
```

The official key is assumed to be correct about 95% of the time, but manual red corrections override printed answers when visually confirmed.

---

## Phase 2 Scope

Implement:

1. Answer-key page detection.
2. Answer-key row/cell cropping.
3. Printed answer extraction.
4. Red-ink/manual correction detection.
5. Cross-out detection.
6. `selected_official_answer` assignment.
7. Storage in `answer_key_entries`.
8. Solver comparison against `selected_official_answer`.
9. Review flags for unclear or disputed corrections.
10. Admin review UI fields for printed/corrected/selected/verified answers.

---

## Phase 2 Non-Goals

Do not yet implement:

- full page/question segmentation redesign
- repeated Desmos artifact detection
- full Mathpix notation repair pipeline
- complete importer consolidation
- full grader-framework merge

Those stay in later phases.

---

## 1. Answer-Key Status Model

Use these statuses for `answer_key_entries.status`:

```text
printed_key_used_no_correction
corrected_key_verified
correction_unclear
correction_disputed
printed_key_crossed_out_no_readable_replacement
missing_answer_key
answer_key_row_unmatched
```

Use these values for `quiz_questions.answer_key_status`:

```text
correct
corrected_key_verified
probably_wrong
unverifiable
formatting_error
missing_answer_key
question_unanswerable
correction_unclear
correction_disputed
```

Meaning:

| Status | Meaning |
|---|---|
| `printed_key_used_no_correction` | No manual correction detected; printed key used. |
| `corrected_key_verified` | Red/manual correction was detected, selected, and solver verification supports it. |
| `correction_unclear` | Manual correction exists but cannot be read confidently. |
| `correction_disputed` | Manual correction conflicts with strong solver evidence or printed key in a suspicious way. |
| `printed_key_crossed_out_no_readable_replacement` | Printed answer is crossed out but replacement cannot be read. |
| `missing_answer_key` | No answer-key entry found. |
| `answer_key_row_unmatched` | A key entry was found but could not be matched to a question. |

---

## 2. Extend `answer_key_entries`

Phase 1 created the shell. Phase 2 should ensure these fields exist:

```sql
alter table public.answer_key_entries
add column if not exists section text,
add column if not exists module text,
add column if not exists source_question_number int,
add column if not exists answer_mode text,
add column if not exists correction_detection_model text,
add column if not exists correction_detection_provider text,
add column if not exists printed_answer_confidence numeric,
add column if not exists printed_answer_crossed_out_confidence numeric,
add column if not exists selected_official_answer_confidence numeric,
add column if not exists review_required boolean not null default false,
add column if not exists review_reason text;

create index if not exists answer_key_entries_source_locator_idx
on public.answer_key_entries(source_question_number, section, module);

create index if not exists answer_key_entries_review_required_idx
on public.answer_key_entries(review_required);
```

Recommended uniqueness after testing:

```sql
-- Add only after duplicate behavior is understood.
-- create unique index answer_key_entries_question_unique
-- on public.answer_key_entries(question_id)
-- where question_id is not null;
```

---

## 3. New Script: `extract-answer-key.mjs`

Create:

```text
scripts/pdf-pipeline/extract-answer-key.mjs
```

CLI:

```bash
node scripts/pdf-pipeline/extract-answer-key.mjs <pdfPath> --source-pdf <filename> --job-id <uuid>
```

Optional flags:

```bash
--out /tmp/<stem>-answer-key.json
--debug-crops
--force
```

Responsibilities:

1. Detect answer-key pages.
2. Render answer-key pages at high resolution.
3. Crop the full key page.
4. Segment answer-key rows/cells when possible.
5. Extract printed answers.
6. Detect crossed-out printed answers.
7. Detect red/manual corrections.
8. Select the official answer candidate.
9. Write JSON sidecar.
10. Insert/update `answer_key_entries` where question matching is already possible.

---

## 4. Answer-Key Page Detection

The script should identify answer-key pages using multiple signals:

- page text contains `Answer Key`, `Answers`, `Correct Answer`, `Module`, `Reading and Writing`, `Math`
- page is near the end of the PDF
- page contains dense answer tables or numbered answer lists
- OCR/vision sees repeated patterns like `1 A`, `2 D`, `3 5/2`

Output:

```json
{
  "answer_key_pages": [104, 105, 106],
  "confidence": 0.94,
  "method": "text_and_layout",
  "needs_review": false
}
```

If detection confidence is low, still save candidate pages but mark `needs_human_review`.

---

## 5. Answer-Key Crop Storage

For every detected answer-key page, store a `source_assets` row:

```json
{
  "asset_type": "answer_key_crop",
  "page_number": 105,
  "asset_path": "pdf-inbox/<jobId>/answer-key/page-105.png",
  "public_url": "...",
  "relevance": "required",
  "use_in_solving": true,
  "validation_status": "candidate_answer_key_page"
}
```

For each answer row/cell crop, store a child asset when practical:

```json
{
  "asset_type": "answer_key_crop",
  "page_number": 105,
  "bbox": {"x": 124, "y": 810, "width": 300, "height": 42},
  "validation_status": "answer_key_cell_crop"
}
```

---

## 6. Correction Detection Rules

### 6.1 Printed answer only

If no manual correction exists:

```json
{
  "printed_answer": "B",
  "printed_answer_crossed_out": false,
  "manual_correction_present": false,
  "manual_correction_answer": null,
  "selected_official_answer": "B",
  "status": "printed_key_used_no_correction"
}
```

### 6.2 Printed answer crossed out + red correction readable

Use the correction:

```json
{
  "printed_answer": "B",
  "printed_answer_crossed_out": true,
  "manual_correction_present": true,
  "manual_correction_color": "red",
  "manual_correction_answer": "D",
  "selected_official_answer": "D",
  "status": "corrected_key_verified"
}
```

Initially, before solver verification, status may be:

```text
manual_correction_selected_pending_verification
```

If you do not want another status, store that in `review_reason` and update after solver comparison.

### 6.3 Red correction present but printed answer not crossed out

Use correction only if high confidence and spatially attached to that row.

If confidence is high:

```json
{
  "printed_answer": "A",
  "printed_answer_crossed_out": false,
  "manual_correction_present": true,
  "manual_correction_answer": "C",
  "selected_official_answer": "C",
  "status": "corrected_key_verified",
  "review_required": true,
  "review_reason": "Manual correction present but printed answer was not visibly crossed out."
}
```

If confidence is medium/low:

```text
status = correction_unclear
review_required = true
```

### 6.4 Printed answer crossed out but correction unreadable

```json
{
  "printed_answer": "A",
  "printed_answer_crossed_out": true,
  "manual_correction_present": true,
  "manual_correction_answer": null,
  "selected_official_answer": null,
  "status": "printed_key_crossed_out_no_readable_replacement",
  "review_required": true
}
```

### 6.5 Correction conflicts with solver consensus

If solvers strongly support printed answer but red correction says another answer:

```text
status = correction_disputed
review_required = true
```

Do not auto-publish until reviewed.

---

## 7. Confidence Thresholds

Use these thresholds for manual corrections:

| Confidence | Action |
|---:|---|
| `>= 0.90` | Accept correction automatically, but store evidence. |
| `0.70–0.89` | Use correction as selected official answer but mark for audit/review. |
| `< 0.70` | Do not select automatically; route to human review. |

For cross-out detection:

| Confidence | Action |
|---:|---|
| `>= 0.85` | Treat printed answer as crossed out. |
| `0.60–0.84` | Mark uncertain; review required. |
| `< 0.60` | Do not treat as crossed out unless correction evidence is very strong. |

---

## 8. Models for Phase 2

Use:

| Task | Model/tool |
|---|---|
| answer-key page detection | local text/OCR + Gemini Flash |
| printed answer extraction | Gemini Flash or Mistral OCR |
| red ink/cross-out detection | Gemini Flash first pass |
| unclear handwriting/correction | Gemini Pro |
| solver comparison | existing DeepSeek/Groq/Gemini panel |
| reasoning-heavy correction dispute | Claude Opus arbiter |

Important: do not use Opus for basic key extraction. Use it only if the selected official answer is disputed after solver comparison.

---

## 9. Matching Answer-Key Entries to Questions

Use a matching key:

```text
section + module + source_question_number
```

If module is unavailable, use PDF ordering with caution:

```text
question_order_within_section + source_page proximity + answer-key order
```

But any uncertain match should set:

```text
status = answer_key_row_unmatched
review_required = true
```

Do not silently attach an answer-key row to the wrong question.

---

## 10. Update Question Fields From Answer-Key Entries

After extracting answer-key entries, update `quiz_questions`:

```text
selected_official_answer = answer_key_entries.selected_official_answer
answer_key_status = derived status
```

Only update `correct_answer` after answer verification or manual approval.

Initial compatibility behavior:

```text
correct_answer can remain the old extracted answer for app compatibility,
but publish_gate must rely on selected_official_answer + verified_answer + answer_verification_status.
```

---

## 11. Solver Comparison Against Selected Official Answer

Update the multi-vote grader so it compares against:

```text
selected_official_answer if present
else correct_answer as legacy fallback
```

When selected official answer came from manual correction:

### Solvers agree with red correction

```text
answer_key_status = corrected_key_verified
answer_verification_status = verified
publish candidate if other gates pass
```

### Solvers agree with printed answer but not red correction

```text
answer_key_status = correction_disputed
publish_status = blocked_answer_dispute
review_required = true
```

### Solvers disagree with both

```text
answer_key_status = unverifiable
publish_status = blocked_answer_dispute
review_required = true
```

### Solvers split

Run escalation:

```text
Gemini Pro if visual/math notation issue
Claude Opus if R&W/reasoning dispute
```

Still require review if correction evidence is unclear.

---

## 12. Open-Ended Math Handling

Open-ended questions exist only in Math.

For Math `numeric_entry` answer-key entries:

- store raw printed answer
- normalize fractions/decimals
- store acceptable forms where possible
- compare with SymPy when possible
- check rounding/tolerance

Example:

```json
{
  "printed_answer": "1.5",
  "selected_official_answer": "1.5",
  "verified_answer": "3/2",
  "acceptable_answers": ["3/2", "1.5", "1.50"],
  "answer_equivalence_status": "equivalent"
}
```

If symbolic/surd answers appear, preserve raw answer and route through notation/equivalence checks.

---

## 13. Admin Review UI Requirements

For each reviewed question, show:

```text
Printed key answer
Printed key crossed out? yes/no/uncertain
Manual correction present? yes/no
Manual correction color
Manual correction answer
Selected official answer
Verified answer
Correct answer currently used by app
Answer-key crop
Question crop/page image if available
All solver votes
Arbiter decision
Review reason
```

Reviewer actions:

- accept selected official answer
- override selected official answer
- mark correction unreadable
- mark printed key as correct
- mark key as wrong
- override verified answer
- add review note

Manual review should write to `question_history` and/or `manual_reviews` if implemented.

---

## 14. Orchestrator Update for Phase 2

Add answer-key extraction before import/publish gate.

Preferred order:

```text
1. extract structure
2. extract answer key with correction awareness
3. extract figures
4. generate CSV / import draft questions
5. attach answer_key_entries to imported questions
6. fill explanations only after verification gates allow
7. grade against selected_official_answer
8. update answer_key_status and answer_verification_status
9. validate KaTeX
10. publish gate
```

If maintaining v1 ordering temporarily, run `extract-answer-key.mjs` after Stage 1 but before grading, then update rows before multi-vote grader runs.

---

## 15. Acceptance Tests

### Printed key only

Given a printed answer with no correction:

- `printed_answer = B`
- `selected_official_answer = B`
- `status = printed_key_used_no_correction`
- no review required

### Red correction with cross-out

Given printed B crossed out and red D written next to it:

- `printed_answer = B`
- `printed_answer_crossed_out = true`
- `manual_correction_answer = D`
- `selected_official_answer = D`
- solvers compared against D

### Red correction unclear

Given printed B crossed out and unreadable red mark:

- `selected_official_answer = null`
- `status = printed_key_crossed_out_no_readable_replacement`
- `publish_status = needs_human_review` or `blocked_answer_dispute`

### Solvers dispute correction

Given red correction D but solvers strongly choose B:

- `answer_key_status = correction_disputed`
- `publish_status = blocked_answer_dispute`
- review required

### Open-ended equivalence

Given key says `1.5` and solver says `3/2`:

- answer is equivalent
- do not mark key wrong

### Matching failure

If an answer-key row cannot be matched to a question:

- create/reveal `answer_key_row_unmatched`
- do not attach silently
- require review

---

## 16. Rollback Plan

Phase 2 should be additive.

Rollback steps:

1. Keep `answer_key_entries`; do not drop.
2. Disable `extract-answer-key.mjs` in orchestrator.
3. Grader falls back to `correct_answer` if `selected_official_answer` missing.
4. Publish gate can continue using Phase 1 behavior.
5. Existing rows remain unaffected.

---

## 17. Phase 2 Deliverable Checklist

Phase 2 is complete when:

- [ ] `answer_key_entries` has Phase 2 fields.
- [ ] `extract-answer-key.mjs` exists.
- [ ] Answer-key pages are detected.
- [ ] Answer-key crops are stored in `source_assets`.
- [ ] Printed answers are extracted.
- [ ] Red/manual corrections are detected.
- [ ] Cross-outs are detected.
- [ ] `selected_official_answer` is assigned.
- [ ] Correction confidence is stored.
- [ ] Unclear corrections route to review.
- [ ] Grader compares against `selected_official_answer`.
- [ ] Solver/correction disagreements are blocked.
- [ ] Open-ended math answers are normalized/equivalence-checked.
- [ ] Admin review UI exposes printed/corrected/selected/verified answers.
- [ ] Publish gate blocks unresolved answer-key corrections.

---

# Phase 3 Implementation Spec — Source Asset Lineage (Revised after review)

## Objective

Make every question's source evidence first-class so the admin review UI can compare the website-rendered version against the original PDF page at a glance. Phase 1 created the `source_assets` table; Phase 1 + 2 populated `figure_crop` and `answer_key_page` rows. Phase 3 fills in the gap: per-page renders and per-question crops, with explicit completeness + match-confidence metadata so weak source evidence is visible (not silent).

The central promise: for any quiz_questions row, an admin should be able to load `/admin/questions/inspect/<id>` and see:

```text
website render        ←→        source PDF page (full)
                                source PDF page (zoomed to the question)
                                source PDF page (expanded context: prev + next question)
                                figure / table / chart crop (already from Phase 1)
                                answer-key row crop (already from Phase 2)
```

If a question went through the v2 pipeline, every one of those panels should resolve to a real R2 URL — and if any panel is missing or low-confidence, the publish-gate marks the question for human review.

---

## Phase 3 Scope

Implement:

1. Per-page render (`page_image`) — every page of the source PDF rendered once at 200 DPI, uploaded to R2, registered as a `source_assets` row.
2. Per-question crop (`question_crop`) — tight bbox around each question's stem + choices.
3. Per-question expanded crop (`expanded_question_crop`) — bbox + max(20% padding, 80 px), clamped to page bounds.
4. Question bbox detection — single Gemini Flash call per page returning bbox PLUS completeness flags (does the crop contain the stem? passage? choices? visual?).
5. Strong matching hierarchy — page → visible question number → passage snippet → choice snippets → stem snippet → ordered fallback (only when counts match) → orphan.
6. Match-metadata columns on `source_assets` — `match_method`, `match_confidence`, `matched_source_question_number`.
7. Bbox-cache columns on `quiz_questions` — `question_bbox`, `question_bbox_confidence`, `question_bbox_source_asset_id`.
8. Per-PDF summary output written to stdout AND to `pdf_processing_jobs.progress`.
9. New publish-gate rules (strict mode) that flag rows with weak source evidence as `needs_human_review` (never block).
10. New stage in the orchestrator between import and fill.
11. Admin UI surfacing — Preview-page chips for Crop + Expanded, Inspector-page Source-lineage section.
12. Backfill script for v1 rows whose source PDF is still in R2.

---

## Phase 3 Non-Goals (explicit)

Phase 3 does NOT:

- Classify repeated Desmos / calculator / sidebar panels as irrelevant (Phase 4).
- Decide whether a visual is problem-required vs background-UI artifact (Phase 4).
- Add `calculator_artifact` / `background_ui_artifact` asset_types beyond the existing CHECK constraint (no new rows of those types).
- Repair math notation (Phase 5).
- Change extraction prompts (`extract-with-gemini.mjs`).
- Change answer verification (`multi-vote-grader.mjs` core flow).
- Replace or modify the existing figure-extraction pipeline (`extract-figures.mjs`).
- Refactor `extract-figures.mjs` or `extract-answer-key.mjs` to use the new `page-render.mjs` lib (defer until Phase 3 is stable).
- Provide an admin re-crop / bbox-override UI (Phase 3.5 polish).
- Cross-PDF asset dedup.

---

## 1. Database Migration

Create:

```text
supabase/migrations/<YYYYMMDDHHMMSS>_pdf_ingestion_v2_phase3.sql
```

### 1.1 Compound index for the lineage query

```sql
create index if not exists source_assets_question_id_type_idx
on public.source_assets(question_id, asset_type);
```

Makes "every asset for question X grouped by type" a single index lookup.

### 1.2 Parent-child link

```sql
alter table public.source_assets
add column if not exists parent_asset_id uuid references public.source_assets(id) on delete set null;

create index if not exists source_assets_parent_idx
on public.source_assets(parent_asset_id);
```

A `question_crop` row's `parent_asset_id` points to the `page_image` it was cut out of. Phase 4's relevance flags can then propagate from a page-level finding down to its child crops.

### 1.3 Match-metadata columns on `source_assets`

```sql
alter table public.source_assets
add column if not exists match_method text,
add column if not exists match_confidence numeric,
add column if not exists matched_source_question_number int;

create index if not exists source_assets_match_method_idx
on public.source_assets(match_method);
```

Allowed `match_method` values (enforced in app code first; promote to CHECK after one PDF's data lands):

```text
page_question_number    — page + visible question number      conf ~0.95
page_passage_snippet    — page + passage substring match      conf ~0.90
page_choice_snippets    — page + answer choices match         conf ~0.85
page_stem_snippet       — page + question stem prefix         conf ~0.75
ordered_fallback        — pair by position (counts matched)   conf ~0.60
orphan                  — no DB row matched                   conf  0.00
```

### 1.4 Bbox-cache columns on `quiz_questions`

`source_assets` remains the source of truth. These three columns are denormalized cache for the renderer's read path:

```sql
alter table public.quiz_questions
add column if not exists question_bbox jsonb,
add column if not exists question_bbox_confidence numeric,
add column if not exists question_bbox_source_asset_id uuid references public.source_assets(id) on delete set null;

create index if not exists quiz_questions_bbox_source_asset_idx
on public.quiz_questions(question_bbox_source_asset_id);
```

### 1.5 Phase-3 processing marker on `quiz_questions`

```sql
alter table public.quiz_questions
add column if not exists source_assets_processed_at timestamptz,
add column if not exists source_assets_processed_status text;

create index if not exists quiz_questions_source_assets_processed_idx
on public.quiz_questions(source_assets_processed_at)
where source_assets_processed_at is not null;
```

`source_assets_processed_status` allowed values (app-enforced; **no DB CHECK constraint in Phase 3** — app code validates the value before write):

```text
complete   — page rendered, question detected, matched, crop_complete=true
partial    — Phase 3 ran but the row has SOME issue (low confidence,
             ordered_fallback match, crop_incomplete, orphan-on-page, etc.).
             The specific issue is recorded on the source_assets row;
             this column just signals "look at it".
failed     — Phase 3 attempted but failed entirely (pdftoppm crashed,
             Gemini returned zero detections, DB write errored).
skipped    — Phase 3 chose not to process this row (e.g. dry-run mode,
             or row had no source_page).
```

The richer per-row diagnostic information (what kind of partial, which step failed) lives on the corresponding `source_assets` row's `validation_status` + `raw_metadata.notes`. This column on `quiz_questions` is the coarse signal the publish-gate uses to decide which gates apply.

`source_assets_processed_at` is the SOLE GATE controlling whether the Phase 3 publish-gate rules apply to a row. Rules:

- **`source_assets_processed_at IS NULL`** → row has never been touched by Phase 3. The new gates short-circuit and return null. This is the default state for v1 rows.
- **`source_assets_processed_at IS NOT NULL`** → row went through Phase 3 (successfully or not). The new gates apply normally and may set `needs_human_review` based on the source-evidence signals.

`extract-question-crops.mjs` sets `source_assets_processed_at = now()` on every row it processes, regardless of outcome (success, partial, fail). The `_status` column reflects WHICH outcome.

The backfill script (`scripts/v2-phase3/backfill-source-assets.mjs`) does the same — running it on an old v1 PDF brings those rows under the new gates' jurisdiction.

JSON shape for `question_bbox`:

```json
{
  "y_min": 0,
  "x_min": 0,
  "y_max": 1000,
  "x_max": 1000,
  "page_width": 1700,
  "page_height": 2200,
  "confidence": 0.93
}
```

> **Important:** these three columns are denormalized cache. Any code that needs the authoritative bbox should JOIN to `source_assets` via `question_bbox_source_asset_id`.

---

## 2. Page Rendering helper (cautious rollout)

Create `scripts/lib/page-render.mjs`:

```js
export async function renderPdfPage(pdfPath, pageNumber, opts = {}) {
  const dpi = opts.dpi ?? 200;
  const outDir = opts.outDir ?? tmpdir();
  // pdftoppm wrapper — returns { pngPath, width, height }
}
```

**Usage in Phase 3:** `extract-question-crops.mjs` only.

**Out of scope for Phase 3:** do NOT modify `extract-figures.mjs` or `extract-answer-key.mjs` to use this helper. Both currently work; touching them at the same time as Phase 3 multiplies risk. Consolidation lives in Phase 8.

---

## 3. New script: `extract-question-crops.mjs`

```text
scripts/pdf-pipeline/extract-question-crops.mjs
```

### CLI

```bash
node scripts/pdf-pipeline/extract-question-crops.mjs <pdfPath> \
     --source-pdf <filename> [--job-id <uuid>] \
     [--out /tmp/<stem>-crops.json] [--no-db] [--force]
```

### Flow

```text
1. Load every quiz_questions row WHERE source_pdf = <filename>
2. Group by source_page
3. For each page in the group:
   a. renderPdfPage(pdf, page) → page PNG
   b. Upload page PNG to R2 → source_assets:page_image
   c. Call Gemini Flash on the page PNG → detected questions with
      bbox + completeness flags + confidence
   d. For each detected question:
      - Run the matching hierarchy (§3.4) → quiz_questions row + match_method + match_confidence
      - If matched:
          · Crop tight    → R2 → source_assets:question_crop (parent=page_image)
          · Crop expanded → R2 → source_assets:expanded_question_crop (parent=page_image)
          · Cache bbox + confidence + source_asset_id on quiz_questions
      - If unmatched:
          · Still upload tight + expanded crops as ORPHAN rows
            (question_id=null, validation_status='orphan_unmatched_question_crop',
            relevance='uncertain')
4. Write JSON sidecar + write summary JSON to pdf_processing_jobs.progress
```

### 3.1 Gemini Flash prompt (revised — completeness flags required)

```text
You are looking at one page of an SAT practice test.

For every QUESTION visible on this page, return its bounding box AND
report whether the crop is COMPLETE.

A question is:
- A stem text (with or without a question mark)
- Optionally followed by answer choices A-D (multiple choice)
- Optionally with an associated figure or passage

INCLUDE in each bbox:
- The question number (e.g. "17.")
- The full stem text
- All four answer choices (if MC)
- Inline figures that are part of the question
- The passage if the question's answer depends on it AND the passage
  is on this page

EXCLUDE:
- Page headers and footers
- Module / section title text ("Module 1: Reading and Writing")
- Calculator / Desmos sidebars on math pages
- Other questions on the same page

For each question return:
- source_question_number: the question number printed on the page (1-based), or null
- stem_snippet: the first 80 characters of the stem text
- passage_snippet: the first 80 characters of the relevant passage,
  or null if no passage on this page
- choice_snippets: { A, B, C, D } with the first 40 chars of each
  choice, or null for non-MC questions
- bbox: [y_min, x_min, y_max, x_max] in 0-1000 normalized space
  (Y BEFORE X — Gemini standard)
- confidence: 0.0-1.0 — how confident you are the bbox is correct
- contains_full_question_stem: boolean
- contains_passage_if_present: boolean — true if no passage required
- contains_answer_choices_if_mcq: boolean — true if not MCQ
- contains_embedded_visual_if_present: boolean — true if no visual required
- notes: short caveat, e.g. "passage continues onto next page"

Return strictly { "detected_questions": [...] }.
```

### 3.2 Response schema

```json
{
  "type": "OBJECT",
  "properties": {
    "detected_questions": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "source_question_number": { "type": "INTEGER", "nullable": true },
          "stem_snippet": { "type": "STRING" },
          "passage_snippet": { "type": "STRING", "nullable": true },
          "choice_snippets": {
            "type": "OBJECT",
            "nullable": true,
            "properties": {
              "A": { "type": "STRING" },
              "B": { "type": "STRING" },
              "C": { "type": "STRING" },
              "D": { "type": "STRING" }
            }
          },
          "bbox": { "type": "ARRAY", "items": { "type": "NUMBER" } },
          "confidence": { "type": "NUMBER" },
          "contains_full_question_stem": { "type": "BOOLEAN" },
          "contains_passage_if_present": { "type": "BOOLEAN" },
          "contains_answer_choices_if_mcq": { "type": "BOOLEAN" },
          "contains_embedded_visual_if_present": { "type": "BOOLEAN" },
          "notes": { "type": "STRING", "nullable": true }
        },
        "required": [
          "bbox", "stem_snippet", "confidence",
          "contains_full_question_stem",
          "contains_passage_if_present",
          "contains_answer_choices_if_mcq",
          "contains_embedded_visual_if_present"
        ]
      }
    }
  },
  "required": ["detected_questions"]
}
```

### 3.3 Crop math

```js
// Tight crop (unchanged)
const top  = Math.floor((bbox.y_min / 1000) * pageHeight);
const left = Math.floor((bbox.x_min / 1000) * pageWidth);
const w    = Math.floor(((bbox.x_max - bbox.x_min) / 1000) * pageWidth);
const h    = Math.floor(((bbox.y_max - bbox.y_min) / 1000) * pageHeight);

// Expanded crop: 20% padding OR 80px minimum, whichever is larger,
// clamped to page bounds.
const MIN_PAD_PX = 80;
const pad_x = Math.max(w * 0.2, MIN_PAD_PX);
const pad_y = Math.max(h * 0.2, MIN_PAD_PX);

const expanded = {
  top:    Math.max(0, top - pad_y),
  left:   Math.max(0, left - pad_x),
  width:  Math.min(pageWidth  - Math.max(0, left - pad_x), w + 2 * pad_x),
  height: Math.min(pageHeight - Math.max(0, top  - pad_y), h + 2 * pad_y),
};
```

The 80-px floor is critical for small crops (a 100×100 question block with only 20% padding adds 20 px — far too tight to capture the question number or surrounding context).

### 3.4 Matching hierarchy (replaces the two-tier matcher)

For each detected question on a page, walk this list and stop at the first match:

```text
Step 1 — Always filter to DB rows with source_page = current page.
         These are the candidates.

Step 2 — page + visible question number
         If detected.source_question_number is present AND a candidate
         row has a matching number stored, pair them.
         match_method = "page_question_number",  confidence = 0.95

Step 3 — page + passage snippet (R&W only)
         If detected.passage_snippet is present, compare to the
         candidate row's passage / passage_a / passage_b.
         Lowercase + trim + substring (40-char minimum overlap).
         match_method = "page_passage_snippet",  confidence = 0.90

Step 4 — page + choice snippets (MC only)
         If detected.choice_snippets is present, compare A+B+C+D
         to the candidate row's answer_choices. At least 3 of 4
         must match (40-char overlap).
         match_method = "page_choice_snippets",  confidence = 0.85

Step 5 — page + stem snippet
         Lowercase + trim. The detected snippet is a prefix of the
         row's question_text (or vice versa), >= 40-char overlap.
         match_method = "page_stem_snippet",  confidence = 0.75

Step 6 — ordered fallback
         ONLY if the number of detected questions on this page
         exactly equals the number of unmatched candidate rows for
         this page. Pair by position (Nth detected → Nth row, both
         ordered by their position on the page).
         match_method = "ordered_fallback",  confidence = 0.60

Step 7 — orphan
         No match found. Write the crops anyway with question_id=null.
         match_method = "orphan",  confidence = 0.00
```

`quiz_questions.source_question_number` is not currently a column. Until Phase 2's `answer_key_entries.source_question_number` can be backfilled to a flat column on `quiz_questions`, Step 2 falls through to Step 3.

### 3.5 Orphan-row format

```json
{
  "question_id": null,
  "asset_type": "question_crop",
  "asset_path": "question-crops/<jobId>/p17-orphan-1.png",
  "public_url": "https://...",
  "bbox": { ... },
  "validation_status": "orphan_unmatched_question_crop",
  "relevance": "uncertain",
  "match_method": "orphan",
  "match_confidence": 0.00,
  "notes": "Detected question crop could not be matched to a quiz_questions row."
}
```

Same for the matching `expanded_question_crop` row.

### 3.6 Crop completeness → `crop_complete` flag

A crop is `crop_complete = true` if and only if all four detector flags are true:

```text
contains_full_question_stem        AND
contains_passage_if_present        AND
contains_answer_choices_if_mcq     AND
contains_embedded_visual_if_present
```

Otherwise `crop_complete = false`. Stored on every source_assets row.

### 3.7 R2 keys

```text
question-crops/<jobId-or-stem>/page-<n>.png             — page_image
question-crops/<jobId-or-stem>/p<n>-q<num>.png          — question_crop
question-crops/<jobId-or-stem>/p<n>-q<num>-expanded.png — expanded_question_crop
question-crops/<jobId-or-stem>/p<n>-orphan-<i>.png      — orphan question_crop
```

`Cache-Control: public, max-age=31536000, immutable`.

---

## 4. Models for Phase 3

| Task | Model/tool | Why |
|---|---|---|
| Page rendering | `pdftoppm` (Poppler) | Free, deterministic. |
| Question bbox + completeness | `gemini-2.5-flash` | One call per page; same pattern as figure bboxes. Completeness flags add ~200 output tokens; cost still ~$0.001/page. |
| Image processing | `sharp` (libvips) | Same library used elsewhere. |
| R2 upload | binding or S3 SDK fallback | Same helper as Phase 2's page upload. |

**Estimated cost per PDF:** ~$0.05/PDF for an 80-page test, well under the $0.50 ceiling.

**Estimated storage per PDF:**

- ~80 page PNGs × 500 KB → 40 MB
- ~98 question crops × 80 KB → 8 MB
- ~98 expanded crops × 150 KB → 15 MB
- **Total: ~63 MB/PDF.**

At Cloudflare R2's $0.015/GB/month, 200 PDFs = ~13 GB = ~$0.20/month.

---

## 5. Per-PDF summary

The script writes a summary block to stdout at the end of every run and to `pdf_processing_jobs.progress.crops_summary`:

```json
{
  "source_pdf": "202603asia.pdf",
  "pages_rendered": 104,
  "detected_questions": 100,
  "question_crops_created": 100,
  "expanded_crops_created": 100,
  "matched_crops": 94,
  "orphan_crops": 6,
  "db_rows_without_crops": 4,
  "low_confidence_crops": 8,
  "incomplete_crops": 3,
  "match_method_distribution": {
    "page_question_number": 0,
    "page_passage_snippet": 42,
    "page_choice_snippets": 18,
    "page_stem_snippet": 34,
    "ordered_fallback": 0,
    "orphan": 6
  }
}
```

Counters:

- **pages_rendered** — distinct source pages walked
- **detected_questions** — total bbox detections across all pages
- **question_crops_created** — `source_assets` rows of type `question_crop` written this run
- **expanded_crops_created** — same for `expanded_question_crop`
- **matched_crops** — crops with `match_method != 'orphan'`
- **orphan_crops** — crops with `match_method = 'orphan'`
- **db_rows_without_crops** — quiz_questions rows that should have a crop but don't (detected count < expected count)
- **low_confidence_crops** — crops where `confidence < 0.75`
- **incomplete_crops** — crops where `crop_complete = false`

---

## 6. Orchestrator update

```text
1 extract structure        Claude Sonnet
2 extract figures          existing (untouched)
3 emit CSV
4 import to database       Phase 1 (rows land as 'draft')
5 extract answer key       Phase 2
6 EXTRACT QUESTION CROPS   Phase 3 (NEW — needs question IDs from step 4)
7 fill explanations
8 multi-vote grade
9 validate KaTeX
10 publish gate
```

Position rationale: Phase 3's stage runs AFTER import (needs question IDs for the FK on `source_assets.question_id`) and BEFORE fill (so any admin spot-checking during fill sees the lineage).

**Parallelization not attempted in Phase 3.** Stages 2, 5, and 6 all render pages and call Gemini Flash. A future Phase 8 may merge them; for now each remains independent so a failure in one doesn't poison the others.

---

## 7. New publish-gate rules (STRICT mode — OPT-IN per row)

Phase 3 adds source-evidence gates to `scripts/lib/publish-gate-logic.mjs`. None of these BLOCK publishing outright; they all route to `needs_human_review` so the admin can decide.

**CRITICAL: every new gate is OPT-IN per row.** The gate checks `q.source_assets_processed_at` FIRST. If it's `null` (the row has never been through Phase 3 processing), the gate returns `null` (pass) without inspecting anything else. This means:

- Brand-new v2 imports go through Stage 6 → `source_assets_processed_at` gets set → the new gates apply.
- Old v1 rows already in the bank stay exactly where they are. The new gates are no-ops for them until you explicitly run `backfill-source-assets.mjs`.
- A v2 import where Stage 6 errored mid-way still gets `source_assets_processed_at = now()` set with `_status = 'page_render_failed'` (or whatever failed) → the gates apply and the row is `needs_human_review`. The admin can re-run the script.

```js
// Every new gate follows this shape:
export function gateMissingQuestionCrop(q) {
  if (!q.source_assets_processed_at) return null;   // ← opt-in guard
  if (q.has_question_crop) return null;
  return {
    reason: "phase3_missing_question_crop",
    suggestedStatus: "needs_human_review",
  };
}
```

The seven gates:

```js
// → needs_human_review when:
gateMissingQuestionCrop      // no question_crop exists for this row
gateLowCropConfidence        // match_confidence < 0.75
gateOrderedFallbackMatch     // match_method = 'ordered_fallback'
gateOrphanCropsOnPage        // an orphan crop exists on this row's source_page
gateCropCountMismatch        // detected count != DB row count for this page
gateMissingSourcePage        // source_page is null
gateIncompleteCrop           // crop_complete = false on the row's question_crop
```

These are inserted in the gate cascade AFTER the existing Phase 1+2 blocking gates and BEFORE `gateImportStatus` / `gateExplanation`. That way:

- A `correction_disputed` row stays `blocked_answer_dispute` (stronger).
- A KaTeX-broken row stays `blocked_katex_error` (stronger).
- A clean row with weak crop evidence becomes `needs_human_review`.
- A pre-Phase-3 v1 row is unaffected by any of this.

### Gate query requirements

The publish-gate already selects from `quiz_questions`. Phase 3 needs to additionally aggregate over `source_assets` (to know "does this row have a question_crop? what's its match_confidence? are there orphan crops on the same page?"). The simplest approach: a derived per-question view that pre-aggregates the asset signals:

```sql
create or replace view public.quiz_questions_phase3_signals as
select
  q.id as question_id,
  q.source_pdf,
  q.source_page,
  q.source_assets_processed_at,
  q.source_assets_processed_status,
  -- Best question_crop for this row (highest confidence)
  qc.match_method  as question_crop_match_method,
  qc.match_confidence as question_crop_match_confidence,
  qc.crop_complete as question_crop_complete,
  (qc.id is not null) as has_question_crop,
  -- Orphan crops on the same page
  exists(
    select 1 from public.source_assets oc
    where oc.source_pdf = q.source_pdf
      and oc.page_number = q.source_page
      and oc.match_method = 'orphan'
      and oc.asset_type = 'question_crop'
  ) as has_orphan_crops_on_page
from public.quiz_questions q
left join lateral (
  select * from public.source_assets sa
  where sa.question_id = q.id and sa.asset_type = 'question_crop'
  order by sa.match_confidence desc nulls last
  limit 1
) qc on true;
```

`publish-gate.mjs` reads from this view instead of doing N+1 aggregate queries per row.

---

## 8. v1-Backfill script

`scripts/v2-phase3/backfill-source-assets.mjs --source-pdf <filename>`:

1. Reads `pdf_processing_jobs` for the storage_path matching the filename.
2. Downloads the PDF from R2.
3. Runs the same extract-question-crops flow but UPSERTs source_assets rows (idempotent — keyed by `(question_id, asset_type)`).
4. Optionally takes `--limit N` to throttle.

**Operational, not part of the per-import pipeline.** Existing v1 rows don't need to be automatically backfilled; the admin runs this manually as time permits.

---

## 9. Admin UI surfacing

### Preview page (`/admin/questions/preview`)

The existing PDF chip (preview-overhaul phase 4) gains two siblings:

- **Crop** — renders the `question_crop` image inline using the existing panel pattern.
- **Expanded** — renders the `expanded_question_crop`.

Each crop's panel header shows the match-confidence badge (e.g. "matched via passage snippet · 0.90") so the admin instantly knows whether to trust the crop.

### Inspector page (`/admin/questions/inspect/[id]`)

New "Source lineage" section above the existing findings/history panes:

```text
+-----------------------------------------------------------------+
| Source lineage                                                   |
+-----------------------------------------------------------------+
| 📄 page_image        page-17.png   matched: n/a       [view]    |
| ✂️ question_crop    p17-q5.png    matched: passage 0.90 [view] |
| 🔍 expanded_q_crop  p17-q5-exp    matched: passage 0.90 [view] |
| 📊 figure_crop      figure-1.png  matched: bbox 0.93   [view]   |
| 📑 answer_key_crop  p142-q5.png   matched: order 0.65  [view]   |
+-----------------------------------------------------------------+
```

`[view]` opens the R2 URL in a new tab. Inline modal can come in Phase 4.

---

## 10. Acceptance criteria (revised)

Phase 3 is complete when:

- [ ] For a new PDF import, every imported question has at least one `page_image` source asset for its source_page.
- [ ] Most imported questions have a `question_crop` AND `expanded_question_crop` row.
- [ ] Every source_asset crop has `asset_path`, a non-null `bbox` (when applicable), `validation_status`, and `raw_metadata`.
- [ ] Orphan crops are stored and counted in the per-PDF summary.
- [ ] DB rows without crops are counted and flagged via `gateMissingQuestionCrop`.
- [ ] Low-confidence crops are counted and flagged via `gateLowCropConfidence`.
- [ ] The admin Inspector page can show: full page image, question crop, expanded crop, figure crop (if present), answer-key crop (if present).
- [ ] The admin Preview page exposes Crop + Expanded chips next to the existing PDF chip.
- [ ] Existing v1 rows do NOT need to be backfilled automatically; the script supports `--source-pdf`.
- [ ] Phase 3 does NOT change extraction prompts (`extract-with-gemini.mjs`).
- [ ] Phase 3 does NOT change figure extraction behavior (`extract-figures.mjs`).
- [ ] Phase 3 does NOT touch `extract-answer-key.mjs`.
- [ ] Vitest unit tests cover the matching hierarchy (one test per step, plus orphan + count-mismatch cases) and the bbox→pixel math (including the 80-px-floor edge case).
- [ ] DB verification script asserts: `source_assets_question_id_type_idx` exists; `parent_asset_id` FK works; new `match_method` / `match_confidence` columns accept the documented values; bbox-cache columns on quiz_questions are populated for a successful run.

---

## 11. Rollback

Phase 3 is additive. Rollback steps:

1. Disable Stage 6 in `orchestrate.mjs` (revert one block).
2. Disable the new gates in `publish-gate-logic.mjs` (comment out the imports).
3. Schema additions can stay — all columns are nullable and the FKs use `ON DELETE SET NULL`.
4. The new R2 prefixes (`question-crops/`) can be left in place; no other code reads from them.
5. Existing v1 + Phase 1/2 behavior is unaffected.

---

## 12. Phase 3 Deliverable Checklist

Phase 3 is complete when:

- [ ] Migration adds `source_assets.parent_asset_id`, `source_assets.match_method`, `source_assets.match_confidence`, `source_assets.matched_source_question_number`, `source_assets_question_id_type_idx`, `source_assets_parent_idx`, `source_assets_match_method_idx`.
- [ ] Migration adds `quiz_questions.question_bbox`, `question_bbox_confidence`, `question_bbox_source_asset_id`, `quiz_questions_bbox_source_asset_idx`.
- [ ] `scripts/lib/page-render.mjs` exists and is used ONLY by the new Phase 3 script.
- [ ] `extract-figures.mjs` and `extract-answer-key.mjs` are NOT modified.
- [ ] `extract-question-crops.mjs` exists with the revised prompt + schema (completeness flags + passage/choice snippets).
- [ ] The seven-step matching hierarchy is implemented in `scripts/lib/question-matcher.mjs` and unit-tested.
- [ ] Per-question `question_crop` + `expanded_question_crop` rows are written with correct `parent_asset_id`, `match_method`, `match_confidence`, and `crop_complete`.
- [ ] Orphan crops are written with `question_id=null`, `validation_status='orphan_unmatched_question_crop'`, `relevance='uncertain'`.
- [ ] `quiz_questions.question_bbox` + `_confidence` + `_source_asset_id` are populated for every successful match.
- [ ] Orchestrator runs the new stage between import and fill.
- [ ] `publish-gate-logic.mjs` adds the seven new gates and routes weak evidence to `needs_human_review`.
- [ ] Per-PDF summary is written to stdout AND `pdf_processing_jobs.progress.crops_summary`.
- [ ] Backfill script exists for v1 rows.
- [ ] DB verification script asserts the new constraints + FK behavior.

> **DEFERRED to Phase 3.5 (see below):** Preview page Crop + Expanded chips, Inspector page Source-lineage section, match-confidence badges. The DB + script layer ships in Phase 3 (PR #171); the admin UI surfacing is a separate PR so the lineage UI gets the design attention it deserves without holding up the pipeline work.

---

# Phase 3.5 Implementation Spec — Admin UI Source-Lineage Surfacing

## Objective

Make the Phase 3 source-asset lineage visible to admins on the Preview and Inspector pages. Phase 3 wrote rows; Phase 3.5 makes them clickable, scannable, and trustworthy.

The central question this phase answers: **"For this question, what does the original PDF page actually look like, and how confident is the system that the crop is correct?"** Today the admin has to dig into the database or click out to the source PDF. Phase 3.5 surfaces the answer inline.

---

## Phase 3.5 Scope

Implement:

1. **Preview page — two new toggle chips** next to the existing PDF chip:
   - `Crop` — shows the matched `question_crop` image inline.
   - `Expanded` — shows the matched `expanded_question_crop`.
   - Each chip's header displays a match-confidence badge (e.g. "matched via passage · 0.90").
   - If the row has `has_orphan_crops_on_page = true`, an amber warning banner appears above the figure cards: "⚠ Orphan crops exist on this PDF page — the matcher couldn't pair every detected question with a DB row."
2. **Inspector page — new "Source lineage" section** above the existing findings + history panes. Lists every `source_assets` row attached to the question, grouped by `asset_type`. Each row shows:
   - Asset type icon + label.
   - Filename (last path segment of `asset_path`).
   - Match confidence badge (when applicable).
   - `crop_complete` indicator (green check or amber warning).
   - `[view]` button opening the public URL in a new tab.
3. **Per-question lineage data layer** — a small server-side helper that loads the asset list + the matching aggregate row from `quiz_questions_phase3_signals` in one round trip.
4. **Orphan warning surfacing** — anywhere a row with `has_orphan_crops_on_page = true` is rendered (preview sidebar list, inspector header), show a small "⚠ orphan-on-page" pill so the admin knows the page needs re-review.

---

## Phase 3.5 Non-Goals

Defer to later phases:

- **Inline image modal / zoom** — `[view]` opens a new tab for now. Inline modal can come in Phase 4 (when figure relevance UI lands).
- **Admin re-crop / bbox-override UI** — Phase 3.5 displays the lineage; it does NOT let the admin manually adjust bboxes. That belongs in a dedicated polish PR after Phase 4.
- **Backfill UI** — running the backfill stays a CLI script. No admin button to backfill a PDF.
- **Bulk operations on assets** — no "delete all orphans on this PDF" button. Use the `--force` CLI flag.
- **Side-by-side compare view** — Phase 3 ships chip-per-asset; Phase 4 may layer in a website-vs-source comparison overlay.

---

## 1. Data layer

Add one server helper:

```ts
// src/lib/supabase/queries/quiz/source-lineage.ts

export interface SourceLineage {
  signals: {
    source_assets_processed_at: string | null;
    source_assets_processed_status: string | null;
    question_crop_match_method: string | null;
    question_crop_match_confidence: number | null;
    question_crop_complete: boolean | null;
    has_question_crop: boolean | null;
    has_orphan_crops_on_page: boolean | null;
  } | null;
  assets: Array<{
    id: string;
    asset_type: string;
    asset_path: string;
    public_url: string | null;
    bbox: Record<string, number> | null;
    crop_complete: boolean | null;
    match_method: string | null;
    match_confidence: number | null;
    validation_status: string | null;
    parent_asset_id: string | null;
    created_at: string;
  }>;
}

export async function selectSourceLineageForQuestion(
  questionId: string
): Promise<SourceLineage>;
```

The function does ONE query against `quiz_questions_phase3_signals` (for the aggregate signals) and ONE against `source_assets` filtered by `question_id`. Both ride the indexes shipped in Phase 3.

---

## 2. Preview-page chips (`/admin/questions/preview`)

The PreviewSidePanel component already has chip rendering for `PDF` and the other v1 chips. Phase 3.5 adds:

- `<CropPanel question={current} />` — renders the question_crop image inline, with a header strip showing match_method + confidence.
- `<ExpandedCropPanel question={current} />` — same shape, expanded crop.
- Both follow the existing chip lifecycle (collapsed by default, click to expand, persists in the localStorage view-mode key).

A new sub-component `<MatchConfidenceBadge confidence={0.9} method="page_passage_snippet" />`:

```
[ ✓ passage · 0.90 ]   green for ≥ 0.85
[ ! choice · 0.65 ]    amber for 0.60-0.84
[ ⚠ fallback · 0.60 ]  amber, italics
[ ⚠ orphan ]           red, no confidence
```

When `has_orphan_crops_on_page` is true, render a `<OrphanWarningBanner />` above the preview pane content. One line, dismissible per-session (sessionStorage), with a link to the inspector page.

---

## 3. Inspector page — Source lineage section (`/admin/questions/inspect/[id]`)

A new collapsible card above the findings + history panes:

```text
+----------------------------------------------------------+
| 📁 Source lineage                              [collapse] |
+----------------------------------------------------------+
| Processed: 2026-05-26  status: complete                   |
+----------------------------------------------------------+
| 📄 page_image                                              |
|   page-17.png                                              |
|   No match (page-level)               [view]               |
|                                                            |
| ✂️ question_crop                                          |
|   p17-q5.png                                               |
|   ✓ passage · 0.90  ·  crop complete    [view]            |
|                                                            |
| 🔍 expanded_question_crop                                  |
|   p17-q5-expanded.png                                      |
|   ✓ passage · 0.90  ·  crop complete    [view]            |
|                                                            |
| 📊 figure_crop                                             |
|   figure-1.png                                             |
|   matched via bbox · 0.93              [view]              |
|                                                            |
| 📑 answer_key_crop                                         |
|   p142-q5.png                                              |
|   matched via ordered · 0.65          [view]              |
+----------------------------------------------------------+
```

Groups assets by `asset_type` in this order: `page_image` → `question_crop` → `expanded_question_crop` → `figure_crop` → `table_crop` → `chart_crop` → `answer_key_crop` → `answer_key_page` → any unknown types. Within a group, sorted by `created_at` ascending (so the original asset comes before re-runs).

The card header shows the row's `source_assets_processed_at` + `source_assets_processed_status` so admin sees at a glance whether Phase 3 has even run on this row.

---

## 4. Orphan warning surfacing

When `has_orphan_crops_on_page = true`, two places gain visual signaling:

- **Preview-page sidebar row** for that question — small amber `⚠` icon to the right of the question number.
- **Inspector page header** — banner above the question render: "⚠ This page has orphan crops the matcher couldn't pair. Open the lineage section to see them, or re-run extract-question-crops with --force."

---

## 5. Acceptance criteria

Phase 3.5 is complete when:

- [ ] `selectSourceLineageForQuestion()` server helper exists, returns the documented shape in one round trip, and is unit-tested.
- [ ] Preview page renders Crop + Expanded chips for any row whose `source_assets_processed_at` is non-null.
- [ ] Both chips show a `<MatchConfidenceBadge>` with method + numeric confidence.
- [ ] Preview-page sidebar marks rows with `has_orphan_crops_on_page = true` with an `⚠` icon.
- [ ] Inspector page renders the Source-lineage section above findings/history.
- [ ] Lineage section groups assets by type in the documented order.
- [ ] Each lineage entry shows `crop_complete` status.
- [ ] Each lineage entry's `[view]` button opens the public URL in a new tab.
- [ ] Banner appears on both pages when `has_orphan_crops_on_page = true`.
- [ ] Pre-Phase-3 rows (where `source_assets_processed_at` is null) gracefully hide the lineage section instead of showing empty state confusion.

---

## 6. Phase 3.5 Non-Goals (explicit)

Phase 3.5 does NOT:

- Implement inline image modal / zoom (deferred).
- Provide admin re-crop or bbox override.
- Trigger backfills from the UI.
- Add bulk asset operations.
- Add side-by-side compare overlays.
- Modify any Phase 3 backend behavior.

---

## 7. Estimated effort

| Block | Hours |
| --- | --- |
| `source-lineage.ts` server helper + Vitest tests | 1 |
| MatchConfidenceBadge + OrphanWarningBanner components | 1 |
| Preview-page Crop + Expanded chips | 2 |
| Inspector-page lineage section | 2 |
| Orphan warning surfacing (sidebar + inspector banner) | 1 |
| Visual regression baselines + manual smoke | 1 |
| **Total** | **~8 hours** |

---
