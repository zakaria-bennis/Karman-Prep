# Where things stand, and what comes next (2026-11-18)

Written at the end of a very long session, so a new one can start cold. The founder's plan, in his words:
"work on the rest of the portal from there, and then wire it properly, and then swap."

Read with `prototypes/HANDOVER-portal-2026-11-14.md` (every screen's detail) and the memory notes
`feedback_quiz_engine_nov17.md`, `project_quiz_engine_open_items.md`, `project_student_portal_spec.md`.

## What is live on karmanprep.com

- PR 302 (merged 2026-11-17): the new portal's code at `/dev/shell`, chat, schedule, the frosted quiz engine,
  answer recording and question guards, the calculator on the quiz's glass. Four migrations applied.
- PR 303: `/portal` sends each account type to its own portal (`src/app/portal/route.ts`,
  `src/lib/auth/portal-home.ts`). PR 305: faster sign-in screen, safer loop-breaker.
- **Sign-in works again.** Nobody could sign in on the live site because the Worker's `CLERK_SECRET_KEY` was
  the old test key. Fixed 2026-11-18 with the live key. Details and how to test without an account are in the
  memory note `reference_repo_workflow.md`.
- The quiz engine IS live: `/learn/set/<skillId>` and the other quiz flows use the new shell.

## What is NOT live: the new student portal

`/dashboard/student` on the live site is still the OLD portal. The founder saw it after signing in and called
it "very ugly". The new portal is the design page `src/app/dev/shell/` and is not connected to real students.
It must not be pointed at real students yet, because most of it shows made-up data:

| Screen | State |
| --- | --- |
| Library | Skills from the approved list; levels and counts are stand-ins; Start buttons open nothing |
| Progress | Every number, the predicted score and the calendar are made up (`progressData.ts`) |
| Mistake Log | Every sitting and answer is made up (`mistakeLogData.ts`) |
| Rewards | Coins, prices and items are made up |
| Homework | All made up; pressing work leads nowhere |
| Schedule | Built on stand-in sessions; Zoom links not hooked up |
| Chat | Connected to real messages when signed in with a class or tutor; made-up classmates when not |
| More, account menu | Built; Settings and the test date are not |

Known blocker for the Library: the portal shows 72 skills, the question bank has 39 skills and 92 sub-skills,
and there is no mapping between them. Making one is the founder's decision (no retagging without his say).

## The order he asked for

1. **Finish the rest of the portal's design** (what is left of the screens above, with him, one at a time).
2. **Wire it properly:** each screen reads the signed-in student's real data. Suggested order: Library and its
   Start buttons (opens the live quiz engine), Progress, Mistake Log, Homework, Rewards, Schedule.
3. **Swap:** point `/dashboard/student` at the new portal when a student would see only true things.
   A possible step before that, offered and not yet answered: show the new portal to his admin account only.

## Quiz engine: the eight open items (he asked for this list to be kept)

1. Pen: easier drawing, erasing and undo, in the quiz's glass style.
2. Highlighter: easy removal and notes, same style.
3. The expanded question selector: not redesigned.
4. Endless mode's bottom bar: dots growing from one to ten (no endless mode in the engine yet).
5. Calculator memory per question, and per bookmarked question.
6. Glass tints as themes in Rewards.
7. Calculator screens: table cells, sliders, regressions, statistics, error tips.
8. The "like button" he dictated once; never clarified.

Waiting on his word: answer shuffling (explanations name choices by letter), sign-up limits, one question at a
time. He said no to a daily cap, canary questions and the leak lookup tool.

## Loose ends

- **PR 304 is open, not merged:** the quiz follows the saved light or dark choice (`QuizWorld.tsx`). This
  handover file rides on the same branch.
- **Calculator browser tests** (`npm run test:calculator`): about 18 `quiz-*.spec.ts` tests still look for the
  title-bar buttons he had removed (Undock, Close) and need rewriting. `editor.spec.ts:132` expects 5px where
  the CSS has 6px (old). The bundled test browser is not installed here; see the workflow memory note.
- **Privacy:** students are minors; the live quiz records how they answer and carries a hidden mark. The
  privacy policy and the lawyer have not covered it. Raised three times, not answered.
- Eight older pull requests from other sessions are still open (#256, #258 to #261, #263, #279, #281), and
  #296. Do not merge them without his say.
- Local test copy: the `chat-local` dev server on port 3000 uses a local database with fake accounts; safe for
  answering quizzes. Sign-in cannot work on localhost (live keys only work on karmanprep.com).
