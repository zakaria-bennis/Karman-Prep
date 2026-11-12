# Bluebook scoring data — sources tried (collected 2026-11-12)

Access notes: Reddit (www/old.reddit.com) is blocked to this session (WebFetch SITE_BLOCKED, search filter rejected); per instructions no Reddit mirrors (redlib etc.) were used. Quora, College Confidential and Zhihu refused fetching (robots). YouTube serves a bot page (metadata only). Direct curl egress is blocked; everything below came through WebSearch/WebFetch (page reader is an LLM; numbers were cross-checked where possible).

## Sources with usable numbers (in datapoints.json / other JSON files)

- https://www.testdaily.cn/103844/ — BEST. TestDaily deliberate-answer experiment on Bluebook PT7 (2025-04-11): per-item point values (RW M1 10–20, RW M2-hard 0–30, Math every item 10), unscored item numbers, routing thresholds, hard floors/easy ceilings with exact M1/M2 counts, multi-miss combos. Per-question charts are images (not readable).
- https://www.testdaily.cn/76855/ — PT1 worked examples (Math 460/460/540/650, RW 560/580), ceilings (2023-04-08).
- https://www.testdaily.cn/76518/ — PT4: teacher missed 1 RW item -> 750 (1550). Their PT1 per-question tables (20+ runs, all M1 correct, 1–2 M2 misses) are images only.
- https://www.applerouth.com/blog/deep-dive-on-the-4-digital-sat-practice-tests — PT1: RW missing M2-hard #25 -> 780, #23 -> 750; 43 correct easy = 560 vs 30 correct hard = 560; Math 15 correct/0 in hard = 460. Student tables are images.
- https://applerouth.com/blog/first-impressions-of-the-new-digital-sat — 2022 beta test: Math routing 15/22, hard floor 460, easy max ~650 (36/44); RW routing 18/27 (Summit Education).
- https://num8ers.com/guides/digital-sat-scoring-adaptive-modules/ — PT1 "historical examples" with M1/M2 splits (RW 20+23=660 hard vs 18+25=560 easy; Math 14+21=640 vs 13+22=540).
- https://www.edisonos.com/digital-sat/scoring-algorithm — author's PT1 trials (10 points, both sections, both routes); some conflicts with other PT1 sources.
- http://bj.xdf.cn/vip/zd/134002.html — New Oriental, first Bluebook practice test (2022): 5 RW wrong ≈720; outlier routing thresholds.
- A shared EdisonOS Bluebook Insights report (link left out because it is one student's report) — one real student Bluebook report shared via EdisonOS "Bluebook Insights" (test not named, pre-Nov-2024): RW 24+16 hard = 650, Math 22+17 hard = 760. No other shared reports are indexed.
- https://satsuite.collegeboard.org/media/pdf/scoring-sat-practice-test-{4..11}-digital.pdf — OFFICIAL paper/linear raw->scale tables for PT4–11 (66 RW / 54 Math questions; NOT adaptive). Stored in cb_paper_linear_tables.json. PT1 URL returned a page without the table. PT6 PDF has 3 tables (Math columns differ); PT8 PDF has 2 tables (one = PT7's).
- https://thetestadvantage.com/blog/hardest-bluebook-practice-test — comparison of the paper tables at 10 misses (used as cross-check; matched all 8 tests).
- https://www.jingsailian.com/liuxue/236837.html — 2022 sample-test runs: RW >=14 correct routed hard; anomaly (17 hard, 18 easy); easy cap ~600.
- https://www.alphatestai.com/blog/161-digital-sat-scoring-decoded-2026-strategy-for-minimizing-point-loss — PT7 ceiling/floor table identical to TestDaily (likely derivative).

## Ceiling/floor/threshold claims only (route_ceilings_floors.json)

- https://www.applerouth.com/blog/the-complete-guide-to-the-digital-adaptive-sat — easy cap 620–630; hard range 450–800.
- https://blogs.learnq.ai/sat-score-ceiling/ — Piqosity numbers: RW ~18/27, Math ~13/22; easy ~590; hard floor ~450.
- https://www.piqosity.com/?p=12419 — staff comments: ~10 pts/correct, ~130-pt hard bonus, floor ~450, easy ~590/~550.
- https://www.piqosity.com/?p=14759 — Piqosity changed its own routing model (RW 80%, Math 70%) on 2025-03-13; no CB data.
- https://www.panoedu.org/post/how-your-digital-sat-score-is-calculated — RW easy cap 570–600; 5–6 M1 errors can still reach hard.
- https://www.ivystrides.com/blog/digital-sat-module-1-score-ceiling/ — coaching estimates.
- https://satprepin.com/digital-sat-score-calculator-new-and-insanely-powerful/ — Math easy cap 580; 15/22 threshold; averaged calibration.
- https://prepgenix.com/blog/bluebook-scores-vs-real-sat/ — model easy caps RW 650 / Math 670.
- https://prepdrills.com/digital-sat-score-calculator/ — blends paper tables PT4–11; routing 17/27, 14/22 "community-derived".
- https://www.northamericantutors.com/blogs/the-module-2-cliff-why-your-sat-score-dropped-80-points-despite-acing-module-1 — easy cap 560–600; secondary estimates.
- https://www.edisonos.com/digital-sat/are-the-bluebook-practice-tests-accurate — anecdote: older tests 6 wrong -> 760, newest 6 wrong -> 720 (tests unnamed).
- https://getsharp.app/blog/how-many-questions-can-you-miss-sat — miss budgets derived from paper tables; accuracy-by-difficulty from imported Bluebook results (no per-score data).

## Tried, no usable per-test numbers

- https://thetestadvantage.com/blog/digital-sat-practice-test-2-adaptive-branch, .../bluebook-practice-test-10-complete-guide, .../digital-sat-practice-test-4-complete-guide — structure/answer keys only.
- https://scorenfo.com/sat-practice-test-10-scoring-guide/, .../sat-practice-test-6-scoring-guide/ — generic 600–650 easy cap, no tables.
- https://test-ninjas.com/digital-sat-score-calculator — generic approximate table (not per test/route).
- https://www.cheetahprep.com/tools/digital-sat-score-calculator — generic approximate table.
- https://satcalculator.co/sat-practice-test-score-calculator — claims per-test curves for PT1–6, none published.
- https://satscorecalculators.com/sat-practice-test-5-score-calculator/ — paper table only.
- https://www.sigmaprep.io/sat-math-how-many-can-you-miss — miss table from its OWN (non-Bluebook) test.
- https://www.tutelaprep.com/v2/blog/adaptive-testing-on-digital-sat-/ — none.
- https://www.mysatcoach.com/guide/bluebook-practice-tests-difficulty-ranked — anecdote PT7 1560 / PT6 1570 / real 1450, no breakdown.
- https://blogs.learnq.ai/are-bluebook-practice-tests-accurate/, https://www.larrylearns.com/blog/which-sat-practice-test-is-most-accurate, https://acely.com/blog/bluebook-sat-practice-tests-vs-actual-exam-easier-or-harder, https://galvanizetestprep.com/blogs/digital-sat-practice-bluebook-vs-real-test-what-works-2026/ — practice-vs-real gap claims, unsourced.
- https://www.edisonos.com/blog/understanding-digital-sat-curve-scoring-format, https://www.edisonos.com/digital-sat/adaptive-testing, https://www.edisonos.com/digital-sat/how-sat-scores-are-calculated (EdisonOS's own model, hypothetical), https://open-exam-prep.com/study-guides/sat-math/introduction/exam-structure-routing, https://piqosity.com/digital-sat-deep-dive-overview/, https://www.alphatestai.com/blog/143-are-bluebook-tests-adaptive-understanding-the-section-adaptive-algorithm-and-scoring-risks — general claims only.
- https://www.testdaily.cn/95720/, https://www.testdaily.cn/95185/ — difficulty notes for PT5/6, no scores.
- https://mathchops.substack.com/p/what-can-the-first-four-sats-from — content analysis only.
- https://dsat16-blog.web.app/post/new-sat-tests-analysis — readability metrics only.
- https://research.collegeboard.org/media/pdf/DigitalSATPracticeTests_052025.pdf — CB research: practice-test takers gain ~26/46/61 pts (1/2/3+ tests), N=148,154; no scoring info.
- https://manifold.markets/WLSerene/what-will-i-get-on-the-september-sa — "~1580 on bluebook mocks", real 1550 (750/800); no breakdown.
- https://www.youtube.com/watch?v=9JFmKINPa2M — bot page; walkthrough, no scores.
- https://www.scribd.com/document/911928848/Module-2-Report — not a Bluebook report.
- Blocked/refused: reddit.com (SITE_BLOCKED; reddit-domain search rejected), zhuanlan.zhihu.com/p/614276909 and /p/1914373009109684877 (robots), talk.collegeconfidential.com (robots), quora.com (robots).
