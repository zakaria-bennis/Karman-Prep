# Brand & design language

Karman Prep's unified visual + interaction system. Source of truth for every
visual decision in the product. Pre-code reference: every new token,
component, or surface composition starts here.

Set 2026-05-16. Supersedes the cloud-aurora landing aesthetic and the
Geist-only type stack.

## Identity

**Premium-academic, warm, established, lively.** Karman is the prep school
your kid wished existed — serious about outcomes, warm about the
experience, confident without being clinical. The aesthetic frame is a
**warm night observatory**: a quiet, lamp-lit study where the night sky is
the work and the constellations are how progress takes shape.

Explicitly NOT:

**Generic AI aesthetic** — purple-to-blue AI gradients, neon / electric-blue
washes across the whole site, glowing blobs, floating 3D blobs, overused
SaaS hero layouts, random sparkles, overly glassy blue-violet cards, cool
blue-violet background dominance, generic stock illustrations, magnetic
CTAs, scroll-jacked timelines. Anything that reads as "mass-generated
futuristic."

**Cold / sci-fi** — cyberpunk neon, gaming-style UI, crypto-dashboard
chrome, sci-fi HUD overload, spaceships, planets used as decorative
gimmicks, warp-speed transitions, spinning galaxies, black-hole visuals,
heavy galaxy wallpaper, the "space movie" aesthetic. **The observatory is
a lamp-lit study with the night sky outside — terrestrial, scholarly,
human. Not Star Wars.**

**Other** — library-brown dominance (mahogany, sepia, brass-heavy
textures), kinetic / showcase-y motion, hover-burst shadows.

### Naming

The product is **Karman Prep** (often stylized **KARMAN** in display
contexts and the wordmark). The earlier working name "Strata" is retired
and must not appear in product, marketing, or internal documents going
forward. Any leftover Strata reference in code, copy, or docs is a bug.

## Color

The palette is built in three semantic layers. Hex values are canonical;
token names are how they appear in code.

### Foundation — warm dark canvas

| Token              | Hex       | Brand name       | Use                                            |
| ------------------ | --------- | ---------------- | ---------------------------------------------- |
| `--bg-night`       | `#070605` | Warm Night       | Page background — the deepest layer            |
| `--bg-espresso`    | `#0D0A08` | Deep Espresso    | Alt sections needing subtle differentiation    |
| `--bg-charcoal`    | `#12110D` | Warm Charcoal    | Floor of card stacks; subtle section dividers  |
| `--surface`        | `#171611` | Card Surface     | Default panel background                       |
| `--surface-raised` | `#222018` | Elevated Surface | Hovered cards, modals, popovers                |
| `--text-primary`   | `#F3ECDD` | Ivory            | Primary text on dark surfaces                  |
| `--text-muted`     | `#B8B0A1` | Taupe            | Secondary text — labels, captions, muted prose |
| `--border`         | `#3B3426` | Bronze Border    | Default borders, separators, dividers          |

### Prestige — gold

Used sparingly. Gold marks moments that should feel earned: primary CTAs,
mastery states, score-guarantee callouts, KARMAN brand moments. **Never for
decoration.** A page covered in gold is a page that means nothing in gold.

| Token                  | Hex       | Brand name          | Use                                             |
| ---------------------- | --------- | ------------------- | ----------------------------------------------- |
| `--accent-gold`        | `#C8AB6A` | Antique Gold        | Primary CTAs, mastery indicators, brand moments |
| `--accent-gold-bright` | `#E4C86A` | Star Gold Highlight | Focus rings, key highlights, twinkle moments    |

### Constellation accents — subject signals

Used as **signal, not theme**. A page is never "the math page" by being all
blue; a page tells you it's about math through accents — node colors, glow
behind a focused element, the constellation line on `/learn`. Body copy and
surfaces stay on the warm-dark canvas regardless of subject.

| Token                 | Hex       | Brand name | Use                              |
| --------------------- | --------- | ---------- | -------------------------------- |
| `--subject-rw`        | `#D84F73` | R&W rose   | Reading & Writing primary signal |
| `--subject-rw-glow`   | `#F06A8C` | R&W glow   | R&W ambient/hover/highlight      |
| `--subject-math`      | `#2FA8FF` | Math blue  | Math primary signal              |
| `--subject-math-glow` | `#42D9FF` | Math glow  | Math ambient/hover/highlight     |

### Status colors — semantic palette

Resolved 2026-06-12 when the dashboard / tutor / admin surfaces were
rethemed. Status hues are **warm-compatible** so they read on the espresso
canvas without the cool-green / cool-amber clash. `error` and `info` reuse
the constellation signals (so the system stays tight — six accent hues, not
ten), named semantically so application code reads intent, not signal.

| Token            | Hex       | Brand name    | Use                              |
| ---------------- | --------- | ------------- | -------------------------------- |
| `success`        | `#8BA86A` | Moss          | pass, mastered, paid, on-track   |
| `success-bright` | `#A6C486` | Moss light    | success icons / emphasis on dark |
| `warning`        | `#E0A24A` | Amber         | pending, due-soon, caution       |
| `warning-bright` | `#F0BE72` | Amber light   | warning icons / emphasis         |
| `error`          | `#D84F73` | Rose (= R&W)  | fail, reject, overdue, error     |
| `error-bright`   | `#F06A8C` | Rose light    | error icons / emphasis           |
| `info`           | `#2FA8FF` | Blue (= Math) | neutral info, hints              |
| `info-bright`    | `#42D9FF` | Blue light    | info icons / emphasis            |

Usage: solid hue for icons / text / thin borders; a low-opacity tint
(`bg-success/10`, `border-warning/30`) for status surfaces. Warning amber is
deliberately more saturated/orange than the gold CTA (`#C8AB6A`) so a caution
state never reads as a brand moment. Keep gold for earned/brand moments, not
for generic "success."

## Typography

Four typefaces, each with a clear purpose. No font outside this stack.

| Typeface                  | Use                                                                                                           | Source       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| **IBM Plex Serif**        | Display + headings (h1–h3)                                                                                    | Google Fonts |
| **IBM Plex Sans**         | Body, UI labels, buttons                                                                                      | Google Fonts |
| **Atkinson Hyperlegible** | Long-form reading inside the LMS — lesson text, textbook entries, passage rendering for diagnostic + practice | Google Fonts |
| **IBM Plex Mono**         | Technical labels, code, equations, monospace lockups                                                          | Google Fonts |

### Scale (starting point — tuned at token encoding time)

| Token             | Face                  | Size                                 | Use                                |
| ----------------- | --------------------- | ------------------------------------ | ---------------------------------- |
| `type-display-xl` | Plex Serif Light      | ~72px                                | Hero copy, landing                 |
| `type-display-l`  | Plex Serif            | ~48px                                | Section openers                    |
| `type-display-m`  | Plex Serif            | ~32px                                | Sub-section headings               |
| `type-h1`         | Plex Serif            | ~28px                                | Page titles                        |
| `type-h2`         | Plex Serif            | ~22px                                | Card titles                        |
| `type-h3`         | Plex Sans Medium      | ~18px                                | Inline section labels              |
| `type-body-l`     | Plex Sans             | ~17px                                | Marketing body                     |
| `type-body`       | Plex Sans             | ~15px                                | App UI default                     |
| `type-reading`    | Atkinson Hyperlegible | ~17px / 1.7 leading                  | LMS long-form, passages            |
| `type-label`      | Plex Sans Medium      | ~13px / uppercase / +0.04em tracking | Small labels                       |
| `type-mono`       | Plex Mono             | ~13px                                | Code, equations, technical strings |

### Rules

- Headings always Plex Serif. Body always Plex Sans. **Exception:** inside
  LMS reading surfaces (lesson body, textbook entries, passage text), body
  switches to Atkinson Hyperlegible — readability over brand here.
- Italic is real emphasis, not ornament. The italic-last-word section
  header convention is **scrapped**.
- No font weight below 300 anywhere. No font weight above 600 anywhere
  (the heaviest weight is reserved for hero display).
- All-caps is reserved for `type-label`. Never body, never headings. **No
  all-caps large headings** anywhere in the product.
- Letter-spacing only on small caps labels (`+0.04em`). Headings get no
  tracking adjustment.

### Forbidden typefaces

The four-face stack is exhaustive. Outside it, these are explicit no-gos:

- **Fraunces** — explicitly rejected (too bubbly for the brand)
- Bubbly / rounded display serifs of any kind
- Playful or display fonts (Cooper, Recoleta, etc.)
- Childish or game-like fonts
- Neon / sci-fi typography (Orbitron, Eurostile, etc.)
- Generic SaaS sans-serifs that read as default-AI (Inter, Aeonik, SF Pro
  for product type — Plex Sans is the explicit alternative)
- Overly ornate old-library serifs (Goudy Old Style, Trajan, Caslon Antique)
- Trendy fonts overused by AI-generated sites at any given moment

## Motion

**Contemplative.** The room is quiet. Things settle into place; they don't
arrive with momentum.

### Vocabulary (replaces the cloud / aurora set)

| Primitive   | Behavior                                                                                       | Use                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Settle**  | Fade-in + 8–12px rise + ease-out, no overshoot                                                 | Replaces `Reveal`. For any new content entering view.                                                       |
| **Twinkle** | Slow opacity oscillation 1.0 → 0.85 → 1.0 on a 3–6s cycle                                      | Constellation accents, mastery glyphs, ambient stars in `/learn`                                            |
| **Trace**   | Slow draw-on of a stroke or path                                                               | Constellation lines on `/learn`, section dividers, progress arcs                                            |
| **Hold**    | Explicit absence of motion as a primitive                                                      | When something appears it stays put — no idle drift, no parallax, no hover-lift on non-interactive surfaces |
| **Respond** | Minimal hover/press feedback — opacity shift or border-tone change. No scale, no shadow burst. | Buttons, cards, interactive icons                                                                           |

### Tokens

| Token                    | Value                            | Use                                 |
| ------------------------ | -------------------------------- | ----------------------------------- |
| `duration-instant`       | 100ms                            | Focus rings, hover state changes    |
| `duration-fast`          | 200ms                            | Button presses, small state toggles |
| `duration-normal`        | 400ms                            | Panel transitions, modal in/out     |
| `duration-slow`          | 800ms                            | Page-level transitions              |
| `duration-contemplative` | 1600ms                           | Settle reveals, long fades          |
| `ease-standard`          | `cubic-bezier(0.22, 1, 0.36, 1)` | Default ease-out                    |
| `ease-contemplative`     | `cubic-bezier(0.16, 1, 0.3, 1)`  | Long tail for settles               |

### Forbidden

- Parallax (drift on scroll)
- Scroll-jacked timelines that hijack the reader
- Magnetic CTAs / cursor-following micro-interactions
- Hover scale transforms above 1.02
- Shadow-burst hovers
- Bounce / spring-back easing (no overshoot anywhere)
- Auto-rotating carousels

### `prefers-reduced-motion`

All motion respects the browser preference globally. Twinkle becomes
static. Settle becomes instant fade. Trace becomes already-drawn. The
existing `@layer utilities` block in `globals.css` is preserved.

## LMS readability standards

The LMS surfaces (lessons, practice, diagnostic, textbook entries, passage
reading) have stricter rules than the rest of the product. A tired student
reading a Reading & Writing passage at 11pm is the design target. The
aesthetic serves the work, not the other way around.

- **LMS surfaces stay on the warm-dark canvas.** No light question panels,
  no inverted "light-mode" reading view. The whole product is dark; the
  LMS is no exception.
- **Body inside the LMS is Atkinson Hyperlegible.** Never serif, never
  decorative for reading text. Plex Sans is still used for surrounding UI
  chrome (buttons, labels, nav) on LMS pages.
- **Minimum body weight in LMS context is 400.** No thin display weights
  for anything that has to be read for more than 10 seconds. Late-night
  legibility wins over typographic delicacy.
- **Contrast is non-negotiable.** Axe-core scan passes WCAG AA on every
  LMS surface. Answer choices, question stems, and passage text never use
  muted-on-muted combinations regardless of how good they look.
- **No patterned or decorated backgrounds behind reading passages.**
  Passages render on the plain `--surface` card, undecorated. No grain,
  no glow, no constellation accents bleeding into the reading region.
- **No motion inside reading regions.** Passages, question text, and
  answer choices live in `Hold` motion territory. Twinkle, trace, and
  ambient glow stay outside the reading region's bounding box.
- **Saturation stays low on LMS surfaces.** Subject accents appear only
  as small markers (topic indicators, mastery glyphs) — never as full
  panels or large fills behind reading content. No excessive glow around
  text.
- **No overly bright UI on LMS surfaces.** Even the elevated surface stays
  inside the warm-dark range; no white modal sheets, no ivory panels
  behind questions.

## Logo system

The wordmark + symbol already exist. What's needed is a complete variant
set produced by external design tools. The master file produces every
variant; nothing is reconstructed in code.

### Lockup configurations

1. **Horizontal lockup** — symbol left, wordmark right. Default.
2. **Vertical lockup** — symbol above wordmark. Hero / square contexts.
3. **Wordmark only** — narrow contexts, inline editorial mentions.
4. **Symbol only** — favicon, app icon, social avatar, OG corner.
5. **Monogram (K)** — 16×16 favicon, dense UI, ultra-compact contexts.

### Color treatments

6. Full color on warm-dark — primary use (~95% of surfaces).
7. Full color on ivory — print, certificates, light-mode email previews.
8. Monochrome ivory — over imagery or in clashy contexts.
9. Monochrome bronze/gold — prestige stamping (score guarantee, certs).
10. Monochrome black — print B&W, fax, low-fidelity reproduction.
11. Outlined / line-only — loading states, watermarks, animation start frames.

### Pixel-specific exports

12. **Favicon set** — 16/32/48 ICO + 192/512 PNG for PWA manifest.
13. **Apple touch icon** — 180×180 PNG with rounded corners pre-rendered.
14. **Android maskable** — 512×512 with safe-zone padding per spec.
15. **OG share image** — 1200×630 template with lockup + observatory background.
16. **Email signature** — 200×60 PNG @2x.

### Functional / semantic uses

17. **Animated loading symbol** — constellation-twinkle SVG; reduced-motion → static.
18. **Watermark** — symbol at 10–15% opacity for document backgrounds.
19. **Score guarantee seal** — circular gold lockup with "50-point guarantee" microcopy.
20. **Mastery badge template** — parameterized per-skill-node circular badge.

### Logo rules

- Clear space around any lockup ≥ cap-height of the wordmark.
- Minimum readable sizes:
  - Horizontal lockup: 120px wide
  - Vertical lockup: 80px wide
  - Symbol only: 24px square
  - Monogram: 16px square
- Never rotate.
- Never recolor outside the six approved treatments.
- Never stretch or distort proportions.
- Never place full-color lockup on imagery without a ≥40% black scrim to
  preserve contrast.

## Voice

Tuned in detail later (roadmap items #12 growth + #14 parent engagement).
For now, these characteristics constrain any copy written before then:

- **Confident, not cocky.** Specifics beat superlatives.
- **Warm, not bro-y.** No "let's crush it" energy.
- **Respects the student's intelligence.** No talking down, no
  hand-holding tone in marketing.
- **Plain, not corporate.** Short sentences. Active voice.

## What this supersedes

This brief replaces the earlier landing aesthetic (cloud-aurora,
italic-last-word headers, Geist-only type, blue-violet gradient palette).
Code touching `globals.css`, `tailwind.config.ts`, `src/lib/motion.ts`, and
any `bg-cloud-*` / `bg-grain` / aurora component will be rewritten against
this brief in subsequent chunks of the design-language project.

## Open decisions

- **Semantic colors** (success / warning / error / info) — TBD; deferred
  until at least one banner or form surface is being designed against the
  new system.
- **Type scale pixel values** — the table above is a starting point; final
  values get tuned at implementation time against real rendered surfaces
  on real viewports.
- **Storybook surface** — in-app `/storybook` route vs the full Storybook
  tool; decided at chunk 4 (component library).

## Reference

- [docs/roadmap.md](./roadmap.md) — section 1 is the project profile this brief delivers on
- [docs/architecture.md](./architecture.md) — where the design tokens slot into the system
- [CLAUDE.md](../CLAUDE.md) — testing layers + dev workflow

## How this evolves

Updates to this brief are intentional and discussed, not ad-hoc. The chain
is: change brand brief first → encode in Tailwind tokens → update Storybook
→ roll out to surfaces. Skipping the brief means the codebase drifts away
from the system.
