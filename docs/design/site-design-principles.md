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

## 11. Juxtopposed and "Build for Good UX" checklist

From 16 of Juxtopposed's YouTube transcripts (youtube.com/@juxtopposed) and
the "Build for Good UX" series by @synsation\_, researched 2026-10-22. Each
item is a check a reviewer applies to a page. Where one conflicts with a
founder rule, the rule wins and the conflict is noted.

1. Headline, one-line offer and the primary button are all on the first
   screen at 390x844, without scrolling.
2. Exactly one primary button style; no second primary button beside it.
3. Button words name the action ("Take the free practice test"), never
   "Learn more".
4. The button passes 4.5:1 contrast against the brightest frame behind it.
5. The button stays reachable while scrolling (a dock within thumb reach on
   phones); nothing else is pinned.
6. Native scrolling is not hijacked: the film follows the scroll, but the
   scroll is never slowed, smoothed past the reader's input, or used as
   navigation. (Juxtopposed: scroll-driven storytelling suits short sequences
   of 5 to 7 chunks; as the main navigation it is "0 out of 10".)
7. A scroll story has about 7 chapters or fewer, each with one message.
   (The landing film has 12: the founder decides whether to merge.)
8. A "Skip the film" control lets returning visitors jump straight to the
   offer.
9. With reduced motion, stills replace the film with the same words and
   buttons.
10. Huge type only for one-line headlines; body text never moves while it is
    read.
11. Body lines are 80 characters or fewer; the type scale uses about four
    sizes.
12. No pure black behind pure white (halation): night `#0b121a` and ink
    `#f1f1ee`. Text over video sits on a scrim and passes AA on every frame.
13. Colours are named by role in the tokens; accents are muted on dark; one
    colour, one meaning.
14. Depth on dark comes from lighter surfaces or borders, never shadows.
15. One icon set, one size and stroke.
16. Key facts (test date, length, price, format) sit next to the offer, not
    at the bottom.
17. Prices are the full cost, with nothing revealed later.
18. No loader for loads under 1 second; the first screen works before the
    whole film arrives.
19. Each section works and fails on its own: if a film fails, its poster,
    words and button still show.
20. Every button has default, hover (pointer only), focus-visible, pressed,
    loading and disabled states.
21. Tap targets at least 44px with 8px between them; swiping through the film
    never fires a tap.
22. Forms are short (steps beyond 7 fields), validate when a field is left,
    accept forgiving formats and pre-fill what is known.
23. Submit stays enabled; errors sit next to the field and say what happened,
    why and what to do; focus jumps to the first problem.
24. Every submit shows a visible confirmation; nothing fails silently.
25. Every section and the page end offer a next step: no dead ends.
26. Familiar navigation: logo left, menu right, button top right on desktop
    and at the bottom on phones; few choices.
27. Secondary detail (FAQ, policies) is collapsed until opened; the main
    offer is always visible.
28. One animation style, one easing and one duration set across everything.
29. Effects appear only where they show the product; check the script cost
    with Lighthouse.
30. Click through the whole page on a real phone before it ships.

Conflict noted: Juxtopposed recommends a reading-progress indicator on long
pages; rule 37 bans scroll-driven indicators, so there is none.
