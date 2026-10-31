/* Karman home page (2026-10-25, rebuilt 2026-10-31 for the October 30 offer).
   One continuous film plays behind the page in real time; the page scrolls normally over it. White panels carry
   the reading; windows between them show the film still running. Sections, in order, each read from copy.js by
   its number: 1 the opening, 4 Your Daily 10, 2 the tutors, 3 the calendar and tools, 5 parent updates,
   6 between sets, 8 the guarantee, 9 the campus film, 12 testimonials and 10 student messages (both render
   nothing while their copy is empty), 11 the close. Shared pieces (copy, header, menu, footer, reveal) are in
   site.js; the product screens in screens.js.

   HOW THE FILM LOADS (the speed strategy; the real site copies this exactly):
   1. The opening still paints first, as CSS. film.css paints day.jpg (or day-p.jpg on portrait phones under
      761px) as the .stage background through media queries, so a phone never downloads the desktop still, and
      the <video> elements carry no poster attribute at all. index.html preloads only the still its media query
      matches (one <link rel="preload" as="image" media="..."> per still, never both).
   2. The hero words are revealed by CSS keyframes (film.css .w > span and .hero .hr), not by a class a script
      adds, so the headline is visible and rising before any script runs. The real site renders the <h1> on
      the server with the same classes.
   3. The day film's src is set only after first paint: on the window's load event, then two animation frames
      later (requestAnimationFrame inside requestAnimationFrame), so the hero, its fonts and the still have
      painted before the 6 to 15 MB file starts downloading. The file is chosen by the same portrait test as the
      still (day-p.mp4 under 761px portrait, day.mp4 otherwise). preload stays "auto" on that one element.
   4. The orbit clip (c9) is a second <video> with no src and no poster. Both are set by an IntersectionObserver
      with a 100% root margin on the close section (#m-11): the clip loads only when the close is within one
      screen of the viewport. Until then nothing of it downloads.
   5. Every clip below the fold (the three campus clips) has no src, no poster and no autoplay attribute in the
      markup; they carry data-src and data-poster. An IntersectionObserver with an 80% root margin on the campus
      section copies both onto the element when the section comes within 80% of a viewport, and a second
      observer plays each clip once it is 45% visible, one after another. The poster is the first frame
      (c8x-r0.jpg) while motion is allowed.
   6. Under prefers-reduced-motion no film loads at all: the day and orbit videos never get a src, the campus
      clips get only their last-frame posters (c8x-r.jpg) when they come near, and the page shows the stills.
   7. The pause control lives in the footer (design rule 38: nothing visible sits over the background film).
      Its choice is remembered in localStorage karman-motion and every film on the page follows it. */
(function () {
  const K = window.KARMAN;
  const { M, esc, list, btn, phone, ROUTES, reduce, Q } = K;
  const pairs = (s) => list(s).map((x) => x.split(" = ").map((y) => y.trim()));

  const action = (f, cls = "") =>
    f.button
      ? `<div class="act ${cls}">${btn(f.button, ROUTES.test)}${f["button note"] ? `<small>${esc(f["button note"])}</small>` : ""}</div>`
      : "";
  // the hero line, word by word, so each word can rise in on arrival (CSS keyframes, no script needed)
  const kinetic = (s) =>
    esc(s)
      .split(" ")
      .map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");

  /* ---------- the features, in the founder's order; each screen sits at the outer edge of the page ---------- */
  const FEATURES = [
    { n: 4, media: "phone", screen: "daily10", side: "right", figure: "ten" },
    { n: 2, media: "laptop", screen: "session", twin: "sessionPhone", side: "left" },
    {
      n: 3,
      media: "laptop",
      screen: "calendar",
      twin: "calendarPhone",
      side: "right",
      tools: true,
    },
    { n: 5, media: "phone", screen: "parent", side: "left" },
    { n: 6, media: "phone", screen: "challenge", side: "right", minor: true },
  ];
  // the product screens are drawn in code (screens.js), so they match the site and stay sharp at any size
  const SCR = (name) => (window.KARMAN_SCREENS?.[name] || (() => ""))();
  const laptop = (screen) =>
    `<figure class="wide laptop" aria-hidden="true"><div class="lid"><div class="lcd">${SCR(screen)}</div></div><div class="deck"></div></figure>`;
  function feature(x) {
    const f = M(x.n);
    const media =
      x.media === "phone"
        ? `<div class="turn">${phone(SCR(x.screen), x.side === "left" ? "left" : "")}</div>`
        : `${laptop(x.screen)}<div class="turn twin">${phone(SCR(x.twin), x.side === "left" ? "left" : "")}</div>`;
    const note = f["card title"]
      ? `<p class="note"><b>${esc(f["card title"])}</b>${esc(f["card text"] || "")}</p>`
      : "";
    const fig = x.figure
      ? `<div class="fig" data-fig="${x.figure}"><div class="hl"></div><span class="read" aria-live="polite"></span></div>`
      : "";
    // the tools strip: the shared tools as a list, beside the full-length test and the planning screens
    const tools =
      x.tools && f.tools
        ? `<div class="tools rv" style="--d:.1s">
        <dl class="tools-list">${pairs(f.tools)
          .map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b || "")}</dd></div>`)
          .join("")}</dl>
        <div class="tools-media" aria-hidden="true"><div class="turn">${phone(SCR("test"))}</div><div class="turn">${phone(SCR("planning"), "left")}</div></div>
      </div>`
        : "";
    return `<article class="feat ${x.side}${x.minor ? " minor" : ""} m-${x.media}" id="m-${x.n}">
      <div class="media rv" aria-hidden="true">${media}</div>
      <div class="words rv" style="--d:.1s">
        ${f.headline ? `<h2>${esc(f.headline)}</h2>` : ""}
        ${f.text ? `<p class="lede">${esc(f.text)}</p>` : ""}
        ${f["feature title"] || f["feature text"] ? `<p class="lede"><b>${f["feature title"] ? esc(f["feature title"]) : ""}</b> ${esc(f["feature text"] || "")}</p>` : ""}
        ${note}${fig}
      </div>
      ${tools}
    </article>`;
  }

  /* ---------- the page ---------- */
  const hero = M(1),
    g = M(8),
    campus = M(9),
    msgs = M(10),
    voices = M(12),
    end = M(11);
  /* Real, approved testimonials only. The founder adds them in copy.js section 12 ("quotes": the quote = First
     name L., role | ...). Nothing renders while the list is empty. */
  const quotes = list(voices.quotes).map((q) => {
    const [words, who = ""] = q.split(" = ");
    const [name, ...role] = who.split(",");
    return `<figure class="vq rv"><blockquote><p>“${esc(words.trim())}”</p></blockquote>${who ? `<figcaption><b>${esc(name.trim())}</b>${role.length ? `<span>${esc(role.join(",").trim())}</span>` : ""}</figcaption>` : ""}</figure>`;
  });
  const voicesHTML = quotes.length
    ? `<section class="panel voices" id="m-12" aria-labelledby="v-h">
      <div class="in">
        ${voices.headline ? `<h2 class="rv" id="v-h">${esc(voices.headline)}</h2>` : ""}
        ${voices.format ? `<p class="vfmt rv">${esc(voices.format)}</p>` : ""}
        <div class="vgrid">${quotes.join("")}</div>
      </div>
    </section>`
    : "";
  /* Student messages: hidden until the founder supplies real screens (copy.js section 10). */
  const msgsHTML =
    msgs.headline || msgs.text
      ? `<section class="panel messages" id="m-10">
      <div class="in">
        ${msgs.headline ? `<h2 class="rv">${esc(msgs.headline)}</h2>` : ""}
        ${msgs.text ? `<p class="lede rv" style="--d:.1s">${esc(msgs.text)}</p>` : ""}
      </div>
    </section>`
      : "";

  /* the campus chapters (design rule 47): three real Karman 1:1 students, each clip with its caption, and the
     tutoring line under the trio. Clip ids from assets/manifest.json: c8a Mateo, c8b Priya, c8c Ava. */
  const CLIP = { ava: "c8c", mateo: "c8a", priya: "c8b" };
  const captions = pairs(campus.captions);
  const clips = captions
    .map(([name, rest], k) => {
      const id = CLIP[name.toLowerCase()];
      if (!id) return "";
      return `<figure class="clip rv" style="--d:${k * 0.1}s">
        <div class="fr"><video muted playsinline preload="none" data-src="${id}-r.mp4" data-poster="${id}-r${reduce ? "" : "0"}.jpg" aria-hidden="true"></video></div>
        <figcaption><b>${esc(name)}</b><span>${esc(rest || "")}</span></figcaption>
      </figure>`;
    })
    .join("");

  document.getElementById("main").innerHTML = `
  <section class="window hero" id="m-1">
    <div class="in">
      <h1>${kinetic(hero.headline)}</h1>
      ${hero.text ? `<p class="lede hr" style="--d:.5s">${esc(hero.text)}</p>` : ""}
      ${action(hero, "hr")}
      ${hero.proof ? `<p class="proof hr" style="--d:.8s">${esc(hero.proof)}</p>` : ""}
      ${hero.skip ? `<a class="skipfilm hr" href="#m-4" style="--d:.95s">${esc(hero.skip)}</a>` : ""}
    </div>
    <span class="cue" aria-hidden="true"></span>
  </section>

  <section class="panel features" id="features">
    <div class="in">${FEATURES.map(feature).join("")}</div>
  </section>

  <section class="panel dark guarantee" id="m-8" aria-labelledby="g-h">
    <div class="in">${K.guarantee(g, "g-h")}</div>
  </section>

  <section class="panel dark campus" id="m-9"${campus.headline ? ' aria-labelledby="c-h"' : ""}>
    <div class="in">
      ${campus.headline ? `<h2 class="rv" id="c-h">${esc(campus.headline)}</h2>` : ""}
      <div class="tri">${clips}</div>
      ${campus.line ? `<p class="cline rv" style="--d:.3s">${esc(campus.line)}</p>` : ""}
    </div>
  </section>
  ${voicesHTML}
  ${msgsHTML}
  <section class="window end" id="m-11">
    <div class="in">
      <h2 class="rv">${esc(end.headline)}</h2>
      ${end.text ? `<p class="lede rv" style="--d:.1s">${esc(end.text)}</p>` : ""}
      ${end["honest note"] ? `<p class="obj rv" style="--d:.15s">${esc(end["honest note"])}</p>` : ""}
      <div class="rv" style="--d:.2s">${action(end)}</div>
    </div>
    ${end["line note"] ? `<div class="kline rv" style="--d:.35s"><span class="bar" aria-hidden="true"></span><p>${esc(end["line note"])}</p></div>` : ""}
  </section>`;

  /* ---------- the film behind the page ---------- */
  const stage = document.querySelector(".stage");
  const day = stage.querySelector(".day"),
    edge = stage.querySelector(".edge");
  // the same test film.css uses for the still, so the still and the film always agree
  const sfx = matchMedia("(max-width: 760px) and (orientation: portrait)").matches ? "-p" : "";
  const seen = new Set(); // windows on screen
  let ending = false,
    dayLoaded = false,
    edgeLoaded = false;
  const cur = () => (ending ? edge : day);
  const want = () => !reduce && !K.paused && !document.hidden && seen.size > 0;

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
    const loaded = ending ? edgeLoaded : dayLoaded;
    if (want() && loaded) {
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
  // step 3 of the strategy: the day film starts downloading only after the first paint
  function startDay() {
    if (reduce || dayLoaded) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        day.src = `day${sfx}.mp4`;
        dayLoaded = true;
        sync();
      })
    );
  }
  if (document.readyState === "complete") startDay();
  else addEventListener("load", startDay, { once: true });

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
  // step 4: the orbit clip and its still load only when the close is within one screen
  new IntersectionObserver(
    (es, io) =>
      es.forEach((e) => {
        if (!e.isIntersecting || edgeLoaded) return;
        edgeLoaded = true;
        edge.poster = `c9${sfx}.jpg`;
        if (!reduce) {
          edge.preload = "auto";
          edge.src = `c9${sfx}.mp4`;
        }
        io.disconnect();
        sync();
      }),
    { rootMargin: "100% 0px" }
  ).observe(close);

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

  /* ---------- campus films: step 5. Nothing downloads until the section is within 80% of a viewport; then each
     clip plays once as it comes on screen, one after another ---------- */
  const cvids = [...document.querySelectorAll(".campus video")];
  const campusEl = document.getElementById("m-9");
  const loadClip = (v) => {
    if (v.dataset.poster && !v.poster) {
      v.closest(".clip")?.classList.add("loading");
      v.poster = v.dataset.poster;
      const still = new Image();
      still.src = v.dataset.poster;
      const ready = () => v.closest(".clip")?.classList.remove("loading");
      still.decode().then(ready, ready);
    }
    if (!reduce && !v.src && v.dataset.src) v.src = v.dataset.src;
  };
  const cio = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        const v = e.target;
        clearTimeout(v._t);
        if (e.isIntersecting && !reduce && !K.paused) {
          loadClip(v);
          if (v.ended) v.currentTime = 0;
          v._t = setTimeout(() => v.play().catch(() => {}), cvids.indexOf(v) * 260);
        } else v.pause();
      }),
    { threshold: 0.45 }
  );
  cvids.forEach((v) => cio.observe(v));
  new IntersectionObserver(
    (es, io) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        cvids.forEach(loadClip);
        io.disconnect();
      }),
    { rootMargin: "80% 0px" }
  ).observe(campusEl);

  document.addEventListener("karman:motion", () => {
    sync();
    cvids.forEach((v) => {
      const r = v.getBoundingClientRect();
      if (K.paused) v.pause();
      else if (r.top < innerHeight && r.bottom > 0 && !v.ended) v.play().catch(() => {});
    });
  });

  /* ---------- the Daily 10 drawing (ten.js, our own): the tile under your finger lifts, its neighbours follow ---------- */
  document.querySelectorAll('[data-fig="ten"]').forEach((h) => window.karmanTen?.(h));

  // the first visit's opening (kit.js): the wordmark and the line, only while the first picture isn't ready yet
  if (!Q.has("rec") && !Q.has("m")) window.KIT?.opening(`day${sfx}.jpg`, K.site.logo);

  K.init();

  /* the copy editor's preview opens at a section: ?m=N */
  const mq = +Q.get("m");
  const t = mq && document.getElementById(`m-${mq}`);
  if (t) {
    t.scrollIntoView({ block: t.classList.contains("feat") ? "center" : "start" });
    t.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
  }
})();
