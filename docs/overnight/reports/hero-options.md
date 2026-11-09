# Library course choice: three painted options

Session: hero-options. Branch: `claude/overnight-hero-options-c6feab` (cut from
`claude/overnight-ship` at `a9a9497f`). Nothing pushed, nothing deployed, no database writes.

## How to see them

Open the Library with `?hero=a`, `?hero=b` or `?hero=c`:

- `localhost:<port>/dashboard/student/library?hero=a`
- Add `&paint-time=night` (or `dawn`, `sunset`) to see another light.
- With `?hero=` the choice always shows, even if you picked a course earlier today. Reload to
  see it again.
- Without `?hero=` the Library still shows the current gray cards. Nothing was deleted.

## The three options

- **A. Two painted windows.** Two tall framed paintings side by side. Math is a stone bridge
  whose arch is a parabola, mirrored in a mountain lake. Reading and Writing is an open book in
  a meadow, with grass and flowers growing out of its pages and a stream running from its spine.
  The name sits large over the sky, and the percent is a thin bar along the bottom.
- **B. One split canvas.** One wide painting holds both: the bridge and lake on the left, the
  book and meadow on the right, with the book's stream running into the lake. Hover one side:
  it brightens, the other dims, and the painting leans toward it.
- **C. Objects on a shelf.** Painted objects on a wooden shelf. Math is a compass in front of a
  set square, with a ruler. Reading and Writing is a stack of three books with an inkpot and a
  quill. Hover lifts one off the shelf, its shadow shrinks and a light runs across it.

## What they share

- The art is painted with the backdrop's own brush engine, stroke by stroke. It is not a line
  drawing. It paints itself in when the choice appears (about 1.7 seconds).
- It uses the day's light (dawn, day, sunset, night) and the painting's hue. The book covers,
  the set square and the bridge stone take that hue. At night you get the moon, stars, lamps on
  the bridge and fireflies.
- After painting, it comes alive gently. A and B: birds, light on the water, a small light
  travelling along the parabola, and petals lifting off the book. C: the objects breathe very
  slightly and a light passes over them now and then. Nothing moves behind the names.
- Hover, press and keyboard focus all move on springs. Picking one still flies it into the
  small Math / Reading and Writing toggle, as before.
- Reduced motion (or "Keep the painting still"): painted at once, nothing moves.

## Pictures

In `docs/overnight/reports/hero-options/`:

- `compare.png`: the three side by side at 1440 wide.
- `<a|b|c>-1440-light.png`, `-1440-dark.png`, `-1440-night.png`, `-390-light.png`,
  `-390-dark.png`.
- The 390 dark shots were taken just after 5 pm, so they show the sunset light. That is the art
  following the painting's hour, not a bug.

## How I checked it

All in headless Chrome against my own dev server (port 3157). I never opened the app's Browser
pane.

- Phone (390), iPad (768) and desktop (1440), light and dark, plus night light. No sideways
  scroll in any option at any size.
- For each option: hover, press, Tab to focus, Enter to pick. The pick flies into the toggle,
  focus moves with it, and the course opens. The same with reduced motion.
- No errors on the page.
- To make the screenshots again: `node scripts/dev/hero-options-shots.mjs` (needs the dev server
  on port 3157, or set `BASE`).

## Checks

- `npx tsc --noEmit`: passes.
- `npm run lint`: no errors (the one old warning is not mine).
- `npx prettier --check` on every file I touched: passes.
- `library-moments.test.tsx`: 8 tests pass, including 3 new ones (one for each option).

## What changed in the code

- New: `src/lib/painting/subjects/` (the painted scenes, objects and their life) and
  `src/components/student-portal/library/heroes/` (the three options).
- `painterly.ts` takes an optional `brush` size, so small pictures get bigger strokes. The
  backdrop is unchanged.
- `CourseChooser.tsx` and the Library page read `?hero=`.

## Decisions I made

- Names sit over the top of the painting in white, where the sky is darkest. I moved each
  picture's sun away from the text.
- In C the names sit under the shelf, not painted on it, so they stay easy to read.
- Brush strokes in C are bigger and the outlines are ragged on purpose, so the objects look
  painted rather than cut out.

## For the founder to decide

- Which option to keep (A, B or C). Then I delete the other two, the current gray cards and
  `SubjectMarks.tsx`, and remove `?hero=`.
