# Design tokens — the canonical values

This file is the **source of truth** for type scale, palette, spacing, and
motion. The visual-perception harness diffs the page's computed CSS against
these values (see `tests/visual/tokens.spec.ts`) so drift gets flagged
automatically.

> **For Claude / AI agents:** when you change a typographic or color value,
> update this file in the same commit. The drift-detector is a regression
> tape, not a substitute for human aesthetic judgment.

The palette and type stack below encode the **observatory system** from
[docs/brand.md](./brand.md) — that brief is the design-intent source of
truth; this file is its encoded, checkable form.

## Type scale

Four typefaces (docs/brand.md "Typography"): **IBM Plex Serif** for display
and headings, **IBM Plex Sans** for body/UI, **Atkinson Hyperlegible** for
LMS long-form reading, **IBM Plex Mono** for technical labels. Weights stay
within 300–600. The `.type-*` utility classes in `globals.css` carry the
canonical sizes; the checker only flags headings whose size falls
**outside a sensible range**.

| Token           | Face                  | Target size         |
| --------------- | --------------------- | ------------------- |
| type-display-xl | Plex Serif Light      | ~72px (clamped)     |
| type-display-l  | Plex Serif            | ~48px (clamped)     |
| type-display-m  | Plex Serif            | ~32px (clamped)     |
| type-h1         | Plex Serif            | ~28px               |
| type-h2         | Plex Serif            | 22px                |
| type-h3         | Plex Sans Medium      | 18px                |
| type-body-l     | Plex Sans             | ~17px               |
| type-body       | Plex Sans             | 15px                |
| type-reading    | Atkinson Hyperlegible | 17px / 1.7 leading  |
| type-label      | Plex Sans Medium      | 13px caps +0.04em   |
| type-mono       | Plex Mono             | 13px (tabular nums) |

| Heading | Sensible range |
| ------- | -------------- |
| h1      | 20-56px        |
| h2      | 14-36px        |
| h3      | 12-28px        |

Landing-hero display copy can go larger via `type-display-xl` — that's an
h1 at up to ~100px on very wide viewports; treat the hero as exempt from
the h1 range.

## Palette (Tailwind names)

The app pulls all color from the observatory tokens defined in
`tailwind.config.ts` (hex literals so opacity modifiers work) and mirrored
as CSS variables in `globals.css`. Any computed `color` /
`background-color` outside this list is a candidate for review:

- **Surfaces:** `night` #070605 (page bg), `espresso` #0D0A08 (alt
  sections), `charcoal` #12110D (floors/dividers), `surface` #171611
  (default card), `surface-raised` #222018 (hover/modal).
- **Text:** `ivory` #F3ECDD (primary), `taupe` #B8B0A1 (secondary;
  `taupe/80`, `taupe/70` for muted tiers).
- **Structure:** `bronze` #3B3426 (borders, separators, grid).
- **Prestige (used sparingly):** `gold` #C8AB6A (primary CTAs, mastery,
  brand moments), `gold-bright` #E4C86A (focus rings, twinkle, earned
  numbers).
- **Constellation accents (subject signals, never page themes):**
  `rw` #D84F73 / `rw-glow` #F06A8C (Reading & Writing), `math` #2FA8FF /
  `math-glow` #42D9FF (Math).
- **Status (semantic, warm-compatible — docs/brand.md "Status colors"):**
  `success` #8BA86A, `warning` #E0A24A, `error` #D84F73 (= rw),
  `info` #2FA8FF (= math), each with a `-bright` variant. Solid hue for
  icons/text/thin borders; low-opacity tint (`bg-success/10`) for surfaces.
- **SAT domain (charts):** `algebra` #2FA8FF, `adv-math` #42D9FF,
  `geometry` #7FC4FF, `data-analy` #2B7FC4 (Math sub-domains, distinct blue
  shades), `read-write` #D84F73 (Reading).
- **No cool-slate / raw indigo / emerald / cool-amber anywhere** — the whole
  app (including admin) is on the warm system now.

Avoid raw hex codes outside this registry — they break the token diff.
(Deterministic SVG renderers — figures, the constellation — use the same
hex values as constants; that's the registry, not drift.)

## Spacing

Tailwind's default 4px scale. The most common rhythm in this app:

- `1` (4px) — tight icon gap
- `2` (8px) — chip padding, inline elements
- `3` (12px) — card internal padding
- `4` (16px) — section gutter on mobile
- `5` (20px) — page horizontal padding
- `8` (32px) — page top padding
- `12` (48px) — major section vertical gap

## Motion

Observatory vocabulary (docs/brand.md "Motion"): **Settle** (fade + 8px
rise, 1600ms contemplative ease), **Twinkle** (3–6s opacity cycle),
**Trace**, **Hold**, **Respond** (tone-only hover/press — no scale, no
shadow burst).

- **Hover transitions:** 100–200ms (`duration-instant` / `duration-fast`).
- **Panel / modal:** 400ms (`duration-normal`).
- **Settle reveals:** 1600ms (`duration-contemplative`) — intentionally
  slow; the >500ms flag below applies to _clicked-action_ feedback, not
  enter reveals.
- Forbidden: parallax-on-scroll, springs/overshoot, scale >1.02,
  auto-rotating carousels.

Any motion >500ms in a clicked-action context feels sluggish and should
be flagged for review.

## Border radii

- `rounded` (4px) — chips, code, status pills.
- `rounded-md` (6px) — checkbox, small buttons.
- `rounded-lg` (8px) — small buttons, filter pills, figure plaques.
- `rounded-xl` (12px) — buttons, inputs.
- `rounded-2xl` (16px) — cards, panels (`.card-surface`).
- `rounded-full` — avatars, badges, status banner.

## What this file does NOT cover

- Per-cohort accent colors when introduced — those will need their own
  registry.
