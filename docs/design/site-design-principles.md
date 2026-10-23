# Karman site design principles

One system for every Karman page: the landing film, the program, private
tutoring, pricing and About pages, and the parent and student portals. The
founder's numbered rules in `docs/design-rules.md` and the look in
`docs/style-bible.md` still apply; where this file and they disagree, they win.
The landing mock (`.impeccable/mocks/decision/film/index.html`) is the
reference build: when in doubt, copy what it does.

Sources: Apple's WWDC design sessions (Principles of Great Design, Designing
Fluid Interfaces, The Details of UI Typography, Meet Liquid Glass), the Human
Interface Guidelines (motion, typography, accessibility, layout, colour), how
apple.com product pages load and play video (checked 2026-10-22), and two
rounds of independent expert critique of the landing mock.

## 1. Purpose and simplicity

- Every screen answers: what is this, who is it for, what do I do next. The
  first screen of every page says it in large type, with one action.
- Simplicity is not emptiness. Every screen carries a message; a screen with
  only background is a bug, not a pause.
- One highlighted button on screen at a time (rule 35). A quiet text link can
  sit beside it. On long pages, a floating "Free practice test" button appears
  only when no other button is visible.

## 2. Wayfinding

- Header on every page: the Karman wordmark (home), then named sections (The
  SAT Program, Private tutoring, Pricing), then Sign in. Labels name what is
  behind them, never "Learn more" or "Home".
- On phones the links live behind a "Menu" text button that opens a full-height
  solid sheet; it closes on Escape, on a link tap and on Close, and keeps focus
  inside while open.
- The header hides while scrolling down and returns on the way up. It sits on a
  solid gradient, never glass (glass is for the app only, rule 50).
- The footer always carries the site's navigation (Programs, Karman, Legal),
  credits for any footage, the theme toggle and the motion control.

## 3. Type

- Two typefaces only: Source Serif 4 for headlines, numbers and the wordmark;
  Hanken Grotesk for everything else.
- Tracking is set by size: large display text tightens (about -0.03em at the
  largest, -0.012em at the smallest headline), body text stays at 0, small
  labels may open slightly (+0.02em). Never one value for every size.
- Leading tightens as size grows: headlines 1.0, card dates 1.1, body 1.5.
- Headlines use `text-wrap: balance`, body `text-wrap: pretty`. Headlines read
  best under about 40 characters; the copy editor warns past that.
- Running text is never smaller than 15px, and never grey on a busy
  background.

## 4. Colour, contrast and material

- Night `#0b121a`, ink `#f1f1ee`, secondary ink `#b9c2cb`, accent green
  `#7cc4a5` for one action or a data point only. Light mode is bone `#f1f1ee`
  with ink `#15202e`.
- Every piece of text meets WCAG AA against what is actually behind it: 4.5:1
  for body, 3:1 for large text. Over video that means a scrim (soft linear
  gradients, never radial "orbs", rule 21) and, for captions, a solid card.
  Check it by sampling real frames, not by eye.
- No drop shadows (rule 5), no glass on marketing pages, no purple or neon.
- One fine grain at about 3%, inside the film layer only.

## 5. Pictures and film

- Real footage, or generated footage that looks real. Nothing code-drawn sits
  next to real footage pretending to be real (no drawn stars, constellations or
  skies).
- People first (rule 41): 16 and 17 year olds, then parents and tutors. Faces
  are framed so the person reads at every screen size; phones get their own
  portrait crops.
- Product screens are real Karman screens, readable at their shown size (rule
  44): show a tight, complete crop at close to 1:1, never a whole dashboard
  shrunk to 6px text, and never a crop that cuts words mid-line.
- Credit every licensed clip in the footer.

## 6. Motion

- Motion has a job: it shows the climb, reveals words in reading order, or
  confirms a tap. Decoration that moves is cut.
- One reveal style across the site: words rise from a mask and fade in
  (expo-out, about 0.9 s, 0.06 s apart); they leave by fading and lifting
  slightly (about 0.35 s). Never letter-by-letter, never scatter, flip or
  collide. A new headline arrives only after the old one has gone, and a
  sentence is never left half-drawn.
- Films follow the scroll, and when the reader stops, the film in view keeps
  playing in real time from where it is; scrolling picks up from that frame
  with no jump. A slow drift (one cycle a minute) keeps a finished shot alive.
  Nothing loops in under 10 seconds.
- Everything is interruptible: scrolling, tapping or pausing stops motion at
  once, from the frame it is on.
- A Pause/Play text control in the header stays visible while film plays, and
  the choice is remembered.
- Reduced motion: posters only, no video loads, reveals become short fades,
  no camera moves.

## 7. Interaction

- Feedback on press, not release (buttons scale to 0.97 on `:active`).
- Every tap target is at least 44 by 44 pixels.
- Visible focus rings (2px accent outline), a skip link, logical heading order,
  and every control labelled for screen readers.
- Links never lead nowhere: every route is real or the link is not shown.

## 8. Words

- Every word lives in an editable copy file the founder controls (the landing
  page's is `copy.js`, edited with `npm run copy`). No word is hard-coded in a
  page's markup.
- Company voice (rule 40), no em dashes, no invented claims, no fake urgency.
  Results always carry "Karman 1:1 tutoring, median 16 weeks". Prices, dates
  and seat counts come from `src/lib/marketing/offer.ts`.

## 9. Performance

- Videos are muted, `playsinline`, and load about 1.5 screens before they are
  needed (apple.com loads about 150vh ahead). Each clip ships a desktop and a
  portrait phone version. Something moves within a second on the first screen.
- The first screen stays light: poster first, video after.

## 10. How to check a page before it ships

1. Screenshot it at 1440x900, 1280x720 and 390x844, at 30+ evenly spaced
   scroll positions, and look at every frame (`sample.mjs`).
2. Run the overlap checker at the same sizes (`overlap-scan.mjs`): no text on
   text, nothing under the header, at most one highlighted button.
3. Sample contrast of every text element against the real frames behind it.
4. Load with reduced motion on, keyboard only, and VoiceOver.
5. Five-second test with someone who has never seen it: what is it, who is it
   for, what would you do next?
6. A fresh critic who has not seen the page reviews it against this file.
