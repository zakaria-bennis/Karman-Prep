"use client";
// The small sounds of Karman's tails growing (TailsStage.tsx), made in the browser (Web Audio): a low
// shimmer as the change gathers, and a swish of air for each tail that sweeps out. Quiet under
// everything else, and silent where the browser has no sound.
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
