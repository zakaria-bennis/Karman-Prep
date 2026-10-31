// Daily 10 ending stage: demo data, the round-one sound set (soft sine tones in one key, now through a
// gentle limiter), motion helpers, shared pieces and the clip of question 10.
// Every sound call can be logged and re-rendered offline, so the mix can be measured.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- the demo student's Daily 10 ----------
  const Q = window.QUESTIONS;
  const order = [0, 3, 5, 7, 2, 6, 4, 1, 8, 9];
  const okPattern = [1, 0, 1, 1, 1, 0, 0, 1, 1, 1]; // 7 of 10: missed 2, 6 and 7, then 3 in a row
  const hard = [0, 0, 1, 0, 0, 0, 0, 1, 0, 1];
  const DATA = {
    name: 'Maya', right: 7, total: 10, streakEnd: 3,
    questions: order.map((qi, i) => { const q = Q[qi], ok = !!okPattern[i]; return { n: i + 1, q, ok, tokens: ok ? (hard[i] ? 15 : 10) : 0, subject: q.subject, skill: q.skill }; }),
    // tokens work like Crossy Road: you collect them, then spend them on a mystery box
    tokensBefore: 240, boxCost: 300,
    dayStreakBefore: 6, dayStreak: 7,
    rankBefore: 5, rank: 3, cohort: 'March cohort',
    // every skill that moved today, biggest movers first (up or down); the ending shows the top three
    moved: [
      { name: 'Nonlinear functions', domain: 'Advanced Math', was: 57, now: 63 }, // crosses into Proficient
      { name: 'Right triangles and trigonometry', domain: 'Geometry and Trigonometry', was: 38, now: 33 }, // slipped
      { name: 'Words in Context', domain: 'Craft and Structure', was: 71, now: 74 },
      { name: 'Linear equations in one variable', domain: 'Algebra', was: 82, now: 84 },
      { name: 'Boundaries', domain: 'Standard English Conventions', was: 44, now: 42 },
      { name: 'Inferences', domain: 'Information and Ideas', was: 66, now: 67 },
      { name: 'Circles', domain: 'Geometry and Trigonometry', was: 29, now: 30 },
    ],
    others: [['Linear functions', 'Algebra', 74], ['Systems of linear equations', 'Algebra', 61], ['Linear inequalities', 'Algebra', 52], ['Equivalent expressions', 'Advanced Math', 69], ['Nonlinear equations', 'Advanced Math', 47], ['Ratios, rates and proportions', 'Problem-Solving and Data Analysis', 81], ['Percentages', 'Problem-Solving and Data Analysis', 77], ['Probability', 'Problem-Solving and Data Analysis', 40], ['Area and volume', 'Geometry and Trigonometry', 58], ['Central Ideas and Details', 'Information and Ideas', 72], ['Command of Evidence', 'Information and Ideas', 63], ['Text Structure and Purpose', 'Craft and Structure', 55], ['Transitions', 'Expression of Ideas', 70], ['Rhetorical Synthesis', 'Expression of Ideas', 49], ['Lines, angles and triangles', 'Geometry and Trigonometry', 0], ['Form, Structure and Sense', 'Standard English Conventions', 66]].map(([name, domain, now]) => ({ name, domain, was: now, now })),
    weakest: 'Right triangles and trigonometry',
    prizes: { glasses: 'Round glasses', headphones: 'Headphones', cap: 'Graduation cap', bow: 'Bow tie', scarf: 'Star scarf' },
  };
  DATA.tokensToday = DATA.questions.reduce((a, q) => a + q.tokens, 0);
  // one box at a time: 1 = today's tokens reach a box, 0 = not enough yet
  DATA.setBoxes = (n) => { DATA.tokensBefore = n ? 240 : 120; DATA.tokens = DATA.tokensBefore + DATA.tokensToday; DATA.boxes = Math.min(1, Math.floor(DATA.tokens / DATA.boxCost)); DATA.tokensAfter = DATA.tokens - DATA.boxes * DATA.boxCost; };
  DATA.setBoxes(1);
  DATA.misses = DATA.questions.filter((q) => !q.ok);
  DATA.moved.sort((a, b) => Math.abs(b.now - b.was) - Math.abs(a.now - a.was));
  DATA.skills = DATA.moved.slice(0, 3);
  // four levels, one bar each: Learning, Developing, Proficient, Mastered. Not started (never met, or nothing
  // right yet) is 0: all four bars empty.
  const BANDS = ['Not started', 'Learning', 'Developing', 'Proficient', 'Mastered'];
  const band = (p) => (p <= 0 ? 0 : p >= 80 ? 4 : p >= 60 ? 3 : p >= 35 ? 2 : 1);

  // ---------- sound: the round-one set ----------
  let AC, REV, BUS, BRIGHT, CLICK, OFFSET = 0, muted = false;
  function build(a) {
    // limiter and a soft top roll-off so stacked sounds never get sharp or loud
    const lim = a.createDynamicsCompressor(); lim.threshold.value = -18; lim.knee.value = 12; lim.ratio.value = 6; lim.attack.value = 0.004; lim.release.value = 0.25;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; lp.Q.value = 0.5;
    BUS = a.createGain(); BUS.gain.value = 0.8; BUS.connect(lp).connect(lim).connect(a.destination);
    // tokens need their air (metal rings up to 17 kHz), so they skip the roll-off and only meet the limiter
    BRIGHT = a.createGain(); BRIGHT.gain.value = 0.62; BRIGHT.connect(lim);
    { const n = Math.ceil(a.sampleRate * 0.012); CLICK = a.createBuffer(1, n, a.sampleRate); const d = CLICK.getChannelData(0); let sd = 5; for (let i = 0; i < n; i++) d[i] = (((sd = (sd * 16807) % 2147483647) / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 2); }
    const len = Math.floor(a.sampleRate * 2.2), b = a.createBuffer(2, len, a.sampleRate);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 3); }
    REV = a.createConvolver(); REV.buffer = b; const wet = a.createGain(); wet.gain.value = 0.22; REV.connect(wet).connect(BUS);
  }
  function ac() {
    if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); build(AC); }
    if (AC.state === 'suspended' && !(window.OfflineAudioContext && AC instanceof OfflineAudioContext)) AC.resume();
    return AC;
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function tone(f, t = 0, v = 0.08, dec = 1.1, type = 'sine', partials = [[1, 1], [2.76, 0.25], [5.4, 0.07]]) {
    if (muted) return; const a = ac(), s = a.currentTime + OFFSET + t;
    partials.forEach(([m, g]) => { const o = a.createOscillator(), n = a.createGain(); o.type = type; o.frequency.value = f * m; n.gain.setValueAtTime(0, s); n.gain.linearRampToValueAtTime(v * g, s + 0.006); n.gain.exponentialRampToValueAtTime(0.0001, s + dec * (m > 1 ? 0.5 : 1)); o.connect(n); n.connect(BUS); n.connect(REV); o.start(s); o.stop(s + dec + 0.1); });
  }
  function noise(t = 0, dur = 0.35, v = 0.08, f0 = 400, f1 = 3000, q = 0.8) {
    if (muted) return; const a = ac(), s = a.currentTime + OFFSET + t, len = Math.ceil(a.sampleRate * dur), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, s); bp.frequency.exponentialRampToValueAtTime(f1, s + dur);
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    src.connect(bp).connect(g).connect(BUS); src.start(s); src.stop(s + dur + 0.05);
  }
  // one coin: a very short bright strike, then a small coin's uneven overtones ringing out
  function coin(t, f, v, ring) {
    if (muted) return; const a = ac(), s = a.currentTime + OFFSET + t;
    const src = a.createBufferSource(), hp = a.createBiquadFilter(), g = a.createGain(); src.buffer = CLICK; hp.type = 'highpass'; hp.frequency.value = 8000; g.gain.value = v * 4.6;
    src.connect(hp).connect(g).connect(BRIGHT); src.start(s);
    [[0.45, 0.16, 0.6], [1, 1, 1], [1.47, 0.75, 0.7], [2.09, 0.6, 0.5], [2.76, 0.4, 0.35]].forEach(([m, gn, dk]) => { if (f * m > 19000) return; const o = a.createOscillator(), n = a.createGain(); o.frequency.value = f * m; n.gain.setValueAtTime(0, s); n.gain.linearRampToValueAtTime(v * gn, s + 0.002); n.gain.exponentialRampToValueAtTime(0.0001, s + ring * dk); o.connect(n); n.connect(BRIGHT); if (m === 1) n.connect(REV); o.start(s); o.stop(s + ring + 0.05); });
  }
  // every voice takes its start offset first. All notes sit in C major.
  const RAW = {
    tap(t = 0) { tone(N(84), t, 0.025, 0.18); },
    select(t = 0) { tone(N(79), t, 0.035, 0.3); },
    streak3(t = 0) { [[79, 0], [83, 0.075], [86, 0.15]].forEach(([n, d]) => tone(N(n), t + d, 0.08)); tone(N(67), t + 0.15, 0.035); },
    pop(t = 0) { tone(N(76), t, 0.06, 0.25, 'triangle', [[1, 1], [2, 0.3]]); },
    thud(t = 0) { tone(N(43), t, 0.12, 0.35, 'sine', [[1, 1], [1.5, 0.3]]); },
    chime(t = 0) { [[84, 0], [88, 0.09], [91, 0.18]].forEach(([n, d]) => tone(N(n), t + d, 0.06)); },
    score(t = 0) { [[72, 0], [76, 0.1], [79, 0.2], [84, 0.32]].forEach(([n, d]) => tone(N(n), t + d, 0.075)); tone(N(60), t + 0.32, 0.045, 1.6); },
    levelUp(t = 0) { [[67, 0], [72, 0.11], [76, 0.22], [79, 0.33], [84, 0.5], [88, 0.5]].forEach(([n, d]) => tone(N(n), t + d, 0.07, 1.4)); tone(N(48), t + 0.5, 0.05, 2); },
    drain(t = 0) { [[74, 0], [71, 0.14], [67, 0.28]].forEach(([n, d]) => tone(N(n), t + d, 0.04, 0.7)); },
    open(t = 0) { noise(t, 0.6, 0.045, 500, 4000, 0.6); [[84, 0.15], [88, 0.24], [91, 0.33], [96, 0.42]].forEach(([n, d]) => tone(N(n), t + d, 0.06, 1.3)); },
    // a new companion: one warm rising chord
    companion(t = 0) { [[72, 0], [79, 0.12], [84, 0.24], [88, 0.36]].forEach(([n, d]) => tone(N(n), t + d, 0.06, 1.5)); tone(N(55), t + 0.36, 0.04, 1.8); },
    // the payout, after a pool game's coin shower: bright small coins (5.6 to 8.5 kHz, rings up to 19 kHz) pour
    // onto a pile, one cluster per token landing, louder as it fills, with little jingles between; then one big
    // burst as the count lands, a weight under it, and one coin left ringing (E8, in key)
    tokens(t = 0, n = 14, gap = 0.05) {
      let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const hz = () => 5600 * Math.pow(2, r() * 0.6), span = n * gap;
      for (let i = 0; i < n; i++) {
        const at = t + i * gap, lvl = 0.03 + 0.02 * (i / Math.max(1, n - 1)), m = 2 + Math.floor(r() * 3);
        for (let j = 0; j < m; j++) coin(at + j * (0.006 + r() * 0.016), hz(), lvl * (j ? 0.5 + r() * 0.3 : 1), 0.035 + r() * 0.06);
      }
      for (let x = t + 0.01; x < t + span + 0.05; x += 0.008 + r() * 0.012) coin(x, hz() * 1.08, 0.009 + r() * 0.009, 0.025);
      const end = t + span + 0.02;
      for (let j = 0; j < 10; j++) coin(end + j * (0.006 + r() * 0.008), hz(), 0.052 * (1 - j * 0.05), 0.08 + r() * 0.1);
      tone(N(43), end, 0.016, 0.18, 'sine', [[1, 1], [2.02, 0.35]]);
      coin(end + 0.05, N(112), 0.04, 0.75);
      [0.2, 0.31, 0.47].forEach((d, i) => coin(end + d, hz(), 0.016 / (i + 1), 0.1));
    },
  };
  // logging, so a run can be replayed into an offline render and measured
  let LOG = null, T0 = 0;
  const SFX = {};
  Object.keys(RAW).forEach((k) => { SFX[k] = (...args) => { if (LOG && !muted) LOG.push([(performance.now() - T0) / 1000, k, args]); try { RAW[k](...args); } catch (e) { /* audio unavailable */ } }; });
  async function renderLog(log, seconds) {
    const sr = 44100, off = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr), keep = [AC, BUS, REV];
    AC = off; build(off);
    log.forEach(([at, k, args]) => { OFFSET = at; const a = args.slice(); a[0] = a[0] || 0; RAW[k](...a); });
    OFFSET = 0; const buf = await off.startRendering(); [AC, BUS, REV] = keep; return buf;
  }

  // ---------- motion ----------
  let runId = 0;
  class Cancelled extends Error {}
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  function makeCtx(stage) {
    const id = ++runId, alive = () => id === runId;
    const X = {
      stage, reduced, alive,
      wait(ms) { return new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(new Cancelled())), reduced ? Math.min(ms, 60) : ms)); },
      tween(dur, fn, ease = easeOut) { return new Promise((res, rej) => { if (reduced) { fn(1); return res(); } const t0 = performance.now(); (function f(t) { if (!alive()) return rej(new Cancelled()); const k = Math.min(1, (t - t0) / dur); fn(ease(k)); if (k < 1) requestAnimationFrame(f); else res(); })(t0); }); },
      // Apple-style spring: response in seconds, damping ratio (1 = no overshoot)
      spring(from, to, fn, response = 0.4, damping = 1) { return new Promise((res, rej) => { if (reduced) { fn(to); return res(); } const k = Math.pow((2 * Math.PI) / response, 2), c = 4 * Math.PI * damping / response; let x = from, v = 0, last = performance.now(); (function f(t) { if (!alive()) return rej(new Cancelled()); const dt = Math.min(0.032, (t - last) / 1000); last = t; v += (k * (to - x) - c * v) * dt; x += v * dt; fn(x); if (Math.abs(to - x) > 0.002 * Math.max(1, Math.abs(to - from)) || Math.abs(v) > 0.02) requestAnimationFrame(f); else { fn(to); res(); } })(last); }); },
      count(el, from, to, dur = 900, fmt = (n) => Math.round(n).toLocaleString('en-US')) { let lastSet = 0; return X.tween(dur, (k) => { const v = from + (to - from) * k, now = performance.now(); if (k === 1 || !End.kit || now - lastSet > 70) { lastSet = now; End.setNum(el, fmt(v)); } }); },
      el(html, parent = X.page) { const t = document.createElement('template'); t.innerHTML = html.trim(); const n = t.content.firstElementChild; parent.appendChild(n); return n; },
      clear() { stage.innerHTML = ''; X.page = document.createElement('div'); X.page.className = 'page'; stage.appendChild(X.page); },
      // phone and iPad: which layout this stage is using
      get narrow() { return stage.clientWidth < 900; }, get phone() { return stage.clientWidth < 560; },
    };
    X.page = stage.querySelector(':scope > .page') || (() => { const pg = document.createElement('div'); pg.className = 'page'; stage.appendChild(pg); return pg; })();
    return X;
  }

  // ---------- the pets: idle look, cheering waddle ----------
  // On desktop and laptop an idle pet keeps its eyes open and looks toward the pointer (the real one,
  // or the drawn demo cursor). On a phone or iPad it keeps the happy closed eyes it has now.
  const PETS = new Set(); let look = { x: -1, y: -1, t: 0 };
  const touch = () => matchMedia('(pointer: coarse)').matches || (window.__dev && window.__dev !== 'desktop');
  const idle = () => (touch() ? 'h' : 'n');
  addEventListener('pointermove', (e) => { look = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
  const lookAt = (x, y) => { look = { x, y, t: performance.now() }; };
  (function loop() {
    PETS.forEach((el) => {
      if (!el.isConnected) { PETS.delete(el); return; }
      const eyes = el.querySelector('.m-eyes'); if (!eyes) return;
      let tx = 0, ty = 0;
      if (!touch() && !el.dataset.busy && look.t && el.dataset.mood === 'n') { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.45, dx = look.x - cx, dy = look.y - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160); tx = (dx / d) * 3.6 * k; ty = (dy / d) * 2.6 * k; }
      const cur = el._look || { x: 0, y: 0 }; cur.x += (tx - cur.x) * 0.18; cur.y += (ty - cur.y) * 0.18; el._look = cur;
      eyes.setAttribute('transform', `translate(${cur.x.toFixed(2)} ${cur.y.toFixed(2)})`);
    });
    requestAnimationFrame(loop);
  })();
  const setMood = (el, m) => { el.dataset.mood = m; Mascot.moodOn(el, m); };
  // a short waddle left and right, with happy eyes, then back to idle
  const cheer = (el) => {
    const svg = el && el.querySelector('svg'); if (!svg || el.dataset.busy) return;
    el.dataset.busy = '1'; setMood(el, 'h'); svg.style.transformOrigin = '50% 92%';
    const a = svg.animate([{ transform: 'none' }, { transform: 'translateX(-4px) rotate(-9deg)' }, { transform: 'translateY(-5px) rotate(0deg)' }, { transform: 'translateX(4px) rotate(9deg)' }, { transform: 'translateY(-5px) rotate(0deg)' }, { transform: 'translateX(-4px) rotate(-8deg)' }, { transform: 'translateX(4px) rotate(7deg)' }, { transform: 'none' }], { duration: reduced ? 1 : 1150, easing: 'ease-in-out' });
    a.finished.then(() => { delete el.dataset.busy; setMood(el, idle()); }).catch(() => {});
  };
  const cheerAll = () => PETS.forEach((el) => { if (el.isConnected && el.closest('#stage')) cheer(el); });

  // ---------- shared pieces ----------
  const P = {
    css(id, text) { if (document.getElementById(id)) return; const st = document.createElement('style'); st.id = id; st.textContent = text; document.head.appendChild(st); },
    ord(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); },
    async leave(X, how = 'up') {
      const f = X.page.firstElementChild; if (!f) return;
      const m = { up: (k) => `translateY(${-40 * k}px)`, down: (k) => `translateY(${40 * k}px)`, zoom: (k) => `scale(${1 + 0.06 * k})`, shrink: (k) => `scale(${1 - 0.06 * k})`, left: (k) => `translateX(${-60 * k}px)`, stay: () => 'none' }[how];
      await X.tween(380, (k) => { f.style.transform = m(k); f.style.opacity = 1 - k; });
      X.clear();
    },
    fox(mood = 'h', size = 120, acc = End.state && End.state.wear) { const w = document.createElement('div'); w.className = 'fox'; w.innerHTML = Mascot.head('fox'); w.firstChild.style.width = size + 'px'; setMood(w, mood === 'h' ? idle() : mood); if (acc) P.wear(w, acc); PETS.add(w); return w; },
    owl(mood = 'h', size = 120) { const w = document.createElement('div'); w.className = 'fox'; w.innerHTML = Mascot.head('owl'); w.firstChild.style.width = size + 'px'; setMood(w, mood === 'h' ? idle() : mood); PETS.add(w); return w; },
    // 'h' means back to idle; a reaction (o: delighted, k: concerned) holds until the next call
    mood(el, m) { if (el.dataset.busy) return; setMood(el, m === 'h' ? idle() : m); },
    blink(el) { Mascot.blinkOn(el); },
    mark(b) { return `<svg class="bmark" viewBox="0 0 14 14" aria-hidden="true">${['<circle class="n" cx="7" cy="7" r="5"/>', '<circle class="r" cx="7" cy="7" r="5"/>', '<circle class="r" cx="7" cy="7" r="5"/><path class="f" d="M7 2 A5 5 0 0 1 7 12 Z"/>', '<circle class="f" cx="7" cy="7" r="5.6"/>', '<path class="f" d="M7 1.2 8.6 5.2 12.8 5.4 9.5 8 10.6 12.2 7 9.8 3.4 12.2 4.5 8 1.2 5.4 5.4 5.2Z"/>'][b]}</svg>`; },
    // Khan-style four-band bar: rises into a level-up, or flickers and drains
    bar(skill, opts = {}) {
      const el = document.createElement('div'); el.className = 'mbar' + (opts.small ? ' small' : '') + (opts.big ? ' lg' : '');
      el.innerHTML = `<div class="mb-top"><span class="mb-mark">${P.mark(band(skill.was))}</span><span class="mb-name">${skill.name}</span><span class="mb-band">${BANDS[band(skill.was)]}</span></div>${opts.domain ? `<div class="mb-dom">${skill.domain}</div>` : ''}<div class="mb-track">${'<i><b class="f"></b><b class="l"></b></i>'.repeat(4)}</div>`;
      const SEG = [[0, 35], [35, 60], [60, 80], [80, 100]], segs = [...el.querySelectorAll('.mb-track i')];
      const part = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a))) * 100;
      const setFill = (p) => segs.forEach((g, i) => { g.firstChild.style.width = part(p, ...SEG[i]) + '%'; });
      const setLost = (lo, hi) => segs.forEach((g, i) => { const l = g.lastChild, a = part(lo, ...SEG[i]), b = part(hi, ...SEG[i]); l.style.left = a + '%'; l.style.width = Math.max(0, b - a) + '%'; });
      setFill(skill.was);
      const bandEl = el.querySelector('.mb-band'), markEl = el.querySelector('.mb-mark');
      return {
        el,
        async play(X) {
          if (skill.now >= skill.was) {
            const up = band(skill.now) > band(skill.was);
            await X.spring(skill.was, skill.now, setFill, 0.6, 1);
            if (up) { el.classList.add('lvl'); bandEl.textContent = BANDS[band(skill.now)]; markEl.innerHTML = P.mark(band(skill.now)); SFX.levelUp(); End.cheerAll(); End.fx.celebrate('level', el); await X.wait(600); }
            else await X.wait(200);
          } else {
            setFill(skill.now); setLost(skill.now, skill.was);
            el.classList.add('flick'); await X.wait(520); SFX.drain();
            await X.tween(750, (k) => setLost(skill.now, skill.was - (skill.was - skill.now) * k));
            el.classList.remove('flick'); el.classList.add('soft'); markEl.innerHTML = P.mark(band(skill.now));
            bandEl.textContent = 'Needs another look';
          }
        },
      };
    },
    // ten answers on one path, in order: right ones filled, missed ones an open ring. The line between two
    // right answers lights up, so runs show at a glance; the run she finished on is named above it.
    answers() {
      const qs = DATA.questions, el = document.createElement('div'); el.className = 'apath';
      const col = (i) => 2 * i + 1;
      let end = qs.length - 1; while (end >= 0 && qs[end].ok) end--; const run = qs.length - 1 - end;
      el.innerHTML = qs.map((q, i) => `${i ? `<i class="ap-seg${q.ok && qs[i - 1].ok ? ' on' : ''}" style="grid-column:${col(i) - 1}"></i>` : ''}<button type="button" class="ap-n ${q.ok ? 'ok' : 'no'}" style="grid-column:${col(i)}" aria-label="Question ${q.n}, ${q.ok ? 'right' : 'missed'}"><span>${q.n}</span></button>`).join('')
        + (run >= 3 ? `<div class="ap-run" style="grid-column:${col(qs.length - run)} / ${col(qs.length - 1) + 1}">${P.flameSVG()}<span>Finished on ${run} in a row</span></div>` : '');
      return el;
    },
    // nodes pop in along the path and the lit runs draw in; no sound
    async answersIn(X, el, gap = 40) {
      End.follow && End.follow(X, el);
      el.classList.add('in');
      for (const n of el.querySelectorAll('.ap-n, .ap-seg')) { n.classList.add('in'); if (n.matches('.ap-n')) await X.wait(gap); }
      const r = el.querySelector('.ap-run'); if (r) r.classList.add('in');
    },
    button(label = `Practise ${DATA.weakest.toLowerCase()}`) { const b = document.createElement('button'); b.type = 'button'; b.className = 'cta'; b.textContent = label; return b; },
    link(label = 'Back to home') { const a = document.createElement('a'); a.className = 'plink'; a.href = '#'; a.textContent = label; a.onclick = (e) => e.preventDefault(); return a; },
    flameSVG() { return '<svg class="flame" viewBox="0 0 24 30" aria-hidden="true"><path class="fl-o" d="M12 1 C14 8 21 11 21 19 C21 25 17 29 12 29 C7 29 3 25 3 19 C3 13 8 11 9 5 C11 9 11 11 12 13 C13 9 12 5 12 1 Z"/><path class="fl-i" d="M12 14 C13 18 16 19 16 23 C16 26 14 28 12 28 C10 28 8 26 8 23 C8 20 11 18 12 14 Z"/></svg>'; },
    // position helper: an element's box in stage pixels
    rect(el, host = document.getElementById('stage')) { const r = el.getBoundingClientRect(), h = host.getBoundingClientRect(), k = h.width / host.offsetWidth; return { x: (r.left - h.left) / k, y: (r.top - h.top) / k, w: r.width / k, h: r.height / k }; },
    // a drawn pointer that moves and taps, so the demo shows the student's own choices
    cursor(X, o = {}) {
      const host = X.stage, c = document.createElementNS(NS, 'svg'); c.setAttribute('viewBox', '0 0 20 24'); c.setAttribute('class', 'cursor'); c.innerHTML = '<path d="M2 2 L2 19 L6.5 15 L9.5 22 L12.5 20.8 L9.6 14 L16 14 Z"/>'; host.appendChild(c);
      let cx = 1000, cy = 760; c.style.transform = `translate(${cx}px, ${cy}px)`;
      return {
        async to(el, ms = 620) { host.appendChild(c); const r = P.rect(el, host), x = r.x + r.w * 0.45, y = r.y + r.h * 0.55, x0 = cx, y0 = cy; cx = x; cy = y; await X.tween(ms, (k) => { c.style.transform = `translate(${x0 + (x - x0) * k}px, ${y0 + (y - y0) * k - Math.sin(k * Math.PI) * 24}px)`; const r = c.getBoundingClientRect(); End.lookAt(r.left, r.top); }, easeInOut); },
        async tap(el) { c.classList.add('down'); el && el.classList.add('pressed'); if (o.sound) SFX.tap(); await X.wait(120); c.classList.remove('down'); el && el.classList.remove('pressed'); },
        away() { c.style.transition = 'opacity .3s'; c.style.opacity = 0; setTimeout(() => c.remove(), 320); },
      };
    },
  };

  // ---------- the clip: question 10 ----------
  async function clip(X) {
    const q = DATA.questions[9].q;
    X.clear();
    const f = X.el(`<div class="qf">
      <header class="qf-top"><div><b>Your Daily 10: Math</b><span>Directions</span></div><div class="qf-timer"><b>11:42</b><span>Hide</span></div><div class="qf-tools"><span>Highlights &amp; Notes</span><span>Calculator</span><span>Reference</span></div></header>
      <main class="qf-main"><div class="qf-col">
        <div class="qf-strip"><span class="qf-num">10</span><span class="qf-bm">Bookmark</span></div>
        <div class="qf-stem">${Txt.block(q.stem)}</div>
        <div class="qf-choices">${q.choices.map((c) => `<div class="qf-ch" data-l="${c.letter}"><span class="qf-b">${c.letter}</span><span>${Txt.inline(c.text)}</span></div>`).join('')}</div>
      </div></main>
      <footer class="qf-bot"><div class="qf-fb"><span class="qf-fbm"></span><span class="qf-msg"></span><span class="qf-pts"></span><span class="qf-stk">${P.flameSVG()}<b>3</b> in a row</span></div><div class="qf-nav">Question 10 of 10</div><div class="qf-btns"><span class="qf-back">Back</span><span class="qf-go">Check</span></div></footer>
      <div class="qf-foxwell"></div>
    </div>`);
    const cur = P.cursor(X, { sound: true }), go = f.querySelector('.qf-go'), bot = f.querySelector('.qf-bot');
    await X.wait(450);
    const B = f.querySelector('.qf-ch[data-l="B"]');
    await cur.to(B); await cur.tap(); B.classList.add('sel'); SFX.select();
    await X.wait(360); await cur.to(go, 540); await cur.tap();
    B.classList.add('right');
    bot.classList.add('good'); f.querySelector('.qf-msg').textContent = 'Correct'; f.querySelector('.qf-pts').innerHTML = `${End.tokenSVG(15)}<b>15</b>`;
    f.querySelector('.qf-fbm').innerHTML = '<svg viewBox="0 0 12 12"><path d="M2.5 6.5 5 9 9.5 3.5"/></svg>';
    SFX.streak3();
    go.textContent = 'See results'; go.classList.add('next');
    const well = f.querySelector('.qf-foxwell'), fx = P.fox('h', 104); well.appendChild(fx);
    await X.spring(110, 8, (v) => { fx.style.transform = `translateY(${v}px)`; }, 0.42, 0.72);
    await X.wait(1200); P.blink(fx); await X.wait(450);
    await cur.to(go, 480); await cur.tap(go); cur.away();
    await X.spring(8, 120, (v) => { fx.style.transform = `translateY(${v}px)`; }, 0.35, 1);
    return f;
  }

  window.End = {
    // celebration hooks: quiet by default; the 21st.dev layer (kit.js) fills them in
    fx: { score() {}, celebrate() {} },
    touch, lookAt, cheer, cheerAll,
    DATA, BANDS, band, SFX, P, clip, makeCtx, Cancelled, easeOut, easeInOut, NS, reduced,
    set muted(v) { muted = v; }, get muted() { return muted; },
    unlockAudio() { try { ac(); } catch (e) { /* no audio */ } },
    logStart() { LOG = []; T0 = performance.now(); }, logStop() { const l = LOG; LOG = null; return l; }, renderLog,
    tokenSVG(size = 18, glint = size >= 20) { return `<svg class="token" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><circle cx="12" cy="12" r="11.2" fill="url(#tkRim)"/><circle cx="12" cy="12" r="11.2" fill="none" stroke="#8a5a10" stroke-opacity=".55" stroke-width=".7"/><circle cx="12" cy="12" r="8.6" fill="url(#tkFace)"/><circle cx="12" cy="12" r="8.6" fill="none" stroke="#9c6814" stroke-opacity=".5" stroke-width=".7"/><path d="M12 6.6 13.5 10.2 17.3 10.4 14.3 12.8 15.3 16.5 12 14.4 8.7 16.5 9.7 12.8 6.7 10.4 10.5 10.2Z" fill="#b07414" fill-opacity=".55" transform="translate(.35 .45)"/><path d="M12 6.6 13.5 10.2 17.3 10.4 14.3 12.8 15.3 16.5 12 14.4 8.7 16.5 9.7 12.8 6.7 10.4 10.5 10.2Z" fill="#fde9a6"/><path d="M4.6 8.2 A8.4 8.4 0 0 1 10.2 3.7" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/>${glint ? '<g clip-path="url(#tkClip)"><rect class="tk-glint" x="-6" y="-4" width="4" height="32" fill="#fff" fill-opacity=".55" transform="rotate(24 12 12)"/></g>' : ''}</svg>`; },
  };
  // the token's gold, defined once for every token on the page
  addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="tkRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe08a"/><stop offset=".5" stop-color="#dba63c"/><stop offset="1" stop-color="#a96d14"/></linearGradient><radialGradient id="tkFace" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#fff3bd"/><stop offset=".42" stop-color="#f5c84f"/><stop offset="1" stop-color="#c58718"/></radialGradient><clipPath id="tkClip"><circle cx="12" cy="12" r="11.2"/></clipPath></defs></svg>'));
  window.Designs = [];
})();
