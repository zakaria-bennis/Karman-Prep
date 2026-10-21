# Generating images and video for Karman, as cheaply as possible

Every model from the outside chat except Kling 4.0, the cheapest place to run
each one, and how Claude Code runs them. Prices were checked on 2026-10-21;
they move every few weeks, so the script quotes before every run and checks
the real charge after every job.

## The decision

Leave Higgsfield. Four pay-as-you-go accounts hold small prepaid balances, and
Claude Code calls them from `scripts/generate-assets.mjs`, which reads every
prompt from `assets/manifest.json`. No Recraft account: vectors come from
Ideogram 4.5 or GPT Image 2.5 instead.

Prices for Atlas Cloud were read from its own quote endpoint on 2026-10-21 and
replace the earlier estimates; the earlier "$2.01 for 15 s" was the 480p price.

| Model                           | Route                           | Price                                                                 | Higgsfield, for comparison   |
| ------------------------------- | ------------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| Seedance 2.5 (people scenes)    | Atlas Cloud                     | 15 s: $2.10 at 480p, $4.52 at 720p, $8.90 at 1080p                    | about $5.15 for 15 s at 720p |
| Seedance 2.5, draft then finish | Atlas Cloud                     | $2.10 draft at 480p, then the 1080p finish (about $3.95, unconfirmed) | no draft mode                |
| Seedance 2.0 Mini               | Atlas Cloud                     | $1.46 for 15 s at 720p                                                | about $2.20                  |
| Wan 3.0 (sky, town)             | Atlas Cloud                     | 15 s: $0.60 at 480p, $1.20 at 720p, $2.40 at 1080p                    | about $1.29 at 720p          |
| Wan 3.0 Prime                   | Atlas Cloud                     | $1.89 for 15 s at 720p                                                | about $2.21                  |
| Veo 3.1                         | Google Gemini API, Fast or Lite | Fast $0.10 a second at 720p; Lite $0.05; 8 s maximum                  | about $1.57 for 8 s          |
| Gemini Omni Flash 1.1           | Google Gemini API               | about $0.10 a second at 720p (not wired into the script yet)          | about $1.47 for 10 s         |
| Nano Banana 2.1                 | Google Gemini API               | about $0.05 per 2K image ($0.025 in batch mode)                       | about $0.10                  |
| Nano Banana Pro                 | Google Gemini API               | about $0.24 per 4K image ($0.12 in batch mode)                        | about $0.20                  |
| GPT Image 2.5                   | OpenAI API                      | about $0.013 to $0.05 an image                                        | about $0.05                  |
| Ideogram 4.5                    | fal                             | $0.06 at medium, $0.22 at high                                        | about $0.31                  |
| FLUX 3 Image                    | fal                             | $0.048 per megapixel                                                  | about $0.15                  |

Notes:

- Atlas is also cheaper than fal for Wan 3.0 ($0.08 a second at 720p against
  $0.10), so fal now covers only Ideogram and FLUX.
- Seedance 2.5 is billed by video tokens, so cost rises with resolution and
  length. Drafting at 480p and finishing only approved shots saves about a
  third against rendering at 1080p directly.
- Midjourney V8 has no official API, and Firefly Image 5 needs an Adobe
  developer account; neither can be called from Claude Code.
- The closing orbit shot can be real NASA space-station footage, which is free
  (see `docs/design/scene-plan.md`).

## What the current plan costs

See `docs/design/scene-plan.md` for the scenes. Desktop set, about $45:
six people scenes drafted at 480p ($12.61), about three retakes ($6.30),
the six approved drafts finished at 1080p (about $23.70), the town opener on
Wan 3.0 at 1080p ($2.40), and the orbit shot from NASA ($0). Phone versions are
cropped from these first; a separate vertical version costs about $6 a scene.

## Setup (done 2026-10-21)

Keys are in `.env.local`, which git ignores. Names:

```
ATLAS_API_KEY=          Atlas Cloud: Seedance, Wan
FAL_KEY=                fal: Ideogram, FLUX
GEMINI_API_KEY=         Google: Veo, Omni Flash, Nano Banana
OPENAI_IMAGES_API_KEY=  OpenAI: GPT Image (kept apart from OPENAI_API_KEY, which the app's moderation uses)
```

Balances on 2026-10-21: Atlas $25.00, fal $20.00. Google and OpenAI bill the
card on file; set a budget alert in each billing page.

## How to use it

Say to Claude Code, for example: "Approve c2 and run it as a draft." Claude
Code then marks the shot approved in the manifest and runs:

```
node scripts/generate-assets.mjs                     # price every approved shot, spend nothing
node scripts/generate-assets.mjs --only c2 --run     # generate it
node scripts/generate-assets.mjs --finish c2 --run   # finish the approved draft at 1080p
node scripts/generate-assets.mjs --balance           # prepaid balances
```

The script's safeguards:

- A shot runs only when the manifest marks it `"approved"`.
- A run stops before it starts if the quoted total is over the budget
  ($10 unless you say otherwise).
- After each Atlas or fal job it reads the real charge from the balance, logs
  it to `assets/spend-log.csv`, and stops if the charge is more than 25% above
  the quote.
- Keys are read from `.env.local` and never printed.

## When to switch, later

- **Higgsfield:** use up the remaining 1.42 credits or ignore them. Cancel Plus
  before it renews if it is on a monthly plan.
- **Prices drop often.** Claude Code re-checks the table every time a new batch
  starts and updates this file when a cheaper route appears. One model ID
  change in the script switches provider.
- **Commercial use:** confirm each provider's terms allow generated assets on
  the launch site (Atlas, fal, Google and OpenAI all publish theirs).
