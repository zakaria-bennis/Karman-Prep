// ============================================================
// Karman — Sound System (Howler.js wrapper)
// All sounds gracefully fail if the file is missing or if
// the browser blocks audio — sound is an enhancement only.
//
// Sound files live in: public/sounds/
// See public/sounds/README.md for file specs.
// ============================================================

export type SoundName =
  | "nodeClick" // Node selected on constellation map
  | "nodeComplete" // Correct quiz answer / node mastered
  | "tierUnlock" // A new tier becomes available
  | "checkpointPass" // Checkpoint quiz passed
  | "error" // Incorrect answer or failed action
  | "tierAscendRumble" // Tier-ascent cinematic Phase 1 building tension
  | "tierAscendBreak" // Tier-ascent cinematic Phase 2 atmospheric breakthrough
  | "ambientTroposphere" // Crossfade-in tracks for each atmosphere
  | "ambientMesosphere"
  | "ambientStratosphere"
  | "ambientKarman";

// Full Howl instances are exposed here (not just `.play()`) so the
// tier-ascension cinematic can call `.fade()` for crossfading.
type HowlLike = {
  play: () => number;
  pause: () => void;
  stop: () => void;
  fade: (from: number, to: number, duration: number, id?: number) => void;
  volume: (vol?: number) => number;
  loop: (loop?: boolean) => boolean;
  playing: () => boolean;
  unload: () => void;
};

let _cache: Record<SoundName, HowlLike> | null = null;

function initCache() {
  try {
    // Dynamic import keeps Howler out of the SSR bundle
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Howl } = require("howler");

    const make = (src: string, volume: number, loop = false) =>
      new Howl({ src: [src], volume, preload: false, html5: true, loop });

    _cache = {
      nodeClick: make("/sounds/node-click.mp3", 0.25),
      nodeComplete: make("/sounds/node-complete.mp3", 0.55),
      tierUnlock: make("/sounds/tier-unlock.mp3", 0.65),
      checkpointPass: make("/sounds/checkpoint-pass.mp3", 0.7),
      error: make("/sounds/error.mp3", 0.4),
      tierAscendRumble: make("/sounds/tier-ascend.mp3", 0.6),
      tierAscendBreak: make("/sounds/tier-breakthrough.mp3", 0.8),
      ambientTroposphere: make("/sounds/ambient-troposphere.mp3", 0.4, true),
      ambientMesosphere: make("/sounds/ambient-mesosphere.mp3", 0.4, true),
      ambientStratosphere: make("/sounds/ambient-stratosphere.mp3", 0.4, true),
      ambientKarman: make("/sounds/ambient-karman.mp3", 0.4, true),
    };
  } catch {
    // Howler not available (SSR, missing dep) — no-op
  }
  return _cache;
}

/** Access a raw Howl instance for advanced operations (fade, volume, loop). */
export function getSound(name: SoundName): HowlLike | null {
  if (typeof window === "undefined") return null;
  try {
    const cache = _cache ?? initCache();
    return cache?.[name] ?? null;
  } catch {
    return null;
  }
}

/** Crossfade two ambient tracks over the given duration (ms). */
export function crossfadeAmbient(from: SoundName, to: SoundName, durationMs: number): void {
  if (typeof window === "undefined") return;
  try {
    const a = getSound(from);
    const b = getSound(to);
    if (a?.playing()) a.fade(a.volume(), 0, durationMs);
    if (b) {
      if (!b.playing()) b.play();
      b.volume(0);
      b.fade(0, 0.4, durationMs);
    }
  } catch {
    /* no-op */
  }
}

/**
 * Play a sound effect.
 * Safe to call on the server — silently does nothing.
 * Safe to call when audio files don't exist — Howler fails silently.
 */
export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  try {
    const cache = _cache ?? initCache();
    cache?.[name]?.play();
  } catch {
    // Silently ignore all audio errors
  }
}

/** Preload all sounds (call once after user interaction to warm the cache) */
export function preloadSounds(): void {
  if (typeof window === "undefined") return;
  if (!_cache) initCache();
}
