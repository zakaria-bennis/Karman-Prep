# Question Ingestion Spec

Buildable spec for the bulk-import system extension that backs the
PDF-ingestion routine. Read alongside `HANDOFF.md`.

This document is the source of truth for:

1. The migration that extends `quiz_questions`
2. The locked CSV column order the routine must emit
3. The 8-domain / 8-cluster mapping (slug list is canonical in
   [`src/lib/question-bank/taxonomy.ts`](../../src/lib/question-bank/taxonomy.ts) —
   currently **89 slugs**, up from the legacy 72-slug draft this
   doc previously embedded)
4. The importer code changes
5. The admin "Question Review" UI behaviour
6. The two follow-up search features

Decisions agreed in chat are listed inline — do not re-litigate them.

---

## 1 · Migration `020_question_ingestion.sql`

Adds 11 nullable / defaulted columns to `quiz_questions` plus one
unique constraint for idempotent re-imports. No data migration of
existing rows — all new columns are optional or have defaults so
legacy rows keep working unchanged.

```sql
-- ── Columns ─────────────────────────────────────────────────
ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS passage_intro       TEXT,
  ADD COLUMN IF NOT EXISTS passage             TEXT,
  ADD COLUMN IF NOT EXISTS passage_a           TEXT,
  ADD COLUMN IF NOT EXISTS passage_b           TEXT,
  ADD COLUMN IF NOT EXISTS domain              TEXT,
  ADD COLUMN IF NOT EXISTS concept_slug        TEXT,
  ADD COLUMN IF NOT EXISTS answer_source       TEXT
    DEFAULT 'extracted'
    CHECK (answer_source IN ('extracted','inferred','hand_corrected')),
  ADD COLUMN IF NOT EXISTS source_pdf          TEXT,
  ADD COLUMN IF NOT EXISTS source_page         INTEGER,
  ADD COLUMN IF NOT EXISTS content_hash        TEXT,
  ADD COLUMN IF NOT EXISTS import_status       TEXT
    DEFAULT 'ok'
    CHECK (import_status IN ('ok','needs_review')),
  ADD COLUMN IF NOT EXISTS import_flag_type    TEXT
    CHECK (import_flag_type IN ('skip','partial_emit')),
  ADD COLUMN IF NOT EXISTS import_flag_reason  TEXT;

-- ── Domain CHECK against the 8 official SAT domains ────────
ALTER TABLE quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_domain_check;
ALTER TABLE quiz_questions
  ADD CONSTRAINT quiz_questions_domain_check
  CHECK (
    domain IS NULL OR domain IN (
      'algebra','advanced_math','geometry','data_analysis',
      'info_ideas','craft_structure','expression_ideas','conventions'
    )
  );

-- ── Idempotency: same content_hash within same source_pdf
--    cannot exist twice. Routine UPSERT on conflict.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_pdf_hash_uniq
  ON quiz_questions (source_pdf, content_hash)
  WHERE source_pdf IS NOT NULL AND content_hash IS NOT NULL;

-- ── Indexes for the admin Review UI ────────────────────────
CREATE INDEX IF NOT EXISTS quiz_questions_import_status_idx
  ON quiz_questions (import_status)
  WHERE import_status = 'needs_review';

CREATE INDEX IF NOT EXISTS quiz_questions_concept_slug_idx
  ON quiz_questions (concept_slug)
  WHERE concept_slug IS NOT NULL;

-- ── Backfill `topic_cluster` defaults for existing rows ──
-- Existing rows already have ad-hoc `topic_cluster` values like
-- "Algebra — Linear Equations". Leave those alone. New imports
-- populate `topic_cluster` via the domain → cluster map (see
-- src/lib/question-bank/taxonomy.ts).
```

### Why no FK on `concept_slug`

The 72-slug taxonomy lives as a TypeScript constant
(`src/lib/question-bank/taxonomy.ts`) so the routine can validate
client-side and the admin UI can render dropdowns. A Postgres
lookup table is overkill for a list this small that changes via
code review, not runtime data entry.

The importer **must** validate `concept_slug` against the
TypeScript constant before INSERT. Bad slugs are an importer-side
error, not a DB constraint violation.

### Why `topic_cluster` stays `NOT NULL`

It's already `NOT NULL` and existing data has values. The new
importer populates it via the domain → cluster map (8 fixed
values). No schema change needed.

### Hiding `needs_review` from students

Every query that surfaces questions to students must add:

```sql
WHERE import_status IS NULL OR import_status = 'ok'
```

Specifically: `lib/supabase/queries/quiz.ts` `selectQuestionsForNode`,
`selectAdaptiveStep`, etc. The admin Question Review UI is the only
surface that queries `WHERE import_status = 'needs_review'`.

---

## 2 · Locked CSV column order

The routine emits CSV files with EXACTLY these 30 columns in
EXACTLY this order. The importer accepts both the old 15-column
template (legacy) and the new 30-column template (routine output).

```
question_text
choice_a
choice_b
choice_c
choice_d
correct_answer
difficulty
topic_cluster
hint
explanation_text
explanation_a
explanation_b
explanation_c
explanation_d
desmos_strategy
passage_intro
passage
passage_a
passage_b
question_format
numeric_tolerance
domain
concept_slug
answer_source
source_pdf
source_page
content_hash
import_status
import_flag_type
import_flag_reason
```

### Field semantics

| Column | Type | Required | Notes |
|---|---|---|---|
| `question_text` | string | yes | Question stem |
| `choice_a`–`choice_d` | string | when `question_format=multiple_choice` | Blank for SPR |
| `correct_answer` | string | yes | `A`/`B`/`C`/`D` for MC; numeric/expression string for SPR |
| `difficulty` | string | yes | `"1"`–`"7"` integer (preferred) OR legacy `foundational`/`intermediate`/`advanced`/`mastery` |
| `topic_cluster` | string | yes | One of the 8 fixed cluster values (see §3) |
| `hint` | string | optional | One-sentence methodological nudge |
| `explanation_text` | string | yes | Overall explanation |
| `explanation_a`–`explanation_d` | string | optional | Per-choice; routine targets 60-70% distractor coverage |
| `desmos_strategy` | string | optional | Math only when graphing is genuinely faster than algebra |
| `passage_intro` | string | optional | Italic source attribution for literature passages |
| `passage` | string | optional | Full passage text (R&W) |
| `passage_a` / `passage_b` | string | optional, paired-only | Cross-text-connection questions |
| `question_format` | string | yes | `multiple_choice` (default) or `numeric_entry` |
| `numeric_tolerance` | number | optional, SPR-only | ± range; blank = exact match |
| `domain` | string | yes | One of 8 domain slugs (see §3) |
| `concept_slug` | string | yes | One of the 89 locked slugs — canonical list in `src/lib/question-bank/taxonomy.ts` (see §3) |
| `answer_source` | string | yes | `extracted` / `inferred` / `hand_corrected` |
| `source_pdf` | string | yes | Filename of source PDF |
| `source_page` | integer | yes | Page number |
| `content_hash` | string | yes | SHA-1 of normalized question_text + choices |
| `import_status` | string | yes | `ok` / `needs_review` |
| `import_flag_type` | string | when `needs_review` | `skip` / `partial_emit` |
| `import_flag_reason` | string | when `needs_review` | One-line AI-written reason |

### Two-CSV output convention

The routine writes **two files per run** to the same output
directory:

```
questions.csv               (rows where import_status = 'ok')
questions_needs_review.csv  (rows where import_status = 'needs_review')
```

The importer accepts either file. Both flag types (`skip`,
`partial_emit`) go to the needs_review CSV; the column tells them
apart and the admin UI filters by it.

---

## 3 · Locked taxonomy

### Domains (8)

```
algebra · advanced_math · geometry · data_analysis ·
info_ideas · craft_structure · expression_ideas · conventions
```

### Cluster labels (8 — one per domain)

```
algebra           → "Algebra"
advanced_math     → "Advanced Math"
geometry          → "Geometry & Trigonometry"
data_analysis     → "Problem-Solving & Data Analysis"
info_ideas        → "Information & Ideas"
craft_structure   → "Craft & Structure"
expression_ideas  → "Expression of Ideas"
conventions       → "Standard English Conventions"
```

### Concept slugs (89) — canonical list lives elsewhere

> **Don't enumerate the slug list in this doc.** Every additional
> copy is a drift target. Earlier drafts embedded a 72-slug list
> with shorter names (`linear-equations`, `quadratics`) — that list
> is **stale**. Audit finding CRIT-3 traced the drift.

Single sources of truth (in order of authority):

1. **TypeScript:**
   [`src/lib/question-bank/taxonomy.ts`](../../src/lib/question-bank/taxonomy.ts)
   exports `CONCEPT_SLUGS`, derived at module load from
   [`src/data/curriculum/math.ts`](../../src/data/curriculum/math.ts)
   and
   [`src/data/curriculum/reading-writing.ts`](../../src/data/curriculum/reading-writing.ts).
   Currently **89 slugs**. The importer validates against this.
2. **Human-readable / paste-into-ChatGPT:**
   [`question-imports/chatgpt/taxonomy.txt`](../../question-imports/chatgpt/taxonomy.txt)
   enumerates all 89 slugs grouped by domain.
3. **Full extractor prompt (paste-into-ChatGPT, Code Interpreter mode):**
   [`question-imports/chatgpt/KarmanGPT.txt`](../../question-imports/chatgpt/KarmanGPT.txt) §6.
4. **Gemini-targeted system prompt:**
   `SYSTEM_SPEC` inside
   [`question-imports/stage2_classify.py`](../../question-imports/stage2_classify.py).

Slugs use **dashes** (`linear-equations-one-variable`,
`quadratic-equations-factoring`), not the old short names. Domain
values use **underscores** (`algebra`, `advanced_math`).

The `taxonomy.ts` module also exports these helpers used across the
codebase:

- `isValidSlug(slug)` → boolean
- `isValidDomain(value)` → boolean
- `clusterFromSlug(slug)` → cluster display label
- `domainFromSlug(slug)` → domain key
- `nodeIdFromSlug(slug)` → curriculum node id (drives the auto-pick
  in the Review UI)
- `labelFromSlug(slug)` → display label
- `slugFromNodeId(nodeId)` → inverse of `nodeIdFromSlug`
- `searchSlugs(query)` → typeahead-friendly filtered list

---

## 4 · Importer changes

### File: `src/components/admin/BulkImportPanel.tsx`

```ts
// Replace CSV_HEADERS (currently 15 entries) with the 30-column
// list from §2. Update buildCsvTemplate() to emit a sample row
// with every column populated (use the routine's sample row from
// HANDOFF.md as the example).
```

### File: `src/app/admin/actions.ts`

```ts
// Extend BulkImportRow interface with all new fields, all optional.

// In actionBulkImport():
// 1. Validate concept_slug against isValidSlug() before insert.
//    Bad slug → throw with row context.
// 2. Validate domain against SAT_DOMAINS.
// 3. Read difficulty as int 1-7 OR legacy text. If int, derive
//    legacy enum via levelToLegacyDifficulty().
// 4. Read question_format from CSV (default "multiple_choice").
// 5. Read numeric_tolerance from CSV (default null).
// 6. REMOVE the `subject === "reading"` gate on
//    explanation_per_choice — math rows should persist these too.
// 7. UPSERT on (source_pdf, content_hash) when both are present:
//    on conflict, SKIP SILENTLY (per chat decision). Log the skip.
// 8. Pass through all new fields to insertQuestion().

// Return shape adds:
//   { inserted, skipped_duplicates, flagged_for_review, errored }
```

### File: `src/lib/supabase/queries/quiz.ts`

```ts
// Extend NewQuestionInput with new optional fields.

// Update insertQuestion() to write the new columns into
// quiz_questions.

// Add a NEW selector function:
export async function selectQuestionsNeedingReview(opts: {
  flag_type?: 'skip' | 'partial_emit';
  domain?: SATDomain;
  source_pdf?: string;
}): Promise<QuizQuestionWithChoices[]>;

// Add the student-facing filter helper used everywhere students
// see questions:
function liveQuestionsFilter() {
  return "import_status IS NULL OR import_status = 'ok'";
}

// Audit existing query call sites and add this filter to:
//   selectQuestionsForNode()
//   selectAdaptiveStep()
//   any other student-facing question selector
```

### File: `src/types/quiz.ts`

```ts
// Extend QuizQuestion interface with new fields:
//   passage_intro, passage, passage_a, passage_b,
//   domain, concept_slug, answer_source,
//   source_pdf, source_page, content_hash,
//   import_status, import_flag_type, import_flag_reason
```

---

## 5 · Admin Question Review UI

New top-level admin page: `/admin/questions/review`.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Question Review        ▾ Filter by flag type   ▾ Domain   ▾ PDF │
│ 47 needs review · 31 partial_emit · 16 skip                      │
├──────────────────────────────────────────────────────────────────┤
│ [Question card]  ── flag_reason: "Inferred answer (C) disagrees  │
│                                  with key (D) — verify"          │
│   <renders the question in the EXACT diagnostic UI shape>        │
│   [Accept] [Modify] [Reject]                                     │
├──────────────────────────────────────────────────────────────────┤
│ [Question card]  ── ...                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Behavior

- **Accept**: `UPDATE quiz_questions SET import_status='ok',
  import_flag_type=NULL, import_flag_reason=NULL WHERE id=...`
  Question goes live immediately.
- **Modify**: opens the existing `QuestionEditor` inline. On save,
  also flips `import_status` to `ok`.
- **Reject**: `DELETE FROM quiz_questions WHERE id=...`. Confirm
  modal first.
- Filter by `import_flag_type` (skip / partial_emit / both).
- Filter by `domain`.
- Filter by `source_pdf` (dropdown of distinct values currently in
  needs_review).
- Question card renders using the SAME components that render in
  the diagnostic — so the admin sees exactly what the student would
  see if it went live. Reuse `<HighlightablePassage>` if applicable.

### Files to add

```
src/app/admin/questions/review/page.tsx
src/app/admin/questions/review/ReviewClient.tsx
src/app/admin/questions/review/actions.ts  (acceptQuestion, rejectQuestion)
```

Add to admin nav (`src/app/admin/layout.tsx`): `Question Review`
between `Users` and `Revenue`.

---

## 6 · Follow-up search features

Both go in after the importer + Review UI ship. Independent of the
routine.

### A · Slug picker typeahead

Anywhere a `concept_slug` is selected (admin question editor,
tutor question filter, future review-UI modify form):

```tsx
<SlugPicker
  value={slug}
  onChange={setSlug}
  domain={domain}  // optional — when present, restricts to that domain's slugs
/>
```

Backed by `searchSlugs(query)` from `taxonomy.ts`. Renders matches
in a dropdown, keyboard-navigable, shows the cluster label as
secondary text under each slug.

### B · Question full-text search

In admin (`/admin/curriculum/[nodeId]` AND `/admin/questions/review`)
and in tutor view (`/tutor/students/[id]/questions` or similar):

```tsx
<QuestionSearch onResults={(rows) => ...} />
```

Searches across `question_text`, `passage`, `passage_a`,
`passage_b`, and `explanation_text` for substring matches.
Postgres full-text search via:

```sql
SELECT * FROM quiz_questions
WHERE (
  question_text  ILIKE '%' || $1 || '%' OR
  passage        ILIKE '%' || $1 || '%' OR
  passage_a      ILIKE '%' || $1 || '%' OR
  passage_b      ILIKE '%' || $1 || '%' OR
  explanation_text ILIKE '%' || $1 || '%'
)
AND (import_status IS NULL OR import_status = 'ok')  -- hide flagged from non-admin views
LIMIT 50;
```

For better performance at scale, switch to a `tsvector` GIN index
on those columns. Defer until row count crosses ~10k.

---

## 7 · Implementation order

For the next Claude Code session:

1. Write `src/lib/question-bank/taxonomy.ts` (just the constants
   + helpers; nothing depends on it yet).
2. Write migration `020_question_ingestion.sql`. Hand to user
   for SQL editor application.
3. Update `src/types/quiz.ts` with new optional fields.
4. Update `src/lib/supabase/queries/quiz.ts` (`insertQuestion`
   passes through new fields, add `selectQuestionsNeedingReview`,
   add `liveQuestionsFilter` to all student selectors).
5. Update `src/app/admin/actions.ts` (`BulkImportRow`,
   `actionBulkImport` — slug validation, UPSERT, domain check,
   per-choice explanation gate fix).
6. Update `src/components/admin/BulkImportPanel.tsx`
   (CSV_HEADERS, template, helper text).
7. Build admin Question Review UI (3 new files).
8. Smoke-test by hand-crafting a CSV with all column types and
   importing it.
9. (Later) ship slug picker + question search components.

After step 6 the routine prompt can be written with confidence
that the importer accepts what it emits. The routine itself is a
separate Claude Code session — see HANDOFF.md for context.

---

## Decisions locked in chat (do not relitigate)

- 1-7 difficulty integer is the source of truth (legacy enum stays
  for back-compat).
- One concept_slug per question (no secondary).
- Distractor coverage target: 60-70% of explanations explicitly
  address tempting wrong answer with the SAT trap pattern named.
- All passages live inline on the question row (no shared passage
  table, no FK).
- Paired passages use `passage_a` + `passage_b` on the same row.
- Refunds reuse `correct_answer` TEXT column for SPR numeric values.
- Hash collision = skip silently (idempotent re-import).
- needs_review questions are HIDDEN from students until accepted.
- Admin Review UI is its own top-level tab: `/admin/questions/review`.
- topic_cluster = the 8 SAT domains with display labels;
  auto-derived from `concept_slug` via the domain map.
- Slug picker typeahead and question full-text search are
  required, both in admin AND tutor views.
- Math per-choice explanations bug fix: drop the
  `subject === "reading"` gate.
