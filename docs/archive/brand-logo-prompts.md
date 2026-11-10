# Brand logo — ChatGPT generation prompts

Paste-ready prompts for generating the master logo assets via ChatGPT's
image generation. The brief these prompts implement lives in
[`docs/brand.md`](./brand.md); this file just packages it as model-ready
prompt text.

## What you need from ChatGPT (not 20 things — only 2)

`docs/brand.md` "Logo system" lists 20 variants. Almost all of them are
**derived from a master**, not generated independently. Only two assets
need to come out of an image model:

| Asset | Description                                                              | Prompt   |
| ----- | ------------------------------------------------------------------------ | -------- |
| `M1`  | Master horizontal lockup — symbol + custom-serif wordmark together       | Prompt 1 |
| `M2`  | Master symbol-only — same symbol from M1, no text, balanced for solo use | Prompt 2 |

Everything else — vertical lockup, wordmark-only, monogram (K), color
treatments, pixel-specific exports (favicon / Apple touch / OG image /
email signature), animated loading symbol, watermark, score guarantee
seal, mastery badge — is generated _from_ M1 and M2 in code, in Figma,
or in any vector editor. You don't need to ask an image model for them.

## Workflow

1. **Generate M1 first** with Prompt 1. Iterate until the lockup is right
   (probably 3–10 rounds — refine with replies like "tighter linework",
   "less ornate symbol", "the K should be slightly wider", etc.).
2. **Once M1 is locked, generate M2** with Prompt 2. _Edit the
   `[CONCEPT]` line of Prompt 2 to describe the exact symbol that won
   in M1_ — this keeps the standalone mark in family with the lockup.
3. **Convert PNG → SVG.** ChatGPT outputs raster; run the winning PNGs
   through a vectorizer (vectorize.io, Vectorizer.AI, or SVG.io are all
   fine; manual cleanup may be needed at small details). Hand the final
   SVGs back to Claude Code for integration into `KarmanLogo.tsx` (the
   placement, color-shifting, and 20-variant derivation happen there).

## Negative reference (optional but useful)

The pre-rebrand logo on the @karmanprep social accounts is a useful
"avoid this" reference. Paste it into the ChatGPT conversation alongside
the prompt with the line:

> Here is my current logo. The new logo must look **nothing** like this —
> every visual element here is explicitly forbidden by the brief. Design
> the deliberate opposite.

gpt-image-1 handles negative visual references well.

---

## Prompt 1 — Master horizontal lockup (mode C — own serif)

Use this first. Iterate until you love the result.

```
I'm designing the master logo for KARMAN Prep — an SAT prep + tutoring
company launching November 2026. Generate a horizontal lockup: symbol on
the left, the wordmark "KARMAN" on the right, optically baseline-aligned.

BRAND IDENTITY
Premium-academic, warm, established, lively. The aesthetic frame is a
"warm night observatory" — a quiet, lamp-lit study where the night sky is
the work and constellations are how progress takes shape. Terrestrial and
scholarly, not sci-fi. The feeling is "an astronomer's notebook by
candlelight," not "a spaceship dashboard."

COLOR
Single dominant color: antique gold #C8AB6A — like a brass instrument or
candlelit metal, not flat yellow.
Highlights/inner accents: star gold #E4C86A.
Background: warm near-black #070605.
Monochromatic — no gradients between colors.

WORDMARK TYPOGRAPHY (do this RIGHT or the lockup fails)
The word "KARMAN" is set in a DISTINCTIVE display serif — deliberately
different from generic SaaS body serifs. Think: a custom titling face an
old observatory or scientific society would commission.

Direction: high-contrast classical serif. Strong vertical emphasis, refined
thick/thin transitions, restrained modern feel. Bracketed serifs that
aren't ornate. Optical balance over mathematical perfection. Medium-to-
light weight (think 400, not 700) — confident but not heavy. All caps,
generous but not excessive letter spacing.

Reference feeling (not literal copies): the title pages of 1920s
scientific journals, a vintage observatory plaque, the wordmark engraved
on a Princeton or Phillips Exeter blazer crest — institutional, earned,
not corporate.

AVOID specifically: Trajan (too ornate-Roman), Bodoni (too commercial-
modern), Goudy Old Style (too library-old), Times New Roman (too generic),
Fraunces / Cooper / any bubbly or rounded display serif. Also AVOID IBM
Plex Serif — we use that for body type elsewhere and the logo needs its
own typographic identity.

The letters must say "KARMAN" — six characters K-A-R-M-A-N, uppercase,
no missing or extra letters.

SYMBOL DIRECTION
Pick ONE and explore:
- A stylized constellation: 3-7 stars connected by faint engraved lines
- A celestial instrument: sextant cross-section, astrolabe ring, brass
  telescope eyepiece head-on
- A single bright star inside a softer concentric ring
- A mountain ridge silhouetted under a sparse star field
- An open book with a single star above it

The symbol should optically balance the wordmark — neither dominating.
Roughly cap-height of the wordmark in visual weight.

STYLE
Flat 2D, vector-feel, hand-engraved precision. Clean lines, no painterly
brushwork, no airbrush gradients, no 3D rendering. Lockup must read at
200px wide (header use) and remain identifiable at 80px wide.

EXPLICITLY AVOID
- Purple-to-blue AI gradients, rainbow washes, glowing blobs
- Neon glow, electric edges, cyberpunk, gaming chrome
- Spaceships, planets, rockets, warp/lens flare, sci-fi HUDs
- Heavy galaxy wallpaper, dramatic nebulae, supernovas
- Mahogany / library-brown / Victorian brass / Hogwarts crests
- Bubbly mascots, "friendly tech" cartoon styles
- Generic SaaS-illustration look
- Multi-color emblems — ONE dominant color

OUTPUT
Generate 3 variations of one symbol concept paired with the wordmark.
Wide framing (16:9 or so), lockup centered with breathing room. Antique
gold on warm dark background. Minimum 1536x1024 PNG.
```

---

## Prompt 2 — Standalone symbol (mode A — no text)

Use this _after_ M1 is locked. **Edit the `[CONCEPT]` line** so the
standalone symbol stays in family with the lockup's symbol.

```
I'm designing the standalone symbol for KARMAN Prep — same brand and same
visual concept as my approved master lockup. This version is for compact
contexts (favicons, app icons, social avatars, watermarks) where the
wordmark won't fit. Generate the SYMBOL ONLY — absolutely no text,
letters, or wordmarks anywhere in the image.

CONCEPT TO REUSE
[CONCEPT: describe the exact symbol concept from the approved lockup —
e.g. "a stylized 5-star constellation forming a quiet asterism, faint
engraved lines connecting the stars" or "a brass astrolabe ring, head-on,
with a single bright star at center"]

The symbol must visually match the one in my approved lockup — same
geometric language, same line weights, same proportions.

BRAND
Premium-academic, warm, established, lively. Warm night observatory frame
— terrestrial, scholarly, not sci-fi.

COLOR
Antique gold #C8AB6A as the dominant color. Star gold #E4C86A for inner
highlights only. Warm near-black #070605 background. Monochromatic, no
gradients between colors.

CRITICAL REQUIREMENT
The symbol must remain identifiable at 16x16 pixels (browser favicon).
Strong silhouette. No fine internal detail that disappears at small sizes.
Test: if you squinted at this from across the room, you'd still know it's
the same mark as the lockup version.

STYLE
Flat 2D, vector-feel, hand-engraved precision. Crisp geometry. Mark fills
60-70% of the square frame with even breathing room.

EXPLICITLY AVOID
- AI gradients (purple→blue, rainbow, "AI default" looks)
- Neon, cyberpunk, gaming chrome
- Spaceships, planets, rocket trails, sci-fi HUDs
- Heavy galaxy wallpaper, dramatic nebulae
- Mahogany / library-brown / Victorian brass
- Bubbly mascots, "friendly tech" cartoons
- Generic SaaS illustration
- Any text, letters, or word-shapes
- Multi-color — ONE dominant color

OUTPUT
Generate 3 variations of the symbol. Square framing, mark centered.
Antique gold on warm dark background. Minimum 1024x1024 PNG.
```

---

## Tips for iterating

- **Generate in batches of 3.** Image models are non-deterministic; first
  attempts rarely nail it. Three lets you compare and steer.
- **Edit refinements over re-prompts.** Once you're close, reply "the
  star is too literal — make it more abstract" rather than starting from
  the full prompt again. The model's working memory of the brief
  carries.
- **Don't ask the model to "do the wordmark in Plex Serif" inside
  Prompt 1.** The whole point of mode C is that the wordmark uses a
  distinctive face _other_ than Plex Serif. Plex Serif is body type;
  the logo wordmark is its own thing.
- **When you have a winner, save the PNG before the conversation goes
  stale.** Image-gen sessions don't persist forever.

## What happens next (Claude integration)

When M1 and M2 SVGs are ready:

1. Hand the files to Claude Code (drop them into the working directory).
2. Claude reads them, places them in `public/brand/logos/` per a clear
   naming convention, and rewrites `src/components/shared/KarmanLogo.tsx`
   to compose the real artwork as inline JSX (so CSS variables can color-
   shift the mark between ivory / antique-gold / outlined treatments).
3. Claude generates the 18 derivative variants (color treatments + pixel
   exports + functional uses) from M1 + M2 — no further ChatGPT runs
   needed.
4. Visual regression baselines get regenerated, PR opens, and the new
   logo ships through the standard `cf:build && cf:deploy` pipeline.
