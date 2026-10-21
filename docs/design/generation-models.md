# Generating images and video for Karman, as cheaply as possible

Every model from the outside chat except Kling 4.0, the cheapest place to run
each one, and how Claude Code runs them. Prices were checked on 2026-10-21;
they move every few weeks, so Claude Code re-checks the real charge on the
first job with each provider before running a batch.

## The decision

Leave Higgsfield. It is the cheapest option for only one model, and only on
an annual plan. Use five pay-as-you-go accounts instead, each holding a small
prepaid balance. Claude Code calls them from a script that keeps every prompt
in `assets/manifest.json`.

| Model                         | Cheapest route                  | Its price                                                       | Higgsfield price, for comparison           |
| ----------------------------- | ------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Seedance 2.5 (people scenes)  | Atlas Cloud                     | about $0.134 a second, any resolution: $2.01 for 15 s           | 105 credits, about $5.15, for 15 s at 720p |
| Wan 3.0 (sky, clouds, ascent) | fal                             | $0.10 a second at 720p, $0.20 at 1080p: $1.50 for 15 s at 720p  | 26.25 credits, about $1.29                 |
| Wan 3.0 Prime                 | fal                             | $0.14 a second at 720p: $2.10 for 15 s                          | 45 credits, about $2.21                    |
| Veo 3.1                       | Google Gemini API, Fast or Lite | Fast $0.10 a second at 720p; Lite $0.05: $0.40 to $0.80 for 8 s | 32 credits, about $1.57 for 8 s            |
| Gemini Omni Flash 1.1         | Google Gemini API               | about $0.10 a second at 720p: $1.00 for 10 s                    | 30 credits, about $1.47                    |
| Nano Banana 2.1               | Google Gemini API, batch mode   | $0.025 per 2K image in batch ($0.05 normal)                     | 2 credits, about $0.10                     |
| Nano Banana Pro               | Google Gemini API, batch mode   | $0.12 per 4K image in batch ($0.24 normal)                      | 4 credits, about $0.20                     |
| GPT Image 2.5                 | OpenAI API                      | about $0.013 at medium quality, 1024 px; more at 2K             | 1 credit, about $0.05 at 2K                |
| Ideogram 4.5                  | fal                             | $0.06 at medium, $0.22 at high                                  | 6.25 credits, about $0.31                  |
| Recraft V4.1 Vector           | Recraft API                     | $0.08 an image                                                  | 10 credits, about $0.49                    |
| FLUX 3 Image                  | fal or Black Forest Labs API    | $0.048 at 1K, $0.10 at 2K                                       | 3 credits, about $0.15                     |

Notes on the table:

- Higgsfield credits are worked out at about $0.049 each (Plus, $59 a month for
  1,200 credits). On the annual plan, about $0.039, Wan 3.0 is slightly cheaper
  there ($1.02 for 15 s); everything else is still cheaper direct.
- Seedance 2.5 prices disagree across sources. Atlas Cloud's own page says a
  flat $0.134 a second, while some comparison sites report $0.30 at 720p. The
  first clip settles it. If Atlas turns out to charge more, the fallback is
  BytePlus ModelArk (ByteDance's own platform, $0.103 a second at 480p), which
  may not be open to US accounts.
- Two models cannot be called from Claude Code at all: Midjourney V8 has no
  official API (use midjourney.com and drop the files in the project), and
  Firefly Image 5 needs an Adobe developer account (Firefly Services).

## What the current plan would cost

The climb needs 8 clips of 15 seconds, each in 16:9 for desktop and 9:16 for
phones, so 16 clips in all.

- 6 people clips on Seedance 2.5 via Atlas: 12 clips × about $2.01 = about $24
- 2 sky clips on Wan 3.0 via fal at 720p: 4 clips × $1.50 = $6
- Retakes, assuming about half the clips need a second try: about $15
- Two cloud plates and test images on Nano Banana 2.1 or GPT Image 2.5: under $1

**About $45 in total.** The same set on Higgsfield would be about $100.

## Setup: 20 minutes, once

1. **Create five accounts and load a small prepaid balance on each.** Prepaid
   balances are the spending cap; nothing can run past them.
   - **Atlas Cloud** (atlascloud.ai): $25, for Seedance 2.5
   - **fal** (fal.ai): $20, for Wan 3.0, Ideogram 4.5 and FLUX 3
   - **Google AI Studio** (aistudio.google.com): turn on billing and set a $20
     budget alert in Google Cloud Billing. Covers Veo 3.1, Gemini Omni Flash and
     Nano Banana.
   - **OpenAI** (platform.openai.com): $10 prepaid, for GPT Image 2.5
   - **Recraft** (recraft.ai, API tab): the smallest API package, for vectors
2. **Create an API key in each** and paste it into `.env.local` in the project
   folder. That file is never committed. Use exactly these names:

   ```
   ATLAS_API_KEY=
   FAL_KEY=
   GEMINI_API_KEY=
   OPENAI_API_KEY=
   RECRAFT_API_KEY=
   ```

   Never paste a key into the chat.

3. **Tell Claude Code:** "The generation keys are in .env.local. Build the
   generate-assets script and run chapter 2 as a test."

## What Claude Code does with them

- Writes `scripts/generate-assets.mjs`. It reads `assets/manifest.json`, sends
  each shot to the cheapest provider for that model, waits for the result,
  downloads it to `.impeccable/mocks/decision/film/raw/`, and logs the real
  charge per job to `assets/spend-log.csv`.
- Runs one test job per provider first, compares the real charge with the
  table above, and stops to ask you if any provider is more than 25% off.
- Never runs a batch over a limit you set. The default is $10 per run; change it
  by saying "the budget for this run is $X".
- Grades, adds grain to, and encodes every clip to `docs/style-bible.md`, then
  shows you the result before it goes in a page.
- Asks before any Seedance 2.5 clip is finished at 1080p, which costs the most.

## When to switch, later

- **Higgsfield:** use up the remaining 1.42 credits or ignore them. Cancel Plus
  before it renews if it is on a monthly plan.
- **Prices drop often.** Claude Code re-checks the table every time a new batch
  starts and updates this file when a cheaper route appears. One model ID
  change in the script switches provider.
- **Commercial use:** confirm each provider's terms allow generated assets on
  the launch site (Atlas, fal, Google, OpenAI and Recraft all publish theirs).
