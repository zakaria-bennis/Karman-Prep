# Design tokens — the canonical values

This file is the **source of truth** for type scale, palette, spacing, and
motion. The visual-perception harness diffs the page's computed CSS against
these values (see `tests/visual/tokens.spec.ts`) so drift gets flagged
automatically.

> **For Claude / AI agents:** when you change a typographic or color value,
> update this file in the same commit. The drift-detector is a regression
> tape, not a substitute for human aesthetic judgment.

## Type scale

The base font stack is `Geist Sans` (variable) for UI and `Geist Mono` for
monospace. Values below are in pixels for the desktop default; mobile
tightens via Tailwind's responsive prefixes.

| Token   | font-size | line-height | letter-spacing | use                            |
| ------- | --------- | ----------- | -------------- | ------------------------------ |
| display | 48        | 1.1         | -0.02em        | landing hero only              |
| h1      | 32        | 1.15        | -0.01em        | page title                     |
| h2      | 24        | 1.2         | 0              | section heading                |
| h3      | 18        | 1.25        | 0              | sub-section                    |
| body    | 14        | 1.5         | 0              | default paragraph              |
| small   | 12        | 1.45        | 0              | meta / hint / caption          |
| mono    | 12        | 1.5         | 0              | inline code, ids, fingerprints |

## Palette (Tailwind names)

The app pulls all color from Tailwind's named tokens. Any computed `color` /
`background-color` rendered outside this list is a candidate for review:

- **Surfaces:** `slate-950` (deepest bg), `slate-900` (panel), `slate-800`
  (border), `slate-700` (separator), `white/[0.02]` (hover wash).
- **Text:** `slate-100` (primary), `slate-300` (secondary), `slate-400`
  (tertiary), `slate-500` (muted), `slate-600` (placeholder).
- **Accents — semantics:**
  - `indigo-{400,500,600}` — primary action, links, role pill (tutor).
  - `amber-{300,400,500}` — admin impersonation banner, warnings,
    flagged questions.
  - `emerald-{400,500}` — success, accept, mastered.
  - `rose-{500,600}` — destructive, reject, error.
  - `sky-{400,500}` — informational, Desmos hints (math only).
  - `violet-{400,500}` — Elite-tier surfaces.
  - `teal-{300,400}` — Small Group tier surfaces.

Avoid raw hex codes outside marketing pages — they break the token
diff and the dark-mode invariant.

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

- **Hover transitions:** 150ms ease-in-out (Tailwind's `transition-colors`
  default).
- **Modal / dropdown enter:** 200ms ease-out.
- **Page transitions:** none today.
- **Floating banner:** appears with 200ms fade; no exit animation.

Any motion >500ms in a clicked-action context feels sluggish and should
be flagged for review.

## Border radii

- `rounded` (4px) — chips, code, status pills.
- `rounded-md` (6px) — checkbox, small buttons.
- `rounded-lg` (8px) — primary buttons, filter pills.
- `rounded-xl` (12px) — cards, panels.
- `rounded-full` — avatars, status banner.

## What this file does NOT cover

- Marketing pages (landing, about) may use custom colors outside the
  palette for brand effect. Diff-checking should treat `/` and
  `/about` as soft warnings, not hard violations.
- Per-cohort accent colors when introduced — those will need their own
  registry.
