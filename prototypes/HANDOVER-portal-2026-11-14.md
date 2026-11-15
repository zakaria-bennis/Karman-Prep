# Portal rebuild: where it stands (2026-11-14)

Read this before any work on the student or parent portal. The founder's answers, in his words and in
order, are in the memory note `project_student_portal_spec.md`; this page is the short version plus the
state of the work.

## The decision

The existing student portal was made in one night and the founder calls it "a stupidly early alpha". Its
look, background and layout are to be ignored. The portal is rebuilt from scratch, **one thing at a time,
each approved before the next**: the background, then the sidebar, then each screen's layout. No sets of
options: one blank canvas, built up slowly. The student portal comes first, then the parent portal (he
wants to be asked about every parent feature before it is designed).

He rejected, on 2026-11-14: three welcome-after-payment mockups (`/dev/welcome`) and three Library layouts
(`/dev/portal`). Both lacked the coherence of Canvas, Khan Academy and Duolingo, and the painted backdrop
was "absolutely ass". Do not revive either. Their code is deleted from the portal branch, and their draft
PR 297 is closed unmerged.

## Step 1, the background: in progress

Branch `claude/portal-world`, draft PR 302. Blank page: `/dev/world` (dev only).

The portal's background is the live, lit landscape of the home page (`src/lib/flight/`), flown as an
**endless world** (founder, 2026-11-14, evening: "auto-generated ... endless and forever", like flying over
a Minecraft world in creative mode, at least twenty lands that blend into each other).

How it is built:

- `src/lib/flight/world.ts` holds the lands. **Each land is one row of numbers** (height, valley width,
  water, trees, colours, villages, reef, ice, mist). There are 21. The route is cut into stretches of one
  land each, in a fixed shuffle where every land comes round before any repeats; the end of each stretch
  slides into the next. A new land is a new row.
- `src/lib/flight/world-glsl.ts` is the shader code only the world uses. It reads the lands from a small
  table of the route just ahead. `shader.ts` compiles with or without it (`#define WORLD`), so the home
  page's shader is unchanged in what it draws.
- **Day and night (founder's rule):** light mode opens at dawn and is full day 20 minutes later; dark mode
  opens late in the sunset and is full night 20 minutes later. He said "dusk" for light mode; dawn was
  assumed. The tab remembers when its sky started and how far it has flown.
- **Speed:** slow drift (`DRIFT`), a new land about every two minutes.
- Weather is a setting (`sky`), not yet fed by the visitor's real weather.

`/dev/world` is now a demo (founder, 2026-11-15: "a full demo preview"): a bar at the bottom names the
land under the camera and has Next land, Fast tour (12 times faster), Stay here, the sky (Live, Dawn,
Day, Sunset, Night) and the weather. The address still takes `?land=reef`, `?z=40`, `?sky=0.5`,
`?night=1`, `?wx=cloudy|rain|mist|snow`, `?speed=12`, and `?bar=0` hides the bar. In the console,
`__world({land, from, settled, speed})` changes these without a reload and `__where()` says how far the
camera has flown. A 90 second film of it (day, sunset, night) is at `prototypes/portals/world-demo.mp4`
(not committed; made frame by frame with `__world` and `__flight`, then ffmpeg).

What he said on seeing the first lands: he likes the overall landscape; it looks **plastic**, the art
style is not coherent, details do not make sense up close; shading and reflections should be more real
but still Ghibli. A first pass answered that (light in soft painted steps, violet shade, colour that
wanders, softer light on leaves, water that mirrors the real shore, wind patches). No verdict yet.

**The mood he wants (founder, 2026-11-15):** "a more calming mystical painted background that the user
travels through with the appropriate lighting and flora and fauna". Not bright storybook. A first mood
pass is in: thicker soft air with a little lilac, mist always lying low, a lower softer sun by day,
calmer greens, lifted darks, flowers that glow faintly at night. First fauna is in: herds (sheep, deer,
dark horses) grazing and drifting in meadow lands, swans with wakes near shores, shoals of fish under
shallow water (some gold in clear water), rings where fish rise. Not yet looked at by night or in motion.

He then asked for "both and more mystical" (keep going, and push the mystical side). Added: shafts of
light fanning from the sun, glowing dust over the whole picture, a sky that keeps a little dusk (peach
and lilac low, violet-blue overhead), a few pale "spirit lights" that rise and sway from dusk through the
night, rare silver-leaved spirit trees that shine at night, a sea that glows blue where it breaks on the
shore at night, and flowers grown as fields in rows with green lanes (flower fields, lavender). Looked at
in stills by day, dawn, sunset and night; not in motion and not on a phone. No verdict yet.

Known faults and gaps:

- **Trees** are now real shapes near the camera (pines, round crowns, bamboo), in groves with clearings,
  lit as soft masses with a warm top, and the camera flies lower with trees and houses about 1.6 times
  bigger (he said from a bird's-eye view the trees "look like grass"). Round crowns close to the camera
  still look a little like eggs. No verdict yet on this version.
- He asked to base the look on existing painted landscapes instead of from scratch. Research so far:
  Ghibli backgrounds are poster colour (opaque, laid in few confident tones, skies on wet paper for soft
  cloud edges); real-time "Ghibli" foliage is lit as one soft ball per crown with a gradient, a shaded
  foot and a lit top. Studio Ghibli's free official stills are for personal, non-commercial use: fine to
  study for palette, never to ship. He has not yet named the paintings to match.
- **Speed, measured 2026-11-15 on this Mac (M2 Pro, Chrome with its graphics card):** the world is on
  screen about 1 second after the page opens on desktop and under half a second at phone size; the shader
  itself is ready in about half a second, and the engine was drawing above its starting sharpness, so
  frames are quick here. Earlier notes of a 20 to 100 second wait were wrong: Claude's preview pane was
  hidden, and a hidden tab does not draw. **Check pictures with a real browser at full size**, not the
  small preview pane: full size showed roofs and animals drawn in steps, now fixed by closing in on the
  true surface after the ray's last stride. Not measured: a real phone, an old laptop.
- Flat lands (hills, flower fields, savanna, lavender) are plainer than the mountain and sea lands.
  Flowers are blotches, not fields. Rice terraces and canyon walls are rough.
- Not built: animals, fish, more bird kinds, the observatory and other wonders, chimney smoke, real
  weather (a source must be chosen; the privacy policy needs a line his lawyer sees).
- When the shader's distance wraps (every 128 units, over an hour of flying) the view will jump; it needs
  a fade.

## What comes next, in order

1. His verdict on the endless world, then iterate the background until he approves it. Then its life:
   animals crossing the land, birds, fish (he asked for all three).
2. The menu: **second version built 2026-11-15, awaiting his verdict.** Page `/dev/shell` (dev only;
   `?plan=practice|cohort|private`, `?night=1`, `?demo=0`, `?open=1`). He rejected the first version
   (solid cream panels and a big sheet): "I like a more frosted glass design ... not overusing white on
   an app that highlights beauty in nature", no "squared-off boxes", the app should "live in the
   background". His rules from that verdict, which now apply to every portal screen:
   - **Frosted glass, never white panels**, tuned for light and dark. This overrides the older "no
     blurred boxes" line for the portals. Screens will be glass pieces sized to their content.
   - **Custom Karman stickers for every icon**, never a stock icon set (`stickers.tsx`: filled little
     pictures in the fox's colours with a pale die-cut edge).
   - **Spring physics, lifelike, Apple's way** (the `apple-design` skill; Designing Fluid Interfaces).
     He named GSAP and three.js. The menu uses Motion (`framer-motion`, already installed) because its
     springs keep velocity and can be grabbed mid-flight; GSAP and three.js are not installed. He has
     been told and has not answered.
   - **The highlight must never crowd or clip a word.** The lens sits behind the sticker only.
   - **Desktop: a slim rail (72px) that opens to 232px on hover or focus**, and it may hold more than
     five items (what the phone keeps under More: Chat, Rewards, Settings).
   **Third pass, same day, from his notes on the glass version (he likes the frosted effect):**
   - Stickers were "a little too colorful": now cream, sand and plum ink with one soft tint each.
   - Subjects he chose: Library is books standing on a shelf, and one book moves on hover; Class is a
     classroom drawing (a chalkboard), not a computer; Rewards is a trophy; Practice is not a pencil
     (now a target with an arrow, unconfirmed); he disliked the More pebbles (now a satchel,
     unconfirmed); Progress stays a mountain for now ("mountain, an arrow, a graph going up ... later").
   - The rail runs the full height with a margin. He said "on the right side"; it was kept on the left
     and he was asked which he meant.
   - Each row animates on hover when the rail is open (a faint glass follows the pointer; a part of each
     sticker stirs).
   - No light and dark switch at the top right. The profile at the bottom of the rail opens a small
     menu: Settings, Light or Dark, Sign out. Settings is not a row in the rail. The site's floating
     theme button is hidden on `/dev/shell` (`ThemeToggle.tsx`).
   - On the phone the lens holds the whole item, picture and word, and is always wider than the word.
   **Fourth pass, same day.** He confirmed the rail stays on the left. Three more rules:
   - The filled sticker pictures did "not look professional enough". The icons are now one custom
     line family (24 grid, 1.6 line, a faint wash of the text colour, one clay accent), still drawn in
     `stickers.tsx`, no library. Awaiting his verdict.
   - **The highlight is glass on glass, never white**: "slightly more frosted glass than the glass
     that sits behind it, almost like the glasses are stacked" (`--lens`, 24% white by day, 11% at night).
   - **Even margins everywhere, measured**: "even margins between the header and the footer, and even
     on the sides ... everything looks equal as you slide around". One inset (`--pad`: 12 in the rail,
     8 in the phone bar) on all four sides; the lens fills its item exactly; brand, rows and profile
     share one height. Measure it in a browser before showing him anything (the check used here read
     each box's distance from its glass on every side).
   On a phone the lens can be dragged along the bar and is thrown to the item its speed carries it to.
   The rail shows only with a mouse and 960px; touch screens keep the bottom bar. Intent and PFD skill
   files are under `~/Library/Application Support/Claude/local-agent-mode-sessions/.../rpm/` (search for
   `skills/intent` and `skills/pfd`). Raised with him, not yet answered: the streak multiplier that
   resets and mystery boxes are patterns Intent flags for under-18s.
3. Each screen's layout, one at a time. **He approved the menu on 2026-11-15** ("Approved, do
   Library").
   - **Library: first version built 2026-11-15, awaiting his verdict.** `Library.tsx` and
     `library.module.css` beside the menu, shown on `/dev/shell` when Library is chosen. Real domains
     and skills from `src/data/curriculum/approved-skill-taxonomy.json`; the levels are stand-ins, no
     student data is read. A top piece of glass holds the section switch (Reading and Writing, Math),
     "9 of 20 skills Proficient" and the key to the squares. Each domain is its own piece of glass:
     its name, one square per skill, then the skills as rows with their level. A phone reads one
     column with the first domain open; a desktop gets two balanced columns, all open. Pressing a
     skill opens "Start skill set" and "Lesson", which lead nowhere until the skill page exists.
     Squares: outline, two washes of the text colour, clay for Proficient. This reads his "four square
     dots" as one square per skill in four states; he has been asked to confirm.
     The open rail lies over the page as thicker glass, and so does the phone bar.
     **Second pass, same day.** He likes the design but not the squares, wants "a nicer color that's
     not blue" (Khan Academy owns blue) and "figures, animations ... not just a wall of text". Now:
     one warm scale everywhere (honey Learning, amber Understanding, green Proficient; `--l1` to `--l3`
     in `library.module.css`); the section is a bar cut by level, whose key carries the counts; each
     domain has a ring with the number Proficient inside; each skill has a three-step meter in place
     of its level word (the word shows when the skill is pressed). Bar, rings and meters draw in as
     the screen arrives. The squares are gone from this screen. **He approved the Library** ("yes"),
     asking for more contrast in the ring: the level colours are now deeper (`#e9b200`, `#d4521f`,
     `#14804a` by day) and each ring sits on a pale disc with clean gaps between its arcs.
   - **Library, third pass (2026-11-15).** He had NOT approved moving on ("I don't even say it's
     ready yet"): do not start the next screen until he says the current one is done. The skill page
     below is parked. What he asked for, and what was built:
     - **Research first, every screen:** Mobbin for education portals, REA for how they are built,
       then Intent, impeccable, Perception-First Design and frontend-design to turn it into the
       screen. Found: Brilliant asks "What do you want to learn first?" with two big subject cards;
       Quizlet and Vocabulary use small progress rings; Duolingo's front page is Lottie files and SVG
       (11 Lottie, 27 SVG seen by REA); Brilliant's is looping WebM clips. None draws live 3D, which
       is where Karman differs. REA only saw their public front pages, not their signed-in portals.
     - **GSAP and three.js are now installed and used** (he asked three times; `gsap`, `three`,
       `@types/three`). Motion (`framer-motion`) still moves the menu.
     - **A hero on first opening the Library** (`LibraryHero.tsx`, `hero.module.css`,
       `SubjectModel.tsx`): two glass doors, Reading and Writing, and Math, each with a live three.js
       object (a book whose pages turn; a faceted solid with two orbiting rings), brought in and
       pressed with GSAP. Pressing a door goes to that section's Library; a "Library" button goes
       back. The section switch is gone: the two sections are separate, as he asked. **Phone and
       desktop are two compositions**: stacked wide doors with words left and object right; tall
       side-by-side doors with the object above and the domains named below.
     - **Fluid, not segmented:** every ring and band is one gradient whose colours run into each other
       (`flow()` in `Library.tsx`), swept in by GSAP.
     Awaiting his verdict.
   - **Library, fourth pass (2026-11-15): three hero demos, gold constellations, 72 skills.** He
     rejected the "rainbow" bands and the first 3D objects ("random BS-looking icons"). Ideas were
     written down first and he chose: heroes 2, 4 and 5, and progress as "one color filling up"
     combined with "the constellation ideas", with "motion, vibrations, animations, and sound, and,
     more importantly, beauty". **Write ideas down and let him pick before building anything big.**
     - Three hero demos were built (book and orrery, split sky, paper and crystal); he chose the
       split sky, described below, and the other two were deleted.
     - **Progress is one colour, gold**, as night sky: each domain has a strip of sky with one star
       per skill joined in order, lines between two Proficient stars light up, rows and stars point
       at each other on hover, and each row has a drop that fills with gold (full shows a star).
     - **Sound and vibration** (`sound.ts`, Web Audio, no files): hover, choose, open a skill, and a
       few notes as a constellation lights. Silent until the first press (browser rule). Vibration
       is Android only; iPhone browsers ignore it. A "Sound" switch is in the demo bar.
     - **72 skills, a proposal** (`skills72.ts`): 34 Reading and Writing, 38 Math, each with a line on
       what it tests. The approved 39-skill list that the question bank is tagged with
       (`src/data/curriculum/approved-skill-taxonomy.json`) is NOT changed and no question is
       retagged; adopting the 72 is a separate job that needs his go-ahead and a retagging plan.
     Checked: every hero opens, hovers, chooses and reaches a skill on desktop and phone with no
     errors. Not checked: sound by ear, vibration, a real phone's speed, the split-sky drag.
   - **Library hero, chosen direction (2026-11-15): the split sky.** Of the three demos he picked the
     sky split on a slant ("a great direction to be moving in"), with the book from the other demo on
     the Reading and Writing half and constellations on the Math half. The other two heroes are
     deleted. His rules for it:
     - **An even half each**, with a slight angle on both phone and desktop. The seam passes through
       the centre; a hover only leans it a tenth of the way.
     - **Reading and Writing: the book, realistic and alive** (`heroes/book.ts`): real print set on
       the pages (a chapter heading, a drop capital, paragraphs, a small figure, page numbers), page
       edges, grained leather, gilt corners, a pencil, a silk ribbon that sways, leaves that curl and
       turn, letters lifting off the page, paper birds, a lantern on a chain. Hovering the half (the
       book or its sign) tilts the book up, riffles the pages, speeds the letters and birds and swings
       the lantern.
     - **Math: a real night sky** (`heroes/splitSky.ts`): a Milky Way with dust lanes, stars in three
       depths that twinkle and wheel slowly, a breathing nebula, shooting stars. **Constellations are
       only straight vectors from star to star, never curves**, each with a glowing core, a halo and
       light running along it, drawn star by star; each star has a core, a halo and four rays that
       shimmer. Figures: a sigma, a right triangle, a cube, a W, rising steps, a kite, an arrowhead.
       Hover surges the vectors and sends a shooting star.
     - **A real transition on choosing**: the chosen sky sweeps across, the camera pushes in, then the
       sky opens like an iris onto the Library's own background (whatever the mode), while the signs
       and the window's rim give way. For Math the constellations linger over the land for a moment.
     - **His second round on it (2026-11-15), all applied:** no pencil and no lantern; only "the
       occasional gliding bird" on the reading side and "the occasional shooting star" at night; the
       glow "way too bright", so constellations are now "very subtle and low-key, but also breathing
       and flowing", "just slightly more prominent than the background stars", about half the size,
       and they move and change shape; the figures are an isosceles triangle, a parallelogram, a
       sideways M and the sum sign (the last two are near twins; he has not said if that is what he
       meant); an observatory with a telescope stands on the ridge; the hills have three wooded
       layers with mist; the signs say "14 of 34 skills Proficient", never "stars lit"; **the more
       skills are Proficient, the more constellations are joined up** (the rest are loose stars);
       and **a sign must never cross the seam**, on phone or desktop.
     Checked on desktop and phone: both halves hover, both choices transition and land in the right
     section, no shader errors. Not checked: a real phone's speed (this is a heavy scene on top of the
     landscape), the drag, sound by ear. Awaiting his verdict.
   - **Skill page: first version built 2026-11-15, awaiting his verdict.** `SkillPage.tsx` and
     `skill.module.css`. Pressing a skill in the Library opens it; a small glass button above the name
     goes back to the domain. In his order: the level first (three named steps that fill), then the
     lesson (a video frame marked "Coming this winter", and "Read the lesson"), then "Skill sets"
     (three, with Done and Up next, and one ink button to start the next). All of it is stand-in: no
     lesson, question or student data is read, the buttons lead nowhere, and "three skill sets" is a
     guess he has not confirmed.
4. The 16 characters, their unlock challenges and unlock animations, in the fox's style. The owl must be
   redrawn: he says it looks like a llama.
5. The welcome after payment (a new buyer lands in the portal with nothing special today).
6. The parent portal, after asking him about every feature.

## Rules for the build, from his answers

- **Menu by plan, five at most.** Free, Practice, Pro: Library, Practice, Progress, Rewards, More. Cohort:
  Homework, Library, Class, Progress, More. Private 10 and 20: Homework, Library, Schedule, Progress, More.
  More holds settings, account and upgrade (and Rewards and Chat on the taught plans).
- **Landing.** Practice and Pro land on the Library with a small progress overview. Cohort and Private land
  on Homework.
- **Mastery levels:** Not Started, Learning, Understanding, Proficient. A skill drops when missed later.
  Skipping the Daily 10 drops 1 to 3 skills at most. The code still has the old five names.
- **Library:** two sections, four domains each, then skills. Mastery shows as squares, already designed.
- **Homework (from Canvas): the to-do list.** Grouped by Reading and Writing, Math and full-length exams.
  Done work leaves; overdue stays about a week marked Missing, then closes. No grades.
- **Say "full-length exams".** The diagnostic is dropped; cohort students take the "cohort placement test".
- **Locks.** Only Free shows locked items. A locked thing says "Upgrade" when pressed.
- **Coherence, measured from Khan Academy, Duolingo and Canvas:** one font and two weights; three or four
  text sizes carry over 90% of the text; one corner radius for controls and at most one more for panels;
  one height for every button and field; one action colour on two or three greys, with red, green and gold
  only for states; spacing in steps of 8. The rejected mockups broke most of these.

## Loose ends from the same day (not portal work)

- **PR 296 is open and not merged:** the fix for the return address after paying behind a proxy, and the
  sign-in pills reading "Continue with Google, Apple, Microsoft" in that order. It needs his go-ahead.
- **Live today:** our own payment page (Link first), pay first then account, the home page no longer
  redirecting signed-in visitors, and the header's profile menu.
- **Stripe:** the site still runs on test keys. The live account has the seven prices and both site
  domains, but no webhook, and its keys are not in the site. See `docs/launch-checklist.md`.
- **Test copy:** `/Users/zakariabennis/Karman-Prep-wt/forms-walk` on port 3400 (launch entry `forms-walk`),
  local database, signed in as the stand-in student `dev_seed_student_free`
  (`DEV_IMPERSONATE_CLERK_ID` in its `.env.local`). It is not a branch: files are copied into it by hand.
- **A temporary Cloudflare tunnel** to the test copy may still be running, and its address is on Stripe's
  payment method domain list (live and test). Both can go.
