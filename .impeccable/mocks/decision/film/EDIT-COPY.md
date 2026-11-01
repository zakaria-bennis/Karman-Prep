# Writing your own site copy

## The easy way: the copy editor

1. In the Terminal panel, run `npm run copy`. Your browser opens the editor.
2. Change any words on the left. The page on the right updates as you type;
   click "Show" on a section to jump the preview there, and use "Phone" to see
   it on a phone.
3. Red notes (like an em dash) must be fixed before you can save; amber notes
   are reminders of the house rules.
4. Click "Save to the page". That writes `copy.js` on your computer only.
   Nothing goes live until you tell Claude to check it and publish it.
5. Press Ctrl+C in the Terminal panel to stop the editor.

## By hand

All the words on the site live in one file: `copy.js`, in this folder.

1. Open `copy.js` in any text editor (TextEdit works; choose Format, then Make
   Plain Text).
2. Change the words after each label. For example, change
   `headline: Every miss comes back three times.` to
   `headline: Every missed question comes back.`
3. Save, then refresh the page in your browser.

## What is where

The home page, top to bottom: `## 1 Opening`, `## 4 Your Daily 10`,
`## 2 The tutors`, `## 3 The calendar and tools`, `## 5 Parent updates`,
`## 6 Between sets`, `## 8 Guarantee`, `## 9 Campus film`, `## 12 Testimonials`,
`## 10 Student messages` and `## 11 The close`. (The numbers are names, not the
order; the page follows the order above.)

- `## 12 Testimonials` stays hidden until you fill in its `quotes:` line. Write
  each one as `the quote = First name L., role` and put `|` between quotes.
  Only real, approved quotes go here.
- `## 10 Student messages` stays hidden until you have real screens to show.
- `## 9 Campus film` carries the three cleared captions (Ava, Mateo, Priya)
  and the line "Karman 1:1 tutoring, median 16 weeks". Keep both.

Home B, the second home page for your review (`index.html?home=b`; the A/B
pill at the top of either page switches), reads the same sections plus a few
lines of its own, each ending in ` b`:

- `## 1 Opening`: `headline b:`, `text b:` (its opening title and the two
  sentences under it) and `try b:` (the line by the question a parent can
  answer on the first screen). Home A keeps using `headline:` and `text:`.
- `## 3 The calendar and tools`: `tools headline b:` and `tools columns b:`
  (the heading and the three column names of the table that lists the
  `tools:` pairs with the Challenge question and Wordline from `## 6`). In
  each `tools:` pair, the last sentence names the plan or the season ("In
  Platform and up", "Coming spring 2027"); the table shows it in its own
  column.
- `## 13 A school day`: `headline:` and `captions:`, four stills from the
  film, each as `who, when = what they are doing`. The first name picks the
  still (Ava, Ava's mother, Priya, David), so keep the names.

The other pages: `## 21` to `## 28` the SAT Program (28 is the test-dates card),
`## 31` to `## 36` private tutoring, `## 41` to `## 45` the free practice test,
`## 51` to `## 55` the guarantee, `## 61` to `## 65` About (the only page that
names Zakaria), `## 71` the FAQ, and `## 90` the photos (their alt text, and a
caption only when a picture carries a first name).

`## Site` holds the header, menu and footer words, the loading and form
messages (`loading ...`, `form ...`), the students map (`map ...`) and the
pricing page (`pricing ...`): the free-test line, the three practice plans, the
SAT Program, Private, School, the 13 bundle descriptions (`pricing bundles`),
the guarantee block and the honest note.

## Things to know

- Keep the labels (`headline:`, `text:`, `feature title:` and so on), the
  `## ` section lines and the `## Site` line exactly as they are. Lines that
  start with `###` are notes and never show on the page.
- Leave a line empty after the colon to hide that piece of text. The `eyebrow:`
  lines are empty on purpose: nothing prints above a headline.
- Lists use `|` between items. Pairs use `=` between the two sides
  (`Ava = 1520, UC Berkeley`).
- Keep the two backtick marks ( ` ) at the top and bottom of the copy.
- Headlines: eight words or fewer and under 40 characters. They are set very
  large and must fit two lines on a phone.
- The house rules: no em dashes, no invented claims or quotes, company voice,
  talk to the parent. Prices and dates must match `src/lib/marketing/offer.ts`.
  Every result is shown with "Karman 1:1 tutoring, median 16 weeks". Say
  "Your Daily 10", "Challenge question" and "Wordline" by those names, and
  "five paid seats and one scholarship seat", never a bare "six".

The reasoning behind every line, with alternates for each headline, is in
`docs/copy/copy-run/copy-run-2026-10-31.md`.

Send me a message when you've changed it and I'll check every line against the
copy rules and the overlap scan before it goes on the real site.
