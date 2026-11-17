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
   - **Library hero: APPROVED by the founder on 2026-11-15 ("It's ready").** Do not redesign it. Next is the
     page inside a section (domains, constellations, skills), which he has not yet approved.
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
     - **Third round (2026-11-15), applied:** the observatory "looks like it's floating": it is now
       set into the middle ridge with trees in front of its foot, and is a **glass dome** you can see
       the stars through (frame of struts, a telescope inside, a lit doorway) **with two dishes**
       beside it. **The book stays centred in its half**; the signs were made smaller to fit instead
       (he then asked for the Reading and Writing sign to stay at the foot of its half on a phone, with the book above it and never overlapping).
     Checked on desktop and phone: both halves hover, both choices transition and land in the right
     section, no shader errors. Not checked: a real phone's speed (this is a heavy scene on top of the
     landscape), the drag, sound by ear. Awaiting his verdict.
   - **Library page for each side, rebuilt 2026-11-15, awaiting his verdict.** He asked for it to be
     "very intuitive and easy to use", with figures "equally as utilitarian as they are beautiful".
     No retagging of the bank ("We're not going to retag anything now"). `Library.tsx` now has:
     **Next up** (the skill nearest Proficient, what it tests, and "Start skill set N"; first on a
     phone); **where your skills stand** (one number, one gold line, and the lanes: a dot per skill
     in the lane of its level, which is also the key); a **filter** (All, In progress, Not started,
     Proficient); and each **domain** with small lanes in its head and its skills as rows with
     **three pips, one per skill set** (the rule drawn: 8 questions a set, one level a set) and a
     star at Proficient. The constellation strips were removed from this page as decoration; stars
     stay in the hero. Research: Khan Academy's SAT course via REA (a key at the top, one mark per
     skill, "Up next for you", 127 skills in 14 units), Uxcel and Coursera (a lead card to continue).
   - **Library page, second round (2026-11-15), all applied; awaiting his verdict.** His rules:
     - **No shiny bar.** A **progress ring** instead: colour alone shows roughly how much is not
       started, Learning, Understanding and Proficient (the colours run into each other, never cut),
       and the middle shows the share Proficient **to one decimal** (28.9%).
     - **Skills are rounded squares, never circles.**
     - **Never number skill sets** ("some people won't get it ... they're just skill sets"): the
       button only ever says "Start skill set".
     - **Colour:** one hue in three clear steps (`--p1`, `--p2`, `--p3`). **Dark mode is marigold;
       light mode is deep evergreen**, chosen for contrast on warm glass (he asked for "a better
       color for contrast" and has not yet said if evergreen is it). The hero's reading sign uses
       the same evergreen in light mode.
     - **The three bars and the star sit on one line**, and the star's place is always kept so the
       bars line up down a column.
     - **Text big enough to read easily:** 13, 16 and 20 on these pages.
     - **Library icon:** three books in a row, the last leaning to the left on the others.
     - **Top right is Today:** the Daily 10 and the Challenge question, each with Start until done,
       with their own drawn icons and small fact marks (`practice.tsx`). "Next up" was removed.
     - **Where the modes live:** a "More ways to practise" piece on each side: time trials, endless
       mode, strategy quizzes, full-length exams, plus flashcards and the word game on Reading and
       Writing. He said "word line"; taken as the existing Wordle-style word game. Time trial and
       endless mode also appear on each skill's page.
     - **Flaunt the bank, subtly:** a quiet question count on every skill row, every domain and the
       side as a whole ("almost 11,000" questions, about 150 a skill, some held back for exams).
       The counts shown are stand-ins.
     - **Opening a skill slides over to a second page** focused on that skill (`SkillPage.tsx`):
       what it tests, the three named steps, the rule for the next skill set ("Get 5 right to move
       up to Proficient"), one "Start skill set" button, the lesson, and more practice on the skill.
   - **Library page, third round (2026-11-15), applied; awaiting his verdict.** He keeps evergreen
     for light mode. Further rules:
     - **Short, plain arrivals.** Fades were "way too prolonged": pieces now rise in 0.22s with no
       blur or stagger, and the slide to a skill is quick.
     - **Dark mode is not marigold** (its dim steps looked bronze, "poopy"): it is the same green
       family lit up, brightest for Proficient.
     - **Squarer boxes** on these pages: 16 outside, 10 inside.
     - **Icons have colour and their own movement**, played on hover or focus: the stopwatch hand
       turns, a light runs round the endless loop, the compass needle swings, the flashcards (a
       fan of index cards) fan out and back, Word Line draws its line, the exam sheet's bubbles
       fill, the Daily 10 ring sweeps, the bolt jolts. All centred on their tiles (measured).
     - **"Word Line"** is the word game's name. Its icon is a W drawn as one line through points.
     - **No subtitles on the practice modes**; they sit in one row, not a grid.
     - **Full-length exams** icon is an answer sheet of bubbles (the page looked like Google Docs).
     - **Daily 10** icon is a ring with "10" in it; the **Challenge** bolt has no star.
     - **Filters, in order:** All, Not started, Learning, Understanding, Proficient.
     - **A domain's squares are one row**, furthest along first (he disliked the stacked shape).
     - **The main button has all six states** (`GoButton` in `practice.tsx`): resting, hovered,
       focused, pressed, loading, disabled. It is filled with the progress colour and has an arrow.
     - **The lesson has a switch: Written lesson (shown first) and Video lesson.**
     - **No rule sentence on the skill page** ("an unnecessary detail").
   - **Fourth round (2026-11-15, 23 notes), applied; awaiting his verdict.** Library pages:
     - **Green is the colour.** The same way round in both modes: **dark for Proficient, light for
       Learning**. Every mark has a thin edge so it stands clear of the glass. Bands and the ring are
       **cut clean where levels meet, no blending**.
     - **Domains first, then skills** (`Library` then `DomainPage` in `Library.tsx`): the side page
       shows the ring, Today, the ways to practise and the four domains as equal bands to compare;
       choosing a domain opens its skills with the filter; choosing a skill opens the skill page.
       The desktop side page fits one screen. **On a phone it is three pages** (Skills, Today,
       Practise) with buttons, not one long scroll.
     - **Start buttons are outlines that fill with green on hover**, with an orb while loading
       (`GoButton`). He asked for Claude's own orb or one from 21st.dev: 21st.dev was searched
       ("ai loader", "Orb Loader" exist, their code is paid) and the orb was drawn here instead.
     - **Icons:** time trials is the home page's racing stopwatch with flames (`WayArt.tsx`, way 5);
       endless is a marigold light running round the sideways 8; the compass has a red north and
       blue south and spins wildly before settling north; full-length exams is a booklet with a
       clock (a proposal); flashcards and Word Line are on both sides. No coins by the Challenge
       question, only the streak with a real flame. The Daily 10 icon is still undecided: ideas
       were put to him.
     - The lesson switch is one pill. The two right-hand boxes on the skill page end level with the
       lesson.
     Hero: it **fills the screen beside the menu** with the word "Library" inside it; shooting stars
     cross the sky; **sixteen kinds of constellation, with more stars each, all over the night**;
     letters fly out of the book glowing and fold into paper doves; a shorter, looser ribbon; many
     small birds in the dusk sky; the telescope is gone, the dome is raised and the dishes redrawn;
     the opening into a side is a plain soft circle, quicker.
   - **Fifth round (2026-11-15, 24 notes), applied; awaiting his verdict.**
     - **Hero is truly full screen**: it covers everything and only the menu lies over it. The seam
       is drawn first, then the two skies open out from it. The **desktop menu sits hard against the
       left edge** so a pointer thrown to the edge opens it.
     - **The book's pages carry the opening of the Odyssey, Book I** (Samuel Butler's 1900
       translation, out of copyright), set small and very faint; every turning leaf shows a
       different page; no figures. It was typed from memory: **check it against a printed Butler
       before it ships.** Letters rise glowing, fold into paper birds and fly off towards the sun;
       none fall back.
     - **Loader:** the `thinking-orbs` npm package (Jakub Antalik, MIT), state "working", shown only
       for the moment a press takes (0.45s in the demo). **Pages must be snappy.**
     - **Start buttons fill from an inner rectangle that grows outward.**
     - **Icons he settled:** Daily 10 is a sun with ten rays; Word Line is six bordered squares that
       hop and step through grey, two yellow, one green and two yellow, three green and one yellow,
       five green, all green; flashcards are a stack of opaque pale yellow index cards that fan out
       to the right and spring back; the compass has a white face, N E S W and notches between;
       endless is the sign itself in marigold paint with a travelling shine and glints; time trials
       keep the watch with redrawn flames; full-length exams are pages with lines of text and a
       turning clock; the bolt is solid and bright.
     - **More ways to practise is a grid of three by two.**
     - **No stars on skills** ("I don't even know if I really like the star idea"): three bars only,
       which glow and shimmer when filled.
     - **The ring cranks its way round**; joins between levels in the ring and in the bands are the
       colour of the edge.
     - **One domain is recommended** ("Start here: the most to gain"): the one with the smallest
       share Proficient.
     - **A compact header:** the page's name sits on the same line as the back pill, smaller.
   - **Sixth round (2026-11-15), applied; awaiting his verdict.** The Odyssey text must be
     **readable from the page and glow** (the "very faint" idea is withdrawn); the book should feel
     like "a book of great wisdom". Paper birds **fly off in every direction and never come back**.
     Choosing Reading and Writing: **the book comes to the middle and closes**, and the page arrives
     as it shuts. The ring opens fast and eases to a stop. **Not started is see-through** (glass
     inside an edge), never grey. **The labels beside the ring are buttons**: each opens every skill
     at that level across the side's domains. The desktop menu has its margin back, with an unseen
     strip at the far left edge that opens it. Flashcards stand upright and fan like a hand of
     cards; endless has no glints; he likes the exam, Word Line and compass icons. He did not like
     the thinking-orbs package's look (it was removed): the loader is now three orbs circling in
     step, drawn here. He points to how Claude's own thinking indicator moves as the model. The
     time-trial flames were redrawn a third time as tapering tongues; still unconfirmed.
   - **Seventh round (2026-11-15), applied; awaiting his verdict.**
     - **A level's list is its own page** (`LevelPage`): the count and the skills grouped by domain,
       with **no share and no filter**, because on one level those say nothing. He caught the earlier
       version showing "100% Proficient" and empty filters.
     - **"Weakest domain"** is the label (not "Start here"), on a second piece of glass stacked on
       the first, with no coloured edge. It is chosen by weight: each skill counts for how far it
       has climbed (0 to 3) and a domain's score is its average climb, so domains of different sizes
       compare fairly; a tie goes to the one with more not started. The method is never shown.
     - **The book closes like a real book**: halves fold together with the pages inside, held apart
       by the spine's width, and only then does it turn its cover to you. Check any 3D exit frame by
       frame; the first version showed pages outside.
     - **Library menu icon**: two upright books and a third leaning on them with its foot on the
       shelf, three colours, nothing clipping. Checked frame by frame through its hover.
     - Learning's green is a little greener. The compass has a real dial of ticks. The time-trial
       flames spring from the whole back half of the watch's rim (he said "right"; the watch races
       right, so they stream off the left: confirm). Numbers sit right beside their level in a
       domain's summary. The line under the ring reads "4,711 total math questions".
     - **A student's default picture is the fox** until they choose their own.
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

- **Menu by plan, five at most.** Free, Practice, Pro: Library, Progress, Rewards, More (Practice was
  dropped on 2026-11-15). Cohort:
  Homework, Library, Class, Progress, More. Private 10 and 20: Homework, Library, Schedule, Progress, More.
  More holds settings, account and upgrade (and Rewards and Chat on the taught plans).
- **Landing.** Practice and Pro land on the Library with a small progress overview. Cohort and Private land
  on Homework.
- **Mastery levels:** Not Started, Learning, Understanding, Proficient. **Rule (founder, 2026-11-15):** every skill starts at
  Not Started and moves up one level at a time; a skill set is 8 questions; so Proficient takes at least
  three skill sets, 24 questions. The skill page's three skill sets match this. Within a set: 3 right
  moves it up to Learning, 4 to Understanding, 5 to Proficient. A set must be finished in full to move a
  skill up or down. **The 72 skills are settled** (`src/app/dev/shell/skills72.ts`); the question bank is
  still tagged with the approved 39 and has not been retagged. A skill drops when missed later.
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

## Library, eighth round (2026-11-15)

His rules from this round:

- **Time trials icon.** He likes the flame look. Flames always come off the left side of the clock. The
  clock is always optically centred in its box. Wind lines show it flying fast to the right.
- **Opening the Library** (first open, reload, going back) must feel like one quick, joined-up move. The
  seam, the reveal, the book and the signs now arrive together in about half a second.
- **Library icon:** no book may ever clip into another. Checked frame by frame through the hover.
- **Words on the book's pages:** slightly darker, with a warm glow.
- **Frost:** a little less by default (70% of the first setting). The demo bar has a Frost dial, 0% to
  160%, remembered on his computer (`kp-frost`). It sets `--frost-k` on the shell; every blur multiplies
  by it. When he settles on a number, make it the default and remove the dial.
- He said after this round he is ready to move to the next page. Ask which one; do not pick for him.
- **Time trials fire, redrawn (same day).** He sent two references: a stopwatch with one body of flame
  wrapped round its rim, and a photo of real, see-through fire. Rule: every flame touches the clock's
  circumference; none may sit apart. The fire is now one shape that starts behind the watch and streams
  left, in five see-through layers from deep red to pale gold. He said that is all for the Library for
  now.
- **Last Library changes (same day).** Each of the six "More ways to practise" buttons fills its whole
  third of the row, so most of the 3x2 is clickable. Time trials is only a clock at rest; the fire and
  the wind start on hover (or keyboard focus). The fire leans to the upper left, more on the top half
  than the bottom, as if the clock were falling down and to the right. On a phone there is no hover, so
  the fire shows only while the button is pressed or focused.

## Practice is dropped (founder, 2026-11-15)

A first Practice section was built and then removed the same day. His reason: "everything that practice
would be doing is exactly what library already does, but better, because it's all centralized." The
menu for Free, Practice and Pro is now Library, Progress, Rewards, More. Do not rebuild it. The ways to
practise stay in the Library. Next is Progress, planned with him by questions before anything is built.
His opening brief for Progress: overall preparation for the SAT; an analytics view of the work, time
and effort put in; a highlight of where the student is weak; and a history of past questions and
mistakes, "like a mistake log".

## Progress: planned by questions, step 1 built (2026-11-15), awaiting his verdict

His full answers are in the memory note `project_progress_spec.md`; read it before any Progress work.
Build order agreed with him, one step at a time, each shown before the next:
1. Predicted score and its graph. **Built.**
2. The six stats (questions answered, time invested, days practiced, accuracy, skills proficient, exams
   taken; all time by default, switch to 7 and 30 days), a one-month calendar shaded by how much was
   done with a day you can open, and a streak of days (a day counts only if the Daily 10 was done).
3. The three weakest skills, each with "Start skill set"; pacing as its own piece.
4. History on its own page behind a link: sessions, then one session's questions, filtered all,
   correct or missed (never "incorrect"). Bookmarks live here; a flagged row carries a flag icon.
5. The new-student page: the Daily 10 first.
6. The phone: no scrolling except in History. It need not be four pages if everything fits.

**Step 1** (`Progress.tsx`, `progress.module.css`, shown on `/dev/shell` under Progress): one centered
piece of glass. The total in the title serif, the largest thing on the page; "Up 140 since September
27"; Reading and Writing and Math smaller inside it; the countdown in the corner, only when a test date
is set. One line over time with full-length exams marked as rounded squares at their real scores.
Both axes fit the student (`dayMarks`, `scoreMarks`): days, then weeks, then months along the bottom;
steps of 20, 50, 100 or 200 up the side. Pointing at, dragging along or arrowing through the line turns
the score above it into that day's (total and both sections); a first version used a floating pop-up,
which covered the section scores and was removed. With fewer than two exams the same place says "Take
two full-length exams to see your predicted score". The demo bar has four made-up students (6 days, 3
weeks, 9 weeks, 7 months) to show the scaling. All numbers are stand-ins. Not built: the Free plan's
wording (the score comes with Practice or Pro), accommodations, changing the test date.

**Progress step 1, second round (2026-11-15), applied; awaiting his verdict.** He wants it to read
like a stock ("really addictive"):
- **Sections are buttons.** Pressing Reading and Writing or Math swaps the graph and the large number
  to that section; a Total button appears as the way back.
- **A ticker under the number:** a signed change over the chosen span ("+150 since September 27",
  "−30 in the last 7 days"), green up, red down.
- **Spans:** 7 days, 2 weeks, 1 month, 3 months, 6 months, all time (short labels on a phone). A span
  longer than the student's prediction history is greyed out.
- **Red when it fell.** The line, the fading fill under it and the exam points turn red when the score
  dropped over the span shown. He likes the fill that starts strong and fades out: keep it.
- **Exam points are circles with a ring breathing out**, the size of the old square. No squares here.
- **No key under the graph.**
- He asked to have the page opened for him: he does not know how to open localhost. Open the browser
  pane on `/dev/shell` for him whenever there is something to look at.
- **The ticker is not a sentence** (he sent two stock-app examples: "+29.60 past 5 days", "−7.23
  today"). A signed number and its span in one size, one weight and one color: "+150 all time",
  "−30 past 7 days", "+90 past month". Green up, red down. While a day is pointed at it reads
  "+80 since Sep 27".
- **Third round on the score (same day), applied:**
  - **Exam points are small**, with no white edge; the breathing ring stays. **The point being looked
    at is gray.**
  - **No empty stretch of graph.** Once the second exam is taken, the line runs from the first exam
    (the starting point) to today, with texture between exams from practice. The graph starts at the
    first exam, never before it.
  - **Spans appear as the student studies longer**: 7 days, 2 weeks, 1 month, 3 months, 6 months,
    1 year, all time. One is shown only once the history is that long; nothing is greyed out.
  - **Touch:** a finger dragged along the line keeps hold of it even if it strays off the graph;
    lifting returns to today. Vertical swipes still scroll the page.
- **Passing an exam on the line names it by number**: "Full-length exam 3", not its score (Practice
  has 1 to 5, Pro 1 to 20). The line it appears on is always kept, empty or not, so sliding across an
  exam never shifts the sections, the spans or the graph. **Anything that appears on hover must have
  its place reserved: nothing below may move.**

**Progress step 2 built (2026-11-16), awaiting his verdict.** He approved step 1 ("Yes, next step").
Files are now split: `progressData.ts` (the made-up students, the score line, a log of every day),
`ProgressScore.tsx` (step 1), `ProgressActivity.tsx` and `progressActivity.module.css` (step 2),
`Progress.tsx` (the page).
- **Layout.** On a wide desktop the score stands in the middle with the numbers at its left and the
  calendar at its right, all on one screen. Between 960 and 1199 wide the score is on top and the
  other two sit under it (this one scrolls). On a phone each piece is its own page with buttons
  (Score, Activity, Calendar) and none scrolls.
- **Six numbers:** accuracy (leading, with today's percent and a small line), questions answered,
  time invested, days practiced, skills Proficient, exams taken. A switch: 7 days, 30 days, all time
  (all time first shown). On 7 or 30 days each number carries a ticker against the span before,
  green up and red down; the place of every ticker is kept, so switching moves nothing.
- **Calendar:** one month at a time with arrows; each day a rounded square shaded in four steps of
  the green by questions done; today is ringed; pressing a day shows its questions, time, accuracy,
  Daily 10 and any exam in a box of fixed height. The streak counts days in a row with the Daily 10.
- The countdown is now one quiet line above the score at every width.
- Stand-ins: the whole daily log (`activity()`), the skills count, time. Not built: real idle-time
  tracking (his rule: only active time counts, mouse jigglers must not inflate it).

**Progress step 2, second round (2026-11-16), applied; awaiting his verdict.**
- **Seven numbers, in his order:** time invested, questions answered, skills Proficient, exams taken,
  pacing (added: "we should be tracking the pacing as well"), accuracy, days practiced. Accuracy is not
  the lead.
- **Each number is kept like a stock** (`progressStats.ts`): what it stands at now, a ticker of how
  far it moved over 7 or 30 days (none for all time), and a small line with a fading fill. Values are
  set in the serif of the predicted score. Green is for the better, red for the worse; for pacing,
  faster is better.
- **Each number is a button that opens its own page** (`ProgressStat.tsx`, his call left to me): the
  score piece again for that number, with the spans and the full stock line (`ProgressGraph.tsx`, now
  shared). Pacing's page states the SAT's 1:22 a question (standard time).
- **Calendar marks never overlap a neighbor:** today is a small bar under its date; the pressed day is
  a ring drawn inside its own square. No scaling.
- **The month's name is a button** that opens a list of every month the student has been here.
- **Full width:** the three pieces share the whole width of the page (1 : 1.9 : 1), like the Library's.
  He said "matches the horizontal space of that first top tab"; this is my reading, to confirm.
- The line explaining the colored numbers is gone ("reads as clutter").

**Progress step 2, third round (2026-11-16), applied; awaiting his verdict.**
- **A line that fell is red, always**, pacing included ("if there's a downward trend, it shouldn't be
  in green"). Color follows the direction of the line, not whether the change is good. For pacing this
  means getting faster shows red; he was told and can reverse it.
- **Calendar redrawn:** no outlines; a day with practice is a filled rounded square (four greens), a
  day without is the faintest glass, a day outside the student's time is only its number. Squares are
  as wide as their columns, so three-letter weekday names sit exactly over the dates (the old squares
  were capped at 44px and drifted left on wide screens). A line under the month says "15 of 15 days
  practiced". A Today button appears when away from today. Today is a dot under its date.
- **Day card:** the date and the streak share the first line; then that day's questions, time and
  accuracy as three numbers in the serif. "Daily 10" is no longer written there; a full-length exam
  still is. "A day counts when you finish the Daily 10" is removed.
- **Countdown is a badge** lying over the top right corner of the score piece; it takes no line.
- The score piece is now a column whose graph takes any spare height, so nothing else stretches.
- **Each number's page: he wants more creative, useful pages** than a bigger graph. Ideas were put to
  him for all seven; nothing more is built until he picks.

**Progress: the page behind each number, built (2026-11-16), awaiting his verdict.** He said "execute
on all those ideas". Every one is two panes across the whole page, the same width as the Library's
("the distance from the menu bar to the border on the other edge of the screen"): the stock piece at
the left (`ProgressStat.tsx`), the breakdown at the right for the same span (`ProgressDetails.tsx`,
stand-in figures in `progressBreakdowns.ts`). On a phone they are two pages, Trend and Breakdown.
- **Time invested:** by section, then by domain. His rules: domains, not skills, and never by kind of
  work (no "time on the Daily 10"). Also the days of the week it went on, and the average day.
- **Questions answered:** by domain and by kind of work, each band cut into right and missed; the
  hardest level met.
- **Skills Proficient:** the Library's rings for both sides; skills gained in the span and any that
  slipped. A skill pressed here opens on its own page in the Library (`onSkill` in `page.tsx`).
- **Exams taken:** each exam with its total, sections, date and change from the one before; the exams
  left in the plan as slots; a button to start the next.
- **Pacing (his design):** split into Overall, Reading and Writing and Math. **A dashed goal line
  across the graph**: the pace the real SAT allows (1:22 overall, 1:11 Reading and Writing, 1:35
  Math), multiplied by the student's extra time, so it sits higher at 1.5x or 2x. A line under the
  ticker says how far over or under the goal the student is. The demo bar has Standard, 1.5x and 2x
  time on this page until Settings holds accommodations. Also pace on right against missed answers,
  and the slowest skills.
- **Accuracy:** by domain, by difficulty level (1 to 7), and the three skills missed most.
- **Days practiced:** the last year as a grid of small squares, the streak now and the longest, the
  strongest weekday.
- Not done: the Breakdown page on a phone scrolls for four of the seven (60 to 240 pixels); History
  links wait for the History page; every breakdown figure is a stand-in.

**Pages behind the numbers, second round (2026-11-16), applied; awaiting his verdict.** His rules:
- **A title is one or two words.** "The days it went on" is "not a title". Now: By domain, By weekday,
  By mode, Sections, Gained, Slipped, Exams, By outcome, Slowest skills, By difficulty, Missed most,
  Past year, Streaks. **No subtitle unless it is needed** (the domain under each skill name and the
  line restating the pacing goal are gone).
- **A figure must be readable at once, with nothing to work out.** The bands filled against the
  largest domain were "unreasonable and illogical", and a band whose length meant one thing and whose
  cut meant another made him "think a lot". Now: time is each section's whole as one band cut into
  its four domains, with the domains keyed under it; questions and accuracy are a small table with
  column heads (Answered, Right), where Right is a band out of 100% beside its percent.
- **"All time" is not offered for a count that only adds up** (time invested, questions answered,
  skills Proficient, exams taken): there it is only the number again. Those open on the longest span
  the student has. Pacing, accuracy and days practiced keep it.

**Pages behind the numbers, third round (2026-11-16), applied; awaiting his verdict.**
- **A bug he caught:** the span picker sat "inside the trend". When a number reached a ceiling that
  is not a round step (72 of 72 skills), the top mark of the graph stopped short of it and the line
  was drawn up out of the graph, through the picker. `niceMarks` now always ends on a mark at or
  above the highest value, and the line and its fill are clipped to the plot. Check a graph with a
  student at the ceiling, not only the 9-week one.
- **Skills Proficient:** "Recent gains" and "Recent slips" replace Gained and Slipped. Together they
  are the eight to ten latest changes of level, up or down; every level counts, not only Proficient.
  Each row shows the Library's three bars and the level the skill is at now.
- **The right-hand panes end level with the trend**, always: the last pane takes the height left
  over and stays empty there ("if there's not enough recents, just keep it as empty space").
- **Questions answered:** each band is everything answered, green for right and red for missed. No
  heading over the bands.
- **Accuracy:** no bars at all; By domain and By difficulty are plain percents.
- **Exams taken has no trend** ("there doesn't need to be a trend for the full-length exams"): its
  page is the list alone, across the whole page.

**Pages behind the numbers, fourth round (2026-11-16), applied; awaiting his verdict.**
- **Six numbers now, not seven:** time invested, questions answered, skills Proficient, exams taken,
  pacing, days practiced. **Accuracy has no tile and no page of its own.** It lives inside Questions
  answered: a second button there swaps the number and the line to accuracy, By domain already shows
  the share right, and Missed most moved there.
- **Students never see anything by difficulty level**, "even though it's data that we collect". By
  difficulty and "hardest level" are deleted. Do not show level 1 to 7 to a student anywhere.
- **Exams taken has no line** on the main page either (its place in the row stays, empty).
- **Slowest skills is the ten slowest**, not three.
- **The big value is centered on the pane**; small words after it ("per question", "of 72") hang
  beside it without shifting it.
- **Escape goes back to Progress** from any number's page.
- **Days practiced:** its right-hand panes keep their own height; they do not stretch to the trend.
- **Phone: no scrolling.** A number's page has a button for the trend and one for each pane (up to
  four), and every one fits the screen. Measured: none scrolls.

**Progress step 3 built (2026-11-16), awaiting his verdict.** He closed step 2 with two last changes
and said to move on.
- **Days practiced grid grows with the student:** "Past 100 days" until they pass 100 days, then
  "Past 200 days", then "Past year" (`daysShown` in `progressBreakdowns.ts`).
- **Exams taken is the last of the six numbers** on the left.
- **Step 3, the three weakest skills** (`Weakest` in `ProgressActivity.tsx`): one row under the
  three panes, titled "Weakest skills". Each skill has its name (which opens it in the Library), why
  it is here ("38% right"), and a "Start skill set" button. A student with under two weeks or under
  150 questions gets three not-started skills, marked "Not started". Weakness is skills only; pacing
  is its own number. On a phone it is a fourth page, Skills. The choice of skills is a stand-in: his
  rule is least practice and exposure combined with accuracy.
- Next: step 4, History on its own page behind a link (sessions, then one session's questions, with
  all, correct and missed; bookmarks; a flag icon on flagged rows). Then the new-student page.

**Progress, round after step 3 (2026-11-16), applied; awaiting his verdict.**
- **The Weakest skills pane is removed** ("I don't need that pane"). Do not rebuild it. Step 3 of the
  plan is closed without it; the weakest skills still appear as "Missed most" inside Questions
  answered.
- **Exams taken is a plain list:** exam, date, pace per question, score. No bar, no sections, no
  change, no Start button. Each row is ready to open that exam's breakdown once that page exists.
- **One time setting for the whole Progress page.** The score and the numbers show the same bar and
  choosing a span on either sets both (`span` in `Progress.tsx`). **"Today" is a new first span**
  (1D), so a 7-month student has seven: Today, 7 days, 2 weeks, 1 month, 3 months, 6 months, all time.
  Both bars use the short names (1D, 7D, 2W, 1M, 3M, 6M, All) so seven fit their panes.
- He looks at Progress in a window between 960 and 1199 wide, where the score is on top, the numbers
  at the bottom left and the calendar at the bottom right. Check that layout as well as 1440.
- Next: step 4, History.

**Progress: phone pass (2026-11-16), applied; awaiting his verdict.** He asked for "a lot of mobile
checks": no spillage, no overlaps, as good to look at on a phone as on desktop.
- **Span names are short everywhere** (1D, 7D, 2W, 1M, 3M, 6M, 1Y, All). He liked seven fitting in
  one pill; the full names overflowed on Pacing and Days practiced, which offer All time.
- **The Frost slider is gone.** The glass is fixed at 70% (`--frost-k` in `shell.module.css`).
- **An audit script, `scripts/dev/progress-phone-audit.cjs`**, walks every Progress screen for two
  students on phones 360, 390 and 430 wide (180 screens) and reports text that spills from its pane,
  is cut off, overlaps other text, or makes the page scroll. It found 34 bad screens; all are fixed
  and it now reports none. Run it after any change to Progress. The same check passed on 42 desktop
  screens at 1100, 1440 and 1728 wide.
- What it found and what changed on a phone: the small words after a value ("per question") ran off
  the pane, so they sit under the value; the section buttons wrapped to two rows, so they share one
  row with the name over the value; the exams list wrapped each name over four lines and scrolled,
  so each exam is two lines; a short phone (740 tall) scrolled, so the graph and the big number are
  lower there; side labels on a low graph collided, so only those with room are written; the pacing
  goal's name sat on the line, so it moves to the end of the graph where the line is farther away.

**Progress: pacing drawn faster-side-up; the Mistake Log; the SAT badge (2026-11-16); awaiting his verdict.**
- **Pacing's graph is upside down on purpose** (his words: "It makes good progress look bad, so I'd
  rather just not have it go red if things are actually getting better"). Faster is at the top, so a
  student getting faster sees a line that rises and is green; getting slower falls and is red. The
  same holds for the small line on the Pacing number. When the goal is beaten the line is above the
  goal line. In code: `lessIsBetter` on the stat (`progressStats.ts`), `flip` on `Graph` and `Spark`,
  and `wayOf(change, lessIsBetter)`. The ticker still shows the change in time ("−0:07 all time"),
  now in green when it is a gain. His earlier rule holds everywhere: a line that falls is never green.
- **The Mistake Log is its own page in the menu** (`MistakeLog.tsx`, `MistakeLogViews.tsx`,
  `MistakeLogSift.tsx`, `mistakeLog.module.css`; stand-in data in `mistakeLogData.ts`). It was first
  built the same day as "History", a page behind a button on Progress; he renamed it and moved it.
  Do not bring the History name or the button back.
- **Where it sits.** Desktop menu, every plan: right under Progress, before Rewards. Phone bar for
  Free, Practice and Pro, in his order: **Progress, Mistake Log, Library, Rewards, More**, with the
  Library in the middle; the student still lands on the Library (`home` in `PLANS`). Each of the
  five has an equal fifth of the bar. The bar says "Mistakes" because "Mistake Log" does not fit a
  fifth of a phone; the page title and the desktop menu say "Mistake Log". He asked for the names to
  be less crowded and left the way open ("smaller or something else"); **he has not seen or agreed
  the short name.** Cohort and Private phones already have five in the bar, so there a "Mistake
  Log" button sits at the end of Progress's title row and the page shows a way back to Progress;
  **he has not been asked where it should live on those phones.**
- **The way through it** (his words: "we don't just have questions populating for no reason").
  Nothing is open until it is picked. (1) The log alone, across the whole page; with that width each
  sitting also shows its time and pace. (2) Pick a sitting: the log draws in to the left and a pane
  comes in from the right with an **overview**: score for an exam, correct, time, pace, one small
  square per question (green correct, red missed; a line per section when there are two), and the
  skills missed with their levels, each opening in the Library. It lists no questions. (3) "View
  questions" or "Missed only" goes on to the questions (All, Correct, Missed), and a question opens
  from there: the student's answer, the right answer, the explanation, a bookmark, arrows to the
  question before and after. No retry. Cohort and Private students also get a flag; flagging
  bookmarks the question. The pane has a close button, and Escape steps back one level at a time.
  **He likes the question view and means to build the quiz engine on it.**
- Three views, one bar: **Sessions** (opens here, since his way through starts by picking a
  sitting), **Missed** (every missed question, newest first) and **Bookmarks**. In the last two a
  row is a question, so picking one opens that question.
- **Three menus narrow all three views**, drawn in the app's own glass (he called the first ones "a
  random preset list"): **Activities** (he renamed it from "work"), **Domains** and **Skills**.
  Each takes several choices at once. Domains lists the eight under their two sections, and a
  section's own row takes all four. Skills opens on the eight domains only; a domain is opened to
  choose skills inside it. Domains and skills add to one another. A button says how many are chosen
  ("2 activities"), never the names, so nothing is cut short. Never by difficulty.
- With room, both panes scroll inside their own glass, so the page never scrolls. On a phone each
  step is its own page with the title row's back pill; the list shows 40 rows and "Show earlier"
  adds 40; coming back to the list returns to where it was left.
- The daily log records what each day was made of (`sets`, `fives`, `challenge` on `DayLog`), so the
  log's counts agree with the calendar. The challenge question adds one to a day's questions.
- **Stand-ins:** every sitting and answer is made up. The question shown for a past answer is one of
  eight samples written for this page, one per domain; the bank's real questions replace them when
  the log reads real answers. Bookmarks and flags changed on the page are not saved.
- **The SAT countdown badge is inside the score pane**, in its top right corner, the same distance
  from the top edge as from the right (24 on desktop, 18 on a phone). Under "20 days to your SAT" it
  gives the date ("December 5"; the year is added only when it is not this one). The days and the
  date are written in a color for how near the test is, with a band of light that crosses them every
  five seconds: **blue** when it is more than a month away, **gold** within a month (31 days),
  **red** within a week. The badge is a dark chip in both modes, because gold only reads as gold
  against something dark (on the light glass it had to be brown to be legible). In the medium-width
  layout he uses it shares the top of the pane with the title; elsewhere it has the top line to
  itself, so a long title can never run into it. The demo students show all three: 3 weeks (118
  days, March 13, 2027), 9 weeks (20 days, December 5), 7 months (6 days). His word for the colors
  was "relative, like shiny"; I read it as reflective and shiny, and told him so.
- **The calendar rings two days** in the badge's colors (`data-mark` on a day in
  `ProgressActivity.tsx`): the day of the SAT in ruby and the day 30 days before it in gold. The
  calendar now goes forward as far as the month of the SAT. Pressing the gold day says "30 days to
  your SAT" in the day's card.
- **Menu icons** (`stickers.tsx`): the Mistake Log is a little notepad with lines of writing, no
  cross; hovered, three pages flip up over its binding one after another (`flip` in
  `shell.module.css`). Progress is a line climbing across a graph to a clay point; he did not like
  the peak with a flag, nor the orange dot on the first climbing line. It is now an arrow climbing
  over green shade, as he described (see the menu icons note under Rewards).
- The phone audit (`scripts/dev/progress-phone-audit.cjs`) walks the Mistake Log's whole way
  through, with each menu open: 264 screens, none with anything wrong. Desktop: 42 screens, none.
- `page.tsx` is at 689 lines: split it before adding anything more to it.
- Not built: the exam breakdown page (an exam in the log shows its questions; the exam rows on Exams
  taken still open nothing), saving bookmarks and flags, real data, the test date in Settings.
- Next: his verdict; then the new-student page.

**Rewards: fourth round (2026-11-16); awaiting his next verdict.** Files: `Rewards.tsx`,
`RewardsBox.tsx`, `RewardsPassIcon.tsx`, `characters.tsx`, `rewardsData.ts` (which says what is settled
and what is made up), `rewards.module.css`. He gave four rounds of notes in one day; this is where it
stands.
- **They are coins.** He tried "tokens" for one round and came back: "tokens are just hard to say."
  Do not rename them again without his word. The coin is a gold piece with the fox's head **carved
  into** it: a reeded rim, a sunk field, the fox cut into the field with slanted eyes (`Coin` in
  `RewardsBox.tsx`). **The made-up student holds 100,000 coins because he asked for that many to
  test with**; a real student starts at none.
- **Settled by him and used here:** coins are spent only on Rewards and appear nowhere else; they
  are gold in every theme; they are earned by leveling up skills, full-length exam scores, time
  trials, endless mode and the Daily 10; the challenge-question streak raises a multiplier by 0.25x
  a day up to 5x and a missed day returns it to 1x; **a box holds only things to wear**, shown on
  the fox and never put on for the student ("Wear it" or "Keep for later"); 16 characters, each
  unlocked by its own challenge and by nothing else; the fox is every student's first, and **its
  name is Karman**.
- **The mystery box** is shaded on every face and tied in gold with a full bow. At rest it shakes
  now and then and gives off sparks. Opened, it hops, rays break out behind it, **the lid bursts
  outward in pieces**, and the prize rises out of it on the fox. This is his description from
  2026-11-16 and it replaces his 2026-10-30 rule of a burst into blocks.
- **Themes and skins are off the page.** His words: they "definitely might need to be rethought";
  he may base themes on places such as countries; light and dark stay tied to day and night. Do not
  put the first version's four themes and four skins back.
- **Passes take their place: things of real use**, each with the limit he set. **New product rule
  he stated: full-length exams can only be started on Saturday, from 6 am to midnight.**
  - **Exam pass:** one pass for both an early and a late start; once a month.
  - **Streak saver:** keeps a streak through one missed day; once a week. He saw it and said it is
    fine.
  - **Second chance:** inside a skill set, after a miss, the student corrects the mistake and
    spends one so the run of right answers still counts and the skill can still level up (his
    example: three right, one wrong, corrected, and on to Understanding). **They are bought on
    Rewards ahead of time and kept; they cannot be bought in the middle of a skill set.** One may
    be used in a skill set. The skill set screen that uses them is not built.
  - The prices are mine (3,000, 1,200, 300). An exam pass or a streak saver is held one at a time;
    second chances can be held in number.
  - Each has a small picture that moves when its row is hovered (`RewardsPassIcon.tsx`): the
    flame sinks to an ember and flares back; the circle with a cross pops into a green circle with
    a check mark.
- **Characters** (`characters.tsx` draws all 16 faces in code, in the fox's manner):
  - Each has its own name, written **under its square**, and a little story. The card never says
    what animal it is (his ask). The card sits **above** the faces.
  - One not yet unlocked is seen grayed out. How far along its challenge is runs round its square
    as **a green ring set into the edge** (he did not want the bars under the squares).
  - **The last three, the hardest, are black shapes named "???"** ("just like how Subway Surfers
    does it"), and their card says "A mystery until it is yours." with the challenge still told. He
    wants it to be a surprise: the three are animals whose outlines could be several things (the
    wolf, the badger, the red panda). The stag was one of them and its antlers gave it away, so it
    was moved up into the grayed-out ones. Keep antlers, long bills, spines and tails out of the
    mystery three.
  - He found the heron, the crane, the lynx, the squirrel and the otter hard to read; they are
    redrawn: the heron and the crane from the side (long neck and bill), the lynx with long ear
    tufts and ragged cheek ruffs, the squirrel with its tail and an acorn, the otter with whiskers
    and a pebble in its paws. **He has not judged the redrawn five or the rest.**
  - All names, stories and challenges are my draft, in order: Karman, Juniper (owl), Clover
    (rabbit), Maple (deer), Thistle (hedgehog), Bruno (bear), Pebble (otter), Hazel (squirrel), Reed
    (heron), Sable (lynx), Willow (crane), Rowan (stag), Cinder (phoenix), then the three mysteries:
    Flint (wolf), Barley (badger), Saffron (red panda).
- **Records, a second pane on the left under Coins,** to balance the page against Characters (his
  ask): lifetime coins, earned today, best day, boxes opened, longest streak, top multiplier. All
  six figures are made up.
- **The page.** With room, three columns on one screen: Coins over Records; the mystery box with
  Passes under it; Characters. In the medium-width window the box and passes sit side by side on
  top. On a phone a slim line always shows the coins held, and Box, Coins, Passes and Characters
  are pages; none scrolls.
- **Still made up:** every price and amount; the four things to wear (round glasses, party hat,
  crown, spring leaf); every name, story and challenge; the six records.
- **Open with him:** one phrase in his last notes that I could not make out ("Exchange would
  disable the links", said between the mystery characters and the grayed-out names) and did not
  build on; where a student sees and changes what they own; what themes and skins become; and the
  question raised on 2026-11-15 and never answered, that a streak multiplier that resets and
  mystery boxes are patterns flagged for under-18s.
- **Menu icons, each with a color of its own** (his list, 2026-11-16; `stickers.tsx`): **Progress is
  a graph**: its two axes, a line climbing to a small arrowhead, green shade under the line;
  hovered, the line is drawn from foot to tip with the shade spreading under it (his second note on
  it: the first arrow "springs upward, it's not drawn, and the arrowhead is way too big"). The
  Rewards trophy's star is gold; the Mistake Log's line is orange; the Library's books are red and
  green upright and blue leaning on its side. He said "the blue book on its side": I read that as
  the leaning book. If he meant lying flat, redraw it.
- `plans.ts` holds the menu lists that were in `page.tsx`. The phone audit walks Rewards too.

**Progress step 5, the new-student page: built (2026-11-16), awaiting his verdict.** He chose it as
the next piece. His rules (2026-11-15): the page tells a new student what to do first and sends them
there; the Daily 10 comes first; a full-length exam is suggested after 100 questions, as a suggestion
and not a gate; a predicted score needs two full-length exams; Free students never get one.
- **Nothing answered yet** (`ProgressStart.tsx`, `progressStart.module.css`): instead of three panes
  of zeros, Progress is one thing to do and what it leads to. Left: "Start here", "Daily 10" in the
  large serif the predicted score will use, one line, and "Start the Daily 10". Right, "Coming up",
  in order: your first answers (time, pacing and calendar start to fill in), 100 questions (a good
  time for a first full-length exam, "0 of 100"), two full-length exams (your predicted score, "0 of
  2"). On the Free plan the last one reads "Your predicted score, with Practice or Pro".
- **Some practice, no score yet** (`Waiting` in `ProgressScore.tsx`): the score's place still says
  "Take two full-length exams to see your predicted score". Under 100 questions and no exam it shows
  a band and "52 of 100 questions before your first exam", the main button is "Start the Daily 10",
  and a quiet "Take an exam now" sits under it (the 100 is not a gate). At 100 questions, or once
  one exam is taken, it shows the two exam slots and "Start a full-length exam", as before.
- **Free plan:** the score's place reads "Your predicted score comes with Practice or Pro" with an
  Upgrade button. The demo bar has a "Free plan" switch on Progress.
- Two more made-up students in the demo bar: **Day 1** (nothing answered) and **2 days** (52
  questions, no exam). `BEFORE_EXAM` (100) is in `progressData.ts`.
- Buttons lead nowhere yet (the Daily 10, exams and Upgrade are not wired), like the rest of the
  dev shell. The wording of the three "Coming up" lines is mine.
- With this, the five steps planned for Progress are all built. Open on Progress: his verdict on
  this page, the Progress icon, the exam breakdown page, accommodations and the test date in
  Settings, and real data.

## Rewards: fifth round, and the last touches to Progress and the Mistake Log (2026-11-16)

He said the Library, Progress, the Mistake Log and Rewards are done after this round. Next is the quiz
engine and each activity's beginning and end screens. Do not start it until he says so.

- **Things to wear: 100, each a thing of its own** (he rejected 200 made of color variants). They are in
  `accessoryHead.tsx` (40), `accessoryRest.tsx` (20 eyes, 20 neck, 20 side), drawn with `accessoryKit.tsx`
  and listed in `accessories.tsx`. `/dev/shell/sheet` shows all 100 on all 16 characters (1,600 checked).
- **The wardrobe is a screen of its own** (`Wardrobe.tsx`): things at the left, the character at the
  right, the page's back pill and Escape leave it. Over the character are the faces to try things on;
  a mystery character is left out until unlocked. "Unlock all 100 for testing" is for design only.
- **Once all 100 are won, no box can be opened**: the Open button goes and the note says "You have all 100".
- **Passes**: Exam pass, 1 a month, keep up to 3. Streak saver, 1 every 2 weeks, keep up to 3. Second
  chance: buy any number, use 1 per skill (he corrected himself on this the same day). No time passes on
  the dev page, so a limited pass can be bought once.
- **The coin**: Karman as George Washington is on a dollar bill: the wig over the whole head, a roll at
  each side, ears up through it, coat and cravat. He approved it ("looks amazing").
- **The box** shakes in every direction, at rest and when pressed. On a prize, "Keep for later" is at the
  left in green and "Wear it" at the right, plain.
- **Night music offer** (`MusicOffer.tsx`): at night a banner comes in at the top right, "Turn it on" or a
  cross. Refused twice in a row, it is never shown again; left alone, it leaves and that is not a refusal.
  Memory is in this browser (`kp-music`). **No recordings are chosen, so nothing plays yet**, and there is
  no Settings page to turn it off in. The demo bar's "Offer music" (night only) shows it again.
- **Progress**: the day card shows "skills improved" in place of percent correct (a stand-in number). The
  right-and-missed bars on Questions answered are a brighter green and red.
- **Open**: he asked for AM and PM on the Mistake Log's times, but its "Time" column is how long a
  session took, not a time of day. Asked him which he means; nothing changed there yet. He also asked for
  Records to be "the same height as" Characters: the two columns now end level at every width; ask if he
  meant something else.

**Settled the same day:** the Mistake Log shows both: the time of day each session began ("6:44 PM", a
stand-in until sessions are logged) and lengths in words ("8m", "1m 36s"). The bars are a light leaf
green and a red as bright. The SAT badge is frosted glass laid on the score: lighter by day, darker by
night. **Next, by his word: the Cohort and Private students' tabs and what only they get.**

## Cohort and Private tabs: Homework, first version (2026-11-16), awaiting his verdict

His answers are in the memory note `project_student_portal_spec.md` (rounds of 2026-11-16). Built:
`Homework.tsx`, `homeworkData.ts`, `homework.module.css`, shown for `?plan=cohort` and `?plan=private`.
The whole week, a day beside a day, today marked; one list a day with the Daily 10 first; a color for
each kind of work (Reading and Writing blue, Math violet, Mixed teal, Pacing and strategy amber, Tests
rose) and a band over the week showing how much of each; arrows step to other weeks; the exam is on
Saturday; Done, Missing and Closed states. On a phone: a strip of seven days and the day pressed.
All the work is made up. Pressing work leads nowhere yet. **Not done:** on Cohort and Private phones he
wants the Mistake Log and Rewards under More, and there is no More page yet. Next after his verdict:
Class (next class and Join, the nine weeks, workshops, tutor and attendance), then Schedule, then Chat.

**Homework, second version (same day), after his verdict.** Three colors only (Reading and Writing
fuchsia, Math blue, Mixed green), no key, no bar, no done count. Work is shaded glass on the day's
glass, as bright by night as by day. The exam leads Saturday as a tall gold card. A day lists only what
is left; a Completed button at its foot opens done work. Columns are one height on desktop. The phone
strip shows dots in three fixed rows. **Music banner:** offered only from 8 PM (real clock), leaves by
itself after 6 seconds, and after "Turn it on" its notes dance and it slides out to the right. The demo
bar's "Offer music" shows it at any hour. Its line says "Studies show..." at his request; the research
on this is mixed, and he has been told.

**Homework, third version (same day), after his second verdict.** It opens on the **day**: at the left
Karman in a ring that fills as work is done, the count left, seven bars for the week (press one to go to
that day) and the next class; at the right the day's work, with arrows to other days and a Day / Week
switch. The exam is a banner on top with Karman in a graduation cap, drifting lights and stars, and it
says when it opens and closes. Only skill sets, strategy quizzes, flashcards and time trials are
homework (no Daily 10, no challenge question). A piece says its name and "8 questions"; a small picture
says its sort. Work is "liquid glass" in fuchsia, blue or green. Missed work is a red disc with a mark,
done a check, closed a lock. Files: `Homework.tsx`, `HomeworkBits.tsx`, `homeworkData.ts`,
`homework.module.css`. `/dev/shell` is now dark unless `?night=0`. He also asked for ideas for Settings.

**Homework, fourth version (same day).** The exam banner has a days, hours, minutes, seconds clock to
Saturday 6 AM; then a Start exam button pops up with a clock to midnight under it (demo bar: "Exam open"
shows that state). By day the banner is a dawn sky, by night the deep one. The week bars are gone. The
character is the student's own (`equipped.ts`, set by Rewards), leans toward the pointer, perks at a
press, and plays a trick when pressed (every fifth a somersault with stars). The next class is a big
button with a self-drawing chalkboard and a countdown; a class day's list is led by a lit pill with
Join on it (Join works from 10 minutes before; my number). Work is calmer tinted glass, one piece under
another. Each Math domain has its own picture and movement; all picture movement is GSAP
(`homeworkMotion.ts`; GSAP 3.15 was already installed). Pacing is not homework. **Pressing a piece still
to do finishes it** (check drawn, slides away, character cheers) so he can judge the finishing; remove
that once activities have their own screens.

**Homework, fifth version (same day).** The character's eyes look at the pointer (the fox's `.m-eyes`
group is moved; other faces have no such group yet) and it is raised to sit at the ring's middle. Math
domain pictures are gone. Every piece has a Start button (which, for now, finishes it). Strategy quizzes
have a compass and five questions. The exam banner is a window onto space: round stars, a ringed planet,
a moon, a shooting star; **no four-pointed stars anywhere on Homework** (he dislikes them; Rewards'
sparkles have not been changed). The class pill in the day's list is gone; in its place today's Daily 10,
until done, is a card with Start. Under the character a line of words changes every few seconds. The
class button always goes to Zoom (no link exists yet; it says "Opening Zoom"). Stepping days or weeks
slides the pieces in. **Phone bar:** pictures only, the middle one larger, fixed to the bottom with the
safe area (`layout.tsx` sets `viewport-fit=cover`). **Homework icon:** rows slide off, a tick lands with
confetti, and it loops while Homework is open.

**Homework, sixth version (same day).** Start and Review are glass buttons, not white; a finished piece
says Review and opened Completed work lies in a grid. The exam banner is a beach drawn in code: dusk with
a moon by night, sunset by day, swells and two waves washing up the sand (he asked whether real footage
could be found; he has been asked if he wants a free-license clip instead). The Daily 10 card is orange
fading to black with ten rounded squares breathing green. The character's whole body leans the way its
eyes look. The words under it stay ten seconds each. The class countdown ends five minutes before class.
The compass has eight edge marks and a one-line needle, red and blue. The profile picture is a plain
head and shoulders until a student sets one (no fox).

**Homework, seventh version (same day).** Daily 10: its dot wave is back, on a quieter orange with flowing
molten light and embers rising (his reference: the Nuclear Fallout finish in Call of Duty: Mobile).
**Challenge question** (`HomeworkChallenge.tsx`): a full-screen banner when Homework opens if it is not
done; sent away with Later, it sits beside the Daily 10 in one row; when either is done the other takes
the row; both land in Completed. Opened Completed work sits right under the remaining work at the same
width. Compass needle is two arrowheads, red and blue. The chalkboard writes and wipes smoothly. Title is
"Full-length exam 3" on desktop and "Exam 3" on phones. Phone bar at night is lighter frosted glass and
the middle icon stands in a lighter circle. **The exam banner's scene is still drawn; he wants real
looping footage of a beach (dusk for dark, sunset for light): a free-license clip must be found and he
must OK the download.** Twice in this session a style edit cut out the `.main`/`.arrow`/`.sort` rules of
`homework.module.css`; look at a picture after every CSS patch there.

**Homework, eighth version (same day).** The exam banner now plays **real film** of waves on a beach in
a loop: `public/portal/exam-shore-day.mp4` (Pexels 5288655) by day and `exam-shore-night.mp4` (Pexels
3179024, darkened) by night, each with a `.jpg` poster; he approved the downloads; Pexels' license is
free with no credit needed. Cut to about 9 seconds with a cross-faded join, 1280 wide, 0.7 MB and 2 MB.
The old drawn beach is hidden (`.shore`), to delete once he approves the film. **The menu no longer
opens by itself:** it opens only when the pointer rests on it (110 ms) or on keyboard focus, and it shuts
when the window loses focus or the pointer leaves the page (`page.tsx`). The challenge's picture is the
fox flying over a city with a detailed mask and a rippling cape (`HomeworkHero.tsx`), night or day with
the page. The Daily 10 has most of the head row. The default profile picture is a violet sky with a
figure. Every small picture now carries `fill="none"` itself, so a lost style rule cannot turn it black.

**Homework, ninth version (same day).** He rejected the real film in the exam banner ("looks really bad"
beside the drawn page), so the clips and the video are **removed** and the beach is **drawn again, to
look real**: `HomeworkShore.tsx` paints it on the graphics card every frame (sky with moon or sun, swell
under perspective, glitter path, three wave fronts that break into foam, a sheet of water running up the
sand and sliding back, wet sand that shines). Night in dark mode, day in light. The banner is taller (148
px desktop, 104 phone) so the scene can be read. Still with reduced motion; plain sky without WebGL.
**The challenge banner's city is rebuilt** (`heroCity.ts`, `HomeworkHero.tsx`): four depths painted once
on canvases and slid at four speeds, with very varied heights and roofs, small many windows lit floor by
floor with glow, haze with distance, street trees and lamps, and rooftops passing in front of the fox.
The scene fills the whole card; the words are at the top and the buttons at the foot. The challenge card
on the Homework page has its hexagon mark back (he asked for that).

**Last touches before Chat (2026-11-16).** He called the city flight "amazing". The flying fox now has a
small bobblehead body: a blue suit with a gold K, red trunks and boots, short thick arms and legs, one
fist out, his tail behind (`HomeworkHero.tsx`). By day the Daily 10 fades from orange into light, not
dark. A finished piece shows Review with no check beside it. **Prices are his now:** mystery box 250,
second chance 500, streak saver 1,500, exam pass 3,000 (`rewardsData.ts`). **Next, by his word: Chat.**

**Icons and last Homework touches (2026-11-16).** The challenge's banner shows **once a day** (the
first time Homework opens that day; `kp-challenge-day` in this browser; the demo bar's "Challenge intro"
shows it again). The flying fox's body is rebuilt in a Funko Pop's proportions: short arms, a fist with
fingers and an open gloved hand, a blue suit with a gold shield and belt, red gloves and boots; the
mask's stitching is gone. The beach has no dry sand: all the sand in view is wet. **Menu icons**
(`stickers.tsx`): Homework's check is green; the trophy is redrawn with a bright yellow star; the
Library is three real books, the blue one tipped and about to fall until hovered, when it swings up and
all three bounce; the Mistake Log's pages turn over the binding; Schedule shows today's date under a red
band; Chat is a blue bubble behind and a gray one in front with three white dots that bob.

**Same day, later.** Text in the portal cannot be selected or copied (`.shell { user-select: none }`,
except in fields a student types in). The Library's blue book now leans toward the stack, on the green
one. Chat: the smaller blue bubble is behind with its tail to the left; the bigger gray one is in front
with its tail to the right. The Class icon and the Homework class button are a chalkboard by night and a
whiteboard with a blue marker by day.
**Site-wide, by his word:** text cannot be selected or copied anywhere on the site (`globals.css`, on
`body`), except in fields a visitor types in. The calculator is unchanged: its host element is given the
default back, and a count of what can and cannot be selected inside it is the same as before. This
reaches karmanprep.com only when the branch is merged and deployed.

## Class is gone; Chat is next (2026-11-16)

**The Class tab is removed** (menus, label and icon). Its class button is on Homework; its workshops are
in the Library (`Workshops.tsx`): for Cohort and Private, each side of the Library shows a Workshop
banner with Sign up where Free, Practice and Pro have Today (the Daily 10 and challenge are on Homework
for taught students); for Pro, "See upcoming workshops" at the top right of More ways to practice opens
the list. The dev page cannot tell Practice from Pro, so the button shows for the whole "Free,
Practice, Pro" plan unless the Free switch is on. Workshops are stand-ins. **Chat** now has the middle
of the Cohort phone bar. Its icon: a big gray bubble in front with its tail to the left and three white
dots, a small blue one behind with its tail to the right; a red badge counts missed messages and turns
gold for a missed announcement (demo bar: "Unread"). The trophy by day is yellow with a white star.
**Chat itself is not built yet.** His answers are in the memory note `project_chat_spec.md`; the live
backend is described in `project_slack_chat.md`. He also wants: flagged or bookmarked questions posted
into a chat to discuss with classmates and tutor, and moderation that is very good and fast for text
and images (the pipeline exists; about 0.7 to 1 second a send when last measured).
