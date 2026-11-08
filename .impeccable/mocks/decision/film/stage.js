/* The film behind the page (2026-10-31), shared by home A (film.js) and home B (home-b.js). It implements the
   loading strategy written at the top of film.js (the spec the real site copies): the day film's src after the
   first paint, the orbit clip and its still only when the close is near, the campus clips when their section is
   near, nothing under reduced motion, the orb while the film is late, the haze while paper covers the screen,
   and the footer's pause control. A page builds its sections first, with these hooks: .window sections where the
   film shows through, #m-11 as the close, #m-9 holding the .campus video elements (data-src, data-poster), and
   .panel:not(.dark) for the paper; then it calls window.KARMAN_STAGE.start(). KARMAN_STAGE.sfx is the suffix of
   the portrait files ("-p" on a portrait phone under 761px), the same test film.css uses for the still. */
(function () {
  // the same test film.css uses for the still, so the still and the film always agree
  const sfx = matchMedia("(max-width: 760px) and (orientation: portrait)").matches ? "-p" : "";
  function start() {
    const K = window.KARMAN;
    const { reduce } = K;
  const stage = document.querySelector(".stage");
  const day = stage.querySelector(".day"),
    edge = stage.querySelector(".edge");
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
  if (campusEl)
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
  }
  window.KARMAN_STAGE = { start, sfx };
})();
