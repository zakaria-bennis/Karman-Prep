# Question Bank — Deep Audit · 2026-05-17

A full review of the Karman Prep question bank — the storehouse of SAT
practice questions that powers the app — before we (a) start producing
content in serious volume and (b) begin work on ML question generation
(roadmap items #6 and #16). The goal: surface every meaningful flaw in
the way questions are stored, imported, reviewed, and served, sorted by
severity, with breadcrumbs that point an engineer at the exact source of
each problem.

---

## How to read this audit

This is the non-programmer-friendly version. The technical findings are
the same as the engineering audit; the language is translated so a
business operator can read it end-to-end and understand what each
problem means for the product, the team, and our students.

A few notes on how it's written:

- **File paths are kept as-is.** Lines like
  `src/lib/question-bank/csv-parser.ts:142-150` are breadcrumbs an
  engineer (or future Claude) can use to find the issue in the code.
  You don't need to understand them — just hand them to whoever's
  fixing the issue.
- **Every finding has the same shape:** what the problem is, why it
  matters for the business, what a healthy version would look like, and
  a sketch of how to fix it.
- **Severity tiers reflect impact, not effort.** A CRITICAL is something
  that could actively give students a wrong answer, leak unfinished
  content, or corrupt our data. A LOW is a cosmetic issue or a stale
  comment.
- **The glossary below covers the recurring terms.** I also define
  jargon inline the first time it shows up, so you can read straight
  through without bouncing back.

### Mini-glossary

| Term                           | Plain meaning                                                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database**                   | The big organized list where every question, every student response, and every other piece of app data lives. Think of it like a giant spreadsheet that the app reads from and writes to. |
| **Table**                      | One of those spreadsheets inside the database — e.g. one table holds questions, another holds students, another holds attempts.                                                           |
| **Row**                        | One record inside a table — one question, one student, one attempt.                                                                                                                       |
| **Column**                     | One field inside a row — e.g. `difficulty_level`, `answer_text`.                                                                                                                          |
| **Server-side / client-side**  | "Server-side" means the app's brain, running on our infrastructure, that we trust. "Client-side" means the student's browser, which we cannot trust because it can be edited.             |
| **Database constraint**        | A rule built into the database itself that rejects bad data at write time. The opposite of trusting the app's code to behave.                                                             |
| **Fingerprint (content hash)** | A short signature generated from a question's text, used to recognize when the same question is being imported twice. Like a barcode for the question's content.                          |
| **Deduplication (dedupe)**     | Recognizing and skipping a duplicate entry instead of inserting it twice.                                                                                                                 |
| **Audit trail**                | A history log of who changed what, and when. Lets you ask "who edited this question last Tuesday?".                                                                                       |
| **Soft delete**                | Marking a row as deleted without actually removing it — kept in the database for history and recovery, but hidden from normal views.                                                      |
| **Pipeline**                   | The chain of steps that takes content from one form (a PDF) to another (rows in the question bank).                                                                                       |

---

## 1. Executive summary

The question bank **works**, but it's fragile in ways that will hurt us
as we scale content production. PDFs flow through the import pipeline
and produce CSV files the importer accepts. Questionable questions get
sent through a review queue. The quiz engine serves questions adaptively
and records every student's attempts. The surface looks healthy.

Underneath, ten high-impact problems will compound as the bank grows
from hundreds of questions to thousands:

1. **The diagnostic test isn't connected to the question bank at all.**
   A student's very first scored experience — the SAT diagnostic that
   recommends what to study — is a hand-typed list of 35 questions in
   [`src/data/diagnostic-questions.ts`](../src/data/diagnostic-questions.ts),
   completely disconnected from the question bank. The bank can't power
   the diagnostic and ML question generation can't extend the diagnostic
   without major surgery.

2. **The rule that hides unverified questions from students lives in
   app code, not in the database itself.** Today, the app filters out
   questions marked as "needs review" before showing them to students.
   The database does not enforce this. If one future code path forgets
   to apply the filter, the app silently starts serving questions where
   the AI guessed the answer, the printed key disagreed with our
   answer, or the image extraction looked iffy — straight to paying
   students. Two places in the code apply the filter correctly. A third
   one (`fetchAllQuestionsForAdmin`) skips it, and it's named "for
   admin" but nothing in the database actually prevents student-facing
   code from calling it.

3. **The list of question topics ("slugs") disagrees across three
   sources.** The spec doc says there are 72 topic slugs with one set
   of names. The Python import pipeline says 89 slugs with different
   names. The actual app code uses the 89 names. Some tests reference
   names from the obsolete 72-slug list. Three "sources of truth", two
   of them outdated.

4. **Some Reading-and-Writing questions can be mistakenly identified
   as duplicates of each other.** The fingerprint we use to detect
   duplicate questions is computed from the question text and the
   answer choices, but NOT from the passages the question references.
   SAT cross-text questions ("Based on the texts, how would the author
   of Text 2 most likely respond...") share that canonical wording. If
   two such questions in one PDF have similar answer choices, the
   second silently disappears as a "duplicate" even though it tests a
   different pair of passages.

5. **No history of who changed what.** When an admin edits a question,
   the database updates a timestamp — but doesn't record who edited it
   or what they changed. Editing a flagged row, accepting a hand-
   corrected answer key, and rewriting an explanation all leave
   identical traces. This is also the exact kind of human-correction
   signal we'd want as training data for ML question generation, and
   we're not capturing it.

6. **An admin can save any random text as a question's topic
   assignment, and the database will accept it.** Inside
   `acceptFlaggedQuestion` ([`review.ts:69-83`](../src/lib/supabase/queries/quiz/review.ts)),
   nothing checks whether the assigned topic actually exists in our
   curriculum. If an admin typoes a topic name, the question lands
   tied to a topic that doesn't exist. Students studying that topic
   see an empty quiz. The orphan question never shows up under any
   real topic in the admin tools either.

7. **An old, unused set of database tables is still sitting in our
   schema.** The original `concepts`, `questions`, and `progress`
   tables from the first version of the app are still there, with 15
   leftover rows in them and an outdated topic taxonomy embedded in
   their rules. Nothing in the app reads from them, but they confuse
   anyone trying to understand the database.

8. **The "Add Question" admin form silently throws away per-choice
   explanations for math questions.** The form checks if the question
   is Reading — if not, it discards the explanations the admin typed
   for each wrong answer. The bulk-import path (the one PDFs go
   through) does NOT have this bug. So PDF imports correctly preserve
   math per-choice explanations, but admins entering questions by hand
   lose them. A previous decision said "drop this gate" — it never
   happened.

9. **Students who retake the same quiz see the exact same questions in
   the exact same order.** The quiz engine resets which-questions-have-
   been-shown at the start of every attempt. There's no awareness that
   "this student already saw this question yesterday and got it right".
   With a target of ~20 questions per topic, retake variety is poor.

10. **Image uploads have no size limit, and the duplicate-image
    fingerprint is dangerously short.** A bad or malicious CSV can
    inject 100MB images that get saved to our cloud storage with no
    cap. And the fingerprint we use to detect duplicate images is only
    the first 16 characters of the full signature — collision-resistant
    at modest scale, but unnecessarily risky and not future-proof.

The rest of this audit walks through all 47 findings (8 CRITICAL · 14
HIGH · 18 MEDIUM · 7 LOW) across 8 areas of the system, plus a separate
section on how ready the bank is for ML question generation.

---

## 2. Method and scope

### What was audited

- All database structure changes related to questions, under
  `supabase/migrations/`.
- The taxonomy + import library:
  `src/lib/question-bank/{taxonomy,bulk-import,csv-parser,classify-bank-accept}.ts`
  and their tests.
- All admin server actions that touch questions:
  `src/app/admin/actions.ts`, `src/app/admin/schemas.ts`.
- The database-query layer for the quiz system:
  `src/lib/supabase/queries/quiz/{questions,review,attempts,flags,node-status}.ts`.
- The three admin question pages:
  `/admin/questions/{import,preview,review}`.
- The student-facing serving path that picks and shows questions:
  `src/contexts/QuizContext.tsx`, `src/components/learn/QuizEngine.tsx`,
  `src/components/learn/quiz/ActiveQuizScreen.tsx`,
  `src/app/learn/[subject]/[nodeId]/page.tsx`, `src/app/learn/quiz-actions.ts`.
- The diagnostic test path:
  `src/app/diagnostic/page.tsx`, `src/data/diagnostic-questions.ts`,
  `src/components/diagnostic/DiagnosticClient.tsx`, `src/lib/diagnostic-scoring.ts`,
  `src/app/api/diagnostic/submit/route.ts`.
- The Python pipeline that turns PDFs into question-bank rows:
  `question-imports/stage1_extract.py`, `stage2_classify.py`,
  `chatgpt/{KarmanGPT.txt,images.txt,instructions.txt,taxonomy.txt}`,
  `ROUTINE_PROMPT.md`, `EXTRACT_README.md`, `README.md`.
- The PDF upload + scheduled-import path:
  `src/app/api/admin/pdf-upload/route.ts`,
  `src/app/api/cron/ingest-csv-inbox/route.ts`,
  `pdf_processing_jobs` table.
- All admin pages dealing with curriculum and question editing.

### What was NOT audited (deliberately)

- The visual design / typography of question rendering — that's a
  separate workstream.
- Live database statistics — the production database wasn't directly
  queryable from this audit's environment. Anything that depends on
  actual row counts or real duplicate rates is marked **needs
  verification**.
- The pedagogical quality of the diagnostic questions themselves —
  separate review (see HIGH-12 for the structural side).
- The Slack chat, cohort, payments, scheduling, and Stripe subsystems.
- The marketing site, sign-up flow, and onboarding.
- The exact storage settings on our image hosting service (only the
  upload code).

### Method

A read-only audit. I traced two complete journeys end-to-end:

1. **PDF to live question.** A PDF gets uploaded → the extraction
   pipeline reads it → AI classification turns it into a CSV → that CSV
   gets imported through `/admin/questions/import` → the bulk-import
   function processes it → an `insertQuestion` call writes the row →
   the question lands in the `quiz_questions` table → if flagged, it
   goes to `/admin/questions/review` → an admin accepts it with a topic
   assignment → from then on, `fetchQuestionsForNode` picks it up →
   the `QuizEngine` serves it to a student.
2. **Student practice → score.** Dashboard → topic page → start-quiz
   action → fetch questions for the topic → load and adaptively pick
   the next question → student answers → record-response action →
   complete-quiz action → update the student's progress on that topic
   → store the confidence band → render the new state.

For each suspicious piece of code, the full file was read to verify the
actual behavior (not just relying on grep matches).

---

## 3. Findings, grouped by severity

### CRITICAL

A CRITICAL finding is something that could already be causing harm — a
wrong answer shown to a student, a security gap, or a structural flaw
that compounds badly as we scale.

---

#### CRIT-1. The diagnostic test isn't connected to the question bank

**Evidence.**

- [`src/data/diagnostic-questions.ts:565-567`](../src/data/diagnostic-questions.ts) — there's a list of 35 hand-authored questions baked directly into the app's code. Nothing reads from the question bank database table.
- [`src/app/diagnostic/page.tsx:24,67`](../src/app/diagnostic/page.tsx) — the diagnostic page imports this static list.
- [`src/api/diagnostic/submit/route.ts:30-40`](../src/app/api/diagnostic/submit/route.ts) — when a student submits the diagnostic, the server checks that the question ID is a non-empty string but doesn't verify it against any database row. Worse, the server trusts the student's browser to say whether each answer was right.

**The problem.** Our product's first scored experience for every new
student — the SAT diagnostic that recommends what to study — uses a
frozen list of 35 questions hard-coded into the app, not the question
bank. So:

- The bank that powers the actual practice quizzes is completely
  separate from the bank that drives the score recommendation.
- A student takes the diagnostic against this frozen list, gets pointed
  at weak topics, then opens Learn pages backed by entirely different
  questions — there's no shared taxonomy or shared metadata between the
  two.
- ML question generation cannot extend the diagnostic until the
  diagnostic is migrated into the same database table as everything
  else.

**What healthy looks like.** Diagnostic questions live inside the
`quiz_questions` table like every other question, with a flag (e.g.
`is_diagnostic = true`) marking them, and a per-domain rule for how
many of each type to use. The diagnostic page pulls a balanced
35-question subset from the database. The submit endpoint independently
checks the student's answer against the canonical correct answer in the
database, instead of trusting whatever the browser says.

**How to fix.** Move the 35 hand-authored questions into the
`quiz_questions` table with `is_diagnostic = true`. Change the
diagnostic page to query them. Replace the "trust the browser" answer
check with a server-side check using our existing `evaluateAnswer()`
function. As a bonus, we could rotate the question pool so retakes pull
a different subset.

---

#### CRIT-2. The "only show live questions to students" rule isn't enforced by the database

**Evidence.**

- [`src/lib/supabase/queries/quiz/questions.ts:26`](../src/lib/supabase/queries/quiz/questions.ts) — a `LIVE_FILTER` constant defines "live" as questions whose import status is null or "ok".
- [`questions.ts:34-46`](../src/lib/supabase/queries/quiz/questions.ts) — `fetchQuestionsForNode` applies it most of the time, but optionally lets the caller skip it.
- [`questions.ts:48-57`](../src/lib/supabase/queries/quiz/questions.ts) — `fetchAllQuestionsForAdmin` doesn't apply the filter at all.
- The database's own access rules currently say "the app has full power" — there's no database-level distinction between live and flagged questions for the code that serves students.

**The problem.** Today, "live questions only" is an honor-system rule
inside the app's code. If anyone — a future engineer, an ML system, an
import script — writes a new query that forgets to apply that filter,
the app will silently start serving questions that were never meant to
go live:

- Questions where the AI just guessed the answer (`answer_source =
'inferred'`).
- Questions where our recorded answer disagrees with the printed
  answer key (`import_flag_type = 'partial_emit'`).
- Image-bearing questions explicitly flagged "verify the figure was
  extracted correctly".

Cost of an exposed bad-answer-key question: a student gets told they
got it wrong when they didn't, or vice versa. Trust damage. With one
or two writers today this is manageable; once a content team exists,
the surface for accidental leakage is much bigger.

**What healthy looks like.** The "live" rule is enforced inside the
database itself. Either a dedicated view (think of it like a saved
filtered query) that only shows live rows, or a true database-level
access rule. Student-facing queries can only see live rows; admin
queries can see everything. A future bug in the app code can't bypass
the protection.

**How to fix.** Two options:
(a) Create a `quiz_questions_live` view that's pre-filtered to live
rows. Rewrite all student-facing code to read from that view.
Admin code keeps reading the full table.
(b) The bigger long-term move: stop letting the app use the "full
power" service-role connection for student-facing requests. Switch
to per-role access rules, and let the database itself filter.

Option (a) is cheap and gets us 80% of the protection. Option (b) is
the right long-term answer but pairs with a broader auth refactor.

---

#### CRIT-3. Three documents disagree about how many topics we have and what they're called

**Evidence.**

- [`docs/ingestion/spec.md`](./ingestion/spec.md) sections 3 and 1 — says we have 72 topic slugs, with names like `linear-equations`, `quadratics`, `triangles`.
- [`docs/ingestion/routine.md`](./ingestion/routine.md) sections 3 and 11 — also says 72 slugs, same outdated names. Its sample CSV uses `concept_slug=linear-equations`.
- [`src/lib/question-bank/taxonomy.ts:54-61`](../src/lib/question-bank/taxonomy.ts) + [`src/data/curriculum/{math,reading-writing}.ts`](../src/data/curriculum/) — the actual running code generates **89** slugs with longer names like `linear-equations-one-variable`, `quadratic-equations-factoring`, `triangle-congruence-and-similarity`.
- [`question-imports/stage2_classify.py:102-162`](../question-imports/stage2_classify.py) — the Python import pipeline's prompt lists those same 89 slugs.
- [`question-imports/chatgpt/taxonomy.txt`](../question-imports/chatgpt/taxonomy.txt) — also 89 slugs, matching the curriculum.
- [`src/lib/question-bank/classify-bank-accept.test.ts:28-29`](../src/lib/question-bank/classify-bank-accept.test.ts) — the tests use `"linear-equations"` and `"quadratics"`, neither of which is a real slug in the running app.

**The problem.** Three documents claim to define the canonical list of
topics — and they disagree. If anyone follows the spec doc literally
when authoring questions, every question they produce will have a
topic slug like `linear-equations` that the real app doesn't
recognize. Those questions would be accepted into the bank but never
auto-route to a learning topic, ending up in a stuck state
(`skippedIds`). The tests use the wrong names too, which means the
test suite can't catch real regressions on the actual slug list. The
Python pipeline's prompt has been kept up to date; the spec docs have
not.

**What healthy looks like.** One canonical taxonomy file (the
curriculum). Every other document either links to it or is
auto-generated from it. The tests use real slugs.

**How to fix.** Rewrite the topic sections of
`docs/ingestion/spec.md` and `docs/ingestion/routine.md` either to
auto-generate from `taxonomy.ts` or to explicitly say "see
`src/lib/question-bank/taxonomy.ts` for the canonical 89 slugs — this
section is illustrative only." Update `classify-bank-accept.test.ts`
to use real slug names (e.g. `linear-equations-one-variable`).

---

#### CRIT-4. The duplicate-question fingerprint doesn't include passages — Reading questions can mistakenly be flagged as duplicates

**Evidence.**

- [`src/lib/question-bank/bulk-import.ts:31-68`](../src/lib/question-bank/bulk-import.ts) — the bulk import knows about `passage`, `passage_a`, `passage_b` fields, but the fingerprint computed at [`question-imports/stage2_classify.py:406-429`](../question-imports/stage2_classify.py) hashes only the question text plus the answer choices.
- [`docs/ingestion/routine.md:344-353`](./ingestion/routine.md) spells it out: `content_hash = sha1(lower(strip(question_text + "|" + choice_a + "|" + choice_b + "|" + choice_c + "|" + choice_d)))`.
- The database's duplicate-prevention rule (from migration `20260514002443:62-64`) says: same source PDF + same fingerprint = duplicate.

**The problem.** SAT Reading "cross-text connection" questions all use
the same canonical wording: "Based on the texts, how would the author
of Text 2 most likely respond to the claim made in Text 1?" The SAT
deliberately reuses phrasing. So if two cross-text questions in the
same PDF have:

1. That same canonical stem, AND
2. Coincidentally similar four-option answer text,

...they'll generate the same fingerprint. The second question gets
silently flagged as a duplicate of the first. The deduped question's
passages are lost forever. Same risk applies to tone-and-style and
text-organization questions, which all share canonical wording.

**What healthy looks like.** The fingerprint includes all passage
text (`passage`, `passage_a`, `passage_b`, `passage_intro`). Two
questions with shared stems but different passages produce different
fingerprints, and both get imported.

**How to fix.** Update the fingerprint-computation function (`compute_content_hash` in `stage2_classify.py`)
and the documented spec in `routine.md` to include all passage fields.
Since the Python pipeline does the recomputation, fixing it on the
Python side is enough.

This is a forward-only fix: existing rows in the bank keep their old
fingerprints; new imports compute the new fingerprint. Existing rows
keep working. Re-imports of previously imported PDFs would have
slightly higher dedup accuracy.

---

#### CRIT-5. The diagnostic submit endpoint trusts the student's browser to say whether each answer was correct

**Evidence.**

- [`src/app/api/diagnostic/submit/route.ts:29-36`](../src/app/api/diagnostic/submit/route.ts) — the submit endpoint's validation rules accept a field called `correct: z.boolean()` (where Zod is the library that validates incoming data). It expects the browser to tell the server whether each answer was right.
- [`route.ts:62-71`](../src/app/api/diagnostic/submit/route.ts) — the server passes those browser-supplied values straight through to the scoring function. It never independently checks the answer against the canonical question.

**The problem.** Anyone with a browser inspector — and any motivated
high schooler can find a tutorial in 90 seconds — can edit the
submission payload to mark every answer as correct. They get a 1600
score range and a "no clear focus area" recommendation. Even setting
aside cheating, this is a real risk: if the front-end has a bug that
mis-evaluates an answer but submits `correct: true`, the false score
persists in our `diagnostic_results` table and then drives the progress
chart and the tutor's deep-dive view.

**What healthy looks like.** The server independently checks each
answer against the canonical correct answer for that question. The
score is computed from server-side ground truth, not from anything
the browser claims.

**How to fix.** In the submit endpoint, look up each `questionId` in
the canonical question source (the hard-coded array today; the
database after CRIT-1 is fixed). Compare the student's selected
answer to the canonical correct answer. Derive the `correct` boolean
server-side. Throw away whatever the browser said.

---

#### CRIT-6. Admin "accept flagged question" doesn't check that the topic assignment is valid

**Evidence.**

- [`src/lib/supabase/queries/quiz/review.ts:69-83`](../src/lib/supabase/queries/quiz/review.ts) — the function that accepts a flagged question doesn't verify that the topic ID actually exists.
- [`src/app/admin/schemas.ts:206-213`](../src/app/admin/schemas.ts) — the validation rules only require "a non-empty string".
- [`src/app/admin/questions/review/QuestionCard.tsx + NodePicker.tsx`](../src/app/admin/questions/review/NodePicker.tsx) — the picker UI shows real topics, but nothing on the server side checks afterward. A direct admin-script call could write garbage.
- [`docs/architecture.md`](./architecture.md) line 175 — "curriculum nodes live in `src/data/curriculum.ts` with string IDs (e.g. 'rw-00')". There's no database link from questions back to a real list of topics.

**The problem.** A question's topic assignment is stored as a plain
text field with no link in the database to a real list of topics. (The
curriculum exists only as a TypeScript file in the app, not as a
database table.) If an admin accidentally saves `nodeId = "rw-99"`
(typo) or `nodeId = ""` (whitespace-only, which the validator might
miss), the question gets saved tied to a topic that doesn't exist. The
next student opening the real `rw-00` topic sees nothing — because the
orphan question has `node_id = "rw-99"`. The orphan never shows up on
any admin topic page either, so it stays lost.

**What healthy looks like.** Either (a) every admin action validates
the topic ID against the canonical list before saving, or (b) the
list of valid topics lives in a database table that's linked to
questions, so the database itself rejects invalid topic IDs.

**How to fix.** Add a small `isValidNodeId(nodeId)` helper in
`taxonomy.ts` and call it from both `acceptFlaggedQuestion` and
`actionAcceptFlaggedQuestion`. Cheap, works. The "topics in a real
table with a link" approach is the better long-term answer but is a
bigger change.

---

#### CRIT-7. Numeric-entry questions are too strict for answers like 1/3 — students can get marked wrong for being more precise than the key

**Evidence.**

- [`src/contexts/QuizContext.tsx:295-316`](../src/contexts/QuizContext.tsx) — the function that grades numeric answers defaults to exact-match: `Math.abs(answer - canonical) <= tolerance + 1e-9`. Tolerance defaults to zero.
- [`question-imports/chatgpt/instructions.txt:30`](../question-imports/chatgpt/instructions.txt) — the import instructions say: "whole-number or finite-decimal answers should leave tolerance blank (exact). Repeating decimals (like 1/3) should use `0.001` tolerance."
- [`bulk-import.ts:242-245`](../src/lib/question-bank/bulk-import.ts) — if the import has a tolerance value, use it; if blank, save null.

**The problem.** If a student types `0.5` and the canonical answer is
`1/2`, both parse to `0.5` and match — good. But if the canonical
answer is `0.333` (a 3-decimal truncation of 1/3) and the student
types `0.3333` (4 decimals), the tolerance is empty → exact match
required → the difference is 0.0003, larger than the floating-point
epsilon → student gets told they're wrong even though they're more
precise. The spec says to use `0.001` for repeating decimals, but the
AI classifiers don't always set this correctly. Whatever the importer
wrote gets used verbatim.

**What healthy looks like.** A sensible minimum tolerance is applied
automatically to any numeric-entry question whose answer has fractional
precision — regardless of what the importer wrote. Or, the importer
always emits an explicit tolerance instead of ever leaving it blank
for decimal answers.

**How to fix.** In the numeric-evaluation function, when the canonical
answer has fractional precision and tolerance is null, apply a sensible
floor (e.g. half of the smallest digit value). Also add a hint on the
numeric-entry input ("answer to within X") so students know how precise
to be.

---

#### CRIT-8. Students can flag a question but never learn what happened to it

**Evidence.**

- The `flagged_questions` table (from migration `20260423002209_lesson_quiz.sql:183-203`) tracks who resolved a flag and when, but has no field for a note or feedback channel back to the student.
- [`src/components/learn/QuizEngine.tsx:209-256`](../src/components/learn/QuizEngine.tsx) — the in-quiz flag UI lets a student leave a note and close. There's no later state shown.
- [`src/lib/supabase/queries/quiz/flags.ts:60-71`](../src/lib/supabase/queries/quiz/flags.ts) — when an admin resolves a flag, the system marks it resolved and records who resolved it. The flagging student is never notified.

**The problem.** A student flags a question saying "the answer is
wrong." An admin marks the flag as resolved. The student never hears
back. Worse: marking the flag resolved doesn't actually change the
question — the question stays in the bank as-is unless the admin
separately edits it. So a student who flags a genuinely broken
question keeps getting that same question on retakes. The student
loop is broken: their effort to help us produces no visible result,
which trains them not to bother next time.

**What healthy looks like.** Resolving a flag triggers one of these:
(a) the question is edited inline and the student gets a notification
("Your flag was reviewed — the explanation has been updated"); (b)
the question is deleted and the student is told; (c) the flag is
marked "resolved — no change needed" with an admin note that's visible
to the student on a profile page.

**How to fix.** Add a `resolution_note` text column to
`flagged_questions`. When an admin resolves a flag, require them to
leave a note. Insert a row in the `notifications` table for the
student. Add a "your flags" view at
`/dashboard/student/account` or similar.

---

### HIGH

A HIGH finding is something that's actively wrong or about to bite us
but isn't yet causing direct harm to students.

---

#### HIGH-1. No record of who edited what, when, or why

**Evidence.**

- [`src/lib/supabase/queries/quiz/questions.ts:221-249`](../src/lib/supabase/queries/quiz/questions.ts) — the `updateQuestion` function writes a "last updated" timestamp and the new content. It doesn't record who did the editing, or what specifically changed.
- [`src/app/admin/actions.ts:94-115`](../src/app/admin/actions.ts) — the wrapper action does check that the caller is an admin, but it doesn't pass the admin's user ID along to the database layer.

**The problem.** Two admins editing the same question at the same time
(unlikely today, but real once we have a content team) collide
silently — whoever saves last wins, with no record that the other one
was overwritten. Post-launch, when a student says "this explanation
used to be right but now it's wrong," we have no way to find out who
changed it or when. And for ML training, "a human edited this question
— here's what they changed and why" is one of the highest-value
supervised signals we could possibly capture. We're throwing it away.

**What healthy looks like.** A `quiz_question_history` table that
records every change with: the editor's user ID, which column was
changed, what the value used to be, what it became, and the timestamp.
Flag-resolution decisions are recorded the same way (admin X accepted
question Y with reason "hand-corrected key"). The audit log later
becomes input to ML.

**How to fix.** Add the table plus a database trigger that
automatically captures changes to `quiz_questions`. Alternatively,
write it at the app level: have `updateQuestion` accept an `actor`
argument and append to history before the actual update. The database
trigger approach is cleaner.

---

#### HIGH-2. The database doesn't reject made-up topic slugs

**Evidence.**

- [`src/lib/question-bank/bulk-import.ts:166-171`](../src/lib/question-bank/bulk-import.ts) — the import checks that the slug is valid using a JavaScript helper.
- [`src/lib/supabase/queries/quiz/questions.ts:152`](../src/lib/supabase/queries/quiz/questions.ts) — the database write doesn't apply any check; whatever value arrives gets saved.
- The database has only an index on `concept_slug`, not a constraint that says "must be one of the canonical 89 values" (from migration `20260514002443:71-73`).
- [`stage2_classify.py:432-436`](../question-imports/stage2_classify.py) — the Python pipeline's normalization helper lowercases and replaces underscores with dashes. Catches some AI mistakes; doesn't catch outright hallucinations.

**The problem.** A row can arrive with a slug that's:

- `"linear-equations"` (the old spec doc's name),
- `"linear_equations_one_variable"` (an AI typo with underscores),
- `"limited-equations"` (an AI hallucination).

The importer rejects the row only if the JavaScript check returns
false. The database will happily store any string. When the in-prompt
slug list drifts from the runtime taxonomy, bulk imports silently
produce orphan rows with bogus slugs that don't auto-route to any
topic. They sit in the bank forever as `skipped_no_slug_match`.

**What healthy looks like.** A database-level constraint on
`concept_slug` matching the canonical list, updated via migration
whenever slugs are added or renamed. Or a small lookup table of valid
slugs that the question table links to.

**How to fix.** Add a database constraint:
`concept_slug IS NULL OR concept_slug IN (...the canonical list)`.
When the curriculum changes, the constraint is updated via a migration
auto-generated from the canonical slug list.

---

#### HIGH-3. The adaptive question selector has no memory of past attempts

**Evidence.**

- [`src/contexts/QuizContext.tsx:324-344`](../src/contexts/QuizContext.tsx) — the `selectNextQuestion` function filters by difficulty and "not used in this quiz", then sorts by display order. Past performance plays no role.
- [`QuizContext.tsx:159-161`](../src/contexts/QuizContext.tsx) — the list of "questions seen so far" is reset to an empty set on every new attempt.
- [`src/lib/supabase/queries/quiz/attempts.ts`](../src/lib/supabase/queries/quiz/attempts.ts) — student responses get written to the database per-answer but never read back during future question selection.

**The problem.** A student retaking the same topic gets question
selection that's unique within that single quiz, but globally
identical to their last attempt. The same question appears at the
same difficulty step. "Adaptive" here means "follows our difficulty
walk-up algorithm", not "personalized to this student's history."
For pedagogical value — and for operationalizing the score guarantee
in roadmap item #9 — repeat-avoidance is foundational. Today it
doesn't exist.

**What healthy looks like.** The selector accepts the student's
recent answer history. Questions recently answered wrong come back
sooner. Questions recently answered right are penalized. Even a
simple version of spaced repetition would help. (A placeholder called
`maybeResetNodeDecay` exists in the code but was never implemented.)

**How to fix.** When starting a quiz, fetch the student's last 90
days of question responses for this topic. Pass them to the selector.
Deprioritize questions the student recently got right. For v1, just
exclude questions the student saw in their last five attempts.

---

#### HIGH-4. The bulk importer requires a domain when topic isn't set, but allows the topic slug to be blank — leaving questions stranded

**Evidence.**

- [`bulk-import.ts:201-208`](../src/lib/question-bank/bulk-import.ts) — the importer throws an error if a row has neither a subject nor a domain. But there's no equivalent rule requiring `concept_slug`.
- A row can therefore land in the bank with `node_id = NULL` (no topic assigned) but also no slug, no domain, no auto-routing target.

**The problem.** A row that arrives with `domain="algebra"` but no
`concept_slug` gets stored in the bank — but with no way for the
auto-router to figure out which topic it belongs to. The bulk-accept
flow skips it ("no slug match"). The admin then has to hand-pick the
right topic from 89 options. Multiply across hundreds of misclassified
rows and it's a lot of manual work.

**What healthy looks like.** Either (a) `concept_slug` is required
for bank rows (so the row can always auto-route), or (b) when domain
is present but slug is missing, the row is queued in a `needs_slug`
state with a quick slug picker in the admin UI.

**How to fix.** In the bulk-importer, when a row has a domain but no
slug, set `import_status = 'needs_review'` and `import_flag_reason =
'Missing concept_slug — pick one'`. The triage queue then captures
these.

---

#### HIGH-5. We don't track question quality at all

**Evidence.**

- The `quiz_questions` table has a `flag_count` (incremented when
  students flag), but no aggregate of correctness rate, average
  response time, or which-distractor-do-students-pick.
- The admin pages don't surface anything like "this question is
  failing 90% of students" or "this question is being answered in 5
  seconds vs the 60-second median for the topic."

**The problem.** A question with a wrong answer key gets flagged a few
times, sits in the queue, never escalates. A question that's trivially
easy (every student picks the same answer, which we wrote as the
"correct" one but is actually being revealed by another mismatch)
never surfaces as broken. Without post-launch quality metrics, the
bank ages poorly. And for ML training, correctness rate is the natural
quality label — but we're not extracting it.

**What healthy looks like.** A computed view or scheduled aggregation
that tracks per-question: total responses, correct rate, median
response time, distribution of which distractor students picked.
Admin question lists show these as columns. The ML pipeline reads
from the same place.

**How to fix.** Migration: create a `quiz_question_stats` view (or a
nightly-refreshed table) that joins `question_responses` and
aggregates. Add columns to `/admin/curriculum/[nodeId]` showing per-
question stats. The data pipeline for ML #16 reads from the same view.

---

#### HIGH-6. Re-uploading the same PDF creates a duplicate import job

**Evidence.**

- [`src/app/api/admin/pdf-upload/route.ts:111-122`](../src/app/api/admin/pdf-upload/route.ts) — for each uploaded PDF, the server creates a new row in `pdf_processing_jobs` with a new unique ID. Nothing checks whether the same filename and size has been uploaded before.

**The problem.** An admin uploads `practice-test-1.pdf` Monday, the
extractor processes it, the CSV gets imported. Wednesday they
accidentally upload the same file. Two jobs now queue. Two CSVs
eventually arrive. Two import runs happen. The duplicate-prevention
on `(source_pdf, content_hash)` saves us — the actual rows don't
double — but the job queue is polluted with orphan jobs that look
"complete" but actually did nothing.

**What healthy looks like.** The upload route checks whether the same
PDF (same uploader + same filename + same file size, within some time
window) has already been queued. If yes, it returns the existing job
ID with a friendly warning instead of creating a duplicate.

**How to fix.** Add a database constraint on `(uploaded_by_user_id,
source_pdf, status != 'failed')` or check at upload time. Returning the
existing job ID is friendlier than throwing an error.

---

#### HIGH-7. The per-topic question count badge shows "X / 100" but no topic actually targets 100

**Evidence.**

- [`src/app/admin/curriculum/page.tsx:201-230`](../src/app/admin/curriculum/page.tsx) — the badge color goes from red (0 questions) to amber (<10) to indigo (10-99) to emerald (≥100). The text reads `{count} / 100`.
- 89 curriculum topics × 100 questions = 8,900 target. Today we
  extract ~100 per PDF, with maybe 10 PDFs in the pipeline. The actual
  production rate is roughly 10× too slow for the displayed target to
  be meaningful.

**The problem.** Cosmetic / planning issue, not a bug — but the
displayed target is wildly unrealistic given current production rate,
and we're not tracking real progress against a real target.

**What healthy looks like.** Each topic stores its own target (e.g.
30 questions for a Troposphere topic, 50 for a Mesosphere topic). The
badge colors against that topic-specific target. A roll-up "X% of the
bank's full target reached" appears at the top of the admin dashboard.

**How to fix.** Add a `target_questions` field to each curriculum
topic. Color-code the badge against that target, not a hardcoded 100.

---

#### HIGH-8. The "Add Question" admin form silently discards per-choice explanations for math questions

**Evidence.**

- [`src/components/admin/question-editor/AddQuestionForm.tsx:107-133`](../src/components/admin/question-editor/AddQuestionForm.tsx) — has the code `const hasPerChoice = subject === "reading" && Object.values(perChoice).some(...);`. Translation: "we only save per-choice explanations if the subject is Reading."
- [`docs/ingestion/spec.md`](./ingestion/spec.md) under "Decisions locked in chat (do not relitigate)": "Math per-choice explanations bug fix: drop the `subject === 'reading'` gate."
- [`bulk-import.ts:221-230`](../src/lib/question-bank/bulk-import.ts) — the bulk import path correctly drops the gate. So PDF imports preserve math per-choice explanations; manual admin entry doesn't.

**The problem.** An admin manually adds a math question and types out
explanations for each wrong answer. On save, the form silently throws
the explanations away. The bulk path works fine; only manual admin
entry has this bug. We're losing exactly the kind of careful trap-
pattern explanations we want admins to write.

**What healthy looks like.** The per-choice explanation section is
available for any multiple-choice question, regardless of subject. Math
distractors get explicit trap-pattern explanations just like the
ingestion routine produces.

**How to fix.** Delete the `subject === "reading"` clause on line 108
of `AddQuestionForm.tsx`. Show the per-choice grid whenever the
question is multiple-choice.

---

#### HIGH-9. Four different import pipelines coexist with no clear deprecation

**Evidence.**

- [`docs/adr/0003-chatgpt-custom-gpt-imports.md`](./adr/0003-chatgpt-custom-gpt-imports.md) — declares the ChatGPT Custom GPT to be the canonical path.
- [`question-imports/{stage1_extract,stage2_classify}.py`](../question-imports/stage2_classify.py) — a fully functional local Python + Gemini pipeline, still maintained.
- [`question-imports/EXTRACT_README.md`](../question-imports/EXTRACT_README.md) — describes the Gemini path as "an alternative path, not a replacement."
- [`question-imports/chatgpt/`](../question-imports/chatgpt/) — the full Custom GPT instructions.
- [`question-imports/ROUTINE_PROMPT.md`](../question-imports/ROUTINE_PROMPT.md) — yet another approach: a Claude-Code-based ingestion routine, with a "hybrid runner" architecture noted in BUGS.md but partially superseded.
- [`src/app/api/admin/pdf-upload/route.ts`](../src/app/api/admin/pdf-upload/route.ts) and the scheduled-import cron — the always-on path for PDF processing jobs.

**The problem.** Four overlapping ways of getting questions into the
bank: the ChatGPT Custom GPT, the local Gemini Python pipeline, the
Claude-Code routine, and the always-on hybrid runner. The taxonomies,
slugs, and field semantics drift between them (CRIT-3 shows the
evidence). Whoever maintains content has to keep all four in sync. ML
question generation would add a fifth.

**What healthy looks like.** One canonical pipeline. The others are
deleted or formally marked deprecated with a sunset date. The taxonomy
and field definitions live in one place that all pipelines reference.

**How to fix.** Pick the canonical pipeline (likely the ChatGPT Custom
GPT per ADR 0003). Move the others to an `archive/` directory. If the
local Gemini path is kept as a fallback, make sure all four files
(`taxonomy.txt`, `instructions.txt`, `KarmanGPT.txt`,
`stage2_classify.py`) reference the same source-of-truth taxonomy file.

---

#### HIGH-10. The bulk importer ignores per-row topic assignment — every row in a batch gets the same topic

**Evidence.**

- [`src/lib/question-bank/bulk-import.ts:149-153`](../src/lib/question-bank/bulk-import.ts) — `bulkImportRows(nodeId, subject, rows)` takes the topic as a function-wide argument and ignores any `node_id` listed in the individual rows.
- [`src/app/admin/actions.ts:238-249`](../src/app/admin/actions.ts) — same on the action layer. The caller passes `nodeId` once; every row in the batch gets that topic or nothing.

**The problem.** A CSV that deliberately mixes topic assignments — say
the source PDF covers multiple topics, which is common — can't be
imported in one shot. The caller has to either split rows by topic
first, or import everything to the bank and route from there. Not
exactly a bug, but a workflow ergonomic issue and an undocumented
limitation.

**What healthy looks like.** If the row specifies its own topic (or
its slug auto-maps to a topic), that wins. The caller's `nodeId`
argument is just a default for rows that don't specify one.

**How to fix.** In the bulk importer, compute the effective topic as:
"the row's `node_id` if it has one; otherwise the slug's mapped node;
otherwise the caller's default `nodeId`."

---

#### HIGH-11. CSV header says `question_format`, database column says `answer_format` — silent renaming

**Evidence.**

- [`src/lib/question-bank/csv-parser.ts:39`](../src/lib/question-bank/csv-parser.ts) — the CSV column is named `question_format`.
- [`migration 20260514002428_difficulty_numeric.sql:13`](../supabase/migrations/20260514002428_difficulty_numeric.sql) — the database column is named `answer_format`.
- [`bulk-import.ts:268`](../src/lib/question-bank/bulk-import.ts) — the importer maps one to the other on insert.
- [`docs/ingestion/spec.md:140`](./ingestion/spec.md) — calls the column `question_format`.

**The problem.** A confusing rename with no docs explaining why. If
someone searches the codebase for "question_format" expecting to find
the database column, they won't. The runtime type `QuizAnswerFormat`
also exists alongside the `question_format` enum — three names for one
concept.

**What healthy looks like.** One name everywhere. Pick `answer_format`
(matches the database) and rename the CSV header and spec docs to
match.

**How to fix.** Add `answer_format` to the canonical CSV header list,
keep `question_format` as a backward-compatible alias in the parser.
Update all docs.

---

#### HIGH-12. The diagnostic uses a 1-3 difficulty scale while the rest of the bank uses 1-7

**Evidence.**

- [`src/data/diagnostic-questions.ts:51`](../src/data/diagnostic-questions.ts) — the diagnostic's difficulty type is `1 | 2 | 3`.
- [`src/lib/diagnostic-scoring.ts:33-37`](../src/lib/diagnostic-scoring.ts) — the scoring algorithm assumes 1-3.
- [`src/types/quiz.ts:10`](../src/types/quiz.ts) — the bank's quiz difficulty type is `1 | 2 | 3 | 4 | 5 | 6 | 7`.
- The confidence-band scoring uses cutoffs at 40/65/80, while the diagnostic weights questions by 1/2/3. So a "level 3" diagnostic question is treated like a "level 3" learn-quiz question, but the diagnostic has no levels 4 through 7.

**The problem.** The diagnostic's difficulty scale is incompatible
with the rest of the bank. Once the diagnostic migrates to the
`quiz_questions` table (CRIT-1), the two scales won't align without
explicit mapping. The diagnostic-scoring algorithm is hardcoded to
the 3-level scale.

**What healthy looks like.** The diagnostic uses the 1-7 scale used
elsewhere. The scoring algorithm is updated to handle the wider range.

**How to fix.** Migrate the 35 diagnostic questions to difficulty
levels 2/4/6 (mapping 1/2/3 → easy/medium/hard at the right positions
on the 1-7 scale). Update `scoreDiagnostic` to handle the wider
range.

---

#### HIGH-13. The summary of each quiz attempt stores adaptive-path data as a JSON blob — making it hard to query for ML

**Evidence.**

- [`migration 20260423002209_lesson_quiz.sql:131-145`](../supabase/migrations/20260423002209_lesson_quiz.sql) — `quiz_attempts` has columns including `score`, `questions_answered`, `questions_correct`, `confidence_band`, and `adaptive_path JSONB`.
- The `adaptive_path` is a list of `[{question_id, difficulty, was_correct}]` — the per-step record of the attempt. But it lives as a JSON blob inside one column, not as separate rows.

**The problem.** The natural ML labels (which questions are hard for
struggling students, which are easy, which serve as bridges between
confidence levels) live trapped inside a JSON blob. Extracting them
requires expensive scans that can't use database indexes. Building a
labeled dataset for ML #16 means writing custom export scripts every
time.

**What healthy looks like.** The per-step data is already in
`question_responses` (which IS a proper table with proper indexes).
The `adaptive_path` blob is redundant. Drop it, or treat it purely as
a UI convenience.

**How to fix.** Update code that reads `adaptive_path` to derive the
same data from `question_responses` when needed. Mark `adaptive_path`
deprecated. Stop writing to it once everyone's migrated.

---

#### HIGH-14. The "live question" count uses a fragile filter that breaks if new statuses are added

**Evidence.**

- [`src/app/admin/curriculum/page.tsx:26-37`](../src/app/admin/curriculum/page.tsx) — the count uses `import_status.is.null,import_status.eq.ok`. Null is treated as OK.

**The problem.** This is consistent with the rest of the live-question
filter (good), but it's fragile. Today, legacy rows have `import_status
= NULL` and PDF-imported rows have `'ok'` explicit. If we later add a
new status like `'rejected'` or `'archived'`, every "is it live?" filter
in the codebase has to be updated to exclude the new status — easy to
miss.

**What healthy looks like.** A single `is_live` field computed by the
database from the underlying status, so every consumer just checks the
one field.

**How to fix.** Add a generated column to `quiz_questions`:
`is_live BOOLEAN GENERATED ALWAYS AS (import_status IS NULL OR import_status = 'ok') STORED`.
Index it. All student-facing queries filter on `is_live = true`. No
more parallel filter chains to keep in sync.

---

### MEDIUM

A MEDIUM finding is something that should be fixed but isn't blocking
launch or burning students today.

---

#### MED-1. Old, abandoned database tables still hang around

**Evidence.**

- [`migration 20230101000000_initial_schema.sql:55-105`](../supabase/migrations/20230101000000_initial_schema.sql) — creates the original `concepts`, `questions`, and `progress` tables with 15 seeded rows.
- The `domain` rule on the legacy `concepts` table allows `reading_writing` — a value not in the new 8-domain taxonomy.
- [`src/types/supabase.ts:1517+1618`](../src/types/supabase.ts) — TypeScript types are still being generated for these dead tables.
- No code references either table (verified by search).

**The problem.** Dead structure clogging up the database. A new
contributor has to mentally distinguish the dead `concepts` from the
live `learn_node_status`, dead `questions` from the live
`quiz_questions`. The leftover rules encode an outdated taxonomy.

**What healthy looks like.** A migration drops the dead tables. Types
regenerate without them.

**How to fix.** Migration: `DROP TABLE IF EXISTS public.progress,
public.questions, public.concepts CASCADE;`. Regenerate the types.

---

#### MED-2. Quiz attempt numbering can produce duplicate "attempt 4"s

**Evidence.**

- [`src/lib/supabase/queries/quiz/attempts.ts:16-36`](../src/lib/supabase/queries/quiz/attempts.ts) — to start a new attempt, the code counts the student's existing attempts and then inserts a new one with `attempt_number = count + 1`.

**The problem.** Two parallel start-quiz calls (e.g. a student double-
clicks the start button under flaky network) can both read `count = 3`
at the same time and both insert `attempt_number = 4`. Now there are
two rows claiming to be "attempt 4". Cosmetic for the student; messy
for tutor and admin analytics that group by attempt number.

**What healthy looks like.** A database rule that prevents duplicate
`(student_id, topic, attempt_number)` combinations, plus retry logic
in the code. Or compute the attempt number on read instead of storing
it.

**How to fix.** Add the database constraint. Catch the duplicate-key
error in `createQuizAttempt` and retry once with a fresh count.

---

#### MED-3. Question ordering within a topic isn't stable

**Evidence.**

- [`migration 20260423002209_lesson_quiz.sql:95`](../supabase/migrations/20260423002209_lesson_quiz.sql) — the `display_order` column defaults to 0, with no uniqueness rule.
- [`src/lib/supabase/queries/quiz/questions.ts:252-258`](../src/lib/supabase/queries/quiz/questions.ts) — the reorder function rewrites all orders in one pass.

**The problem.** Default of 0 means every bulk-imported question with
no order specified claims position 0. When the UI sorts by display
order and many rows tie at 0, the tiebreaker is non-deterministic —
the order can flip between page loads.

**What healthy looks like.** Either `display_order` is unique per
topic, or there's a stable tiebreaker (like creation timestamp).

**How to fix.** In the question-fetching query, add a secondary sort
on `created_at` after `display_order`. In the bulk-import path, set
each row's `display_order` to its position in the batch.

---

#### MED-4. The bulk importer doesn't recognize duplicates within a single batch

**Evidence.**

- [`bulk-import.ts:163-310`](../src/lib/question-bank/bulk-import.ts) — the loop processes one row at a time, checking the database for duplicates. Two identical rows in the same batch are not compared against each other.

**The problem.** A CSV with two identical rows (typo, copy-paste
mistake) inserts the first. The second runs an insert which checks
the database, finds the just-inserted first row, and silently skips
it. Net result: 1 row inserted, 1 "duplicate". The end state is
correct, but we did an extra database round-trip that wasn't needed.

**What healthy looks like.** A first pass deduplicates `rows` by
fingerprint in memory before any database calls.

**How to fix.** Add a `seenInBatch = new Set<string>()` at the top of
the bulk import. Before each row, if its fingerprint is already in the
set, mark as duplicate and skip the database call.

---

#### MED-5. CSV image uploads have no per-file size cap

**Evidence.**

- [`bulk-import.ts:97-129`](../src/lib/question-bank/bulk-import.ts) — the `materializeImage` function accepts any image embedded in the CSV, decodes it, uploads it. No size check.
- The scheduled-import endpoint is protected by a secret. If that secret leaks, an attacker can post CSVs containing arbitrarily large images.
- [`src/app/api/admin/pdf-upload/route.ts:27`](../src/app/api/admin/pdf-upload/route.ts) — the regular PDF upload route DOES have a 50MB cap (good).

**The problem.** A 100MB image inside a CSV row gets fully decoded and
uploaded to our image storage with no size gate. The scheduled-import
runs without a human present, so no one notices. Storage bills grow
silently.

**What healthy looks like.** A per-image size cap (e.g. 2MB raw). A
per-CSV total cap. Rows that exceed either limit are rejected and
flagged.

**How to fix.** In `materializeImage`, after decoding the image
data, check the byte length. Throw on overflow; the surrounding catch
records it as an error.

---

#### MED-6. The duplicate-image fingerprint uses only 16 hex characters (64 bits)

**Evidence.**

- [`bulk-import.ts:115-122`](../src/lib/question-bank/bulk-import.ts) — `const sha = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);`. Translation: take the first 16 hex characters of the image's full signature.

**The problem.** 64 bits of fingerprint is collision-resistant at
modest scale (billions) but unnecessary. The full signature is 32
bytes — fine for an image storage key. If two different images happen
to collide on the first 16 hex characters, the second silently
overwrites the first.

**What healthy looks like.** Use the full signature. Or use a
content-addressable scheme like `question-images/sha256/<full-hash>.png`.

**How to fix.** Change `slice(0, 16)` to `slice(0, 32)`. Cheap fix.

---

#### MED-7. The diagnostic has no support for numeric-entry questions

**Evidence.**

- [`src/data/diagnostic-questions.ts:67`](../src/data/diagnostic-questions.ts) — the diagnostic's answer type is `"A" | "B" | "C" | "D"` only.
- The bank's database schema supports numeric entry. The diagnostic schema does not.

**The problem.** The real SAT math section includes "student-produced
response" questions where the student types a number. Our diagnostic's
20 math questions are 100% multiple-choice, which doesn't match the
real test. A student who's strong at multiple-choice but shaky at
numeric entry gets a misleadingly high math score.

**What healthy looks like.** The diagnostic mirrors the real SAT mix
(~25% numeric-entry for math sections).

**How to fix.** Add `answer_format` to the diagnostic question type.
Support both modes in the diagnostic client. (Probably becomes
naturally easy once CRIT-1 is fixed and diagnostic questions live in
the `quiz_questions` table.)

---

#### MED-8. The "is flagged" indicator conflicts with the "import status" indicator

**Evidence.**

- [`migration 20260423002209:255-278`](../supabase/migrations/20260423002209_lesson_quiz.sql) — the database automatically updates `is_flagged` and `flag_count` whenever a student flags or unflags a question.

**The problem.** A student flags a question that's already in
`needs_review` status. The auto-trigger now sets `is_flagged = true`.
The question is carrying two flag signals (`is_flagged` and
`import_status`) but they mean different things — one is "student
flagged it during a quiz", the other is "the import pipeline thought
something looked off". The bulk-import path doesn't reset
`is_flagged`. Inconsistent state — a question can be both "OK in the
review queue" and "carrying an unresolved student flag" with no clear
admin path to resolve.

**What healthy looks like.** Either `is_flagged` is computed from
`flag_count > 0` (and we accept that flagged questions can also be
"OK"), or the two signals are renamed so their distinction is obvious
(`has_student_flags` vs `is_in_review`).

**How to fix.** Rename `is_flagged` to `has_student_flags`. Change the
trigger to only flip true on insert. Require admin to explicitly
resolve. Add a separate `is_in_review` field derived from
`import_status = 'needs_review'`.

---

#### MED-9. Auto-flagged image questions are tedious to review because the image isn't visible without expanding the card

**Evidence.**

- [`bulk-import.ts:172-196`](../src/lib/question-bank/bulk-import.ts) — every row with an image is auto-flagged with the reason "Image attached — verify the figure was extracted correctly".
- [`src/app/admin/questions/review/QuestionCard.tsx:197-206`](../src/app/admin/questions/review/QuestionCard.tsx) — the image is shown only when the card is expanded. The collapsed view doesn't preview it.

**The problem.** Admin loads the review queue with 50 image-flagged
rows. To verify each image, they have to expand each card one at a
time. With ChatGPT producing whole-page-fallback images for math (per
the import instructions), most image-flagged rows are actually fine —
the image just looks weird because it's the entire PDF page. Admin
clicks Accept 50 times without learning much.

**What healthy looks like.** A thumbnail is visible in the collapsed
card header. Click-to-expand for the full view. If the image is a
whole-page render, a separate badge says "whole-page fallback" so
admin can fast-accept those.

**How to fix.** In the question card component, render a small image
thumbnail next to the meta row when the card is collapsed. Cheap
visual fix.

---

#### MED-10. Half-failed imports have no easy retry path

**Evidence.**

- [`src/components/admin/BulkImportPanel.tsx:122-130`](../src/components/admin/BulkImportPanel.tsx) — the bulk-import submits the parsed rows; the result shows errors row-by-row but doesn't offer a "retry just those" button.

**The problem.** An import where 48 of 50 rows succeed and 2 fail
leaves the admin with no easy way to fix just the 2 and re-import
them. They have to manually edit the CSV and re-upload everything.

**What healthy looks like.** The result banner offers a "download
errored rows as CSV" link, or a "retry failed rows" button.

**How to fix.** In the import-result banner component, add a button
that compiles the errored rows back into CSV format and offers
download.

---

#### MED-11. "Accept all bank questions" fires unbounded simultaneous database calls

**Evidence.**

- [`src/app/admin/actions.ts:322-340`](../src/app/admin/actions.ts) — uses `Promise.all` over a potentially large array. No concurrency limit.

**The problem.** With 500 questions in the bank to accept, this fires
500 simultaneous database update calls at once. The database's
connection pool defaults aren't tuned for this. Under load, some calls
get queued or time out. The comment in the code claims "this collapses
wall-clock time" — actually, hitting one database backend with 500
parallel updates serializes anyway, with overhead.

**What healthy looks like.** Bounded concurrency (8-16 at a time). Or
batch into one update statement.

**How to fix.** Replace `Promise.all` with a concurrency-limited
batch. Or use a single update with an `id IN (...)` clause.

---

#### MED-12. Rejected questions are permanently deleted — losing useful negative examples

**Evidence.**

- [`src/lib/supabase/queries/quiz/questions.ts:260-280`](../src/lib/supabase/queries/quiz/questions.ts) — `deleteQuestion` and `deleteQuestions` actually delete rows.
- [`src/app/admin/actions.ts:264-269`](../src/app/admin/actions.ts) — rejecting a flagged question deletes it.

**The problem.** A rejected question is gone forever. If admin
mistakenly rejects, no recovery. For ML training, "rejected" questions
are exactly the negative examples we'd want (here's what bad looks
like). Throwing them away discards the cheapest source of training
labels.

**What healthy looks like.** Soft delete: a `deleted_at` timestamp
marks the row as gone, but the row still exists. Rejected questions
become "soft-deleted with a reason." The ML pipeline can later read
soft-deleted rows as negative examples.

**How to fix.** Add a `deleted_at` column. Change the actual-delete
calls to set `deleted_at = now()`. Update the live-question filter to
also exclude soft-deleted rows.

---

#### MED-13. The "subject" column is redundant with the "domain" column

**Evidence.**

- The `quiz_subject` enum has values `reading` and `math`, both of which can be derived from `domain` (math has 4 domains; Reading & Writing has 4 different domains).
- [`bulk-import.ts:85-89`](../src/lib/question-bank/bulk-import.ts) — there's a helper that derives subject from domain. The database stores both anyway.

**The problem.** Two columns encoding the same fact, kept in sync by
app code only. A future row with `subject = 'math'` and `domain =
'conventions'` (a Reading & Writing domain) would be self-
contradictory, but the database would happily store it.

**What healthy looks like.** Drop `subject` and derive at read time.
Or add a database rule enforcing the relationship.

**How to fix.** Add a database constraint:
`(subject = 'math' AND domain IN ('algebra', 'advanced_math', 'geometry', 'data_analysis')) OR (subject = 'reading' AND domain IN ('info_ideas', 'craft_structure', 'expression_ideas', 'conventions'))`.

---

#### MED-14. Topic-cluster fallback can produce a blank cluster label

**Evidence.**

- [`migration 20260423002209:93`](../supabase/migrations/20260423002209_lesson_quiz.sql) — `topic_cluster` is required (not nullable).
- [`bulk-import.ts:215-219`](../src/lib/question-bank/bulk-import.ts) — the fallback chain is "use the slug's cluster, then the row's cluster, then the domain's default cluster, then an empty string." Empty string passes the "not nullable" rule.

**The problem.** A row that hits the final fallback gets
`topic_cluster = ""`. The admin curriculum browser groups by cluster.
An empty-string cluster renders as a blank section header.

**What healthy looks like.** Throw on empty cluster, or set to
"Unknown" as a visible signal.

**How to fix.** After the fallback chain, if the cluster is still
empty, throw an explicit error: "missing topic_cluster — cannot derive
from slug or domain".

---

#### MED-15. The import routine prompt can drift from the curriculum

**Evidence.**

- [`question-imports/ROUTINE_PROMPT.md`](../question-imports/ROUTINE_PROMPT.md) — references "8 domains + 89 concept slugs" (correct), but pulls from `KarmanGPT.txt` which has its own copy of the 89 slugs.
- The doc claims "verified against the implemented importer" but the slug list is maintained by hand.

**The problem.** When the curriculum changes, five files need editing
in sync:

1. `src/data/curriculum/{math,reading-writing}.ts`
2. `src/lib/question-bank/taxonomy.ts` (this one auto-derives — good)
3. `question-imports/chatgpt/taxonomy.txt`
4. `question-imports/chatgpt/KarmanGPT.txt`
5. `question-imports/stage2_classify.py` (embedded system spec)
6. (Plus the two ingestion docs)

**What healthy looks like.** A single source. A build step
regenerates the downstream taxonomy files from the curriculum.

**How to fix.** Add a `scripts/sync-taxonomy.mjs` that reads the
curriculum and emits `taxonomy.txt`, the relevant parts of
`KarmanGPT.txt`, and a Python taxonomy module that the Python pipeline
imports.

---

#### MED-16. Tutors have no view of question-by-question student performance

**Evidence.**

- The tutor portal at `/tutor/students/[id]/...` has no question-level deep dive.
- Tutors can see aggregate scores, but not "Maria got these 5 specific questions wrong this week."

**The problem.** Tutors are the highest-signal humans in the loop —
they're the natural source of feedback on question quality. They have
no surface to provide that feedback. ML question generation (#16)
explicitly depends on tutor feedback as a training signal; today
there's nowhere for it to live.

**What healthy looks like.** A tutor view shows recent question
responses for their students plus a thumbs-up/thumbs-down rating on
each question. Stored in a new `tutor_question_feedback` table.

**How to fix.** Defer for now (out of scope for content production
phase), but track as a dependency for ML #16. The data model is small
— just a row per (tutor, question, rating, note).

---

#### MED-17. We don't track how many times each question has been served

**Evidence.**

- `quiz_questions` has `flag_count` but no `served_count` or `last_served_at`.
- Per-question serving metrics require aggregating across `question_responses` — there's no precomputed column.

**The problem.** Without a served-count, the bank can't be
intelligently rotated. New questions never get prioritized over
over-served old ones. Question retirement (e.g. "this question has
been served 1000 times; refresh it") has no signal.

**What healthy looks like.** A `served_count` column maintained by
the write path that inserts each question response. Or a nightly
aggregation.

**How to fix.** Trigger on `question_responses` insert: increment
`quiz_questions.served_count`. Or include it in the stats view
referenced in HIGH-5.

---

#### MED-18. Diagnostic "weak topics" aren't validated against the canonical topic list

**Evidence.**

- [`migration 20260514002440_diagnostic_text_concepts.sql:36-37`](../supabase/migrations/20260514002440_diagnostic_text_concepts.sql) — converts the column to a text array.
- [`src/lib/diagnostic-scoring.ts:246`](../src/lib/diagnostic-scoring.ts) — `weakConcepts` is extracted from the `conceptId` of each missed answer. No validation against the canonical slug list.

**The problem.** A diagnostic question with a valid `conceptId` writes
a valid slug. A diagnostic question with a malformed `conceptId`
(maybe legacy data from before a fix) writes garbage. Anyone reading
`weak_concepts` and trying to map it to a real topic gets nothing —
the lookup returns undefined.

**What healthy looks like.** At submit time, validate the diagnostic
concept IDs against the canonical slug list; drop unknowns with a
warning.

**How to fix.** In the diagnostic submit route, filter `weakConcepts`
to known slugs before insert. Log any unknowns.

---

### LOW

A LOW finding is something that's a stale comment, a minor UX paper
cut, or a tiny inconsistency. None of these affect students or business
operations today.

---

#### LOW-1. Bulk-imported rows all get position 0

**Evidence.** [`bulk-import.ts:262-263`](../src/lib/question-bank/bulk-import.ts) — `display_order` isn't set, so it falls to the database default of 0.

**The problem.** All bulk-imported questions share `display_order =
0`. Already covered by MED-3 (unstable ordering); this is the specific
bulk-import contribution.

**How to fix.** In the loop, set `display_order = i` (the row's
position in the batch).

---

#### LOW-2. Some legacy rows use long-form topic-cluster labels like "Algebra — Linear Equations"

**Evidence.** [`schemas.test.ts:49`](../src/app/admin/schemas.test.ts) — a test uses `topic_cluster: "Algebra — Linear Equations"`.

**The problem.** Legacy rows have free-form cluster strings; new rows
use the canonical 8 values. Filtering by cluster ("show me all Algebra
questions") returns inconsistent results.

**How to fix.** A one-time migration that re-derives `topic_cluster`
from `domain` for all existing rows.

---

#### LOW-3. The quiz-results screen auto-closes after 2 minutes of inactivity

**Evidence.** [`QuizEngine.tsx:87-93`](../src/components/learn/QuizEngine.tsx) — a 120-second timeout.

**The problem.** Minor UX. A student finishes a quiz, looks at the
results, gets a call, comes back 3 minutes later — the screen is empty.
The celebration moment dies.

**How to fix.** Lengthen the timeout, remove it, or only auto-close
when the route changes.

---

#### LOW-4. The adaptive selector re-scans the question pool on every pick

**Evidence.** [`QuizContext.tsx:324-344`](../src/contexts/QuizContext.tsx) — `selectNextQuestion` filters and sorts the pool on every call.

**The problem.** Each pool is small (~30 questions per topic), so it's
not a real performance issue. Mentioned for the future when per-topic
pools grow.

**How to fix.** Pre-sort the questions once at load. Selection becomes
a linear scan to find the next unused one.

---

#### LOW-5. A comment says the CSV has 32 columns; the spec doc says 30

**Evidence.** [`BulkImportPanel.tsx:31-32`](../src/components/admin/BulkImportPanel.tsx) — comment says "32 columns in exact spec §2 order". The header list actually contains 32 entries (30 from the spec + image_url + image_alt) but the spec doc says 30.

**The problem.** Minor documentation / comment drift.

**How to fix.** Update the spec doc to mention the two image columns,
or update the comment to "30 from spec + 2 image columns."

---

#### LOW-6. The dead legacy table's domain rule allows `reading_writing` — a value not in the modern taxonomy

**Evidence.** [`migration 20230101000000:58`](../supabase/migrations/20230101000000_initial_schema.sql).

**The problem.** Dead data, but the rule on the dead table codifies a
deprecated taxonomy. Confusing to anyone querying the schema fresh.
Covered by MED-1 (drop the table).

---

#### LOW-7. A test file uses stale slug names

**Evidence.** [`classify-bank-accept.test.ts:28-29`](../src/lib/question-bank/classify-bank-accept.test.ts) — uses `"linear-equations"`, `"quadratics"`.

**The problem.** Tests pass because the resolver is mocked. A real
regression in the slug-to-topic mapping wouldn't be caught.

**How to fix.** Replace the test fixtures with real curriculum slugs.

---

## 4. Cross-cutting themes

Patterns that show up across multiple findings:

### 4.1 The taxonomy isn't a single source of truth — docs, code, and pipelines drift

- The topic-slug list says 72 in the spec doc, 89 in the code, and
  yet another set in the tests. (CRIT-3, HIGH-9, MED-15, LOW-7)
- The difficulty scale is 1-7 in the bank and 1-3 in the diagnostic.
  (HIGH-12)
- The CSV column is `question_format`; the database column is
  `answer_format`. (HIGH-11)
- A comment says 32 columns; the spec doc says 30. (LOW-5)

**Root cause.** No build step regenerates docs from code, or
validates code against docs. Everything is maintained by hand.

**Suggested remediation.** A `scripts/sync-taxonomy.mjs` that reads
the curriculum and writes the slug section of every downstream doc
plus the Python pipeline files. Run in CI to fail PRs that diverge.

### 4.2 No audit trail on question data anywhere

- No record of who edited a question. (HIGH-1)
- No record of who accepted a flagged question, or with what reason.
  (CRIT-8, HIGH-1)
- The `flag_count` increments but the resolution decision isn't
  captured as a structured signal. (MED-8)
- Tutor feedback infrastructure absent. (MED-16)
- Soft-delete absent — rejected questions are deleted, including
  their metadata. (MED-12)

**Root cause.** Pre-launch optimization for simplicity. No real
volume yet to justify history tables.

**Suggested remediation.** Before scaling content, add a
`quiz_question_history` table that records row-by-row changes. This
also becomes the foundation for ML supervised signals.

### 4.3 Happy-path inputs assumed throughout

- `acceptFlaggedQuestion` doesn't validate the topic ID. (CRIT-6)
- The diagnostic submit endpoint trusts the browser's `correct`. (CRIT-5)
- Bulk import doesn't dedupe within a batch. (MED-4)
- Image uploads have no size cap. (MED-5)
- Topic slugs aren't database-validated. (HIGH-2)
- Topic IDs aren't database-validated. (CRIT-6)
- PDF upload has no idempotency. (HIGH-6)

**Root cause.** Admin paths assume admins act correctly. They don't
defend against buggy clients, scripts, or future automation.

**Suggested remediation.** Add database constraints for taxonomy and
topic IDs. Add input deduplication and size caps on bulk paths.

### 4.4 No metrics on the bank itself

- No per-question correctness rate. (HIGH-5)
- No per-question median response time. (HIGH-5)
- No served-count. (MED-17)
- No edit history for diff metrics. (HIGH-1)

**Root cause.** The bank is being treated as static content, not as
a live system with quality drift over time.

**Suggested remediation.** A `quiz_question_stats` view refreshed
nightly. Admin lists surface the metrics. ML #16 reads from the same
place.

### 4.5 Four competing import pipelines without deprecation

- ChatGPT Custom GPT (declared canonical by ADR 0003).
- Local Python + Gemini pipeline.
- Claude Code routine.
- Hybrid runner.

**Root cause.** Iterative experimentation that didn't formally
deprecate the prior path each time.

**Suggested remediation.** Pick one. Move the rest to `archive/`.
Update ADR 0003 to reflect current truth + deprecation status of
the others.

### 4.6 The diagnostic is a separate system from the bank

- Hand-coded array instead of database rows. (CRIT-1)
- Different difficulty scale. (HIGH-12)
- Trusts the browser for grading. (CRIT-5)
- No numeric-entry support. (MED-7)

**Root cause.** The diagnostic was built before the bank existed.
It was never migrated.

**Suggested remediation.** Treat the diagnostic migration as a
prerequisite for ML #16, since ML should be able to generate
diagnostic items too.

---

## 5. Recommended fix order

Given the plan to ramp up content production AND start ML question
generation, here are the priority groups.

### Fix BEFORE ingesting more content (P0)

These problems get worse as content volume grows:

1. **CRIT-4** — make the duplicate-question fingerprint include
   passages. Every PDF imported today potentially silently dedupes
   cross-text questions. Fixing later means an audit + delete pass.
2. **CRIT-3** + **MED-15** — unify the topic taxonomy across docs,
   code, and tests. Cheap. Fixes lurking confusion.
3. **HIGH-2** — database constraint on topic slugs. Stops bad slugs
   from landing.
4. **CRIT-6** — validate the topic assignment in `acceptFlaggedQuestion`.
   Stops admin clicks from producing orphan questions.
5. **HIGH-8** — drop the `subject === "reading"` gate in the manual
   admin add-question form. One line of code.
6. **MED-5** — per-image size cap. Cheap insurance.
7. **CRIT-2** — enforce the "live questions only" rule at the
   database level. The structural protection we want before content
   scales.

### Fix BEFORE ML question generation (P1)

These either block the ML work or make it materially harder:

8. **CRIT-1** — migrate the diagnostic into the bank. ML can't
   generate diagnostic items if the diagnostic isn't in the bank.
9. **HIGH-1** — add a question-history table. Provides the
   supervised labels ML wants (edits = corrections; what was the
   diff?).
10. **HIGH-5** — add per-question stats. ML needs response-time and
    correctness as labels.
11. **MED-12** — soft delete. Rejected questions are negative
    training examples; throwing them away is wasteful.
12. **MED-16** — tutor feedback table + UI. The signal ML #16 is
    explicitly designed to use.
13. **CRIT-8** — close the loop on student flags. The cheapest
    in-product feedback channel.

### Fix when convenient (P2)

14. CRIT-5 (server-side diagnostic re-grade) — gets fixed naturally
    by CRIT-1.
15. CRIT-7 (numeric tolerance default).
16. HIGH-3 (repeat-avoidance) — only matters at retake volume.
17. MED-1 (drop legacy tables).
18. MED-3 (display_order tiebreaker).
19. MED-2 (attempt-number race).
20. MED-9 (image thumbnails in review UI).
21. MED-10 (retry-failed-rows).
22. MED-11 (bounded concurrency in accept-all-bank).
23. MED-13 (subject ↔ domain rule).
24. MED-14 (topic_cluster fallback should throw).
25. MED-17 (served-count).
26. MED-18 (validate weak topics at submit).
27. HIGH-4 (slug required for bank rows with domain).
28. HIGH-6 (PDF upload idempotency).
29. HIGH-7 (per-topic target).
30. HIGH-10 (row-level topic in bulk import).
31. HIGH-11 (rename `question_format` → `answer_format` in CSV).
32. HIGH-13 (drop the `adaptive_path` JSON-blob redundancy).
33. HIGH-14 (add an `is_live` generated column).

### Fix at leisure (P3 — the LOW set)

All LOW items, plus HIGH-9 (pipeline consolidation, which is more a
documentation and strategic decision than a bug).

---

## 6. ML-readiness assessment

Given roadmap items #6 (videos + textbook per topic) and #16 (ML
question generation), how ready is the bank?

### What's already in good shape

- **Locked taxonomy.** 8 domains × 8 clusters × 89 topics, machine-
  readable from `taxonomy.ts`. ML prompts can reference this directly.
- **Per-row metadata.** Each question carries domain, topic, difficulty
  (1-7), answer-source, import-status, source PDF, source page. Enough
  to construct filtered training sets.
- **Math is formatted in KaTeX consistently.** Both the extraction
  prompts and the rendering layer expect `$...$` / `$$...$$`. LLM
  fine-tuning on math needs this; we have it.
- **Hint and per-choice explanation fields.** The data carries
  pedagogical depth — not just answer/distractor but "why this
  distractor traps students." Higher-quality training data than the
  median SAT prep dataset.
- **`answer_source` enum.** Distinguishes `extracted` (answer key was
  printed in the source) from `inferred` (the AI guessed). This IS
  the supervised signal for "trust this row" vs "don't train on it."
- **The `question_responses` table.** Per-student per-question outcome
  data exists. Even before stats aggregation, raw response data is
  queryable for label construction.

### What's missing or broken for ML

- **No per-question stats.** (HIGH-5) Need correct-rate, median
  response time, distractor-pick distribution, served-count. Without
  these, you can't filter to "questions that perform well" vs
  "questions that are too easy."
- **No edit history.** (HIGH-1) The natural training signal is "a
  human edited this question — what did they change?" That signal
  doesn't exist.
- **No tutor feedback.** (MED-16) The richest expert signal (tutor
  thumbs-up / thumbs-down) has no place to live.
- **Soft delete missing.** (MED-12) Rejected = deleted. The
  most-valuable negative examples are gone.
- **Diagnostic is disconnected.** (CRIT-1) ML can't generate
  diagnostic items because they aren't in the same table as practice
  items. Different difficulty scale (1-3 vs 1-7) and different
  format constraint (multiple-choice-only vs multiple-choice +
  numeric).
- **Duplicate-question fingerprint misses passages.** (CRIT-4)
  Training-set deduplication is broken: two questions with different
  passages but same stem dedupe in the bank, and if you train on the
  bank, you inherit the broken dedup.
- **Loose taxonomy validation.** (HIGH-2) Some rows have bad slugs
  that ML training would interpret as a new category — silently
  polluting the topic-conditioned distribution.
- **No `is_diagnostic` flag.** Even after CRIT-1, the diagnostic vs.
  practice distinction needs a column. Today there's no schema for
  it.
- **No "question family" concept.** An SAT question and its variants
  (same skill, different specifics) have no grouping. ML #16
  explicitly wants to generate variants of approved questions; the
  database can't express the parent-child relationship.

### What ML #16 needs that doesn't exist anywhere

1. A `question_lineage` table or column linking a generated question
   to its source/parent.
2. A `quality_score` (0-1 or 1-5) on each question, derived from
   tutor feedback + student performance + admin acceptance state.
3. A `generation_metadata` JSON field capturing the prompt, model,
   cost, and parent IDs for AI-generated rows.
4. Per-topic "training set" exports (e.g. "give me the 50 best-rated
   approved questions for `linear-equations-one-variable`") — a
   simple admin tool would suffice.

### Bottom line on ML readiness

**Not yet ready, but the gap is small and well-defined.** The
foundations (taxonomy, per-row metadata, response data) are in
place. The four missing pieces (history, stats, tutor feedback,
soft-delete + lineage) are individually shippable in 1-3 days each.
CRIT-1 (diagnostic migration) is the biggest single piece of work;
the rest are additive.

Suggested order before starting ML #16 work:

1. Migrate the diagnostic into the bank (CRIT-1).
2. Ship the per-question stats view (HIGH-5).
3. Ship the audit history (HIGH-1).
4. Ship soft delete (MED-12).
5. Ship tutor feedback infrastructure (MED-16).

After those, anything we build for #16 sits on a strong substrate.
Without them, ML work has to either (a) carry its own history within
its subsystem or (b) get retrofitted later — both more expensive
than ordering the work correctly.

---

## 7. Out-of-scope notes

What this audit did NOT verify (you may want to confirm before fixes):

1. **Live database statistics.** How many `quiz_questions` rows exist
   today? How many have `concept_slug = NULL`? How many have orphan
   `node_id` values not in the curriculum? How many have
   `import_status = NULL` (legacy from before the import-status
   column existed) vs explicit `'ok'`? Querying production directly
   would answer these in minutes; the answers are needed to prioritize
   CRIT-3 (taxonomy drift) and HIGH-2 (slug constraint).

2. **Actual rate of duplicate-question collisions.** CRIT-4 (passage-
   less fingerprint) is theoretically a problem; whether it's already
   bitten depends on what content is in the bank. A query like
   `SELECT content_hash, count(*) FROM quiz_questions GROUP BY
content_hash HAVING count(*) > 1` would surface real collisions
   on the dedup key. (None should exist within a single PDF since
   the `(source_pdf, content_hash)` is unique; but cross-PDF
   collisions would be revealing.)

3. **Pipeline performance under load.** The unbounded
   `actionAcceptAllBank` and unbounded image-upload size haven't been
   stress-tested against a 500-row CSV with embedded images. The cron
   ingest endpoint has a `LIMIT 20` cap that I assumed is enough but
   hasn't been tested with a real backlog.

4. **Image storage lifecycle.** Whether deleted or replaced images
   actually get removed from storage. The remove-image function
   deletes images whose path starts with `question-images/`; older
   paths might not get cleaned up. A separate audit on storage costs
   vs image count would surface waste.

5. **The hybrid runner / Claude routine in production.** Are PDFs
   actually being processed via the hybrid runner today, or has the
   team been using the ChatGPT path exclusively? If the hybrid
   runner is dormant, decommissioning it is a viable fix for HIGH-9
   (pipeline consolidation).

6. **The "78 GB RAM crash" referenced in ADR 0003.** Per the ADR
   this is past tense, but if any leftover daemon code is still
   scheduled (`scripts/pdf-pipeline/*`), confirm it isn't actually
   running.

7. **Mobile rendering of question images.** The active-quiz screen
   renders figures with a max height of 28rem (~448px). On a 375px-
   wide phone, most figures are wider than that. Layout under
   viewport-constrained conditions wasn't audited (and is design-
   track territory anyway).

8. **The `ROUTINE_PROMPT.md` vs. the Claude Code routine actual
   behavior.** The prompt is documented; whether it's actually used
   today is unknown. If not, deprecate formally.

---

## Appendix — Findings inventory by severity

| #       | Severity | Title                                                             | Surface          |
| ------- | -------- | ----------------------------------------------------------------- | ---------------- |
| CRIT-1  | CRITICAL | Diagnostic uses frozen TS array, not the bank                     | diagnostic       |
| CRIT-2  | CRITICAL | Live-question filter is app-side only                             | schema / serving |
| CRIT-3  | CRITICAL | Taxonomy slug count + names disagree                              | docs / pipeline  |
| CRIT-4  | CRITICAL | content_hash omits passages — R&W collision risk                  | ingest / dedupe  |
| CRIT-5  | CRITICAL | Diagnostic submit trusts client `correct`                         | diagnostic       |
| CRIT-6  | CRITICAL | `acceptFlaggedQuestion` doesn't validate `node_id`                | admin            |
| CRIT-7  | CRITICAL | Numeric tolerance default = exact-match                           | serving          |
| CRIT-8  | CRITICAL | Student flags never close the loop                                | admin / student  |
| HIGH-1  | HIGH     | No per-question audit trail                                       | schema / ML      |
| HIGH-2  | HIGH     | `concept_slug` is not DB-constrained                              | schema           |
| HIGH-3  | HIGH     | No repeat-avoidance across attempts                               | serving          |
| HIGH-4  | HIGH     | Bulk-import requires domain when nodeId null but allows null slug | ingest           |
| HIGH-5  | HIGH     | No per-question quality metrics                                   | schema / ML      |
| HIGH-6  | HIGH     | PDF upload has no idempotency                                     | admin            |
| HIGH-7  | HIGH     | Per-node count badge uses /100 with no real target                | admin            |
| HIGH-8  | HIGH     | `AddQuestionForm` still gates per-choice expl on subject=reading  | admin            |
| HIGH-9  | HIGH     | Two competing ingestion pipelines coexist                         | pipeline         |
| HIGH-10 | HIGH     | Bulk-importer ignores row-level node_id                           | ingest           |
| HIGH-11 | HIGH     | `question_format` vs `answer_format` naming mismatch              | docs / schema    |
| HIGH-12 | HIGH     | Diagnostic difficulty 1-3 vs bank 1-7                             | diagnostic       |
| HIGH-13 | HIGH     | `adaptive_path` JSONB is redundant w/ question_responses          | schema / ML      |
| HIGH-14 | HIGH     | Live-question count uses NULL-or-'ok'; brittle                    | schema           |
| MED-1   | MEDIUM   | Legacy `concepts` / `questions` / `progress` tables               | schema           |
| MED-2   | MEDIUM   | `quiz_attempts.attempt_number` race condition                     | serving          |
| MED-3   | MEDIUM   | `display_order` not unique within a node                          | schema           |
| MED-4   | MEDIUM   | Bulk-import doesn't dedupe within a batch                         | ingest           |
| MED-5   | MEDIUM   | R2 image upload has no per-file size cap                          | ingest           |
| MED-6   | MEDIUM   | Image dedupe uses sha-256 prefix (64 bits)                        | ingest           |
| MED-7   | MEDIUM   | Diagnostic has no SPR support                                     | diagnostic       |
| MED-8   | MEDIUM   | `is_flagged` semantics conflict with `import_status`              | schema           |
| MED-9   | MEDIUM   | Review UI doesn't preview images in collapsed cards               | admin            |
| MED-10  | MEDIUM   | No partial-batch retry on bulk import errors                      | admin            |
| MED-11  | MEDIUM   | `actionAcceptAllBank` uses unbounded Promise.all                  | admin            |
| MED-12  | MEDIUM   | Rejected questions are DELETEd — no soft-delete                   | schema / ML      |
| MED-13  | MEDIUM   | `subject` redundant given `domain`                                | schema           |
| MED-14  | MEDIUM   | `topic_cluster` fallback chain can produce empty string           | ingest           |
| MED-15  | MEDIUM   | Routine prompt taxonomy can drift                                 | docs / pipeline  |
| MED-16  | MEDIUM   | No tutor-side question feedback                                   | admin / ML       |
| MED-17  | MEDIUM   | No `served_count` per question                                    | schema / ML      |
| MED-18  | MEDIUM   | `weak_concepts` text[] not validated against canonical slugs      | diagnostic       |
| LOW-1   | LOW      | Bulk imports all use display_order=0                              | schema           |
| LOW-2   | LOW      | Legacy long-form topic_cluster strings still in bank              | schema           |
| LOW-3   | LOW      | 2-min quiz-results inactivity timeout                             | UX               |
| LOW-4   | LOW      | Adaptive selection is O(7 × pool) — fine, could be precomputed    | serving          |
| LOW-5   | LOW      | `BulkImportPanel.tsx` 32-vs-30 column doc drift                   | docs             |
| LOW-6   | LOW      | Legacy `concepts.domain` CHECK uses `reading_writing`             | schema           |
| LOW-7   | LOW      | `classify-bank-accept.test.ts` uses stale slug names              | tests            |

Total: 47 findings · 8 CRITICAL · 14 HIGH · 18 MEDIUM · 7 LOW.

---
