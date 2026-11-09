/*
 * The picture of the day, full screen behind Today, like Momentum's daily photo.
 * Each day shows a different Karman painting, relit for the hour, with the
 * season's leaves, snow, petals or fireflies falling, and the weather on top.
 * Nothing moves inside the content box or behind the greeting. Holds still under
 * reduced motion.
 */
(() => {
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host = document.getElementById("backdrop");
  const pointer = { x: -999, y: -999, down: [] };
  addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  addEventListener("pointerdown", (e) => { if (!e.target.closest(".review,.nav,.panel,.top,button,a")) pointer.down.push([e.clientX, e.clientY]); }, { passive: true });
  const scene = () => window.SCENE();

  /* Karman's own paintings (landscapes.js), one a day. The founder picked these over museum art and photos (2026-11-08). */
  const PAINTINGS = (window.LANDSCAPES ? window.LANDSCAPES.titles : []).map((title, i) => ({ studio: i, title, by: "Painted by Karman" }));
  window.paintingOfTheDay = (offset = 0) => {
    const set = PAINTINGS, d = new Date(); d.setDate(d.getDate() + offset);
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    return set[day % set.length];
  };

  /* Areas where nothing should move: the greeting and the content box. */
  function keepOut() {
    return [".panel", ".top"].map((s) => document.querySelector(s)).filter(Boolean).map((el) => { const r = el.getBoundingClientRect(); return { l: r.left - 12, t: r.top - 12, r: r.right + 12, b: r.bottom + 12 }; });
  }
  const inside = (x, y, ks) => ks.some((k) => x > k.l && x < k.r && y > k.t && y < k.b);


  const wrap = document.createElement("div"); wrap.className = "bd-paint";
  const drawn = document.createElement("canvas"); drawn.className = "drawn";
  wrap.append(drawn); host.prepend(wrap);
  /* Opening: the painting is painted in stroke by stroke in 3.8 seconds. The greeting types along
     with it and the box arrives near the end. */
  /* Tells the page the opening is nearly done, once only. If the opening is cut short (a new
     picture starts mid-paint), it still tells, so the box always arrives. */
  let toldYet = false;
  const told = () => { if (toldYet) return; toldYet = true; dispatchEvent(new Event("paintdone")); };
  /* Tells the page how long the opening takes, so the greeting can finish typing with it. */
  const starting = (ms) => dispatchEvent(new CustomEvent("paintstart", { detail: { ms } }));
  let shownKey = "", painting = null, current = null, lifeFrom = 0;
  /* Karman's paintings follow the hour: dawn, day, sunset or night. */
  const TIME_OF = { morning: "dawn", day: "day", evening: "sunset", night: "night" };
  function show(p) {
    const time = TIME_OF[scene().band] || "day";
    const key = `${p.studio}:${time}`;
    if (key === shownKey) return;
    const first = !shownKey; shownKey = key;
    const animate = first && window.paintIn && !still();
    if (painting) { painting.stop(); told(); }
    lifeFrom = 0;
    const art = window.LANDSCAPES.render(p.studio, time);
    current = { art };
    if (first && animate) starting(3800);
    /* Once the painting is done, the scene comes to life. */
    painting = window.paintPicture(drawn, art, { animate, nearlyDone: first ? told : null, done: () => { painting = null; if (first && !animate) told(); window.LIFE.init(p.studio, time); lifeFrom = performance.now(); } });
  }
  addEventListener("resize", () => { if (!current || painting) return; window.paintPicture(drawn, current.art, { animate: false }); });
  const canvas = document.createElement("canvas"), g = canvas.getContext("2d"); host.append(canvas);
  let W = 0, H = 0, parts = [], lastSeason = "", drops = [], lastWeather = "";
  const resize = () => { canvas.width = W = innerWidth; canvas.height = H = innerHeight; };
  resize(); addEventListener("resize", resize);

  const KIND = { fall: { n: 34, col: ["#c8743a", "#a8502a", "#d9a04a"], fall: 26, size: [5, 9] }, winter: { n: 90, col: ["#ffffff"], fall: 30, size: [1.2, 2.8] }, spring: { n: 40, col: ["#f3c2d0", "#ffffff", "#e7a3b8"], fall: 18, size: [3, 6] }, summer: { n: 26, col: ["#f8e9a0"], fall: 0, size: [1.4, 2.4] } };
  const spawn = (k, x, y, burst) => { const s = KIND[k]; return { x: x ?? Math.random() * W, y: y ?? Math.random() * H, vx: burst ? (Math.random() - 0.5) * 240 : 0, vy: burst ? (Math.random() - 0.5) * 240 : 0, r: s.size[0] + Math.random() * (s.size[1] - s.size[0]), c: s.col[Math.floor(Math.random() * s.col.length)], a: Math.random() * 6.28, w: 0.5 + Math.random(), life: burst ? 2.4 : Infinity }; };

  function step(dt, t) {
    const sc = scene(), k = sc.season, s = KIND[k], ks = keepOut(), p = window.paintingOfTheDay(sc.dayOffset || 0);
    show(p);
    drawn.style.filter = "none";
    drawn.style.transform = `translate3d(${((pointer.x / innerWidth - 0.5) * -10).toFixed(1)}px,${((pointer.y / innerHeight - 0.5) * -5).toFixed(1)}px,0) scale(1.03)`;
    if (k !== lastSeason) { parts = Array.from({ length: s.n }, () => spawn(k)); lastSeason = k; }
    while (pointer.down.length) { const [x, y] = pointer.down.shift(); for (let i = 0; i < 12; i++) parts.push(spawn(k, x, y, true)); }
    g.clearRect(0, 0, W, H);
    if (current && lifeFrom) {
      /* Picture units to screen pixels, matching how the painting is cropped and nudged. */
      const kk = Math.max(W / 960, H / 600), ox = (W - 960 * kk) * 0.7, oy = (H - 600 * kk) * 0.4, tx = (pointer.x / innerWidth - 0.5) * -10, ty = (pointer.y / innerHeight - 0.5) * -5;
      const map = { X: (u) => W / 2 + (ox + u * 960 * kk - W / 2) * 1.03 + tx, Y: (v) => H / 2 + (oy + v * 600 * kk - H / 2) * 1.03 + ty, S: kk };
      window.LIFE.draw(g, dt, t, map, Math.min(1, (performance.now() - lifeFrom) / 1500));
    }
    const night = sc.band === "night" || sc.band === "evening";
    for (const q of parts) {
      const dx = q.x - pointer.x, dy = q.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < 9000) { const f = (9000 - d2) / 9000, d = Math.sqrt(d2 + 1); q.vx += (dx / d) * f * 600 * dt; q.vy += (dy / d) * f * 600 * dt; }
      q.vx *= 0.96; q.vy *= 0.96; q.a += dt * q.w;
      if (k === "summer") { q.x += (Math.cos(q.a * 0.7) * 14 + q.vx) * dt; q.y += (Math.sin(q.a) * 10 + q.vy) * dt; }
      else { q.x += (Math.sin(q.a) * 16 + 8 + q.vx) * dt; q.y += (s.fall * q.w + q.vy) * dt; }
      if (q.y > H + 10 || q.x > W + 10 || q.x < -30) { if (q.life !== Infinity) q.life = 0; else { q.y = -10; q.x = Math.random() * W; } }
      if (q.life !== Infinity) q.life -= dt;
      if (inside(q.x, q.y, ks)) continue;
      g.save(); g.translate(q.x, q.y); g.rotate(q.a);
      if (k === "summer") { g.globalAlpha = night ? 0.55 + 0.45 * Math.sin(t * 2 + q.w * 9) : 0.3; g.fillStyle = q.c; g.shadowColor = q.c; g.shadowBlur = 12; g.beginPath(); g.arc(0, 0, q.r, 0, 6.28); g.fill(); }
      else if (k === "winter") { g.globalAlpha = 0.85; g.fillStyle = q.c; g.beginPath(); g.arc(0, 0, q.r, 0, 6.28); g.fill(); }
      else { g.globalAlpha = 0.85; g.fillStyle = q.c; g.beginPath(); g.ellipse(0, 0, q.r, q.r * 0.45, 0, 0, 6.28); g.fill(); }
      g.restore();
    }
    parts = parts.filter((q) => q.life > 0);
    /* Weather, never over the greeting or the content box. */
    const w = sc.weather, dark = sc.theme !== "light";
    if (w !== lastWeather) { lastWeather = w; drops = Array.from({ length: w === "rain" ? 180 : w === "snow" ? 120 : 0 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 0.8, r: 0.8 + Math.random() * 2 })); }
    if (w === "clear") return;
    g.save(); g.beginPath(); g.rect(0, 0, W, H); for (const kk of ks) g.rect(kk.r, kk.t, kk.l - kk.r, kk.b - kk.t); g.clip("evenodd");
    if (w === "fog") {
      for (let i = 0; i < 5; i++) { const x = ((t * (12 + i * 6) + i * 420) % (W + 900)) - 450, y = H * (0.35 + i * 0.12); const fg = g.createRadialGradient(x, y, 0, x, y, 460); fg.addColorStop(0, dark ? "rgba(190,200,215,.18)" : "rgba(255,255,255,.5)"); fg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = fg; g.fillRect(x - 460, y - 460, 920, 920); }
    } else {
      g.strokeStyle = dark ? "rgba(200,212,235,.38)" : "rgba(50,70,100,.34)"; g.fillStyle = dark ? "rgba(255,255,255,.8)" : "rgba(110,130,160,.65)"; g.lineWidth = 1.1;
      for (const d of drops) {
        if (w === "rain") { d.y += 900 * d.v * dt; d.x += 120 * dt; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x - 3, d.y - 16 * d.v); g.stroke(); }
        else { d.y += 40 * d.v * dt; d.x += Math.sin(t + d.r * 3) * 16 * dt; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.28); g.fill(); }
        if (d.y > H + 20) { d.y = -20; d.x = Math.random() * W; }
        if (d.x > W + 20) d.x = -20;
      }
    }
    g.restore();
  }
  let last = performance.now();
  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (document.hidden || still()) return;
    step(dt, (now - t0) / 1000);
  }
  requestAnimationFrame(frame);
  window.redrawBackdrop = () => step(1 / 60, 20);
  if (still()) setTimeout(window.redrawBackdrop, 50);
})();
