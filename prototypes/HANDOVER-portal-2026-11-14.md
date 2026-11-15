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
2. The menu: **first version built 2026-11-15, awaiting his verdict.** Page `/dev/shell` (dev only;
   `?plan=practice|cohort|private`, `?night=1`, `?demo=0`). A floating paper panel over the world: a bar
   of five at the bottom on a phone, a labelled column at the left from 960px, with an ink shape that
   slides to the pressed item. The page name sits on the sky; one sheet below it holds the screen and is
   empty on purpose. Its numbers: control height 48, corners 14 and 24, three text sizes (12, 15, title).
   He asked for it to be designed with the impeccable, Intent and Perception-First Design skills plus
   Mobbin (Calm, Deel and Telegram were the references for a menu floating over a picture). Intent and
   PFD are not listed as skills in Claude Code; their files are under
   `~/Library/Application Support/Claude/local-agent-mode-sessions/.../rpm/` (search for `skills/intent`
   and `skills/pfd`). Raised with him, not yet answered: the streak multiplier that resets and mystery
   boxes are patterns Intent flags for under-18s.
3. Each screen's layout, one at a time.
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
