/*
 * Life in Karman's paintings once they are finished: birds crossing the sky, light glinting on
 * water, rings where a fish rose, smoke from the cabin chimney, a waterfall that falls, surf that
 * rolls in, leaves drifting down, butterflies over the flowers, mist sliding along the valley,
 * and at night, twinkling stars and fireflies. Each scene lists what lives in it.
 * Positions are in picture units (0 to 1 across and down the painting).
 */
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  /* What lives in each of the ten landscapes, in order. Each kind only appears at fitting hours (WHEN). */
  const SCENES = [
    [["birds", 0.1, 0.42], ["hawk", 0.62, 0.2], ["ducks", 0.3, 0.95, 0.7, 0.86], ["fishJump", 0.3, 0.9, 0.66, 0.85], ["glints", 0.3, 1, 0.63, 0.88], ["rings", 0.3, 0.95, 0.66, 0.86], ["moonpath", 0.8, 0.63, 0.9], ["owl", 0.808, 0.62, 1], ["bats", 0.2, 0.9, 0.1, 0.4], ["shootingStar"], ["fireflies", 0.55, 1, 0.86, 1]],
    [["birds", 0.08, 0.38], ["geese", 0.12, 0.3], ["hawk", 0.5, 0.18], ["swallows", 0.3, 1, 0.6, 0.8], ["deer", 0.25, 0.72, 0.86], ["mist", 0.52, 0.7], ["glints", 0.5, 0.66, 0.7, 1], ["butterflies", 0.3, 0.8, 0.84, 0.98], ["owl", 0.85, 0.64, 1], ["bats", 0.2, 0.9, 0.1, 0.4], ["shootingStar"], ["fireflies", 0.3, 1, 0.84, 1]],
    [["smoke", 0.716, 0.655], ["windowGlow", 0.688, 0.757], ["snow"], ["birds", 0.08, 0.3], ["fox", 0.05, 0.6, 0.9], ["aurora"], ["owl", 0.815, 0.6, 1], ["shootingStar"]],
    [["leaves", 0.8, 0.93, 0.5, 0.75], ["geese", 0.1, 0.3], ["ducks", 0.2, 0.8, 0.68, 0.86], ["fishJump", 0.2, 0.8, 0.66, 0.85], ["glints", 0.2, 1, 0.61, 0.92], ["rings", 0.2, 0.8, 0.64, 0.88], ["birds", 0.1, 0.35], ["moonpath", 0.8, 0.61, 0.92], ["owl", 0.875, 0.6, -1], ["bats", 0.2, 0.9, 0.1, 0.4]],
    [["waves", 0, 0.62, 0.68, 0.87], ["glints", 0, 1, 0.54, 0.68], ["gulls", 0.1, 0.45], ["sailboat", 0.05, 0.55, 0.55], ["moonpath", 0.8, 0.53, 0.86], ["shootingStar"], ["bats", 0.2, 0.7, 0.1, 0.35]],
    [["birds", 0.08, 0.4], ["swallows", 0.2, 1, 0.6, 0.8], ["deer", 0.15, 0.6, 0.86], ["butterflies", 0.3, 1, 0.8, 0.98], ["leaves", 0.7, 0.9, 0.45, 0.7], ["owl", 0.832, 0.5, 1], ["bats", 0.2, 0.9, 0.1, 0.4], ["shootingStar"], ["fireflies", 0, 1, 0.78, 1]],
    [["birds", 0.08, 0.3], ["fall", 0.645, 0.695, 0.36, 0.78], ["spray", 0.67, 0.785], ["glints", 0.3, 1, 0.8, 1], ["mist", 0.45, 0.55], ["heron", 0.36, 0.9], ["owl", 0.56, 0.7, 1], ["bats", 0.2, 0.9, 0.1, 0.35]],
    [["birds", 0.06, 0.3], ["hawk", 0.42, 0.16], ["geese", 0.08, 0.25], ["ducks", 0.25, 0.85, 0.7, 0.86], ["sailboat", 0.15, 0.6, 0.63], ["glints", 0.2, 1, 0.61, 0.9], ["rings", 0.2, 0.9, 0.64, 0.88], ["moonpath", 0.8, 0.61, 0.9], ["shootingStar"]],
    [["birds", 0.1, 0.4], ["heron", 0.6, 0.86], ["dragonflies", 0.3, 0.9, 0.72, 0.9], ["ducks", 0.1, 0.6, 0.68, 0.8], ["glints", 0, 1, 0.64, 0.82], ["butterflies", 0.4, 1, 0.84, 0.98], ["moonpath", 0.8, 0.64, 0.82], ["owl", 0.823, 0.4, -1], ["bats", 0.2, 0.9, 0.1, 0.4], ["fireflies", 0.3, 1, 0.8, 1]],
    [["birds", 0.08, 0.35], ["hawk", 0.55, 0.16], ["deer", 0.55, 0.62, 0.78], ["mist", 0.5, 0.6], ["butterflies", 0.45, 0.75, 0.75, 0.98], ["owl", 0.792, 0.62, -1], ["bats", 0.2, 0.9, 0.1, 0.4], ["shootingStar"], ["fireflies", 0, 1, 0.65, 1]],
  ];
  const WHEN = {
    birds: ["dawn", "day", "sunset"], hawk: ["day", "dawn"], geese: ["dawn", "sunset"], gulls: ["dawn", "day", "sunset"], ducks: ["dawn", "day", "sunset"],
    deer: ["dawn", "sunset", "day"], swallows: ["sunset", "dawn"], sailboat: ["day", "sunset"], heron: ["dawn", "day"], dragonflies: ["day"],
    butterflies: ["dawn", "day", "sunset"], fishJump: ["dawn", "day", "sunset"],
    owl: ["night"], bats: ["sunset", "night"], shootingStar: ["night"], moonpath: ["night"], aurora: ["night"], fox: ["night", "dawn"], fireflies: ["night", "sunset"],
  };
  let state = null;
  /* Dark silhouettes by day, a little lifted by night so they still read against the sky. */
  const mix2 = (ink, end) => ink + end;
  function init(scene, time) {
    const night = time === "night";
    state = { scene, time, items: [], birdsAt: rnd(0.5, 2.5), ringsAt: rnd(1, 3) };
    for (const [kind, ...a] of SCENES[scene] || []) {
      if (WHEN[kind] && !WHEN[kind].includes(time)) continue;
      state.items.push({ kind, a, parts: [], clock: 0 });
    }
    if (night) state.items.push({ kind: "stars", a: [0, 0.42], parts: Array.from({ length: 70 }, () => ({ u: Math.random(), v: Math.random() * 0.42, p: Math.random() * 6.28, s: rnd(0.6, 1.8) })) });
  }
  /* map: picture units to CSS pixels. light: the hour, for colors. */
  function draw(g, dt, t, map, alpha) {
    if (!state) return;
    const { X, Y, S } = map, night = state.time === "night", dusk = state.time === "sunset" || state.time === "dawn";
    const ink = night ? "rgba(220,228,255," : dusk ? "rgba(40,24,30," : "rgba(30,34,40,";
    g.save(); g.globalAlpha = alpha;
    for (const it of state.items) {
      const a = it.a, P = it.parts;
      if (it.kind === "stars") { for (const s of P) { const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.p)); g.fillStyle = `rgba(240,242,255,${tw})`; g.fillRect(X(s.u), Y(s.v), 1.6, 1.6); } }
      if (it.kind === "birds") {
        /* A small flock crosses every so often, flapping, in a loose V. */
        state.birdsAt -= dt;
        if (state.birdsAt <= 0 && P.length < 2) { const dir = Math.random() < 0.5 ? 1 : -1, n = Math.floor(rnd(3, 8)), v = rnd(a[0], a[1]); P.push({ dir, u: dir > 0 ? -0.05 : 1.05, v, speed: rnd(0.035, 0.06), birds: Array.from({ length: n }, (_, i) => ({ du: -dir * (Math.floor((i + 1) / 2)) * 0.018, dv: (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 0.012, ph: Math.random() * 6.28, sz: rnd(0.8, 1.2) })) }); state.birdsAt = rnd(5, 11); }
        for (const f of P) { f.u += f.dir * f.speed * dt; f.v += Math.sin(t * 0.5 + f.speed * 40) * 0.0006; for (const b of f.birds) { const x = X(f.u + b.du), y = Y(f.v + b.dv + Math.sin(t * 1.3 + b.ph) * 0.004), w = 7 * S * b.sz, flap = Math.sin(t * 9 + b.ph) * 0.8; g.strokeStyle = ink + "0.85)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - w, y - w * flap * 0.6); g.quadraticCurveTo(x - w * 0.4, y - w * 0.5, x, y); g.quadraticCurveTo(x + w * 0.4, y - w * 0.5, x + w, y - w * flap * 0.6); g.stroke(); } }
        it.parts = P.filter((f) => f.u > -0.3 && f.u < 1.3);
      }
      if (it.kind === "hawk") {
        /* A hawk circles high on a thermal, tilting as it turns. */
        const ang = t * 0.35, x = X(a[0] + Math.cos(ang) * 0.06), y = Y(a[1] + Math.sin(ang) * 0.025), w = 13 * S, tilt = Math.sin(ang) * 0.4;
        g.save(); g.translate(x, y); g.rotate(tilt); g.strokeStyle = ink + "0.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-w, -2); g.quadraticCurveTo(-w * 0.4, -w * 0.25, 0, 0); g.quadraticCurveTo(w * 0.4, -w * 0.25, w, -2); g.stroke(); g.restore();
      }
      if (it.kind === "geese") {
        /* A V of geese, slow wingbeats, crossing once in a while. */
        it.clock -= dt;
        if (it.clock <= 0 && !P.length) { const dir = Math.random() < 0.5 ? 1 : -1; P.push({ dir, u: dir > 0 ? -0.1 : 1.1, v: rnd(a[0], a[1]) }); it.clock = rnd(14, 22); }
        for (const f of P) { f.u += f.dir * 0.03 * dt; for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, rank = Math.ceil(i / 2), x = X(f.u - f.dir * rank * 0.016), y = Y(f.v + side * rank * 0.012), w = 8 * S, flap = Math.sin(t * 5 + i) * 0.5; g.strokeStyle = ink + "0.85)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - w, y - w * flap * 0.5); g.lineTo(x, y); g.lineTo(x + w, y - w * flap * 0.5); g.stroke(); } }
        it.parts = P.filter((f) => f.u > -0.4 && f.u < 1.4);
      }
      if (it.kind === "gulls") {
        if (P.length < 3 && Math.random() < dt * 0.3) { const dir = Math.random() < 0.5 ? 1 : -1; P.push({ dir, u: dir > 0 ? -0.05 : 1.05, v: rnd(a[0], a[1]), p: Math.random() * 6 }); }
        for (const f of P) { f.u += f.dir * 0.05 * dt; f.v += Math.sin(t * 0.8 + f.p) * 0.006 * dt; const x = X(f.u), y = Y(f.v), w = 11 * S, flap = Math.sin(t * 3 + f.p) * 0.35; g.strokeStyle = night ? "rgba(230,235,255,.9)" : "rgba(250,250,250,.95)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w, y - w * (0.3 + flap)); g.quadraticCurveTo(x - w * 0.35, y - w * 0.45, x, y); g.quadraticCurveTo(x + w * 0.35, y - w * 0.45, x + w, y - w * (0.3 + flap)); g.stroke(); }
        it.parts = P.filter((f) => f.u > -0.2 && f.u < 1.2);
      }
      if (it.kind === "ducks") {
        /* A few ducks paddle across, each pulling a V of ripples behind it. */
        if (!P.length) for (let i = 0; i < 3; i++) P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), dir: Math.random() < 0.5 ? 1 : -1, sp: rnd(0.004, 0.008) });
        for (const q of P) { q.u += q.dir * q.sp * dt; if (q.u > a[1] || q.u < a[0]) q.dir *= -1; const x = X(q.u), y = Y(q.v), s2 = (4 + (q.v - a[2]) * 30) * S; g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - q.dir * s2 * 4, y - s2 * 0.6 + 4); g.lineTo(x, y + 2); g.lineTo(x - q.dir * s2 * 4, y + s2 * 0.8 + 4); g.stroke(); g.fillStyle = ink + "0.9)"; g.beginPath(); g.ellipse(x, y, s2, s2 * 0.45, 0, 0, 6.283); g.fill(); g.beginPath(); g.arc(x + q.dir * s2 * 0.7, y - s2 * 0.55, s2 * 0.32, 0, 6.283); g.fill(); }
      }
      if (it.kind === "fishJump") {
        it.clock -= dt;
        if (it.clock <= 0) { P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), life: 0, dir: Math.random() < 0.5 ? 1 : -1 }); it.clock = rnd(6, 12); }
        for (const q of P) { q.life += dt; const k = q.life / 0.7, x = X(q.u) + q.dir * k * 18 * S, y = Y(q.v) - Math.sin(Math.min(1, k) * Math.PI) * 22 * S; if (k < 1) { g.save(); g.translate(x, y); g.rotate(q.dir * (k - 0.5) * 2); g.fillStyle = "rgba(200,210,220,.9)"; g.beginPath(); g.ellipse(0, 0, 6 * S, 2.2 * S, 0, 0, 6.283); g.fill(); g.restore(); } const rr = Math.max(0, q.life - 0.65) * 26 * S; if (rr) { g.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.5 - (q.life - 0.65) * 0.3)})`; g.beginPath(); g.ellipse(X(q.u) + q.dir * 18 * S, Y(q.v), rr, rr * 0.28, 0, 0, 6.283); g.stroke(); } }
        it.parts = P.filter((q) => q.life < 2.4);
      }
      if (it.kind === "deer") {
        /* A deer steps out, grazes a while, lifts its head, then walks off. */
        if (!P.length) P.push({ u: a[0] - 0.05, v: a[2], phase: "walk", timer: rnd(6, 10), dir: 1 });
        for (const q of P) {
          if (q.phase === "walk") { q.u += q.dir * 0.012 * dt; if (q.u > (a[0] + a[1]) / 2 && q.dir > 0 && q.timer > 0) q.phase = "graze"; }
          else { q.timer -= dt; if (q.timer <= 0) q.phase = "walk"; }
          if (q.u > a[1] + 0.1) { q.u = a[0] - 0.05; q.timer = rnd(6, 10); }
          const x = X(q.u), y = Y(q.v), s2 = 11 * S, step = q.phase === "walk" ? Math.sin(t * 6) * 0.3 : 0, head = q.phase === "graze" ? (Math.sin(t * 0.7) > 0.6 ? 0 : 1) : 0;
          g.fillStyle = mix2(ink, "0.95)"); g.strokeStyle = g.fillStyle; g.lineWidth = 1.6 * S;
          g.beginPath(); g.ellipse(x, y - s2 * 1.2, s2 * 0.9, s2 * 0.4, 0, 0, 6.283); g.fill();
          for (const [dx, sw] of [[-0.6, step], [-0.4, -step], [0.5, -step], [0.7, step]]) { g.beginPath(); g.moveTo(x + dx * s2, y - s2); g.lineTo(x + dx * s2 + sw * s2 * 0.4, y); g.stroke(); }
          const hx = x + s2 * 0.9, hy = head ? y - s2 * 0.6 : y - s2 * 2.1; g.beginPath(); g.moveTo(x + s2 * 0.6, y - s2 * 1.3); g.lineTo(hx, hy); g.stroke(); g.beginPath(); g.ellipse(hx + s2 * 0.15, hy, s2 * 0.3, s2 * 0.16, 0.3, 0, 6.283); g.fill(); if (!head) { g.beginPath(); g.moveTo(hx, hy - 2); g.lineTo(hx - s2 * 0.2, hy - s2 * 0.6); g.moveTo(hx + 3, hy - 2); g.lineTo(hx + s2 * 0.2, hy - s2 * 0.6); g.stroke(); }
        }
      }
      if (it.kind === "swallows") {
        if (!P.length) for (let i = 0; i < 4; i++) P.push({ p: Math.random() * 6, sp: rnd(0.6, 1.1) });
        for (const q of P) { const ph = t * q.sp + q.p, u = a[0] + (a[1] - a[0]) * (0.5 + 0.5 * Math.sin(ph)), v = a[2] + (a[3] - a[2]) * (0.5 + 0.5 * Math.sin(ph * 2.3)), x = X(u), y = Y(v), d = Math.cos(ph) > 0 ? 1 : -1, w = 6 * S; g.fillStyle = ink + "0.9)"; g.beginPath(); g.moveTo(x + d * w, y); g.lineTo(x - d * w * 0.4, y - w * 0.7); g.lineTo(x - d * w * 0.1, y); g.lineTo(x - d * w * 0.4, y + w * 0.7); g.closePath(); g.fill(); }
      }
      if (it.kind === "sailboat") {
        if (!P.length) P.push({ u: rnd(a[0], a[1]) });
        const q = P[0]; q.u += 0.003 * dt; if (q.u > a[1] + 0.1) q.u = a[0] - 0.1;
        const x = X(q.u), y = Y(a[2]) + Math.sin(t * 1.5) * 1.5, s2 = 16 * S; g.fillStyle = night ? "rgba(40,50,80,.9)" : "rgba(60,45,40,.95)"; g.fillRect(x - s2 * 0.6, y - s2 * 0.12, s2 * 1.2, s2 * 0.18); g.fillStyle = state.time === "sunset" ? "rgba(255,210,170,.95)" : "rgba(250,248,240,.95)"; g.beginPath(); g.moveTo(x, y - s2 * 1.3); g.lineTo(x, y - s2 * 0.15); g.lineTo(x + s2 * 0.6, y - s2 * 0.15); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - 1, y - s2 * 1.1); g.lineTo(x - 1, y - s2 * 0.15); g.lineTo(x - s2 * 0.4, y - s2 * 0.15); g.closePath(); g.fill();
      }
      if (it.kind === "heron") {
        /* A heron stands in the shallows, now and then dips its head, then flies off and returns. */
        if (!P.length) P.push({ phase: "stand", timer: rnd(8, 12), u: a[0], v: a[1], fly: 0 });
        const q = P[0]; q.timer -= dt;
        if (q.phase === "stand" && q.timer <= 0) { q.phase = "fly"; q.fly = 0; }
        const s2 = 14 * S;
        if (q.phase === "stand") { const x = X(q.u), y = Y(q.v), dip = Math.sin(t * 0.6) > 0.85 ? 1 : 0; g.strokeStyle = mix2(ink, "0.95)"); g.fillStyle = g.strokeStyle; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x - 2, y - s2 * 1.4); g.moveTo(x + 2, y); g.lineTo(x + 2, y - s2 * 1.4); g.stroke(); g.beginPath(); g.ellipse(x, y - s2 * 1.75, s2 * 0.6, s2 * 0.32, -0.3, 0, 6.283); g.fill(); g.lineWidth = 2; g.beginPath(); g.moveTo(x + s2 * 0.4, y - s2 * 1.9); g.quadraticCurveTo(x + s2 * 0.6, y - s2 * (dip ? 1.5 : 2.6), x + s2 * (dip ? 0.9 : 0.7), y - s2 * (dip ? 1.2 : 2.6)); g.stroke(); g.beginPath(); g.moveTo(x + s2 * (dip ? 0.9 : 0.7), y - s2 * (dip ? 1.2 : 2.6)); g.lineTo(x + s2 * (dip ? 1.3 : 1.15), y - s2 * (dip ? 1.0 : 2.55)); g.stroke(); }
        else { q.fly += dt; const x = X(q.u + q.fly * 0.05), y = Y(q.v - q.fly * 0.03) - s2, w = s2 * 1.6, flap = Math.sin(t * 4) * 0.6; g.strokeStyle = ink + "0.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w, y - w * flap * 0.5); g.quadraticCurveTo(x - w * 0.3, y - w * 0.3, x, y); g.quadraticCurveTo(x + w * 0.3, y - w * 0.3, x + w, y - w * flap * 0.5); g.stroke(); if (q.fly > 12) { q.phase = "stand"; q.timer = rnd(8, 12); } }
      }
      if (it.kind === "dragonflies") {
        if (!P.length) for (let i = 0; i < 4; i++) P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), tu: 0, tv: 0, hold: 0 });
        for (const q of P) { q.hold -= dt; if (q.hold <= 0) { q.tu = rnd(a[0], a[1]); q.tv = rnd(a[2], a[3]); q.hold = rnd(0.6, 1.8); } q.u += (q.tu - q.u) * Math.min(1, dt * 4); q.v += (q.tv - q.v) * Math.min(1, dt * 4); const x = X(q.u), y = Y(q.v); g.strokeStyle = "rgba(60,110,120,.95)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 6 * S, y); g.lineTo(x + 6 * S, y); g.stroke(); g.fillStyle = `rgba(220,240,255,${0.35 + Math.abs(Math.sin(t * 40)) * 0.3})`; g.beginPath(); g.ellipse(x, y - 2, 5 * S, 1.5 * S, 0.4, 0, 6.283); g.ellipse(x, y + 2, 5 * S, 1.5 * S, -0.4, 0, 6.283); g.fill(); }
      }
      if (it.kind === "owl") {
        /* An owl perches on a branch, blinks and turns its head, then flies off into the dark and comes back later. */
        if (!P.length) P.push({ phase: "perch", timer: rnd(7, 11), fly: 0 });
        const q = P[0], dir = a[2], s2 = 9 * S; q.timer -= dt;
        if (q.phase === "perch") {
          const x = X(a[0]), y = Y(a[1]), blink = Math.sin(t * 1.3) > 0.97, turn = Math.sin(t * 0.4) * 2.5 * S;
          g.fillStyle = "#3a2e26"; g.strokeStyle = "#2a201a"; g.lineWidth = 2; g.beginPath(); g.moveTo(x - s2 * 1.6, y + s2 * 1.3); g.lineTo(x + s2 * 1.6, y + s2 * 1.2); g.stroke();
          g.fillStyle = "#6a5444"; g.beginPath(); g.ellipse(x, y, s2 * 0.75, s2 * 1.2, 0, 0, 6.283); g.fill();
          g.fillStyle = "#7a6250"; g.beginPath(); g.arc(x + turn * 0.3, y - s2 * 1.1, s2 * 0.62, 0, 6.283); g.fill();
          g.fillStyle = "#7a6250"; g.beginPath(); g.moveTo(x - s2 * 0.5 + turn * 0.3, y - s2 * 1.5); g.lineTo(x - s2 * 0.35 + turn * 0.3, y - s2 * 1.95); g.lineTo(x - s2 * 0.15 + turn * 0.3, y - s2 * 1.55); g.moveTo(x + s2 * 0.5 + turn * 0.3, y - s2 * 1.5); g.lineTo(x + s2 * 0.35 + turn * 0.3, y - s2 * 1.95); g.lineTo(x + s2 * 0.15 + turn * 0.3, y - s2 * 1.55); g.fill();
          for (const ex of [-0.25, 0.25]) { g.fillStyle = blink ? "#5a4636" : "#f2c84a"; g.beginPath(); g.arc(x + turn + ex * s2, y - s2 * 1.12, s2 * 0.16, 0, 6.283); g.fill(); }
          if (q.timer <= 0) { q.phase = "fly"; q.fly = 0; }
        } else {
          q.fly += dt; const x = X(a[0] + dir * q.fly * 0.07), y = Y(a[1] - q.fly * 0.05 + Math.sin(q.fly * 3) * 0.005), w = s2 * 2.4, flap = Math.sin(t * 6) * 0.7;
          g.fillStyle = "#5a4636"; g.beginPath(); g.ellipse(x, y, s2 * 0.6, s2 * 0.4, 0, 0, 6.283); g.fill(); g.strokeStyle = "#5a4636"; g.lineWidth = s2 * 0.45; g.lineCap = "round"; g.beginPath(); g.moveTo(x - w, y - w * flap * 0.4); g.quadraticCurveTo(x - w * 0.4, y - w * 0.2, x, y); g.quadraticCurveTo(x + w * 0.4, y - w * 0.2, x + w, y - w * flap * 0.4); g.stroke();
          if (q.fly > 9) { q.phase = "perch"; q.timer = rnd(9, 14); }
        }
      }
      if (it.kind === "bats") {
        if (!P.length) for (let i = 0; i < 4; i++) P.push({ p: Math.random() * 6, sp: rnd(0.8, 1.5), cu: rnd(a[0], a[1]), cv: rnd(a[2], a[3]) });
        for (const q of P) { const ph = t * q.sp + q.p, x = X(q.cu + Math.sin(ph) * 0.08 + Math.sin(ph * 3.1) * 0.02), y = Y(q.cv + Math.sin(ph * 1.7) * 0.05), w = 6 * S, flap = Math.sin(t * 18 + q.p); g.fillStyle = night ? "rgba(10,12,20,.95)" : "rgba(30,20,30,.95)"; g.beginPath(); g.moveTo(x, y); g.lineTo(x - w, y - w * flap * 0.6); g.lineTo(x - w * 0.5, y + 1); g.lineTo(x, y + w * 0.3); g.lineTo(x + w * 0.5, y + 1); g.lineTo(x + w, y - w * flap * 0.6); g.closePath(); g.fill(); }
      }
      if (it.kind === "shootingStar") {
        it.clock -= dt;
        if (it.clock <= 0) { P.push({ u: rnd(0.2, 0.8), v: rnd(0.05, 0.25), life: 0 }); it.clock = rnd(7, 15); }
        for (const q of P) { q.life += dt; const k = q.life / 0.8, x0 = X(q.u + k * 0.14), y0 = Y(q.v + k * 0.06), gr = g.createLinearGradient(x0, y0, x0 - 90 * S, y0 - 38 * S); gr.addColorStop(0, `rgba(255,255,255,${0.9 * Math.sin(Math.min(1, k) * Math.PI)})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - 90 * S, y0 - 38 * S); g.stroke(); }
        it.parts = P.filter((q) => q.life < 0.8);
      }
      if (it.kind === "moonpath") {
        /* The moon's path on the water, a column of shimmering light. */
        for (let i = 0; i < 26; i++) { const v = a[1] + (i / 26) * (a[2] - a[1]), w = (14 + i * 3) * S * (0.6 + 0.4 * Math.abs(Math.sin(t * 2 + i * 1.7))), x = X(a[0]) + Math.sin(t * 1.3 + i) * 4 * S; g.fillStyle = `rgba(235,238,255,${0.12 + 0.3 * Math.abs(Math.sin(t * 1.6 + i * 2.3))})`; g.fillRect(x - w / 2, Y(v), w, 1.6); }
      }
      if (it.kind === "aurora") {
        for (let b = 0; b < 3; b++) { g.beginPath(); for (let u = 0; u <= 1.001; u += 0.02) { const y = Y(0.12 + b * 0.05 + Math.sin(u * 6 + t * 0.4 + b) * 0.03); u === 0 ? g.moveTo(X(u), y) : g.lineTo(X(u), y); } g.strokeStyle = `rgba(${b === 1 ? "140,120,230" : "110,230,170"},${0.1 + 0.06 * Math.sin(t * 0.5 + b)})`; g.lineWidth = 26 * S; g.stroke(); }
      }
      if (it.kind === "fox") {
        if (!P.length) P.push({ u: a[0], dir: 1 });
        const q = P[0]; q.u += q.dir * 0.02 * dt; if (q.u > a[1]) { q.u = a[0] - 0.05; }
        const x = X(q.u), y = Y(a[2]), s2 = 9 * S, step = Math.sin(t * 9) * 0.35; g.fillStyle = night ? "#a85a2e" : "#c86a32"; g.strokeStyle = g.fillStyle; g.lineWidth = 1.6 * S;
        g.beginPath(); g.ellipse(x, y - s2, s2 * 1.1, s2 * 0.42, 0, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(x + s2, y - s2 * 1.1); g.lineTo(x + s2 * 1.6, y - s2 * 1.4); g.lineTo(x + s2 * 1.5, y - s2 * 0.9); g.fill(); g.beginPath(); g.moveTo(x + s2 * 1.3, y - s2 * 1.4); g.lineTo(x + s2 * 1.35, y - s2 * 1.8); g.lineTo(x + s2 * 1.5, y - s2 * 1.4); g.fill();
        g.beginPath(); g.moveTo(x - s2, y - s2); g.quadraticCurveTo(x - s2 * 2, y - s2 * 1.4, x - s2 * 2.2, y - s2 * 0.8); g.lineWidth = s2 * 0.5; g.stroke(); g.lineWidth = 1.6 * S; for (const [dx, sw] of [[-0.6, step], [-0.3, -step], [0.5, -step], [0.8, step]]) { g.beginPath(); g.moveTo(x + dx * s2, y - s2 * 0.7); g.lineTo(x + dx * s2 + sw * s2 * 0.5, y); g.stroke(); }
      }
      if (it.kind === "glints") {
        if (P.length < 26 && Math.random() < 0.6) P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), life: 0, max: rnd(0.8, 2.2), w: rnd(8, 30) });
        for (const q of P) { q.life += dt; const k = Math.sin((q.life / q.max) * Math.PI); g.fillStyle = `rgba(255,250,235,${0.55 * k})`; g.fillRect(X(q.u), Y(q.v), q.w * S * (0.5 + (q.v - a[2]) * 2), 1.4); }
        it.parts = P.filter((q) => q.life < q.max);
      }
      if (it.kind === "rings") {
        state.ringsAt -= dt;
        if (state.ringsAt <= 0) { P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), life: 0 }); state.ringsAt = rnd(2.5, 6); }
        for (const q of P) { q.life += dt; for (let r = 0; r < 2; r++) { const rr = (q.life * 22 - r * 8) * S; if (rr <= 0) continue; g.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.45 - q.life * 0.16)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(X(q.u), Y(q.v), rr, rr * 0.28, 0, 0, 6.283); g.stroke(); } }
        it.parts = P.filter((q) => q.life < 3);
      }
      if (it.kind === "smoke") {
        if (Math.random() < dt * 6) P.push({ x: 0, y: 0, life: 0, r: rnd(3, 5), drift: rnd(4, 10) });
        for (const q of P) { q.life += dt; q.y -= 14 * dt; q.x += (q.drift + Math.sin(q.life * 1.5) * 6) * dt; const rr = (q.r + q.life * 7) * S; g.fillStyle = `rgba(${night ? "170,180,200" : "220,220,225"},${Math.max(0, 0.35 - q.life * 0.08)})`; g.beginPath(); g.arc(X(a[0]) + q.x * S, Y(a[1]) + q.y * S, rr, 0, 6.283); g.fill(); }
        it.parts = P.filter((q) => q.life < 4.5);
      }
      if (it.kind === "windowGlow") { const f = 0.55 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1); const gr = g.createRadialGradient(X(a[0]), Y(a[1]), 0, X(a[0]), Y(a[1]), 40 * S); gr.addColorStop(0, `rgba(255,200,110,${0.35 * f})`); gr.addColorStop(1, "rgba(255,200,110,0)"); g.fillStyle = gr; g.fillRect(X(a[0]) - 40 * S, Y(a[1]) - 40 * S, 80 * S, 80 * S); }
      if (it.kind === "snow") {
        if (!P.length) for (let i = 0; i < 80; i++) P.push({ u: Math.random(), v: Math.random(), sp: rnd(0.02, 0.05), r: rnd(0.8, 2.2), p: Math.random() * 6 });
        for (const q of P) { q.v += q.sp * dt; q.u += Math.sin(t * 0.8 + q.p) * 0.004 * dt; if (q.v > 1) { q.v = -0.02; q.u = Math.random(); } g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(X(q.u), Y(q.v), q.r * S, 0, 6.283); g.fill(); }
      }
      if (it.kind === "fall") {
        /* Water streaks pouring down the fall, faster at the bottom. */
        if (P.length < 70) for (let i = 0; i < 3; i++) P.push({ u: rnd(a[0], a[1]), v: a[2], sp: rnd(0.2, 0.35), len: rnd(0.02, 0.05) });
        for (const q of P) { q.sp += dt * 0.3; q.v += q.sp * dt; g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(X(q.u), Y(q.v)); g.lineTo(X(q.u), Y(q.v - q.len)); g.stroke(); }
        it.parts = P.filter((q) => q.v < a[3]);
      }
      if (it.kind === "spray") {
        if (P.length < 40) P.push({ x: rnd(-30, 30), y: 0, vx: rnd(-14, 14), vy: rnd(-26, -10), life: 0, r: rnd(3, 8) });
        for (const q of P) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 18 * dt; g.fillStyle = `rgba(255,255,255,${Math.max(0, 0.4 - q.life * 0.25)})`; g.beginPath(); g.arc(X(a[0]) + q.x * S, Y(a[1]) + q.y * S, (q.r + q.life * 6) * S, 0, 6.283); g.fill(); }
        it.parts = P.filter((q) => q.life < 1.6);
      }
      if (it.kind === "waves") {
        /* Lines of surf roll in toward the beach, curl white, and fade on the sand. */
        if (P.length < 4 && Math.random() < dt * 0.6) P.push({ v: a[2], w: rnd(0.5, 1), ph: Math.random() * 6 });
        for (const q of P) { q.v += 0.018 * dt; const k = (q.v - a[2]) / (a[3] - a[2]); g.strokeStyle = `rgba(255,255,255,${0.7 * Math.sin(k * Math.PI)})`; g.lineWidth = 1.5 + k * 3; g.beginPath(); for (let u = a[0]; u <= a[1] * q.w + 0.05; u += 0.01) { const y = Y(q.v + Math.sin(u * 30 + q.ph + t) * 0.003); u === a[0] ? g.moveTo(X(u), y) : g.lineTo(X(u), y); } g.stroke(); }
        it.parts = P.filter((q) => q.v < a[3]);
      }
      if (it.kind === "leaves") {
        if (P.length < 18 && Math.random() < dt * 1.5) P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), sp: rnd(0.025, 0.05), p: Math.random() * 6, r: rnd(3, 6), c: ["#d0702e", "#eab048", "#b8452a"][Math.floor(Math.random() * 3)] });
        for (const q of P) { q.v += q.sp * dt; q.u += Math.sin(t * 1.4 + q.p) * 0.012 * dt; g.save(); g.translate(X(q.u), Y(q.v)); g.rotate(t * 2 + q.p); g.fillStyle = q.c; g.beginPath(); g.ellipse(0, 0, q.r * S, q.r * 0.45 * S, 0, 0, 6.283); g.fill(); g.restore(); }
        it.parts = P.filter((q) => q.v < 1.02);
      }
      if (it.kind === "butterflies") {
        if (!P.length) for (let i = 0; i < 5; i++) P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), p: Math.random() * 6, c: ["#f6e08a", "#ffffff", "#f0a24a", "#c8a0e0"][i % 4] });
        for (const q of P) { q.u += Math.sin(t * 0.7 + q.p) * 0.02 * dt; q.v += Math.cos(t * 0.9 + q.p * 2) * 0.015 * dt; q.u = Math.min(a[1], Math.max(a[0], q.u)); q.v = Math.min(a[3], Math.max(a[2], q.v)); const w = Math.abs(Math.sin(t * 14 + q.p)) * 4 * S + 1; g.fillStyle = q.c; g.beginPath(); g.ellipse(X(q.u) - w / 2, Y(q.v), w, 3 * S, -0.4, 0, 6.283); g.ellipse(X(q.u) + w / 2, Y(q.v), w, 3 * S, 0.4, 0, 6.283); g.fill(); }
      }
      if (it.kind === "fireflies") {
        if (!P.length) for (let i = 0; i < 22; i++) P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), p: Math.random() * 6 });
        for (const q of P) { q.u += Math.sin(t * 0.4 + q.p) * 0.01 * dt; q.v += Math.cos(t * 0.5 + q.p) * 0.008 * dt; const k = Math.max(0, Math.sin(t * 1.6 + q.p * 3)); const x = X(q.u), y = Y(q.v), gr = g.createRadialGradient(x, y, 0, x, y, 9 * S); gr.addColorStop(0, `rgba(250,240,150,${0.9 * k})`); gr.addColorStop(1, "rgba(250,240,150,0)"); g.fillStyle = gr; g.fillRect(x - 9 * S, y - 9 * S, 18 * S, 18 * S); }
      }
      if (it.kind === "mist") {
        if (!P.length) for (let i = 0; i < 5; i++) P.push({ u: Math.random(), v: rnd(a[0], a[1]), sp: rnd(0.004, 0.01), r: rnd(0.12, 0.22) });
        for (const q of P) { q.u += q.sp * dt; if (q.u > 1.3) q.u = -0.3; const x = X(q.u), y = Y(q.v), rr = X(q.r) - X(0), gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, night ? "rgba(150,165,200,.14)" : "rgba(255,255,255,.2)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * 0.25, 0, 0, 6.283); g.fill(); }
      }
    }
    g.restore();
  }
  window.LIFE = { init, draw };
})();
