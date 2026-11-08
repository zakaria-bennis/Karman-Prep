# Gallery sweep, 1 November 2026

What Karman's website builders can learn from award galleries and motion demo
sites about two problems the founder raised: pages lack colour, and pages use
too many words. The aim is motion and pictures that lead the eye to one thing
per screen.

Everything here was checked against `docs/design-rules.md`. Ideas that broke a
rule were dropped or rewritten, and each pattern says which rules to watch.
Nothing here is approved. The founder leads design, so every idea must be shown
to him as a working screen first.

## Where the captures are

Three sweeps were run on 1 November 2026. Every live site was opened in
Playwright at 1440 x 900.

- **Awwwards.** awwwards.com refused connections from this machine (curl and
  browser). Listings came from Wayback snapshots instead: Sites of the Day
  (23 Oct 2026), Colorful, Storytelling and Minimal (29 to 30 Aug 2026),
  Scrolling (May 2025), Illustration and Animation (23 Oct 2026). The
  Education category had no recent snapshot. Sites of the Month returned 403.
  Guidely (guidely.ai) blocked the browser.
- **Other galleries.** One Page Love, CSS Design Awards, SiteInspire and SaaS
  Landing Page. Pop Up Grocer, MANA and Gumroad were only partly captured.
  WeekSync (cookie wall) and LEADOFF (timed out) failed.
- **Motion demos.** GSAP's own pages and Showcase, motion.dev examples, Codrops
  source on GitHub (the live demos sit behind a Cloudflare check, which was not
  bypassed), Rive Marketplace, NumberFlow and Lenis. CodePen was blocked by
  Cloudflare and not studied. The motion-demo findings reached this document
  cut off after Hextronics, so NumberFlow, Lenis and Rive have captures but no
  written notes here.

The captures sit in the session scratchpad, which is temporary. Copy any
folder you need before the session ends.

Base path (called `SCRATCH` below):
`/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/`

- `SCRATCH/gallery-awwwards/<site>/`
- `SCRATCH/gallery-galleries/<site>/`
- `SCRATCH/gallery-motion-demos/<site>/`

Each site folder holds `scroll/` or `scroll-*.jpg` (one shot per 500 px),
`burst-load/` and `burst-scroll3/` (20 frames about 100 ms apart), contact
sheets (`sheet-*.jpg`) and `log.json` or `info.json`. The logs record the
animation library found, timings measured from the Web Animations API, and
the CSS durations and easings.

## The ten strongest sites

1. **Heron AI** (heronaiapp.com, Awwwards). A pinned section draws a floor plan
   layer by layer, and the only colour on the page lands last, on the problem
   the product found. Learn: let the accent colour mean "look here".
2. **Aristotle** (heyaristotle.com, Awwwards). An AI tutor that covers the SAT,
   so the closest neighbour to Karman. The camera flies through the hero
   picture, all in native CSS scroll-driven animation with a reduced-motion
   path. Learn: one scroll move that takes the eye from a person to the product.
3. **YumLog** (yumlog.dev, CSS Design Awards). Full-bleed colour chapters, each
   with one real device screen and one spoken line. Learn: the simplest answer
   to "more colour, fewer words", in plain CSS.
4. **The Quaker School at Horsham** (quakerschool.org, CSS Design Awards). A
   photo unfolds from a line on marigold, grows to full-bleed film, then shrinks
   into a card over one giant word. Learn: how to open Karman's background film,
   and how candid student photos sit on flat warm colour.
5. **sonicdesk** (sonicdesk.studio, GSAP Showcase). The real product UI stays
   pinned while four short verb headlines step through, and only the part of
   the screen each verb names changes. Learn: show the product instead of
   describing it.
6. **Rows** (rows.gg, One Page Love). Every feature is a small real UI scene that
   plays one action when it scrolls in, next to two short lines. Learn: let the
   product do the explaining.
7. **Driftime** (driftime.com, Awwwards). Sticky full-width colour panels stack
   like cards, each with one huge word and graded device photos. Learn: colour
   chapters with restraint.
8. **mappy** (meetmappy.com, One Page Love). One bright sentence at a time on a
   colour field, with lines already read stepping back. Learn: pace a short
   story so the eye has exactly one place to land.
9. **XQ Institute** (xqsuperschool.org, SiteInspire). Real high-school students
   as cut-outs on bold flat shapes. Learn: an alternative to the "teen on a bus"
   photo cliché.
10. **Butter** (butter.video, Awwwards). Small icons sit inside a sentence, then
    fly out of it into the product timeline. Learn: words that turn into the
    product, which cuts copy.

Also worth a look: Teachable (circle wipe between chapters), The Whoopsies
(camera push into a picture), Partake Foods (objects settling around a
headline in one pinned beat), Hextronics (scroll-scrubbed product film).

## Motion patterns that guide the eye

Patterns seen on several sites are merged into one entry. Every entry follows
the same house rules:

- **Reduced motion.** Wrap every animation in
  `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` or a CSS
  `@media (prefers-reduced-motion: no-preference)` block. Under reduced motion,
  show the final state.
- **Never a meter.** No scroll-driven indicator that fills, lights up or ticks
  off as the reader scrolls (rule 37). Swap content; never show progress.
- **One per screen.** One highlighted call to action (rule 35), and one moving
  idea per screen, so motion never runs on everything (rule 25).
- **No overlap.** Nothing pinned, fixed or flying covers text being read, at
  any scroll position or screen size (rule 34). Check by scanning text boxes.
- **Phone first.** Pins get a stacked, non-pinned layout on phones through
  `gsap.matchMedia`. No horizontal overflow at 375 px (rule 28).
- **Speed.** Animate `transform` and `opacity`. Use `filter: blur()` only on
  short lines. Heavy motion and film never block the largest paint (SEO rules).
- **Real product.** Any screen shown is a real Karman screen whose content the
  founder has approved (rules 18 and 44). Questions are Karman originals
  (rule 45).

### 1. Pinned question that builds to one marigold mark

- **Seen at:** Heron AI, "Right there with you / For the whole design"
  (`gallery-awwwards/heron-ai/scroll` s05 to s16).
- **What moves:** the section pins. A large heading fades grey to black. A floor
  plan draws itself: dashed outlines, walls, furniture, dimension lines. Last,
  small red-orange markers land where the product found problems. A side
  caption changes at each stage.
- **Trigger:** scroll. Heading has `scrub: true`, start `center bottom+=10%`,
  end `center top+=40%`. Section reveals start `top+=45% bottom` and play once.
  Lines draw with a CSS keyframe on `stroke-dashoffset`, from the path length
  to 0.
- **Timing:** text reveal is a mask sweep of 0.58 s with `steps(19)`, then a
  0.15 s colour change. Section timelines run 1.06 to 2.2 s. Transitions are
  0.4 s ease or `cubic-bezier(0.23,1,0.32,1)`.
- **Points at:** the one accent marker. The page is greyscale until then.
- **Build it:** GSAP ScrollTrigger pin for about 2 to 3 viewports. A timeline
  with labels: show the question in ink, draw the student's path through it
  (SVG `stroke-dashoffset`), then land one marigold mark on the step that went
  wrong, with its one-line fix.
- **Karman screen:** a Karman original SAT question on the home page or the
  Daily 10 page.
- **Watch:** the stages must not read as a progress meter (rule 37). Keep the
  caption to one line (rule 51 spirit). Use Karman's own fonts, never Geist
  (rule 10).

### 2. Pinned product screen, stepped by short headlines

- **Seen at:** sonicdesk (`gallery-motion-demos/sonicdesk` s01 to s16); Heron
  AI's "Observe / Advise / Act / Learn" rail (`heron-ai/scroll` s19 to s22).
- **What moves:** the product UI stays pinned. A huge headline swaps through
  four verbs (BRANCH IT, BREAK IT, COMPARE IT, MERGE IT BACK). At each verb,
  only the matching region of the UI changes. Then the pin releases.
- **Trigger:** scroll inside a pin of about 4 to 5 viewports, each headline held
  about one viewport. The swaps are stepped, not scrubbed.
- **Timing:** 0.25 to 0.45 s transitions on `cubic-bezier(0.16,1,0.3,1)`. Heron's
  swaps take about 0.4 to 0.5 s.
- **Points at:** the verb, then the exact place on the screen where it happens.
- **Build it:**
  `gsap.timeline({scrollTrigger:{trigger:'.story',start:'top top',end:'+=300%',pin:true,snap:{snapTo:'labels',duration:0.4,ease:'power2.inOut'}}})`.
  At each label, bring the headline in (`yPercent` 100 to 0, 0.5 s
  `power3.out`) and swap a `data-step` on the screen, with CSS transitions of
  0.35 s. Keep the pin to 3 to 4 viewports.
- **Karman screen:** Your Daily 10. Four steps: answer it (a choice is
  selected), see why (the explanation opens), fix the skill (a skill chip
  appears), come back tomorrow (the due date moves to tomorrow).
- **Watch:** leave out sonicdesk's scrubbing bar along the bottom, which is a
  progress indicator (rule 37). The verbs must not light up in sequence like a
  route bar. No skill levels or meters (rule 39). No 01/02 numbering.

### 3. Camera push into the picture

- **Seen at:** Aristotle hero (`gallery-awwwards/aristotle` burst-load,
  burst-scroll3, scroll s00 to s06); The Whoopsies hero
  (`gallery-motion-demos/whoopsies` s00 to s12); motion.dev "scroll zoom hero".
- **What moves:** Aristotle's arch and the figures in front scale up and slide
  out to the sides, so the camera passes through the doorway. The landscape is
  left full-bleed and one sentence fades in over the sky. The Whoopsies zooms
  from a whole drawing into one detail and out into a new colour world.
- **Trigger:** Aristotle uses native CSS scroll-driven animation:
  `view-timeline` on a section 255svh tall, with `animation-timeline` and
  `animation-range` (entry 100% to exit 0%). The Whoopsies uses one GSAP pin of
  5670 px with `scrub: 0.6`.
- **Timing:** scrubbed, linear inside the keyframes. Aristotle's other easings
  are `cubic-bezier(0.16,1,0.3,1)` and a custom `linear()` spring.
- **Points at:** through the picture to one sentence or one screen.
- **Build it:** native CSS (`view-timeline`, `animation-range`) in a CSS module,
  or GSAP:
  `gsap.timeline({scrollTrigger:{trigger:'.push',start:'top top',end:'+=150%',pin:true,scrub:0.6}}).to('.photo',{scale:3.2,transformOrigin:'52% 46%',ease:'power1.in'}).to('.screen',{opacity:1},'-=0.3')`.
  Keep it to 2 viewports or less. Under reduced motion, cross-fade between the
  two stills.
- **Karman screen:** the home hero. A generated still of a student at a desk by
  a window; scrolling pushes into the laptop until a real Daily 10 screen fills
  the viewport, and the next section starts on that screen's colour.
- **Watch:** the sky or background must never turn into a glow or orb
  (rule 21). Borrow the move, not Aristotle's painted look. Do not hide or skip
  the "next fall" chapters (rule 47).

### 4. Full-bleed colour chapters

- **Seen at:** YumLog (`gallery-galleries/yumlog/sheet-scroll.jpg`); Driftime
  (`gallery-awwwards/driftime/scroll` s02 to s12); SuperPlay
  (`gallery-awwwards/superplay/scroll` s00 to s15); MailerBot step cards
  (`gallery-awwwards/mailerbot/scroll` s13 to s18); also Locker Land, mappy and
  Quaker.
- **What moves:** the whole background changes colour per section. YumLog
  cross-fades the page colour. Driftime stacks sticky full-width panels, each
  sliding up over the last. SuperPlay grows a giant letter mask until the next
  colour shows through. MailerBot keeps a heading pinned while colour cards
  stack on the right.
- **Trigger:** scroll. Driftime uses `position: sticky`. YumLog changes section
  backgrounds as each enters.
- **Timing:** YumLog `background-color 0.6s ease`, content
  `0.7s/0.8s cubic-bezier(0.2,0.7,0.2,1)`. Driftime entrance is opacity 0 and
  40 px rise over 800 ms, `cubic-bezier(0.5,0,0.1,1)`, opacity only under
  reduced motion.
- **Points at:** the one product moment in each colour. The colour change tells
  the reader a new idea has started, without an extra heading.
- **Build it:** CSS first. Each section owns a solid background; use sticky
  panels for the stacked-card version. For a cross-fade or mask hand-off, use
  GSAP ScrollTrigger or CSS `view-timeline` on `background-color` or
  `clip-path`.
- **Karman screen:** the home page chapters. For example marigold for the Daily
  10, a deep teal for tutoring, ink navy for results, off-white for the plans.
  Each holds one big word and one real screen or graded photo.
- **Watch:** solid fields only, no gradients (rule 1). Deep, graded colours,
  never neon (26) or basic pastel (27; YumLog's pink and MailerBot's lilac and
  lime come close). Three or four hues at most, so it never reads as rainbow
  (4). No purple with black (20). Calculate AA contrast for text on every field,
  in both modes (33). Drop MailerBot's ghost step numbers and its highlighted
  step list.

### 5. A product scene that plays once

- **Seen at:** Rows feature sections
  (`gallery-galleries/rows/sheet-burst-scroll3.jpg`); Turn.io chat cards
  (`gallery-awwwards/turn-io/scroll` s01 to s04).
- **What moves:** a small real UI card on a plain stage. A collaborator's cursor
  glides in and stops on a row, and a status pill changes. Turn.io types a chat
  message in with a typing dot.
- **Trigger:** the section enters the viewport. It plays once and rests.
- **Timing:** Rows pill entrance 0.36 s `cubic-bezier(0.22,1,0.36,1)`; opacity
  spring as a CSS `linear()` curve over 600 ms with about 17% overshoot; cursor
  travel about 0.6 to 0.9 s. Turn.io fade-in 300 ms,
  `cubic-bezier(0.075,0.82,0.165,1)`.
- **Points at:** the one action the copy beside it describes. The copy is two
  short lines.
- **Build it:** a GSAP timeline with `scrollTrigger:{start:'top 70%',once:true}`,
  or the Web Animations API from an IntersectionObserver.
- **Karman screen:** feature sections on the home and plan pages. An answer is
  picked and the explanation slides in; David's name appears on the Zoom tile;
  a tutor note or Daily 10 reminder arrives as one bubble; a due date settles
  on the plan.
- **Watch:** play once, never loop (Turn.io's dots and ripples loop forever,
  rule 25). Plain cursor, no animated arrows (rule 24). No three cards in a row
  (rule 6). Shown under reduced motion as the final state.

### 6. One key sentence revealed word by word

- **Seen at:** Aristotle headings (`aristotle/scroll` s10 to s14); YumLog quotes
  (`yumlog/scroll-2000.jpg` to `scroll-3000.jpg`); Shift by VML
  (`gallery-motion-demos/shift-vml` s02 to s05); SuperHi
  (`gallery-galleries/superhi/sheet-scroll.jpg`); motion.dev "text scroll word
  reveal"; Codrops ScrollBlurTypography (`codrops-src`).
- **What moves:** each word or letter goes from faint to full ink. YumLog and
  Codrops also go from blurred to sharp.
- **Trigger:** scrubbed by scroll (Aristotle, Codrops, motion.dev) or played on
  entry (YumLog, SuperHi).
- **Timing:** motion.dev starts words at 0.15 opacity, each fading over 0.2 of
  the progress. Codrops: stagger 0.05, `ease:'none'`, `scrub:true`. YumLog:
  opacity 0.6 s, filter and translate 0.9 s, `cubic-bezier(0.2,0.7,0.2,1)`,
  words about 80 to 120 ms apart. Shift: transform 0.7 s
  `cubic-bezier(0.25,1,0.5,1)`.
- **Points at:** the one line that carries the argument, at reading pace.
- **Build it:** SplitText (words) with
  `gsap.fromTo(words,{opacity:0.15},{opacity:1,ease:'none',stagger:0.05,scrollTrigger:{trigger:el,start:'top 80%',end:'bottom 45%',scrub:true}})`.
  Or CSS `view-timeline` with words split in React. Prefer opacity only; use
  blur on short lines only.
- **Karman screen:** one line per page at most, on two or three pages. The line
  under the hero, or the guarantee line on the cohort page.
- **Watch:** never on body copy or every heading (rule 25). The end state must
  pass AA contrast (33). Under reduced motion, render the line fully sharp.

### 7. One bright line at a time

- **Seen at:** mappy, the whole page (`gallery-galleries/mappy/sheet-scroll.jpg`,
  `sheet-burst-scroll3.jpg`).
- **What moves:** white text on orange or yellow. Each scroll step brings the next
  sentence to full white and drops earlier lines to about 35% opacity. Later,
  mind-map nodes grow from one node with lines drawing out.
- **Trigger:** scroll steps, like slides.
- **Timing:** the dim lands in under about 120 ms. UI transitions 0.12 to 0.18 s,
  `cubic-bezier(0.23,1,0.32,1)`.
- **Points at:** exactly one sentence at a time.
- **Build it:** one ScrollTrigger per line with `toggleClass`, or CSS
  `view()` timelines. No custom scroll handling.
- **Karman screen:** a short "How Karman works" or "Why Karman" on marigold:
  three or four lines. A wrong answer could branch into a hint the same way the
  map grows.
- **Watch:** read lines must still meet contrast (3:1 large, 4.5:1 body) or the
  pattern fails rule 33; dim to about 60%, not 35%. It must not tick sections
  off (rule 37). Keep it short; mappy's 52,379 px track is far too long.

### 8. A marker behind the key word

- **Seen at:** Codrops OnScrollTextHighlight effects 6, 7 and 13
  (`codrops-src/OnScrollTextHighlight.js.txt`); GSAP homepage label chips
  (`gallery-motion-demos/gsap-home` s03 to s09); Riot and XQ hand-drawn strokes
  (`gallery-galleries/riot/scroll-0000.jpg`, `xq/scroll-0500.jpg`).
- **What moves:** a solid block of colour sweeps in behind one word, or one
  hand-drawn stroke draws under it.
- **Trigger:** entering the viewport, played once.
- **Timing:** Codrops 0.8 s `power2`. GSAP site reveals 0.7 s
  `cubic-bezier(0.23,1,0.32,1)`. XQ stroke 1.2 s ease.
- **Points at:** the one word to remember: the price, "Daily 10" or
  "guarantee".
- **Build it:** `.mark::after{transform:scaleX(0);transform-origin:left;background:var(--marigold)}`,
  then
  `gsap.to(markAfter,{scaleX:1,duration:0.8,ease:'power2.out',scrollTrigger:{trigger:mark,start:'top 85%',once:true}})`.
  For a stroke, an SVG path with `stroke-dashoffset`. Transform, not width.
- **Karman screen:** one phrase in one heading per section.
- **Watch:** do not scrub it to scroll position, or it becomes a fill indicator
  (rule 37). One per screen. Solid marigold, no gradient (1) and no neon (26).
  Ink text on marigold must pass AA.

### 9. Words that turn into the product

- **Seen at:** Butter, second screen (`gallery-awwwards/butter` burst-scroll3,
  scroll s05 to s08); GSAP UI page Flip morph (`gallery-motion-demos/gsap-ui`
  s03 to s07); Codrops ScrollBasedLayoutAnimations and ImageToContent.
- **What moves:** small tiles set between the words of a sentence lift out,
  grow, and drop into a product window rising from below. With Flip, one small
  element keeps its identity while it moves into its place in a full layout.
- **Trigger:** Butter toggles a class in view. Flip on scroll is pinned and
  scrubbed (start `center center`, end `+=300%`, `ease:'none'`).
- **Timing:** Butter transform 800 ms `cubic-bezier(0,0,0,1)`, opacity 528 ms
  linear. Flip on click 1.5 s `power4.inOut`; the GSAP UI page uses `scrub: 2`.
- **Points at:** out of the copy and into the real product.
- **Build it:**
  `const s=Flip.getState(chip); target.appendChild(chip); Flip.from(s,{duration:1,ease:'power3.inOut',scrollTrigger:{trigger:section,start:'top 60%',end:'top 10%',scrub:1}})`.
- **Karman screen:** the Daily 10 introduction. A sentence with small flat chips
  inline (a graph, a passage, an equation) that drop into a real Daily 10
  screen. Or one marigold answer choice that flies into its place on the full
  question screen while the rest builds around it.
- **Watch:** one sentence, once. Flat chips, no glossy 3D and no shadows
  (rule 5). The end layout must not be a bento grid (13) or three cards in a
  row (6).

### 10. Photo grows to film, then shrinks to a card over one huge word

- **Seen at:** Quaker School hero (`gallery-galleries/quaker/sheet-burst-load.jpg`,
  `sheet-scroll.jpg`, `sheet-burst-scroll3.jpg`); Matters Singapore pill mask
  (`gallery-awwwards/matters-sg/scroll` s01 to s08, a contrast case).
- **What moves:** Quaker: a small photo unfolds from a line on marigold, swaps
  every 1.1 s as the field changes colour, grows to full-bleed film, then
  shrinks back to a card over the giant word "Everyday" with small photos round
  it. Matters: a pill-shaped mask of film grows to fill the frame.
- **Trigger:** a load sequence, then scroll.
- **Timing:** unfold about 300 ms; each photo and colour held about 1.1 s with a
  100 ms colour cross-fade; transform and opacity 0.6 s
  `cubic-bezier(0.5,0.5,0,1)`. Matters 600 ms `cubic-bezier(0.65,0,0.35,1)`.
- **Points at:** the faces of real students and teachers.
- **Build it:** GSAP timeline plus ScrollTrigger scrub for the shrink-to-card,
  or the View Transitions API for the grow. Cap the intro at about 1.5 s and
  let the visitor scroll at once.
- **Karman screen:** the opening of the continuous background film. One Karman
  student shot on marigold, two or three graded colours, then the full film;
  on scroll the film becomes a card over one huge word such as "Daily".
- **Watch:** no play or pause button on the film (rule 38; Quaker shows a "Watch
  now" pill). Small photos never cover text (34). The film never blocks the
  largest paint. Take Matters' mask move only, not its dark and neon look (26).

### 11. Circle wipe from one chapter to the next

- **Seen at:** Teachable (`gallery-galleries/teachable/scroll-6000.jpg` to
  `scroll-7000.jpg`).
- **What moves:** a hard-edged circle grows across a blurred photo and becomes
  the next section's background; that section's phone screen then rises in.
- **Trigger:** scroll, scrubbed.
- **Timing:** about 500 to 800 px of scroll for the full wipe.
- **Points at:** the start of the next chapter, where the circle edge leads.
- **Build it:** GSAP ScrollTrigger scrub on `clip-path: circle()`. A plain cut
  under reduced motion.
- **Karman screen:** the hand-off from the film chapter to the product chapter;
  a marigold disc grows over the film.
- **Watch:** hard edge and flat fill, or it reads as a radial orb (rule 21).

### 12. Objects settle around a headline (once)

- **Seen at:** Partake Foods, "Leave No Taste Buds Behind"
  (`gallery-awwwards/partake-foods/scroll` s06 and s07).
- **What moves:** the section pins and product objects fall, scale and settle
  around the headline.
- **Trigger:** ScrollTrigger on the wrapper: start `top top`, end `+=105vh`,
  `pin:true`, `scrub:2`.
- **Timing:** scrubbed, `power3.inOut`; fade-ins 1 s `expo.out`.
- **Points at:** the headline, framed by the objects.
- **Build it:** the same ScrollTrigger settings, with generated cut-outs.
- **Karman screen:** one beat on the home page. Cut-outs of real study things (a
  phone showing the Daily 10, AirPods, a laptop on a bench) settle around one
  headline.
- **Watch:** once only. Drop Partake's floating stickers (rule 25). No physical
  calculators or paper (rules 43 and 45). No visible brand logos (43).

### 13. Scroll-scrubbed product film

- **Seen at:** Hextronics (`gallery-motion-demos/hextronics` s00 to s14).
- **What moves:** photoreal film played by the scroll on a canvas stage; a
  chapter title and short paragraph appear at the hold point of each chapter.
- **Trigger:** scroll position mapped to film time.
- **Timing:** each chapter takes about 3 to 4 viewport steps. Text transforms
  0.55 s `cubic-bezier(0.625,0.05,0,1)`, opacity 0.25 to 0.35 s.
- **Points at:** the product in use, then one chapter title.
- **Build it:** pre-rendered film (Remotion or `scripts/generate-assets.mjs`) as
  an image sequence or video, scrubbed with ScrollTrigger. Compare with
  `docs/design/scroll-film.md` before building.
- **Karman screen:** the landing film chapters.
- **Watch:** Hextronics' page is 145,440 px tall, far too long. Keep each
  chapter short. No play button (38). Every shot approved by the founder before
  money is spent.

### 14. Footer wordmark rising behind a landscape

- **Seen at:** Aristotle footer (`aristotle/scroll` s26 and s27).
- **What moves:** four layers at different rates: far hills, middle hills, a huge
  wordmark, near hills. The wordmark rises from behind the hills.
- **Trigger:** CSS `view-timeline`; ranges entry 75%, 65%, 35% and 25%.
- **Timing:** small moves (far layer `translateY` 18% to 0), `var(--ease-out)`.
- **Points at:** the brand name as the last thing on the page, under the final
  call to action.
- **Build it:** native CSS `view-timeline`, or GSAP ScrollTrigger scrub. Static
  under reduced motion.
- **Karman screen:** the site footer, with the wordmark behind a generated
  campus or skyline still that echoes the "next fall" chapters.
- **Watch:** low risk. Keep the legal links readable (rules 30 to 32).

### 15. Slow drift of real question cards

- **Seen at:** MailerBot hero and closing call to action
  (`mailerbot/scroll` s00 and s21).
- **What moves:** a row of real outputs in isometric perspective slides slowly
  across.
- **Trigger and timing:** CSS keyframes, `translate 0 to -50%`, linear,
  continuous.
- **Points at:** how much real product there is.
- **Build it:** CSS keyframes and transforms inside an `overflow: clip`
  container.
- **Karman screen:** behind the hero copy or the final call to action, a row of
  Karman original question cards.
- **Watch:** stops under reduced motion. Must not cause sideways scroll (28).
  Text in front must keep AA contrast.

### 16. Short load moments

- **Seen at:** Butter headline sharpening from a blur (`butter/burst-load`);
  Kizupi and Poetry Camera resolving from blur or pixels
  (`gallery-galleries/kizupi/sheet-burst-load.jpg`,
  `poetry-camera/scroll-0000.jpg`); Locker Land logo handing over to its menu
  (`lockerland/sheet-burst-load.jpg`); SuperPlay's squash-and-spring headline
  (`superplay/burst-load`).
- **What moves and timing:** Butter sharpens over about 400 to 600 ms. Kizupi
  resolves by 583 ms. Locker Land's logo shows at about 450 to 650 ms, then the
  menu rises over about 400 ms, done by about 2.3 s. SuperPlay springs in about
  200 to 300 ms with `cubic-bezier(0.5,1.25,0.6,1.05)`.
- **Points at:** the headline in the first half second.
- **Build it:** a CSS `filter: blur()` to 0 on the hero film's first frame over
  300 ms (a focus pull), or the headline arriving in marigold then settling to
  ink, in one hue.
- **Karman screen:** the hero. SuperPlay's spring belongs only in the app, for
  Wordline or the Daily 10 end screen, and only in a muted form.
- **Watch:** never a loader screen before content, and never delay the largest
  paint. Cap any intro at about 1.2 s and skip it on repeat visits. One hue
  only, never a multi-colour blur (rules 1 and 4).

### 17. Flip-book of people

- **Seen at:** Miso hero (`gallery-galleries/miso/sheet-burst-load.jpg`).
- **What moves:** one cut-out person in the centre; a different person hard-cuts
  in every 0.5 to 1 s. Almost no text.
- **Trigger and timing:** a muted looping video; first fade 400 ms, then hard
  cuts with no easing.
- **Points at:** the people. The variety says "people like you" without copy.
- **Build it:** a pre-rendered MP4 or WebM, `muted playsinline loop`, made with
  `scripts/generate-assets.mjs` and cut in Remotion.
- **Karman screen:** the "who it is for" moment, or next to the free test link.
  Students of 16 and 17 holding a laptop or phone, about 0.6 s each.
- **Watch:** stops under reduced motion. Off-white ground, never pure white
  (rule 3). Every shot founder-approved (44). No scores or names on screen
  (47).

### 18. Product events stacking as small notices

- **Seen at:** Riot hero (`gallery-galleries/riot/scroll-0000.jpg`).
- **What moves:** small notices stack beside a real product table, and faces pop
  in one by one.
- **Timing:** 100 ms scale, 200 ms stagger.
- **Points at:** the product feeling alive and in use.
- **Build it:** CSS keyframes with `animation-delay`, played once.
- **Karman screen:** beside the parent or tutor portal preview, for example
  "Ava finished Your Daily 10" or "David left a note".
- **Watch:** they must read clearly as product screens, not testimonials
  (rule 12). Fictional first names only, with no score or result (47). Riot's
  pastel cards break rule 27, so take the timing only.

## Imagery patterns

1. **Candid documentary photos on flat warm colour.** Quaker School
   (`quaker/sheet-scroll.jpg`): unposed moments of students and teachers, one
   large card with small photos round it, each on a flat marigold, sage or
   terracotta panel. For Karman: a 16-year-old at a kitchen table with a laptop,
   mid-thought; a tutor on Zoom in their own room. Grade every shot to one
   palette (rule 48). Students locked in, not laughing (42).
2. **Cut-out students on bold flat shapes.** XQ (`xq/scroll-2500.jpg` to
   `scroll-3500.jpg`). Students cut out over marigold and ink shapes, each
   holding a phone or laptop with a real Karman screen. Drop XQ's dots and
   doodles (rule 22).
3. **Collage cut-outs next to product cards.** Aristotle (`aristotle/scroll` s07
   to s12): figures with torn-paper edges beside modern objects and UI cards.
   For Karman, use its own generated students against real product cards.
   Borrow the collage idea, not Aristotle's painted style or mascot.
4. **The person and the screen in one card.** Aristotle's tools grid and Turn.io
   (`turn-io/scroll` s02 to s04). A Daily 10 card beside a student portrait; a
   tutor note beside the tutor's Zoom tile. Avoid pastel tints (27) and soft,
   heavily rounded corners (19).
5. **Devices in real places, graded to the chapter colour.** Driftime and Poetry
   Camera (`driftime/scroll`, `poetry-camera/sheet-scroll.jpg`). A laptop or
   phone showing Karman screens at a kitchen table at 6:50 a.m., on a team bench
   at practice, in a library carrel. Each graded to its chapter's colour (48).
   Screen text placed from Karman's own rendered screens (44).
6. **Real device renders inside colour chapters.** YumLog
   (`yumlog/sheet-scroll.jpg`). The orange iPhone 17 Pro Max with real Karman
   screens on marigold and ink fields.
7. **A greyscale world with one accent.** Heron AI. Inside product demos, keep
   the question in ink and use marigold only for the mistake or the next step.
   Paired with colourful chapters, this keeps the eye directed.
8. **Small pictures inside the headline.** Butter and SuperPlay. Small square
   crops of real screens or tutor faces between the words of one hero sentence,
   which cuts word count. Keep it to one sentence. The page still needs one H1
   in plain text.
9. **Real people as small tiles.** SuperPlay careers chapter
   (`superplay/scroll` s04 to s07). Real tutor headshots for the tutoring page.
   Tutors are real, so these photos must be real and approved, never generated.
10. **Short silent loops with one-word labels.** Locker Land
    (`lockerland/scroll-3500.jpg`). Real moments: Daily 10 on the bench at a
    practice break, a Zoom 1:1, a parent checking the plan, a practice-test
    morning. Use a 2 by 2 of equal tiles, not a bento grid (13).
11. **Founder photo as a tilted card.** mappy (`mappy/scroll-0500.jpg`). About
    page only, where Zakaria is introduced in full (rule 40). Keep the card
    flat, with no drop shadow (5).
12. **A parent and a student together.** Good Better Best Kids
    (`goodbetterbest/sheet-scroll.jpg`). A parent and a 17-year-old looking at
    the plan together at home. Copy rule 18 says to talk to the parent, so this
    picture matters.

## Do not copy

- **Ambient loops on everything.** Algae Explorers runs ping, pulse, bounce and
  glow on many elements at once, with no reduced-motion CSS. This is what
  rule 25 forbids. SuperPlay's levitating coins and Kizupi's bobbing bubbles
  are smaller versions of the same thing.
- **Scroll progress bars and lit-up step lists.** sonicdesk's bottom timeline
  bar, Heron's verb rail lighting up in turn, and MailerBot's highlighted step
  list (rule 37).
- **Numbered steps.** MailerBot's .01 .02 .03 and ghost step numbers. The founder
  has banned 01/02 numbering.
- **Dark sites with neon or glow.** Matters Singapore (neon lime), Google
  Language Explorer (glowing particle globe and a 6 s intro), Wafer and
  OpticOdds (dark tech). Rules 21 and 26.
- **Banned fonts.** Heron uses Geist and Wafer uses Space Grotesk (rule 10).
- **Glossy 3D tiles, tilted stickers with drop shadows, heavy rounding.** Butter's
  icons, Locker Land's and Partake's stickers (rules 5 and 19).
- **Multi-colour blurs and near-rainbow palettes.** Butter's cyan-to-violet
  headline blur and SuperHi's palette (rules 1 and 4).
- **Pastel cards.** Riot, YumLog's pink and MailerBot's lilac and lime (rule 27).
- **Loader screens and long intros.** Butter's loader and its 49 videos (an 8.1 s
  load burst), Language Explorer's 6 s intro. Content first.
- **Very long pins.** The Whoopsies (5670 px), mappy (52,379 px), Hextronics
  (145,440 px). Keep any pin to 2 to 4 viewports.
- **Play buttons on film.** Quaker's "Watch now" pill (rule 38).
- **Big numbers that are not real.** Turn.io's "50+ million people reached" style
  works only with a real figure from `src/lib/marketing/offer.ts` (copy rule 2).
- **Cartoon tone in the marketing hero.** SuperPlay's squash-and-spring and
  mascot (rule 42's tone).
- **Physical calculators, paper, brand logos and "teen on a bus" shots** in any
  imagery (rules 43 and 45).
