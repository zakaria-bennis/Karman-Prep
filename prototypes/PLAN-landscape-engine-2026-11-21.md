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
- **Trees** with soil and moss between them instead of bare rock. Spirit trees are silver by day and glow
  only at night. (Round two replaced their painted tiers with real firs.)
- **Pollen** that really floats in the air: near grains are bigger and pass faster than far ones.
  **Fireflies** blink low over the ground at night.
- **Houses** in old colours: slate, shingle and faded tile roofs; limewash or dark timber walls.
- **Dusk** is shown as bright as it feels, not as dim as it is.

## His look: Warm (2026-11-21)

He chose **Warm**: light laid in soft painted steps, warm gold, big clouds. Misty came second. The other
two looks and the switch between them are gone. Misty's air (thick valley mist, strong beams) is an idea
for a few lands later (the pine forest, the wetlands, the fjord), to agree with him when we get there.

## Round two: real textures and real trees (the alpine valley)

He asked for "real textures, instead of just polygons", "real motion, maybe even Blender", and for nothing
to look "plasticky".

- **Real ground.** Rock, meadow, snow and stony earth are now real photographs: scans taken from the air,
  from Poly Haven (free, CC0). Each land keeps its own colours; the photographs add the grain, the stones,
  the moss and the ledges, and the light catches every ledge. Snow lies on the rock's ledges and grass
  fills its hollows.
- **Real firs.** The firs are a real scanned fir (Poly Haven), rendered in **Blender** from the side into
  a texture: four trees, each with its boughs, the dark gaps between them, and which way each bough faces.
  The shader wraps it round every fir, so each bough catches the sun. Their outlines now stand out in
  uneven tiers instead of a clean cone. They still sway in the wind.
- **No plastic.** The ground has no shine at all; the light on it comes from the photographs' own tilt.
  The painted steps of the Warm look stay on the land's big shapes only.
- Everything loads after the first picture and fades in over a second, so the page is never slower to
  open. A device that cannot hold that many textures keeps the plain world.

How to make them again: `scripts/dev/world-textures.mjs` (the ground) and `scripts/dev/blender/` (the
firs). Sources and licences: `public/site/world/README.md`.

## Next, one thing at a time

1. ~~The alpine valley, finished in his look~~ (round two, above).
2. **Water:** rivers, lakes and the ocean, with real reflections that are not glassy: a real water
   surface texture, ripples that break the mirror, foam and spray. The endless river picture needs this,
   so it comes first.
3. **The night sky:** the moon with its phase, stars with colour, the northern lights.
4. **Each land in turn,** with its own life and its own real textures and trees (broadleaf trees, palms
   and bamboo from Poly Haven models, rendered in Blender the same way). A first list to agree with him:
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
5. **The home page's route** last. It may stay as it is; he wants to try it. Its words sit on the picture,
   so every change there needs its contrast checked again.

## Speed

Measured on the same computer at the same picture size (620,000 pixels): the world on `main` takes about
26 ms a picture; round one took about 33 ms; round two about 31 ms (the photographs cost almost nothing;
the old painted tiers were removed). The engine lowers its sharpness by itself on a slow device, so on a
phone the picture stays smooth and is a little softer. The photographs add about 1.2 MB, fetched after the
first picture and kept by the browser for a day.

## How changes are shown

Every change is filmed frame by frame on a steady clock (so the video is smooth whatever the computer), at
full size, on phone (390 by 844), tablet (834 by 1194) and desktop (1440 by 900), in light mode (full day)
and dark mode (just after sunset).
