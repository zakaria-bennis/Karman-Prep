# Skill taxonomy and student explanations

Written 2026-11-08. Founder decisions in this conversation are marked **[decided]**.

## Goal

Replace the 39 College Board skills with a finer list built from how questions are
actually solved, and give every question a clear, step-by-step student explanation.

- **[decided]** The new list replaces the 39 skills outright (not a layer under them).
- **[decided]** Math: about 50 skills, grouped by solving method and by what the question asks for.
- **[decided]** R&W grammar: one skill per grammar rule tested.
- **[decided]** R&W reading: one skill per question type × passage type.
- **[decided]** The whole bank (11,413 questions) gets new explanations, math first.
- **[decided]** Approach: blind solve first, then group, then explain.

## Starting point (measured 2026-11-08)

- 11,413 questions: 4,863 math, 6,550 R&W; 9,988 publish-ready.
- 10,532 carry a 39-skill tag (in `answer_key_entries.raw_model_response.approved_tags`).
  Math buckets are lopsided: "Nonlinear functions" alone holds 706.
- 90% of explanations are under 300 characters.
- 423 math questions mention a figure that has no image or data attached.

## Section 1 — The skill list

One flat list in `src/data/skills/skills.json`: id, subject, domain, label, a one-line
method, passage type (reading only), sort order. No "misc" skills. Combinations or rules
with fewer than about 15 questions go to the founder to keep or merge.

Built from a stratified sample (about 40 questions per current 39-skill bucket),
solved blind by sub-agents that report their method; sub-agents then cluster methods into
skills. The founder approves the list before any full run.

## Section 2 — The pipeline

All runs read the database and write local files under `audit-out/skill-taxonomy/`
(gitignored). Nothing writes to the live bank until Section 4.

1. **Export.** One read-only snapshot of every question with choices, passage, figure data,
   current key and current tags, as JSONL.
2. **Blind solve.** The model sees the question (and figure data when present) but not the
   key. It returns its answer, its method in a few lines, and its confidence.
   Questions whose figure is missing are set aside as `held_missing_figure`.
3. **Key check.** Blind answer equal to key: continue. Different: `held_key_disagreement`
   for the founder, with both answers and the reasoning. No explanation is written for it.
4. **Classify and explain.** For agreeing questions: one skill id from the approved list,
   a passage type (R&W), and the student explanation written to the guide in Section 3.
5. **Automatic checks.** Skill id exists; explanation reaches the key; math in the
   explanation re-checked; length limits; no references to "the key" or the model.

Volume runs use a re-runnable script calling the Anthropic API (Sonnet by default,
Opus for questions the first solve marks low-confidence). The thinking-heavy parts
(building the list, writing the guide, judging pilot quality) use sub-agents in session.
The script is resumable: one result file per question, skipped when present.

## Section 3 — The explanation guide

Written as `docs/content/explanation-guide.md` before any explanation is generated,
from notes on what makes a good one. Core rules:

- Starts from the question as written; uses its numbers and words, never a generic version.
- Math: numbered steps; each step says what to do and why, in that order. Shows the move
  that makes it work, and where a calculator (Desmos) is faster, says how.
- Short: most explanations 3–6 steps. No restating the whole question.
- Wrong choices: one line each on the slip that leads there, only when there is a real one.
- Ends with a one-line takeaway for the next question of the same skill.
- SAT-level methods only.
- Readable by a high school student who got it wrong and wants to find where they went off.

A 30-question pilot per subject is judged by a separate sub-agent and the founder
before the full run.

## Section 4 — Review, write, portal switch

- A review page (local) shows samples per skill: question, blind answer, explanation.
- After founder approval, one write to the database. This is a write to the live question
  bank, so it waits for the founder's explicit go. Storage for the new skill id needs a
  migration (a real column, as the October research recommends); migrations reach
  production only through a founder-approved merge to `main`.
- The portal and practice pages then switch to the new list, and the 39-skill JSON,
  the 89-topic nodes and the crosswalk file are deleted in that same change.

## Not in scope

Changing the calculator, the import tools or the import pipeline; restyling figures;
redrawing missing figures (they are listed, not fixed).
