// Key sounds (founder decisions, 2026-10-26): a short, soft sound for each key typed into a math
// field or pressed on the on-screen keypad, chosen by what the key does (sound-recipes.ts): a
// mechanical key's click and thock, warm and low-mid, never piercing, and for digits and letters
// only a quiet tick. Off by default; the Graph
// Settings switch turns them on, and the choice is remembered on the device in localStorage
// (every access in try/catch). Every sound is synthesised here with Web Audio, our own and nothing
// recorded. No AudioContext exists until the sounds are on and one plays (or the switch turns them
// on, which also unlocks audio on iOS inside the tap), and none plays while they are off. All
// sounds pass a low master level, a 3.2 kHz low-pass and a gentle limiter, so fast typing never
// clips. The audio session is "ambient" where the browser supports it (Safari), so the phone's
// silent switch mutes it as it does other app sounds.

import { RECIPES, type KeySound, type Recipe } from "./sound-recipes";

export type { KeySound } from "./sound-recipes";

export const KEY_SOUNDS_STORAGE_KEY = "karman.calculator.keySounds";

type Listener = () => void;
const listeners = new Set<Listener>();
let enabled: boolean | null = null; // read from storage on first use
let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let lastAt = 0;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Whether key sounds are on (off unless the student turned them on on this device). */
export function keySoundsEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = storage()?.getItem(KEY_SOUNDS_STORAGE_KEY) === "on";
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

/** Turns key sounds on or off, remembers it and tells every subscriber. */
export function setKeySoundsEnabled(on: boolean): void {
  enabled = on;
  try {
    storage()?.setItem(KEY_SOUNDS_STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Full or blocked storage: the choice lasts for this page only.
  }
  if (on) {
    // Inside the switch's tap, so iOS lets the context start; a soft key confirms it.
    playKeySound("digit");
  } else if (context !== null) {
    void context.suspend().catch(() => undefined);
  }
  for (const listener of listeners) listener();
}

/** useSyncExternalStore's subscribe. */
export function subscribeKeySounds(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type AudioContextClass = typeof AudioContext;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (context === null) {
    const scope = globalThis as unknown as {
      AudioContext?: AudioContextClass;
      webkitAudioContext?: AudioContextClass;
      navigator?: Navigator & { audioSession?: { type: string } };
    };
    const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
    if (Ctor === undefined) return null;
    try {
      // Safari 16.4+: follow the silent switch like other app sounds.
      if (scope.navigator?.audioSession) scope.navigator.audioSession.type = "ambient";
    } catch {
      // Not settable here; the sounds still play.
    }
    try {
      context = new Ctor({ latencyHint: "interactive" });
    } catch {
      return null;
    }
    // Level, then a warm low-pass, then a gentle limiter before the speakers.
    master = context.createGain();
    master.gain.value = 0.15;
    const warm = context.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 3200;
    warm.Q.value = 0.5;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master.connect(warm).connect(limiter).connect(context.destination);
  }
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return { ctx: context, out: master! };
}

/** 60 ms of white noise, made once, for the clicks. */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise === null) {
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.06), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** A gain envelope: a 3 ms rise to `peak`, then an exponential fall over `length` seconds. */
function envelope(ctx: AudioContext, at: number, peak: number, length: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  return gain;
}

/** The click: the noise through a band-pass at the recipe's centre. */
function click(ctx: AudioContext, out: AudioNode, at: number, r: Recipe): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = r.click;
  band.Q.value = r.clickQ;
  source
    .connect(band)
    .connect(envelope(ctx, at, r.clickLevel, r.clickDecay))
    .connect(out);
  source.start(at);
  source.stop(at + r.clickDecay + 0.02);
}

/** The body: a triangle gliding from `from` Hz by `glide`, fading over `decay` s. */
function body(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  from: number,
  glide: number,
  decay: number,
  level: number
): void {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(from * glide, at + decay);
  osc.connect(envelope(ctx, at, level, decay)).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/**
 * Plays `sound` if key sounds are on; a no-op (and no audio created) while they are off.
 * `variant` (0 to 6) moves the body up that many semitones, so each function sounds its own.
 */
export function playKeySound(sound: KeySound, variant = 0): void {
  if (!keySoundsEnabled()) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  const now = typeof performance === "undefined" ? Date.now() : performance.now();
  if (now - lastAt < 18) return; // a held key repeats; never stack more than one sound a frame
  lastAt = now;
  const a = audio();
  if (a === null) return;
  const { ctx, out } = a;
  const at = ctx.currentTime + 0.002;
  const r = RECIPES[sound];
  const shift = 2 ** (Math.max(0, Math.min(6, variant)) / 12);
  click(ctx, out, at, r);
  if (r.bodyLevel > 0) body(ctx, out, at, r.body * shift, r.glide, r.decay, r.bodyLevel);
  for (const tap of r.taps ?? [])
    body(ctx, out, at + tap.delay, tap.body * shift, r.glide, r.decay * 0.8, tap.level);
}

/** Forgets the audio context and the stored choice's cache (tests only). */
export function resetKeySoundsForTest(): void {
  enabled = null;
  context = null;
  master = null;
  noise = null;
  lastAt = 0;
  listeners.clear();
}
