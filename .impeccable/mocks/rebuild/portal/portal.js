/* Karman, "Through the screen", round 2.
   Reads every word from copy.js, places every picture, screen and clip from the maps below, then wires
   the theme, the floating nav, the menu, the opening, the feature tabs, the live question and the
   motion (GSAP 3.12.5 + ScrollTrigger). */

/* ============================================================================
   PICTURES. One line per slot. When a Gemini file lands in assets/gemini-inbox/,
   convert it to WebP in img/ and change the path here. `phone` is the smaller file
   used under 768 px.
   ============================================================================ */
var SLOTS = {
  hero: { src: "img/pool-bleachers.webp", narrow: "img/pool-bleachers-faces.webp" }, // Gemini: pool-bleachers.jpg (IN). `narrow` (under 1024 px) is cropped above the hands, so the generated phone never shows.
  resultAva: { src: "img/result-ava.webp" }, // not in batch 2: the landing film's Ava still
  resultMateo: { src: "img/result-mateo.webp" }, // not in batch 2: the landing film's Mateo still
  resultPriya: { src: "img/result-priya.webp" }, // not in batch 2: the landing film's Priya still
  closeParent: { src: "img/cast-parent-clay.webp" }, // Gemini: cast-parent-clay.jpg (IN), cropped above the hand and phone
  // Waiting for device fixes (assets/gemini-inbox/needs-fix/): zoom-student-tile, rehearsal-stage, cast-student-pine-floor.
  // Rejected (assets/gemini-inbox/rejected/): cast-student-marigold, infield-overhead, pickup-line.
};

/* SCREENS in the iPhone 17 Pro Max. `clip` is a motion-lab feature clip (9x16, cropped to the screen),
   `still` a real capture from motion/shots (used under reduced motion and during the camera push).
   Light mode plays the pine clips (light screens), dark mode the night clips (dark screens). */
var SCREENS = {
  home: { clip: "dashboard", still: "student-home-cohort" },
  daily: { clip: "d10-finish", still: "daily10-boxready-longtime" },
  calendar: { clip: "calendar", still: "student-booking-slot" },
  progress: { clip: "progress-rewards", still: "student-progress-cohort" },
  parent: { clip: "parent-update", still: "parent-update-cohort" },
  tutor: { still: "tutor-class-cohort" }, // still only: the tutor's plan for the next live class
  schedule: { still: "parent-schedule-cohort" }, // still only: the parent's schedule, ending on the March 6 SAT
};
var CLIPS = { handoff: { name: "handoff", ratio: "16x9", ground: "pine" } };
var CLIP_DIR = "../../motion/out/";
var SHOT_DIR = "../../motion/shots/";
var FRAME = "../../motion/device/iphone-17-pro-max-orange.svg";

(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var motionOn = hasGsap && !reduce;
  if (motionOn) root.classList.add("motion");

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
    return null;
  }

  /* ---------- copy ---------- */
  var COPY = {};
  (window.PORTAL_COPY || "").split("\n").reduce(function (section, raw) {
    var line = raw.trim();
    if (!line) return section;
    if (line.indexOf("## ") === 0) return line.slice(3).trim();
    var i = line.indexOf(": ");
    if (i > 0) COPY[section + "." + line.slice(0, i).trim()] = line.slice(i + 2).trim();
    return section;
  }, "");
  function t(key) {
    if (!(key in COPY)) {
      console.warn("copy.js has no " + key);
      return "";
    }
    return COPY[key];
  }
  function plain(s) {
    return s.replace(/[[\]]/g, "");
  }
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-copy"));
  });
  // A headline whose [words] get the marigold chip (modern-UI 2.10).
  document.querySelectorAll("[data-copy-rich]").forEach(function (el) {
    var s = t(el.getAttribute("data-copy-rich"));
    el.setAttribute("aria-label", plain(s));
    s.split(/(\[[^\]]+\])/).forEach(function (part) {
      if (!part) return;
      if (part[0] === "[") {
        var c = document.createElement("span");
        c.className = "chip";
        c.textContent = part.slice(1, -1);
        el.appendChild(c);
      } else el.appendChild(document.createTextNode(part));
    });
  });
  document.querySelectorAll("[data-copy-alt]").forEach(function (el) {
    el.setAttribute("alt", t(el.getAttribute("data-copy-alt")));
  });
  document.querySelectorAll("[data-copy-label]").forEach(function (el) {
    el.setAttribute("aria-label", t(el.getAttribute("data-copy-label")));
  });
  document.querySelectorAll("[data-href]").forEach(function (el) {
    el.setAttribute("href", t(el.getAttribute("data-href")));
  });
  if (COPY["meta.title"]) document.title = COPY["meta.title"];
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", t("meta.description"));

  /* ---------- pictures ---------- */
  var phoneWidth = window.matchMedia("(max-width: 767px)").matches;
  var narrow = window.matchMedia("(max-width: 1023px)").matches;
  document.querySelectorAll("[data-slot]").forEach(function (img) {
    var slot = SLOTS[img.getAttribute("data-slot")];
    if (!slot) return;
    var src =
      narrow && slot.narrow ? slot.narrow : phoneWidth && slot.phone ? slot.phone : slot.src;
    if (/\.mp4$/.test(src)) {
      var v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("aria-label", img.alt);
      v.src = src;
      if (!reduce) v.autoplay = true;
      img.replaceWith(v);
    } else {
      img.src = src;
    }
  });

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  /* ---------- video: load about 1.5 screens ahead, play only in view ---------- */
  var loader =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          function (es) {
            es.forEach(function (e) {
              if (!e.isIntersecting) return;
              var v = e.target;
              if (v.dataset.wait) return;
              if (v.dataset.src && v.getAttribute("src") !== v.dataset.src) {
                v.preload = "auto";
                v.src = v.dataset.src;
              }
            });
          },
          { rootMargin: "150% 0px" }
        )
      : null;
  var player =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          function (es) {
            es.forEach(function (e) {
              var v = e.target;
              v.dataset.inview = e.isIntersecting ? "1" : "";
              if (e.isIntersecting && v.getAttribute("src") && !v.classList.contains("is-out"))
                v.play().catch(function () {});
              else v.pause();
            });
          },
          { threshold: 0.2 }
        )
      : null;
  function watchVideo(v) {
    if (reduce) return;
    if (!loader) {
      v.src = v.dataset.src;
      v.play().catch(function () {});
      return;
    }
    loader.observe(v);
    player.observe(v);
  }
  function setVideo(v, src, poster) {
    v.poster = poster;
    v.dataset.src = src;
    if (reduce) return;
    if (v.getAttribute("src")) {
      // Already loaded once: swap straight away (a tab click or a theme change).
      v.src = src;
      if (v.dataset.inview) v.play().catch(function () {});
    }
  }

  /* ---------- the phones ---------- */
  function screenFiles(key) {
    var s = SCREENS[key];
    var mode = currentTheme();
    var ground = mode === "light" ? "pine" : "night";
    return {
      still: SHOT_DIR + s.still + "-phone-" + mode + ".webp",
      clip: s.clip ? CLIP_DIR + s.clip + "-9x16-" + ground + ".mp4" : "",
      poster: s.clip ? CLIP_DIR + s.clip + "-9x16-" + ground + ".webp" : "",
    };
  }
  var phones = {};
  document.querySelectorAll("[data-phone]").forEach(function (el) {
    var screen = document.createElement("div");
    screen.className = "phone__screen";
    var img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    var video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.preload = "none";
    screen.appendChild(img);
    if (!reduce) screen.appendChild(video);
    var frame = document.createElement("img");
    frame.className = "phone__frame";
    frame.src = FRAME;
    frame.alt = "";
    el.appendChild(screen);
    el.appendChild(frame);
    phones[el.getAttribute("data-phone")] = {
      el: el,
      img: img,
      video: video,
      key: el.getAttribute("data-screen") || "home",
    };
    if (!reduce) watchVideo(video);
  });
  function showScreen(p, key, animate) {
    p.key = key;
    var f = screenFiles(key);
    function swap() {
      p.img.src = f.still;
      if (f.clip) setVideo(p.video, f.clip, f.poster);
      p.video.hidden = !f.clip;
      p.img.classList.remove("is-out");
      p.video.classList.remove("is-out");
    }
    if (!animate || reduce) return swap();
    p.img.classList.add("is-out");
    p.video.classList.add("is-out");
    setTimeout(swap, 200);
  }
  function refreshPhones() {
    Object.keys(phones).forEach(function (k) {
      showScreen(phones[k], phones[k].key, false);
    });
  }
  // The hero's clip waits for the page to load, so it never sits in the LCP path (brief 4.4).
  if (phones.hero) phones.hero.video.dataset.wait = "1";

  /* ---------- theme: device first, dark when it says nothing, remembered toggle (rule 33) ---------- */
  var engine = null;
  function syncEngineTheme() {
    if (!engine) return;
    var dark = currentTheme() === "dark";
    engine.setAttribute("data-theme", dark ? "observatory" : "ivory");
    engine.classList.toggle("dark", dark);
  }
  function applyTheme(name, remember) {
    root.setAttribute("data-theme", name);
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.setAttribute("aria-checked", String(b.getAttribute("data-theme-set") === name));
    });
    var other = name === "dark" ? "light" : "dark";
    document.querySelectorAll("[data-theme-flip]").forEach(function (b) {
      b.textContent = t("header.theme." + other);
      b.setAttribute("aria-label", t("header.theme.label") + ": " + t("header.theme." + other));
    });
    if (remember) store("karman-theme", name);
    syncEngineTheme();
    refreshPhones();
  }
  document.querySelectorAll("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () {
      applyTheme(b.getAttribute("data-theme-set"), true);
    });
  });
  document.querySelectorAll("[data-theme-flip]").forEach(function (b) {
    b.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  });
  var themeGroup = document.querySelector(".theme");
  themeGroup.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next, true);
    themeGroup.querySelector('[data-theme-set="' + next + '"]').focus();
    e.preventDefault();
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function (e) {
    if (!store("karman-theme")) applyTheme(e.matches ? "light" : "dark", false);
  });

  /* ---------- floating nav: hides on scroll down, returns on scroll up ---------- */
  var nav = document.querySelector(".nav");
  var lastY = window.scrollY;
  var sheet = document.getElementById("sheet");
  window.addEventListener(
    "scroll",
    function () {
      var y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      var down = y > lastY && y > 80;
      nav.classList.toggle(
        "is-hidden",
        down && sheet.hidden && !nav.contains(document.activeElement)
      );
      lastY = y;
    },
    { passive: true }
  );
  nav.addEventListener("focusin", function () {
    nav.classList.remove("is-hidden");
  });

  /* ---------- phone menu: a full-height sheet ---------- */
  var opener = document.querySelector(".nav__menu");
  var closer = sheet.querySelector(".sheet__close");
  function openSheet() {
    sheet.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closer.focus();
  }
  function closeSheet(returnFocus) {
    sheet.hidden = true;
    opener.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (returnFocus) opener.focus();
  }
  opener.addEventListener("click", openSheet);
  closer.addEventListener("click", function () {
    closeSheet(true);
  });
  sheet.querySelectorAll("nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      closeSheet(false);
    });
  });
  sheet.addEventListener("keydown", function (e) {
    if (e.key === "Escape") return closeSheet(true);
    if (e.key !== "Tab") return;
    var f = sheet.querySelectorAll("a[href], button");
    var first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  });
  window.matchMedia("(min-width: 1024px)").addEventListener("change", function (e) {
    if (e.matches && !sheet.hidden) closeSheet(false);
  });

  /* ---------- in-page links: native jump, then focus the section ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains("skip")) return;
    var id = a.getAttribute("href").slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    var y = id === "top" ? 0 : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    history.pushState(null, "", "#" + id);
    if (id !== "top") {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });

  /* ---------- feature tabs (after 21st.dev 27081): click or arrow keys swap the phone's screen ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var glide = document.querySelector(".tabs__glide");
  var panel = document.getElementById("screen");
  var caption = document.querySelector(".platform__caption");
  var platformPhone = phones.platform;
  function placeGlide(tab) {
    if (!glide || !tab.offsetHeight) return;
    glide.style.transform = "translateY(" + tab.offsetTop + "px)";
    glide.style.height = tab.offsetHeight + "px";
  }
  function selectTab(tab, focus) {
    var key = tab.getAttribute("data-tab");
    tabs.forEach(function (b) {
      var on = b === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    placeGlide(tab);
    panel.setAttribute("aria-labelledby", tab.id);
    caption.textContent = t("platform." + key + ".line");
    platformPhone.el.setAttribute("aria-label", t("platform." + key + ".alt"));
    if (platformPhone.key !== key) showScreen(platformPhone, key, true);
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      selectTab(tab, false);
    });
    tab.addEventListener("keydown", function (e) {
      var n = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % tabs.length;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      selectTab(tabs[n], true);
    });
  });
  window.addEventListener("resize", function () {
    placeGlide(document.querySelector('.tab[aria-selected="true"]'));
  });

  /* ---------- the handoff clip (16x9, poster first) ---------- */
  document.querySelectorAll("[data-clip]").forEach(function (v) {
    var c = CLIPS[v.getAttribute("data-clip")];
    var base = CLIP_DIR + c.name + "-" + c.ratio + "-" + c.ground;
    v.poster = base + ".webp";
    v.dataset.src = base + ".mp4";
    watchVideo(v);
  });

  /* ---------- spotlight on tiles (after 21st.dev 35180), pointer only ---------- */
  if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".spot").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--x", e.clientX - r.left + "px");
        el.style.setProperty("--y", e.clientY - r.top + "px");
      });
    });
  }

  /* ---------- the live question: the real engine fragment (try.js) ---------- */
  if (window.KarmanTry)
    window.KarmanTry(t, function (e) {
      engine = e;
      syncEngineTheme();
    });

  /* ---------- opening: first visit, under 1.3 s, any input skips, fades under reduced motion ---------- */
  var opening = document.querySelector(".opening");
  var heroStarted = false;
  var arrive = null;
  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    if (arrive) arrive();
  }
  function finishOpening() {
    if (!root.classList.contains("is-opening")) return;
    store("karman-portal-opening", "1");
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
      window.removeEventListener(ev, finishOpening, true);
    });
    opening.classList.add("leave");
    startHero();
    setTimeout(function () {
      root.classList.remove("is-opening");
      opening.className = "opening";
    }, 200);
  }
  if (root.classList.contains("is-opening")) {
    window.__openingStart = performance.now();
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, finishOpening, true);
    });
    opening.classList.add(reduce ? "fade" : "play");
    setTimeout(finishOpening, reduce ? 560 : 900);
  }

  applyTheme(currentTheme(), false);
  selectTab(tabs[0], false);
  window.addEventListener("load", function () {
    if (phones.hero && !reduce) {
      var v = phones.hero.video;
      delete v.dataset.wait;
      if (!v.getAttribute("src")) v.src = v.dataset.src;
      v.play().catch(function () {});
    }
    placeGlide(document.querySelector('.tab[aria-selected="true"]'));
  });

  if (!motionOn) {
    if (!root.classList.contains("is-opening")) heroStarted = true;
    return;
  }

  /* ======================= motion ======================= */
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  if (window.CustomEase) {
    gsap.registerPlugin(window.CustomEase);
    window.CustomEase.create("settle", "0.2,0.8,0.2,1");
  }
  var TOK = {
    out: "expo.out",
    inOut: "power3.inOut",
    settle: window.CustomEase ? "settle" : "power4.out",
    base: 0.6,
    reveal: 0.9,
    count: 1.2,
    words: 0.06,
    items: 0.08,
    reveal_at: "top 78%",
  };
  gsap.defaults({ overwrite: "auto" });

  // Words rise from a mask. A chip is one unit, so its marigold block rises whole.
  function splitWords(el) {
    var units = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) units.push(document.createTextNode(" "));
          else units.push(w);
        });
      } else units.push(node);
    });
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.trim());
    el.textContent = "";
    units.forEach(function (u) {
      if (u.nodeType === 3) return el.appendChild(u);
      var w = document.createElement("span");
      w.className = "w";
      w.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      if (typeof u === "string") inner.textContent = u;
      else inner.appendChild(u);
      w.appendChild(inner);
      el.appendChild(w);
    });
    return el.querySelectorAll(".w > span");
  }
  document.querySelectorAll(".rise-lines").forEach(function (el) {
    gsap.set(splitWords(el), { yPercent: 105 });
  });

  // 1. Arrive: the stage is already there; the pill, the words, the subline, the phone, the button last.
  var heroWords = document.querySelectorAll(".hero__title .w > span");
  var heroBtn = document.querySelector(".hero__copy .button");
  gsap.set([".pill", ".hero__sub"], { opacity: 0, y: 12 });
  gsap.set(".hero__phone .phone__screen, .hero__phone .phone__frame", { opacity: 0, y: 24 });
  gsap.set(heroBtn, { opacity: 0, scale: 0.96 });
  arrive = function () {
    gsap
      .timeline({ defaults: { ease: TOK.out } })
      .to(".pill", { opacity: 1, y: 0, duration: 0.6 }, 0)
      .to(heroWords, { yPercent: 0, duration: TOK.reveal, stagger: TOK.words }, 0.1)
      .to(".hero__sub", { opacity: 1, y: 0, duration: 0.7 }, 0.4)
      .to(
        ".hero__phone .phone__screen, .hero__phone .phone__frame",
        { opacity: 1, y: 0, duration: TOK.reveal },
        0.3
      )
      .to(heroBtn, { opacity: 1, scale: 1, duration: 0.5, ease: TOK.settle }, 0.75); // Land: the button, last
  };
  if (!root.classList.contains("is-opening")) startHero();

  // 2. Rise + Land per section, once. Picture first, headline, then the focal element lands last.
  function sectionTimeline(section, opts) {
    var words = section.querySelectorAll(".rise-lines .w > span");
    var objs = opts.objects ? section.querySelectorAll(opts.objects) : [];
    var subs = opts.subs ? section.querySelectorAll(opts.subs) : [];
    var land = opts.land ? section.querySelector(opts.land) : null;
    if (objs.length) gsap.set(objs, { opacity: 0, y: window.innerWidth < 768 ? 16 : 24 });
    if (subs.length) gsap.set(subs, { opacity: 0, y: 12 });
    if (land) gsap.set(land, { opacity: 0, y: 10, scale: 0.97 });
    var tl = gsap.timeline({
      defaults: { ease: TOK.out },
      scrollTrigger: { trigger: section, start: opts.start || TOK.reveal_at, once: true },
    });
    if (objs.length) tl.to(objs, { opacity: 1, y: 0, duration: TOK.reveal, stagger: TOK.items }, 0);
    tl.to(words, { yPercent: 0, duration: TOK.reveal, stagger: TOK.words }, 0.1);
    if (subs.length) tl.to(subs, { opacity: 1, y: 0, duration: 0.7, stagger: TOK.items }, 0.4);
    if (opts.after) opts.after(tl);
    if (land)
      tl.to(land, { opacity: 1, y: 0, scale: 1, duration: TOK.base, ease: TOK.settle }, ">-0.05");
    return tl;
  }
  sectionTimeline(document.querySelector(".platform"), {
    start: "top 92%",
    subs: ".platform .sub, .tab, .platform__caption",
    land: ".platform__phone",
  });
  sectionTimeline(document.querySelector(".week"), {
    objects: ".tile",
    land: ".start__date",
  });
  var num = document.querySelector("[data-count]");
  var target = Number(num.textContent);
  num.textContent = "1235";
  sectionTimeline(document.querySelector(".results"), {
    objects: ".results__grid li",
    subs: ".results__range, .results__label",
    after: function (tl) {
      // Count: the label is visible first; the number rolls once and settles (tabular, fixed width).
      var o = { v: 1235 };
      tl.to(
        o,
        {
          v: target,
          duration: TOK.count,
          ease: TOK.settle,
          onUpdate: function () {
            num.textContent = String(Math.round(o.v));
          },
        },
        ">-0.2"
      );
    },
  });
  sectionTimeline(document.querySelector(".plans"), {
    objects: ".plan",
    subs: ".plans__links",
    land: ".plan--pick .plan__amount",
  });
  sectionTimeline(document.querySelector(".close"), {
    objects: ".close__photo",
    subs: ".close .sub, .close__objection, .close__date",
    land: ".close .button",
  });

  // The camera push (desktop, motion allowed): the one pin on the page, 150vh, scrubbed.
  var mm = gsap.matchMedia();
  var portal = document.querySelector("[data-portal]");
  mm.add("(min-width: 1024px)", function () {
    portal.classList.add("is-live");
    var card = portal.querySelector(".hero__card");
    var copy = portal.querySelector(".hero__copy");
    var ground = portal.querySelector(".portal__ground");
    var heroPhone = phones.hero;
    var geo = {};
    function measure() {
      gsap.set(card, { clearProps: "transform" });
      var c = card.getBoundingClientRect();
      var p = heroPhone.el.getBoundingClientRect();
      var sx = p.left + p.width * 0.04071;
      var sy = p.top + p.height * 0.019115;
      var sw = p.width * 0.91858;
      var S = window.innerWidth / sw;
      geo.S = S;
      var ox = (sx * S) / (S - 1);
      var oy = (sy * S) / (S - 1);
      card.style.transformOrigin = ox - c.left + "px " + (oy - c.top) + "px";
    }
    var smooth = function (a, b, x) {
      var u = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return u * u * (3 - 2 * u);
    };
    function render(p) {
      // Constant-speed zoom: the scale grows geometrically, so the camera never lurches.
      var e = smooth(0.03, 0.6, p);
      gsap.set(card, { scale: Math.pow(geo.S, e) });
      gsap.set(copy, { opacity: 1 - smooth(0, 0.14, p) });
      copy.style.visibility = p > 0.15 ? "hidden" : "";
      // The moving clip gives way to the sharp capture as soon as the camera moves.
      heroPhone.video.classList.toggle("is-out", p > 0.02);
      gsap.set(ground, { opacity: smooth(0.5, 0.66, p) });
    }
    var st = ST.create({
      trigger: portal,
      start: "top top",
      end: "bottom bottom",
      onUpdate: function (self) {
        render(self.progress);
      },
      onRefresh: function (self) {
        measure();
        render(self.progress);
      },
    });
    measure();
    render(0);
    return function () {
      st.kill();
      portal.classList.remove("is-live");
      card.style.transformOrigin = "";
      gsap.set([card, copy, ground], { clearProps: "transform,opacity" });
      copy.style.visibility = "";
      heroPhone.video.classList.remove("is-out");
    };
  });

  var refresh = function () {
    ST.refresh();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener("load", refresh);
})();
