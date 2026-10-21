# Ascent direction (from the founder's chat, 2026-10-21)

The landing page is one continuous vertical climb from the ground to the
Kármán line. Scrolling is the ascent. This merges the founder's outside chat
(handoff summarized below) with the scroll-film work in this repo.

## What was agreed

1. Scrolling is the ascent: the sky shifts colour by layer, clouds fall away,
   stars sharpen, constellations draw themselves line by line, and the page ends
   at the Kármán line.
2. The backbone is built in code (SVG and canvas, GSAP ScrollTrigger), which is
   the most custom and the lightest on phones.
3. Generated media is material, not design: cloud and atmosphere layers, glow
   plates, and long clips that the scroll scrubs through (frequent keyframes).
4. Anti-slop: a style bible first (`docs/style-bible.md`), one shared grade and
   grain on every asset, the signature motifs drawn by hand.
5. No text inside generated video; headlines are HTML over the footage.
6. Phones first: something moves within about 1 second (poster first, heavy
   layers lazy), a low single-digit MB budget for the first screen, a
   reduced-motion fallback, touch tilt.
7. Assets are generated at build time from a manifest
   (`assets/manifest.json`) and served from the CDN, never at request time.

Founder's notes in this repo, 2026-10-21: a continuous vertical scroll story,
more camera movement, and no loops shorter than 10 to 15 seconds; the earlier
scene-swapping version "reads like a PowerPoint". He keeps the people scenes.

## How it fits the existing rules

- **People scenes stay** (rule 41). They become windows along the climb, each
  at a higher altitude; the sky between them is drawn in code.
- **No short loops**: every clip is scrubbed by scroll, so footage only moves
  when the reader moves. New clips are 15 seconds long (manifest).
- **Neon and glow** (handoff mentions a cosmic, neon look): design rules 21 and
  26 ban radial orbs and neon. The sky uses real atmosphere colour, and the
  Kármán line is a thin band of airglow, not a neon ring.
- **Atmosphere tiers**: the product already uses Troposphere, Stratosphere,
  Mesosphere and Kármán Line for skill tiers. On the landing page they are the
  layers of the sky the reader climbs through, never a student's level (rule
  39).
- **Fonts**: the handoff cites IBM Plex and Atkinson Hyperlegible from the old
  landing spec. The current direction uses Source Serif 4 and Hanken Grotesk;
  the app keeps its own fonts. Founder to confirm.
- **Rocket badge**: the logo is still being designed separately; the climb does
  not depend on it.

## Open items for the founder

- Credits or an API key for the long clips (see the manifest for cost).
- Fonts, as above.
- Co-founder Nabil Kafil Asrar: the About page will introduce both founders.
