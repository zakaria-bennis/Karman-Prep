/*
 * The Karman theme: soft background music for the signed-in portals, made in code with the
 * Web Audio API (no audio files). A slow Dmaj7 - Bm7 - Gmaj7 - A(add9) progression on warm
 * triangle pads, a sine bass, and a sparse D major pentatonic pluck with a feedback echo, all
 * through a gentle low-pass filter at a very low master volume.
 *
 * Off by default. The student turns it on with the Background music switch (a user gesture,
 * which browsers need before an AudioContext may sound). The choice is remembered on this device
 * under MUSIC_KEY; changes are broadcast on window as MUSIC_EVENT with `detail` "on" or "off".
 *
 * Scheduling: a lookahead timer (every 200 ms) queues the notes of the next second on the audio
 * clock, looping the score forever. Nothing touches `window` at import, so it is SSR-safe.
 */

/** localStorage key: "on" plays the theme, anything else (or nothing) keeps it off. */
export const MUSIC_KEY = "karman-music";
/** Fired on window when the student changes the choice, with `detail` "on" or "off". */
export const MUSIC_EVENT = "karman-music-change";

/* ---------- Preference ---------- */

export function readThemeMusicPref(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) === "on";
  } catch {
    return false;
  }
}

export function setThemeMusicPref(on: boolean): void {
  try {
    localStorage.setItem(MUSIC_KEY, on ? "on" : "off");
  } catch {
    /* Storage blocked: the choice lasts for this page only. */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MUSIC_EVENT, { detail: on ? "on" : "off" }));
  }
}

/* ---------- Score (pure, deterministic) ---------- */

export type Voice = "pad" | "bass" | "pluck";

export interface NoteEvent {
  /** Start, in seconds from the start of the loop. */
  at: number;
  /** Length, in seconds (pads overlap the next chord slightly so changes stay smooth). */
  dur: number;
  freq: number;
  voice: Voice;
  /** Relative level, 0 to 1, before the master volume. */
  gain: number;
}

export const BPM = 66;
const BEAT = 60 / BPM;
const BEATS_PER_CHORD = 4;
/** Two passes of the four chords, with a different melody on the second pass. */
const PASSES = 2;

// MIDI note numbers. Voicings keep common tones so the pads glide from chord to chord.
const CHORDS: { pad: number[]; bass: number }[] = [
  { pad: [50, 54, 57, 61], bass: 38 }, // Dmaj7
  { pad: [50, 54, 57, 59], bass: 35 }, // Bm7
  { pad: [50, 54, 55, 59], bass: 43 }, // Gmaj7
  { pad: [49, 52, 57, 59], bass: 45 }, // A add9
];

// [beat within the pass, MIDI note], D major pentatonic (D E F# A B), sparse on purpose.
const MELODIES: [number, number][][] = [
  [
    [0.5, 78],
    [2, 81],
    [3.5, 76],
    [4.5, 74],
    [6, 71],
    [8.5, 78],
    [10, 83],
    [11, 81],
    [12.5, 76],
    [14, 69],
  ],
  [
    [1, 74],
    [2.5, 76],
    [4, 78],
    [6.5, 74],
    [8, 71],
    [9.5, 74],
    [11, 78],
    [13, 76],
    [14.5, 74],
  ],
];

export const LOOP_SECONDS = PASSES * CHORDS.length * BEATS_PER_CHORD * BEAT;

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Every note of one loop, sorted by start time. The same call always returns the same score. */
export function themeScore(): NoteEvent[] {
  const events: NoteEvent[] = [];
  const passBeats = CHORDS.length * BEATS_PER_CHORD;
  for (let pass = 0; pass < PASSES; pass++) {
    const passStart = pass * passBeats * BEAT;
    CHORDS.forEach((chord, i) => {
      const at = passStart + i * BEATS_PER_CHORD * BEAT;
      const len = BEATS_PER_CHORD * BEAT;
      for (const n of chord.pad) {
        events.push({ at, dur: len + 1.2, freq: midiToFreq(n), voice: "pad", gain: 0.16 });
      }
      events.push({ at, dur: len + 0.4, freq: midiToFreq(chord.bass), voice: "bass", gain: 0.3 });
    });
    for (const [beat, n] of MELODIES[pass]) {
      events.push({
        at: passStart + beat * BEAT,
        dur: 1.6,
        freq: midiToFreq(n),
        voice: "pluck",
        gain: 0.22,
      });
    }
  }
  return events.sort((a, b) => a.at - b.at);
}

/* ---------- Engine ---------- */

const MASTER = 0.07;
const FADE = 2;
const LOOKAHEAD = 1;
const TICK_MS = 200;

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  bus: BiquadFilterNode;
  echo: GainNode;
  score: NoteEvent[];
  loopStart: number;
  next: number;
  timer: ReturnType<typeof setInterval> | null;
  stopTimer: ReturnType<typeof setTimeout> | null;
}

let engine: Engine | null = null;
let playing = false;
let paused = false;

/** Whether the theme is playing (or fading in), as opposed to the stored choice. */
export function isThemeMusicOn(): boolean {
  return playing;
}

function build(): Engine | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const bus = ctx.createBiquadFilter();
  bus.type = "lowpass";
  bus.frequency.value = 1600;
  bus.Q.value = 0.5;
  bus.connect(master);

  // Feedback echo for the pluck: send -> delay <-> feedback, darkened on each repeat.
  const echo = ctx.createGain();
  echo.gain.value = 0.45;
  const delay = ctx.createDelay(2);
  delay.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1200;
  echo.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(bus);

  return {
    ctx,
    master,
    bus,
    echo,
    score: themeScore(),
    loopStart: 0,
    next: 0,
    timer: null,
    stopTimer: null,
  };
}

function playNote(e: Engine, n: NoteEvent, when: number): void {
  const { ctx } = e;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = n.voice === "pad" ? "triangle" : "sine";
  osc.frequency.value = n.freq;
  if (n.voice === "pad") osc.detune.value = (n.freq % 7) - 3; // a touch of warmth, no chorus

  const attack = n.voice === "pad" ? 1.5 : n.voice === "bass" ? 0.6 : 0.01;
  const end = when + n.dur;
  const g = env.gain;
  g.setValueAtTime(0, when);
  g.linearRampToValueAtTime(n.gain, when + attack);
  if (n.voice === "pluck") {
    g.exponentialRampToValueAtTime(0.0001, end);
  } else {
    g.setValueAtTime(n.gain, Math.max(when + attack, end - 1.2));
    g.linearRampToValueAtTime(0, end);
  }

  osc.connect(env);
  env.connect(e.bus);
  if (n.voice === "pluck") env.connect(e.echo);
  osc.start(when);
  osc.stop(end + 0.05);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
  };
}

function tick(e: Engine): void {
  const horizon = e.ctx.currentTime + LOOKAHEAD;
  for (;;) {
    if (e.next >= e.score.length) {
      e.next = 0;
      e.loopStart += LOOP_SECONDS;
    }
    const n = e.score[e.next];
    const when = e.loopStart + n.at;
    if (when >= horizon) break;
    if (when >= e.ctx.currentTime - 0.05) playNote(e, n, Math.max(when, e.ctx.currentTime));
    e.next++;
  }
}

function fadeTo(e: Engine, value: number, seconds: number): void {
  const g = e.master.gain;
  const now = e.ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(value, now + seconds);
}

/** Start (or keep) the theme with a 2 s fade in. Call from a user gesture the first time. */
export function startThemeMusic(): void {
  if (!engine) engine = build();
  const e = engine;
  if (!e) return;
  if (e.stopTimer) {
    clearTimeout(e.stopTimer);
    e.stopTimer = null;
  }
  void e.ctx.resume().catch(() => {});
  if (!e.timer) {
    e.loopStart = e.ctx.currentTime + 0.1;
    e.next = 0;
    tick(e);
    e.timer = setInterval(() => tick(e), TICK_MS);
  }
  playing = true;
  paused = false;
  fadeTo(e, MASTER, FADE);
}

/** Fade the theme out over 2 s, then stop scheduling and let the audio device sleep. */
export function stopThemeMusic(): void {
  playing = false;
  paused = false;
  const e = engine;
  if (!e) return;
  fadeTo(e, 0, FADE);
  if (e.stopTimer) clearTimeout(e.stopTimer);
  e.stopTimer = setTimeout(
    () => {
      e.stopTimer = null;
      if (playing) return;
      if (e.timer) clearInterval(e.timer);
      e.timer = null;
      void e.ctx.suspend().catch(() => {});
    },
    FADE * 1000 + 100
  );
}

/** Quietly hold the theme while the tab is hidden. */
export function pauseThemeMusic(): void {
  const e = engine;
  if (!e || !playing || paused) return;
  paused = true;
  fadeTo(e, 0, 0.3);
  setTimeout(() => {
    if (paused) void e.ctx.suspend().catch(() => {});
  }, 350);
}

/** Pick the theme back up when the tab is visible again. */
export function resumeThemeMusic(): void {
  const e = engine;
  if (!e || !playing || !paused) return;
  paused = false;
  void e.ctx.resume().catch(() => {});
  fadeTo(e, MASTER, FADE);
}
