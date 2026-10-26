// Key sounds (founder decision, 2026-10-26): a short, quiet sound for each key typed into a math
// field or pressed on the on-screen keypad, chosen by what the key does. Off by default; the
// Graph Settings switch turns them on, and the choice is remembered on the device in localStorage
// (every access in try/catch). Every sound is synthesised here with Web Audio, our own and nothing
// recorded. No AudioContext exists until the sounds are on and one plays (or the switch turns
// them on, which also unlocks audio on iOS inside the tap), and none plays while they are off.
// The audio session is "ambient" where the browser supports it (Safari), so the phone's silent
// switch mutes it as it does other app sounds.

export type KeySound =
  | "digit" // digits, the point, letters and variables
  | "operator" // + − × ÷, =, comparisons, brackets, functions
  | "exponent" // ^ and x², raising to a power
  | "regression" // ~, which runs a regression
  | "constant" // π, τ: an app-like, slightly talking blip
  | "delete" // Backspace and Delete
  | "enter" // Enter, a new row
  | "move"; // the arrow keys

export const KEY_SOUNDS_STORAGE_KEY = "karman.calculator.keySounds";

type Listener = () => void;
const listeners = new Set<Listener>();
let enabled: boolean | null = null; // read from storage on first use
let context: AudioContext | null = null;
let master: GainNode | null = null;
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
    // Inside the switch's tap, so iOS lets the context start; a soft tick confirms it.
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
    master = context.createGain();
    master.gain.value = 0.32;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return { ctx: context, out: master! };
}

/** A gain envelope: a 4 ms rise to `peak`, then an exponential fall over `length` seconds. */
function envelope(ctx: AudioContext, at: number, peak: number, length: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  return gain;
}

/** One pitched voice: `type` gliding from `from` to `to` Hz. */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  opts: { type: OscillatorType; from: number; to?: number; peak: number; length: number }
): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, at);
  if (opts.to !== undefined) osc.frequency.exponentialRampToValueAtTime(opts.to, at + opts.length);
  const gain = envelope(ctx, at, opts.peak, opts.length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + opts.length + 0.02);
}

/**
 * The constant's blip: a buzzy voice through two vowel formants that glide from "ah" toward "ee",
 * with the pitch falling a little as speech does. Short and quiet, so it reads as an app sound
 * with a voice in it rather than a word.
 */
function vowel(ctx: AudioContext, out: AudioNode, at: number): void {
  const length = 0.13;
  const source = ctx.createOscillator();
  source.type = "sawtooth";
  source.frequency.setValueAtTime(240, at);
  source.frequency.exponentialRampToValueAtTime(190, at + length);
  const mix = envelope(ctx, at, 0.5, length);
  for (const [from, to, q] of [
    [760, 380, 9],
    [1150, 2100, 11],
  ]) {
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass";
    formant.Q.value = q;
    formant.frequency.setValueAtTime(from, at);
    formant.frequency.exponentialRampToValueAtTime(to, at + length);
    source.connect(formant).connect(mix);
  }
  mix.connect(out);
  source.start(at);
  source.stop(at + length + 0.02);
}

/** Plays `sound` if key sounds are on; a no-op (and no audio created) while they are off. */
export function playKeySound(sound: KeySound): void {
  if (!keySoundsEnabled()) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  const now = typeof performance === "undefined" ? Date.now() : performance.now();
  if (now - lastAt < 18) return; // a held key repeats; never stack more than one sound a frame
  lastAt = now;
  const a = audio();
  if (a === null) return;
  const { ctx, out } = a;
  const at = ctx.currentTime + 0.002;
  switch (sound) {
    case "digit":
      tone(ctx, out, at, { type: "triangle", from: 1550, to: 1250, peak: 0.22, length: 0.035 });
      return;
    case "move":
      tone(ctx, out, at, { type: "sine", from: 1300, peak: 0.1, length: 0.025 });
      return;
    case "operator":
      tone(ctx, out, at, { type: "triangle", from: 880, to: 760, peak: 0.24, length: 0.05 });
      tone(ctx, out, at, { type: "sine", from: 1760, peak: 0.06, length: 0.03 });
      return;
    case "exponent":
      tone(ctx, out, at, { type: "sine", from: 660, to: 1320, peak: 0.24, length: 0.08 });
      return;
    case "regression":
      tone(ctx, out, at, { type: "sine", from: 660, peak: 0.18, length: 0.07 });
      tone(ctx, out, at + 0.055, { type: "sine", from: 880, peak: 0.16, length: 0.07 });
      tone(ctx, out, at + 0.11, { type: "sine", from: 1320, peak: 0.14, length: 0.1 });
      return;
    case "constant":
      vowel(ctx, out, at);
      return;
    case "delete":
      tone(ctx, out, at, { type: "sine", from: 420, to: 240, peak: 0.3, length: 0.06 });
      return;
    case "enter":
      tone(ctx, out, at, { type: "sine", from: 620, peak: 0.2, length: 0.06 });
      tone(ctx, out, at + 0.05, { type: "sine", from: 930, peak: 0.18, length: 0.09 });
      return;
  }
}

/** Forgets the audio context and the stored choice's cache (tests only). */
export function resetKeySoundsForTest(): void {
  enabled = null;
  context = null;
  master = null;
  lastAt = 0;
  listeners.clear();
}
