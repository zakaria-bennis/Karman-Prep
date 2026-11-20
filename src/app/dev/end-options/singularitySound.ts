// The singularity's sound, made in the browser (Web Audio), timed to its picture
// (introSingularity.ts). It plays on any audio context, so the same sound can be rendered offline
// for a video.
//   0.00 to 1.95  the pull: a deep rumble that rises, a sucking whine climbing in pitch, and a swell
//                 of air at the end, like a breath drawn in
//   1.95          everything stops at once: the hole has swallowed it
//   2.02          one tiny high ping in the silence
//   2.10          the explosion: a deep boom with weight, a crack of air, a long airy tail, then a
//                 bright chord and sparkles of glass as the ending appears
export const PULL = 1.95;
export const BOOM = 2.1;

function noise(ctx: BaseAudioContext, seconds: number, brown = false) {
  const n = Math.round(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = white;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

/** A room for it all to ring in: a short burst of fading noise as its echo. */
function room(ctx: BaseAudioContext, seconds = 2.4) {
  const n = Math.round(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Plays the whole sound on `ctx`, starting at `at` (its own clock). */
export function singularitySound(ctx: BaseAudioContext, at = ctx.currentTime) {
  const out = ctx.createDynamicsCompressor();
  out.threshold.value = -14;
  out.ratio.value = 4;
  // the whole of it a little under full scale, so the boom never clips
  const master = ctx.createGain();
  master.gain.value = 0.5;
  out.connect(master).connect(ctx.destination);
  const dry = ctx.createGain();
  dry.gain.value = 0.9;
  dry.connect(out);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  const echo = room(ctx);
  echo.connect(wet).connect(out);
  const send = (node: AudioNode, amount = 1) => {
    node.connect(dry);
    if (amount > 0) {
      const g = ctx.createGain();
      g.gain.value = amount;
      node.connect(g).connect(echo);
    }
  };
  const cut = at + PULL;

  // the pull: a deep rumble, opening up as it grows
  const rumble = noise(ctx, PULL + 0.1, true);
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.setValueAtTime(70, at);
  low.frequency.exponentialRampToValueAtTime(900, cut);
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0.0001, at);
  rg.gain.exponentialRampToValueAtTime(0.7, cut - 0.05);
  rg.gain.setValueAtTime(0.7, cut - 0.015);
  rg.gain.linearRampToValueAtTime(0, cut);
  rumble.connect(low).connect(rg);
  send(rg, 0.2);
  rumble.start(at);
  rumble.stop(cut + 0.05);

  // a sub tone sliding up underneath
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(34, at);
  sub.frequency.exponentialRampToValueAtTime(96, cut);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, at);
  sg.gain.exponentialRampToValueAtTime(0.5, cut - 0.05);
  sg.gain.linearRampToValueAtTime(0, cut);
  sub.connect(sg);
  send(sg, 0);
  sub.start(at);
  sub.stop(cut + 0.05);

  // the whine of it being sucked in, two voices a little apart, climbing
  [0, 7].forEach((detune) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.detune.value = detune * 3;
    o.frequency.setValueAtTime(160, at);
    o.frequency.exponentialRampToValueAtTime(1700, cut);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.045, cut - 0.05);
    g.gain.linearRampToValueAtTime(0, cut);
    o.connect(g);
    send(g, 0.5);
    o.start(at);
    o.stop(cut + 0.05);
  });

  // a breath drawn in: bright air swelling into the cut
  const air = noise(ctx, 0.9);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(1800, cut - 0.8);
  hp.frequency.exponentialRampToValueAtTime(6000, cut);
  const ag = ctx.createGain();
  ag.gain.setValueAtTime(0.0001, cut - 0.8);
  ag.gain.exponentialRampToValueAtTime(0.28, cut - 0.02);
  ag.gain.linearRampToValueAtTime(0, cut);
  air.connect(hp).connect(ag);
  send(ag, 0.3);
  air.start(cut - 0.8);
  air.stop(cut + 0.05);

  // a single ping in the silence
  const ping = ctx.createOscillator();
  ping.type = "sine";
  ping.frequency.value = 2637;
  const pg = ctx.createGain();
  pg.gain.setValueAtTime(0.0001, at + 2.02);
  pg.gain.exponentialRampToValueAtTime(0.05, at + 2.025);
  pg.gain.exponentialRampToValueAtTime(0.0001, at + 2.09);
  ping.connect(pg);
  send(pg, 0.8);
  ping.start(at + 2.0);
  ping.stop(at + 2.12);

  const boom = at + BOOM;
  // the boom: a deep drop with weight, rounded off so it thumps rather than clicks
  const kick = ctx.createOscillator();
  kick.type = "sine";
  kick.frequency.setValueAtTime(150, boom);
  kick.frequency.exponentialRampToValueAtTime(36, boom + 0.55);
  const shape = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    curve[i] = Math.tanh(2.2 * x);
  }
  shape.curve = curve;
  const kg = ctx.createGain();
  kg.gain.setValueAtTime(0.0001, boom);
  kg.gain.exponentialRampToValueAtTime(0.95, boom + 0.008);
  kg.gain.exponentialRampToValueAtTime(0.0001, boom + 1.6);
  kick.connect(shape).connect(kg);
  send(kg, 0.25);
  kick.start(boom);
  kick.stop(boom + 1.7);

  // a crack of air, darkening as it fades
  const crackle = noise(ctx, 1.4);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(7000, boom);
  lp.frequency.exponentialRampToValueAtTime(260, boom + 1.2);
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.0001, boom);
  cg.gain.exponentialRampToValueAtTime(0.55, boom + 0.006);
  cg.gain.exponentialRampToValueAtTime(0.0001, boom + 1.3);
  crackle.connect(lp).connect(cg);
  send(cg, 0.5);
  crackle.start(boom);
  crackle.stop(boom + 1.4);

  // a bright chord as the ending arrives, each note doubled a little apart so it shimmers
  [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => {
    [-6, 6].forEach((detune) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = detune;
      const g = ctx.createGain();
      const start = boom + 0.08 + i * 0.035;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.06, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 2.6);
      o.connect(g);
      send(g, 1);
      o.start(start);
      o.stop(start + 2.7);
    });
  });

  // sparkles of glass falling away
  for (let i = 0; i < 22; i++) {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 3000 + Math.random() * 4200;
    const g = ctx.createGain();
    const start = boom + 0.12 + Math.pow(Math.random(), 1.6) * 1.3;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.045, start + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    o.connect(g);
    send(g, 1);
    o.start(start);
    o.stop(start + 0.16);
  }
}

/** Plays it now, in the page, if the browser can. */
export function playSingularity() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    singularitySound(ctx);
    window.setTimeout(() => void ctx.close(), 6000);
  } catch {
    /* no sound where the browser has none */
  }
}
