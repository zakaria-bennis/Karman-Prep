/* Karman's "alive" layer (2026-10-25, trimmed 2026-10-31 to design rule 25), on every page.
   Glints: now and then a slow sweep of light crosses the marigold button, the guarantee's big numbers, the
   orange phone edges and the big prices. Each one runs on its own clock (a 7 to 13 s cycle, a random offset),
   so the page never pulses in sync, and each runs only while it is on screen. The founder asked for these.
   Photos: one pass of warm light the first time a photo comes into view, and a slow drift inside the frame as
   the page scrolls, so a still photograph is never quite still.
   Nothing answers the pointer any more except real controls: the earlier nearness layer (phones, laptops,
   drawings, cards and photos leaning or lighting up as the cursor came near) is gone (hover feedback is limited
   to what a user needs, design rule 25). Off entirely with reduced motion. */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  /* ---------- glints ---------- */
  const GLINT = ".btn, .g-promise, .i-big, .iphone, .i-facts dt, .p-price b";
  const seen = new IntersectionObserver(
    (es) => es.forEach((e) => e.target.classList.toggle("glint-on", e.isIntersecting)),
    { rootMargin: "0px 0px -10% 0px" }
  );
  function glints(root = document) {
    root.querySelectorAll(GLINT).forEach((el) => {
      if (el.dataset.glint) return;
      el.dataset.glint = "1";
      el.classList.add("glint");
      el.style.setProperty("--gc", `${(7 + Math.random() * 6).toFixed(1)}s`); // its own cycle
      el.style.setProperty("--gd", `${(-Math.random() * 12).toFixed(1)}s`); // its own offset
      seen.observe(el);
    });
  }

  /* ---------- photos: one shine on first view, and a slow drift inside the frame as the page scrolls ---------- */
  const photoSeen = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("shine");
        photoSeen.unobserve(e.target);
      }),
    { rootMargin: "0px 0px -15% 0px" }
  );
  let photos = [],
    praf = 0;
  function drift() {
    praf = 0;
    for (const img of photos) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1 to 1 across the screen
      img.style.setProperty("--sy", (t * -26).toFixed(2));
    }
  }
  function photosOn() {
    document.querySelectorAll(".k-photo").forEach((f) => photoSeen.observe(f));
    photos = [...document.querySelectorAll(".k-photo img")];
    drift();
  }
  addEventListener("scroll", () => (praf ||= requestAnimationFrame(drift)), { passive: true });

  function start() {
    photosOn();
    glints();
  }
  // pages build their sections before calling KARMAN.init(); run after that
  if (document.readyState === "complete") start();
  else addEventListener("load", start);
  window.KARMAN_ALIVE = {
    refresh: () => {
      photosOn();
      glints();
    },
  };
})();
