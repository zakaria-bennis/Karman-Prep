// Night music, made in the browser (Web Audio): no recordings. These four are stand-ins so the
// setting can be heard and judged (founder, 2026-11-18: "automatically generate some music for right
// now as placeholders"); the pieces students get will be chosen by him.
import type { Track } from "./settingsStore";

export const TRACK_NAMES: Record<Track, string> = {
  piano: "Slow piano",
  strings: "Soft strings",
  rain: "Rain",
  musicbox: "Music box",
};

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let timer: number | null = null;
let playing: Track | null = null;
let held: AudioNode[] = [];

const PENTATONIC = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];

function note(freq: number, at: number, long: number, loud: number, type: OscillatorType) {
  if (!ctx || !out) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(loud, at + (type === "sine" ? 0.02 : long * 0.4));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + long);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + long + 0.05);
}

function rain() {
  if (!ctx || !out) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    data[i] = last * 6 + (Math.random() * 2 - 1) * 0.04;
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  src.buffer = buffer;
  src.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  src.connect(filter).connect(out);
  src.start();
  held = [src, filter];
}

/** One step of a piece: a note or two, chosen so nothing repeats exactly. */
function step(track: Track) {
  if (!ctx) return;
  const at = ctx.currentTime + 0.05;
  const pick = () => PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
  if (track === "piano") {
    note(pick() / 2, at, 3.2, 0.16, "sine");
    if (Math.random() < 0.6) note(pick(), at + 0.7, 2.6, 0.1, "sine");
  } else if (track === "strings") {
    const root = PENTATONIC[Math.floor(Math.random() * 4)] / 2;
    [1, 1.5, 2].forEach((mult) => note(root * mult, at, 5.6, 0.05, "triangle"));
  } else if (track === "musicbox") {
    note(pick() * 2, at, 1.4, 0.08, "sine");
    if (Math.random() < 0.5) note(pick() * 2, at + 0.3, 1.2, 0.06, "sine");
  }
}

const PACE: Record<Track, number> = { piano: 1900, strings: 4200, rain: 0, musicbox: 620 };

export function stopMusic() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  held.forEach((node) => node.disconnect());
  held = [];
  playing = null;
}

/** Plays a piece until stopped. A browser lets a page make sound only after a press, so call this
 *  from one. */
export function playMusic(track: Track, volume: number) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    return;
  }
  if (!out) {
    out = ctx.createGain();
    out.connect(ctx.destination);
  }
  setMusicVolume(volume);
  if (playing === track) return;
  stopMusic();
  playing = track;
  if (track === "rain") rain();
  else {
    step(track);
    timer = window.setInterval(() => step(track), PACE[track]);
  }
}

export function setMusicVolume(volume: number) {
  if (ctx && out) out.gain.setTargetAtTime((volume / 100) ** 2, ctx.currentTime, 0.08);
}

export const musicPlaying = () => playing;
