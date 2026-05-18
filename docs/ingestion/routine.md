# PDF Ingestion Routine — design + paste-ready prompt

This document captures everything about the routine that processes
SAT practice PDFs and emits CSVs consumable by Karman's bulk
importer. Read alongside:

- `HANDOFF.md` — overall project state
- `INGESTION_SPEC.md` — the importer extension this routine feeds

This file is the source of truth for the **routine side** —
behaviour, schema, taxonomy, folder conventions, prompts. The
INGESTION_SPEC document is the source of truth for the
**Karman side** — migration, importer code changes, admin UI.

---

## 1 · What the routine does

Processes College Board-style SAT practice PDFs into structured
CSV rows that the Karman bulk-import endpoint can consume.

Inputs:

- A folder of SAT practice PDFs (typically 80-100 pages each)
- Three formats appear in the wild, often mixed within one PDF:
  - Pure text (selectable)
  - Pure screenshots (each page is an image of a rendered question)
  - Mixed (some text pages, some screenshot pages, some pages that
    are screenshots of computer-screen content uploaded into a PDF)

Outputs:

- `questions.csv` — clean rows ready for live import
- `questions_needs_review.csv` — rows flagged for human review
- `import-log.json` — per-run audit trail

Constraints:

- All PDFs are English-only
- No handwritten annotations on questions, no highlight marks
- Answer keys are at the END of each PDF, ~90% accurate
- Some keys have hand-written corrections (e.g., printed "C"
  scratched out, "A" written next to it) — corrections are
  AUTHORITATIVE
- PDFs may have multiple questions per page

---

## 2 · The 30-column CSV schema

Every row emitted (in either CSV) has these 30 columns in this
exact order. Field semantics, types, and required-when rules are
defined in `INGESTION_SPEC.md` §2 — do not duplicate here.

```
question_text,
choice_a, choice_b, choice_c, choice_d,
correct_answer, difficulty, topic_cluster,
hint, explanation_text,
explanation_a, explanation_b, explanation_c, explanation_d,
desmos_strategy,
passage_intro, passage, passage_a, passage_b,
question_format, numeric_tolerance,
domain, concept_slug, answer_source,
source_pdf, source_page, content_hash,
import_status, import_flag_type, import_flag_reason
```

### Three things the routine must understand vs the importer

1. The routine fills `domain` and `concept_slug` strictly from
   the locked taxonomy (§3 below). No invented slugs.
2. The routine derives `topic_cluster` from `concept_slug`'s
   domain via the cluster map. One of 8 fixed values.
3. The routine derives `difficulty` as an integer 1-7. Never
   emits the legacy text values.

---

## 3 · Locked taxonomy (8 domains · 8 clusters · 89 slugs)

Identical to [`spec.md`](./spec.md) §3 — both reference the same
canonical sources rather than duplicating the slug list in this
doc.

### Domains (8)

```
algebra · advanced_math · geometry · data_analysis ·
info_ideas · craft_structure · expression_ideas · conventions
```

### Cluster labels (8 — one per domain, auto-derived)

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

### Concept slugs (89) — canonical sources, not enumerated here

> **Don't enumerate the slug list here.** Every duplicate copy is a
> drift target. Audit finding CRIT-3 traced the previous 72-slug
> draft to staleness.

Single sources of truth:

1. **TypeScript / runtime validator:**
   [`src/lib/question-bank/taxonomy.ts`](../../src/lib/question-bank/taxonomy.ts).
   `CONCEPT_SLUGS` is derived at module load from
   [`src/data/curriculum/math.ts`](../../src/data/curriculum/math.ts)
   + [`src/data/curriculum/reading-writing.ts`](../../src/data/curriculum/reading-writing.ts).
2. **Human-readable enumeration grouped by domain:**
   [`question-imports/chatgpt/taxonomy.txt`](../chatgpt/taxonomy.txt).
3. **Full extractor prompt embeddings (paste-ready):**
   [`question-imports/chatgpt/KarmanGPT.txt`](../chatgpt/KarmanGPT.txt) §6
   for the ChatGPT Code-Interpreter variant; SYSTEM_SPEC in
   [`question-imports/stage2_classify.py`](../../question-imports/stage2_classify.py)
   for the Gemini variant.

Slugs use **dashes** (`linear-equations-one-variable`,
`quadratic-equations-factoring`, `cross-text-synthesis`), not the
short legacy names (`linear-equations`, `quadratics`,
`cross-text-connections`). Domain values use **underscores**
(`algebra`, `advanced_math`).

When the curriculum changes, regenerate the downstream prompt copies
via the `npm run sync:taxonomy` script (or hand-edit if the script
hasn't shipped yet — see audit finding MED-15).

Total: **89 slugs**, distributed as 6 + 17 + 8 + 9 + 15 + 14 + 6 + 14
across the eight domains in order.

---

## 4 · Behaviour rules (locked in chat)

### Difficulty

Integer 1-7. Calibrate toward the full College Board spread:

```
1-2 → easy / introductory
3-4 → medium (most common)
5-6 → hard
7   → reserved for the trickiest questions
```

### Distractor coverage

60-70% of `explanation_*` fields should explicitly address the
most tempting wrong answer choice. NAME the SAT-specific trap
the distractor uses. Common trap patterns the College Board
reuses:

- Sign errors
- Partial completion (right operation, stops early)
- Keyword traps in R&W (using a passage word in a wrong context)
- Reasonable-but-unsupported inferences
- Half-right + half-wrong (one half of an answer is correct, the
  other half is the distractor)
- Switched units / wrong final step
- Common misreading of the question stem

Address the distractor explicitly — don't just confirm the
correct answer.

### Hints

One sentence. Methodological nudge that doesn't reveal the answer
or even the operation. Examples:

```
GOOD: "Start by isolating the radical on one side."
BAD:  "Square both sides to eliminate the radical."

GOOD: "Look at how the author frames the comparison."
BAD:  "The answer is in the second paragraph."
```

### Desmos tips

Math only. Fill ONLY when graphing / table / regression in
Desmos is genuinely faster than algebra. Examples of when it
applies:

- Quadratic intersections, system solutions
- Function transformations (visualize the shift)
- Statistics regression / line of best fit
- Inequality regions

Skip for purely algebraic manipulation, geometry without
coordinates, etc. Blank field is the right answer when graphing
doesn't help.

### Per-choice explanations

Generate for ALL questions (math AND R&W), not just R&W.

### Passages

- Every R&W question has its OWN passage on its OWN row. No
  shared passages across rows. No passage table FK.
- Source from copyright-free libraries (Project Gutenberg,
  open-access research papers, government publications,
  public-domain literature).
- For literature, include `passage_intro` — italic source line,
  Bluebook style: "The following text is adapted from [Author]'s
  [Year] novel [Title]. [Brief setup]."
- For cross-text-connection questions, use `passage_a` +
  `passage_b` on the SAME row. Both fields populated, `passage`
  blank.
- For pure math questions with no surrounding text, leave
  `passage`, `passage_a`, `passage_b`, `passage_intro` all blank.

### Free-response (SPR) questions

- `question_format = "numeric_entry"`
- All `choice_*` fields blank
- `correct_answer` holds the numeric value or expression as a
  string
- `numeric_tolerance` holds the ± range (blank = exact match)
- All `explanation_*` per-choice fields blank
- `explanation_text` carries the full walkthrough

---

## 5 · Answer-key handling

Critical accuracy rule. The routine MUST cross-reference its own
inferred answer with the printed key on every question.

### Workflow per question

1. Independently SOLVE the question — produce an inferred answer
2. EXTRACT the answer-key entry for this question (located at the
   end of the PDF; vision-process the key page carefully)
3. CHECK for hand-corrections in the key:
   - A printed letter that's been scratched out / crossed out
   - A new letter written next to it (in pen, often visibly
     different from the printed key text)
   - Hand-corrections OVERRIDE the printed letter
4. RECONCILE the three signals:

| Inferred | Printed Key | Hand-correction | Behaviour |
|---|---|---|---|
| Matches printed | — | none visible | `answer_source = "extracted"`, `import_status = "ok"` |
| Matches hand-correction | original printed letter (different) | yes | `answer_source = "hand_corrected"`, use corrected letter, `import_status = "ok"` |
| Disagrees with printed | — | none | `answer_source = "inferred"`, use inferred letter, `import_status = "needs_review"`, flag_reason = "Inferred answer (X) disagrees with key (Y) — verify" |
| Inferred disagrees with hand-correction | — | yes | Use the HAND-CORRECTION (it's been human-reviewed). `answer_source = "hand_corrected"`, `import_status = "needs_review"`, flag_reason = "Hand-corrected key (X) disagrees with inferred answer (Y) — high-priority verify" |
| Key page missing/unreadable | — | — | `answer_source = "inferred"`, `import_status = "needs_review"`, flag_reason = "No answer key found — inferred" |

### Vision processing for hand-corrections

Hand-corrections are the most error-prone part of this pipeline.
The routine should:

- Vision-process every answer-key page as an image even when text
  extraction works (text extraction misses pen marks)
- Look for: strikethrough lines through letters, circled letters,
  letters written in margins, asterisks indicating substitutions
- When ambiguous, treat the hand-correction as authoritative AND
  flag the row for review

---

## 6 · Failure modes & flagging

### Two output CSVs

```
questions.csv               (every row has import_status = 'ok')
questions_needs_review.csv  (every row has import_status = 'needs_review')
```

### `import_flag_type` values

```
"skip"          — Question is UNSOLVABLE as printed:
                  · Missing answer choice
                  · Missing question stem
                  · Illegible required diagram
                  · No correct answer can be inferred
                  Row is emitted to needs_review CSV with whatever
                  fields could be extracted; remaining fields blank.

"partial_emit"  — Question is SOLVABLE but has cosmetic issues:
                  · One option text is cut off but inferable from
                    context
                  · Garbled passage formatting that doesn't change
                    meaning
                  · Missing source attribution
                  · Inferred answer disagrees with key (see §5)
                  · Hand-correction visible (see §5)
                  Row is emitted to needs_review CSV with best-effort
                  fills.
```

### `import_flag_reason`

Every `needs_review` row MUST have a non-empty `flag_reason` —
one line, written so an admin reviewing the row knows IMMEDIATELY
what to look at. Examples:

```
"Inferred answer (B) disagrees with key (D) — verify"
"Hand-corrected key (A→C) — high-priority verify"
"option_d cut off in source PDF — inferred from context: '40π'"
"Passage attribution missing in source — added generic label"
"No answer key found — inferred"
"Cannot determine question stem from page layout"
```

### Discriminator: skip vs partial_emit

Ask: "Could a competent SAT student answer this question
correctly with what's on the page?"

- Yes, with cosmetic friction → `partial_emit`
- No → `skip`

---

## 7 · Idempotency

### `content_hash`

Compute SHA-1 of the normalized question content. **Passages are
included** so SAT Reading questions that share canonical stem
wording (cross-text-connection, tone-and-style, text-organization)
don't collide on their stems alone — the passages distinguish them.

```
content_hash = sha1(
  lowercase(strip_whitespace(
    passage_intro + "|" + passage + "|" + passage_a + "|" + passage_b + "|" +
    question_text + "|" +
    choice_a + "|" + choice_b + "|" + choice_c + "|" + choice_d
  ))
)
```

Each passage field (`passage_intro`, `passage`, `passage_a`,
`passage_b`) is treated as the empty string when blank — the
delimiters are still emitted to keep the input shape stable.

For SPR (numeric_entry) questions where choices are blank, hash the
passages + `question_text` (no choices).

### Re-run behaviour

The Karman importer creates a UNIQUE constraint on
`(source_pdf, content_hash)`. On INSERT conflict, the importer
SKIPS SILENTLY (per locked decision in chat). This means re-running
the routine on the same PDF is safe — no duplicates, no data loss,
no errors.

**One caveat from the 2026-05-17 passage-aware hash change** (audit
finding CRIT-4): rows imported under the pre-change formula carry
hashes that don't include passages. Re-running the routine on a PDF
previously imported under the old formula would produce new hashes
and therefore NOT collide with existing rows — duplicates would
land. To safely re-import an old PDF, either delete the old rows
first OR run a rehash pass that updates existing rows' hashes to
the new formula. (No such rehash script ships today; build one if
the user needs to re-import historically processed PDFs.)

If you re-run AFTER fixing flags in the source PDF (e.g.,
correcting a hand-marked key), re-import will skip questions
whose content_hash matches the original. To force re-import of
those rows, an admin must DELETE them first via the Question
Review UI.

---

## 8 · Folder convention

```
question-imports/
├── incoming/        ← user drops PDFs here
│   ├── practice-test-1.pdf
│   └── ...
├── done/            ← routine moves PDFs here after processing
│   └── practice-test-1.pdf
└── runs/
    └── 2026-04-27T18-30-00/
        ├── questions.csv
        ├── questions_needs_review.csv
        └── import-log.json
```

The routine processes everything in `incoming/`, writes both
CSVs + the log to a timestamped subdirectory under `runs/`, then
moves processed PDFs to `done/`. Re-runs that find no PDFs in
`incoming/` exit cleanly.

---

## 9 · Per-run import log

`import-log.json` schema:

```json
{
  "run_id": "2026-04-27T18-30-00",
  "started_at": "2026-04-27T18:30:00Z",
  "ended_at": "2026-04-27T19:12:43Z",
  "duration_seconds": 2563,
  "pdfs_processed": [
    {
      "filename": "practice-test-1.pdf",
      "pages": 87,
      "questions_extracted": 142,
      "questions_ok": 128,
      "questions_needs_review": 14,
      "fully_unreadable_pages": [22, 45]
    }
  ],
  "totals": {
    "ok": 128,
    "needs_review": 14,
    "skipped_duplicates": 0
  }
}
```

Required for every run, even when zero PDFs are processed.

---

## 10 · Batching strategy

Per the planning conversation: ~50-100 questions per single
Claude Code session run before context fills. For 80-100-page
PDFs holding ~150-250 questions each, that means processing one
PDF typically takes 2-3 routine invocations.

Batching guidance for the routine prompt:

- Process ONE PDF at a time
- Within a PDF, batch by ~10-page chunks (~20-30 questions)
- After each chunk, write whatever rows are ready to the output
  CSV (append mode) — never hold the full PDF's worth of rows in
  memory until the end
- After every chunk, update import-log.json

If the routine hits context pressure mid-PDF, it should flush
what it has and exit cleanly with a partial state. The next
invocation reads the import-log.json, sees which pages were
already processed, and resumes from the next unprocessed page.

---

## 11 · Sample rows

### Math MC, ok status

```csv
"If 3x + 5 = 26, what is the value of x?","5","6","7","8","C","2","Algebra","Start by isolating the variable term.","Subtract 5 from both sides to get 3x = 21, then divide by 3 to find x = 7.","5 results from forgetting to subtract 5 first.","6 is a small arithmetic slip.","Correct — x = 7.","8 results from dividing 24 by 3 instead of 21.","Type 3x+5=26 into Desmos and read the intersection.",,,,,multiple_choice,,algebra,linear-equations-one-variable,extracted,"official-sat-practice-test-1.pdf",47,"a3b1c9d4e2f7...",ok,,
```

### R&W with passage, needs_review (inferred answer)

```csv
"Which choice best states the main idea of the text?","Sea otters compete with seabirds for food.","Kelp forests are vital because they shelter many species.","The recovery of sea otters has driven the recovery of entire kelp-forest ecosystems.","Sea urchins are an invasive species in many coastal regions.",C,3,"Information & Ideas",,"The text traces a chain — otters return → urchins decline → kelp regrows → other species shelter — and (C) names that whole chain.",,,"Captures the full chain described.",,,"The following text is adapted from a 2023 marine biology field report.","Sea otters are voracious eaters of sea urchins. Where otter populations have rebounded, urchin numbers have collapsed and the kelp forests urchins were grazing have regrown — sheltering fish, crabs, and seabirds in the process.",,,multiple_choice,,info_ideas,main-idea-and-central-claims,inferred,"ocean-bio-rw-set-3.pdf",12,"b8e2f1c4...",needs_review,partial_emit,"Inferred answer (C) — printed key was unreadable on this page"
```

### Math SPR, ok status

```csv
"What value of n satisfies 4n − 7 = 5n + 2?",,,,,"-9",4,"Algebra","Move all n terms to one side.","Subtract 4n from both sides: −7 = n + 2. Subtract 2: n = −9.",,,,,"Move terms by hand or graph y₁=4x−7 and y₂=5x+2 in Desmos and read the x-coordinate of the intersection.",,,,,numeric_entry,0,algebra,linear-equations-one-variable,extracted,"spr-sample-set.pdf",3,"c7d3e1a8...",ok,,
```

### Cross-text connection, ok status

```csv
"Based on the texts, how would the author of Text 2 most likely respond to the claim made in Text 1?","By agreeing with the claim and supplying additional supporting evidence.","By agreeing with the principle but questioning whether current data confirm the predicted effect.","By rejecting the claim outright as unsupported by any evidence.","By arguing that emotional development has nothing to do with outdoor play.",B,5,"Information & Ideas",,"Text 2 doesn't dispute the principle (essential outdoor play) but observes the predicted decline in well-being hasn't shown up in the data — principled agreement plus empirical caution.",,"Captures principled agreement plus empirical skepticism — the exact stance Text 2 takes.",,,,,,"Unstructured outdoor play is essential to children's emotional development.","Recent surveys document that today's children spend less time in unstructured outdoor play than at any point in the past century. So far, however, no measurable population-level decline in emotional well-being among adolescents has been observed.",multiple_choice,,info_ideas,cross-text-synthesis,extracted,"rw-paired-set-2.pdf",18,"d4f7a2b8...",ok,,
```

---

## 12 · Paste-ready routine prompt

This is the prompt to give to a fresh Claude Code session that
will run the routine. Do not modify without updating the rest of
this document.

````
You are a question-extraction routine for the Karman SAT prep
platform. Your job: read SAT practice PDFs from a folder, extract
every solvable question, classify each one against a locked
taxonomy, write per-choice explanations / hints / Desmos tips
when applicable, and emit two CSV files plus a per-run log.

═══════════════════════════════════════════════════
ENVIRONMENT
═══════════════════════════════════════════════════

Working directory contains:

  question-imports/
    incoming/    — PDFs to process (you process every file here)
    done/        — move each PDF here after processing it
    runs/        — write outputs to runs/<ISO timestamp>/

If incoming/ is empty, exit cleanly without writing files.

═══════════════════════════════════════════════════
PER-PDF WORKFLOW
═══════════════════════════════════════════════════

For each PDF in incoming/:

  1. Read the PDF. Use the Read tool's pages parameter to chunk
     ~10 pages at a time. Vision-process screenshot pages.

  2. Locate the answer key page(s) at the END of the PDF.
     Vision-process EVERY answer-key page (text extraction misses
     hand-corrections). Build an in-memory map of question
     number → printed letter + hand-correction (if any).

  3. For each question on each non-key page:
       a. Extract: question_text, all choices, passage(s) if any
       b. Independently SOLVE the question — produce an inferred
          answer
       c. Look up the answer in the key map. Reconcile per the
          ANSWER-KEY HANDLING rules below.
       d. Classify: pick a domain + concept_slug from the locked
          taxonomy (see TAXONOMY below). NEVER invent a slug.
       e. Compute difficulty 1-7 (see DIFFICULTY rules below).
       f. Write explanation_text (always), per-choice
          explanations (60-70% of questions explicitly address
          the tempting distractor with the SAT trap pattern
          named), hint (always, methodological nudge that
          doesn't reveal the answer), desmos_strategy (math
          only when graphing is genuinely faster).
       g. Compute content_hash = sha1(lowercase(strip_whitespace(
          question_text + "|" + choice_a + "|" + choice_b + "|" +
          choice_c + "|" + choice_d))).
       h. Determine import_status / import_flag_type / 
          import_flag_reason per the FLAGGING rules below.
       i. Append the row to the appropriate CSV in
          runs/<timestamp>/.

  4. After every ~10-page chunk, flush the in-flight rows to
     disk and update import-log.json.

  5. After the whole PDF is done, move it to done/.

═══════════════════════════════════════════════════
CSV SCHEMA — 30 columns, exact order
═══════════════════════════════════════════════════

question_text,
choice_a, choice_b, choice_c, choice_d,
correct_answer, difficulty, topic_cluster,
hint, explanation_text,
explanation_a, explanation_b, explanation_c, explanation_d,
desmos_strategy,
passage_intro, passage, passage_a, passage_b,
question_format, numeric_tolerance,
domain, concept_slug, answer_source,
source_pdf, source_page, content_hash,
import_status, import_flag_type, import_flag_reason

CSV escaping rules:
  · Wrap any field containing commas, quotes, or newlines in 
    double quotes
  · Escape embedded double quotes by doubling them ("")
  · UTF-8, no BOM
  · LF line endings
  · Header row first, then data rows

Two output files per run:
  questions.csv               — rows with import_status = "ok"
  questions_needs_review.csv  — rows with import_status = "needs_review"

═══════════════════════════════════════════════════
TAXONOMY — locked, never deviate
═══════════════════════════════════════════════════

8 DOMAINS (use as the `domain` field value):
  algebra, advanced_math, geometry, data_analysis,
  info_ideas, craft_structure, expression_ideas, conventions

8 CLUSTERS (use as the `topic_cluster` field value):
  algebra          → "Algebra"
  advanced_math    → "Advanced Math"
  geometry         → "Geometry & Trigonometry"
  data_analysis    → "Problem-Solving & Data Analysis"
  info_ideas       → "Information & Ideas"
  craft_structure  → "Craft & Structure"
  expression_ideas → "Expression of Ideas"
  conventions      → "Standard English Conventions"

89 CONCEPT SLUGS (use as the `concept_slug` field value).
Pick the SINGLE most-relevant slug. Never invent.

ALGEBRA (6, domain: algebra):
  linear-equations-one-variable, linear-equations-two-variables,
  linear-inequalities, systems-of-linear-equations,
  systems-of-linear-inequalities, absolute-value-equations

ADVANCED MATH (17, domain: advanced_math):
  properties-of-exponents, simplifying-algebraic-expressions,
  evaluating-and-interpreting-functions, introduction-to-polynomials,
  quadratic-equations-factoring, quadratic-equations-quadratic-formula,
  quadratic-functions-vertex-form, polynomial-operations,
  rational-expressions, radical-expressions, exponential-growth-and-decay,
  function-transformations, linear-vs-exponential-models,
  nonlinear-systems-of-equations,
  algebraic-manipulation-of-complex-expressions,
  multi-step-problem-solving, full-section-strategy

GEOMETRY & TRIGONOMETRY (8, domain: geometry):
  area-perimeter-and-volume, angle-relationships,
  coordinate-plane-geometry, triangle-congruence-and-similarity,
  pythagorean-theorem-and-distance-formula, trigonometric-ratios,
  circle-equations-in-standard-form, arc-length-and-sector-area

PROBLEM-SOLVING & DATA ANALYSIS (9, domain: data_analysis):
  ratios-and-proportions, percentages, unit-rates-and-conversions,
  scatterplots-and-lines-of-best-fit, statistical-measures,
  probability-basics, two-way-tables,
  statistical-inference-and-margin-of-error, interpreting-complex-data

INFORMATION & IDEAS (15, domain: info_ideas):
  main-idea-and-central-claims, supporting-details-and-evidence,
  inference-and-implicit-meaning, central-idea-vs-theme,
  citing-textual-evidence, cross-text-synthesis,
  charts-and-data-in-passages, interpreting-graphs-alongside-text,
  command-of-evidence-textual, command-of-evidence-quantitative,
  counterclaims-and-rebuttals, dual-passage-analysis,
  statistical-claim-evaluation, information-and-ideas-integration,
  cross-disciplinary-evidence-use

CRAFT & STRUCTURE (14, domain: craft_structure):
  authors-purpose-and-intent, text-organization-patterns,
  vocabulary-in-context, word-choice-and-connotation,
  rhetorical-appeals, tone-and-point-of-view,
  evaluating-argument-strength, authorial-perspective-and-bias,
  advanced-argumentation-analysis, literary-authorial-purpose,
  nuanced-vocabulary-in-context, precise-word-choice-in-context,
  structural-analysis-of-texts, logical-structure-of-arguments

EXPRESSION OF IDEAS (6, domain: expression_ideas):
  transitional-words-and-phrases, redundancy-and-conciseness,
  sentence-variety-and-combining, multi-paragraph-structure,
  rhetorical-synthesis, advanced-transitions-and-cohesion

STANDARD ENGLISH CONVENTIONS (14, domain: conventions):
  subject-verb-agreement, verb-tense, pronouns-and-nouns,
  apostrophes-plural-vs-possessive, periods-and-semicolons,
  comma-fanboys, commas-and-dependent-clauses,
  non-essential-information, commas-with-names-and-titles,
  additional-comma-uses-and-misuses, colons-and-dashes,
  parallel-structure-and-word-pairs, question-marks, modifier-placement

═══════════════════════════════════════════════════
DIFFICULTY (integer 1-7)
═══════════════════════════════════════════════════

  1-2 → easy / introductory
  3-4 → medium (most common — ~50% of questions)
  5-6 → hard
  7   → reserved for the trickiest questions

Calibrate against full College Board spread, not against a single
PDF's distribution.

═══════════════════════════════════════════════════
ANSWER-KEY HANDLING
═══════════════════════════════════════════════════

For every question, reconcile your inferred answer with the key:

  Inferred matches printed, no marks       → answer_source="extracted",      status="ok"
  Inferred matches hand-correction         → answer_source="hand_corrected", status="ok"
  Inferred ≠ printed, no hand-correction   → answer_source="inferred",       status="needs_review"
                                             flag_type="partial_emit"
                                             flag_reason="Inferred answer (X) disagrees with key (Y) — verify"
  Inferred ≠ hand-correction               → use hand-correction (it's been human-reviewed)
                                             answer_source="hand_corrected", status="needs_review"
                                             flag_type="partial_emit"
                                             flag_reason="Hand-corrected key (A→C) — high-priority verify"
  Key page missing/unreadable              → answer_source="inferred",       status="needs_review"
                                             flag_type="partial_emit"
                                             flag_reason="No answer key found — inferred"

Vision-process answer key pages CAREFULLY. Look for:
  · Strikethrough through printed letters
  · Letters written next to / over printed ones
  · Circled letters
  · Margin notes that look like substitutions

═══════════════════════════════════════════════════
PER-CHOICE EXPLANATIONS + DISTRACTOR COVERAGE
═══════════════════════════════════════════════════

For 60-70% of MC questions, explicitly address the most tempting
WRONG answer choice in the explanation_a/b/c/d field for that
choice. NAME the SAT-specific trap pattern. Common patterns:

  · Sign errors
  · Partial completion (right operation, stops early)
  · Keyword traps in R&W (passage word in wrong context)
  · Reasonable-but-unsupported inferences
  · Half-right + half-wrong
  · Switched units / wrong final step
  · Common misreading of the question stem

For all questions, write the correct-choice explanation
clearly and concisely (1-2 sentences).

Generate per-choice explanations for ALL questions (math AND
R&W), not just R&W.

═══════════════════════════════════════════════════
HINTS
═══════════════════════════════════════════════════

One sentence. Methodological nudge that doesn't reveal the
answer or even the operation.

GOOD: "Start by isolating the radical on one side."
BAD:  "Square both sides to eliminate the radical."

═══════════════════════════════════════════════════
DESMOS TIPS
═══════════════════════════════════════════════════

Math only. Fill ONLY when graphing / table / regression in
Desmos is genuinely faster than algebra. Examples:

  · Quadratic intersections, system solutions
  · Function transformations
  · Statistics regression
  · Inequality regions

Skip for purely algebraic manipulation, geometry without
coordinates, etc. Blank field is the right answer when graphing
doesn't help.

═══════════════════════════════════════════════════
PASSAGES
═══════════════════════════════════════════════════

  · Every R&W question has its OWN passage on its OWN row.
    Never share passages across rows.
  · For literature, fill `passage_intro` with the italic source
    line (Bluebook style: "The following text is adapted from
    [Author]'s [Year] novel [Title]. [Brief setup].").
  · For cross-text-connection questions, use `passage_a` +
    `passage_b` on the same row, leave `passage` blank.
  · Math without surrounding text: leave all four passage fields
    blank.

═══════════════════════════════════════════════════
SPR (FREE-RESPONSE) QUESTIONS
═══════════════════════════════════════════════════

  · question_format = "numeric_entry"
  · All choice_* fields blank
  · correct_answer holds the numeric value or expression
  · numeric_tolerance holds the ± range (blank = exact match)
  · All explanation_* per-choice fields blank
  · explanation_text carries the full walkthrough

═══════════════════════════════════════════════════
FLAGGING — skip vs partial_emit
═══════════════════════════════════════════════════

skip          — Question is UNSOLVABLE as printed:
                · Missing answer choice
                · Missing question stem
                · Illegible required diagram
                · No correct answer can be inferred

partial_emit  — Question is SOLVABLE but has cosmetic issues:
                · One option text is cut off but inferable
                · Garbled passage formatting (meaning preserved)
                · Missing source attribution
                · Inferred answer disagrees with key
                · Hand-correction visible
                · No answer key found

Discriminator: "Could a competent SAT student answer this
question correctly with what's on the page?"
  Yes → partial_emit
  No  → skip

Both flag types go to questions_needs_review.csv. The flag_type
column distinguishes them.

Every needs_review row MUST have a non-empty flag_reason. Write
it so an admin reviewing the row knows immediately what to look
at.

═══════════════════════════════════════════════════
IMPORT LOG
═══════════════════════════════════════════════════

Write runs/<timestamp>/import-log.json after every chunk. Schema:

{
  "run_id": "<ISO timestamp>",
  "started_at": "<ISO>",
  "ended_at": "<ISO>",
  "duration_seconds": <int>,
  "pdfs_processed": [
    {
      "filename": "<name>.pdf",
      "pages": <int>,
      "questions_extracted": <int>,
      "questions_ok": <int>,
      "questions_needs_review": <int>,
      "fully_unreadable_pages": [<int>, ...]
    }
  ],
  "totals": {
    "ok": <int>,
    "needs_review": <int>,
    "skipped_duplicates": <int>
  }
}

═══════════════════════════════════════════════════
RESUMABILITY
═══════════════════════════════════════════════════

If you hit context pressure mid-PDF: flush in-flight rows,
update import-log, exit cleanly. Next invocation reads the log,
finds the last processed page, and resumes from the next page.

═══════════════════════════════════════════════════
NEVER
═══════════════════════════════════════════════════

  · Never invent a concept_slug not in the locked list above
  · Never invent a domain or topic_cluster value
  · Never write to questions.csv if status is needs_review
  · Never write to questions_needs_review.csv without a flag_reason
  · Never skip the answer-key cross-reference
  · Never share passages across rows
  · Never modify PDFs in incoming/ (only move them to done/)
  · Never delete any output file from a previous run
````

---

## 13 · How this fits with the rest of Karman

The full pipeline:

```
Karman side                                 Routine side
─────────────                               ─────────────
1. Implement INGESTION_SPEC.md
   (migration 020, importer changes,
   admin Review UI, taxonomy.ts)
                                            2. Run the routine prompt
                                               above as a Claude Code
                                               routine
                                            3. Routine reads PDFs in
                                               question-imports/incoming/
                                            4. Emits questions.csv +
                                               questions_needs_review.csv
                                               + import-log.json
5. Admin uploads questions.csv via the
   Bulk Import panel in the existing
   admin UI
6. Admin uploads questions_needs_review.csv
   via the same panel — these rows land
   in the database with import_status =
   'needs_review' and are HIDDEN from
   students
7. Admin opens /admin/questions/review,
   triages each flagged row (Accept /
   Modify / Reject), filtering by
   flag_type / domain / source_pdf
8. Accepted rows flip to import_status =
   'ok' and become live for students
```

---

## 14 · Sequenced next steps

1. **Next Claude Code session** implements `INGESTION_SPEC.md`
   in the order listed in that document's §7. Output: working
   importer + Review UI + taxonomy constant.
2. **One-time**: drop a few real PDFs into
   `question-imports/incoming/` and run the routine prompt as a
   Claude Code routine. Verify the CSV outputs match the schema.
3. **Iterate**: review flagged rows, refine the routine prompt
   based on the patterns of false-flags (over- or under-flagging).
4. **Production**: when the routine is solid, schedule it (Vercel
   Cron, GitHub Action, etc.) so dropping a PDF into `incoming/`
   triggers automatic processing overnight.
