# Skill levels (`src/lib/levels`)

The one student-facing measure of a skill. For the student-portal session, which displays
levels, and anyone who writes answers.

## The levels

| Level | Name          | How a skill gets there                                          |
| ----- | ------------- | --------------------------------------------------------------- |
| 0     | Not started   | No answer yet. An empty outline square.                         |
| 1     | New           | The first try, right or wrong.                                  |
| 2     | Learning      | 3 right in a row, without a hint, since reaching New.           |
| 3     | Understanding | 4 right in a row, without a hint, since reaching Learning.      |
| 4     | Conquered     | 5 right in a row, without a hint, since reaching Understanding. |

- Names, run lengths and colors come from `SKILL_LEVELS` in
  `src/components/portal/skill-levels.ts`. Draw squares with `SkillSquares`.
- **The run** counts right answers in a row in one skill, across the Daily 10 and practice
  sets. A wrong answer or a hint ends it. Each level needs its own run: the run starts again
  at 0 after a level-up, so New to Conquered takes at least 3 + 4 + 5 = 12 right answers.
- **Wrong answers never take a level away.** Only decay does.
- **Decay:** `DECAY_WEEKS = 4`. After 4 weeks without an answer in a skill, it drops one level;
  each further 4 weeks drops another. It never drops below New, and a decayed skill starts its
  run again. Decay is worked out when the level is read (`effective`) and saved with the next
  answer, so no job has to run.
- **Mixed check-ins bring old skills back:** the Daily 10 includes a spaced review of skills at
  Learning or above (after 3, 7 and 14 days for Learning, Understanding and Conquered), before
  decay would take them down.

### Which flows move levels

- **Daily 10 and practice sets:** every answer, by the run rule above.
- **Domain quiz (about 12 questions):** the quiz rule. When the quiz ends, each skill it covered
  moves up **at most one level**, and only if it had at least two questions and every one was
  right without a hint. Any miss or hint ends that skill's run. This is how one quiz can raise
  several skills at once.
- **Full-length tests and the diagnostic:** they measure; they never move levels. They mark a
  skill as tried (New) and as practised, so it does not decay.

## One model with points and mastery

- **Levels** are the only skill status a student sees. The older mastery bands
  (`BAND_LABEL` in `src/lib/student/mastery.ts`: Needs work, Developing, Proficient, Mastered)
  must not be shown next to levels: they mean something else.
- **Mastery (`estimateSkill`)** stays internal: the Daily 10 uses it to put weak skills first.
- **Points are tokens.** `student_point_awards` (10 per right answer, 15 from difficulty 5)
  is the one store. Tokens show only on result screens (and Rewards / Progress).

## API

```ts
import { loadSkillLevels } from "@/lib/levels/server"; // server only

const levels = await loadSkillLevels(clerkId);
// [{ skillId, label, subject, domainId, domainLabel, level, run, lastPracticedAt, decaysAt }]
// One row per catalog skill, decay applied as of now.
```

Pure rules (safe anywhere): `applyAnswer`, `applyQuizSkill`, `applyMeasured`, `effective`,
`runToNext`, `nextDecayAt`, `DECAY_WEEKS` / `DECAY_DAYS` in `./rules.ts`. For readers that only
have raw answers: `levelFromHistory(answers, now)` (and `foldAnswers`).

**This is the only copy of the rule.** The student portal (`src/lib/student/levels.ts`), the
parent and school glance (`src/lib/progress-glance/levels.ts`) and the tutor roster
(`src/lib/tutor-affiliate/progress.ts`) all call it, so every portal shows the same level for
the same answers. Do not restate the thresholds or the decay anywhere else.

Storage: `public.student_skill_levels` (student_id = Clerk id, skill_id = catalog skill id,
level 0 to 4, run, answered, last_practiced_at). Migration
`supabase/migrations/20261108120100_quiz_runs_levels_challenge.sql`.

## Where the flows live (for links)

| Flow                        | Route                           |
| --------------------------- | ------------------------------- |
| Daily 10                    | `/learn/daily-ten`              |
| Practice set (10, adaptive) | `/learn/set/<catalog skill id>` |
| Domain quiz (about 12)      | `/learn/domain/<domain id>`     |
| Full-length practice test   | `/learn/test/<1 to 4>`          |
| Diagnostic (from the bank)  | `/learn/diagnostic`             |
| Tests and quizzes hub       | `/learn/tests`                  |

The Daily 10 streak for the shell's flame: `dailyTenDays(clerkId)` in
`src/lib/assembler/run-store.ts` with `streakDays(days, today)` in `src/lib/daily-ten/day.ts`.
