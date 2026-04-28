# Karman — Sound Effects

Place MP3 files here. All sounds are optional — the app degrades gracefully if files are missing.

## Required files

| File | Trigger | Suggested feel |
|---|---|---|
| `node-click.mp3` | User selects a node on the constellation map | Short, soft UI click (50–100ms) |
| `node-complete.mp3` | Node marked as mastered | Ascending 2-note chime (300–500ms) |
| `tier-unlock.mp3` | A new tier becomes available | Warm orchestral swell or reward tone (800ms–1s) |
| `checkpoint-pass.mp3` | Checkpoint quiz passed | Triumphant short fanfare (1–2s) |
| `error.mp3` | Incorrect answer or failed action | Soft low-pitch tone (200ms) |

## Specs
- **Format:** MP3 (most compatible) or OGG
- **Sample rate:** 44.1 kHz
- **Bit rate:** 128 kbps minimum
- **Duration:** Keep all files under 3 seconds except `checkpoint-pass`

## Free sources
- [Freesound.org](https://freesound.org) — large CC-licensed library
- [Pixabay sounds](https://pixabay.com/sound-effects/) — royalty-free
- [ZapSplat](https://www.zapsplat.com/) — free with attribution

## Howler.js configuration
Sounds are loaded lazily on first use via `src/lib/sounds.ts`.
To adjust volume or add new sounds, edit `src/lib/sounds.ts`.
