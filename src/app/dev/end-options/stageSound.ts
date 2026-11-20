"use client";
// The small sounds of a skill's stage changing, made in the browser (Web Audio): a soft chime for
// each star that lights, rising up a pentatonic scale; a swish of air for each tail that sweeps out;
// a low shimmer as the change gathers; and a warm chord when it is complete, fuller for a bigger
// step. Quiet under everything else, and silent where the browser has no sound.
let shared: AudioContext | null = null;
function ctx() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    shared ??= new Ctx();
    if (shared.state === "suspended") void shared.resume();
    return shared;
  } catch {
    return null;
  }
}

/** A short echo, so each note rings a little in the air. */
function out(c: AudioContext, gain: number) {
  const g = c.createGain();
  g.gain.value = gain;
  const delay = c.createDelay();
  delay.delayTime.value = 0.13;
  const feed = c.createGain();
  feed.gain.value = 0.32;
  const tone = c.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3800;
  g.connect(c.destination);
  g.connect(delay).connect(tone).connect(feed).connect(delay);
  feed.connect(c.destination);
  return g;
}

// C major pentatonic, from C6 up
const SCALE = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637, 3136, 3520];

function bell(c: AudioContext, f: number, at: number, gain: number, ring = 1.2) {
  const dest = out(c, 1);
  [1, 2.01, 3.02].forEach((m, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f * m;
    const g = c.createGain();
    const peak = gain / (1 + i * 2.4);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + ring / (1 + i));
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(at + ring + 0.1);
  });
}

/** A star lights: the `n`th note up the scale. */
export function chime(n: number) {
  const c = ctx();
  if (!c) return;
  bell(c, SCALE[Math.min(SCALE.length - 1, n)], c.currentTime + 0.01, 0.07);
}

/** A tail sweeps out: a soft rush of air, rising. */
export function swish(n = 0) {
  const c = ctx();
  if (!c) return;
  const at = c.currentTime + 0.01;
  const len = 0.32;
  const buf = c.createBuffer(1, Math.round(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(600 + n * 90, at);
  band.frequency.exponentialRampToValueAtTime(2600 + n * 200, at + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.16, at + len * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(band).connect(g).connect(out(c, 1));
  src.start(at);
  src.stop(at + len);
}

/** The change gathering: a low shimmer that swells for `seconds`. */
export function gather(seconds: number) {
  const c = ctx();
  if (!c) return;
  const at = c.currentTime + 0.01;
  const dest = out(c, 1);
  [220, 330.2, 440.5].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, at);
    o.frequency.exponentialRampToValueAtTime(f * 1.5, at + seconds);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.03 / (1 + i), at + seconds * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, at + seconds + 0.05);
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(at + seconds + 0.1);
  });
}

/** It is complete: a warm chord, one note for Learning, three for Understanding, five for
 *  Proficient, each a little after the last. */
export function arrive(step: number) {
  const c = ctx();
  if (!c) return;
  const at = c.currentTime + 0.01;
  const notes = [523.25, 659.25, 784, 1046.5, 1318.5].slice(0, step === 3 ? 5 : step === 2 ? 3 : 2);
  notes.forEach((f, i) => bell(c, f, at + i * 0.07, 0.08, 2.2));
}
