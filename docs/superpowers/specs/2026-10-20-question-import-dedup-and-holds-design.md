# Question import: duplicates, problem questions and speed

Date: 2026-10-20 · Status: draft for founder review · Owner: Zakaria Bennis

## 1. Goal

Make released-exam imports faster without lowering quality, and make sure:

- no duplicate question ever reaches the live site;
- duplicates are removed **before** anyone spends review time on them;
- broken or incomplete questions are set aside and fixed in groups, so they
  never hold up the questions that are ready.

This spec chooses "Option B, modified". A review panel compared it with the
Oct 17 plan (`docs/ingestion/released-exam-import-optimized-workflow.md` on
branch `origin/claude/laughing-cray-mi7t23`, "Option A") and voted 3-0 for it.
Option A stays a reference for detailed rules; it is not the plan we run.

## 2. Founder decisions (2026-10-20)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Same-question rule.** Two occurrences are the same question when a student would see the same thing apart from answer-choice order and letters. A changed number, sign, word, punctuation mark, underline, blank, figure, or a different question on a shared passage makes a different question.                                                                                                                                                                                           |
| D2  | **Scanning typos count as the same question.** A few letters that differ because of OCR (for example "it took" vs "in took") do not make a different question. See §5.2 for the guardrail.                                                                                                                                                                                                                                                                                                    |
| D3  | **Extra copies already live** are taken down from a short reviewed list, in a reversible way (un-publish, never delete).                                                                                                                                                                                                                                                                                                                                                                      |
| D4  | **Questions with no printed key** may go live when two independent checks agree on the answer. No label of any kind, on the site or on the question record: these rows leave `answer_source` empty, and the importer's automatic `inferred` tag (`import-core.ts`, `reviewed_answer.kind === "independently_confirmed_generated"`) is removed. The two agreeing solves stay only in the batch's review evidence, as proof the answer was checked. Nothing calls it a printed or official key. |
| D5  | **Database backstop approved.** One migration adds a normalized comparison key and a rule that no two live questions may share it, applied after the live sweep (§4 step 2) clears existing duplicates.                                                                                                                                                                                                                                                                                       |
| D6  | **If the unique count is below 10,000.** The founder picks "accept fewer" or "add another source" once the corpus count (§4 step 5) is known. Not decided now.                                                                                                                                                                                                                                                                                                                                |

## 3. Facts this design rests on (checked 2026-10-20)

- Imports run from the Mac: `/Users/zakariabennis/Documents/Codex/2026-10-11/task-3`
  (ledgers, per-batch scripts, publish SQL) and its `karman-release` checkout
  (importer, HEAD `68f6c1d`, not merged to `main`). Anything that only lands on
  `main` would never run.
- Publish SQL is written by **per-batch hand-made Python scripts**
  (`*_publish_sql.py`, `*_release_sql.py`).
  About 100 of the roughly 280 `*publish.sql` files contain a duplicate guard, and it uses
  `content_hash_v2`.
- `content_hash_v2` (`src/lib/question-bank/import-core.ts`) only trims and
  lowercases, includes subject and domain, and keeps choices in letter order.
  A reordered copy, a copy tagged with another domain, or a copy with
  different notation gets a different hash. It is not unique in the database.
- Database unique rules only stop repeats within one source PDF
  (`(source_pdf, content_hash)` and the source-identity index). Nothing ever
  sets `publish_status = 'duplicate_detected'`.
- A tested conservative duplicate matcher exists:
  `/Users/zakariabennis/Documents/Codex/2026-10-06/task-6/dedup.py` (+
  `test_dedup.py`, `parallel-g/test_matching_boundary.py`). It has only been run
  on samples (20 and 100 occurrences). On 100, it sent 39 to review (26
  ambiguous choice layouts, 13 visual).
- Ledger (Oct 16 05:32): 2,385 live, 36 certified duplicates, 20 certified
  broken, 908 held, 53 waiting on asset upload, 2,386 `awaiting_evidence`
  (never reviewed). The 2,624 live figure is from later that day. **The largest
  pile is unreviewed work, so reviewer capacity is the main speed lever.**
- Reconcile code exists: `src/lib/question-bank/reconcile-import.ts` (commit
  `68f6c1d`, on `release-snapshot/main` and `origin/codex/restart-safe-import-20261013`).
- Paid AI extraction, grading and figure interpretation are retired. Nothing
  in this design calls a paid model API.

## 4. The plan, in build order

Each step lists what it fixes. Steps 1-4 can each be used as soon as they pass
their check; nothing waits for the whole plan.

1. **Baseline and safe resume (day 0-1, safety).** Fresh read-only export of
   live rows and ledger counts. Read back the Oct 16 "US V2 RW M2 Q11" publish
   and record its real outcome. Add a one-writer lock file and a one-line
   "intent" record written before each publish and closed after its readback,
   reusing `reconcile-import.ts`, so an interrupted session resumes from facts,
   not memory.
2. **Live-site duplicate sweep (day 1, duplicates).** Read-only script over
   `quiz_questions` rows that are live and `publish_ready*`, with their choices
   and passages. Groups them with the comparison key (§5.1) and the typo rule
   (§5.2). Output: a short list of duplicate groups, each with the copy to keep
   and the copies to un-publish (D3). The founder approves the list, then a
   reversible un-publish runs and is read back.
3. **One shared publish builder (day 1-2, duplicates).** Replace the per-batch
   publish scripts with one builder that every batch uses. Inside the publish
   transaction it recomputes the comparison key for each row, checks it against
   **every** row in the bank (live or staged), and aborts the whole publish on
   any match. It refuses to emit SQL without this guard. The old per-batch
   publish scripts are retired (moved to an archive folder, not used again).
4. **Batch-start check (day 2, speed and broken).** A lint that runs before a
   batch is frozen and catches the five mistakes behind the Oct 16 rework:
   figure type left at its default, missing classification wrapper, missing
   answer/binding links, difficulty left at a default, and a duplicate decision
   older than the current bank. Failing rows are pulled out of the batch with a
   reason (§6). The rest of the batch continues. The importer is not changed.
5. **Corpus duplicate run (day 2-4, speed and duplicates).** Extend `dedup.py`
   into a run over all ~11,920 captures plus the live export. It must reproduce
   the 36 certified duplicates (any difference explained). Every occurrence ends
   in exactly one group:
   - **Exact or reordered copy** → becomes a member of its cluster automatically.
   - **Typo-level match** (§5.2) → member automatically.
   - **Same text, different answer key** → `answer_dispute` hold.
   - **Figure question** → figure campaign decides, not the founder.
   - **Close match** → founder yes/no list (§5.3).
     One **canonical** per cluster is elected: a live member if one exists,
     otherwise the cleanest copy (complete capture, printed key, no typo, fewest
     flags). Report: number of unique questions, unique questions not yet live,
     and whether 10,000 is reachable (feeds D6).
6. **Founder yes/no list (day 4, duplicates).** Only close matches with the same
   answer and no figure. Side-by-side view, one tap each. Undecided pairs stay
   blocked from publishing.
7. **Parallel review of canonicals only (day 4 onward, speed).** 2-3 reviewer
   sessions work only on canonicals, oldest unreviewed first (the 2,386
   `awaiting_evidence`). One writer publishes. Answer checks:
   - printed key + one independent solve agree → ready;
   - no printed key → ready only when two independent solves agree (D4);
   - any disagreement → `answer_dispute`.
     Difficulty and skill: one rater, with a 10% spot check by a second session.
     If a canonical is parked, the next member of its cluster takes its place.
8. **Problem-question lane (ongoing, broken).** See §6.
9. **Measure after three batches.** Questions per hour, rework share, hold
   share by reason. Add reviewers only if the numbers say the writer is idle.

## 5. Matching rules

### 5.1 Comparison key

One normalizer, versioned (`NORMALIZER_VERSION`), used by the sweep, the
publish builder, the corpus run and the database backstop. Comparison only; it
never changes stored question text.

- Unicode NFKC, case folding, straight quotes, unified dashes, collapsed
  whitespace.
- Math tokens unified: `½`, `1/2`, `\frac{1}{2}`, `\dfrac{1}{2}` → one form;
  `x²` and `x^{2}` → one form; `×`, `\times` → one form; `−` → `-`.
  `x²` and `x2` stay different.
- Markup stripped for comparison, but underline and italic positions are kept
  as a separate part of the key, so a different underlined span is a different
  question.
- Choices compared as a sorted set (order and letters ignored), each choice
  kept once per occurrence.
- Subject and domain are **not** in the key.
- Correct answer compared by its text or value (`0.5` = `1/2`), never by letter.

Key = hash(passage, stem, sorted choices, markup positions, answer format,
table cells). Figures are compared by a reviewed figure signature, never by
image hash alone.

### 5.2 Typo rule (D2)

Two occurrences are the same question despite a text difference only when all
of these hold:

- the difference is in the passage or question text, **not** in an answer
  choice and **not** inside an underlined or blank (tested) span;
- no digit, sign, variable or math token differs;
- each differing spot is at most 3 characters, with at most 2 spots per
  question (defaults, tuned on the test cases in §8);
- the sorted choices and the correct answer are identical.

When it applies, the canonical is the copy without the typo. Anything outside
these limits goes to the founder list (§5.3), not to automatic merging.

### 5.3 What never happens automatically

- No close match is merged without a yes.
- No chains: if A ≈ B and B ≈ C, A and C are not merged unless compared directly.
- No member is certified duplicate until its canonical is verified live.
- Nothing is hard-deleted. Un-publish and set-aside are both reversible.

## 6. Problem-question lane

A question that fails any check leaves its batch with a typed reason and an
age. The batch carries on without it.

| Reason                                 | Cleared by                                                      |
| -------------------------------------- | --------------------------------------------------------------- |
| `needs_figure` / `asset_hold`          | figure campaign (one signed-in admin session for uploads)       |
| `no_answer_key`                        | two independent solves (D4)                                     |
| `answer_dispute`                       | escalation: recheck the capture first, then a blind third solve |
| `extraction_repair`                    | re-crop or re-read from the pinned PDF page                     |
| `skill_unclear` / `difficulty_unclear` | classification pass                                             |
| `variant_review`                       | founder yes/no list                                             |
| `broken_or_excluded`                   | triage campaign (the existing ~658 first)                       |

Rules:

- "Two failed attempts" means two **different** fix methods, not the same one
  twice. After that the question is **parked**: kept with its evidence, out of
  the active queue.
- Parked questions return automatically when a campaign for their reason runs.
- Parked never counts as done or as published.
- A question is marked broken only with written evidence: the defect, every
  copy and revision checked, and the attempts made.
- Campaign order: `broken_or_excluded` triage, then figure uploads, then
  classification.

## 7. Where the code goes

- New tools live where imports run: `task-3` (scripts) and `karman-release`
  (anything that touches the importer or database contract).
- Agents copy each tool to a `claude/*` branch of the GitHub repo for review and
  CI. The founder does no git work.
- The D5 migration goes through the normal path:
  `supabase/migrations/<timestamp>_live_question_comparison_key.sql`, applied
  only after the sweep's un-publish is done and read back, and only with the
  founder's go-ahead for that write.
- Replace, don't accumulate: the per-batch publish scripts and the old
  per-PDF-only duplicate guard are retired when the shared builder is in use.

## 8. Testing and acceptance

| Step | Passes when                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Q11 has a recorded outcome; killing the writer between publish and readback, then resuming, gives zero re-inserts and the right count     |
| 2    | Sweep runs read-only twice with identical output; founder-approved un-publish reads back as expected                                      |
| 3    | A test batch containing a reordered copy of a live question is refused; a clean batch publishes                                           |
| 4    | Replayed Oct 16 mistakes are all caught; a clean batch passes untouched                                                                   |
| 5    | All 36 certified duplicates reproduced or each difference explained; every occurrence has exactly one role; no cluster has two canonicals |
| 6-7  | No undecided pair publishes; spot-check disagreement rate recorded                                                                        |

Test cases for the normalizer and typo rule must include the six founder
examples (shuffled choices, ½ vs 1/2, sign change, shared passage with a new
question, grammar punctuation, "it took" vs "in took") plus the real boundary
cases in `task-6/parallel-g/matching-boundary-cases.json`.

Standard gates for any repo code: `npx tsc --noEmit`, `npm run lint`,
`npm run format:check`, `npm test`, `npm run check:sizes`, `npm run cf:build`.

## 9. Left out on purpose

| Item (from Option A)                  | Revisit when                                  |
| ------------------------------------- | --------------------------------------------- |
| Two-rater difficulty and anchor set   | spot checks show difficulty errors            |
| Throughput model, 6-45 reviewer pool  | after three measured batches, if speed stalls |
| Full Box source registry              | the corpus run shows revisions being mixed up |
| MinHash / fuzzy similarity search     | the simpler keys miss real pairs              |
| Most of Option A's 21 owner decisions | each only if its situation arises             |

## 10. Risks

- **Merging two different questions.** Strict key, typo rule limits, real test
  cases, close matches always need a yes.
- **A long founder list.** Report group sizes first; figure questions go to the
  figure campaign.
- **Someone skipping the guard.** The guard lives in the only publish builder,
  inside the transaction; the database rule (D5) is the final backstop.
- **Parked pile grows.** Typed reasons, ages, automatic return, triage first.
- **10,000 out of reach.** The corpus run measures it early and triggers D6.
