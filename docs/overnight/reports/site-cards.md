# Site cards (site-cards session)

Branch: `claude/overnight-site-cards-4137d2`, cut from `claude/overnight-ship`. Nothing deployed, nothing pushed.

## What you asked for, and what is done

**1. The background film.** Untouched. The film, its timing, its scrim and the way it lifts toward
the paper are exactly as before (`HomeFilm.tsx` is not changed).

**2. The cards, the way the painted mock does it.** Done on the home page, and the shared parts on
pricing, program, private tutoring, schools, for tutors, guarantee and FAQ.

- Home page: every word now sits on a tinted panel with 4px corners. The panels stand in one column
  left of centre, so the film keeps running beside and between them, with the same 16px gap
  everywhere. The opening and the closing words are on panels too, instead of straight on the film.
- Calmer hierarchy: headings are smaller (the opening line from up to 124px down to 84px, section
  headings from 80px to 56px). The product rows are split by thin lines instead of big empty gaps.
  The giant "+100 points" and "+285" are about half their old size.
- Contrast is checked by calculation, not by eye: `node scripts/site/card-contrast.mjs`. Each text
  colour is checked on a panel with pure black and with pure white film behind it, the two worst
  cases, in light and dark. All pass AA. The lowest is 5.5 to 1. To get there, the small marigold
  text in light mode is a little darker (#7a4e06, was #94600a).
- Nothing sticky over text: the header now scrolls away with the page, and the phone "dock" button
  that slid up at the bottom of phone screens is gone, on every page.
- One call to action per screen: "See pricing" in the opening is a plain text link now, not a
  second outlined button.
- The study tools are a 2 x 2 grid (one column on phones). In the narrower column the row of four
  would have scrolled sideways, so the carousel and its arrows are deleted.
- Inner pages have no film, so their cards (plan cards, form cards, the guarantee) got the 4px
  corner, a hairline, calmer spacing and smaller headings.
- Sections, order and words are the same as before.

**3. Real portal screens.** Done on the home page. Captured from the real app (local database,
headless browser) and placed in our code-drawn iPhone and MacBook frames:

- "Ten questions a day": the student's Today screen, with "Start Your Daily 10" and tonight's
  homework (light and dark).
- "Your tutor starts every session": the Progress screen, with one predicted score (1320) and the
  skills ring (light and dark).
- "The next session, what's due": the Today screen on a laptop (dark only).
- The drawn Daily 10 demo, the drawn parent phone and the drawn week calendar are deleted.

**4. Small hints of the portal design.** Added:

- The portal's skill squares replace the tick marks in the guarantee's two lists (design rule 16
  says no checkmark bullets) and the dashes in the plan and inner-page lists.
- 4px squared corners on every panel and card.
- Hanken Grotesk with lining figures across the site, and even-width figures on the big numbers.

Hints that could come next (you pick):

- Rings for progress figures, for example the "94% reached their target" line on private tutoring.
- 4px corners on the buttons too (they are still the round pills of the live look).
- The painting's tint in the panels (the mock takes the panel colour from the day's painting).
- Young Serif for the big headlines, as in the portal and the mock.
- The Library screen with skill squares wherever skills are mentioned (it captures cleanly from the
  app; I did not commit it because no page uses it yet).

## Screenshots

`docs/overnight/reports/site-cards/`:

- `home-before-live-1440-{dark,light}.jpg`: karmanprep.com today.
- `home-after-{390,768,1440}-{dark,light}.jpg`: the home page now.
- `<page>-after-{390,768,1440}-{dark,light}.jpg` for pricing, program, private tutoring, schools,
  for tutors, guarantee and FAQ.

In full-page screenshots the film shows only at the very top, because it is fixed to the screen. In
a browser it runs behind the whole page, beside the panels.

## How I checked it

- Every page at 390, 768 and 1440 wide, light and dark, in a headless browser (never the app's
  browser pane). No page scrolls sideways at any width.
- Clicked in a headless browser: the phone menu opens and closes with Escape, "See pricing" opens
  /pricing, every portal picture loads, the header is gone once the reader scrolls down, no dock.
- `npx tsc --noEmit` clean. `npm run lint`: no errors. `npm run check:sizes`: OK.
  `npm run format:check`: only three docs files that were already failing before my work.
- Unit tests: 9,742 pass. Two failures, in the calculator and figure tests, which I did not touch;
  each passes when run on its own (they time out when the machine is busy).
- Contrast script above.

## Decisions I made

- The panels are 92% solid with a soft blur, not fully see-through. At that strength every text
  colour passes AA whatever frame of the film is behind it.
- The header became a slim tinted bar at the top that scrolls away, as in the mock.
- I removed the phone dock everywhere, because it covered text at the bottom of the screen.
- The quiz screen was captured but I did not use it: the question on it comes from the imported
  bank and reads like College Board material (rule 45 says only Karman originals in pictures), and
  its top bar overlaps at phone width (a bug in the quiz screen, reported below).
- The Daily 10 ending could not be captured in time (the test run did not move past question 1).
- The parent week view was nearly empty for the seeded parent (no homework), so the parents' row
  shows the student's Progress screen, which the copy says parents also see.

## For you to decide

- The device photos (`p-*.webp`) still show the old drawn Daily 10 and parent screens on the
  phones. `scripts/site/device-photos.mjs` now points at the real screens; re-running it would
  rebuild the photos with real Karman screens.
- The schools page says "7 Difficulty levels". Rule 39 says no difficulty levels on marketing
  pages. I kept the words as asked.
- Pricing, program and private tutoring name Zakaria in the visible copy ("Book a call with
  Zakaria"). Rule 40 says only the About page names him. Words kept as asked.

## Found along the way

- The quiz screen's top bar overlaps at phone width (440px): the "Today" pill sits on top of the
  skill name and the palette button on the top-right buttons.

## Not done

- Real screens on the program and private tutoring pages: the live class and the one-on-one
  review are still drawn in code, because the portal has no matching screen to capture yet.
