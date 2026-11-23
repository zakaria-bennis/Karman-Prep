# Digital SAT scoring: official facts, community data, and what it means for the Karman engine

Collected 2026-11-22. Every fact has a link. Quotes are under 15 words. "Inference" marks my own reading.

## Main official sources

- **TM** = _Digital SAT Suite of Assessments Technical Manual_ (College Board, 2024), copy hosted by the Indiana DOE:
  https://secure.in.gov/doe/files/Digital-SAT-Suite-of-Assessments-Technical-Manual.pdf
  (page numbers below are the manual's printed page numbers)
- **AF** = _Assessment Framework for the Digital SAT Suite_:
  https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf
- **HOW** = "How Scores Are Calculated":
  https://satsuite.collegeboard.org/sat/scores/understanding-scores/how-scores-are-calculated
- **GSR** = _Guide to PDF Score Reports_: https://satsuite.collegeboard.org/media/pdf/guide-pdf-score-reports.pdf
- **USS** = _Understanding SAT Scores_ (2026): https://satsuite.collegeboard.org/media/pdf/understanding-sat-scores.pdf
- **HELP** = Help Center, "Is my child's practice test score a good indication...":
  https://satsuite.collegeboard.org/help-center/my-childs-score-practice-test-good-indication-what-theyll-get-actual-test
- **CBR25** = College Board Research, _Examining the Relationship Between Digital SAT Practice in Bluebook and SAT Performance_ (May 2025):
  https://research.collegeboard.org/media/pdf/DigitalSATPracticeTests_052025.pdf
- **SG4–SG11** = official scoring guides for the paper (nonadaptive, "linear") versions of Practice Tests 4–11, for example
  https://satsuite.collegeboard.org/media/pdf/scoring-sat-practice-test-4-digital.pdf (change the number for 5–11)

## 1. How the digital SAT is scored (official)

### Test design

- It is a "1-2" multistage adaptive test (MST). Each section has a routing module (Module 1), then a lower-difficulty or a higher-difficulty Module 2 (TM p. 82, section 6.1).
- "each stage consists of 50% of the total items that contribute to the student's score, plus two embedded pretest items in each stage of each section" (TM p. 82).
- **Reading and Writing:** each module has 25 operational items and 2 pretest items, so 27 shown and 54 in all, 50 of them scored (TM p. 32, RW specifications table; AF says the same).
- **Math:** each module has 20 operational items and 2 pretest items, so 22 shown and 44 in all, 40 of them scored (TM p. 38, Math specifications table).
- Each section has four pretest slots: two in Module 1 and two in each Module 2. "The pretest items appearing in the second-stage modules of each panel are the same" (TM p. 54).
- Pretest items are unscored and look the same as scored ones. HOW: each module has "20–25 scored questions" plus two pretest questions that don't count.
- Module 1 has "a broad mix of easy, medium-difficulty, and hard" items. Students can go back over questions only within a module (TM pp. 81–82).

### IRT models

- **Multiple-choice: 3PL** with D = 1: P = c + (1−c)/(1+exp(−a(θ−b))). "D is a scaling constant that for the SAT Suite ... is set to unity" (TM pp. 83–84).
- **Student-produced response (typed math answers): graded response model (GRM)**. When scored right or wrong, the GRM "reduces to a special case equivalent to the 2PL model" (TM p. 84). So typed-answer items have no guessing parameter.
- Item calibration: flexMIRT, marginal maximum likelihood, normal prior on ability, hyper-priors on slope, intercept and lower asymptote (TM p. 104). New items are linked by **fixed-item calibration** with the operational items as anchors.
- The test is **pre-equated**: "equating after an administration is not performed" (TM p. 47). Panels are built to match TIF and TCC targets. The TCC tolerance is ±0.5 of the expected true score per section (TM p. 48).

### Scoring is by response pattern

- "The IRT models rely on pattern scoring" (TM p. 84). The score uses each item's parameters and whether it was answered right or wrong.
- "two students may have the same number of correct answers but have different reported scale scores" (TM p. 73). HOW says the same in plain words: the score also depends on question difficulty and on whether the answers look like guessing.
- **Routing estimate:** EAP on Module 1 operational items only, uniform prior on [−5, 5] with 101 quadrature points. TM: "A uniform distribution is considered a non-informative prior" (p. 84). The EAP is computed on the student's device, offline (TM p. 73).
- **Routing cut:** a "population distribution approach": historical data set the cut at the **median** student's performance (TM p. 83). Panels are built to be most precise at that cut.
- **Final estimate:** "maximum likelihood estimation (MLE) using a Newton-Raphson method" on all operational items from both modules. This "is the basis for the student's final score" (TM p. 73; p. 84).
- Content-domain bands (the eight skill bars) use EAP with a **normal** prior, from only the 4–18 items tagged to each domain (TM pp. 84–85).

### Theta to the 200–800 scale

- Sections: SAT 200–800; PSAT/NMSQT and PSAT 10 160–760; PSAT 8/9 120–720. Total = RW + Math, 400–1600 (TM p. 77; Equation 6).
- There are 61 unique scale scores per section, in steps of 10 (TM p. 86). (Inference: so the reported score is always a multiple of 10. The manual describes a table that maps theta ranges to scores, not a rounding rule.)
- The conversion is a **table of theta ranges**, built by **equipercentile linking** of digital MLE theta to paper-SAT scale scores in the 2022 concordance study. That study had 18,513 students in grades 11–12 who took both tests within a month of each other (TM pp. 85–86). College Board tried regression, TCC and EAP linking and rejected them for the final scores.
- The scale was built so that "All items answered correctly convert to the highest obtainable scale score". None correct gives the lowest score (TM p. 85).
- An 8th-degree polynomial of theta "approximately" describes the curve. It is used only to work out SEM and reliability, "not used to determine the reported scale score" (TM p. 86). The coefficients are not published.
- Theta is reported on the range −5 to 5 (TM p. 86).

### Precision: SEM, score ranges, reliability

- cSEM(θ) = 1/√TIF(θ), capped at **1.75** theta. The scale-score cSEM = cSEM(θ) × the slope dSS/dθ. Total cSEM = √(cSEM_RW² + cSEM_M²) (TM pp. 99–100, Equations 10–16).
- **Score report ranges:** "Total: ± 40 points", "Section: ± 30 points" (GSR). USS and TM p. 77 say ranges come "from the standard error of measurement".
- **Simulation RMSE** (TM Table 6.2, scale-score points). Rows are RW adaptive / RW linear / Math adaptive / Math linear:
  - lower route: 21.13 / – / 21.82 / –
  - higher route: 17.66 / – / 19.57 / –
  - overall: 19.47 / 20.56 / 20.73 / 21.03
  - Theta RMSE, same columns: lower 0.41 / – / 0.50 / –; higher 0.26 / – / 0.24 / –; overall 0.34 / 0.35 / 0.39 / 0.29.
- **Simulation bias** (TM Table 6.1, scale points): RW lower −0.69, higher +1.86; Math lower −1.18, higher +0.78; overall RW 0.59, Math −0.20. There is "meaningful bias in the lower region", where guessing affects scores (TM p. 93).
- A student whose true score is 680 would score about 680 on the higher route, but "about 700" on the lower route (TM p. 91). So the easier route over-estimates strong students.
- **HOW (official page) on routes:** "A range of section scores are possible no matter which second module". Figure 2's alt text says the lower-route bars "extend from 200 to slightly above the benchmark in Math". The higher-route bars "begin slightly below the benchmark". "Both bars extend to the top limit of 800" (inference: this most likely means the higher-route bar for each section). The benchmarks are RW 480 and Math 530.
- **Routing accuracy** in simulation: RW 93.20%, Math 93.25% (κ = 0.86). Consistency across two panels: about 90.4% (κ = 0.81) (TM Tables 6.3–6.4).
- To be approved, a panel needs simulated "reliability of 0.90 or greater for each section score" (TM p. 107).
- **Digital vs paper SAT**, same students (n = 6,373): correlations are total .92, RW/ERW .86, Math .90. For comparison, paper test-retest reliability (n = 41,120, March and May 2022) was .93, .88 and .90 (TM pp. 162–163, Table 8.6 and footnote 12).

### Official raw-to-scale tables (linear forms only)

- College Board publishes number-correct conversion tables only for the **paper, nonadaptive** versions of Practice Tests 4–11 (SG4–SG11). Raw scores run 0–66 for RW and 0–54 for Math. Each raw score maps to a **lower–upper section score range**, not a single score. The tables are in `official_linear_conversion.csv`.
- Facts from those tables (see the CSV):
  - Range widths: PT4 is 0–30 points. Later tests reach 60–80 points wide in the middle of the scale.
  - 800 at the top: on PT4–6 Math, the upper bound reaches 800 at 51–52 correct of 54. On PT7–10 the lower bound is 800 only at 54/54. RW upper bounds reach 800 at 65–66 of 66.
  - PT6 RW: raw 41 shows a lower bound of 530 after 540 at raw 40, as printed in the College Board PDF (inference: probably a typo).
- There are no official per-module tables for the adaptive Bluebook tests: Bluebook reports only the scaled score. (Inference: this follows from pattern scoring. Different response patterns with the same number correct can give different scores.)

## 2. Community raw-to-scale data from Bluebook adaptive tests

File: `raw_to_scaled.csv`, 195 rows from 85 sources (84 Reddit threads plus one Applerouth blog post).

- 154 rows are Bluebook practice tests; 91 of these name the test number.
- 21 rows are real SATs, where counts are self-estimates. 20 rows do not say practice or real.
- 56 rows give per-module counts. Only 14 rows state the Module 2 route.

How to read the counts:

- Students count wrong answers out of everything they saw, 27 per RW module and 22 per Math module. That
  includes the 2 unscored pretest questions per module. (Inference: some "wrong" answers had no effect on the score.)
- Most rows say "N wrong, got X" without the module split. The score screenshots were images, so I could not read them.

Practice-test rows by number wrong (score, test number; ? = not named):

- **Math:**
  - 0 wrong: 800 (PT4, PT6)
  - 1 wrong: 800 in 5 reports, 790 in 5, 770 once
  - 2 wrong: 800 in 4 reports, 790 in 4, 760 on PT10
  - 3 wrong: 790 in 5 reports, 760 in 2
  - 4 wrong: 720–780
  - 6 wrong: 710
- **RW:**
  - 1 wrong: 800 (PT5, PT1), 780, 770, and down to 750 (PT1)
  - 2 wrong: 740–770
  - 4 wrong: 710–750
  - 9 wrong: 730–740 on PT11, but 550 once on PT6
  - 14 wrong: 640–670
- **The same count gives very different scores** depending on which questions were missed and in which module.
  - PT4 Math, 4 wrong: 780 for one student and 720 for another.
  - PT6 RW, 9 wrong: 550 against 730–740 on PT11.
  - This matches College Board's statement that the score depends on the pattern of answers, not only the count.

800 with wrong answers:

- Math: 800 with 1 wrong (several, including PT1 and PT2) and with 2 wrong (4 reports, test not named).
  "-2 even on the practice tests is a 800" (one commenter, r/Sat 1badl7u).
- RW: 800 with 1 wrong on PT5 and PT1.

The easier route's ceiling (no student reported their own easier-route result with counts):

- Applerouth: about 620–630 at most on the easier module
  (https://www.applerouth.com/blog/the-complete-guide-to-the-digital-adaptive-sat), and 600 on Test 1
  (https://www.applerouth.com/blog/deep-dive-on-the-4-digital-sat-practice-tests). Elsewhere they mention 650.
- One Reddit commenter said that on Bluebook Test 1 the most they could get on the easier module was 580 Math
  and 560 RW. Reddit claims overall range from the high 500s to 650.
- College Board's own figure: the lower route goes up to "slightly above the benchmark" (Section 1).

Applerouth Test 1 data points (deep-dive post above):

- RW: lower route with 43 correct gave 560; higher route with 30 correct also gave 560.
- Math: higher route with 15 correct (all in Module 1) gave 460.
- RW: missing only #25 gave 780; missing only #23 gave 750.

Routing (file `routing_observations.csv`, only 10 rows, mostly real-test guesses):

- Too few rows to estimate the cut. Applerouth says about 2/3 of Module 1 correct reaches the harder module.
- One Reddit commenter said 17–20 right in RW Module 1 could go either way on Bluebook Test 1.
- The engine's note says 19 of 27 right routes RW harder and 18 routes easier. I did not find that source
  in this pass.

## 3. Paired practice and real scores

File: `paired_scores.csv`, 1,083 rows from 112 Reddit threads (2023-03 to 2026-11).

- **practice_kind** says what the practice number is:
  - `single` (716 rows): one score
  - `best` (69), `range` (104), `list` (57), `average` (42) and `approx` (89)
  - practice_total is filled only for `single`
- **real_may_be_paper_us = 1** (13 rows): the thread is from before March 9, 2024, when the US SAT was still on paper, and the comment doesn't say the test was digital.
- **Same person, two comments:** rows that link a practice score and a real score from different comments by what looks like the same person say so in note.
- **Practice source unstated** (in note): the thread didn't name Bluebook.
- **Source errors kept as written:**
  - two rows where the sections don't add up to the total (1gtij4m/lxmk4aa practice; 1bkqfq9/kw1zasp real)
  - one PSAT-practice row

Quick statistics (my calculation; `single` rows with both totals, not flagged paper, no PSAT; n = 649):

- **Real minus practice:**
  - mean +1.7, median 0, SD 84.9
  - mean absolute gap 64 points
  - 38% within ±30, 53% within ±50
  - Pearson r = 0.62 (mean practice 1454, mean real 1456)
- **Named test number (n = 374):** mean +6, SD 77, MAE 58.
- **By test** (mean difference):

  | Test | n   | Mean difference             |
  | ---- | --- | --------------------------- |
  | PT1  | 26  | +66                         |
  | PT2  | 20  | +43                         |
  | PT3  | 19  | −3                          |
  | PT4  | 33  | +3                          |
  | PT5  | 46  | −26                         |
  | PT6  | 97  | +18                         |
  | PT7  | 37  | +12 (MAE 42, 70% within 50) |
  | PT8  | 9   | −19                         |
  | PT9  | 12  | −40                         |
  | PT10 | 18  | −14 (MAE 37, 78% within 50) |
  | PT11 | 57  | −7                          |

- **Strong regression to the mean:**

  | Practice score | n   | Mean difference (real − practice) |
  | -------------- | --- | --------------------------------- |
  | under 1350     | 85  | about +94                         |
  | 1350–1450      | 151 | +24                               |
  | 1450–1520      | 220 | −3                                |
  | 1520+          | 193 | −51                               |

  (Inference: that is what noise plus self-selection produces. It is also the pattern the TestAdvantage PT11 study found.)

- **Practice within 7 days of the real test (n = 68):** mean +35, SD 69.
- **Sections** (rows with both section scores):
  - RW: n = 135, mean +8, SD 43, 84% within ±50
  - Math: n = 138, mean +3, SD 55, 73% within ±50
- **Caveats:**
  - Reddit posters skew to high scores (mean about 1455).
  - People choose which practice score to report.
  - Much of the gap is real learning between the two tests.
- (Inference: if the two scores carried equal independent error, the SD of 85 would mean about 60 points of error on each total. That is wider than College Board's ±40 report range, because of learning, test-day effects and self-selection.)

## 4. How well Bluebook practice scores predict the real SAT

- **College Board (HELP):** a practice test score is "highly indicative of what that student will score". It says this is most true when the practice test is taken within a couple of weeks of the real SAT, under the same timing. It also says many practice tests were once used in real SAT administrations.
- **CBR25** (March 2024 SAT School Day, class of 2025, N = 148,154 in the analytic sample) does not measure predictive accuracy. It reports score gains linked to doing practice tests: 25.7, 45.5 and 61.4 points for 1, 2 and 3+ full-length tests, against matched students who did none. At PSAT = 900 the gains were 29.4, 53.4 and 79.0. The authors say these "Estimates are not causal". In a survey cited there, 64% of SAT takers used full-length practice tests and 93% of those found them helpful.
- **Community survey: TheTestAdvantage "September 2026 SAT Scores Released: Reddit Report"**
  (https://thetestadvantage.com/blog/september-2026-sat-scores-released-reddit-report). The authors checked each score against the original comment. The sample "skews high", so it is not a national curve.
  - **Practice Test 11 vs the real September 12, 2026 SAT, n = 83 students:**
    - median PT11 1480; median real 1500; median difference **+10**
    - real higher 44, same 10, lower 29
    - 48 of 83 (58%) within 50 points
    - 22 students were 60+ points higher, 13 were 60+ points lower
    - PT11 under 1500 (n = 48): median real change +45. PT11 1500+ (n = 35): median −10
  - Expected vs actual (n = 43): median −10; 26 of 43 within 50 points.
- **r/Sat moderator surveys** (self-selected, high-scoring respondents; file `survey_correlations.csv`):
  - March 2024 survey (https://www.reddit.com/r/Sat/comments/1c28iyv/). Correlations between official and practice section scores:
    - RW: r = 0.61–0.72 (Bluebook 1–4, n = 145–235, all March students)
    - Math: r = 0.60–0.65
  - March 2025 survey (https://www.reddit.com/r/Sat/comments/1ko0w1i/). Correlations for Bluebook 4–10:
    - RW: r = 0.47 (PT7) to 0.82 (PT9)
    - Math: r = 0.50 (PT9) to 0.69 (PT5); n = 60–134 per test
  - In 2025, the average practice Math score on PT7–10 (740–754) was well above the official March average of 722. For RW, PT8–10 averaged 725–730 against 714 official. (Inference: the later practice tests were easier or more practiced. The subsets differ from the whole sample, so this is suggestive only.)
  - These correlations are range-restricted. Most respondents scored above 650, which pushes r down.

## 5. What contradicts or supports the Karman engine (`src/lib/sat-engine/`)

Supports (the engine matches College Board):

- 3PL for multiple-choice and 2PL for typed answers, D = 1.
- Pattern scoring with MLE (Newton) for the final score.
- EAP for routing: uniform prior on [−5, 5], 101 points, Module 1 operational items only.
- Routing cut at the median student.
- 2 pretest items per module, left out of scoring.
- 25+2 RW and 20+2 Math items per module.

Differences or risks to check:

1. **The theta-to-score curve.**
   - College Board maps _its own_ calibrated theta metric to scores, using a table built by equipercentile linking to paper-SAT scores (TM p. 86).
   - The engine's curve was fitted from number-correct tables. (Inference: those are likely the linear Practice Test tables in `official_linear_conversion.csv`, which give score _ranges_.)
   - It is applied to a theta scale whose meaning comes from Karman's cold-start difficulty ratings. If Karman's theta is not on College Board's metric, the curve will be off however good the curve is.
   - The paired-score and raw-score data here are the best way to check it.
2. **The top of the scale.** College Board: all correct gives the highest score, 800, and the scale has 61 values in steps of 10. The engine's knots stop at about 798 (Math 797.5). Check that rounding still gives 800 for a perfect section.
3. **Score range.**
   - The engine uses ±1 SE.
   - College Board's printed report says ±30 per section and ±40 total (GSR).
   - The official linear tables give ranges 20–80 points wide.
   - College Board's own cSEM caps theta SE at 1.75.
4. **Easier-route ceiling.** College Board's figure and the community put the easier route's maximum just above the benchmark, about 560–650 depending on test and section. The engine's simulation should not let easier-route students score far above that.
5. **Bias near the bottom of the scale.** College Board's simulation shows "meaningful bias in the lower region" from guessing, and a lower-route over-estimate near 680 ("about 700" for a true 680). These are known properties of the official design, not things to fix.
6. **Practice tests are not all equally hard.** Community pairs suggest PT1–2 under-predict real scores (real is about 40–65 higher) and PT5/PT9 over-predict (real is about 25–40 lower). Inference: older tests, more practice, and more studying before later tests all confound this.

## Data-collection notes

- **Reddit:** reading posts directly was blocked (HTTP 403, "blocked by network security"). The page-text search service ran out of its free allowance partway through.
  - Thread text came from the Arctic Shift public Reddit archive (https://arctic-shift.photon-reddit.com).
  - Raw thread text is in `raw/threads/` (428 threads), with usernames left out.
  - Rows were extracted by several helper agents following `scripts/EXTRACTION_RULES.md`. I spot-checked 14 random paired rows against the source text, and all matched.
- **Screenshots:** many score reports on Reddit are screenshots and could not be read. That is the biggest gap for raw-to-scaled data.
- **Sources found but not used as data:** third-party "score calculators" (for example realsatscorecalculator.com, satcalculator.co). They are model estimates, not observed Bluebook results.
