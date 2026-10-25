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
    { n: 2, media: "wide", src: "img/schedule.webp", side: "right" },
    { n: 3, media: "wide", src: "img/review.webp", side: "left" },
    { n: 4, media: "phone", src: "img/daily10.webp", side: "right", figure: "ten" },
    { n: 5, media: "phone", src: "img/parent-update.webp", side: "left" },
    { n: 6, media: "phone", src: "img/word-game.webp", side: "right", minor: true },
  ];
  function feature(x) {
    const f = M(x.n);
    const media =
      x.media === "phone"
        ? `<div class="turn">${phone(`<img src="${x.src}" alt="" loading="lazy" decoding="async">`, x.side === "left" ? "left" : "")}</div>`
        : `<figure class="wide"><img src="${x.src}" alt="" decoding="async"></figure>`;
    const note = f["card title"]
      ? `<p class="note"><b>${esc(f["card title"])}</b>${esc(f["card text"])}</p>`
      : "";
    const fig = x.figure
      ? `<div class="fig" data-fig="${x.figure}"><div class="hl"></div><span class="read" aria-live="polite"></span></div>`
      : "";
    return `<article class="feat ${x.side}${x.minor ? " minor" : ""} ${x.media}" id="m-${x.n}">
      <div class="media rv">${media}</div>
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
    return `<div class="col" style="--t:${(narrow ? 70 : 110) + c * 9}s">${phones}${phones}</div>`;
  }).join("");

  /* ---------- the page ---------- */
  const hero = M(1),
    date = M(7),
    g = M(8),
    campus = M(9),
    msgs = M(10),
    end = M(11);
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
    <div class="in">
      <div class="g-top">
        <div>
          ${g.eyebrow ? `<p class="eyebrow rv">${esc(g.eyebrow)}</p>` : ""}
          <h2 class="rv" id="g-h">${esc(g.headline)}</h2>
          ${g.text ? `<p class="lede rv" style="--d:.1s">${esc(g.text)}</p>` : ""}
        </div>
        ${g.promise ? `<div class="promise rv" style="--d:.2s"><span class="big" aria-hidden="true">+50</span><p>${esc(g.promise)}</p></div>` : ""}
      </div>
      <div class="sides">
        <div class="side-list rv"><h3>${esc(g["we do title"])}</h3><ol>${list(g["we do"])
          .map((x) => `<li>${esc(x)}</li>`)
          .join("")}</ol></div>
        <div class="side-list you rv" style="--d:.1s"><h3>${esc(g["you do title"])}</h3><ol>${list(
          g["you do"]
        )
          .map((x) => `<li>${esc(x)}</li>`)
          .join("")}</ol></div>
      </div>
      ${g.note || g.link ? `<div class="g-foot rv">${g.note ? `<p>${esc(g.note)}</p>` : ""}${g.link ? `<a class="lk" href="${ROUTES.guarantee}">${esc(g.link)}${K.ARROW}</a>` : ""}</div>` : ""}
    </div>
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
  </section>

  <section class="window end" id="m-11">
    <div class="in">
      <h2 class="rv">${esc(end.headline)}</h2>
      ${end.text ? `<p class="lede rv" style="--d:.1s">${esc(end.text)}</p>` : ""}
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
  let waitT = 0;
  const waitOn = () => {
    clearTimeout(waitT);
    waitT = setTimeout(() => stage.classList.add("waiting"), 400);
  };
  const waitOff = () => {
    clearTimeout(waitT);
    stage.classList.remove("waiting");
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
  const wio = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
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

  /* ---------- the Daily 10 figure (Hairline): the tile under your finger lifts, its neighbours follow ---------- */
  window.hairline = (figure) => {
    const host = document.querySelector(`[data-fig="${figure.name}"]`);
    if (!host || !window.HL) return;
    HL.inject(document);
    const st = host.querySelector(".hl");
    st.setAttribute("data-hairline", figure.name);
    st.setAttribute("role", "img");
    st.setAttribute("aria-label", figure.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, st);
    const out = host.querySelector(".read");
    let text = "";
    const read = {
      get textContent() {
        return text;
      },
      set textContent(v) {
        text = v == null ? "" : String(v);
        out.textContent = text === "rest" ? "" : text;
        host.classList.toggle("live", text !== "rest" && text !== "");
      },
    };
    figure.mount({ stage: st, svg, read }, figure.range[1]);
    // a slow lap while it is on screen, for hands that cannot hover; a real pointer takes over at once
    let lap = null;
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting && !lap && !reduce) lap = HL.tour(st, figure.tour || HL.LAP);
          else if (!e.isIntersecting && lap) {
            lap.stop();
            lap = null;
          }
        }),
      { threshold: 0.6 }
    ).observe(st);
  };
  const hs = document.createElement("script");
  hs.src = "hairline/ten.js";
  document.body.append(hs);

  K.init();

  /* the copy editor's preview opens at a section: ?m=N */
  const mq = +Q.get("m");
  const t = mq && document.getElementById(`m-${mq}`);
  if (t) {
    t.scrollIntoView({ block: t.classList.contains("feat") ? "center" : "start" });
    t.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
  }
})();
