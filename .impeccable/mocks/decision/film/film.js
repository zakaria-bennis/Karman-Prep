/* Karman home page (2026-10-25, second pass).
   One continuous film plays behind the page in real time; the page scrolls normally over it. White panels carry
   the reading; windows between them show the film still running. Main features come first, each with its
   product screen at the side of the page, then the test date, the guarantee, the campus films, the wall of
   student phones and the close. Shared pieces (copy, header, menu, pause, reveal) are in site.js. */
(function () {
  const K = window.KARMAN;
  const { M, esc, list, btn, phone, ROUTES, reduce, Q } = K;

  const action = (f) =>
    f.button
      ? `<div class="act">${btn(f.button, ROUTES.test)}${f["button note"] ? `<small>${esc(f["button note"])}</small>` : ""}</div>`
      : "";
  // the hero line, word by word, so it can rise in on arrival
  const kinetic = (s) =>
    esc(s)
      .split(" ")
      .map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");

  /* ---------- the features, most important first; each screen sits at the outer edge of the page ---------- */
  const FEATURES = [
    { n: 2, media: "wide", screen: "schedule", side: "right" },
    { n: 3, media: "wide", screen: "classPlan", side: "left" },
    { n: 4, media: "phone", screen: "daily10", side: "right", figure: "ten" },
    { n: 5, media: "phone", screen: "parent", side: "left" },
    { n: 6, media: "phone", screen: "wordline", side: "right", minor: true },
  ];
  // the product screens are drawn in code (screens.js), so they match the site and stay sharp at any size
  const SCR = (name) => (window.KARMAN_SCREENS?.[name] || (() => ""))();
  function feature(x) {
    const f = M(x.n);
    const media =
      x.media === "phone"
        ? `<div class="turn">${phone(SCR(x.screen), x.side === "left" ? "left" : "")}</div>`
        : `<figure class="wide" aria-hidden="true">${SCR(x.screen)}</figure>`;
    const note = f["card title"]
      ? `<p class="note"><b>${esc(f["card title"])}</b>${esc(f["card text"])}</p>`
      : "";
    const fig = x.figure
      ? `<div class="fig" data-fig="${x.figure}"><div class="hl"></div><span class="read" aria-live="polite"></span></div>`
      : "";
    return `<article class="feat ${x.side}${x.minor ? " minor" : ""} m-${x.media}" id="m-${x.n}">
      <div class="media rv" aria-hidden="true">${media}</div>
      <div class="words rv" style="--d:.1s">
        ${f.headline ? `<h2>${esc(f.headline)}</h2>` : ""}
        ${f["feature title"] || f["feature text"] ? `<p class="lede">${f["feature title"] ? `<b>${esc(f["feature title"])}</b> ` : ""}${esc(f["feature text"])}</p>` : ""}
        ${note}${fig}
      </div>
    </article>`;
  }

  /* ---------- the wall: 6 columns of 15 phones (3 of 10 on a phone), each column repeated once for a seamless loop ---------- */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function chat() {
    const bubbles = [];
    const n = 6 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const out = rnd() > 0.45;
      const lines = 1 + Math.floor(rnd() * 3);
      const ws = Array.from(
        { length: lines },
        (_, j) => `<i style="width:${j === lines - 1 ? 40 + rnd() * 50 : 100}%"></i>`
      ).join("");
      bubbles.push(
        `<span class="b ${out ? "out" : "in"}${out && rnd() > 0.82 ? " k" : ""}" style="width:${46 + rnd() * 28}%">${ws}</span>`
      );
    }
    const t = (16 + rnd() * 14).toFixed(1),
      dl = (-rnd() * 30).toFixed(1);
    return `<div class="screen chat"><div class="top"><span class="av"></span><span class="nm"></span></div><div class="feed"><div class="thread" style="--t:${t}s;--dl:${dl}s">${bubbles.join("")}${bubbles.join("")}</div></div></div>`;
  }
  const narrow = matchMedia("(max-width: 760px)").matches;
  const COLS = narrow ? 3 : 6,
    PER = narrow ? 10 : 15;
  const wall = Array.from({ length: COLS }, (_, c) => {
    const phones = Array.from({ length: PER }, () => phone(chat())).join("");
    const off = [0, -38, -12, -52, -24, -44][c]; // percent of a phone's height: the stagger (margins resolve against width, so x 163.4 / 78)
    return `<div class="col" style="--t:${(narrow ? 70 : 110) + c * 9}s;--off:${(off * 2.095).toFixed(1)}%">${phones}${phones}</div>`;
  }).join("");

  /* ---------- the page ---------- */
  const hero = M(1),
    date = M(7),
    g = M(8),
    campus = M(9),
    msgs = M(10),
    voices = M(12),
    end = M(11);
  /* Testimonials: real ones only, added by the founder in copy.js section 12 ("the words = name, who they are").
     They sit inside the Student messages panel, under the wall, and the block is left out while there are none. */
  const quotes = Object.keys(voices)
    .filter((k) => /^quote\b/.test(k) && voices[k])
    .sort()
    .map((k) => {
      const [words, who = ""] = voices[k].split(" = ");
      const [name, ...role] = who.split(",");
      return `<figure class="vq rv"><blockquote><p>\u201c${esc(words.trim())}\u201d</p></blockquote>${who ? `<figcaption><b>${esc(name.trim())}</b>${role.length ? `<span>${esc(role.join(",").trim())}</span>` : ""}</figcaption>` : ""}</figure>`;
    });
  const voicesHTML = quotes.length
    ? `<div class="in voices" id="m-12">
      ${voices.headline ? `<h2 class="rv" id="v-h">${esc(voices.headline)}</h2>` : ""}
      ${voices.format ? `<p class="vfmt rv">${esc(voices.format)}</p>` : ""}
      <div class="vgrid">${quotes.join("")}</div>
    </div>`
    : "";
  const CAMPUS = ["c8a", "c8b", "c8c"];
  document.getElementById("main").innerHTML = `
  <section class="window hero" id="m-1">
    <div class="in">
      <h1>${kinetic(hero.headline)}</h1>
      ${hero.text ? `<p class="lede rv" style="--d:.45s">${esc(hero.text)}</p>` : ""}
      <div class="rv" style="--d:.6s">${action(hero)}</div>
      ${hero.proof ? `<p class="proof rv" style="--d:.75s">${esc(hero.proof)}</p>` : ""}
    </div>
    <span class="cue" aria-hidden="true"></span>
  </section>

  <section class="panel features" id="features">
    <div class="in">${FEATURES.map(feature).join("")}</div>
  </section>

  <section class="window statement" id="m-7">
    <div class="in">
      ${date.headline ? `<h2 class="rv">${esc(date.headline)}</h2>` : ""}
      ${
        date["card date"]
          ? `<div class="datecard rv" style="--d:.15s">
        ${date["card intro"] ? `<p class="i">${esc(date["card intro"])}</p>` : ""}
        <p class="d">${esc(date["card date"])}</p>
        ${date["card later"] ? `<p class="l">${esc(date["card later"])}</p>` : ""}
        ${date["card link"] ? `<a class="lk" href="#m-8">${esc(date["card link"])}${K.ARROW}</a>` : ""}
      </div>`
          : ""
      }
    </div>
  </section>

  <section class="panel dark guarantee" id="m-8" aria-labelledby="g-h">
    <div class="in">${K.guarantee(g, "g-h")}</div>
  </section>

  <section class="panel dark campus" id="m-9"${campus.headline ? ' aria-labelledby="c-h"' : ' aria-hidden="true"'}>
    ${campus.headline ? `<h2 class="rv" id="c-h">${esc(campus.headline)}</h2>` : ""}
    <div class="tri">${CAMPUS.map(
      (id, k) =>
        `<div class="clip rv" style="--d:${k * 0.12}s"><video muted playsinline preload="none" poster="${id}-r${reduce ? "" : "0"}.jpg" data-src="${id}-r.mp4" aria-hidden="true"></video></div>`
    ).join("")}</div>
  </section>

  <section class="panel messages" id="m-10">
    ${msgs.headline ? `<div class="in"><h2 class="rv">${esc(msgs.headline)}</h2></div>` : ""}
    <div class="wall" aria-hidden="true"><div class="tilt">${wall}</div></div>
    ${voicesHTML}
  </section>

  <section class="window end" id="m-11">
    <div class="in">
      <h2 class="rv">${esc(end.headline)}</h2>
      ${end.text ? `<p class="lede rv" style="--d:.1s">${esc(end.text)}</p>` : ""}
      ${end.objection ? `<p class="obj rv" style="--d:.15s">${esc(end.objection)}</p>` : ""}
      <div class="rv" style="--d:.2s">${action(end)}</div>
    </div>
    ${end["line note"] ? `<div class="kline rv" style="--d:.35s"><span class="bar" aria-hidden="true"></span><p>${esc(end["line note"])}</p></div>` : ""}
  </section>`;

  /* ---------- the film behind the page ---------- */
  const stage = document.querySelector(".stage");
  const day = stage.querySelector(".day"),
    edge = stage.querySelector(".edge");
  const sfx = matchMedia("(max-width: 760px) and (orientation: portrait)").matches ? "-p" : "";
  day.poster = `day${sfx}.jpg`;
  edge.poster = `c9${sfx}.jpg`;
  if (!reduce) {
    day.src = `day${sfx}.mp4`;
    edge.src = `c9${sfx}.mp4`;
  }
  // the orb shows only when the film takes longer than 400 ms to arrive
  let waitT = 0,
    slowT = 0,
    orbStop = null,
    orbT = 0;
  const orbCanvas = stage.querySelector(".orb");
  stage.querySelector(".late").textContent = K.site["loading film"] || "";
  const waitOn = () => {
    clearTimeout(waitT);
    waitT = setTimeout(() => {
      stage.classList.add("waiting");
      clearTimeout(orbT);
      if (!orbStop && window.KIT)
        orbStop = KIT.orb(orbCanvas, { size: 64, dark: true, state: "waiting" });
      slowT = setTimeout(() => stage.classList.add("slow"), 2100);
    }, 400);
  };
  const waitOff = () => {
    clearTimeout(waitT);
    clearTimeout(slowT);
    stage.classList.remove("waiting", "slow");
    // let the orb fade out before its loop stops
    orbT = setTimeout(() => {
      orbStop?.();
      orbStop = null;
    }, 450);
  };
  const seen = new Set(); // windows on screen
  let ending = false;
  const cur = () => (ending ? edge : day);
  const want = () => !reduce && !K.paused && !document.hidden && seen.size > 0;
  [day, edge].forEach((v) => {
    v.addEventListener("waiting", () => v === cur() && want() && waitOn());
    v.addEventListener("playing", waitOff);
    v.addEventListener("pause", waitOff);
  });
  let swapT = 0;
  function sync() {
    if (reduce) return;
    const on = cur(),
      off = ending ? day : edge;
    if (want()) {
      if (on.paused) {
        if (on.readyState < 3) waitOn();
        on.play().catch(() => {});
      }
    } else {
      on.pause();
      waitOff();
    }
    // the other film keeps going through the 1.4 s crossfade, then rests
    clearTimeout(swapT);
    swapT = setTimeout(() => off.pause(), 1500);
  }
  const motionBtn = document.querySelector(".motion");
  let campusSeen = false;
  const syncMotionBtn = () => motionBtn?.classList.toggle("away", seen.size === 0 && !campusSeen);
  new IntersectionObserver((es) =>
    es.forEach((e) => {
      campusSeen = e.isIntersecting;
      syncMotionBtn();
    })
  ).observe(document.getElementById("m-9"));
  const wio = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    syncMotionBtn();
    sync();
  });
  document.querySelectorAll(".window").forEach((w) => wio.observe(w));
  document.addEventListener("visibilitychange", sync);
  const close = document.getElementById("m-11");
  new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting === ending) return;
        ending = e.isIntersecting;
        if (ending && edge.ended) edge.currentTime = 0;
        stage.classList.toggle("ending", ending);
        sync();
      }),
    { threshold: 0.3 }
  ).observe(close);
  new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (edge.preload = "auto")), {
    rootMargin: "120% 0px",
  }).observe(close);

  /* ---------- the haze: while paper covers most of the screen, the film behind lifts toward the paper's tone ---------- */
  const lightPanels = [...document.querySelectorAll(".panel:not(.dark)")];
  const ratio = new Map();
  const hio = new IntersectionObserver(
    (es) => {
      es.forEach((e) => ratio.set(e.target, e.intersectionRect.height / innerHeight));
      const cover = [...ratio.values()].reduce((a, b) => a + b, 0);
      stage.classList.toggle("hazy", cover > 0.45);
    },
    { threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
  );
  lightPanels.forEach((p) => hio.observe(p));

  /* ---------- campus films: each plays once when it comes on screen, one after another ---------- */
  const cvids = [...document.querySelectorAll(".campus video")];
  const cio = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        const v = e.target;
        clearTimeout(v._t);
        if (e.isIntersecting && !reduce && !K.paused) {
          if (!v.src) v.src = v.dataset.src;
          if (v.ended) v.currentTime = 0;
          v._t = setTimeout(() => v.play().catch(() => {}), cvids.indexOf(v) * 260);
        } else v.pause();
      }),
    { threshold: 0.45 }
  );
  cvids.forEach((v) => cio.observe(v));
  new IntersectionObserver(
    (es) =>
      es.forEach(
        (e) =>
          e.isIntersecting && !reduce && cvids.forEach((v) => !v.src && (v.src = v.dataset.src))
      ),
    { rootMargin: "80% 0px" }
  ).observe(document.getElementById("m-9"));

  /* ---------- the wall moves only while it is on screen and the films are not paused ---------- */
  const wallEl = document.querySelector(".wall");
  let wallSeen = false;
  const wallSync = () => wallEl.classList.toggle("still", !wallSeen || K.paused);
  new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        wallSeen = e.isIntersecting;
        wallSync();
      }),
    { rootMargin: "10% 0px" }
  ).observe(wallEl);
  wallSync();

  document.addEventListener("karman:motion", () => {
    sync();
    wallSync();
    cvids.forEach((v) => {
      const r = v.getBoundingClientRect();
      if (K.paused) v.pause();
      else if (r.top < innerHeight && r.bottom > 0 && !v.ended) v.play().catch(() => {});
    });
  });

  /* ---------- the Daily 10 drawing (ten.js, our own): the tile under your finger lifts, its neighbours follow ---------- */
  document.querySelectorAll('[data-fig="ten"]').forEach((h) => window.karmanTen?.(h));

  // the first visit's opening (kit.js): the wordmark and the line, only while the first picture isn't ready yet
  if (!Q.has("rec") && !Q.has("m")) window.KIT?.opening(day.poster, K.site.logo);

  K.init();

  /* the copy editor's preview opens at a section: ?m=N */
  const mq = +Q.get("m");
  const t = mq && document.getElementById(`m-${mq}`);
  if (t) {
    t.scrollIntoView({ block: t.classList.contains("feat") ? "center" : "start" });
    t.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
  }
})();
