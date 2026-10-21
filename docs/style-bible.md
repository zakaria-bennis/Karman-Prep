# Karman style bible

One page that every generated picture, film, drawing and screen follows. Read
it before writing a prompt or a component. Design rules in
`docs/design-rules.md` still apply; where they conflict, the rules win.

## The idea

Rising past a line. Every visit is a climb from an ordinary day on the ground
to the edge of space, the Kármán line, 100 km up. The reader's scroll is the
climb.

## Palette

Real atmosphere colour, measured from photographs of the sky, never a gradient
invented for effect.

| Layer (scroll position)   | Sky colour, bottom to top   | Use                                   |
| ------------------------- | --------------------------- | ------------------------------------- |
| Ground, 0 km              | `#1b2532` to `#0e161f`      | Town at night, the day's first scenes |
| Troposphere, 0 to 12 km   | `#2d4a66` to `#1a2c40`      | Clouds, daylight scenes               |
| Stratosphere, 12 to 50 km | `#13243a` to `#0c1726`      | Clouds fall away, first stars         |
| Mesosphere, 50 to 85 km   | `#0a1220` to `#060b14`      | Stars sharpen, constellations draw    |
| Kármán line, 100 km       | `#04070d` with airglow band | The line, the close                   |

- Ink `#f1f1ee`, secondary ink `#b9c2cb`.
- Accents, used on data and one action only: program green `#7cc4a5`, gold
  `#e2b867` for mastered stars, oxblood `#e8959c` for a wrong answer.
- Airglow: a thin band of `#7cc4a5` to `#4f8fb8` at 6 to 12% opacity, never a
  saturated neon ring.
- Light mode is bone `#f1f1ee` with ink `#15202e`.

## Lens and grain

- Photographs and film: full-frame look, 35mm or 50mm, f/2 to f/2.8, natural
  light plus real practical lights, soft contrast, true skin.
- One shared grade on every clip: lift the blacks to `#0b121a`, cool the
  shadows slightly, keep skin neutral; no teal-and-orange.
- One grain pass on every raster: fine, monochrome, 2 to 3% strength.
- Camera moves are slow and physical: a crane rising, a dolly in, an arc.
  Never a whip, a shake or a zoom punch.

## Shape language

- Straight lines and points. Constellations are low-poly: straight segments
  between stars, never curves. Reading is drawn as a heart, Math as a brain,
  as in the app's constellation map.
- The Kármán line is one horizontal line; it is the brand's only ornament.
- Corners: 34px on phone screens, 14px on laptop screens, 22px on cards,
  pill buttons. Nothing else is rounded.
- Type: Source Serif 4 for headlines (large, tight, -0.03em), Hanken Grotesk
  for text.

## Motion

- Scroll drives everything on the landing page: films scrub, the camera moves,
  constellations draw. Nothing loops in less than 10 seconds.
- Ease out for arrivals `cubic-bezier(.22, 1, .36, 1)`, ease in for exits.
- Reduced motion: every chapter is a still, readable screen.

## Banned

- Purple, violet, indigo, magenta, and purple-to-blue gradients.
- Glassmorphism on the marketing page (glass is for app controls only, rule 50).
- Glowing orbs, bokeh blobs, lens flares, neon, light leaks.
- Rockets, planets with rings, astronaut figures, graduation caps, owls,
  lightbulbs, books, pencils, physical calculators.
- Text, letters or numbers inside generated images or film.
- Stock-photo poses: people looking at the camera, laughing at screens,
  thumbs up.
- Screens pasted onto devices in a photo. Product screens appear beside the
  film, in code.

## Prompt suffix for every generated asset

> Photoreal, documentary, natural light, soft contrast, true colour, fine
> film grain. No text, letters, numbers, logos, watermarks, neon, lens flare,
> purple, glowing orbs or rockets.
