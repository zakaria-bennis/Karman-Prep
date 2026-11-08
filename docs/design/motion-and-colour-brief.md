# Motion and colour brief

Written 2026-11-01 for every agent that builds or changes a Karman website page.
It turns the founder's feedback and four studies of reference sites (Jack
Westin, JW+, UWorld, Grail) into rules a builder can follow and a judge can
score.

Order of authority: `docs/design-rules.md` (the numbered rules) wins over
everything. Then `docs/design/site-design-principles.md`. Then this brief. When
a technique from a reference site breaks a numbered rule, this brief gives the
rule-safe version, and only that version may be built.

Nothing in here is final until the founder sees it as working screens. Where
the brief offers options (the supporting colour, the product code), build them
side by side and let him pick.

---

## 1. What the founder is asking for

His words: "there is a lack of colour, motion animation, too much text and not
enough visual and motion cues to guide the user. Look at Jack Westin's main and
JW+ site, UWorld's simplicity and minimalism and the pop of colour and
liveliness of Grail. Make motion beautiful and intentional, and keep in mind
that you are aiming to guide the user's eye to the most important things on the
page as they scroll."

In plain words, he wants five things:

1. **More colour.** The pages read as black and off-white with a little
   marigold. He wants colour you notice: whole coloured bands, coloured
   photographs, a colour that tells you what a section is about.
2. **Less text.** Fewer words per screen. Short headlines. Paragraphs replaced
   by pictures and moving product screens.
3. **More motion, with a reason.** Things should move as you scroll, but every
   move points at something. No motion for decoration.
4. **The eye is led.** On every screen there is one thing that matters most,
   and colour, size, motion and position all push the eye to it.
5. **Simple underneath.** UWorld's calm: lots of space, one warm button, one
   coloured word per heading. Busy colour and motion on a calm page, not a busy
   page.

He also offered to make images and short videos with Gemini (he has Pro). The
prompts he should paste are in `assets/gemini-inbox/PROMPTS.md`. Nothing generated goes on a page
until he has approved it.

---

## 2. Colour

### 2.1 The palette method

Karman keeps three families of colour, each with one job.

| Role                                              | What it is                                                                           | Job                                                                                             | Never                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Primary: marigold**                             | `--marigold #EBA21F`, small text `--marigold-ink #94600A` (light) / `#F0B545` (dark) | The one action on screen, and the one focal mark per screen (a number, a keyword, a drawn line) | Decoration, large fills behind body text, more than one filled marigold shape per screen |
| **Supporting ground** (one colour, founder picks) | A deep, muted, confident colour used as whole section bands                          | Gives the page colour you feel. Carries 1 to 2 "colour beats" per page                          | Gradients between hues, glow, tints that look pastel                                     |
| **Small second accent** (optional)                | A warm earth tone used only in thin marks                                            | A second product in the product code (2.4), or a second data series                             | Fills larger than a chip; any use on a screen that already shows two hues                |

Plus the neutrals that already exist: bone `--paper #F5F5F2`, card `#FBFBF9`,
ink `#12110F`, night `#0E0D0C` (light mode), and `#151412` / `#F1EDE4` in dark
mode.

**Candidates for the supporting ground.** Build the home page in two versions
and show the founder. Both pass AA, checked by calculation:

| Name   | Hex       | Bone text on it | Marigold on it                          | Dark-mode text/line tint on `#151412` |
| ------ | --------- | --------------- | --------------------------------------- | ------------------------------------- |
| Pine   | `#1F4D45` | 8.72:1          | 4.41:1 (large text and the button only) | `#7FB8A6`, 8.16:1                     |
| Harbor | `#1D3A5F` | 10.55:1         | 5.33:1                                  | `#8FB0D8`, 8.21:1                     |

Small second accent candidate: Clay `#9A3B26` (bone text 6.35:1; dark-mode tint
`#E07A55`, 6.21:1).

How to pick, if the founder asks for a third option: choose a hue at least 90
degrees away from marigold on the colour wheel, saturation between 35% and 60%,
lightness between 18% and 30%. Reject anything purple (rule 20), anything that
reads as neon at full screen (rule 26), anything that reads as baby-pastel when
tinted (rule 27). Check bone-on-colour at 4.5:1 or more and marigold-on-colour
at 3:1 or more by calculation.

Grail's plum ground with gold buttons is the most "lively" reference, but plum
sits next to rule 20 and Karman already has near-black sections. Do not build a
plum version unless the founder asks for one.

### 2.2 How much colour per screen

Measured on the references (pixels with saturation above 0.35):
JW+ runs 70% at the hero, then 1-4% on content screens, with spikes of 13-22%
at the proof band and testimonials. UWorld runs 5-10% across a whole page.
Grail runs about 30-60% on every screen that carries a photo, because its
photographs are washed in colour.

Karman targets, per viewport, measured the same way:

| Screen type                | Coloured pixels | How                                                                         |
| -------------------------- | --------------- | --------------------------------------------------------------------------- |
| Hero                       | 30-60%          | A graded photograph or film of a student, plus the marigold button          |
| Colour beat (1-2 per page) | 60-100%         | A full-bleed supporting-ground band                                         |
| Ordinary content screen    | 8-25%           | A coloured photo or product screen, one marigold mark, one coloured keyword |
| Pricing / form screen      | 3-10%           | One marigold button, one coloured keyword, the price                        |

No screen in the page sample may be under 3% (that is the "lack of colour" the
founder means). No screen except a colour beat may be over 60%.

### 2.3 How grounds alternate

A page is a sequence of grounds. Build it as a strip first, before any detail:

```
bone (hero over film/photo)  ->  bone  ->  SUPPORTING (colour beat: proof)
->  bone  ->  bone  ->  NIGHT (closing band)  ->  footer (bone)
```

Rules:

- Never two coloured bands in a row. Always at least one bone screen between.
- At most two supporting-colour bands per page, and one night band (the close).
- Changing ground is a hard edge or a 600 ms colour cross-fade (see the
  Hand-off move in 4.3). Never a gradient between two hues (rule 1, rule 4).
- In dark mode, bone becomes `#151412`, the supporting band stays the same hue
  but 4-6 points lighter in lightness so it still reads as a band, and night
  becomes `#0A0A09`.
- Photographs may carry any graded colour (rule 48), but within one page they
  share a grade: a warm-neutral grade with the shadows pulled toward the chosen
  supporting colour. That is how Grail's photos and page look like one thing.

### 2.4 Colour marks the one important thing

- **The button.** The one highlighted action on screen (rule 35) is the only
  filled marigold shape. Black text on it (9.11:1).
- **The keyword.** Each section headline may colour one phrase of 1 to 3 words
  in `--marigold-ink` (light) or `#F0B545` (dark) on bone, or in marigold on a
  supporting band. A skimmer who reads only the coloured words gets the page's
  argument. At most one coloured phrase per headline.
- **The focal number.** A proof number (from `offer.ts`) sits in marigold, large.
- **Product code (optional, founder decides).** Borrowed from JW+, where each
  product owns a colour. Karman version: the cohort owns the supporting colour,
  Private 1:1 owns clay, and Platform/Plus stay ink. A product's colour appears
  in exactly four places: its eyebrow, a 1 px rule above its block, its chip in
  the hero, and its section's photo grade. Never on its button (buttons are
  always marigold, and only one is highlighted). Never more than two product
  hues on one screen.

---

## 3. Words

### 3.1 Hard limits

Count visible words inside the viewport at each 400 px scroll step (the
reference studies used the same method). Header and footer count.

| Limit                        | Desktop 1440x900                                         | Phone 390x844                 |
| ---------------------------- | -------------------------------------------------------- | ----------------------------- |
| Hero screen                  | 35 words or fewer                                        | 25 or fewer                   |
| Any content screen           | 80 or fewer (median under 60)                            | 60 or fewer (median under 45) |
| Pricing, FAQ, footer screens | 140 or fewer                                             | 110 or fewer                  |
| Headline (H1 or H2)          | 8 words, about 40 characters                             | same                          |
| Eyebrow                      | 3 words                                                  | same                          |
| Subline under a headline     | 1 sentence, 14 words or fewer                            | same                          |
| Body per section             | 2 sentences, 30 words or fewer, or none                  | same                          |
| Sections per page            | Home 7 or fewer; inner pages 8 or fewer                  | same                          |
| Items in a list              | 4 or fewer visible; more go behind a "See all" text link | same                          |

For comparison: JW+ has a median of about 117 words per desktop screen and
UWorld about 200. Karman goes under both.

### 3.2 Section rhythm

Every section uses the same stack, taken from JW+ and UWorld:

1. Eyebrow (3 words, small caps, `+0.04em` tracking).
2. Headline (8 words or fewer) with one coloured keyword.
3. Subline (one sentence) or nothing.
4. The visual: a moving product screen, a photograph or a drawing. This is the
   biggest thing in the section.
5. One text link or, if no other button is visible, the highlighted button.

No paragraph sits at section level. Words longer than two sentences belong in
a card next to a picture, or in the FAQ.

### 3.3 Pictures replace paragraphs

Before writing a sentence, ask whether a picture can say it. Swaps to make:

| Instead of a paragraph about | Show                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| How Daily 10 works           | A 12-second product clip: a question is answered, a missed one is shown returning "in 2 days" |
| Live classes on Zoom         | A photograph of a student on a Zoom call (student and tutor in separate places, rule 46)      |
| The parent update            | The real parent screen, cropped tight, with its first two lines animating in                  |
| Results                      | The score staircase (4.3, Count and Climb) with "Karman 1:1 tutoring, median 16 weeks"        |
| What's in a plan             | A list of four rows that swaps one product screen at a time (UWorld's tabbed demo)            |
| The schedule                 | A small calendar drawing (Hairline style) with the test date marked in marigold               |

Copy itself is written with the conversion-copywriter skill into the mock's
`copy.js`. This brief sets the word budget, not the words.

---

## 4. Motion

### 4.1 Principles

- Every move has a job from this list: show the product working, reveal words
  in reading order, land the eye on the focal element, show a number is real,
  mark that the reader has entered a new part of the page, or confirm a tap. If
  a move does none of these, cut it.
- One easing set and one duration set across the site (principles checklist,
  item 28). Use only the tokens in 4.2.
- Move transforms and opacity only (`x`, `y`, `scale`, `opacity`, `clipPath`
  insets). Never animate `width`, `height`, `top`, `left`, `filter: blur` on
  large areas, or `box-shadow` (gsap-performance skill).
- Scroll is never hijacked. No smooth-scroll library, no scroll-jacking, no
  slowed scroll. ScrollTrigger reacts to native scroll.
- Everything is interruptible and plays once. A reveal that has played stays
  revealed; scrolling back up does not replay it.
- Nothing fills, ticks or lights up as the reader scrolls (rule 37). No reading
  progress bar.
- No animated arrows (rule 24). No hover animation except what a control
  needs: colour change on links, a 0.97 press scale on buttons (rule 25).
- Text never moves while it is being read. It arrives, then holds still.
- Reduced motion: built once, with `gsap.matchMedia()` (see 4.5).

### 4.2 Tokens

Define these once in a shared module (for example `src/lib/motion/tokens.ts`)
and register them with GSAP. No component writes its own easing or duration.

| Token           | Value                                                   | Use                                          |
| --------------- | ------------------------------------------------------- | -------------------------------------------- |
| `ease.out`      | `expo.out`                                              | Words and objects arriving                   |
| `ease.inOut`    | `power3.inOut`                                          | Colour and ground changes, screen swaps      |
| `ease.settle`   | `CustomEase "0.2,0.8,0.2,1"` (or `power4.out`)          | Numbers settling, the focal mark landing     |
| `dur.quick`     | 0.2 s                                                   | Press feedback, link colour                  |
| `dur.base`      | 0.6 s                                                   | Ground cross-fade, screen swap               |
| `dur.reveal`    | 0.9 s                                                   | Word rise (matches the existing site reveal) |
| `dur.count`     | 1.2 s                                                   | Number roll                                  |
| `stagger.words` | 0.06 s                                                  | Word rise, line by line                      |
| `stagger.items` | 0.08 s                                                  | List rows, chips, staircase steps            |
| `dist.rise`     | 100% of the line inside a mask (words), 24 px (objects) | Travel                                       |
| `start.reveal`  | `"top 78%"`                                             | When a section's reveal begins               |
| `start.focus`   | `"top 55%"`                                             | When the focal move fires                    |

### 4.3 The vocabulary

Seven named moves. A page may use only these. Each section uses at most two,
and every screen has exactly one Land.

**1. Arrive (load sequence, first screen only)**

- Trigger: page load, after the first paint. Never waits for video.
- Sequence (one `gsap.timeline()`): film or photo poster is already visible at
  0 s, so the screen is never blank and never black. 0.1 s: headline words
  Rise. 0.45 s: subline fades and lifts 12 px. 0.7 s: the highlighted button
  scales from 0.96 to 1 and fades in (0.5 s, `ease.out`). 0.9 s: the video
  starts under the poster and cross-fades in over 0.6 s once its first frame is
  decoded.
- Total under 1.4 s. Something moves within 1 s of load (principles, section 9).
- Job: tells the reader what this is, then where to press.

**2. Rise (word reveal, the site's one reveal style)**

- Trigger: ScrollTrigger at `start.reveal`, `once: true`.
- Words or lines rise from a mask (`yPercent: 100 -> 0`) and fade in,
  `dur.reveal`, `ease.out`, `stagger.words`. Never letter by letter, never
  scatter, flip or collide (principles, section 6).
- Objects in the same section (a photo, a product screen) rise 24 px and fade
  in 0.1 s after the headline starts.
- Job: reveals words in reading order so the eye reads top to bottom.

**3. Land (the eye-guide; one per screen)**

- The move that puts attention on the screen's single most important element,
  after everything else has arrived. Fires last in its section's timeline, at
  `start.focus`.
- Pick one form per focal element:
  - _Keyword ink._ The coloured keyword in the headline starts in ink and turns
    marigold-ink (or marigold on a band), 0.3 s, `ease.inOut`, 0.12 s after a
    hand-drawn underline under it draws from left to right (SVG stroke, 0.5 s,
    `ease.settle`, 80 px or the word's width). The underline is a single
    Hairline-style stroke, not a bar.
  - _Settle._ The focal object (a number, a price, the button) arrives 8 px low
    at 0.98 scale and settles, 0.6 s, `ease.settle`.
  - _Draw._ A thin marigold line (1.5 px) draws from the headline to the focal
    element, showing the eye where to go (a path along a staircase, a circle
    around a test date). 0.8 s, `ease.settle`. It draws once and stays.
- Never pulses, loops, bounces or glows. It plays once and the element holds.
- Not a scroll indicator: it fires once per heading and carries no progress
  meaning (rule 37).
- Job: says "this is the thing on this screen".

**4. Demo (product screens in motion)**

- The real product, moving, is Karman's main visual. Two forms:
  - _Live demo_ (built in the page with GSAP): a cropped real screen
    (rule 44, readable at its shown size) enters with Rise, then a short
    `gsap.timeline()` plays the product doing one thing: a choice is tapped
    (0.2 s press), the answer state appears (0.4 s), the explanation line
    rises (0.6 s). Starts at `start.focus`. Holds on the final frame. A quiet
    "Play again" text link may replay it.
  - _Clip_ (rendered with Remotion, see 4.4): for anything longer than about
    4 seconds or with many steps.
- Screens swap in a list-and-screen layout (from UWorld): the reader taps a row
  in a list of up to four; the screen cross-fades (`dur.base`, `ease.inOut`)
  and the active row turns ink with a marigold 2 px rule beside its text, not a
  coloured stripe on the card edge (rule 11). Tapping is the only trigger; no
  auto-advance while the reader is in the section.
- Job: shows the actual product (rule 18) and gives the eye something to watch
  instead of a paragraph.

**5. Count (numbers that prove something)**

- An odometer: each digit is its own `overflow: hidden` column of 0-9, moved by
  `yPercent`. Trigger: ScrollTrigger at `start.focus`, `once: true`. Columns
  roll right to left, staggered 0.06 s, `dur.count`, `ease.settle`.
- Only real figures from `src/lib/marketing/offer.ts` (for example 10,000+
  questions, or +285 with its label). The source label sits next to the number
  and is visible before the roll starts (copy rule 20).
- Up to two counts per page, both in the same band. The band is a colour beat
  (supporting ground), so motion and colour land together, as on JW+.
- Under reduced motion, the final number is shown directly.
- Job: makes the proof the brightest, only moving thing on that screen.

**6. Climb (the score staircase)**

- From JW+'s "three factors" chart, redrawn in Karman's style. A static
  drawing: a short step labelled with the real starting average (1235), then
  steps naming what Karman adds (Daily 10, live class, 1:1 review), then the
  tallest step, the only marigold fill, carrying the real average after (1520)
  and the label "Karman 1:1 tutoring, median 16 weeks".
- Steps have different heights and widths (never three matching cards,
  rule 6). Hairlines, no shadows, square-ish corners (4 px at most).
- Entry: steps rise once, 24 px, `stagger.items`, `ease.out`; then Land (Draw)
  traces a marigold line up the steps to the final number, then Count rolls
  1235 to 1520 once. Not scroll-scrubbed, never fills as the reader scrolls
  (rule 37).
- At 390 px it becomes a vertical stack; no sideways scroll (rule 28).
- Job: the page's single strongest picture of the outcome.

**7. Hand-off (section transitions)**

- When the next section has a different ground, the ground colour cross-fades
  over `dur.base` (`ease.inOut`) as that section's top crosses 60% of the
  viewport. Implement as an opacity change on a full-bleed layer, not a
  background-color tween on the body.
- Photographs in the section move with a light parallax: `y` from +40 px to
  -40 px across the section's time on screen (`scrub: true`). Only photographs
  and film, never text, never product screens being read. Off on phones under
  768 px wide and under reduced motion.
- One pinned moment per page at most, only for a Demo or the Climb, at most
  150vh of pin, and nothing sticky sits over text being read (rule 34).
- Job: tells the reader "you have entered a new part", and gives depth.

**Plus: Press.** Buttons scale to 0.97 on press within one frame, spring back
in 0.2 s. A 20 px thinking orb shows inside the button only if the next page
takes over 400 ms (already in the principles). This is the only hover/press
motion on controls.

### 4.4 Video built in code (Remotion)

Use the remotion-best-practices skill. Clips show real Karman screens, built
from the same React components and design tokens as the product, with content
the founder has approved (rule 44) and Karman-original questions (rule 45).

- Length 10 to 16 seconds (nothing loops in under 10 seconds). 30 fps.
- Renders: 1600x1000 desktop and 900x1600 portrait phone, light and dark
  versions of each, H.264 MP4 plus WebM, under 1.5 MB each. Poster = a
  meaningful frame (the question on screen), exported as AVIF/WebP.
- Choreography inside the clip uses the same tokens as the page (`expo.out`,
  0.9 s rises). A visible "finger" or cursor causes every change; nothing
  changes on its own.
- No score result on any screen held by a generated person (rule 47).
- On the page: `muted`, `playsinline`, `autoplay` only once in view, preload
  about 1.5 screens ahead, poster first so the frame is never black (JW's
  tutoring video shows 200 ms of black; Karman must not). Never in the LCP
  path. No visible play/pause on background film (rule 38), but the site-wide
  Pause control stops it.

Clips to make first:

1. Daily 10: three questions answered, one missed, the missed one shown coming
   back "in 2 days".
2. Live class on Zoom: the question screen with the tutor's annotation drawn
   over it and two webcam tiles (student, tutor, each in their own place).
3. Parent update: the weekly note arriving and its first two lines filling in.

### 4.5 Building it with GSAP and ScrollTrigger

Use the gsap-core, gsap-timeline, gsap-scrolltrigger and gsap-performance
skills. In the Next.js app:

- One client module registers `ScrollTrigger` and `CustomEase` once, and
  exports the tokens. Each section owns one timeline created in a
  `useGSAP()` (or `gsap.context()`) scope and reverted on unmount.
- Wrap all setup in `gsap.matchMedia()`:
  - `(prefers-reduced-motion: no-preference)`: the full vocabulary.
  - `(prefers-reduced-motion: reduce)`: Rise becomes a 0.2 s opacity fade with
    no travel; Land shows the final state (coloured keyword, drawn underline)
    with a 0.2 s fade; Count shows the final number; Demo shows its final
    frame with "Play" as a text link; clips show posters only; no parallax; no
    pin.
  - `(max-width: 767px)`: no parallax, no pin, shorter distances (16 px).
- Use `ScrollTrigger.batch()` for lists so rows reveal together instead of one
  trigger each.
- `once: true` on every reveal. Refresh ScrollTrigger after fonts and images
  load.
- Set initial hidden states in CSS only inside `.js-motion` so the page reads
  fully if JavaScript fails (principles checklist, item 19).
- Budget: the motion bundle (GSAP core, ScrollTrigger, CustomEase) under 45 KB
  gzipped. Run `npm run check:sizes`. No other animation library on the site.

---

## 5. Eye guidance

### 5.1 One focal element per screen

At every 400 px scroll step, a judge must be able to point at one element and
say "that is what this screen wants me to see". It is the only element with
all of these:

| Lever    | The focal element                                                                                     | Everything else                                     |
| -------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Scale    | The largest type or object on screen (a number at 64-120 px, the product screen at 40%+ of the width) | At least 1.6x smaller                               |
| Colour   | Marigold (fill, keyword or line)                                                                      | Ink, bone, the supporting ground                    |
| Motion   | Gets the Land move, last in the sequence                                                              | Arrived earlier and is now still                    |
| Position | On a strong line: the left reading edge at about one third across, or centred on a centred screen     | Grouped around it, not competing on the other third |
| Space    | At least 48 px of clear space on every side                                                           | Packed closer together                              |

If two elements on a screen score on three or more levers, the screen fails.

### 5.2 The path the eye travels

Each screen is choreographed in this order, and the timeline matches it:

1. **Picture or motion first.** A face, a moving product screen or a coloured
   band catches the eye (people and motion are seen before words).
2. **Headline.** Rises while the picture is still; the eye moves to it because
   it is now the thing moving.
3. **Focal element.** Lands last. If the focal element is the button, it is
   the only marigold fill and sits directly under or beside the headline.

Example screen plans for the home page (the builder fills in the real copy):

| Screen        | Ground            | Picture or motion              | Focal (Land)                |
| ------------- | ----------------- | ------------------------------ | --------------------------- |
| 1. Hero       | Bone over film    | The day film                   | The highlighted button      |
| 2. The climb  | Bone              | Climb drawing                  | 1520, with its label        |
| 3. Daily 10   | Bone              | Daily 10 clip in a phone frame | The keyword "ten minutes"   |
| 4. Proof band | Supporting colour | Count rolling 10,000+          | The number                  |
| 5. Live class | Bone              | Zoom photo + class clip        | The next start date         |
| 6. Parents    | Bone              | Parent screen Demo             | The keyword in the headline |
| 7. Close      | Night             | Orbit film still               | The highlighted button      |

### 5.3 Checks

- Squint test: blur a screenshot by 12 px. The focal element is still the
  brightest or most saturated shape.
- First-fixation test: show the screenshot for one second to someone who has
  not seen it. They name the focal element.
- On phones, the focal element is inside the top 70% of the viewport, above the
  thumb dock.

---

## 6. Visuals

### 6.1 What fills the space

1. **Real product screens, animated** (Demo and Remotion clips). The main
   visual on every product section. Tight crops, readable at the shown size,
   close to 1:1, never a whole dashboard shrunk (rule 44). Phone screens in the
   iPhone 17 Pro Max frame (rule 58).
2. **Generated photographs of students aged 16 and 17**, then parents and
   tutors (rules 41-47). Locked in, phones and laptops, anywhere they study,
   Zoom shown as it is. Screens in the photos are composited from our own
   rendered screens, never left to the image model. Graded to the page (2.3).
3. **Short clips made in code** (Remotion) of real screens (4.4).
4. **Hairline drawings** for ideas with no screen (the schedule, the climb,
   the test date). Custom, one stroke weight, marigold for the one hot mark.
5. **The day film** behind the landing page, as already built.

### 6.2 How big and how often

- Every viewport at 1440 has a picture, product screen or drawing taking at
  least 35% of its area. Every phone viewport has one taking at least 40% of
  the width and 25% of the height.
- A person (photo or film) appears at least every third screen.
- A real product screen appears at least every second screen on product pages
  and at least three times on the home page.
- Pictures are never decorative backgrounds behind body text. Over film, text
  sits on a linear scrim and passes AA on every sampled frame.
- Faces are never cropped by the header or dock at any scroll position.

### 6.3 What never fills the space

Icon-in-a-circle cards, stock icons (rule 2, rule 52), three equal cards
(rule 6), bento grids (rule 13), checkmark lists (rule 16), floating blobs or
orbs (rule 21), dot grids (rule 22), sparkles (rule 23), physical calculators
or paper (rules 43, 45), a terminal window (rule 14).

---

## 7. What to take from each reference

### Jack Westin (main site and tutoring page)

| Take                                                                                                                                                                            | Never copy                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| The tutoring hero: the real product being used (a passage annotated live, webcam tiles around it, one round proof badge). Karman's version is the Zoom class clip, poster first | Purple/indigo grounds, violet buttons and glowing pills (rules 5, 20, 26)                  |
| An odometer count on a single dark band in a light page (Count)                                                                                                                 | The rainbow gradient strip, the diagonal ribbon, the gradient course rows (rules 1, 4, 26) |
| A closing full-bleed dark band with one headline and one button                                                                                                                 | Pill buttons and 15-22 px rounded cards (rule 19)                                          |
| A fixed bottom action strip on long service pages, shown only once the hero button is off screen (rule 35)                                                                      | Countdown timers, promo modals, a cookie banner with no decline (rule 32)                  |
|                                                                                                                                                                                 | The 8-card "Is this right for me?" grid and 233-361 word screens                           |
|                                                                                                                                                                                 | Unverifiable stats ("40,000+ students")                                                    |

### JW+ (the self-study landing page)

| Take                                                                                               | Never copy                                                                                  |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A colour code: each product owns one colour, used in the same few places down the page (2.4)       | Three matching factor cards, three outlined columns, three-up testimonials (rule 6)         |
| The score staircase as layout, redrawn with Karman's real numbers and label (Climb)                | Their exact layout, violet pills or 502 -> 514+ look: take the mechanism, not the signature |
| Eyebrow, headline, one subline, then the visual (3.2)                                              | Pastel card washes (rule 27), checkmark comparison tables (rule 16)                         |
| A hero that proves the product with its own artefacts (Karman: the day film with readable screens) | Every section having its own filled button (rule 35)                                        |
| A shaped exit from the hero: Karman's is a flat marigold hairline, no glow                         | A sticky sub-nav that overflows on phones (rule 28)                                         |
| One big price as the only large element on the pricing screen                                      | Long static stretches: JW+ moves almost nothing after the hero                              |

### UWorld (SAT hub and SAT course page)

| Take                                                                                                                                                                                                | Never copy                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| One warm button on a calm page: marigold is the warmest pixel on screen (2.4)                                                                                                                       | Drop shadows on cards (rule 5)                                    |
| One coloured keyword per headline, plus a short mark under it, here drawn by the Land move                                                                                                          | Pure white grounds (rule 3)                                       |
| Pricing straight after the hero on the pricing page, with the recommended plan singled out (a small tab, a tinted column, the only marigold button). Two or four plans shown, never three (rule 17) | Three pricing tiers side by side (rule 17), green ticks (rule 16) |
| A working question embedded mid-page (Karman: a live Daily 10 question)                                                                                                                             | 150-250 word screens of grey body copy                            |
| A list-and-screen swap instead of a feature grid (Demo)                                                                                                                                             | Carousels of tutor cards and awards; the stock duotone icons      |
| A header that becomes solid after the hero and never covers text                                                                                                                                    | The 3D bar-chart illustration and "200+ points" claim style       |

### Grail

| Take                                                                                                                                    | Never copy                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Colour through photographs: full-bleed photos of real people graded toward one brand colour, so the page feels alive without decoration | Plum/purple as the ground (rule 20 risk); Karman uses its own supporting colour   |
| Warm gold buttons on a cool, deep colour: the same idea as marigold on Pine or Harbor                                                   | Fancy rotating headline text (typed cursor, flip-in words); Karman uses Rise only |
| Large serif-like editorial headline over a person, with very few words (34 words on the hero)                                           | Repeated identical "Learn more" buttons on every block (rule 35, copy rule 12)    |
| Photo-led story blocks: one face, one short quote line, one action. Karman may only quote real, approved people (rule 12)               | Dot-grid textures behind photos (rule 22)                                         |
| A low word count on early screens (34-99 words)                                                                                         | Icon tiles with chevron arrows                                                    |

---

## 8. Judge's checklist

Score each item pass (1) or fail (0) at 1440x900, 1280x720 and 390x844, in
light and dark mode, at every 400 px scroll step. Items marked **gate** fail
the page outright. A page ships at 90% or more with every gate passed.

**Rules (gates)**

1. **gate** No gradient between hues, no drop shadow, no glow, no orb, no dot
   grid, no neon, no pastel wash, no rainbow, no purple-and-black (rules 1, 4,
   5, 20, 21, 22, 26, 27).
2. **gate** One highlighted button visible at any scroll position (rule 35).
3. **gate** No text overlaps text, and nothing fixed or sticky sits over text
   being read (rule 34).
4. **gate** All text passes AA in both modes, by calculation, including over
   sampled film frames (rule 33).
5. **gate** Nothing fills, ticks or lights up with scroll; no progress bar
   (rule 37).
6. **gate** No animated arrows; hover motion only on controls that need it
   (rules 24, 25).
7. **gate** Reduced motion on: no travel, no parallax, no pin, no video, final
   states shown, nothing hidden.
8. **gate** No horizontal scroll at 375 px (rule 28).
9. **gate** Every number comes from `offer.ts`, with its label beside it.

**Colour** 10. Coloured pixels per screen inside the ranges in 2.2; no screen under 3%. 11. One or two supporting-colour bands; never two coloured bands in a row. 12. At most one coloured keyword per headline; at most two product hues per
screen. 13. Photos on the page share one grade.

**Words** 14. Hero 35 words or fewer (desktop) / 25 (phone). 15. Content screens 80 or fewer (desktop) / 60 (phone); medians under 60 / 45. 16. Every headline 8 words or fewer; no section paragraph over two sentences. 17. Home page 7 sections or fewer.

**Motion** 18. Only the seven named moves (plus Press) are used, with the shared tokens. 19. Something moves within 1 second of load; the first screen is never blank
or black. 20. Every screen has exactly one Land, and it fires last. 21. Every reveal plays once and does not replay on scroll up. 22. Only transforms and opacity animate; no long task over 50 ms during
scroll in a Chrome performance trace. 23. Videos: poster first, muted, playsinline, loaded about 1.5 screens ahead,
never in the LCP path; LCP under 2.5 s on mobile. 24. At most one pin per page, 150vh or less, none on phones.

**Eye guidance** 25. At every step a judge can name one focal element, and it wins on scale,
colour, motion and position (5.1). 26. The blur test and the one-second test both find the focal element (5.3). 27. The order picture, headline, focal element matches the timeline.

**Visuals** 28. Every viewport has a picture, product screen or drawing at 35% of its area
or more (desktop), 40% width and 25% height (phone). 29. A person every third screen or sooner; a real product screen at least
three times on the home page. 30. Product screens are readable at their shown size and show approved
content; no score in a generated person's hands.

**Craft** 31. Every button and link clicked in a real browser and working. 32. All checks in `CLAUDE.md` pass (`tsc`, lint, format, tests, sizes,
`cf:build`).

---

## Appendix: prompts for Gemini

The first set of prompts here was withdrawn on 2026-11-01 because every shot
was the same scene. Which kinds of pictures Karman uses is now set in
`docs/design/imagery-direction.md`, and the prompts to paste into Gemini are in
`assets/gemini-inbox/PROMPTS.md` (batch 2).
