# merge-ui report

Branch: `claude/overnight-merge-ui-55cc0d` (cut from `claude/overnight-ship`).
Nothing pushed, nothing deployed, main untouched, no database touched.

## What I did

I merged the student-facing work into one branch so the portal builders can
start on top of it. Five branches went in. The rest were already in, were
replaced by newer work, or belong to the other merge session.

## Every branch and what I decided

| Branch                                           | Decision                    | Why                                                                                                                                                                                                                        |
| ------------------------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude/figure-engine-gaps-3`                    | Merged                      | Newest figure work (Nov 8, 04:17). New optional figure options; old figures draw the same. No conflicts.                                                                                                                   |
| `claude/quiz-engine`                             | Merged                      | The real quiz engine: one shared quiz screen with the pencil, highlights, navigator, timer and rewards. Daily question, skill practice, catalog practice and the diagnostic all open on it. 5 conflicts, resolved (below). |
| `claude/quiz-engine-spec`                        | Merged (inside quiz-engine) | Every commit is already part of `claude/quiz-engine`.                                                                                                                                                                      |
| `claude/student-dashboard-13d0a0`                | Merged                      | Student dashboard preview, Time Trials, mastery and skill points, locked and scheduled states. 1 conflict, resolved.                                                                                                       |
| `claude/cal-route-matcher`                       | Merged                      | Bug fix: only the real Cal sign-in routes skip sign-in, not every address starting with `/api/cal`.                                                                                                                        |
| `claude/calendar-ics-feed`                       | Merged                      | A private calendar link students and parents can add to Apple or Google Calendar. Its database file was renamed (below).                                                                                                   |
| `claude/figure-render-fixes`                     | Skipped, already in         | Went to main as PR #223.                                                                                                                                                                                                   |
| `claude/em-dash-display`                         | Skipped, already in         | PR #224.                                                                                                                                                                                                                   |
| `claude/figure-render-fixes-2`                   | Skipped, already in         | PR #225.                                                                                                                                                                                                                   |
| `claude/dash-blank-display`                      | Skipped, already in         | PR #226.                                                                                                                                                                                                                   |
| `claude/hyphen-spacing-display`                  | Skipped, already in         | PR #227.                                                                                                                                                                                                                   |
| `claude/render-fixes-3`                          | Skipped, already in         | PR #228.                                                                                                                                                                                                                   |
| `claude/figure-render-fixes-3`                   | Skipped, already in         | PR #229.                                                                                                                                                                                                                   |
| `claude/currency-one-word`                       | Skipped, already in         | PR #230.                                                                                                                                                                                                                   |
| `origin/claude/figure-engine-gaps`               | Skipped, already in         | PR #242.                                                                                                                                                                                                                   |
| `origin/claude/figure-engine-gaps-2`             | Skipped, already in         | PR #243.                                                                                                                                                                                                                   |
| `origin/claude/figure-engine-spec`               | Skipped, already in         | PR #236.                                                                                                                                                                                                                   |
| `origin/claude/solid3d-bluebook`                 | Skipped, already in         | Merged with the figure engine round 2 (#239).                                                                                                                                                                              |
| `origin/claude/sat-decimal-grading`              | Skipped, already in         | PR #231.                                                                                                                                                                                                                   |
| `claude/figure-studio-experiment`                | Skipped                     | An unused experiment: a second, shaded figure style that no screen uses (Bluebook style stays the default). It also conflicts with newer figure work.                                                                      |
| `claude/gracious-dirac-148d1f`                   | Skipped                     | Not student-facing: the Oct 23 site film mocks and design notes, replaced by the live site rebuilt on Oct 26.                                                                                                              |
| `origin/zakaria/portal-vocabulary-next-release`  | Skipped                     | Oct 8 weekly parent portal and "study week" calendar. Tonight's portal rebuild replaces these screens, the "week" layout goes against the Nov 7 student rules, and it conflicts in 6 files.                                |
| `origin/zakaria/portal-reviewed-current-release` | Skipped                     | The same 8 changes as the branch above, on an older base.                                                                                                                                                                  |

No branch from a "Quiz engine animation analysis" session exists. That session
worked in the main checkout, whose work sits on `claude/first-pass` (the
merge-rest session's scope). The quiz animations themselves (rewards, level-up
card, sounds, motion) are part of `claude/quiz-engine`, which is merged.

## Conflicts I resolved with judgment

- **Daily question screen and skill practice screen.** The live branch had
  added the new figure engine to the old daily screen. The quiz engine replaced
  that screen with its shared quiz screen. I kept the shared quiz screen and
  moved the figure-engine wiring into it, so drawn figures, figure answer
  choices and table choices still show inside the quiz.
- **Daily question server.** I kept the live branch's version (it draws from the
  whole question pool) and added the quiz engine's points for signed-in
  students. Points now go to the skill the question was drawn from.
- **Practice sessions.** Kept both the live branch's clock and the quiz engine's
  points. A practice closed early still says "Practice closed".
- **Theme switch.** Kept the live site's page list and added the new
  `/student-preview` page.
- **Calendar sign-in rules.** Kept both new safety tests.
- **Database files.** The calendar feed's file had the same number as an
  existing one (`20261026120000`). Two files with one number clash, so I
  renamed it to `20261026120001_calendar_feed_tokens.sql`. The quiz engine's
  files (`20261028000001` to `3`) and the dashboard's (`20261028000010`) sort
  before two newer ones that are already live. That is fine: the production
  deploy step uses `--include-all`, and a fresh database applies them in order.

## Checks

Run on this branch after all merges (04:30 to 04:40 CST):

- `npx tsc --noEmit`: passes.
- `npm run lint`: passes. The only errors were in `prototypes/` (from the
  painting prototype commit). I now ignore `.wrangler/`, `tmp/` and
  `prototypes/` exactly as the merge-rest branch does, so the two merge cleanly.
- `npm run format:check`: fails only on files that came with the base branch:
  16 files in `prototypes/`, `docs/overnight/BRIEF.md` and two student portal
  design docs. Every file I touched is formatted.
- `NODE_OPTIONS=--no-experimental-webstorage npm test`: 9,316 passed, 7 failed
  in the full run.
  - 3 failures came from the merge: tests still looked for the old daily
    question screen. I updated them for the shared quiz screen. They pass.
  - 4 timed out because the machine was busy (load about 18 on 12 cores): two
    calculator tests, the calculator recursion corpus and one chart-width
    test. Each passes when run on its own.
- `npm run check:sizes`: passes.
- Quiz shell browser tests (`playwright.quiz.config.ts`, Chrome and iPhone, on
  port 3101): 105 passed.
- A trial merge of this branch with `claude/overnight-merge-rest-f41847`
  (as of 04:40) has no conflicts.

Click-through in the real app: not yet done. The local database file (`overnight.env.local`) did not exist yet at 04:41. I will add the result here once it does.

## Decisions I made

- Skipped the figure "studio" style experiment and the Oct 8 weekly portal
  branches (reasons above).
- Added `.wrangler/**` to the lint ignore list, as the brief asked.

## What the founder may want to decide

- Whether the Oct 8 weekly parent portal (`zakaria/portal-*-release`) is still
  wanted. I left it out because tonight's parent portal replaces it.
- Whether the figure "studio" style is still of interest. It is kept on its
  branch.
