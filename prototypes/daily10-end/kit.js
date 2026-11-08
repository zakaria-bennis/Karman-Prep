// Round four: elements from 21st.dev, ported from their React source into this prototype's plain code
// and recoloured with each theme's accent. The switch in the gallery turns the whole layer on and off.
// Sources on 21st.dev (component id): Rolling Digits (19158), Animate Count (20060), Klyv Shimmer Button
// (38278, MIT), Spotlight (35180), Border Beam Panel (23408), Segmented Control (23552), Drawer (31360),
// Animated List (26903), Progress Bar (23549), Glass Card (28259), Optimized Tilt Card (27139),
// Animated Shiny Text (897). Round six, the celebration: Burst (33152, confetti), Animated Circular Progress
// Bar (920, the score gauge), Sparkles Text (874), Blur In Text (19228), Aurora (35187), Achievement
// Unlocked (13045, the companion's medal and pill).
(function () {
  const { P } = End;
  const root = document.documentElement;
  End.kit = true; root.classList.add('kit');
  End.setKit = (on) => { End.kit = on; root.classList.toggle('kit', on); };
  const fine = () => !End.touch();

  // ---------- an Apple-style spring, baked into a CSS linear() easing for the Web Animations API ----------
  const hasLinear = CSS.supports('animation-timing-function', 'linear(0, 1)');
  const cache = {};
  const spring = (response = 0.4, damping = 1) => {
    const key = response + ':' + damping; if (cache[key]) return cache[key];
    const k = Math.pow((2 * Math.PI) / response, 2), c = (4 * Math.PI * damping) / response, dt = 1 / 240, pts = [];
    let x = 0, v = 0, t = 0;
    while (t < 2.5) { v += (k * (1 - x) - c * v) * dt; x += v * dt; t += dt; pts.push(x); if (t > 0.08 && Math.abs(1 - x) < 0.002 && Math.abs(v) < 0.02) break; }
    const n = Math.min(48, pts.length), out = [];
    for (let i = 1; i < n; i++) out.push(pts[Math.floor((i / n) * pts.length)].toFixed(4));
    return (cache[key] = { easing: hasLinear ? `linear(0, ${out.join(', ')}, 1)` : 'cubic-bezier(.22,1,.36,1)', duration: Math.round(t * 1000) });
  };
  End.springEase = spring;

  // ---------- Rolling Digits: each digit that changes rolls out and the new one springs in ----------
  const cell = (ch) => { const c = document.createElement('span'); c.className = 'rd-c' + (/\d/.test(ch) ? '' : ' sep'); if (ch !== '') { const g = document.createElement('span'); g.className = 'rd-g'; g.textContent = ch; c.appendChild(g); } return c; };
  const swap = (c, ch, up) => {
    const old = c.querySelector('.rd-g:not(.out)');
    if (old) { old.classList.add('out'); old.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${up ? -0.62 : 0.62}em) scale(.84)`, opacity: 0 }], { duration: 240, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.then(() => old.remove()).catch(() => {}); }
    const g = document.createElement('span'); g.className = 'rd-g'; g.textContent = ch; c.appendChild(g);
    const s = spring(0.42, 0.68);
    g.animate([{ transform: `translateY(${up ? 0.66 : -0.66}em) scale(.84)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: s.duration, easing: s.easing });
    c.classList.toggle('sep', !/\d/.test(ch));
  };
  End.setNum = (el, val) => {
    const next = String(val);
    if (!End.kit || End.reduced) { el._rd = null; el.classList.remove('rd'); el.textContent = next; return; }
    if (!el._rd || !el.querySelector('.rd-c')) {
      const prev = el.textContent; el.textContent = ''; el.classList.add('rd');
      el._rd = { text: prev, cells: [...prev].map((ch) => el.appendChild(cell(ch))) };
    }
    const st = el._rd; if (st.text === next) return;
    const num = (s) => parseFloat(s.replace(/[^\d.-]/g, '')) || 0, up = num(next) >= num(st.text);
    const a = [...st.text], b = [...next], out = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const oldCh = a[a.length - 1 - i], newCh = b[b.length - 1 - i];
      let c = st.cells[st.cells.length - 1 - i];
      if (newCh === undefined) { if (c) { const w = c.offsetWidth; c.querySelectorAll('.rd-g').forEach((g) => g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })); c.animate([{ width: w + 'px' }, { width: '0px' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished.then(() => c.remove()).catch(() => {}); } continue; }
      if (!c) { c = cell(''); el.prepend(c); }
      out.unshift(c);
      if (oldCh !== newCh) swap(c, newCh, up);
    }
    st.cells = out; st.text = next;
  };
  // the token balance rolls too
  const counter = P.counter;
  P.counter = (v) => { const c = counter(v), n = c.el.querySelector('b'); c.set = (x) => End.setNum(n, x.toLocaleString()); return c; };
  // ---------- Shimmer Button: a sheen sweeps across, and a soft light follows the pointer ----------
  const shimmer = (btn) => {
    btn.classList.add('k-shim');
    btn.insertAdjacentHTML('afterbegin', '<span class="k-glow" aria-hidden="true"></span><span class="k-sheen" aria-hidden="true"></span>');
    btn.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const r = btn.getBoundingClientRect(), k = r.width / btn.offsetWidth || 1; btn.style.setProperty('--gx', (e.clientX - r.left) / k + 'px'); btn.style.setProperty('--gy', (e.clientY - r.top) / k + 'px'); btn.style.setProperty('--go', 1); });
    btn.addEventListener('pointerleave', () => btn.style.setProperty('--go', 0));
  };

  // ---------- Spotlight: a soft light that follows the pointer across a card, and along its edge ----------
  // On desktop it follows the real pointer, and the drawn demo pointer too, so the demo shows it.
  const SPOT = '.offer, .r5-rev';
  const spot = (el) => { el.classList.add('k-spot'); el.insertAdjacentHTML('afterbegin', '<span class="k-light" aria-hidden="true"></span><span class="k-ring" aria-hidden="true"></span>'); };
  let spotFrame = 0;
  const spotAt = (x, y) => {
    if (!End.kit || !fine()) return;
    cancelAnimationFrame(spotFrame);
    spotFrame = requestAnimationFrame(() => {
      document.querySelectorAll('#stage .k-spot').forEach((el) => {
        const r = el.getBoundingClientRect(), k = r.width / el.offsetWidth || 1, pad = 40;
        const near = x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
        el.classList.toggle('lit', near);
        if (near) { el.style.setProperty('--sx', (x - r.left) / k + 'px'); el.style.setProperty('--sy', (y - r.top) / k + 'px'); }
      });
    });
  };
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') spotAt(e.clientX, e.clientY); }, { passive: true });

  // ---------- Border Beam: a light that travels the edge of the box offer while it waits ----------
  const beam = (el) => el.insertAdjacentHTML('afterbegin', '<span class="k-beam" aria-hidden="true"></span>');

  // ---------- Glass Card + Tilt Card: the prize tilts toward the pointer and catches the light ----------
  const PRIZES = new Set(); let pointer = { x: -1, y: -1 };
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  const look = End.lookAt;
  End.lookAt = (x, y) => { look(x, y); pointer = { x, y }; spotAt(x, y); };
  (function tilt() {
    PRIZES.forEach((el) => {
      if (!el.isConnected) { PRIZES.delete(el); return; }
      const w = el.querySelector('.pitem-w'); if (!w) return;
      let rx = 0, ry = 0, hx = 50, hy = 30;
      if (End.kit && fine() && pointer.x >= 0) {
        const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = Math.max(-1, Math.min(1, (pointer.x - cx) / (r.width * 1.6))), dy = Math.max(-1, Math.min(1, (pointer.y - cy) / (r.height * 1.6)));
        ry = dx * 14; rx = -dy * 12; hx = 50 + dx * 30; hy = 30 + dy * 30;
      }
      const s = el._t || { rx: 0, ry: 0, hx: 50, hy: 30 }; s.rx += (rx - s.rx) * 0.12; s.ry += (ry - s.ry) * 0.12; s.hx += (hx - s.hx) * 0.12; s.hy += (hy - s.hy) * 0.12; el._t = s;
      w.style.transform = `perspective(500px) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`;
      el.style.setProperty('--hx', s.hx.toFixed(1) + '%'); el.style.setProperty('--hy', s.hy.toFixed(1) + '%');
    });
    requestAnimationFrame(tilt);
  })();

  // ---------- Segmented Control: a thumb that slides between the two lists, arrow keys included ----------
  const segmented = (seg) => {
    const btns = [...seg.querySelectorAll('button')], th = document.createElement('span'); th.className = 'k-thumb'; th.setAttribute('aria-hidden', 'true'); seg.prepend(th); seg.classList.add('k-seg');
    th.style.width = `calc((100% - 6px) / ${btns.length})`;
    let at = Math.max(0, btns.findIndex((b) => b.getAttribute('aria-selected') === 'true'));
    th.style.transform = `translateX(${at * 100}%)`;
    const go = (i) => { if (i === at) return; const s = spring(0.32, 0.86); th.animate([{ transform: `translateX(${at * 100}%)` }, { transform: `translateX(${i * 100}%)` }], { duration: s.duration, easing: s.easing, fill: 'forwards' }); at = i; };
    btns.forEach((b, i) => { b.addEventListener('click', () => go(i)); b.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const j = (i + d + btns.length) % btns.length; btns[j].focus(); btns[j].click(); }); });
  };

  // ---------- Animated List: rows fade and rise in a short stagger ----------
  const stagger = (host) => { [...host.children].forEach((c, i) => { c.style.setProperty('--i', Math.min(i, 14)); c.classList.remove('k-in'); void c.offsetWidth; c.classList.add('k-in'); }); };

  // ---------- Drawer: drag the sheet down to close it, with Apple's momentum projection ----------
  const project = (v, rate = 0.998) => ((v / 1000) * rate) / (1 - rate);
  const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));
  const drawer = (sh) => {
    const handle = document.createElement('div'); handle.className = 'k-handle'; handle.setAttribute('aria-hidden', 'true'); sh.prepend(handle);
    const zones = [handle, sh.querySelector('header'), sh.querySelector('.ps-grab')].filter(Boolean);
    let drag = null;
    const scale = () => { const r = sh.getBoundingClientRect(); return r.height / sh.offsetHeight || 1; };
    const set = (y) => { sh.style.translate = `0 ${y}px`; const scrim = sh.previousElementSibling; if (scrim && scrim.classList.contains('scrim')) scrim.style.opacity = String(Math.max(0, 1 - Math.max(0, y) / sh.offsetHeight)); };
    zones.forEach((z) => z.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      z.setPointerCapture(e.pointerId); sh.getAnimations().forEach((a) => { if (a.effect && a.effect.getKeyframes().some((k) => k.translate)) a.cancel(); });
      const k = scale(); drag = { y0: e.clientY, k, hist: [{ y: 0, t: performance.now() }], y: 0 }; sh.classList.add('dragging');
    }));
    const move = (e) => { if (!drag) return; const raw = (e.clientY - drag.y0) / drag.k; drag.y = raw < 0 ? rubber(raw, sh.offsetHeight) : raw; set(drag.y); drag.hist.push({ y: drag.y, t: performance.now() }); if (drag.hist.length > 6) drag.hist.shift(); };
    const up = () => {
      if (!drag) return; const d = drag; drag = null; sh.classList.remove('dragging');
      const a = d.hist[0], b = d.hist[d.hist.length - 1], v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0;
      const end = d.y + project(v), h = sh.offsetHeight, scrim = sh.previousElementSibling;
      if (end > h * 0.4) {
        const dur = Math.max(180, Math.min(380, ((h - d.y) / Math.max(600, v)) * 1000));
        sh.animate([{ translate: `0 ${d.y}px` }, { translate: `0 ${h + 20}px` }], { duration: dur, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards' }).finished.then(() => { sh.remove(); if (sh._restore) sh._restore(); if (scrim && scrim.classList.contains('scrim')) scrim.remove(); }).catch(() => {});
        if (scrim) scrim.animate([{ opacity: scrim.style.opacity || 1 }, { opacity: 0 }], { duration: dur, fill: 'forwards' });
      } else {
        const s = spring(0.3, 0.8); sh.animate([{ translate: `0 ${d.y}px` }, { translate: '0 0px' }], { duration: s.duration, easing: s.easing }); sh.style.translate = ''; if (scrim) scrim.style.opacity = '';
      }
    };
    sh.addEventListener('pointermove', move); sh.addEventListener('pointerup', up); sh.addEventListener('pointercancel', up);
    // the lists inside arrive in a stagger, and again each time the segment changes
    sh.querySelectorAll('.tab').forEach((t) => { if (!t.hidden) stagger(t); });
    sh.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { const t = sh.querySelector(`.tab[data-t="${b.dataset.t}"]`); if (t) stagger(t); sh.querySelector('.body').scrollTop = 0; }));
  };

  // ---------- Burst (confetti): pieces that fly out at a real moment, fall and flutter, then stop ----------
  // Ported from Burst (33152): radial pop, Burst's drag and gravity, a loop that stops when the last piece is
  // gone. Added: cannons from the bottom corners, ribbons that flip as they fall, Sparkles Text's star as a
  // shape, and gold token discs for the token moment.
  const CF = { c: null, x: null, parts: [], raf: 0, last: 0 };
  const STAR = new Path2D('M9.8.8c.2-.6 1.1-.6 1.4 0l.7 1.9c.5 1.5.5 3.7 1.6 4.8s3.3 1.1 4.8 1.6l1.9.7c.6.2.6 1.1 0 1.4l-1.9.7c-1.5.5-3.7.5-4.8 1.6s-1.1 3.3-1.6 4.8l-.7 1.9c-.2.6-1.1.6-1.4 0l-.7-1.9c-.5-1.5-.5-3.7-1.6-4.8S4.2 12.4 2.7 11.9L.8 11.2c-.6-.2-.6-1.1 0-1.4l1.9-.7c1.5-.5 3.7-.5 4.8-1.6S8.6 4.2 9.1 2.7Z');
  const GOLD = ['#f5c84f', '#fbe08a', '#e2a93a'];
  const palette = () => { const cs = getComputedStyle(root), v = (k) => cs.getPropertyValue(k).trim(); return [v('--accent'), v('--accent'), v('--t1'), v('--t2'), GOLD[0], GOLD[1], v('--text')].filter(Boolean); };
  const stageEl = () => document.getElementById('stage');
  const surface = () => {
    const st = stageEl(); if (!CF.c || !CF.c.isConnected) { CF.c = document.createElement('canvas'); CF.c.className = 'k-confetti'; CF.c.setAttribute('aria-hidden', 'true'); st.appendChild(CF.c); CF.x = CF.c.getContext('2d'); CF.parts = []; }
    const dpr = Math.min(2, devicePixelRatio || 1), w = st.clientWidth, h = st.clientHeight;
    if (CF.c.width !== Math.round(w * dpr) || CF.c.height !== Math.round(h * dpr)) { CF.c.width = Math.round(w * dpr); CF.c.height = Math.round(h * dpr); }
    CF.w = w; CF.h = h; CF.dpr = dpr;
  };
  // where an element sits on the stage, in the stage's own (unscaled) pixels
  const at = (el) => { const st = stageEl(), s = st.getBoundingClientRect(), k = s.width / st.clientWidth || 1, r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k }; };
  const piece = (x, y, vx, vy, cols, shapes) => {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    return { x, y, vx, vy, shape, color: cols[Math.floor(Math.random() * cols.length)], size: shape === 'star' ? 9 + Math.random() * 7 : shape === 'coin' ? 7 + Math.random() * 4 : 6 + Math.random() * 6, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 14, flip: Math.random() * 6.28, flipV: 6 + Math.random() * 8, sway: Math.random() * 6.28, life: 1.6 + Math.random() * 1.4, age: 0 };
  };
  const tick = (t) => {
    const dt = Math.min(0.033, (t - CF.last) / 1000 || 0.016); CF.last = t;
    if (!CF.c || !CF.c.isConnected) { CF.parts = []; CF.raf = 0; return; }
    const g = CF.x, { w, h, dpr } = CF, grav = 900 * (h / 844); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    CF.parts = CF.parts.filter((p) => {
      if (p.wait > 0) { p.wait -= dt; return true; }
      p.age += dt; if (p.age > p.life || p.y - p.size > h) return false;
      p.vy += grav * dt; p.vx *= 1 - 1.2 * dt; if (p.vy > 0) p.vy *= 1 - 2.2 * dt;
      p.sway += dt * 3; p.x += (p.vx + (p.vy > 0 ? Math.sin(p.sway) * 30 : 0)) * dt; p.y += p.vy * dt; p.rot += p.spin * dt; p.flip += p.flipV * dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, (p.life - p.age) * 1.6, p.age * 12);
      if (p.shape === 'ribbon') { g.scale(1, Math.cos(p.flip)); g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
      else if (p.shape === 'dot') { g.fillStyle = p.color; g.beginPath(); g.arc(0, 0, p.size / 3, 0, 6.28); g.fill(); }
      else if (p.shape === 'star') { const k = p.size / 21; g.scale(k, k); g.translate(-10.5, -10.5); g.fillStyle = p.color; g.fill(STAR); }
      else { const r = p.size / 2; g.scale(Math.cos(p.flip), 1); g.fillStyle = '#c58718'; g.beginPath(); g.arc(0, 0, r, 0, 6.28); g.fill(); g.fillStyle = '#f5c84f'; g.beginPath(); g.arc(0, 0, r * 0.74, 0, 6.28); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-r * 0.25, -r * 0.3, r * 0.22, 0, 6.28); g.fill(); }
      g.restore(); return true;
    });
    CF.raf = CF.parts.length ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!CF.raf) { CF.last = performance.now(); CF.raf = requestAnimationFrame(tick); } };
  const s = () => CF.h / 844;
  const pop = (x, y, n, power, cols, shapes) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = power * s() * (0.45 + Math.random() * 0.55); CF.parts.push(piece(x, y, Math.cos(a) * v, Math.sin(a) * v - power * s() * 0.35, cols, shapes)); } };
  // a cannon aims at a point: just enough speed to carry its pieces up past it, whatever the screen's shape
  const cannon = (x, y, tx, ty, spread, n, cols, shapes) => { const grav = 900 * s(), rise = Math.max(120, y - ty + 80), dx = tx - x, deg = (Math.atan2(-rise, dx * 1.25) * 180) / Math.PI, power = Math.sqrt(2 * grav * rise) / Math.sin((Math.abs(deg) * Math.PI) / 180) * 1.12; for (let i = 0; i < n; i++) { const a = ((deg + (Math.random() - 0.5) * spread) * Math.PI) / 180, v = power * (0.62 + Math.random() * 0.42); const p = piece(x + (Math.random() - 0.5) * 30, y, Math.cos(a) * v, Math.sin(a) * v, cols, shapes); p.life += 0.8; p.wait = Math.random() * 0.22; CF.parts.push(p); } };
  const PARTY = ['ribbon', 'ribbon', 'ribbon', 'dot', 'star'];
  End.confetti = (kind, el) => {
    if (!End.kit || End.reduced || !el || !el.isConnected) return;
    surface(); const o = at(el), cols = palette(), W = CF.w, H = CF.h;
    if (kind === 'score' || kind === 'companion') {
      // the big one: both bottom corners fire up and in, and a pop from the moment itself
      cannon(-6, H + 6, o.x, o.y, 34, 70, cols, PARTY); cannon(W + 6, H + 6, o.x, o.y, 34, 70, cols, PARTY);
      pop(o.x, o.y, 46, 620, cols, ['ribbon', 'star', 'star', 'dot']);
    } else if (kind === 'prize') pop(o.x, o.y, 80, 760, cols, PARTY);
    else if (kind === 'wear') pop(o.x, o.y, 36, 520, cols, ['star', 'ribbon', 'dot']);
    else if (kind === 'level') pop(o.x, o.y, 22, 380, cols, ['star', 'dot', 'ribbon']);
    else if (kind === 'tokens') pop(o.x, o.y, 22, 360, GOLD, ['coin', 'coin', 'star']);
    run();
  };

  // ---------- Animated Circular Progress Bar: the score as a gauge that fills with each right answer ----------
  // Ported from 21st.dev 920: two arcs with a gap between them, the value arc in the accent and the rest as a
  // track, each drawn with dash lengths in percent and eased with a CSS transition.
  const C = 2 * Math.PI * 45, PX = C / 100;
  const gauge = (big) => {
    const g = document.createElement('div'); g.className = 'k-gauge'; g.style.setProperty('--p', 0);
    g.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="g-rest" cx="50" cy="50" r="45"/><circle class="g-val" cx="50" cy="50" r="45"/></svg>`;
    big.replaceWith(g); g.appendChild(big); big.classList.add('in-gauge');
    return g;
  };
  const setGauge = (g, pct) => {
    const val = g.querySelector('.g-val'), rest = g.querySelector('.g-rest'), gap = pct > 0 && pct < 100 ? 5 : 0;
    val.style.strokeDasharray = `${Math.max(0, pct * PX)} ${C}`;
    rest.style.strokeDasharray = `${Math.max(0, (100 - pct - gap * 2) * PX)} ${C}`;
    rest.style.transform = `rotate(${-90 - gap * 3.6}deg) scaleY(-1)`;
    rest.style.opacity = pct >= 100 ? 0 : 1;
  };
  End.fx.score = (el, i, total) => {
    if (!End.kit) return; const big = el.closest('.big'); if (!big) return;
    const g = big.closest('.k-gauge') || gauge(big); setGauge(g, (i / total) * 100);
  };

  // ---------- Sparkles Text: small stars that appear, turn and fade around a line, for a while ----------
  // Ported from 21st.dev 874 (Magic UI): each star lives a short life at a random spot, then moves.
  const sparkle = (el, { n = 8, ms = 7000, cols = [GOLD[0], 'var(--accent)'] } = {}) => {
    if (End.reduced) return; const host = document.createElement('span'); host.className = 'k-spk'; while (el.firstChild) host.appendChild(el.firstChild); el.appendChild(host);
    const until = performance.now() + ms;
    for (let i = 0; i < n; i++) {
      const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 21 21'); sv.setAttribute('class', 'k-star'); sv.setAttribute('aria-hidden', 'true');
      sv.innerHTML = `<path d="M9.8.8c.2-.6 1.1-.6 1.4 0l.7 1.9c.5 1.5.5 3.7 1.6 4.8s3.3 1.1 4.8 1.6l1.9.7c.6.2.6 1.1 0 1.4l-1.9.7c-1.5.5-3.7.5-4.8 1.6s-1.1 3.3-1.6 4.8l-.7 1.9c-.2.6-1.1.6-1.4 0l-.7-1.9c-.5-1.5-.5-3.7-1.6-4.8S4.2 12.4 2.7 11.9L.8 11.2c-.6-.2-.6-1.1 0-1.4l1.9-.7c1.5-.5 3.7-.5 4.8-1.6S8.6 4.2 9.1 2.7Z" fill="${cols[i % cols.length]}"/>`;
      host.appendChild(sv);
      const live = () => {
        if (!sv.isConnected || performance.now() > until) { sv.remove(); return; }
        sv.style.left = `${-6 + Math.random() * 104}%`; sv.style.top = `${-30 + Math.random() * 130}%`; const sc = 0.3 + Math.random();
        sv.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(0) rotate(75deg)' }, { opacity: 1, transform: `translate(-50%,-50%) scale(${sc}) rotate(120deg)` }, { opacity: 0, transform: 'translate(-50%,-50%) scale(0) rotate(150deg)' }], { duration: 800, delay: Math.random() * 1400, fill: 'both' }).finished.then(live).catch(() => {});
      };
      live();
    }
  };

  // ---------- Blur In Text: the words arrive one at a time out of a soft blur ----------
  // Ported from 21st.dev 19228: each word fades in from blur(10px), staggered 40 ms.
  const blurIn = (el, delay = 0) => {
    if (End.reduced) return; const words = el.textContent.trim().split(/\s+/); el.textContent = '';
    words.forEach((w, i) => { const sp = document.createElement('span'); sp.className = 'k-word'; sp.textContent = w; el.appendChild(sp); if (i < words.length - 1) el.appendChild(document.createTextNode(' ')); sp.animate([{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(6px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 800, delay: delay + i * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); });
  };

  // ---------- Aurora: three soft lights drifting slowly behind the results and the new companion ----------
  // Ported from 21st.dev 35187: radial gradients moved with transforms only, no blur filter, no canvas.
  const aurora = (el) => { const a = document.createElement('div'); a.className = 'k-aurora'; a.setAttribute('aria-hidden', 'true'); a.innerHTML = '<span></span><span></span><span></span>'; el.prepend(a); };

  // ---------- the moments: what the celebration hooks do when the layer is on ----------
  End.fx.celebrate = (kind, el) => {
    if (!End.kit) return;
    End.confetti(kind, el);
    if (kind === 'score') { const g = el.closest('.k-gauge'); if (g) { g.classList.add('done'); const sp = spring(0.36, 0.5); g.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: Math.max(500, sp.duration), easing: 'cubic-bezier(.34,1.56,.64,1)' }); } const h = document.querySelector('#stage .r5-hero > .lbl'); if (h && !h.querySelector('.k-spk')) sparkle(h, { n: 9 }); }
    if (kind === 'tokens') { const pill = el.closest('.tokens') || el; pill.classList.remove('k-flash'); void pill.offsetWidth; pill.classList.add('k-flash'); }
    if (kind === 'companion') { const h = document.querySelector('#stage .unl h2'); if (h) sparkle(h, { n: 8 }); }
  };

  // ---------- applying the layer to whatever an ending puts on screen ----------
  const once = (el, key) => { if (el.dataset['k' + key]) return false; el.dataset['k' + key] = '1'; return true; };
  const all = (node, sel) => [...(node.matches && node.matches(sel) ? [node] : []), ...node.querySelectorAll(sel)];
  const enhance = (node) => {
    if (!End.kit || node.nodeType !== 1) return;
    all(node, '.cta, .boxbtn').forEach((b) => once(b, 'shim') && shimmer(b));
    all(node, SPOT).forEach((c) => once(c, 'spot') && spot(c));
    all(node, '.offer:not(.saved)').forEach((c) => once(c, 'beam') && beam(c));
    all(node, '.allsk .seg').forEach((s) => once(s, 'seg') && segmented(s));
    all(node, '.allsk').forEach((s) => once(s, 'drw') && drawer(s));
    all(node, '.prize').forEach((p) => { if (once(p, 'tilt')) { PRIZES.add(p); p.insertAdjacentHTML('beforeend', '<span class="k-spec" aria-hidden="true"></span>'); } });
    all(node, '.r5, .unl').forEach((r) => once(r, 'aur') && aurora(r));
    all(node, '.r5-hero > .lbl').forEach((h) => once(h, 'blur') && blurIn(h));
    all(node, '.unl h2').forEach((h) => once(h, 'blur') && blurIn(h, 350));
    all(node, '.unl .lbl').forEach((l) => once(l, 'pill') && l.classList.add('k-pill'));
    all(node, '.unl-stage').forEach((st) => once(st, 'badge') && st.insertAdjacentHTML('afterbegin', '<span class="k-medal" aria-hidden="true"></span>'));
  };
  addEventListener('DOMContentLoaded', () => {
    const stage = document.getElementById('stage');
    new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach(enhance))).observe(stage, { childList: true, subtree: true });
  });
})();
