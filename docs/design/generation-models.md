# Using the image and video models with Claude Code

Every model from the outside chat except Kling 4.0, and how to use each one from
Claude Code. Model IDs and prices were read live from the Higgsfield catalog on
2026-10-21; credits are Higgsfield credits.

## The short version

Most of the models already work in Claude Code through the Higgsfield
connector, which is installed and signed in. Each run costs credits, and the
account has 1.42 left, so the only setup step is a credit top-up.

1. Top up credits at higgsfield.ai (Plans and credits).
2. In Claude Code, ask in plain words, for example:
   - "Use Higgsfield Seedance 2.5 to make chapter 4 from the manifest."
   - "Make the dusk sky plate with GPT Image 2.5, 2K, medium quality."
3. Claude Code checks the price first (`get_cost`), tells you, generates,
   downloads the file into the project, grades it to the style bible and shows
   it to you.

If the connector ever stops working, run this once in the Mac Terminal, then
type `/mcp` in Claude Code and sign in:

```bash
claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp
```

## Video models

| Model                 | Higgsfield ID                     | Lengths     | Best for on Karman                                                      | Price checked                                    |
| --------------------- | --------------------------------- | ----------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| Seedance 2.5          | `seedance_2_5`                    | 4 to 30 s   | The long scroll clips; keeps a face from a reference image              | 105 credits for 15 s at 720p; 45 as a 480p draft |
| Seedance 2.5 draft    | `seedance_2_5` with `draft: true` | 4 to 30 s   | Trying a shot cheaply, then finishing the keeper at 1080p within 7 days | 45 credits for 15 s                              |
| Wan 3.0               | `wan3_0`                          | up to 30 s  | Long, cheaper clips: sky, clouds, the ascent                            | 26.25 credits for 15 s at 720p                   |
| Wan 3.0 Prime         | `wan3_0_prime`                    | up to 30 s  | Wan's higher-quality tier                                               | 45 credits for 15 s at 720p                      |
| Veo 3.1               | `veo3_1`                          | 4, 6 or 8 s | Short, very reliable shots                                              | 32 credits for 8 s (fast, basic)                 |
| Gemini Omni Flash 1.1 | `gemini_omni_flash_1_1`           | 3 to 10 s   | Cheap tests and quick edits of an existing clip                         | 30 credits for 10 s at 720p                      |
| Seedance 2.0 Mini     | `seedance_2_0_mini`               | 4 to 15 s   | The cheapest people clips (used for the current film)                   | 15 credits for 15 s at 720p                      |

Rules for every clip (from `docs/style-bible.md`): no text in the frame,
16:9 for desktop plus a 9:16 version for phones, slow physical camera moves,
at least 15 seconds so nothing loops in under 10. Ask for sound off.

## Image models

| Model           | Higgsfield ID                                  | Best for on Karman                                             | Price checked                  |
| --------------- | ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| GPT Image 2.5   | `gpt_image_2_5` (variants `flare`, `sunburst`) | Anything with words in it: share images, posters; strong edits | 1 credit at 2K, medium quality |
| Nano Banana 2.1 | `nano_banana_2_1`                              | Everyday stills and edits with references; best value          | 2 credits at 2K                |
| Nano Banana Pro | `nano_banana_pro`                              | Native 4K stills, posters for the clips                        | 4 credits at 4K                |
| Ideogram 4.5    | `ideogram_4_5`                                 | Typography and lettering studies                               | 6.25 credits at 2K, high       |
| Recraft V4.1    | `recraft_v4_1` (set `model_type: vector`)      | Icons, the logo, vector shapes                                 | 10 credits at 2K vector        |
| FLUX 3 Image    | `flux_3_image`                                 | Up to ten reference images in one shot                         | 3 credits at 2K                |

## Two models that are not on Higgsfield

- **Midjourney V8**: there is no official API, so Claude Code cannot call it.
  Use midjourney.com yourself, download the image into
  `.impeccable/mocks/decision/`, and Claude Code takes it from there.
- **Adobe Firefly Image 5**: available through Adobe's Firefly Services API,
  which needs an Adobe developer account. Its selling point is that it is
  trained on licensed images, which makes it the safest choice commercially.
  If you want it, create the account and put the key in `.env.local`, and
  Claude Code can call it from a script.

## Paying the providers directly instead (later)

Once the shot list is settled, a build script can call the providers without
Higgsfield. This is cheaper per second for Wan 3.0 and Seedance 2.5 (see the
handoff's price table) and keeps every prompt in `assets/manifest.json`.

1. Create accounts and API keys: fal.ai (Wan 3.0, Seedance 2.5, Nano Banana,
   Recraft, Ideogram), Atlas Cloud (Seedance 2.5), OpenAI (GPT Image 2.5),
   Google AI Studio (Veo 3.1, Gemini Omni Flash, Nano Banana).
2. Put each key in `.env.local`, which is never committed, for example
   `FAL_KEY=...`, `OPENAI_API_KEY=...`, `GEMINI_API_KEY=...`. Do not paste keys
   into chat.
3. Tell Claude Code which keys exist. It will write `scripts/generate-assets`,
   confirm each model's exact name on the provider's page, run one test call,
   and only then run the manifest.

## Before anything ships

- Check each provider's commercial-use terms for the launch site.
- Every generated file gets the shared grade and grain, and is encoded for the
  web (clips under about 2 MB each on phones, with a poster image).
