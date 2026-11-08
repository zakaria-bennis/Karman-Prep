/**
 * The synth under the Daily 10 sounds, ported from prototypes/daily10-end/core.js:
 * one bus through a soft top roll-off and a gentle limiter, a bright bus for the
 * coins (their rings reach 17 kHz, so they skip the roll-off), a seeded 2.2 s
 * reverb, a 12 ms click, and three voices: a sine tone with two partials, a
 * swept noise, and one coin. The shared state lives in `S` so the offline render
 * can swap the context in and out.
 */
export type Ctx = AudioContext | OfflineAudioContext;
type Partials = [number, number][];
interface Nodes {
  bus: GainNode;
  bright: GainNode;
  rev: ConvolverNode;
  click: AudioBuffer;
}

export const S = {
  AC: null as Ctx | null,
  nodes: null as Nodes | null,
  OFFSET: 0,
  muted: true,
};

// limiter and a soft top roll-off so stacked sounds never get sharp or loud
export function build(a: Ctx) {
  const lim = a.createDynamicsCompressor();
  lim.threshold.value = -18;
  lim.knee.value = 12;
  lim.ratio.value = 6;
  lim.attack.value = 0.004;
  lim.release.value = 0.25;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 7000;
  lp.Q.value = 0.5;
  const bus = a.createGain();
  bus.gain.value = 0.8;
  bus.connect(lp).connect(lim).connect(a.destination);
  const bright = a.createGain();
  bright.gain.value = 0.62;
  bright.connect(lim);
  const n = Math.ceil(a.sampleRate * 0.012);
  const click = a.createBuffer(1, n, a.sampleRate);
  const cd = click.getChannelData(0);
  let sd = 5;
  for (let i = 0; i < n; i++)
    cd[i] = (((sd = (sd * 16807) % 2147483647) / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 2);
  const len = Math.floor(a.sampleRate * 2.2);
  const b = a.createBuffer(2, len, a.sampleRate);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 3);
  }
  const rev = a.createConvolver();
  rev.buffer = b;
  const wet = a.createGain();
  wet.gain.value = 0.22;
  rev.connect(wet).connect(bus);
  S.nodes = { bus, bright, rev, click };
}

export function ac(): Ctx {
  if (!S.AC) {
    S.AC = new AudioContext();
    build(S.AC);
  }
  if (S.AC instanceof AudioContext && S.AC.state === "suspended") void S.AC.resume();
  return S.AC;
}
export const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function tone(
  f: number,
  t = 0,
  v = 0.08,
  dec = 1.1,
  type: OscillatorType = "sine",
  partials: Partials = [
    [1, 1],
    [2.76, 0.25],
    [5.4, 0.07],
  ]
) {
  if (S.muted) return;
  const a = ac();
  const { bus, rev } = S.nodes!;
  const s = a.currentTime + S.OFFSET + t;
  partials.forEach(([m, g]) => {
    const o = a.createOscillator();
    const n = a.createGain();
    o.type = type;
    o.frequency.value = f * m;
    n.gain.setValueAtTime(0, s);
    n.gain.linearRampToValueAtTime(v * g, s + 0.006);
    n.gain.exponentialRampToValueAtTime(0.0001, s + dec * (m > 1 ? 0.5 : 1));
    o.connect(n);
    n.connect(bus);
    n.connect(rev);
    o.start(s);
    o.stop(s + dec + 0.1);
  });
}

export function noise(t = 0, dur = 0.35, v = 0.08, f0 = 400, f1 = 3000, q = 0.8) {
  if (S.muted) return;
  const a = ac();
  const { bus } = S.nodes!;
  const s = a.currentTime + S.OFFSET + t;
  const len = Math.ceil(a.sampleRate * dur);
  const b = a.createBuffer(1, len, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  const bp = a.createBiquadFilter();
  const g = a.createGain();
  src.buffer = b;
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, s);
  bp.frequency.exponentialRampToValueAtTime(f1, s + dur);
  g.gain.setValueAtTime(0, s);
  g.gain.linearRampToValueAtTime(v, s + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  src.connect(bp).connect(g).connect(bus);
  src.start(s);
  src.stop(s + dur + 0.05);
}

// one coin: a very short bright strike, then a small coin's uneven overtones ringing out
export function coin(t: number, f: number, v: number, ring: number) {
  if (S.muted) return;
  const a = ac();
  const { bright, rev, click } = S.nodes!;
  const s = a.currentTime + S.OFFSET + t;
  const src = a.createBufferSource();
  const hp = a.createBiquadFilter();
  const g = a.createGain();
  src.buffer = click;
  hp.type = "highpass";
  hp.frequency.value = 8000;
  g.gain.value = v * 4.6;
  src.connect(hp).connect(g).connect(bright);
  src.start(s);
  const overtones: [number, number, number][] = [
    [0.45, 0.16, 0.6],
    [1, 1, 1],
    [1.47, 0.75, 0.7],
    [2.09, 0.6, 0.5],
    [2.76, 0.4, 0.35],
  ];
  overtones.forEach(([m, gn, dk]) => {
    if (f * m > 19000) return;
    const o = a.createOscillator();
    const n = a.createGain();
    o.frequency.value = f * m;
    n.gain.setValueAtTime(0, s);
    n.gain.linearRampToValueAtTime(v * gn, s + 0.002);
    n.gain.exponentialRampToValueAtTime(0.0001, s + ring * dk);
    o.connect(n);
    n.connect(bright);
    if (m === 1) n.connect(rev);
    o.start(s);
    o.stop(s + ring + 0.05);
  });
}
