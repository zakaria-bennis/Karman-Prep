/*
 * Painted home mock: the theme switch, the phone menu, the painting of the day painted in behind the page
 * (painterly.js, 3.8 seconds, Bob Ross's order), life in the painting once it is finished (life.js), and the
 * campus films. Nothing moves behind words: while the painting goes on, the panels are solid, and life is
 * erased from every panel's area on every frame. Under reduced motion everything holds still.
 *
 * Review switches in the address bar: ?scene=0 to 9 (which painting), ?time=dawn|day|sunset|night,
 * ?theme=light|dark, ?still (no painting in, no life).
 */
(() => {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const still = () => reduce.matches || params.has("still");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* the page still works */ } },
  };

  /* ---------- Theme: the device's until the visitor picks one, then theirs, remembered ---------- */
  const themeBtn = document.getElementById("theme");
  const device = matchMedia("(prefers-color-scheme: dark)");
  const showTheme = () => themeBtn.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
  showTheme();
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    store.set("painted-home-theme", root.dataset.theme);
    showTheme();
  });
  device.addEventListener("change", () => {
    if (store.get("painted-home-theme") || params.get("theme")) return;
    root.dataset.theme = device.matches ? "dark" : "light";
    showTheme();
  });

  /* ---------- The phone menu ---------- */
  const menuBtn = document.getElementById("menu-btn"), menu = document.getElementById("menu");
  const setMenu = (open) => { menuBtn.setAttribute("aria-expanded", String(open)); menu.hidden = !open; };
  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ---------- Domain squares on the calendar: six levels each ---------- */
  document.querySelectorAll(".lv").forEach((el) => {
    const n = +el.dataset.lv;
    for (let i = 0; i < 6; i++) {
      const sq = document.createElement("i");
      sq.className = `sq ${i < n ? (i < 2 ? "l2" : i < 4 ? "l3" : "l4") : "l0"}`;
      el.append(sq);
    }
  });

  /* ---------- The campus films play once each, when they come on screen ---------- */
  const films = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    films.unobserve(e.target);
    if (still()) return;
    e.target.src = e.target.dataset.src;
    e.target.play().catch(() => { /* the poster stays */ });
  }), { threshold: 0.5 });
  document.querySelectorAll(".clip video").forEach((v) => films.observe(v));

  /* ---------- The painting of the day ---------- */
  const TIMES = ["dawn", "day", "sunset", "night"];
  function timeOfDay() {
    if (TIMES.includes(params.get("time"))) return params.get("time");
    const h = new Date().getHours();
    return h >= 22 || h < 5 ? "night" : h < 11 ? "dawn" : h < 17 ? "day" : "sunset";
  }
  function sceneOfDay() {
    const p = parseInt(params.get("scene"), 10);
    if (p >= 0 && p <= 9) return p;
    const d = new Date();
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5) % 10;
  }
  const paintCv = document.querySelector("#backdrop .paint");
  const lifeCv = document.querySelector("#backdrop .life");
  const lg = lifeCv.getContext("2d");
  const panels = [...document.querySelectorAll(".panel")];
  let scene = 0, time = "day", art = null, laidOut = { w: innerWidth, h: innerHeight }, busy = false, alive = false;

  /* Picture units (0 to 1 across and down the painting) to CSS pixels on the backdrop, matching how
     painterly.js crops the picture (cover, focused at 70% across and 40% down). */
  function picToScreen() {
    const W = lifeCv.clientWidth, H = lifeCv.clientHeight, pw = laidOut.w, ph = laidOut.h;
    const k = Math.max(pw / 960, ph / 600), ox = (pw - 960 * k) * 0.7, oy = (ph - 600 * k) * 0.4, sx = W / pw, sy = H / ph;
    return { X: (u) => (ox + u * 960 * k) * sx, Y: (v) => (oy + v * 600 * k) * sy, S: k * Math.min(sx, sy) };
  }
  function sizeLife() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    lifeCv.width = Math.round(lifeCv.clientWidth * dpr);
    lifeCv.height = Math.round(lifeCv.clientHeight * dpr);
    lg.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  /* Draws one frame of life, then erases it wherever a panel sits, with a margin around each. */
  function drawLife(dt, t) {
    const W = lifeCv.clientWidth, H = lifeCv.clientHeight;
    lg.clearRect(0, 0, W, H);
    window.LIFE.draw(lg, dt, t, picToScreen(), Math.min(1, (performance.now() - aliveFrom) / 1500));
    for (const el of panels) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -16 || r.top > H + 16) continue;
      lg.clearRect(r.left - 14, r.top - 14, r.width + 28, r.height + 28);
    }
  }
  let aliveFrom = 0, last = 0;
  const t0 = performance.now();
  function frame(now) {
    if (!alive) return;
    requestAnimationFrame(frame);
    if (document.hidden || still()) return;
    const dt = Math.min(0.033, (now - (last || now)) / 1000);
    last = now;
    drawLife(dt, (now - t0) / 1000);
  }
  function comeAlive() {
    window.LIFE.init(scene, time);
    aliveFrom = performance.now();
    sizeLife();
    if (still()) { aliveFrom -= 2000; drawLife(1 / 60, 20); return; }
    alive = true;
    requestAnimationFrame(frame);
  }
  function paint(animate) {
    laidOut = { w: innerWidth, h: innerHeight };
    root.classList.toggle("painting", animate);
    busy = true;
    window.paintPicture(paintCv, art, {
      animate,
      ms: 3800,
      done() {
        busy = false;
        root.classList.remove("painting");
        if (!alive) comeAlive();
      },
    });
  }
  function start() {
    if (!window.LANDSCAPES || !window.paintPicture || !window.LIFE) { root.classList.remove("painting"); return; }
    scene = sceneOfDay();
    time = timeOfDay();
    /* Phones and tablets get a smaller picture: it is painted over in brush strokes anyway, and it takes
       about half the time to make. Same 960 by 600 shape, so life's positions still line up. */
    art = Math.min(innerWidth, innerHeight) < 820 ? window.LANDSCAPES.render(scene, time, 640, 400) : window.LANDSCAPES.render(scene, time);
    document.getElementById("painting-title").textContent = window.LANDSCAPES.titles[scene].toLowerCase().replace(/^./, (c) => c.toUpperCase());
    /* Let the browser answer taps between making the picture and planning its strokes. */
    setTimeout(() => paint(!still()), 0);
  }
  /* A new width repaints the picture at once (no painting in). Height alone, as when a phone's address
     bar slides away, only stretches it, so scrolling never repaints. */
  let resizeT = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      sizeLife();
      if (!art || busy) return;
      if (Math.abs(innerWidth - laidOut.w) > 2 || Math.abs(innerHeight - laidOut.h) > laidOut.h * 0.25) paint(false);
      if (still()) drawLife(1 / 60, 20);
    }, 150);
  });
  reduce.addEventListener("change", () => { if (!still() && art && !alive) { alive = true; requestAnimationFrame(frame); } if (still()) { alive = false; drawLife(1 / 60, 20); } });

  /* Paint after the words are on screen, so the page never waits for the picture. */
  requestAnimationFrame(() => setTimeout(start, 30));
})();
