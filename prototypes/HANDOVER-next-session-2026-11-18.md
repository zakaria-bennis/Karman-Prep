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
| More, Account | On a phone More turns the bar like a carousel (below); Account is Settings (below) |

Known blocker for the Library: the portal shows 72 skills, the question bank has 39 skills and 92 sub-skills,
and there is no mapping between them. Making one is the founder's decision (no retagging without his say).

## The phone's More is a carousel (2026-11-18)

There is no More page. Pressing More slides the bar's first four pictures out at the left, carries More to
the left end, and brings in what the five had no room for, ending in the profile picture (Account). Pressing
More again turns it back. The second set holds at most four beside More. Rules and positions are in
`src/app/dev/shell/moreBar.ts` (tested); the hooks are in `useBar.ts`; `More.tsx` now holds the Account page
and the desktop account menu. Free, Practice and Pro have only Account behind More: he has not said whether
More should simply be Account there. Awaiting his verdict.

With nothing tucked away (Free, Practice, Pro) the profile picture takes More's place and the bar
never turns. The Mistake Log's icon is a history clock that winds back on hover (he found the
notepad too close to Homework's).

## Settings (2026-11-18), first version, awaiting his verdict

The Account page is Settings (`Settings.tsx`, `SettingsPanes.tsx`, `settingsControls.tsx`,
`settings.module.css`). On a phone: the student, nine folders (Profile, Your SAT, Sound, Appearance,
Quiz, Notifications, Plan, Calendars, Help), Sign out; a folder opens as its own page with a back
pill. On the desktop the profile menu's Settings opens it with the folders at the left and the open
one beside them. His list of what goes in and what stays out is in the memory note
`project_decisions_nov18.md`.

- **Controls** are our own and on springs: a switch whose knob stretches while held, a slider that
  follows the finger and springs onto its step, a tray with one sliding pill.
- **Really works today:** light or dark, text size (the pages are drawn larger with CSS `zoom`; the
  menu keeps its size), Transparency (it sets `--frost-k`), Reduce motion (the site's own switch in
  `src/lib/painting/motion.ts`), sounds and their volume, extra time (Progress's pacing goal reads
  it), night music with its volume, piece and "start by itself" time.
- **Night music is four placeholder pieces made in the browser** (`music.ts`: slow piano, soft
  strings, rain, music box). He will choose the real ones. The 8 PM music banner (`MusicOffer.tsx`)
  still keeps its own memory and does not turn this on yet.
- **Kept in this browser only** (`settingsStore.ts`, key `kp-settings`), until the portal reads a real
  student: everything else. Stand-ins: the email, sign-in methods, card, receipts, hours left, and
  the four SAT dates (check them against the College Board).
- The demo bar lost Sound, the extra-time buttons and Night: Settings has them now.
- Checked in a headless browser at 360, 390 and 1440, dark and light: every folder, no sideways
  scroll, no control under 40px tall, largest text on six pages.

## Start and end screens (2026-11-18): the skill set, second version, awaiting his verdict

He found the first version "bland and boring". His rules, all applied to the skill set:
an animated transition out of the last question; a lively but functional ending; a lot of information on
both screens; **a different layout for a phone, a tablet and a computer**; no serif here (Young Serif reads
"tacky and old" to him: these screens are Hanken Grotesk only; he may mean the serif site-wide, not asked
yet); the coin is the Rewards coin; coins may show at the end if they are animated; GSAP and three.js.

These are in the live quiz engine. `src/components/quiz-flows/`:
- `FlowStage.tsx`: the frame (the quiz's landscape, a way out at the top left; the old Learn bar hides
  when it sees `data-flow-stage`) and `Go`, the one button.
- `SetScreens.tsx`: `SetStart` (skill, domain, level, questions, about how long, tools, Start, Lesson) and
  `SetEnd` (score, accuracy, time, pace, each answer in order, the level before and after for up to three
  sub-skills, coins, next step). Pressing an answer's square finds it in the list; pressing the coins
  throws them again; Enter takes the next step.
- `stage-motion.ts` (GSAP): the last question's glass says "Set complete" and draws back as the ending
  comes forward; numbers count; squares land; bars fill; confetti and one sound for a level gained.
- `CoinBurst.tsx` (three.js): real discs with the coin's face fly up and into the counter, which ticks.
- `stage.module.css`: phone (one column, button fixed under the thumb, answers folded), tablet (two
  columns, all in view), computer (three columns, every answer listed, Enter on the button).
- `shown-level.ts`: students see Not started, Learning, Understanding, Proficient (three bars). The engine
  still keeps five levels and moves them by answers in a row; his rule (3, 4, 5 right within a set) is
  NOT wired. `src/components/portal/Coin.tsx` is the coin, moved out of the dev page.
- A skill set is now **8 questions** (`PRACTICE_SET_SIZE`).
- Seen on real sets in a headless browser at 360, 390, 820 and 1440, including one real level-up.
- **Every other activity still starts and ends on the old painted shell** (`FlowFrame`): Daily 10, domain
  quiz, time trial, full-length exam, diagnostic. He wants the old look gone everywhere; they move to
  this stage once he approves the skill set's. His numbers: Daily 10 is 10, a full-length exam is 98,
  endless mode has no end. Strategy quizzes and endless mode have no engine yet.
- **Default profile picture:** four drawn options were put to him (dawn hills, Karman at sunset, initial
  on glass, night sky); he has not picked.

## Testing on his phone

Run `sh scripts/dev/phone-server.sh` in a Terminal tab (a preview started by Claude is stopped when its
turn ends, which is why his phone "loaded forever"). It serves port 3440 against the local practice
database as the stand-in Cohort student, and starts `scripts/dev/phone-bridge.mjs`: with the iPhone on a
cable, Safari opens `http://karman.local:3440`. The dev server listens only on this computer and the
bridge only on the cable's own address; never start it with `-H 0.0.0.0`. The preview entry
`portal-settings` attaches to that server. If pages under `/learn` hang, Docker has stopped and the
local database with it: quit and reopen Docker (`docs/overnight/local-db.md`).
`DEV_ORIGINS` (read in `next.config.mjs`) names the hosts the dev server accepts.

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
