// Small sounds for the Library, made in the browser (Web Audio): no sound files. A browser only lets a
// page make sound after the visitor has pressed something, so the first hovers are silent.
// Vibration works on Android phones; an iPhone's browser ignores it.

let ctx: AudioContext | null = null;
let on = true;
/* how loud every sound is, 0 to 1 (Settings: Sounds, volume) */
let level = 1;
let master: GainNode | null = null;

export const setSound = (value: boolean) => {
  on = value;
};

/* which kinds of sound play while sounds are on (Settings: Sounds and music) */
const kinds = { keys: true, rewards: true };
export const setSoundKinds = (next: { keys: boolean; rewards: boolean }) => {
  kinds.keys = next.keys;
  kinds.rewards = next.rewards;
};

export const setSoundVolume = (percent: number) => {
  level = (Math.max(0, Math.min(100, percent)) / 70) ** 2;
  if (master) master.gain.value = level;
};

/** Where every sound goes: one gain before the speakers, so the volume is one number. */
function speakers(a: AudioContext): AudioNode {
  if (!master) {
    master = a.createGain();
    master.connect(a.destination);
  }
  master.gain.value = level;
  return master;
}

function audio(): AudioContext | null {
  if (!on || typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx.state === "running" ? ctx : null;
  } catch {
    return null;
  }
}

/** One soft bell: a sine and two quieter overtones that die away. */
function bell(freq: number, wait = 0, loud = 0.07, long = 1.1) {
  const a = audio();
  if (!a) return;
  const at = a.currentTime + wait;
  [1, 2.01, 3.02].forEach((mult, i) => {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(loud / (i + 1) ** 2, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + long / (i + 1));
    osc.connect(gain).connect(speakers(a));
    osc.start(at);
    osc.stop(at + long);
  });
}

/** A burst of hiss through a filter: paper when high and short, air when swept. */
function hiss(from: number, to: number, long: number, loud: number) {
  const a = audio();
  if (!a) return;
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * long), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(from, a.currentTime);
  filter.frequency.exponentialRampToValueAtTime(to, a.currentTime + long);
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(loud, a.currentTime + long * 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + long);
  src.connect(filter).connect(gain).connect(speakers(a));
  src.start();
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

export const tick = () => kinds.keys && bell(1046.5, 0, 0.035, 0.18);
export const rustle = () => hiss(2600, 4200, 0.16, 0.05);
export const ping = () => kinds.rewards && bell(1318.5, 0, 0.04, 0.6);
export const whoosh = () => hiss(300, 3200, 0.6, 0.07);
/** Chosen: three rising notes. */
export const chosen = () =>
  kinds.rewards && [0, 2, 4].forEach((n, i) => bell(SCALE[n], i * 0.09, 0.07, 1.4));
/** A constellation lighting up: one quiet note for each lit star, six at most. */
export const constellation = (lit: number) =>
  Array.from({ length: Math.min(6, lit) }).forEach((_, i) =>
    bell(SCALE[i + 1], 0.25 + i * 0.07, 0.03, 0.9)
  );
export const buzz = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported: nothing to do */
  }
};
