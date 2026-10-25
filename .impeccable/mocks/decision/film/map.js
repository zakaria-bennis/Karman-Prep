/* Our students: a map of the U.S. where students appear one by one, mostly in the five biggest metro areas,
   and each sends a line up and back down to one of 25 universities. Slow at first, then faster, then the view
   pulls out to the world and 20 more lines race in from India, Pakistan, Dubai, Morocco, Spain, Portugal and
   France to the top five. Then the lines keep a slow pulse. 80 lines inside the U.S., 20 from abroad.
   CONFIRM (founder): the counts, metros and countries must match real Karman students before launch. */
(function () {
  const K = window.KARMAN;
  const { M, esc, site, btn, ROUTES, reduce } = K;

  /* ---------- the page around the map ---------- */
  const end = M(11);
  document.getElementById("main").innerHTML = `
  <section class="mapstage" id="map" aria-labelledby="map-h">
    <canvas class="map" role="img" aria-label="${esc(site["map text"] || "")}"></canvas>
    <div class="maptext">
      ${site["map eyebrow"] ? `<p class="eyebrow rv">${esc(site["map eyebrow"])}</p>` : ""}
      <h1 class="rv" id="map-h" style="--d:.1s">${esc(site["map headline"])}</h1>
      ${site["map text"] ? `<p class="lede rv" style="--d:.2s">${esc(site["map text"])}</p>` : ""}
    </div>
    <button class="replay" type="button" hidden>${esc(site["map replay"] || "")}</button>
  </section>
  <section class="panel mapnext">
    <div class="in">
      ${end.text ? `<p class="lede rv">${esc(end.text)}</p>` : ""}
      ${end.button ? `<div class="act rv" style="--d:.1s">${btn(end.button, ROUTES.test)}${end["button note"] ? `<small>${esc(end["button note"])}</small>` : ""}</div>` : ""}
    </div>
  </section>`;
  K.init();

  /* ---------- the people and places ---------- */
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (v, a) => v + (rnd() - 0.5) * 2 * a;
  // [name, lon, lat, students]: the five biggest metro areas first, 50 of the 80
  const METROS = [
    ["New York", -73.98, 40.75, 16],
    ["Los Angeles", -118.25, 34.05, 12],
    ["Chicago", -87.65, 41.88, 8],
    ["Dallas", -96.8, 32.78, 7],
    ["Houston", -95.37, 29.76, 7],
    ["San Francisco Bay", -122.2, 37.6, 5],
    ["Boston", -71.06, 42.36, 4],
    ["Washington", -77.04, 38.9, 4],
    ["Atlanta", -84.39, 33.75, 3],
    ["Miami", -80.19, 25.76, 3],
    ["Seattle", -122.33, 47.61, 3],
    ["Austin", -97.74, 30.27, 2],
    ["Phoenix", -112.07, 33.45, 2],
    ["Philadelphia", -75.17, 39.95, 2],
    ["Denver", -104.99, 39.74, 1],
    ["Minneapolis", -93.27, 44.98, 1],
  ];
  // the 25 universities, the first five being the top five
  const UNIS = [
    ["Princeton", -74.651, 40.343],
    ["MIT", -71.094, 42.36],
    ["Harvard", -71.117, 42.377],
    ["Stanford", -122.17, 37.427],
    ["Yale", -72.922, 41.316],
    ["Caltech", -118.125, 34.138],
    ["Duke", -78.939, 36.001],
    ["Johns Hopkins", -76.62, 39.329],
    ["Northwestern", -87.675, 42.056],
    ["Penn", -75.193, 39.952],
    ["Cornell", -76.473, 42.453],
    ["Chicago", -87.6, 41.789],
    ["Brown", -71.403, 41.827],
    ["Columbia", -73.962, 40.808],
    ["Dartmouth", -72.288, 43.704],
    ["UCLA", -118.445, 34.069],
    ["UC Berkeley", -122.259, 37.872],
    ["Rice", -95.402, 29.717],
    ["Notre Dame", -86.235, 41.705],
    ["Vanderbilt", -86.803, 36.145],
    ["Carnegie Mellon", -79.943, 40.443],
    ["Michigan", -83.738, 42.278],
    ["WashU", -90.31, 38.648],
    ["Emory", -84.326, 33.79],
    ["Georgetown", -77.073, 38.908],
  ];
  const ABROAD = [
    ["Mumbai", 72.88, 19.08, 2],
    ["Delhi", 77.21, 28.61, 2],
    ["Bengaluru", 77.59, 12.97, 1],
    ["Karachi", 67.0, 24.86, 2],
    ["Lahore", 74.34, 31.55, 1],
    ["Dubai", 55.27, 25.2, 3],
    ["Casablanca", -7.59, 33.57, 2],
    ["Rabat", -6.84, 34.02, 1],
    ["Madrid", -3.7, 40.42, 1],
    ["Barcelona", 2.17, 41.39, 1],
    ["Lisbon", -9.14, 38.72, 1],
    ["Porto", -8.61, 41.15, 1],
    ["Paris", 2.35, 48.86, 1],
    ["Lyon", 4.84, 45.76, 1],
  ];
  // the order dots appear in: shuffled, so the big metros fill in among the rest
  const home = [];
  METROS.forEach(([, lon, lat, n]) => {
    for (let i = 0; i < n; i++) home.push([jit(lon, 0.7), jit(lat, 0.5)]);
  });
  home.sort(() => rnd() - 0.5);
  const away = [];
  ABROAD.forEach(([, lon, lat, n]) => {
    for (let i = 0; i < n; i++) away.push([jit(lon, 0.6), jit(lat, 0.4)]);
  });
  away.sort(() => rnd() - 0.5);

  /* ---------- the timeline (seconds) ---------- */
  const N = home.length; // 80
  const ZOOM_AT = 9.2,
    ZOOM_FOR = 1.35;
  const lines = [];
  home.forEach((p, i) => {
    const x = i / (N - 1);
    const pop = 1.4 + 7.1 * Math.pow(x, 0.48); // big gaps at first, then they pile in
    const uni = rnd() < 0.45 ? Math.floor(rnd() * 10) : Math.floor(rnd() * 25);
    lines.push({ from: p, to: uni, pop, go: pop + 0.3, dur: 1.7 - 1.0 * x, lift: 0.32 });
  });
  away.forEach((p, i) => {
    const pop = ZOOM_AT + ZOOM_FOR * 0.7 + i * 0.07;
    lines.push({ from: p, to: i % 5, pop, go: pop + 0.15, dur: 1.15, lift: 0.2, away: true });
  });
  const DONE = Math.max(...lines.map((l) => l.go + l.dur)) + 0.4;

  /* ---------- drawing ---------- */
  const stage = document.querySelector(".mapstage");
  const cv = stage.querySelector("canvas");
  const ctx = cv.getContext("2d");
  const replay = stage.querySelector(".replay");
  let W = 0,
    H = 0,
    dpr = 1,
    land = null,
    nation = null,
    states = null;
  const proj = d3.geoEqualEarth().rotate([12, 0]).precision(0.3);
  const path = d3.geoPath(proj, ctx);
  let fitUS = null,
    fitWorld = null;

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    if (!nation) return;
    const wide = W > 820;
    // the words sit top left on a wide screen and on top on a phone; the map takes the rest
    const box = wide
      ? [
          [W * 0.42, H * 0.14],
          [W - 30, H - 50],
        ]
      : [
          [14, H * 0.44],
          [W - 14, H - 70],
        ];
    // the lower 48 (the census outline also holds Alaska, Hawaii and the Pacific territories)
    proj.fitExtent(box, {
      type: "MultiPoint",
      coordinates: [
        [-124.8, 24.4],
        [-66.9, 49.4],
        [-124.8, 49.4],
        [-66.9, 24.4],
        [-97, 49.4],
      ],
    });
    fitUS = { s: proj.scale(), t: proj.translate() };
    proj.fitExtent(
      wide
        ? [
            [W * 0.36, H * 0.14],
            [W - 16, H - 30],
          ]
        : [
            [8, H * 0.46],
            [W - 8, H - 60],
          ],
      {
        // the part of the world the story covers: the U.S. to India
        type: "MultiPoint",
        coordinates: [
          [-126, 6],
          [84, 6],
          [-126, 58],
          [84, 58],
        ],
      }
    );
    fitWorld = { s: proj.scale(), t: proj.translate() };
  }

  const ease = d3.easeCubicInOut;
  function view(t) {
    const k = ease(Math.min(1, Math.max(0, (t - ZOOM_AT) / ZOOM_FOR)));
    const s = Math.exp(Math.log(fitUS.s) + (Math.log(fitWorld.s) - Math.log(fitUS.s)) * k);
    proj
      .scale(s)
      .translate([
        fitUS.t[0] + (fitWorld.t[0] - fitUS.t[0]) * k,
        fitUS.t[1] + (fitWorld.t[1] - fitUS.t[1]) * k,
      ]);
    return k;
  }
  const MARI = "235,162,31";
  // a line goes up and comes back down: a quadratic curve lifted by a share of its length
  function curve(a, b, lift) {
    const mx = (a[0] + b[0]) / 2,
      my = (a[1] + b[1]) / 2;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [mx, my - d * lift];
  }
  const at = (a, c, b, u) => [
    (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0],
    (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1],
  ];

  function draw(t) {
    if (!land || !fitUS) return; // the map data is still on its way
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const k = view(t);
    // land, the U.S. a shade lighter, state lines faint
    ctx.beginPath();
    path(land);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.beginPath();
    path(nation);
    ctx.fillStyle = "#262626";
    ctx.fill();
    ctx.beginPath();
    path(states);
    ctx.strokeStyle = `rgba(255,255,255,${0.07 * (1 - k) + 0.03})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    const U = UNIS.map(([, lon, lat]) => proj([lon, lat]));
    const hits = new Array(UNIS.length).fill(0);
    // the lines
    ctx.lineCap = "round";
    lines.forEach((l, i) => {
      if (t < l.go) return;
      const a = proj(l.from),
        b = U[l.to],
        c = curve(a, b, l.lift);
      const u = Math.min(1, (t - l.go) / l.dur);
      const e = 1 - Math.pow(1 - u, 2.2);
      const arrived = u >= 1;
      if (arrived) hits[l.to]++;
      const fade = arrived ? Math.max(l.away ? 0.42 : 0.24, 1 - (t - l.go - l.dur) * 0.9) : 1;
      ctx.beginPath();
      const steps = 28;
      for (let s = 0; s <= steps; s++) {
        const p = at(a, c, b, (s / steps) * e);
        s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.strokeStyle = `rgba(${MARI},${0.85 * fade})`;
      ctx.lineWidth = l.away ? 1.3 : 1;
      ctx.stroke();
      if (!arrived) {
        const h = at(a, c, b, e);
        ctx.beginPath();
        ctx.arc(h[0], h[1], 2.2, 0, 7);
        ctx.fillStyle = "#fff";
        ctx.fill();
      } else if (!reduce && t > DONE) {
        // after the run, a slow light keeps travelling each line
        const q = ((t - DONE) / 7 + i * 0.137) % 1;
        const h = at(a, c, b, q);
        ctx.beginPath();
        ctx.arc(h[0], h[1], 1.4, 0, 7);
        ctx.fillStyle = `rgba(${MARI},${Math.sin(q * Math.PI) * 0.9})`;
        ctx.fill();
      }
    });
    // the students: a dot that pops, with a ring that opens and fades
    lines.forEach((l) => {
      if (t < l.pop) return;
      const p = proj(l.from);
      const u = Math.min(1, (t - l.pop) / 0.45);
      const r = (l.away ? 2.4 : 2) * (u < 0.6 ? (u / 0.6) * 1.5 : 1.5 - ((u - 0.6) / 0.4) * 0.5);
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, 7);
      ctx.fillStyle = "#fff";
      ctx.fill();
      if (u < 1) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3 + u * 12, 0, 7);
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - u)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    // the universities: marigold rings that grow with every line that lands
    U.forEach((p, i) => {
      const top = i < 5;
      const r = (top ? 4 : 3) + Math.min(5, Math.sqrt(hits[i]) * 1.2);
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, 7);
      ctx.fillStyle = hits[i] ? `rgba(${MARI},.18)` : "rgba(255,255,255,.04)";
      ctx.fill();
      ctx.strokeStyle = hits[i] ? `rgb(${MARI})` : "rgba(255,255,255,.35)";
      ctx.lineWidth = top ? 1.6 : 1.1;
      ctx.stroke();
    });
  }

  /* ---------- the clock: runs while the map is on screen and the page isn't paused ---------- */
  let t = 0,
    last = 0,
    raf = 0,
    seen = false;
  const running = () => seen && !K.paused && !document.hidden && !reduce;
  function frame(now) {
    raf = 0;
    if (!running()) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    draw(t);
    if (t > DONE) replay.hidden = false;
    raf = requestAnimationFrame(frame);
  }
  const kick = () => {
    if (running() && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  new IntersectionObserver((es) => es.forEach((e) => ((seen = e.isIntersecting), kick())), {
    threshold: 0.25,
  }).observe(stage);
  document.addEventListener("karman:motion", kick);
  document.addEventListener("visibilitychange", kick);
  replay.addEventListener("click", () => {
    t = 0;
    replay.hidden = true;
    kick();
  });
  addEventListener("resize", () => {
    size();
    if (land) draw(reduce ? DONE + 1 : t);
  });

  Promise.all(
    ["vendor/map/land-110m.json", "vendor/map/states-10m.json"].map((u) =>
      fetch(u).then((r) => r.json())
    )
  ).then(([w, us]) => {
    land = topojson.feature(w, w.objects.land);
    nation = topojson.feature(us, us.objects.nation);
    states = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
    size();
    // fewer words of motion: show the whole story at once
    if (reduce) draw(DONE + 1);
    else {
      draw(0);
      kick();
    }
  });
  window.__map = { at: (s) => ((t = s), draw(s)), DONE };
})();
