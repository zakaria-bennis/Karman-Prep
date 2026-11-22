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

| Batch   | Time  | Count | What changed                                         | Checks                                                     | Result                                      |
| ------- | ----- | ----- | ---------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| pilot-5 | 11:28 | 5     | explanation, hint, per-choice text cleared; resealed | writer, checker, automatic; then the app's own pool reader | 5 replaced, 5 of 5 still served to students |
