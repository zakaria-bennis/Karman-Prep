# Routine prompt — paste into a fresh Claude Code session

This is the prompt to give to a Claude Code routine that processes
SAT practice PDFs from `incoming/` into the two CSVs the Strata
importer at `/admin/questions/import` consumes.

Verified against the implemented importer:
- 30-column CSV schema (`src/components/admin/BulkImportPanel.tsx` `CSV_HEADERS`)
- 8 domains + 72 concept slugs (`src/lib/question-bank/taxonomy.ts`)
- Difficulty 1–7 (parsed by `src/app/admin/actions.ts` `parseDifficulty`)
- `(source_pdf, content_hash)` dedupe is enforced at the DB level
  by migration 020's unique index — re-runs silently skip duplicates
- Per-choice explanations are accepted for math AND R&W (the
  legacy `subject === "reading"` gate is gone)

When the spec for the importer changes, update this file in lockstep.

---

## Paste the block below into a Claude Code session

````
You are a question-extraction routine for the Strata SAT prep
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
          choice_c + "|" + choice_d))). For SPR questions where
          choices are blank, hash just question_text.
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

Both files share the same 30-column header. The importer accepts
either file independently.

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

72 CONCEPT SLUGS (use as the `concept_slug` field value).
Pick the SINGLE most-relevant slug. Never invent.

ALGEBRA (domain: algebra):
  linear-equations, systems-of-equations, linear-inequalities,
  linear-functions, slope-intercept, systems-of-inequalities,
  absolute-value, linear-word-problems

ADVANCED MATH (domain: advanced_math):
  quadratics, quadratic-vertex, polynomials, exponential-functions,
  rational-expressions, function-notation, function-transformations,
  radical-equations, exponential-growth-decay, nonlinear-systems,
  equivalent-expressions, complex-numbers

GEOMETRY & TRIGONOMETRY (domain: geometry):
  triangles, circles, coordinate-geometry, trigonometry, volume,
  area-perimeter, lines-and-angles, circle-equations, arc-sector,
  right-triangle-trig, unit-circle

PROBLEM-SOLVING & DATA ANALYSIS (domain: data_analysis):
  ratios-rates, percentages, statistics-center, statistics-spread,
  statistics-inference, probability, data-interpretation,
  two-way-tables, scatterplots, unit-conversion, proportional-reasoning

INFORMATION & IDEAS (domain: info_ideas):
  central-idea, command-of-evidence, inference, quantitative-evidence,
  purpose-and-function, summarizing, comparing-texts

CRAFT & STRUCTURE (domain: craft_structure):
  words-in-context, rhetorical-purpose, text-structure,
  cross-text-connections, point-of-view, argument-structure,
  tone-and-style

EXPRESSION OF IDEAS (domain: expression_ideas):
  transitions, rhetorical-synthesis, precision, sentence-combining,
  relevance, introductions-conclusions

STANDARD ENGLISH CONVENTIONS (domain: conventions):
  subject-verb-agreement, punctuation, sentence-boundaries,
  pronoun-agreement, modifier-placement, parallel-structure,
  verb-tense, apostrophes, colons-and-dashes, quotation-marks

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
