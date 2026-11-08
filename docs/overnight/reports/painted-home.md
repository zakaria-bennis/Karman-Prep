# Painted home page mock (painted-home session)

Branch: `claude/overnight-painted-home-fa804f`. Nothing deployed, nothing pushed.

## What it is

A copy of the home page in the student portal's painting style, for you to
compare with the live home page. It replaces nothing. The live site and the
site's code are untouched.

- Same sections, same words, same order as karmanprep.com today.
- One of Karman's paintings is painted in behind the page, stroke by stroke,
  in 3.8 seconds. Then birds, deer, ducks and fish come in.
- Every word sits on a tinted, squared-off panel. The panels and the main
  button take their color from the day's painting.
- Big headlines in Young Serif. Everything else, numbers included, in
  Hanken Grotesk.

## How to open it

In Terminal, on a branch that has this work (this one, or
`claude/overnight-ship` once it is merged):

    open ~/Karman-Prep/.impeccable/mocks/painted-home/index.html

It opens in your browser straight from the file. No server needed.

Add these to the end of the address to compare:

- `?scene=3` picks one of the ten paintings (0 to 9).
- `?time=sunset` picks the light: dawn, day, sunset or night.
- `?theme=light` or `?theme=dark`. Without it, the page follows your device,
  and the sun and moon button switches it.
- `?still` shows the finished painting with no motion.

Example: `index.html?scene=3&time=sunset&theme=light`.

Screenshots are in `docs/overnight/reports/painted-home/`. Each one is the
whole page, one screen after another, as a visitor scrolls it.

- `1440-dark.jpg` and `390-dark.jpg`: the lake painting at midday, dark mode.
- `1440-light.jpg` and `390-light.jpg`: the autumn painting at sunset, light
  mode.
- `painting-in-1440.jpg`: the opening, four moments of the painting going on.

## Changed from the live page, on purpose

- Prices follow tonight's table. The guarantee shows the $995 cohort: half
  back is $497.50, all back is $995.
- The guarantee target is +100 points, or +50 for a student who starts at 1400
  or higher.
- The cohort's guarantee no longer lists one-on-one reviews. The cohort has
  no 1:1s.
- "Not for students starting at 1450 or above" is gone. Students at 1400 and
  up now have their own target.
- No small capital labels above headings ("OUR TUTORS", "THE KARMAN
  GUARANTEE"). The rules say no eyebrow labels.
- The four study tools sit in a two-by-two grid instead of a sideways
  carousel. Rule 28: no sideways scrolling.
- "Free practice test" in the header is a plain link. Rule 35: one
  highlighted button on screen.
- The painting replaces the hero film. The three campus films (Harvard,
  Stanford, Berkeley) stay, as rule 47 requires.
- The footer credits the painting instead of the film footage.
- Every link opens the live page it names.

## How I checked it

- Contrast, by calculation: `node .impeccable/mocks/painted-home/contrast-check.mjs`
  checks 34 text and background pairs in light and dark, for every color a
  painting can give, over the worst pixel behind the panel. All pass AA. The
  lowest is 4.55 to 1.
- Nothing moves behind words. The panels are solid from the first frame
  until the painting is finished (measured frame by frame). After that, the
  wildlife is erased from every panel's area on every frame.
- No sideways scroll at 390, 768 and 1440.
- Reduced motion: no painting in, no wildlife, no film playback.
- Clicked in a real browser: the phone menu (opens, closes with Escape), the
  theme switch (remembered), and the links. All 14 live pages it links to
  answer, and every photo and film loads.
- Looked at 390, 768 and 1440, light and dark, with three paintings.

## The judges

Two judge agents started at 04:43 to score the mock against the live page:
one on design and clarity, one on legibility and speed. The app's tools
stalled for about an hour tonight, and their written scores had not come back
when I wrote this. I will add them here if they arrive before 07:40.

What the speed judge had measured (same machine, CPU slowed four times; the
live page loads over the internet, so load times aren't a fair comparison):

- Words on screen: the mock in about 0.3 seconds, the live page in about 0.55
  to 0.65 seconds.
- The page is busy while the painting is prepared: about 0.9 seconds on a
  desktop and 1.5 seconds on a phone. The live page: about 0.2 seconds.
  I fixed the biggest part: phones and tablets now make a smaller picture
  (it is painted over in brush strokes anyway), and the work is split in two.
- Layout shift on desktop: 0.06 (good is under 0.1).

## Decisions I made

- The theme follows the device, with a switch that is remembered. The brief
  says follow the device. The older rule 33 said dark by default.
- One painting a day and light by the hour, the same as the portal.
- Students who start at 1400 or higher: +25 to +49 gets half back, under +25
  gets all back. That is half of their +50 target, like the +100 bands.
- The phone picture's "Check" button is greyed out (no answer picked yet), so
  it doesn't compete with the page's one main button.
- The mock links to the live pages. Those still show the old prices until the
  pricing work ships.
- Repo checks: a small Prettier setting inside the mock's folder keeps the
  mock out of `format:check`. Lint passes on the folder (warnings only, the
  same ones as the prototype). The file-size check only looks at `src/`.

## For you to decide

- The half-back bands for students starting at 1400 or higher (above).
- The closing section says "See their score range". Tonight's portal rule is
  one predicted score. Keep the range on the site, or change it everywhere?
- The live footer has no Cookie Policy link (rule 32), and no cookie page
  exists yet.
- If you prefer the painted style, the next step is porting this mock into
  the real home page.

## Not done

- The judges' scores and a second judging round (see above).
- `format:check` on the whole repo already fails on `prototypes/`. That was
  there before my work.
