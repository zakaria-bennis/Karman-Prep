# How College Board sets SAT difficulty and makes Bluebook adaptive, and what Karman should copy

Research note, 2026-10-30. Read-only research: no code, import tool, live question or database was changed.

Rules that apply to everything below:

- Karman questions and answer keys are never called official. Everything Karman builds here is a Karman estimate.
- Score estimates are only ever shown as labeled ranges, never as a single number.
- Facts from College Board are marked **[CB]** with the source. Facts from other published research are marked **[research]**. Anything that comes from a third party, or that this note works out by reasoning, is marked **[unofficial]** or **[inferred]**.

## Short summary

1. **College Board measures difficulty; it does not judge it.** Every new SAT question is first slipped into real tests as an unscored "pretest" question. Each one is seen by at least 1,000 students, and College Board then fits a statistical model to the answers. The question's difficulty is whatever the students' answers say it is. [CB, Technical Manual 2026, section 6.4]
2. **The model is public, the numbers are not.** College Board uses the three-parameter logistic model ("3PL") for multiple-choice questions and the graded response model (which acts like a two-parameter model) for typed-answer math questions. Each question gets a difficulty, a "discrimination" (how sharply it separates weaker from stronger students) and, for multiple choice, a guessing floor. The values for individual questions, the exact routing cut, and the score conversion tables are secret. [CB, Technical Manual section 6.2.1]
3. **Easy, medium and hard are summaries of the model, not separate ratings.** In the student question bank, College Board ties its seven progress boxes to Easy (boxes 1 to 3), Medium (4 to 5) and Hard (6 to 7). [CB, Student Question Bank tips page]
4. **The adaptive design is simple.** Each section has two modules. Module 1 is a broad mix of easy, medium and hard questions. Based only on module 1, Bluebook sends the student to a harder or an easier module 2. The cut is set so that about half of all test takers go each way. Both module 2 versions still contain all three difficulty levels. [CB, Assessment Framework sections 2.2.3 and 2.3]
5. **Scoring is not "count the right answers."** College Board estimates each student's ability from exactly which questions they got right, using each question's model values, and then converts that ability to the 200 to 800 scale with a lookup table. Two students with the same number right can get different scores. [CB, Technical Manual sections 5.1.1 and 6.2.2]
6. **Even the real SAT is only precise to about plus or minus 30 points on the total.** College Board's own simulations show a typical error of about 20 scale points per section. That means no prediction, by anyone, can honestly be tighter than roughly plus or minus 30 points on the 1600 scale. [CB, Technical Manual Table 6.2; inferred total]
7. **Karman's 1 to 7 difficulty is an editorial rating, not a measurement.** Karman's own import contract says so. No source easy/medium/hard labels are stored for any live question, and the 1 to 7 ratings lean easy: about 79% of live questions are rated 1 to 3 and under 7% are rated 5 to 7. A real Bluebook-style "harder module 2" needs far more hard questions than the ratings suggest Karman has.
8. **Karman can copy College Board's method honestly.** The path is: start with the editorial 1 to 7 ratings as a first guess, let student answers correct them question by question, and later link Karman's ability scale to real SAT scores reported by Karman students. The unscored pretest slot idea can be copied directly to try out Karman's own original questions.
9. **The biggest gap is data recording, not math.** Karman needs to start saving, for every answer: which question version was shown, in which mode, at what position, whether it was the student's first try, time spent, and whether help was used. Karman also needs to collect students' real SAT scores. Without those, calibration and honest score ranges are not possible later.

---

## Part 1. How College Board decides question difficulty

### 1.1 Every question is tried out on real students first

- Each Reading and Writing module and each Math module contains **2 unscored pretest questions**, so 4 per section and 8 per test. Students cannot tell which questions are pretest, which keeps their effort honest. [CB, Assessment Framework 2.2.4 and 2.3.2]
- Pretest questions are placed randomly, except never as the first or last two questions of a module. The **same two pretest questions** appear in module 2 whichever route the student gets, so each new question is seen by weak and strong students alike. [CB, Technical Manual 6.4]
- **At least 1,000 students** answer every pretested question, and the variants generated from one template (see 1.3) are seen by at least 5,000 students combined. College Board calls these "absolute minimums." [CB, Technical Manual 6.4]
- Before any modeling, a question is flagged for review if more than 90% or fewer than 20% of students get it right, if its link to students' total scores (discrimination) is below 0.20, or if a wrong answer choice is chosen more often by stronger students. Questions that behave differently for groups of students of equal ability (for example by gender) are thrown out or rewritten and re-pretested. [CB, Technical Manual 6.4; Assessment Framework 2.2.7.1]
- Pretesting started in 2020 with separate tryout events and has been embedded in real tests since October 2023. [CB, Assessment Framework 5.1.3; Technical Manual 6.4]

### 1.2 The statistical model (item response theory)

College Board puts every question and every student on one shared ability scale. In its scoring this scale runs from about minus 5 to plus 5, with 0 near the middle of test takers. This approach is called item response theory, or IRT. [CB, Technical Manual 6.2]

For **multiple-choice** questions College Board uses the three-parameter logistic model (3PL). Each question gets three numbers:

| Number | Name           | Plain meaning                                                                                                                                                  |
| ------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| b      | difficulty     | The ability level at which a student is "about even" on the question (more precisely, halfway between the guessing floor and certainty). Higher means harder.  |
| a      | discrimination | How sharply the chance of success rises as ability rises. A high value means the question cleanly separates students just below and just above its difficulty. |
| c      | guessing floor | The chance that a student who does not know the answer still gets it right. For a 4-choice question this is usually near 0.2.                                  |

The formula is: chance of a correct answer = c + (1 minus c) divided by (1 + e to the power of minus a times (ability minus b)). College Board sets the usual scaling constant to 1. [CB, Technical Manual 6.2.1, equation 1]

For **typed-answer (grid-in) math** questions College Board uses the graded response model. For right/wrong questions it is the same as the 3PL with no guessing floor, which makes sense: you cannot guess a typed number. [CB, Technical Manual 6.2.1, equation 2]

The software is flexMIRT, fitted by a standard method (marginal maximum likelihood) with "priors," which are starting assumptions about what typical values look like. Priors help when data is thin. [CB, Technical Manual 6.2.1 and 6.4]

**Worked example [inferred, made-up numbers for illustration]:** a question with b = 1.0, a = 1.2, c = 0.2. A student at ability 1.0 has a 60% chance (halfway between 20% and 100%). A student at ability 0 has about a 38% chance. A student at ability 2.0 has about an 82% chance.

### 1.3 Templates and "child" questions

College Board writes most questions as a **parent model**, a template with swappable surface details (names, numbers, topics). Each generated **child item** is expected to behave the same. The children of one parent are pretested and must land within plus or minus 0.05 of their average success rate on the model's scale, or within 0.10 of each other in the calibration check, or the whole template is pulled. Once proven, children are treated as interchangeable, and the answers to all of them are pooled into one calibration. [CB, Technical Manual 3.1 and 6.4]

Why it matters for Karman: College Board can calibrate fewer, better-measured templates. Karman's equivalent is its duplicate and near-duplicate grouping from the import pipeline. Questions that are true variants of each other can share data.

### 1.4 What "easy, medium, hard" mean

- **Official:** module 1 is "a broad mix of easy, medium-difficulty, and hard questions," and each module 2 has all three "in differing proportions." College Board does not publish the proportions. [CB, Assessment Framework 2.2.3]
- **Official:** in the Student Question Bank, the seven-box progress bar maps to difficulty settings: boxes 1 to 3 to Easy, boxes 4 to 5 to Medium, boxes 6 to 7 to Hard. [CB, Student Question Bank tips page]
- **Official:** score reports place each of the 8 content domains into **one of seven performance bands**, set at percentile points of recent PSAT 8/9, PSAT 10 and SAT score distributions. College Board warns these are imprecise because a domain can rest on as few as 4 questions. [CB, Technical Manual 6.2.2 and 5.2.2]
- **Official but dated:** a 2020 Michigan Department of Education FAQ for the SAT Suite Question Bank says each question's level "is assigned … based on student performance." [state FAQ, 2020]
- **Unofficial:** third-party analyses of the Educator Question Bank report an internal 1 to 7 field (`score_band_range_cd`), with higher meaning harder. [unofficial] It is very likely tied to the seven performance bands above. [inferred]

**Important for Karman:** Karman's own 1 to 7 scale is not College Board's 1 to 7. Karman's rubric groups 1 to 2 as easy, 3 to 4 as medium, 5 to 6 as hard and 7 as hardest. College Board's question bank groups 1 to 3 as easy, 4 to 5 as medium and 6 to 7 as hard. Both have seven steps, but they were built differently and should never be presented as the same thing.

### 1.5 What can and cannot be known from public sources

| Public [CB]                                                                                         | Not public                                                   |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| The model family (3PL and graded response), the scaling constant, the software                      | Any individual question's a, b, c values                     |
| Module sizes, timing, ordering rules, pretest counts and placement                                  | The exact routing cut for any panel                          |
| That routing uses only module 1 and is set near the median                                          | The ability-to-score conversion tables                       |
| Pretest minimums, flagging rules, fairness checks                                                   | The target "information" curves used to build panels         |
| Panel acceptance rules (reliability of at least 0.90 per section, at most 5% exposure per question) | The secure question pool                                     |
| Simulated accuracy (about 20 scale points of error per section)                                     | The live proportions of easy, medium and hard in each module |

Third-party "routing thresholds" and "curve" charts online are guesses from practice tests. Treat them as [unofficial].

---

## Part 2. How the adaptive, non-linear structure works

### 2.1 The structure (College Board calls it a "1 to 2" multistage design)

|                | Reading and Writing                                                        | Math                                                                       |
| -------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Module 1       | 27 questions (25 scored + 2 pretest), 32 minutes                           | 22 questions (20 scored + 2 pretest), 35 minutes                           |
| Module 2       | 27 questions (25 scored + 2 pretest), 32 minutes, harder or easier version | 22 questions (20 scored + 2 pretest), 35 minutes, harder or easier version |
| Section total  | 54 questions, 64 minutes, about 71 seconds per question                    | 44 questions, 70 minutes, about 95 seconds per question                    |
| Question types | 4-choice multiple choice                                                   | about 75% multiple choice, about 25% typed answer                          |

[CB, Assessment Framework Table 7]

A **panel** is one module 1 plus its two possible module 2s. A student's **form** is module 1 plus whichever module 2 they got. Every student gets a highly comparable but unique form. [CB, Assessment Framework 2.2.3; Technical Manual 3.3.1]

### 2.2 Routing

- After module 1, Bluebook estimates the student's ability using **only the scored module 1 questions**, with a method called EAP that uses a flat starting assumption (no prior information about the student). [CB, Technical Manual 6.2.1]
- **No outside information is used.** College Board makes no starting estimate from earlier tests. [CB, Technical Manual 3.3.1]
- The cut between the harder and easier module 2 is set at the **median** from past test takers, so about half go each way. [CB, Technical Manual 2.3 and 6.1]
- Panels are built to measure most precisely right at that cut. [CB, Technical Manual 6.1]
- In simulations, **over 93%** of students were routed as their true ability says they should be, and **over 90%** would be routed the same way on two different panels. Almost all misroutes happen near the cut (82% within 30 scale points for Reading and Writing), where either route gives the same score. [CB, Technical Manual 6.3.1]
- Deliberately missing module 1 questions to get the easier module 2 backfires. In College Board's math simulation, a strong student who did that and then got every easier-module question right topped out at about 580. [CB, Technical Manual 6.3.1]

### 2.3 Question order inside a module

- **Reading and Writing:** grouped by domain in this order: Craft and Structure, Information and Ideas, Standard English Conventions, Expression of Ideas. Inside each domain, grouped by skill and then ordered easiest to hardest. Standard English Conventions is ordered easiest to hardest regardless of skill. [CB, Assessment Framework 3.1.1]
- **Math:** all four domains mixed, ordered easiest to hardest across the whole module. [CB, Assessment Framework 4.1.1]
- Students can move freely and flag questions inside a module, but cannot go back to module 1 after it ends, or to Reading and Writing after Math starts. [CB, Assessment Framework 2.3.1]

### 2.4 Why raw scores do not convert to scaled scores in a straight line

There are four separate reasons, all [CB, Technical Manual 2.3, 5.1.1 and 6.2] unless marked:

1. **Pattern scoring.** The final ability estimate uses every question's a, b and c values. A hard, sharply separating question moves the estimate more than an easy one, and a right answer on a question with a high guessing floor counts for less.
2. **The route matters.** The harder module 2 contains questions that carry more information about strong students, so the same number right on the harder route usually means a higher ability.
3. **The ability-to-score table is curved.** College Board linked its ability scale to the old paper SAT scale using an "equipercentile" method (matching percentiles) on 18,513 students in 2022. That produced a lookup table with 61 possible section scores (200, 210, up to 800). Its shape is roughly an eighth-degree curve, steep in the middle and flat at the ends.
4. **Ends of the scale.** All correct always maps to 800 and none correct to 200. Near the bottom, lucky guesses make ability estimates unstable (College Board calls this the "region of chance"), so the low end of the table is flat and noisy.

Total score is simply Reading and Writing plus Math.

---

## Part 3. How scaled scores are produced, and how accurate predictions can be

### 3.1 From answers to a score

College Board marks every answer right or wrong (typed answers are cleaned first, and skipped questions count as wrong), then estimates ability by maximum likelihood across all scored questions in the section, then reads the score from the conversion table. A second, independent system re-scores every test and any difference is investigated. The test is **pre-equated**: because every question already has model values, no curve is adjusted after test day. [CB, Technical Manual 5.1.1 and 2.3]

### 3.2 How precise the real SAT is

- College Board's simulation of 10,000 students per run, repeated 100 times, found a typical error of **about 19 to 21 scale points per section** (Reading and Writing 19.5, Math 20.7 overall). The error is larger for students on the easier route (about 21 to 22) than the harder route (about 18 to 20). [CB, Technical Manual Table 6.2]
- Combining two sections, that is roughly **plus or minus 28 to 30 points on the total** as one standard error. In plain terms, about two thirds of the time a student's score would land within about 30 points of where it would land on a perfect test, and about 95% of the time within about 60 points. [inferred from Table 6.2]
- Panels must reach a reliability of at least 0.90 per section before use. [CB, Technical Manual 6.5.1]
- College Board's own score report says "a student's ability is better represented by score ranges than points," with ranges based on this error. [CB, Understanding Scores, Fall 2026]

### 3.3 How well practice tests predict

- College Board says a student's score on one of its full-length practice tests is "highly indicative" of the real score, especially within a couple of weeks of the SAT and under the same time limits. It does not publish an error figure for this. [CB, help center]
- A College Board study of Bluebook practice found students who finished 1, 2 or 3 or more full-length practice tests scored about 25, 45 and 60 points higher than similar students who did none. This shows a link with higher scores, not prediction accuracy. [CB research, May 2025]
- **What this means for Karman [inferred]:** even a perfect copy of the SAT, using real College Board questions, would still miss an individual's real score by around 30 points on a typical day. Karman's prediction adds its own errors on top: its questions are not College Board's, its scale is only linked to the SAT indirectly, the student keeps learning between the practice test and test day, and practice conditions are not test-day conditions. A realistic honest range is therefore wider than 60 points at first and narrows only as Karman collects real SAT outcomes.

---

## Part 4. What Karman needs to copy this honestly

### 4.0 Where Karman stands today (from the repo, read-only)

- **Live questions:** 9,564 in the 2026-10-26 audit (Reading and Writing 5,563, Math 4,001, of which 1,069 are typed answer). (`~/Documents/Codex/2026-10-11/task-3/pipeline/audit-20261026b/counts.json`)
- **Difficulty 1 to 7 is editorial.** It is assigned by a review pass using the `karman-legacy-1-7-v1` rubric. The import contract says the confidence is "editorial certainty, not measured first-try success probability." The rationale and confidence are not stored in database columns. (`docs/ingestion/reviewed-difficulty-contract.md`)
- **No source easy/medium/hard labels are stored**, and there is no `difficulty_source` field. (Earlier notes assumed many questions carried source labels; the audit found none.)
- **The distribution leans easy:** level 1: 1,732, level 2: 3,026, level 3: 2,769, level 4: 1,408, level 5: 511, level 6: 113, level 7: 5. Math has no level 7. About 79% are at levels 1 to 3 and about 6.6% at 5 to 7. The rubric's own guide says level 5 to 6 means about 40% first-try success and level 7 about 15%.
- **Sources** are recorded as dated exam forms with section, module (M1 or M2) and question number. Whether an M2 was the harder or easier version is not recorded.
- **Responses:** `question_responses` stores the chosen answer, right or wrong, seconds spent, a flag and a time, but its difficulty column holds the old four-band value, not 1 to 7. The 39-skill practice tables (`catalog_practice_sessions` and `catalog_practice_responses`) are used by the code but their migration is not in the repo. Hint use, calculator use, answer changes, test position, mode and question version are not stored. The diagnostic saves totals only.
- **Adaptivity today:** the lesson quiz moves up one level after a right answer and down one after a wrong one, with no memory across sessions. Skill practice is not adaptive. There is no full-length test, routing, or ability estimate. The diagnostic score is a straight-line formula, not calibrated.

**Reading this [inferred]:** the easy lean has two likely causes. Either the editorial ratings are compressed toward easy, or the bank is short on genuinely hard questions. Real SAT pools must contain many hard questions because half of all students take a harder module 2. Student data is the only way to tell which. Either way, the 1 to 7 numbers can be trusted for rough order, not for size.

**A free difficulty signal Karman already has [inferred]:** because College Board orders Math modules easiest to hardest, and orders Reading and Writing by difficulty within each skill group, a question's **position in its source module** says something about its difficulty. Comparing the two M2 modules of the same form, the one with harder-looking questions is very likely the harder route. These can be used as extra starting evidence, never as proof.

### 4.1 Calibrating the ~9,600 live questions, and later Karman originals

**Which model.** Recommended path [inferred, based on CB practice and the research below]:

| Stage                                               | Model                                                                                                                                                                   | Why                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start (no data)                                     | Starting difficulty per question from the editorial 1 to 7 rating, adjusted by source position                                                                          | Something to work from on day one                                                                                                                                                            |
| Live from the first student                         | An "Elo-style" running update: after every answer, nudge the student's ability and the question's difficulty a little toward what happened                              | Used successfully in adaptive practice systems (Math Garden for arithmetic, geography fact drills). Simple, cheap, works with little data. [research: Klinkenberg et al. 2011; Pelánek 2016] |
| Once questions have a few hundred first-try answers | Proper IRT fit with one difficulty number per question and a **fixed** guessing floor (0.25 or 0.2 for 4-choice, 0 for typed answer), with the 1 to 7 rating as a prior | Mirrors College Board's model shape while only estimating what the data can support                                                                                                          |
| Core test questions with about 1,000+ answers       | Add discrimination (a 2-parameter model with fixed floor, or a full 3PL with strong priors)                                                                             | College Board's own minimum for its 3PL is 1,000 per question [CB]; published guidance for 3PL ranges from 1,000 to 5,000 [research]                                                         |

Use **one ability per section** (Reading and Writing, Math), as College Board does; its factor analysis supports one dimension per section. [CB, Technical Manual 6.3.4] Skill-level estimates sit underneath and are treated as rough, just as College Board warns about its domain bands.

**Using the editorial ratings properly.** Research shows that expert difficulty judgments, used as starting assumptions in a Bayesian fit, make small-sample estimates more accurate (Mislevy 1988 and later work on "collateral information"). [research] So the 1 to 7 rating is not thrown away: it becomes the prior, and real answers overrule it as they accumulate. A useful starting map from Karman's rubric success guide (about 85% right at levels 1 to 2, 65% at 3 to 4, 40% at 5 to 6, 15% at 7) can be turned into starting difficulty values [inferred]. Note that a 15% success rate is below random guessing on a 4-choice question, which only happens with strongly misleading wrong answers. Expect level 7 ratings to move.

**How much data [research rules of thumb; exact needs depend on the questions and students]:**

| Goal                                                                  | Rough first-try answers per question                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Elo-style live estimate that is usable for picking practice questions | 30 to 50                                                                   |
| One-number IRT difficulty, with the rating as prior                   | 150 to 300                                                                 |
| One-number IRT difficulty, no prior                                   | 500 or more (Paek et al. 2021 suggest at least 500 for the simplest model) |
| Difficulty plus discrimination (2-parameter)                          | 500 to 1,000                                                               |
| Full 3PL with guessing estimated                                      | 1,000 minimum (College Board's floor), up to 5,000 in some studies         |

**Scale of the job [inferred]:** 9,600 questions times 200 answers each is about 1.9 million first-try answers. At roughly 1,500 practice answers per prep student, that is over 1,000 students. So Karman should **not** try to calibrate the whole bank at once. Calibrate first the few hundred questions used in full-length tests (see 4.2), and let practice questions run on the Elo-style estimate with the rating as prior.

**Which answers count.** Only answers that reflect a real first attempt should feed calibration [inferred, following CB's practice of excluding irregular data]:

- First attempt by that student on that question version only (no retries, no repeats after seeing the explanation).
- Record mode: full-length test, timed set, untimed practice, homework. Start by calibrating on test and timed answers; untimed answers can be used with care.
- Exclude very fast answers that look like guesses or skips (to be tuned from data), and abandoned sessions.
- If a question's wording or figure changes in a way that could change its difficulty, start a new version and do not mix its data with the old one. This matches College Board's practice of retiring and re-pretesting changed templates.

**Quality checks to copy from College Board [CB, Technical Manual 6.4]:** flag questions where over 90% or under 20% get it right, where stronger students are not more likely to get it right (discrimination below 0.20), or where a wrong choice attracts stronger students. These also catch wrong answer keys, which matters because 16% of live questions use generated keys. Later, with enough students, check that questions behave the same across student groups.

**Linking to the real SAT scale.** Karman's ability scale means nothing to a student until it is tied to SAT scores. College Board did this with 18,513 students who took both versions. [CB] Karman's version: ask students to report real SAT and PSAT scores (with score report upload where possible) and the test date, then link Karman ability to those scores. A few hundred matched students gives a rough link, and over a thousand gives a stable one (Kolen and Brennan's rules of thumb for linking). [research] Until then, any score shown must be labeled as an early estimate with a wide range.

### 4.2 Bluebook-style adaptive full-length tests

**Copy the structure exactly** (Part 2): 2 sections, 2 modules each, 27 and 22 questions, 32 and 35 minutes, module locking, flag and review inside a module only, a break between sections, the same ordering rules, all four domains in every module, and the same domain shares per test. [CB]

**Use the 2 extra slots per module for Karman's own tryout questions.** This is the honest version of College Board's pretesting. Students are told in the test directions that a few questions are unscored tryout questions, as College Board does. Put the same tryout questions in both versions of module 2, never in the first or last two positions. This is how Karman originals get calibrated before they are used for scoring.

**Build fixed panels, not a live algorithm, at first.** Each Karman practice test is one panel per section: a module 1 plus a harder and an easier module 2. That is 81 Reading and Writing plus 66 Math questions, 147 in total per test. Assemble each panel against the domain blueprint, aim module 1 at a broad mix, the harder module 2 skewed hard and the easier one skewed easy, with all three levels in both. College Board does not publish the mix. A reasonable starting assumption is about a third each in module 1, and about 50% hard, 35% medium and 15% easy in the harder module 2 (mirrored for the easier one). [inferred; adjust from data]

**Keep test questions out of practice.** College Board builds tests only from questions that have never been released. [CB] If Karman's full-length test questions also appear in drills, students will have seen them, and their scores will be inflated. Reserve a test pool (about 1,500 questions for 10 tests) and never show those questions in endless mode or drills.

**Hard questions are the bottleneck [inferred].** By current ratings there are only 416 Reading and Writing and 213 Math questions at levels 5 to 7. Ten harder module 2s need roughly 120 to 130 hard Reading and Writing and 100 hard Math questions, before counting duplicates and skill balance. It is workable for a first set of tests, but tight. Early student data may also show that some level 3 and 4 questions are really hard.

**Routing, in two steps:**

1. Before calibration: route on the number right in module 1's scored questions, with the cut set from the ratings so that a typical Karman student is near it, then reset to the median of real Karman students once there are a few hundred. [inferred]
2. After calibration: route the way College Board does, with the ability estimate from module 1 only, cut at the median. [CB]

**Scoring:** after calibration, use pattern scoring (maximum likelihood ability across both modules), then a Karman conversion table linked to real SAT outcomes. Before that, report only a wide, clearly labeled range.

**Before publishing any panel, simulate it,** as College Board does: generate thousands of simulated students across the score range and check routing accuracy, score precision, and that no scores are impossible to reach. [CB, Technical Manual 6.5.1]

### 4.3 Endless mode (adaptive practice)

The goal of practice is different from the goal of a test. A test picks questions to **measure**, so it aims near 50% success. Practice picks questions to **teach and motivate**, so it should aim higher. Research on learning suggests success rates somewhere around 70 to 85%, for example Wilson et al.'s "85% rule," and Math Garden studies tested different target success rates. [research] Karman should pick a target, for example 75%, and tune it from data.

**What the picker knows about the student:**

| Signal        | How it is used                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Last answer   | Immediate Elo-style update of the section ability and the skill ability. Bigger steps early, smaller as evidence builds (Pelánek's guidelines). [research]   |
| This session  | Short-term momentum: after two misses in a row step down; after a streak step up. Track fatigue and pace (time per question rising).                         |
| Whole history | Long-term ability per section and per skill. Older evidence slowly counts for less, because students learn and forget. [inferred]                            |
| Weak skills   | Skills where estimated ability is low relative to the student's section ability, weighted by how often that skill appears on the SAT (the CB domain shares). |
| Exposure      | Never repeat a question too soon. Bring back missed questions after a gap (spaced review). [research: spacing effect, Cepeda et al. 2006]                    |

**How the next question is chosen [inferred design]:** for every eligible question, score it on four things and take the best, with a little randomness so sessions do not feel scripted:

1. How close the student's predicted chance of success is to the target (for example 75%).
2. How much the question's skill needs work (weak skills and SAT weight).
3. Whether it is due for review, or new.
4. Variety (not the same skill or passage type over and over).

**Time trials** reuse the same picker with a clock. Pace targets come straight from the test: about 71 seconds per Reading and Writing question and about 95 seconds per Math question. [CB] Timed answers are also more useful for calibration than untimed ones.

**Guardrail:** endless mode never uses the reserved full-length test pool.

### 4.4 A predicted score as close to the real SAT as possible

**What feeds it:** most weight on recent Karman full-length tests, then recent timed practice, then everything else, with older evidence fading.

**How it is shown:** always a labeled range, for example "Karman estimate if you tested today: 1,240 to 1,320. Not an official College Board score." Never a single number, never framed as a guarantee. This matches the site rules in `CLAUDE.md`.

**How wide [inferred, a proposal to agree with the founder]:**

- **Never narrower than about plus or minus 30 points on the total**, since that is the real SAT's own precision.
- Early on (before Karman has linked to real SAT outcomes), much wider, for example plus or minus 80 to 100 points, and say so.
- Set the width so that about 4 in 5 real SAT scores land inside the shown range. Then **check it**: every time a student reports a real score, record whether it fell inside. If fewer than 4 in 5 do, widen the ranges. This is the honest test of "as close to the real SAT as possible."

**Predict "if you tested today," not test day.** Projecting future growth adds guesswork. A separate, clearly labeled "on track for" line can come later once Karman has data on how much students actually improve.

---

## Part 5. Phased plan

| Phase                                     | What gets built                                                                                                                                                                                                                                                                                                              | Data it needs                                                                                              | What can honestly be shown                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **0. Now (before students)**              | Start recording the fields in Part 6. Store the editorial rating with its source and rubric version as real columns. Derive starting difficulties from the rating and source position. Build the full-length test shell (structure, timing, locking, tryout slots) and pick a reserved test pool. Write the panel simulator. | None from students                                                                                         | Nothing score-like beyond "practice," or a very wide labeled range                |
| **1. First students (roughly 50 to 300)** | Elo-style live estimates. Endless mode on ratings plus live updates. Fixed panels routed on module 1 number right. Ask every student for real PSAT and SAT scores and dates.                                                                                                                                                 | Every answer with the Part 6 fields                                                                        | Wide labeled ranges (for example plus or minus 80 to 100) marked "early estimate" |
| **2. First calibration**                  | Fit one-number IRT with rating priors on the test pool, using first-try timed answers. Re-route on the ability estimate. First conversion table linked to reported SAT scores. Quality flags (too easy, too hard, bad key).                                                                                                  | About 150 to 300 first-try answers per test-pool question, and a few hundred students with real SAT scores | Narrower ranges, checked against real outcomes                                    |
| **3. Mature calibration**                 | Add discrimination for core questions. Proper linking to SAT scores. Fairness checks across student groups. Start calibrating Karman originals through tryout slots. Monitor drift.                                                                                                                                          | About 500 to 1,000+ answers per core question, and over 1,000 students with real scores                    | Ranges set by measured accuracy, never narrower than about plus or minus 30       |
| **4. Ongoing**                            | Recalibrate on a schedule. Retire overexposed or drifting questions. Publish internal accuracy reports.                                                                                                                                                                                                                      | Continuous                                                                                                 | Same, kept honest by the "4 in 5 inside the range" check                          |

---

## Part 6. What the import pipeline and the app should record now

None of this changes import tools in this note. It is the list to hand to the import and product sessions.

### 6.1 Per question (import pipeline)

| Field                                                                                                      | Why                                                         | Status today                               |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Source difficulty label, exactly as printed (easy/medium/hard, a band number, or none)                     | Prior evidence, never overwritten                           | Not stored; current sources have none      |
| `difficulty_source` (for example `editorial_rubric`, `source_label`, `student_data`) and rubric version    | Know where each number came from                            | Missing as a column                        |
| Editorial 1 to 7, rationale, confidence, uncertainty flag                                                  | Becomes the prior                                           | Number stored; the rest only in audit JSON |
| Source form, section, module, **route (harder or easier M2, if known)**, question number                   | Free difficulty signal from College Board ordering          | Mostly stored; route missing               |
| 39-skill ID as a real column (primary and any secondary)                                                   | Skill-level estimates and blueprint building                | Stored only inside JSON                    |
| Section, domain, question type (multiple choice or typed answer)                                           | Model choice (guessing floor) and blueprint                 | Stored                                     |
| Content version hash                                                                                       | Responses must point at the exact version shown             | Partly (source hashes); not on responses   |
| Duplicate or variant group ID                                                                              | Variants can share data, like College Board's parent models | Comparison key exists on the import branch |
| Answer-key origin (source key or generated)                                                                | Bad keys show up as calibration flags                       | Tracked in audits                          |
| Pool: reserved full-length test or practice                                                                | Keep test questions unseen                                  | Missing                                    |
| Reserved calibration fields: difficulty, discrimination, guessing floor, answer count, model version, date | Store results without schema churn later                    | Missing                                    |

### 6.2 Per answer (app)

| Field                                                                                   | Why                                           | Status today                        |
| --------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------- |
| Student, question, question version                                                     | Basic link                                    | Question yes, version no            |
| Chosen answer and right or wrong                                                        | Core data, plus wrong-choice analysis         | Stored                              |
| Active time on the question (and total time)                                            | Speed, guessing detection, time trials        | Seconds stored in some tables       |
| Mode (full test, endless, drill, time trial, homework, diagnostic) and timed or untimed | Decide which answers count                    | Missing                             |
| Session, test, module, route, position in module, time remaining                        | Full-length test scoring and position effects | Only an order number in some tables |
| First attempt by this student on this question (yes or no), attempt number              | Only first tries calibrate                    | Partly (per-quiz attempt number)    |
| Saw the explanation or answer before answering (yes or no)                              | Exclude contaminated answers                  | Missing                             |
| Hint used, calculator opened, answer changed, flagged                                   | Help and behavior signals                     | Flag only                           |
| Device type                                                                             | Possible screen effects                       | Missing                             |
| Difficulty rating at the time (1 to 7)                                                  | Know what the picker believed                 | Old four-band value stored instead  |

### 6.3 Per student

| Field                                                                              | Why                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Real SAT and PSAT scores (section and total), test date, self-reported or verified | The only way to link Karman's scale to the SAT and to check the ranges    |
| Planned test date                                                                  | "If you tested today" versus later projections                            |
| Timing accommodation                                                               | Already on the quiz-engine branch; needed to compare timed answers fairly |

Also noted: the diagnostic currently saves only totals, so its answers cannot be used later. Saving its per-question answers would add useful early data.

---

## Open questions for the founder

1. Agree the range rule: never narrower than about plus or minus 30, start at about plus or minus 80 to 100, and target 4 in 5 real scores inside.
2. Agree to tell students that full-length tests include a few unscored tryout questions, as College Board does.
3. Agree to ask every student for real SAT and PSAT scores, ideally with a score report upload.
4. Decide the endless-mode target success rate (suggested start: 75%).
5. This note does not assess Karman's rights to use questions from administered exam forms. That is a separate question, and it also affects whether those questions can serve as test-pool anchors.

---

## Sources

College Board (primary):

- [Digital SAT Suite of Assessments Technical Manual, 2026](https://research.collegeboard.org/media/pdf/Digital%20SAT%20Suite%20of%20Assessments%20Technical%20Manual-FINAL.pdf), sections 2.3, 3.1, 3.2, 3.3, 5.1.1, 5.2.2, 6.1 to 6.5
- [Assessment Framework for the Digital SAT Suite, version dated September 2026](https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf), sections 2.2.3, 2.2.4, 2.2.8, 2.3, 3.1, 4.1, 5.1.3, 5.1.7
- [How SAT scores are calculated](https://satsuite.collegeboard.org/scores/what-scores-mean/how-scores-calculated)
- [Understanding SAT Scores, Fall 2026](https://satsuite.collegeboard.org/media/pdf/understanding-sat-scores.pdf)
- [Student Question Bank tips](https://satsuite.collegeboard.org/practice/student-question-bank/tips)
- [Is my child's practice test score a good indication?](https://satsuite.collegeboard.org/help-center/my-childs-score-practice-test-good-indication-what-theyll-get-actual-test)
- [Chang, Akbayin-Sahin and Howell, Examining the Relationship Between Digital SAT Practice in Bluebook and SAT Performance, College Board Research, May 2025](https://research.collegeboard.org/media/pdf/DigitalSATPracticeTests_052025.pdf)
- [SAT Suite Question Bank overview](https://satsuite.collegeboard.org/k12-educators/tools-resources/question-bank/overview)

State and third-party (secondary, marked in the text):

- [Michigan Department of Education, SAT Suite Question Bank FAQs (2020)](https://www.michigan.gov/documents/mde/SAT_Suite_Question_Bank_FAQs_687827_7.pdf)
- [Analysis of the College Board question bank, including the `score_band_range_cd` field](https://dsat16-blog.web.app/post/sat-question-bank-analysis) [unofficial]

Published research:

- Lord, F. M. (1980). _Applications of Item Response Theory to Practical Testing Problems_. (3PL model; cited by College Board.)
- Kolen, M. J., and Brennan, R. L. (2014). _Test Equating, Scaling, and Linking_ (3rd ed.). (Linking and sample size rules of thumb.)
- Mislevy, R. J. (1988). Exploiting auxiliary information about items in the estimation of Rasch item difficulty parameters. _Applied Psychological Measurement_, 12(3). (Expert ratings as priors.)
- [Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. _Computers and Education_, 98, 169 to 179](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)
- Klinkenberg, S., Straatemeier, M., and van der Maas, H. L. J. (2011). Computer adaptive practice of Maths ability using a new item response model for on the fly ability and difficulty estimation. _Computers and Education_, 57(2), 1813 to 1824.
- Jansen, B. R. J., Hofman, A. D., Savi, A. O., Visser, I., and van der Maas, H. L. J. (2016). Self-adapting the success rate when practicing math.
- Wilson, R. C., Shenhav, A., Straccia, M., and Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning. _Nature Communications_, 10.
- Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. _Psychological Bulletin_, 132(3).
- Paek, I., et al. (2021), and Feuerstahler (2022), on IRT sample sizes, as summarized in [this 2024 study](https://jurnal.uny.ac.id/index.php/reid/article/download/73055/22264/216675).
- Yan, D., von Davier, A. A., and Lewis, C. (Eds.) (2014). _Computerized Multistage Testing: Theory and Applications_. (Background on multistage design.)

Karman repo (read-only):

- `docs/ingestion/reviewed-difficulty-contract.md`, `docs/ingestion/routine.md`, `question-imports/chatgpt/KarmanGPT.txt` section 7 (on branch `claude/import-dedup-spec`)
- `supabase/migrations/20260423002209_lesson_quiz.sql`, `20260514002428_difficulty_numeric.sql`, `20261004000000_source_question_identity.sql`, `20261005211135_secure_quiz_delivery_and_scoring.sql`
- `src/types/quiz.ts`, `src/lib/quiz-session.ts`, `src/lib/catalog-practice/`, `src/lib/diagnostic-scoring.ts`
- `~/Documents/Codex/2026-10-11/task-3/pipeline/audit-20261026b/counts.json` and `REPORT.md`
