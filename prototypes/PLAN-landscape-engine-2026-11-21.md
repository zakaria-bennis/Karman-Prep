# The landscape engine: the plan (2026-11-21)

The founder asked for the shared live landscape (`src/lib/flight/`) to be redesigned before the endless
river picture is built on it: "a mystical, beautiful world that looks natural and realistic at the same
time", with real light, more detail in every land, life that moves, a better sky and water, and pollen,
fireflies, mist and spray. Branch `claude/landscape-engine`.

## How the world is drawn, and why it stays that way

The world is one small program on the graphics chip. For every pixel it sends a ray out from the camera
and walks it forward until it meets the ground: that is ray marching, the method he asked about. The sun,
the shadows, the haze and the reflections are worked out the same way. So the engine already has the right
bones. What was wrong was what it drew:

- a milky, washed-out picture: a lilac sky and heavy haze over everything;
- trees that were smooth cones, and pale "spirit" trees that looked like white plastic;
- sun rays painted on the screen, which shone straight through mountains and left a line across the
  picture at dusk;
- flat light: the shade and the sun much the same colour.

**three.js and GSAP.** three.js builds a world from triangles. Moving to it would mean rebuilding the
world from scratch, it is heavier on phones, and it would lose the soft, deep look that ray marching gives.
So the land, the sky and the water stay in the ray-marched engine. Where three.js could help later: a
close-up animal or object that needs real 3D. GSAP is for timing animations on a page (an opening, a
switch); the landscape moves by its own clock, so it is not needed here yet.

## Round one: done on this branch (the alpine valley first)

- **Real air.** Sunlight crosses more air the lower the sun is, so it turns gold, then orange, then red,
  and dims. The air scatters blue overhead and a white glow around the sun. The shade is lit by the sky,
  so it is blue by day and gold at dusk. After sunset the high sky keeps its deep blue a while.
- **Haze that lies low.** It fills the valleys and thins toward the peaks, as real haze does.
- **Real beams of light.** The engine now asks, along each ray, whether the sun reaches that bit of air
  past the mountains. Beams appear where it does and lanes of shade where a ridge blocks it. The old
  painted rays are gone.
- **Clouds** with flat bases and torn edges, bright at the rim when the sun is behind them, and above the
  peaks.
- **Wind.** Gusts roll across the grass as a bright wave; each tree leans downwind and sways to its own
  beat.
- **Trees** with branches in tiers, needle clumps that catch the light close by, and soil and moss between
  them instead of bare rock. Spirit trees are dark silver by day and glow only at night.
- **Pollen** that really floats in the air: near grains are bigger and pass faster than far ones.
  **Fireflies** blink low over the ground at night.
- **Houses** in old colours: slate, shingle and faded tile roofs; limewash or dark timber walls.
- **Dusk** is shown as bright as it feels, not as dim as it is.

## The choice he makes now: three looks

Same land, same time of day, same engine. They differ in the air and the colour:

| Look | In a sentence |
| --- | --- |
| **A, Clear** | True to life. Clean air, crisp shadows, natural colour. |
| **B, Warm** | Light laid in soft painted steps, warm gold, big clouds. Closest to Ghibli. |
| **C, Misty** | Mist in the valleys, strong beams, cool colour, spirit lights even by day. The most mystical. |

To see one live: `/dev/world?land=alpine-valley&look=1` (0, 1 or 2). Once he picks, the other two are
deleted, with the `look` switch.

## After he picks, one thing at a time

1. The alpine valley, finished in his look, shown on phone, tablet and desktop, day and night.
2. **Water:** rivers, lakes and the ocean, with real reflections, foam and spray. The endless river picture
   needs this, so it comes first.
3. **The night sky:** the moon with its phase, stars with colour, the northern lights.
4. **Each land in turn,** with its own life. A first list to agree with him:
   - flower fields and lavender: bees and butterflies, petals in the gusts;
   - blossom grove: petals drifting down;
   - autumn forest: leaves falling and blowing;
   - pine forest and bamboo: mist between the trunks, canes swaying;
   - lagoon and reef: fish, clear water over sand, spray on the rocks;
   - wetlands: mist, herons, fireflies;
   - desert and canyon: heat shimmer, drifting sand;
   - snow and glacier: falling snow, wind-blown powder;
   - savanna: herds and dust;
   - fjord, cliffs, karst bay, islands, rice terraces, green hills.
5. **The home page's route** gets the same light last, because its words sit on the picture and every
   change there needs its contrast checked again.

## Speed

Measured on the same computer at the same picture size: today's world takes about 26 ms a picture, the new
one about 33 ms (most of the extra is the beams and the swaying trees). The engine already lowers its
sharpness by itself on a slow device, so on a phone the picture stays smooth and is about 12% softer. Each
next step will try to win that back.

## How changes are shown

Every change is filmed frame by frame on a steady clock (so the video is smooth whatever the computer), at
full size, on phone (390 by 844), tablet (834 by 1194) and desktop (1440 by 900), in light mode (full day)
and dark mode (just after sunset).
