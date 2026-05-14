# Slug ↔ Node Reconciliation — DONE (2026-04-28)

**Outcome:** unified 1:1 at **89 slugs == 89 nodes** (Path 2 — the larger set
won). Implementation landed: every curriculum node carries `concept_slug` +
`domain`, taxonomy.ts derives the slug list from curriculum.ts, the routine
prompt lists all 89 slugs, the diagnostic data and review UI use the new
slug names, and the question bank is wiped fresh via
`scripts/wipe-question-bank.sql`.

This file is preserved as the design record. The original proposal below
suggested a 78-slug merged set; the user chose maximum granularity instead.

---

## Original goal

Unify the (then) 72 concept slugs and the 89 curriculum nodes into a single
1:1 set so that auto-picking a node from a slug becomes trivial and there is
exactly one place to manage SAT topics.

**How to read this file.** Per domain:

1. The final unified table — one row per slug-node with a kebab-case ID,
   display name, what it replaces, and what action's needed.
2. A "decisions for you" subsection — anything where I'm guessing and want
   your call.

You mark the file up (or just tell me which decisions to flip) and I implement.

---

## Heads-up before we start

**Merges destroy lesson content unless we consolidate it manually.** Several
existing nodes carry `textbook_content` — the lesson notes students read.
When two nodes merge into one slug-node, only one set of notes survives
unless we hand-merge them. I've flagged every merge below; if any contains
notes you want to preserve, tell me and I'll concatenate or pick one.

**Database impact.** Existing `quiz_questions.node_id` references break when
node IDs change. The migration plan: write a one-time SQL script that maps
old IDs → new IDs (e.g. `ma-17` → `quadratics`) for every question row. I'll
include the script as part of the implementation, not separately.

**Final target count: 78 unified slug-nodes** (down from 72 slugs + 89 nodes).
That's 8 algebra + 12 advanced math + 11 geometry + 11 data analysis + 7
info ideas + 7 craft structure + 7 expression ideas + 10 conventions +
**5 strategy nodes that stay outside the slug system** (more on these
at the bottom).

---

## ALGEBRA — final 8

| New ID                    | Display name            | Replaces                | Notes                                                       |
| ------------------------- | ----------------------- | ----------------------- | ----------------------------------------------------------- |
| `linear-equations`        | Linear equations        | **MERGE** ma-00 + ma-01 | Both "one variable" and "two variables" collapse here.      |
| `systems-of-equations`    | Systems of equations    | RENAME ma-15            |                                                             |
| `linear-inequalities`     | Linear inequalities     | RENAME ma-02            |                                                             |
| `linear-functions`        | Linear functions        | **NEW**                 | Currently absorbed into ma-01; SAT treats this as separate. |
| `slope-intercept`         | Slope-intercept form    | **NEW**                 | Same as above.                                              |
| `systems-of-inequalities` | Systems of inequalities | RENAME ma-16            |                                                             |
| `absolute-value`          | Absolute value          | RENAME ma-25            |                                                             |
| `linear-word-problems`    | Linear word problems    | **NEW**                 |                                                             |

**Decisions for you:**

- (A1) Three new nodes (`linear-functions`, `slope-intercept`, `linear-word-problems`) need fresh `textbook_content`. Want me to leave them empty for you to author later, or generate placeholder lesson notes from existing material?
- (A2) When ma-00 and ma-01 merge, which lesson notes survive — ma-00's, ma-01's, or concatenate?

---

## ADVANCED MATH — final 12

| New ID                     | Display name               | Replaces                                                 | Notes                                                          |
| -------------------------- | -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `quadratics`               | Quadratics                 | **MERGE** ma-17 + ma-18                                  | Factoring + quadratic formula collapse.                        |
| `quadratic-vertex`         | Quadratic vertex form      | RENAME ma-19                                             |                                                                |
| `polynomials`              | Polynomials                | **MERGE** ma-10 + ma-20                                  | Intro + operations collapse.                                   |
| `exponential-functions`    | Exponential functions      | **NEW**                                                  | Currently absorbed into ma-23.                                 |
| `rational-expressions`     | Rational expressions       | RENAME ma-21                                             |                                                                |
| `function-notation`        | Function notation          | RENAME ma-08 (was "Evaluating & interpreting functions") |                                                                |
| `function-transformations` | Function transformations   | RENAME ma-26                                             |                                                                |
| `radical-equations`        | Radical equations          | RENAME ma-22 (was "Radical expressions")                 | Slug says "equations," node says "expressions" — keeping slug. |
| `exponential-growth-decay` | Exponential growth & decay | RENAME ma-23                                             |                                                                |
| `nonlinear-systems`        | Nonlinear systems          | RENAME ma-35                                             |                                                                |
| `equivalent-expressions`   | Equivalent expressions     | RENAME ma-07 (was "Simplifying algebraic expressions")   |                                                                |
| `complex-numbers`          | Complex numbers            | **NEW**                                                  |                                                                |

**Drops (with rationale):**

- ma-06 "Properties of exponents" — covered under `exponential-functions` and `equivalent-expressions`. Drop, fold notes into both.
- ma-27 "Linear vs. exponential models" — overlaps `exponential-growth-decay`. Drop, fold notes.
- ma-46 "Algebraic manipulation of complex expressions" — vague tier-3 catch-all. Drop entirely? Or move to strategy nodes?

**Decisions for you:**

- (M1) Drop ma-46 outright, or keep as a strategy node `algebraic-manipulation-strategy` outside the slug system?
- (M2) Two `NEW` slugs (`exponential-functions`, `complex-numbers`) — placeholder lesson notes or empty?

---

## GEOMETRY & TRIGONOMETRY — final 11

| New ID                | Display name             | Replaces                                                    | Notes                                 |
| --------------------- | ------------------------ | ----------------------------------------------------------- | ------------------------------------- |
| `triangles`           | Triangles                | RENAME ma-32 (was "Triangle congruence & similarity")       |                                       |
| `circles`             | Circles                  | **NEW**                                                     | No "plain circles" node today.        |
| `coordinate-geometry` | Coordinate geometry      | RENAME ma-13                                                |                                       |
| `trigonometry`        | Trigonometry             | RENAME ma-34 (was "Trigonometric ratios")                   |                                       |
| `volume`              | Volume                   | **SPLIT** ma-11 (extract volume)                            |                                       |
| `area-perimeter`      | Area & perimeter         | **SPLIT** ma-11 (extract area+perimeter)                    |                                       |
| `lines-and-angles`    | Lines & angles           | RENAME ma-12                                                |                                       |
| `circle-equations`    | Circle equations         | RENAME ma-41                                                |                                       |
| `arc-sector`          | Arc length & sector area | RENAME ma-42                                                |                                       |
| `right-triangle-trig` | Right-triangle trig      | RENAME ma-33 (was "Pythagorean theorem & distance formula") | Pythagorean's a right-triangle topic. |
| `unit-circle`         | Unit circle              | **NEW**                                                     |                                       |

**Decisions for you:**

- (G1) `circles` (new) vs `circle-equations` (renamed ma-41) — these are distinct in the slug list. Confirmed you want both?
- (G2) ma-11 "Area, perimeter & volume" splits into 2 nodes (`volume` and `area-perimeter`). Lesson content has to be cut in two — manageable but tells me how, or I'll just split sentence-by-sentence by topic.
- (G3) Two new nodes (`circles`, `unit-circle`) — empty notes or placeholder?

---

## PROBLEM-SOLVING & DATA ANALYSIS — final 11

| New ID                   | Display name           | Replaces                                              | Notes                                                    |
| ------------------------ | ---------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `ratios-rates`           | Ratios & rates         | RENAME ma-03 (was "Ratios & proportions")             |                                                          |
| `percentages`            | Percentages            | RENAME ma-04                                          |                                                          |
| `statistics-center`      | Statistics — center    | **SPLIT** ma-29 (extract center)                      |                                                          |
| `statistics-spread`      | Statistics — spread    | **SPLIT** ma-29 (extract spread)                      |                                                          |
| `statistics-inference`   | Statistics — inference | RENAME ma-43                                          |                                                          |
| `probability`            | Probability            | RENAME ma-30                                          |                                                          |
| `data-interpretation`    | Data interpretation    | RENAME ma-47 (was "Interpreting complex data")        |                                                          |
| `two-way-tables`         | Two-way tables         | RENAME ma-31                                          |                                                          |
| `scatterplots`           | Scatterplots           | RENAME ma-28 (was "Scatterplots & lines of best fit") |                                                          |
| `unit-conversion`        | Unit conversion        | RENAME ma-05 (was "Unit rates & conversions")         | "Unit rates" portion folds into `ratios-rates`.          |
| `proportional-reasoning` | Proportional reasoning | **NEW**                                               | Overlaps with `ratios-rates` but SAT distinguishes them. |

**Decisions for you:**

- (D1) ma-29 "Statistical measures" → split into center + spread. Notes split too?
- (D2) `proportional-reasoning` is essentially a duplicate of `ratios-rates` to a non-test-prep eye. Confirm you want it as a separate node, or merge?

---

## INFORMATION & IDEAS — final 7

| New ID                  | Display name          | Replaces                                       | Notes                                                   |
| ----------------------- | --------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `central-idea`          | Central idea          | **MERGE** rw-00 + rw-15                        | "Main idea" + "central idea vs. theme".                 |
| `command-of-evidence`   | Command of evidence   | **MERGE** rw-01 + rw-18 + rw-30                | Supporting details + citing evidence + textual command. |
| `inference`             | Inference             | RENAME rw-05                                   |                                                         |
| `quantitative-evidence` | Quantitative evidence | **MERGE** rw-22 + rw-23 + rw-31                | Charts/data nodes fold here.                            |
| `purpose-and-function`  | Purpose & function    | RENAME rw-02 (was "Author's purpose & intent") |                                                         |
| `summarizing`           | Summarizing           | **NEW**                                        |                                                         |
| `comparing-texts`       | Comparing texts       | **MERGE** rw-21 + rw-37                        | Cross-text synthesis + dual-passage.                    |

**Drops:**

- rw-19 "Evaluating argument strength" — better fits `argument-structure` (Craft & Structure). Move there.
- rw-43 "Information & ideas integration" — vague tier-3 catch-all. Drop, fold notes into `central-idea` or `command-of-evidence`.
- rw-47 "Cross-disciplinary evidence use" — vague tier-3 catch-all. Drop.

**Decisions for you:**

- (I1) Triple-merge for `command-of-evidence` (rw-01 + rw-18 + rw-30) is aggressive. They're closely related but each had its own lesson. Accept or split into 2 slugs?
- (I2) Drop rw-43 and rw-47 outright, or keep as strategy nodes?

---

## CRAFT & STRUCTURE — final 7

| New ID                   | Display name           | Replaces                                  | Notes                                                     |
| ------------------------ | ---------------------- | ----------------------------------------- | --------------------------------------------------------- |
| `words-in-context`       | Words in context       | **MERGE** rw-04 + rw-06 + rw-40 + rw-45   | Vocab + word choice + nuanced WIC + precise WIC.          |
| `rhetorical-purpose`     | Rhetorical purpose     | **MERGE** rw-16 + rw-24 + rw-38           | Rhetorical appeals + perspective/bias + literary purpose. |
| `text-structure`         | Text structure         | **MERGE** rw-03 + rw-46                   | Organization patterns + structural analysis.              |
| `cross-text-connections` | Cross-text connections | RENAME rw-21 (was "Cross-text synthesis") |                                                           |
| `point-of-view`          | Point of view          | **SPLIT** rw-17 (extract POV)             |                                                           |
| `argument-structure`     | Argument structure     | **MERGE** rw-19 + rw-48                   | Evaluating argument strength + logical structure.         |
| `tone-and-style`         | Tone & style           | **SPLIT** rw-17 (extract tone)            |                                                           |

**Decisions for you:**

- (C1) `cross-text-connections` (Craft) overlaps with `comparing-texts` (Info Ideas). Confirm both stay?
- (C2) Quadruple-merge into `words-in-context` is aggressive — 4 nodes collapse. Accept?
- (C3) rw-17 splits into POV and tone-and-style. Notes split too?

---

## EXPRESSION OF IDEAS — final 6

| New ID                      | Display name                | Replaces                                          | Notes                         |
| --------------------------- | --------------------------- | ------------------------------------------------- | ----------------------------- |
| `transitions`               | Transitions                 | **MERGE** rw-20 + rw-41                           | Basic + advanced transitions. |
| `rhetorical-synthesis`      | Rhetorical synthesis        | RENAME rw-35                                      |                               |
| `precision`                 | Precision (concision)       | RENAME rw-25 (was "Redundancy & conciseness")     |                               |
| `sentence-combining`        | Sentence combining          | RENAME rw-26 (was "Sentence variety & combining") |                               |
| `relevance`                 | Relevance                   | **NEW**                                           |                               |
| `introductions-conclusions` | Introductions & conclusions | **NEW**                                           |                               |

**Drops:**

- rw-34 "Multi-paragraph structure" — fold into `text-structure` (Craft & Structure).

**Decisions for you:**

- (E1) Two new slugs (`relevance`, `introductions-conclusions`) need empty notes or placeholders.

---

## STANDARD ENGLISH CONVENTIONS — final 10

| New ID                   | Display name           | Replaces                                                 | Notes                                                                                                                               |
| ------------------------ | ---------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `subject-verb-agreement` | Subject-verb agreement | RENAME rw-50                                             |                                                                                                                                     |
| `punctuation`            | Punctuation (general)  | **MERGE** rw-58 + rw-59 + rw-62                          | Catch-all for "other commas" + question marks.                                                                                      |
| `sentence-boundaries`    | Sentence boundaries    | **MERGE** rw-54 + rw-55 + rw-56 + rw-57                  | Periods/semicolons + commas with FANBOYS + dependent clauses + non-essential info — these all govern where sentences begin and end. |
| `pronoun-agreement`      | Pronoun agreement      | RENAME rw-52 (was "Pronouns & nouns")                    |                                                                                                                                     |
| `modifier-placement`     | Modifier placement     | RENAME rw-28                                             |                                                                                                                                     |
| `parallel-structure`     | Parallel structure     | RENAME rw-61 (was "Parallel structure & word pairs")     |                                                                                                                                     |
| `verb-tense`             | Verb tense             | RENAME rw-51                                             |                                                                                                                                     |
| `apostrophes`            | Apostrophes            | RENAME rw-53 (was "Apostrophes (plural vs. possessive)") |                                                                                                                                     |
| `colons-and-dashes`      | Colons & dashes        | RENAME rw-60                                             |                                                                                                                                     |
| `quotation-marks`        | Quotation marks        | **NEW**                                                  |                                                                                                                                     |

**Drops:**

- rw-33 "Counterclaims & rebuttals" — fold into `argument-structure` (Craft & Structure).

**Decisions for you:**

- (S1) `sentence-boundaries` quad-merge is the biggest collapse in the file (4 nodes → 1). The slug system treats commas/periods/semicolons as one topic; the curriculum had four. Accept the merge, or keep some as strategy nodes?
- (S2) `punctuation` triple-merge is also aggressive. Accept?

---

## STRATEGY NODES (kept outside the slug system)

These don't correspond to any single SAT question type but are valuable as
lessons / progression milestones. Recommend keeping them in `curriculum.ts`
with a marker indicating they're not slug-eligible — questions in the bank
won't auto-target them.

| Node ID                  | Topic                                         | Why keep                  |
| ------------------------ | --------------------------------------------- | ------------------------- |
| `ma-48`                  | Multi-step problem solving                    | Tier-3 strategy capstone. |
| `ma-49`                  | Full-section strategy                         | Tier-3 strategy capstone. |
| `rw-49` (if exists)      | Full-section strategy (R&W)                   | Mirror of ma-49.          |
| `ma-46` (if not dropped) | Algebraic manipulation of complex expressions | (See M1.)                 |
| `rw-43` (if not dropped) | Information & ideas integration               | (See I2.)                 |

**Decision for you:**

- (X1) Keep all 5 as strategy nodes? Or aggressively drop everything that doesn't have a slug?

---

## Implementation plan once approved

1. Rewrite [src/data/curriculum.ts](src/data/curriculum.ts) with the new 78-node tree (72 slug-nodes + 5 strategy nodes + adjustments).
2. Add a `concept_slug` field to each curriculum node — 1:1 with the kebab-case ID.
3. Update [src/lib/question-bank/taxonomy.ts](src/lib/question-bank/taxonomy.ts) — slugs already match by ID, just verify `domain` assignments still align.
4. Write `supabase/migrations/0XX_node_id_remap.sql` — maps every old `quiz_questions.node_id` to the new ID. Idempotent. Tested against current bank state.
5. Update any hardcoded references to old node IDs (`ma-17`, `rw-50`, etc.) in `src/data/diagnostic-questions.ts` and elsewhere.
6. Type-check (`npx tsc --noEmit`).
7. After approval and on a clean branch, deploy.

---

## Top-level decisions to confirm

Please answer these in order — they unblock everything else:

1. **Merge aggressiveness.** Are aggressive merges (C2, I1, S1, S2) OK with you, or do you want to split slugs further to preserve more granular nodes? Any one of these I should NOT do?
2. **Lesson content during merges.** When 2-4 nodes collapse, default policy: **concatenate all `textbook_content` from the source nodes into the target**, with a section divider. You can edit later. OK?
3. **New slugs without existing nodes.** Default: **create empty `textbook_content`** for the ~10 new nodes (linear-functions, slope-intercept, linear-word-problems, exponential-functions, complex-numbers, circles, unit-circle, proportional-reasoning, summarizing, relevance, introductions-conclusions, quotation-marks). You author them later. OK?
4. **Strategy nodes.** Keep the 5 strategy nodes outside the slug system, or drop them entirely?
5. **Per-decision overrides.** Anything in the A/M/G/D/I/C/E/S/X lettered questions above you want to flip from my proposal?
