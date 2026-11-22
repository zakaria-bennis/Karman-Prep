# Question bank publish log, 2026-11-22

The Bank stream's writes to the live question bank during the overnight build. The founder approved
writing without asking per batch, once each batch passes two independent checks (memory note
`project_overnight_build_nov22.md`). Times are UTC.

**Backup before any write:** 10:27, in `/Users/zakariabennis/Karman-Prep-backups/2026-11-22/bank-before`
(quiz_questions 11,848 rows, answer_choices 42,060, answer_key_entries 11,195; `manifest.json` holds
each file's sha256). Live database size before: 153 MB.

**What each explanation batch passed:** a writer helper (full teaching in the founder's format), an
independent checker helper that recomputes the math and checks every step and every wrong choice, and
the automatic checks in `scripts/bank/check-explanations.ts` (format, KaTeX, no letters, the stated
answer is the key, every wrong choice named, the hint gives nothing away). Every question is resealed
in the same step (`scripts/bank/publish-explanations.ts`) and read back.

| Batch       | Time  | Count                   | What changed                                                                                                                             | Checks                                                                                                                        | Result                                                                                                            |
| ----------- | ----- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| pilot-5     | 11:28 | 5                       | explanation, hint, per-choice text cleared; resealed                                                                                     | writer, checker, automatic; then the app's own pool reader                                                                    | 5 replaced, 5 of 5 still served to students                                                                       |
| tags-01     | 18:55 | 9,829                   | question_skills72 rows, both classifiers agreed                                                                                          | two independent blind classifiers (Opus and Sonnet)                                                                           | written; 804 disagreements wait for the judge                                                                     |
| batch-01    | 20:37 | 1,367                   | explanation, hint, per-choice text cleared; 1,346 resealed, 21 had no seal before and none after                                         | writer, independent checker, automatic checks; 12 random questions through the app's pool reader                              | 1,367 replaced, 12 of 12 still served; database 156 MB to 160 MB                                                  |
| keycheck-01 | 20:47 | 10,633 checked; 54 held | 37 live questions hidden through the admin flag path (17 held ones were already hidden); 10,633 short check rows in question_bank_checks | two blind solvers per question (Opus and Sonnet, never shown the key), a third adjudicator for 233 mismatches (Math computed) | 10,399 confirmed by both solvers, 180 kept after adjudication, 54 held (docs/bank/2026-11-22-held-for-founder.md) |
