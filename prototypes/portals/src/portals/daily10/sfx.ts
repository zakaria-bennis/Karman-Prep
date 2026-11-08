import { S, N, ac, build, coin, noise, tone } from "./synth";

/**
 * The Daily 10 end screen's sound set, ported from prototypes/daily10-end/core.js
 * (the round-one set): soft sine tones in C major, one sound per real moment and
 * nine of them, no taps, ticks, whooshes or typing. The payout is a coin cascade
 * synthesised in code, never a shipped sample. Sound is off until the student
 * turns it on, and reduced motion leaves it alone. Every call can be logged and
 * re-rendered offline (renderLog, renderWav), so earshot can measure the mix.
 */
export type SfxName =
  | "pop"
  | "thud"
  | "chime"
  | "score"
  | "levelUp"
  | "drain"
  | "open"
  | "companion"
  | "tokens";
export type LogEntry = [at: number, name: SfxName, args: number[]];

const KEY = "karman-daily10-sound";
try {
  S.muted = localStorage.getItem(KEY) !== "on";
} catch {
  S.muted = true;
}
export const isMuted = () => S.muted;
export function setMuted(v: boolean) {
  S.muted = v;
  try {
    localStorage.setItem(KEY, v ? "off" : "on");
  } catch {
    /* storage can be off */
  }
  if (!v) unlock();
}
/** Create the context on a gesture, so the first sound is not swallowed. */
export function unlock() {
  try {
    ac();
  } catch {
    /* no audio on this device */
  }
}

// every voice takes its start offset first; all notes sit in C major
const RAW: Record<SfxName, (...a: number[]) => void> = {
  pop: (t = 0) =>
    tone(N(76), t, 0.06, 0.25, "triangle", [
      [1, 1],
      [2, 0.3],
    ]),
  thud: (t = 0) =>
    tone(N(43), t, 0.12, 0.35, "sine", [
      [1, 1],
      [1.5, 0.3],
    ]),
  chime: (t = 0) => {
    [
      [84, 0],
      [88, 0.09],
      [91, 0.18],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.06));
  },
  score: (t = 0) => {
    [
      [72, 0],
      [76, 0.1],
      [79, 0.2],
      [84, 0.32],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.075));
    tone(N(60), t + 0.32, 0.045, 1.6);
  },
  levelUp: (t = 0) => {
    [
      [67, 0],
      [72, 0.11],
      [76, 0.22],
      [79, 0.33],
      [84, 0.5],
      [88, 0.5],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.07, 1.4));
    tone(N(48), t + 0.5, 0.05, 2);
  },
  drain: (t = 0) => {
    [
      [74, 0],
      [71, 0.14],
      [67, 0.28],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.04, 0.7));
  },
  open: (t = 0) => {
    noise(t, 0.6, 0.045, 500, 4000, 0.6);
    [
      [84, 0.15],
      [88, 0.24],
      [91, 0.33],
      [96, 0.42],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.06, 1.3));
  },
  // a new companion: one warm rising chord
  companion: (t = 0) => {
    [
      [72, 0],
      [79, 0.12],
      [84, 0.24],
      [88, 0.36],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.06, 1.5));
    tone(N(55), t + 0.36, 0.04, 1.8);
  },
  // the payout, after a pool game's coin shower: bright small coins (5.6 to 8.5 kHz, rings up to
  // 19 kHz) pour onto a pile, one cluster per token landing, louder as it fills, with little jingles
  // between; then one burst as the count lands, a weight under it, and one coin left ringing (E8)
  tokens: (t = 0, n = 14, gap = 0.05) => {
    let seed = 11;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const hz = () => 5600 * Math.pow(2, r() * 0.6);
    const span = n * gap;
    for (let i = 0; i < n; i++) {
      const at = t + i * gap;
      const lvl = 0.03 + 0.02 * (i / Math.max(1, n - 1));
      const m = 2 + Math.floor(r() * 3);
      for (let j = 0; j < m; j++)
        coin(
          at + j * (0.006 + r() * 0.016),
          hz(),
          lvl * (j ? 0.5 + r() * 0.3 : 1),
          0.035 + r() * 0.06
        );
    }
    for (let x = t + 0.01; x < t + span + 0.05; x += 0.008 + r() * 0.012)
      coin(x, hz() * 1.08, 0.009 + r() * 0.009, 0.025);
    const end = t + span + 0.02;
    for (let j = 0; j < 10; j++)
      coin(end + j * (0.006 + r() * 0.008), hz(), 0.052 * (1 - j * 0.05), 0.08 + r() * 0.1);
    tone(N(43), end, 0.016, 0.18, "sine", [
      [1, 1],
      [2.02, 0.35],
    ]);
    coin(end + 0.05, N(112), 0.04, 0.75);
    [0.2, 0.31, 0.47].forEach((d, i) => coin(end + d, hz(), 0.016 / (i + 1), 0.1));
  },
};

// logging, so a run can be replayed into an offline render and measured
let LOG: LogEntry[] | null = null;
let T0 = 0;
export const SFX = Object.fromEntries(
  (Object.keys(RAW) as SfxName[]).map((k) => [
    k,
    (...args: number[]) => {
      if (LOG && !S.muted) LOG.push([(performance.now() - T0) / 1000, k, args]);
      try {
        RAW[k](...args);
      } catch {
        /* audio unavailable */
      }
    },
  ])
) as Record<SfxName, (...args: number[]) => void>;
export function logStart() {
  LOG = [];
  T0 = performance.now();
}
export function logStop(): LogEntry[] {
  const l = LOG ?? [];
  LOG = null;
  return l;
}
/** The nine moments in the order the end screen plays them, for a measurement with no gesture. */
export const DEMO_LOG: LogEntry[] = [
  [0, "companion", []],
  [2.4, "thud", []],
  [3.8, "open", []],
  [4.9, "chime", []],
  [6.4, "pop", []],
  [7.6, "tokens", [0, 14, 0.05]],
  [9.8, "score", []],
  [11.4, "levelUp", []],
  [13.2, "drain", []],
];
export async function renderLog(log: LogEntry[], seconds: number): Promise<AudioBuffer> {
  const sr = 44100;
  const off = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  const keep = { AC: S.AC, nodes: S.nodes, muted: S.muted };
  S.AC = off;
  S.muted = false;
  build(off);
  log.forEach(([at, k, args]) => {
    S.OFFSET = at;
    const a = args.slice();
    a[0] = a[0] || 0;
    RAW[k](...a);
  });
  S.OFFSET = 0;
  const buf = await off.startRendering();
  S.AC = keep.AC;
  S.nodes = keep.nodes;
  S.muted = keep.muted;
  return buf;
}
/** 16-bit PCM WAV bytes of a rendered buffer, for a file earshot can read. */
export function toWav(buf: AudioBuffer): ArrayBuffer {
  const ch = buf.numberOfChannels;
  const n = buf.length;
  const out = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(out);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * ch * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, ch, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * ch * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  return out;
}
export async function renderWav(log = DEMO_LOG, seconds = 15): Promise<ArrayBuffer> {
  return toWav(await renderLog(log, seconds));
}
