# Imagery direction

Written 2026-11-01. It sets what kinds of pictures and film Karman uses, and
how each is made. It answers the founder's note that every picture so far was
the same scene, one none of his reference sites use.

Order of authority: `docs/design-rules.md` wins, then
`docs/design/site-design-principles.md`, then
`docs/design/motion-and-colour-brief.md`, then this page. Nothing here is final
until the founder has seen it as working screens.

The prompts to paste into Gemini are in `assets/gemini-inbox/PROMPTS.md`
(batch 2).

## Where this came from

Four studies, all screenshots taken at 1440 x 900 without signing in:

- **21st.dev.** Heroes, scroll stories, image reveals, number counters and the
  Remotion video blocks.
- **Education sites.** Duolingo, Brilliant, Khan Academy, Quizlet, Synthesis,
  Outschool, Speak, Photomath, Princeton Review, Magoosh, Varsity Tutors,
  Preply, Coursera and Jack Westin.
- **Consumer and money brands.** Grail, Function Health, Oura, Headspace, Hims,
  Ramp, Mercury, Cash App, Monzo, Airbnb, Spotify Wrapped, Nike, Glossier and
  Liquid Death.
- **Product companies.** Apple (iPhone, MacBook Air, AirPods), Stripe, Linear,
  Notion, Arc, Raycast, Superhuman, Things, Vercel, Rive, Lego and Teenage
  Engineering.

Also the earlier study of your four references (Jack Westin, JW+, UWorld and
Grail), in `motion-and-colour-brief.md`.

Not covered: Mobbin was not part of these four studies. Calm, MasterClass and
Kaplan blocked the screenshot tool with a "verify you are human" check, and we
did not try to get past it.

---

## 1. What went wrong

Every picture we made was the same idea: one teenager, alone, holding a phone,
in an everyday place (a bus, a bench, a kitchen). Only the place changed, so
the page felt like one photo repeated. None of your reference sites work that
way, and neither do the strong sites in the studies. Brilliant, Cash App and
Ramp make the product itself the picture. Hims and Function shoot people on a
coloured backdrop that matches the section. Preply shows tutoring as two video
tiles. Nike changes the camera every time: from above, from low down, with
coloured light. Oura moves in close on a hand. Variety comes from changing
**the camera, the ground and what fills the frame**, not from moving the same
teenager to a new seat. There was also a practical problem. A phone in a hand
puts the product small and at an angle, so it is hard to read. That works
against rule 18 (show the real product) and rule 44 (readable screens).

---

## 2. The menu: eight imagery systems

Each one is a different way of making a picture, not a different place. Four
of them come from outside education.

### A. Real product screens, animated in code

- **What it looks like.** One part of the Karman app (a question card, a
  toast, a parent row) is lifted out of the app, shown at 1.5 to 2 times its
  size, and set on a flat block of colour. No phone around it, or a thin
  iPhone 17 Pro Max frame. A finger or cursor makes one thing happen: a choice
  is tapped, the explanation rises, "Daily 10 done" appears.
- **Where it was seen.** Cash App's home page (a big phone of real app cards
  on flat green). Ramp (receipt toasts and cards stacked in). Brilliant (one
  piece of the lesson, looping on a sage or peach panel). Airbnb's 2026
  release page (pairs of real screens on pale plates). The 21st.dev Remotion
  blocks "Sliding Screenshot Color Planes" and "Phone To Laptop Handoff".
- **For Karman.** Your Daily 10 on a marigold block: a question is answered,
  one is missed, and it shows "back in 2 days". The live class page on pine.
  The parent's weekly note on clay, with its first two lines arriving.
  Wordline on ink.
- **How it moves.** It rises in when its section arrives, plays its one action
  once, and holds on the last frame. Longer stories (phone to laptop) are
  10 to 16 second clips. Coloured planes slide in to frame the screen, like a
  poster.
- **Rules.** 18, 44 (real, approved screens only), 45 (Karman questions only),
  5 (separate layers with a thin line, never a shadow), 13 (never tiled into a
  grid), 39 (no levels), 37 (plays on a timer, never fills as you scroll).
- **How it is made.** Remotion code and GSAP, from our own React screens.
  Nothing generated.

### B. Studio portraits on a colour backdrop (from health brands)

- **What it looks like.** One person, waist up, on a seamless paper backdrop
  in one strong colour. The backdrop colour is the section's colour, so the
  photo and the band read as one block. Soft light from above. No room, no
  props. The headline can sit above the head.
- **Where it was seen.** Hims (a young man on terracotta, headline over his
  head). Function Health (doctors and members on grey and black). Coursera
  (people cut out on peach blocks). 21st.dev "Hero Section with Cards" (five
  portrait cards fanned, each on its own colour).
- **For Karman.** A cast, not one person: a 17-year-old on marigold, a
  16-year-old on pine, a parent on clay, a tutor on bone. Each holds a phone or
  laptop turned away from the camera. Captions are a first name and a time
  only ("Ava, 6:50 a.m.").
- **How it moves.** In the hero, the portraits deal in as a fan under the
  headline, one after another, then hold still. Elsewhere, one portrait
  rises in with its band.
- **Rules.** 41, 42 (a small smile at most), 43 (no logos), 47 (no score, no
  quote, no claim they are students), 12, 27 (strong colours, never pastel),
  5 and 19 (thin line, small corners).
- **How it is made.** Gemini Nano Banana stills. Layout and the fan in GSAP.

### C. A real place, with a product card floated over it (from money and language apps)

- **What it looks like.** A photo of people somewhere real, with room left on
  one side. A crisp product card sits over the photo or hangs off its edge,
  as if the app had written a note on real life. The screen leaves the phone.
- **Where it was seen.** Speak (friends at a cafe table, a live transcript card
  over them). Monzo (a man on a picnic blanket with "Salary +£2,600" set on
  the photo). Quizlet (a game card hanging off a photo of a student).
- **For Karman.** Two students on the bleachers by an indoor pool, with the
  real "Challenge question" card floated beside them. A parent in the school
  pickup line, with "Maya finished Daily 10" floated over the windshield. A
  student on the edge of a stage at rehearsal, with the next class card. New
  places each time, not the bus, bench or kitchen.
- **How it moves.** The photo arrives first with a slight drift. The card
  rises in a beat later and its one detail (a tick, a time) lands last.
- **Rules.** 44 (the card is our own screen, placed in code, never baked into
  the photo), 47, 5, 8 (flat cards, no glass), 19, 42.
- **How it is made.** Gemini Nano Banana stills with no readable screen in
  frame. Card in React, motion in GSAP.

### D. Zoom tiles (from tutoring marketplaces)

- **What it looks like.** Two head-and-shoulders portraits, cropped like video
  call tiles: the student large, the tutor small. Each is in their own room,
  lit their own way. A real Karman screen sits beside them.
- **Where it was seen.** Preply's hero (learner large, tutor small, on a pink
  block). Varsity Tutors (tiles next to a session summary card). Synthesis (a
  webcam frame next to the product). Jack Westin's tutoring page.
- **For Karman.** A 17-year-old at her desk in the evening, large. David, the
  tutor, in his own study, small, talking. Beside them, the question on screen
  with David's markup circling one phrase.
- **How it moves.** The tutor tile is a short speaking loop. The markup draws
  itself once on the question.
- **Rules.** 46 (each in their own place, never in the same room), 47 (no
  score widgets on the student tile), 2 and 52 (camera and microphone icons
  drawn for Karman), 44.
- **How it is made.** Nano Banana for the student, Gemini Veo for the tutor
  loop, tiles and markup composed in Remotion or React.

### E. Editorial portraits with hard, coloured light (from sport)

- **What it looks like.** Real people shot like athletes in training: from
  directly above, from low down, or lit with one strong coloured light. One
  colour leads each photo. Large, full width or two side by side.
- **Where it was seen.** Nike (a top-down shot of an athlete lying on grass,
  athletes lit with coloured light on black). The 21st.dev "Parallax Strip
  Slider" (a portrait graded all in amber, with one big word).
- **For Karman.** A 16-year-old lying on a running track infield, seen from
  above, phone held up over her face. A student lit by a marigold light against
  near-black, AirPods Max on, eyes down. Fits the cohort's "it ends on test
  day" idea.
- **How it moves.** Large and still, with a slow parallax. Between chapters, a
  strip wipe can change one portrait into the next.
- **Rules.** 42 (focused, never shouting like Nike), 43 (no logos), 26 (warm
  marigold light, not neon), 48 (grades chosen as a set).
- **How it is made.** Nano Banana stills. Veo for a slow push-in. Strip wipe in
  GSAP.

### F. Close-up hands (from wearables)

- **What it looks like.** A very close crop: a thumb, a wrist, the edge of a
  phone. Shallow focus, soft light, a flat tint behind. The hand is big; the
  object is small and central.
- **Where it was seen.** Oura's hero (one hand very large, pinned while the
  words scroll past). Hims (product resting on a close-up of skin).
- **For Karman.** A thumb just about to tap an answer on Your Daily 10, the
  answer row sharp and everything else soft. The real screen is placed in.
- **How it moves.** Pinned on one side while two short lines scroll past on
  the other (once per page at most).
- **Rules.** 41 (a hand alone is not enough; a face must appear nearby on the
  page), 44, 45.
- **How it is made.** Nano Banana still, with the screen left blank and our
  screen placed in afterwards.

### G. Places at a big scale (from banking and travel)

- **What it looks like.** A wide, high or cinematic shot of a real place, with
  one small person in it. Low contrast, so words can sit beside it.
- **Where it was seen.** Mercury (a desk on a misty ridge at dawn). Function
  Health (sun through redwoods, full screen). Brilliant (a dusk aerial of a
  university town). Monzo (two friends in a bright arcade).
- **For Karman.** A drone shot of a school car park at 6:50 a.m., one student
  walking in. A student at the rail of a ferry at dawn. Good for the landing
  film and the closing band.
- **How it moves.** Full screen, a slow push-in, poster frame first. No play
  button (rule 38).
- **Rules.** 41 (always a person in frame), 38, 42, 43.
- **How it is made.** Gemini Veo, 8-second clips.

### H. Colour planes and big numbers (type as the picture)

- **What it looks like.** Flat blocks of marigold, pine and clay slide in with
  hard edges. One true number from `offer.ts` fills a third of the screen.
- **Where it was seen.** 21st.dev Remotion "Shock Stat Counter" and "Graphic
  poster bands". Cash App (a whole screen of one colour). Spotify Wrapped
  (giant numerals behind the title).
- **For Karman.** "10,000+" original questions, "$29 a month", or the March 6
  SAT date set huge on a pine band.
- **How it moves.** Digits roll once into place. Planes slide once.
- **Rules.** 4 (three colours at most), 26 (marigold, not acid yellow), 37 (no
  filling bar), copy rule 2 (real numbers only), 41 (never the only picture on
  a page).
- **How it is made.** Remotion for film, GSAP for the site. Nothing generated.

### Looked at and turned down

- **Mascots and cartoon characters** (Duolingo, Khan Academy, Headspace).
  Breaks rules 41 and 42.
- **Glossy 3D maths symbols at the page edges** (Photomath). Lively, but it is
  a still life and close to an orb (rules 21 and 41). A possible later
  experiment, not part of this set.
- **Starry night behind glowing screens** (Synthesis). Too close to neon and
  purple (rules 20, 21, 26). The app's own sky stays inside the app.
- **Tilted polaroids and phone snapshots** (Magoosh, Synthesis). Only for real
  photos of real people, once they exist.

---

## 3. The recommended mix

Use three systems together: **A (real screens in motion), B (studio portraits
on colour) and C (real places with a card floated over them).** E, F and G are
used once each where a page needs a big moment. H is the proof band.

Why these three:

- **Colourful.** B brings colour through the backdrop, and A sits on the same
  coloured blocks. The colour comes from whole blocks of marigold, pine and
  clay, not from tints or gradients. That is Grail's idea, made Karman's.
- **Lively.** A always moves, and C's card arrives a beat after its photo.
  Something on every screen does one clear thing.
- **Clear.** The product is never tiny on a tilted phone. It is large, flat
  and readable, and the people say who it is for.

How they combine down a page (home page as the example):

| Screen        | Picture                                                            | Colour                                 |
| ------------- | ------------------------------------------------------------------ | -------------------------------------- |
| Hero          | B: the cast of portraits fanned under the headline                 | Bone, with each card on its own colour |
| Daily 10      | A: the Daily 10 question, answered and missed, on a marigold block | Marigold block on bone                 |
| Live class    | D: student tile and David's tile beside the real question          | Bone                                   |
| Proof band    | H: one number rolls in, with its label                             | Pine band                              |
| Where it fits | C: pool bleachers with the Challenge question card floated over    | Bone                                   |
| Parents       | B then A: the parent portrait on clay, then the real parent note   | Clay block                             |
| Close         | G or E: one big still or film moment, one button                   | Night band                             |

Rules for the mix:

- Never two screens in a row with the same system.
- A person appears at least every third screen. A real screen appears at
  least three times.
- All photos share one grade: warm neutral, with shadows pulled toward pine
  (toward deep blue if Harbor is chosen instead).
- Backdrop colours are only marigold, pine (or Harbor), clay, bone and ink.

---

## 4. 21st.dev components worth porting

Port the code, recolour with Karman's tokens, strip shadows and visible
play buttons, and credit the id in a comment.

**On the page**

| Id    | Name                                           | What for                                                                            |
| ----- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| 31460 | Hero Section with Cards (scrollxui)            | The hero fan of colour-backdrop portraits (B)                                       |
| 19079 | Centered Hero with Image Fan                   | Alternative to 31460 for the same fan                                               |
| 19078 | Split Hero With Image Cards (felipemenezes098) | Plans page: cohort and Private as photo cards with a price line                     |
| 19074 | Editorial Collage Hero                         | Private 1:1 page: student still and tutor still overlapped                          |
| 29767 | Features With Panel (scrollxui)                | Product tour: a short list beside one real screen that swaps (A)                    |
| 27355 | Phone Scroll Hero (ruixen.ui)                  | The orange iPhone 17 Pro Max with the real Daily 10 screen rising over the headline |
| 20020 | Phone Mockups 1                                | Base for a large phone of real screens, Cash App style                              |
| 29339 | iPad Mockup                                    | The parent note on iPad                                                             |
| 24466 | Scroll Reveal Image (unlumen)                  | A small window that grows into the live-class film                                  |
| 26064 | Sticky Content Wrapper (hyperiux)              | "A week with Karman": words on one side, one picture per day on the other           |
| 26866 | Parallax Strip Slider (hyperiux)               | Strip wipes between graded portraits (E), with no visible controls                  |
| 30118 | Scroll Gallery (soralabs)                      | Full-screen wipes between product moments                                           |
| 25275 | Stacking Cards (danielpetho)                   | The plan ladder on phones as stacking colour cards                                  |
| 26895 | Two-Plan Pricing Cards (ln-dev7)               | Platform $29 next to Plus $49, plain lines instead of ticks                         |
| 29418 | Split Feature Section (uiable)                 | Parent view beside student view (recolour from purple)                              |
| 20068 | Count Up (unlumen)                             | Real numbers from `offer.ts` rolling in (H)                                         |
| 20459 | Number Ticker (danielpetho)                    | Same job, on load rather than on scroll                                             |
| 26070 | Rolling Text (hyperiux)                        | A price or the SAT date rolling like a slot reel                                    |
| 28388 | Dual Wipe Reveal (soralabs)                    | Section headlines revealed by marigold and ink blocks                               |
| 19260 | Text Reveal Block (soralabs)                   | Line-by-line colour wipe for the line before the button                             |
| 1944  | Infinite Text Marquee                          | A slow line of real SAT skill names behind one Daily 10 card                        |
| 10905 | Reveal Image Mask                              | A tutor portrait opening from a circle                                              |
| 39591 | Mask Reveal (balick)                           | Each new product screen sliding in                                                  |
| 26166 | Phantom Image Trail (hyperiux)                 | About page: a trail of portraits with first names, desktop only                     |
| 18352 | Line Draw SVG                                  | Karman's own drawings drawing themselves once                                       |

**Video blocks (Remotion)**

| Id    | Name                            | What for                                                         |
| ----- | ------------------------------- | ---------------------------------------------------------------- |
| 37369 | Sliding Screenshot Color Planes | Marigold, pine and clay planes framing real screens (A, H)       |
| 36798 | Focus Pull To Phone             | Focus shifting from a blurred laptop to the Daily 10 phone       |
| 36776 | Phone To Laptop Handoff         | "Start on your phone, finish on your laptop" practice test       |
| 36780 | Tablet Stylus Markup            | David's markup on a Karman question during class (D)             |
| 36787 | Shock Stat Counter              | A stat poster for ads, in marigold, with the filling bar removed |
| 37271 | Brush Stroke Screenshot Reveal  | A painted reveal of a real screen at a chapter start             |
| 37359 | Truchet Path Run                | A quiet pattern with one marigold path between chapters          |
| 36838 | Karaoke Captions                | Captions for 9:16 social cuts of the landing film                |

**Avoid in the catalogue:** dot grids and dot fields, the radial-circle hero
608, the animated grid hero 27704, colourful bento 4439, terminal backgrounds,
purple on black, the scroll reveal with a progress line 19203, and any stat
block with a filling bar.
