/* Karman, the Numbers direction, round 2: words, theme, the floating nav, the opening, the iPhones,
   the feature tabs and the motion layer. Every word comes from copy.js. Motion uses GSAP 3.12.5 +
   ScrollTrigger + CustomEase (cdnjs, pinned) and only the brief's named moves: Arrive, Rise, Land,
   Demo, Count, Press. */

/* ---------- pictures: one line per slot. When a Gemini shot lands in assets/gemini-inbox/, convert it
   to WebP in img/ and change the file on the right. ---------- */
const SLOTS = {
  // Gemini: cast-student-pine-floor.jpg, sent back for a device fix (AirPods Pro, unbranded laptop).
  // While it is null the hero shows the phone on a pine card; set it to the fixed WebP to bring it back.
  hero: null,
  // Gemini: cast-parent-clay.jpg, cropped above her hand so the AI-drawn phone is out of frame.
  parent: "img/parent-clay-tile.webp",
};
/* Dropped under the device rule (2026-11-01): the round-1 Zoom student (earbuds), Zoom tutor (headset),
   parent (phone in hand) stand-ins, and cast-student-marigold.jpg (rejected). Zoom tiles return when
   zoom-student-tile.jpg comes back fixed and zoom-tutor-loop.mp4 arrives. */
/* Real product material from the motion lab: 9x16 clips (the phone at 1.62x on a ground; we crop to
   its screen) and the phone captures. Light mode uses the pine renders (light screens), dark mode the
   night renders (dark screens). */
const CLIPS = "../../motion/out/";
const SHOTS = "../../motion/shots/";
const FRAME = "../../motion/device/iphone-17-pro-max-orange.svg";
const FREE_TEST = "https://karmanprep.com/free-practice-test";
const TABS = {
  1: { clip: "d10-finish" },
  2: { shot: "student-booking-slot" },
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
    } else if (img.getAttribute("src") !== src) img.src = src;
  });
  $$("[data-main-cta], #headerCta").forEach((a) => (a.href = FREE_TEST));

  // Headings become words inside masks (for Rise); the hero's chip word gets its marigold pill.
  $$(".rise").forEach((h) => {
    const text = h.textContent.trim();
    const chip = h.dataset.chip ? get(h.dataset.chip).toLowerCase() : "";
    h.setAttribute("aria-label", text);
    h.textContent = "";
    text.split(/\s+/).forEach((w, i, all) => {
      const outer = document.createElement("span");
      outer.className = "w";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.textContent = w;
      if (chip && w.toLowerCase().replace(/[^a-z0-9]/g, "") === chip) inner.className = "chip";
      outer.appendChild(inner);
      h.appendChild(outer);
      if (i < all.length - 1) h.appendChild(document.createTextNode(" "));
    });
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

  /* ---------- the floating nav hides while scrolling down, returns on the way up (2.1) ---------- */
  const navWrap = $("#header");
  let lastY = scrollY;
  addEventListener(
    "scroll",
    () => {
      const y = scrollY;
      const d = y - lastY;
      if (Math.abs(d) < 4) return;
      const away = d > 0 && y > 120 && !navWrap.contains(document.activeElement);
      navWrap.classList.toggle("away", away);
      lastY = y;
    },
    { passive: true }
  );
  navWrap.addEventListener("focusin", () => navWrap.classList.remove("away"));

  /* ---------- reduced motion and the site-wide motion control ---------- */
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = store.get("karman-motion") === "paused";
  const still = () => reduceMQ.matches;
  const moving = () => !still() && !paused && !!window.gsap;
  const motionBtn = $("#motionToggle");
  const paintMotion = () => (motionBtn.textContent = get(paused ? "footer.play" : "footer.pause"));
  paintMotion();

  /* ---------- the opening: first visit only, about 1 s, any input skips it ---------- */
  const opening = $("#opening");
  const params = new URLSearchParams(location.search);
  function runOpening() {
    const lift = () => root.classList.remove("pre-open");
    if (params.get("opening") === "off") return lift();
    if (params.get("opening") !== "on" && store.get("karman-opened")) return lift();
    store.set("karman-opened", "1");
    if (!window.gsap) return lift();
    opening.hidden = false;
    lift();
    let tl;
    const end = () => {
      if (opening.hidden) return;
      if (tl) tl.kill();
      gsap.to(opening, {
        autoAlpha: 0,
        duration: 0.2,
        ease: "power3.inOut",
        onComplete: () => {
          opening.hidden = true;
          gsap.set(opening, { clearProps: "all" });
          window.dispatchEvent(new Event("karman-opened"));
        },
      });
      ["keydown", "pointerdown", "wheel", "touchstart"].forEach((t) => removeEventListener(t, end));
    };
    ["keydown", "pointerdown", "wheel", "touchstart"].forEach((t) =>
      addEventListener(t, end, { passive: true })
    );
    $(".opening-skip", opening).addEventListener("click", end);
    if (still()) {
      tl = gsap.timeline({ onComplete: end });
      tl.from(".opening-lockup", { autoAlpha: 0, duration: 0.3, ease: "none" }).to(
        {},
        { duration: 0.45 }
      );
      return;
    }
    // Line Draw SVG (21st.dev 18352): each stroke starts at its full dash offset and draws to 0.
    const line = $(".mark-line", opening),
      arc = $(".mark-arc", opening);
    [line, arc].forEach((p) => {
      const L = p.getTotalLength();
      gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
    });
    tl = gsap.timeline({ onComplete: end });
    tl.to(line, { strokeDashoffset: 0, duration: 0.36, ease: "power3.inOut" })
      .to(arc, { strokeDashoffset: 0, duration: 0.44, ease: "expo.out" }, 0.18)
      .fromTo(
        $(".word", opening),
        { autoAlpha: 0, x: -10 },
        { autoAlpha: 1, x: 0, duration: 0.4, ease: "expo.out" },
        0.4
      )
      .to({}, { duration: 0.06 });
  }
  runOpening();

  /* ---------- the iPhones: a real capture or a lab clip cropped to the screen, under the frame ---------- */
  const phones = [];
  function makePhone(el, loop) {
    el.innerHTML = `<div class="phone-screen"><img class="still" alt="" decoding="async"><video class="crop" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div><img class="phone-frame" src="${FRAME}" alt="">`;
    const p = {
      el,
      img: $(".still", el),
      video: $("video", el),
      clip: el.dataset.clip || "",
      shot: el.dataset.shot || "",
      loop,
      inView: false,
      done: false,
      onEnd: null,
    };
    p.video.loop = !!loop;
    p.video.addEventListener("playing", () => p.video.classList.add("on"));
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
    p.img.src = base + ".webp";
    p.video.classList.remove("on");
    p.video.removeAttribute("src");
    p.video.load();
    p.loaded = false;
    p.base = base;
    if (p.inView) play(p);
  }
  function play(p) {
    if (!moving() || !p.base) return;
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

  /* ---------- Count: an odometer per number (Count Up, 21st.dev 20068, ported) ---------- */
  function odometer(el, text) {
    el.setAttribute("aria-label", text);
    el.textContent = "";
    const odo = document.createElement("span");
    odo.className = "odo";
    odo.setAttribute("aria-hidden", "true");
    const reels = [];
    for (const ch of text) {
      if (ch === " ") {
        const g = document.createElement("span");
        g.className = "odo-gap";
        odo.appendChild(g);
        continue;
      }
      const col = document.createElement("span");
      col.className = "odo-col";
      const reel = document.createElement("span");
      reel.className = "odo-reel";
      // one turn of 0-9 then the digit, so every column travels and lands on its own number;
      // digits are drawn by CSS from data-d, so a screen reader reads the number once
      const seq = /\d/.test(ch) ? [...Array(10).keys()].concat(Number(ch)) : [ch];
      seq.forEach((n) => {
        const r = document.createElement("span");
        r.dataset.d = String(n);
        reel.appendChild(r);
      });
      if (seq.length > 1) reels.push({ reel, end: (-100 * (seq.length - 1)) / seq.length });
      col.appendChild(reel);
      odo.appendChild(col);
    }
    el.appendChild(odo);
    return { el, reels };
  }
  const settleAll = (c) =>
    c.reels.forEach((r) =>
      window.gsap
        ? gsap.set(r.reel, { yPercent: r.end })
        : (r.reel.style.transform = `translateY(${r.end}%)`)
    );
  function roll(c, at = 0, tl) {
    // columns roll right to left, 0.06 s apart, 1.2 s, the settle ease
    const t = tl || gsap.timeline();
    // the number is hidden until its roll starts, so a waiting "00" is never read as a figure
    t.fromTo(c.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, ease: "none" }, at);
    c.reels
      .slice()
      .reverse()
      .forEach((r, j) =>
        t.fromTo(
          r.reel,
          { yPercent: 0 },
          { yPercent: r.end, duration: 1.2, ease: "settle" },
          at + j * 0.06
        )
      );
    return t;
  }
  if (window.gsap && window.CustomEase) {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("settle", "0.2,0.8,0.2,1");
  }
  const counts = $$(".count:not(#tabNum)").map((el) => odometer(el, el.textContent.trim()));
  counts.forEach(settleAll);

  /* ---------- the feature tabs: each swaps the phone, its number rolls in (Segmented Tabs, 26923) ---------- */
  const tabs = $$("#tabs [role=tab]");
  const ind = $(".seg-ind");
  const tabNum = $("#tabNum"),
    tabUnit = $("#tabUnit"),
    tabLine = $("#tabLine"),
    replay = $("#replay"),
    panel = $("#panel");
  let tabCount = null;
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
  function select(n, { focus = false, rollIn = true } = {}) {
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
    tabCount = odometer(tabNum, get(`platform.num${n}`));
    tabPhone.clip = TABS[n].clip || "";
    tabPhone.shot = TABS[n].shot || "";
    tabPhone.done = false;
    replay.hidden = true;
    paintPhone(tabPhone);
    if (rollIn && moving()) {
      // the screen swaps (cross-fade with an 8 px rise), then the number rolls and points at it
      const tl = gsap.timeline();
      tl.fromTo(
        tabPhone.el.firstElementChild,
        { autoAlpha: 0.2, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.25, ease: "power3.inOut" },
        0
      );
      tl.fromTo(
        [tabUnit, tabLine],
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.4, ease: "expo.out", stagger: 0.08 },
        0.05
      );
      roll(tabCount, 0, tl);
    } else settleAll(tabCount);
  }
  function replayClip() {
    tabPhone.done = false;
    replay.hidden = true;
    tabPhone.video.currentTime = 0;
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
  select(1, { rollIn: false });
  addEventListener("resize", () => placeInd(false));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(false));

  motionBtn.addEventListener("click", () => {
    paused = !paused;
    store.set("karman-motion", paused ? "paused" : "on");
    paintMotion();
    phones.forEach((p) => (paused ? p.video.pause() : p.inView && play(p)));
  });
  reduceMQ.addEventListener("change", () => phones.forEach((p) => still() && p.video.pause()));

  /* ---------- one highlighted button on screen (rule 35): the nav button shows only when the
     hero and closing buttons are both off screen ---------- */
  const headerCta = $("#headerCta");
  const mains = $$("[data-main-cta]");
  const visible = new Set();
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      headerCta.hidden = visible.size > 0;
    });
    mains.forEach((m) => io.observe(m));
  }

  /* ---------- the motion layer ---------- */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const T = {
    out: "expo.out",
    reveal: 0.9,
    base: 0.6,
    words: 0.06,
    items: 0.08,
    start: "top 78%",
    focus: "top 60%",
  };

  const mm = gsap.matchMedia();
  mm.add(
    { motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 768px)" },
    (ctx) => {
      if (!ctx.conditions.motion) return; // reduced motion: everything is already in its final state
      const wordsOf = (sec) => $$(".rise .w > span", sec);

      /* Arrive: the photo and the phone are visible at 0 s; words rise at 0.1 s, the subline at
       0.45 s, the button (the hero's one Land) settles at 0.7 s. */
      const hero = $(".hero");
      gsap.set(wordsOf(hero), { yPercent: 105 });
      gsap.set([".pill", ".hero-sub"], { autoAlpha: 0, y: 12 });
      gsap.set(".hero-cta", { autoAlpha: 0, scale: 0.96 });
      const arrive = gsap.timeline({ paused: true });
      arrive
        .to(".pill", { autoAlpha: 1, y: 0, duration: T.base, ease: T.out }, 0)
        .to(wordsOf(hero), { yPercent: 0, duration: T.reveal, ease: T.out, stagger: T.words }, 0.1)
        .to(".hero-sub", { autoAlpha: 1, y: 0, duration: T.base, ease: T.out }, 0.45)
        .to(".hero-cta", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "settle" }, 0.7);
      if (opening.hidden) arrive.play();
      else addEventListener("karman-opened", () => arrive.play(), { once: true });

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

      /* Each later screen: picture first, then the headline rises, then its one number rolls (Land). */
      $$("main > section:not(.hero)").forEach((sec) => {
        const words = wordsOf(sec);
        const pics = $$(".photo, .phone, .seg", sec);
        const rest = $$(".sub, .unit, .line, .source, .who, .text-link:not([hidden]), .btn", sec);
        const nums = counts.filter((c) => sec.contains(c.el));
        if (sec.id === "platform") nums.push(tabCount);
        gsap.set(words, { yPercent: 105 });
        gsap.set(pics, { autoAlpha: 0, y: 24 });
        gsap.set(rest, { autoAlpha: 0, y: 12 });
        nums.forEach((c) => {
          gsap.set(c.el, { autoAlpha: 0 });
          c.reels.forEach((r) => gsap.set(r.reel, { yPercent: 0 }));
        });
        const tl = gsap.timeline({ paused: true, defaults: { ease: T.out } });
        tl.to(pics, { autoAlpha: 1, y: 0, duration: T.reveal, stagger: T.items }, 0);
        tl.to(words, { yPercent: 0, duration: T.reveal, stagger: T.words }, 0.1);
        tl.to(rest, { autoAlpha: 1, y: 0, duration: T.base, stagger: 0.05 }, 0.35);
        // Land: the number rolls last; on results the lead score finishes last
        nums
          .slice()
          .reverse()
          .forEach((c, i) => roll(c, 0.5 + i * 0.12, tl));
        ScrollTrigger.create({
          trigger: sec,
          start: T.start,
          once: true,
          onEnter: () => tl.play(),
        });
      });
      if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      addEventListener("load", () => ScrollTrigger.refresh());
    }
  );
})();
