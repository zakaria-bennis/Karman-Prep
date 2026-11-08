# Library: the Challenge moment and the first course choice

Session: library-hero. Branch: `claude/overnight-library-hero-23b2ae` (cut from
`claude/overnight-ship` at `1053be37`). Nothing pushed, nothing deployed. I used the local
database only, and only read from it.

## What changed

### 1. The Challenge question opens full screen

- It replaces the small strip at the top of the box.
- When you open the Library and haven't answered today's two Challenge questions, a large
  painted banner opens over the page. It waits for the day's painting to finish first.
- It has its own picture, drawn in code: a sky in the painting's light (dawn, day, sunset or
  night), hills and a lake in the painting's color, pines at the edges, and two bright stars
  rising over the ridge. One star for each of today's questions.
- It plays an entrance: the picture settles in, the hills rise in layers, two trails draw up
  from the ridge and the stars pop in. Then the title and the button rise in. After that
  nothing moves.
- One main button: "Start the Challenge". It opens the existing Challenge page (`/learn/daily`).
  If you've answered one of the two, it says "Finish the Challenge".
- To close it: the X, the Escape key, or a click anywhere outside the picture.
- Closing it or starting it hides it for the rest of the day on that device. Answering both
  questions hides it for the day everywhere, because the server checks your answers.
- The way back is quiet: a "Challenge question" row at the top of the Practice card. It shows
  Start, "1 of 2", or Done.

### 2. Math or Reading and Writing comes first

- Once the Challenge is out of the way (or straight away if it doesn't show), the box asks
  "What are we studying?" with two large cards: Math and Reading and Writing.
- Each card has its own drawing, made in code in the painting's colors. Math is a curve over
  a grid with a sun on it and a triangle. Reading and Writing is an open book with an ink
  stroke. The strokes draw themselves in. Each card shows its percent with a small ring.
- When you pick one, that card shrinks and flies to the top left of the box on a spring and
  becomes the small Math / Reading and Writing toggle. The course fades in below it.
- The toggle switches courses after that. The colored part slides between the two.
- Your pick is kept for this browser session and day. Moving between tabs, or reloading,
  goes straight to your course. A new session or a new day asks again.
- A link with `?subject=math` (or `reading-writing`) skips the question and opens that course.

### Removed

- The old Challenge strip (`ChallengeBanner.tsx`) and its styles.
- The old two-tab switch (`CourseSwitch`, `librarySubjectHref`) and its styles.

## How I checked it

All in headless Chrome against my own dev server (port 3121, local database, the Cohort test
student). I never opened the app's Browser pane.

- Phone (390), iPad (768) and desktop (1440), light and dark, plus night light. No sideways
  scroll at any size.
- On open, keyboard focus lands on "Start the Challenge". Tab stays inside the banner.
- Escape, the X and a click outside all close it. Closing shows the course choice next.
- "Start the Challenge" opens `/learn/daily`. Coming back, the banner stays closed.
- A new tab the same day: no banner, but the course choice shows (new session).
- Picking a course with the mouse or the keyboard moves it to the toggle and moves focus with
  it. The toggle switches courses. A reload keeps the course.
- Reduced motion: the moves become plain fades, and the drawings appear without drawing in.
- Pictures are in `docs/overnight/reports/library-hero/`:
  - `<size>-<mode>-1-challenge.jpg`, `-2-choice.jpg`, `-3-course.jpg` for 1440, 390 and 768,
    light, dark and night. `1440-light-4-toggled.jpg` shows the toggle switched.
  - `reduced-motion-choice.jpg`.
  - Frame sequences: `frames-challenge-*.jpg` (the banner's entrance), `frames-choice-*.jpg`
    (the choice appearing after the banner closes), `frames-pick-*.jpg` (a card flying to the
    toggle and the course fading in).

## Checks

- `npx tsc --noEmit`: passes.
- `npm run lint`: no errors (one old warning in `PortalShot.tsx`, not mine).
- `npm run format:check`: my files pass. Three docs were already unformatted
  (`BRIEF.md` and two student portal design notes); I left them alone.
- New tests: `library-moments.test.tsx`, 5 tests, all pass.
- `npm test`: 9,770 pass. One calculator test (`reference-rows`) failed once under load and
  passes when run on its own. I didn't touch the calculator.
- `npm run check:sizes`: passes.

## Decisions I made

- **Wording.** I wrote "Today's Challenge", "Two hard questions, one Math and one Reading and
  Writing. Every student gets the same two. Answer, then see how everyone did." and "What are
  we studying?". Change them freely.
- **"Done" means both questions answered.** With one answered, the banner still opens once
  that day and says "One to go".
- **The day for the Challenge** is the same day the questions use (it turns over at midnight
  UTC, which is 6 pm in Chicago). The course choice uses your own calendar day.
- **"Fresh session"** means a new browser tab or window. Within one tab, the choice is asked
  once a day.
- **The banner is a large framed picture with a little space around it**, not edge to edge,
  so "click outside" has somewhere to click. On a phone it fills the screen except a thin
  border.
- **The side column stays** (Practice, Full-length tests, Skill levels) while the choice shows.
- **The picture follows the painting's color and light**, not the painting itself. The real
  painting is visible, blurred, around the banner.

## For the founder to decide

- Do you want the banner on phones to go fully edge to edge, with only the X and Escape to
  close it?
- Should the course choice also hide the side column until a course is picked, so the choice
  is the only thing on screen?
