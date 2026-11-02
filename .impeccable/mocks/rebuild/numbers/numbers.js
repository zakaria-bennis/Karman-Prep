/* Karman, the Numbers direction, round 2: words, theme, the floating nav, the iPhones, the feature
   tabs and the motion layer. Every word comes from copy.js. Motion uses GSAP 3.12.5 + ScrollTrigger +
   CustomEase (cdnjs, pinned, deferred). Nothing on screen is ever hidden: the hero is static HTML, and
   later sections only travel 16 px into place (0.5 s), starting before they enter the screen. Numbers
   always show their final value and only arrive (a small rise and a 0.98 to 1 scale). */

/* ---------- pictures: one line per slot. When a Gemini shot lands in assets/gemini-inbox/, convert it
   to WebP in img/ and change the file on the right. ---------- */
const SLOTS = {
  // Gemini cast-student-pine-floor.jpg after its device fix (AirPods Max, dark MacBook, no logo).
  hero: "img/student-pine.webp",
  // Gemini zoom-student-tile.jpg after its device fix (Sony WH-1000XM5).
  zoom: "img/zoom-student-tile.webp",
  // Gemini cast-parent-clay.jpg (rejected for its phone), cropped above her hand: no device in frame.
  parent: "img/parent-clay-tile.webp",
};
/* Still waiting: zoom-tutor-loop.mp4 (a tutor tile beside the student). */
/* Real product material from the motion lab: 9x16 clips (the phone at 1.62x on a ground; we crop to
   its screen) and the phone captures. Light mode uses the pine renders (light screens), dark mode the
   night renders (dark screens). */
const CLIPS = "../../motion/out/";
const SHOTS = "../../motion/shots/";
const FRAME = "../../motion/device/iphone-17-pro-max-orange.svg";
const FREE_TEST = "https://karmanprep.com/free-practice-test";
/* start: where a clip begins (s); poster: its first picture at that point, per ground. The Daily 10
   clip starts on the box ("Tap to open") instead of the quieter screen before it. */
const TABS = {
  1: { clip: "d10-finish", start: 1.4, poster: "img/d10-box-{ground}.webp" },
  2: { clip: "calendar" },
  3: { clip: "progress-rewards" },
  4: { clip: "parent-update" },
};

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
        /* private window: the page still works, the choice is just not kept */
      }
    },
  };

  /* ---------- words ---------- */
  const COPY = {};
  let section = "";
  for (const line of (window.KARMAN_COPY || "").split("\n")) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      section = h[1].trim();
      continue;
    }
    const m = line.match(/^([a-z0-9_]+):\s?(.*)$/i);
    if (m && section) COPY[`${section}.${m[1]}`] = m[2].trim();
  }
  const get = (k) => COPY[k] ?? "";
  $$("[data-copy]").forEach((n) => (n.textContent = get(n.dataset.copy)));
  $$("[data-copy-alt]").forEach((n) => (n.alt = get(n.dataset.copyAlt)));
  $$("[data-copy-aria]").forEach((n) => n.setAttribute("aria-label", get(n.dataset.copyAria)));
  if (get("meta.title")) document.title = get("meta.title");
  const desc = $('meta[name="description"]');
  if (desc && get("meta.description")) desc.content = get("meta.description");
  $$("img[data-slot]").forEach((img) => {
    const src = SLOTS[img.dataset.slot];
    if (!src) {
      // no approved picture yet: the card keeps its colour and the phone stands on it alone
      const fig = img.closest("figure");
      fig.parentElement.classList.add("no-photo");
      fig.remove();
    } else if (img.getAttribute("src") !== src) {
      img.removeAttribute("srcset");
      img.src = src;
    }
  });
  $$("[data-main-cta]").forEach((a) => (a.href = FREE_TEST));
  // The chip word (one per page) gets its marigold pill after the words are set.
  $$("[data-chip]").forEach((h) => {
    const chip = get(h.dataset.chip);
    const text = h.textContent;
    const i = text.toLowerCase().indexOf(chip.toLowerCase());
    if (!chip || i < 0) return;
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = text.slice(i, i + chip.length);
    h.textContent = text.slice(0, i);
    h.append(span, text.slice(i + chip.length));
  });

  /* ---------- theme (rule 33) ---------- */
  const root = document.documentElement;
  const lightMQ = matchMedia("(prefers-color-scheme: light)");
  const scheme = () => {
    const t = root.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return lightMQ.matches ? "light" : "dark";
  };
  const themeToggle = $("#themeToggle");
  function paintTheme() {
    const s = scheme();
    themeToggle.setAttribute(
      "aria-label",
      get(s === "dark" ? "header.theme_to_light" : "header.theme_to_dark")
    );
    const chosen = root.getAttribute("data-theme") || "auto";
    $$("[data-theme-set]").forEach((b) =>
      b.setAttribute("aria-checked", String(b.dataset.themeSet === chosen))
    );
    document.dispatchEvent(new CustomEvent("karman-scheme"));
  }
  function setTheme(t) {
    if (t === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    store.set("karman-theme", t);
    paintTheme();
  }
  themeToggle.addEventListener("click", () => setTheme(scheme() === "dark" ? "light" : "dark"));
  $$("[data-theme-set]").forEach((b) =>
    b.addEventListener("click", () => setTheme(b.dataset.themeSet))
  );
  lightMQ.addEventListener("change", paintTheme);

  /* ---------- phone menu: focus stays inside, Escape and links close it ---------- */
  const sheet = $("#sheet"),
    menuBtn = $("#menuBtn");
  function openSheet() {
    sheet.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    $("#sheetClose").focus();
    document.body.style.overflow = "hidden";
  }
  function closeSheet(focusBack = true) {
    sheet.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (focusBack) menuBtn.focus();
  }
  menuBtn.addEventListener("click", openSheet);
  $("#sheetClose").addEventListener("click", () => closeSheet());
  $$("a", sheet).forEach((a) => a.addEventListener("click", () => closeSheet(false)));
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key !== "Tab") return;
    const f = $$("button, a", sheet);
    const first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---------- the floating nav shows only near the top, so it never sits on what is being read;
     scrolling back up to the top brings it back ---------- */
  const navWrap = $("#header");
  const paintNav = () =>
    navWrap.classList.toggle("away", scrollY > 140 && !navWrap.contains(document.activeElement));
  addEventListener("scroll", paintNav, { passive: true });
  navWrap.addEventListener("focusin", () => navWrap.classList.remove("away"));
  paintNav();

  /* ---------- reduced motion and the site-wide motion control ---------- */
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = store.get("karman-motion") === "paused";
  const still = () => reduceMQ.matches;
  const moving = () => !still() && !paused && !!window.gsap;
  const motionBtn = $("#motionToggle");
  const paintMotion = () => (motionBtn.textContent = get(paused ? "footer.play" : "footer.pause"));
  paintMotion();

  /* ---------- the iPhones: a real capture or a lab clip cropped to the screen, under the frame ---------- */
  const phones = [];
  function makePhone(el, loop) {
    // the hero phone is already in the HTML (its first frame paints before any script); others are built
    // the hero's <picture> chose its first frame by device mode; from here the script picks it
    el.querySelectorAll("picture").forEach((pic) => {
      pic.querySelectorAll("source").forEach((src) => src.remove());
      pic.replaceWith(pic.querySelector("img"));
    });
    if (!el.querySelector(".phone-screen"))
      el.innerHTML = `<div class="phone-screen"><img class="still" alt="" decoding="async" loading="lazy"><video class="crop" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div><img class="phone-frame" src="${FRAME}" alt="" loading="lazy">`;
    const p = {
      el,
      img: $(".still", el),
      video: $("video", el),
      clip: el.dataset.clip || "",
      shot: el.dataset.shot || "",
      start: 0,
      poster: "",
      loop,
      inView: false,
      done: false,
      onEnd: null,
    };
    p.video.loop = !!loop;
    p.video.addEventListener("playing", () => p.video.classList.add("on"));
    p.video.addEventListener("loadedmetadata", () => {
      if (p.start) p.video.currentTime = p.start;
    });
    p.video.addEventListener("ended", () => {
      p.done = true;
      if (p.onEnd) p.onEnd();
    });
    phones.push(p);
    return p;
  }
  const ground = () => (scheme() === "dark" ? "night" : "pine");
  function paintPhone(p) {
    if (p.shot && !p.clip) {
      // a real capture, 440 x 956 pt, top aligned
      p.img.className = "still";
      p.img.src = `${SHOTS}${p.shot}-phone-${scheme() === "dark" ? "dark" : "light"}.webp`;
      p.video.removeAttribute("src");
      p.video.classList.remove("on");
      p.base = "";
      return;
    }
    if (!p.clip) return;
    const base = `${CLIPS}${p.clip}-9x16-${ground()}`;
    p.img.className = "still crop";
    p.img.src = p.poster ? p.poster.replace("{ground}", ground()) : base + ".webp";
    p.video.classList.remove("on");
    p.video.removeAttribute("src");
    p.video.load();
    p.loaded = false;
    p.base = base;
    if (p.inView) play(p);
  }
  // nothing heavy loads before the page has: the hero video waits for the load event
  let pageLoaded = document.readyState === "complete";
  addEventListener("load", () => {
    pageLoaded = true;
    phones.forEach((p) => p.inView && play(p));
  });
  function play(p) {
    if (!moving() || !p.base || !pageLoaded) return;
    if (!p.loaded) {
      p.video.src = p.base + ".mp4";
      p.loaded = true;
    }
    if (p.done && !p.loop) return;
    const r = p.video.play();
    if (r && r.catch) r.catch(() => {});
  }
  const heroPhone = makePhone($("#top [data-phone]"), true);
  const tabPhone = makePhone($("#tabPhone"), false);
  const otherPhones = $$("[data-phone]:not(#tabPhone)", $("main"))
    .filter((el) => el !== heroPhone.el)
    .map((el) => makePhone(el, false));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          const p = phones.find((x) => x.el === e.target);
          p.inView = e.isIntersecting;
          if (p.inView) play(p);
          else p.video.pause();
        }),
      { threshold: 0.35 }
    );
    phones.forEach((p) => io.observe(p.el));
  }
  document.addEventListener("karman-scheme", () => phones.forEach(paintPhone));

  if (window.gsap && window.CustomEase) {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("settle", "0.2,0.8,0.2,1");
  }
  // A number lands: it is always its final value, and only its position and scale move.
  const land = (el, tl, at = 0) =>
    (tl || gsap.timeline()).fromTo(
      el,
      { y: 12, scale: 0.98 },
      { y: 0, scale: 1, duration: 0.5, ease: "settle" },
      at
    );

  /* ---------- the feature tabs: each swaps the phone, its number lands (Segmented Tabs, 26923) ---------- */
  const tabs = $$("#tabs [role=tab]");
  const ind = $(".seg-ind");
  const tabNum = $("#tabNum"),
    tabUnit = $("#tabUnit"),
    tabLine = $("#tabLine"),
    replay = $("#replay"),
    panel = $("#panel");
  let current = 0;
  function placeInd(animate) {
    const t = tabs[current - 1];
    if (!t) return;
    const s = { x: t.offsetLeft, y: t.offsetTop, width: t.offsetWidth, height: t.offsetHeight };
    if (animate && moving()) gsap.to(ind, { ...s, duration: 0.25, ease: "power3.inOut" });
    else if (window.gsap) gsap.set(ind, s);
    else
      Object.assign(ind.style, {
        transform: `translate(${s.x}px,${s.y}px)`,
        width: s.width + "px",
        height: s.height + "px",
      });
  }
  function select(n, { focus = false, animate = true } = {}) {
    if (n === current) {
      if (tabPhone.done) replayClip();
      return;
    }
    current = n;
    tabs.forEach((t, i) => {
      const on = i === n - 1;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tabs[n - 1].focus();
    panel.setAttribute("aria-labelledby", tabs[n - 1].id);
    placeInd(true);
    tabUnit.textContent = get(`platform.unit${n}`);
    tabLine.textContent = get(`platform.line${n}`);
    tabPhone.el.setAttribute("aria-label", get(`platform.alt${n}`));
    tabNum.textContent = get(`platform.num${n}`);
    tabPhone.clip = TABS[n].clip || "";
    tabPhone.shot = TABS[n].shot || "";
    tabPhone.start = TABS[n].start || 0;
    tabPhone.poster = TABS[n].poster || "";
    tabPhone.done = false;
    replay.hidden = true;
    paintPhone(tabPhone);
    if (animate && moving()) {
      // the new screen and its number are there at once; they only settle 8 to 12 px into place
      const tl = gsap.timeline();
      tl.fromTo(
        tabPhone.el.firstElementChild,
        { y: 8 },
        { y: 0, duration: 0.25, ease: "power3.inOut" },
        0
      );
      tl.fromTo(
        [tabUnit, tabLine],
        { y: 8 },
        { y: 0, duration: 0.35, ease: "expo.out", stagger: 0.03 },
        0
      );
      land(tabNum, tl, 0);
    }
  }
  function replayClip() {
    tabPhone.done = false;
    replay.hidden = true;
    tabPhone.video.currentTime = tabPhone.start;
    play(tabPhone);
  }
  tabPhone.onEnd = () => (replay.hidden = false);
  replay.addEventListener("click", replayClip);
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i + 1));
    t.addEventListener("keydown", (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let n = null;
      if (k) n = ((i + k + tabs.length) % tabs.length) + 1;
      if (e.key === "Home") n = 1;
      if (e.key === "End") n = tabs.length;
      if (n) {
        e.preventDefault();
        select(n, { focus: true });
      }
    });
  });
  paintTheme();
  paintPhone(heroPhone);
  otherPhones.forEach(paintPhone);
  select(1, { animate: false });
  addEventListener("resize", () => placeInd(false));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(false));

  motionBtn.addEventListener("click", () => {
    paused = !paused;
    store.set("karman-motion", paused ? "paused" : "on");
    paintMotion();
    phones.forEach((p) => (paused ? p.video.pause() : p.inView && play(p)));
  });
  reduceMQ.addEventListener("change", () => phones.forEach((p) => still() && p.video.pause()));

  /* ---------- the motion layer ---------- */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  // Reveals begin 120 px before a section reaches the screen and last 0.5 s, so content is in place
  // by the time it is read; nothing fades in from nothing.
  const T = { out: "expo.out", dur: 0.5, stagger: 0.03, start: "top bottom+=120" };

  const mm = gsap.matchMedia();
  mm.add(
    { motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 768px)" },
    (ctx) => {
      if (!ctx.conditions.motion) return; // reduced motion: everything is already in its final state

      /* Light parallax on photographs only, desktop only. */
      if (ctx.conditions.wide) {
        $$("[data-parallax] img").forEach((img) => {
          gsap.set(img, { scale: 1.1 });
          gsap.fromTo(
            img,
            { y: 30 },
            {
              y: -30,
              ease: "none",
              scrollTrigger: {
                trigger: img.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        });
      }

      /* Each later screen: picture, then headline and words, then its number lands last. All of it
         stays visible; it only travels 16 px. A jump past a section finds it finished. */
      $$("main > section:not(.hero)").forEach((sec) => {
        const items = $$(
          ".photo, .phone, .seg, h2, .fact-line, .sub, .unit, .line, .source, .who, .text-link:not([hidden]), .btn",
          sec
        );
        const nums = $$(".land", sec);
        gsap.set(items, { y: 16 });
        const tl = gsap.timeline({ paused: true, defaults: { ease: T.out } });
        tl.to(items, { y: 0, duration: T.dur, stagger: T.stagger }, 0);
        // on results the lead score lands last
        nums
          .slice()
          .reverse()
          .forEach((el, i) => land(el, tl, 0.1 + i * 0.05));
        const st = ScrollTrigger.create({
          trigger: sec,
          start: T.start,
          once: true,
          onEnter: (self) =>
            self.getVelocity && Math.abs(self.getVelocity()) > 3000 ? tl.progress(1) : tl.play(),
        });
        if (st.progress > 0) tl.progress(1);
      });
      if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      addEventListener("load", () => ScrollTrigger.refresh());
    }
  );
})();
