/* Karman, "Through the screen". The content layer: it works with no animation library.
   Reads every word from copy.js, places every picture and screen from the maps below, then wires the
   theme, the nav, the menu, in-page links, the feature tabs, the spotlight and the live question (try.js).
   Motion lives in motion.js and loads after this. */

/* ============================================================================
   PICTURES. One line per slot. To swap a picture, convert it to WebP in img/ and
   change the path here. The hero photo and the Zoom photo are written straight into
   index.html (so they paint without waiting for scripts); their slots are noted here.
   ============================================================================ */
var SLOTS = {
  // hero: img/rehearsal-stage.webp, img/rehearsal-stage-narrow.webp (under 1024 px). Gemini rehearsal-stage.jpg, fixed (dark MacBook, no logo). In index.html.
  // zoomStudent: img/zoom-student-tile.webp. Gemini zoom-student-tile.jpg, fixed (Sony WH-1000XM5). In index.html.
  resultAva: { src: "img/result-ava.webp" }, // the landing film's Ava still (no devices)
  resultMateo: { src: "img/result-mateo.webp" }, // the landing film's Mateo still (no devices)
  resultPriya: { src: "img/result-priya.webp" }, // the landing film's Priya still (no devices)
  closeParent: { src: "img/cast-parent-clay.webp" }, // Gemini cast-parent-clay.jpg, cropped above the hand and phone (the phone was rejected)
};

/* SCREENS in the iPhone 17 Pro Max. `still` is a real capture (motion/shots, or img/ for the two spliced ones),
   `clip` a motion-lab clip cropped to the screen. `crop: "engine"` is a quiz-engine clip (its capture sits at 1.8x).
   No screen states a cohort or a date that contradicts the March program (NOTES.md, Fix round 2). */
var SCREENS = {
  home: { still: "img/screen-home-{mode}.webp" }, // Home with the two due rows (Nov 2) spliced out at a row boundary
  daily: { clip: "d10-finish", still: "daily10-boxready-longtime" },
  calendar: { still: "student-booking-slot" }, // a Private 1:1 booking with David (not tied to the cohort)
  progress: { clip: "progress-rewards", still: "student-progress-cohort" },
  parent: { still: "img/screen-parent-{mode}.webp" }, // the weekly update with the live-class rows spliced out
  review: { still: "student-testreview-cohort" }, // full-length test 1 review, no dates
  quiz: {
    clip: "d10-right",
    crop: "engine",
    still: "../../motion/public/caps/alg-1-phone-dark-question.webp",
    dark: true,
  },
};
var CLIP_DIR = "../../motion/out/";
var SHOT_DIR = "../../motion/shots/";
var FRAME = "../../motion/device/iphone-17-pro-max-orange.svg";

(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var loaded = document.readyState === "complete";
  window.addEventListener("load", function () {
    loaded = true;
  });

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
    return null;
  }

  /* ---------- copy (the hero is already written in index.html; this keeps it in step with copy.js) ---------- */
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
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    var v = t(el.getAttribute("data-copy"));
    if (el.textContent !== v) el.textContent = v;
  });
  // A headline whose [words] get the marigold chip (modern-UI 2.10).
  document.querySelectorAll("[data-copy-rich]").forEach(function (el) {
    var s = t(el.getAttribute("data-copy-rich"));
    var html = s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\[([^\]]+)\]/g, '<span class="chip">$1</span>');
    if (el.innerHTML !== html) el.innerHTML = html;
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

  /* ---------- pictures below the fold: lazy ---------- */
  document.querySelectorAll("[data-slot]").forEach(function (img) {
    var slot = SLOTS[img.getAttribute("data-slot")];
    if (!slot) return;
    img.loading = "lazy";
    img.src = slot.src;
  });

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  /* ---------- video: nothing loads before the page has loaded; then 1.5 screens ahead, play in view ---------- */
  var loader = null;
  var player = null;
  var waiting = [];
  function startWatching() {
    if (!("IntersectionObserver" in window)) return;
    loader = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var v = e.target;
          if (v.dataset.src && v.getAttribute("src") !== v.dataset.src) {
            v.preload = "auto";
            v.src = v.dataset.src;
          }
        });
      },
      { rootMargin: "150% 0px" }
    );
    player = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          var v = e.target;
          v.dataset.inview = e.isIntersecting ? "1" : "";
          if (e.isIntersecting && v.getAttribute("src")) v.play().catch(function () {});
          else v.pause();
        });
      },
      { threshold: 0.2 }
    );
    waiting.forEach(function (v) {
      loader.observe(v);
      player.observe(v);
    });
  }
  function watchVideo(v) {
    if (reduce) return;
    if (loader) {
      loader.observe(v);
      player.observe(v);
    } else waiting.push(v);
  }
  if (loaded) startWatching();
  else window.addEventListener("load", startWatching);

  /* ---------- the phones ---------- */
  function screenFiles(key) {
    var s = SCREENS[key];
    var mode = currentTheme();
    var ground = mode === "light" ? "pine" : "night";
    var still =
      s.still.indexOf("/") >= 0
        ? s.still.replace("{mode}", mode)
        : SHOT_DIR + s.still + "-phone-" + mode + ".webp";
    return {
      still: still,
      clip: s.clip ? CLIP_DIR + s.clip + "-9x16-" + ground + ".mp4" : "",
      crop: s.crop || "feature",
    };
  }
  var phones = {};
  document.querySelectorAll("[data-phone]").forEach(function (el) {
    var screen = el.querySelector(".phone__screen");
    if (!screen) {
      screen = document.createElement("div");
      screen.className = "phone__screen";
      var im = document.createElement("img");
      im.alt = "";
      im.decoding = "async";
      im.loading = "lazy";
      screen.appendChild(im);
      el.appendChild(screen);
      var frame = document.createElement("img");
      frame.className = "phone__frame";
      frame.src = FRAME;
      frame.alt = "";
      el.appendChild(frame);
    }
    var img = screen.querySelector("img");
    // One first frame only: the still. The clip (if any) has no poster and shows once it plays.
    var video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.preload = "none";
    video.className = "is-out";
    video.addEventListener("playing", function () {
      video.classList.remove("is-out");
    });
    if (!reduce) screen.appendChild(video);
    var p = { el: el, img: img, video: video, key: el.getAttribute("data-screen") || "home" };
    phones[el.getAttribute("data-phone")] = p;
    if (!reduce) watchVideo(video);
  });
  function showScreen(p, key, animate) {
    p.key = key;
    var f = screenFiles(key);
    function swap() {
      if (p.img.getAttribute("src") !== f.still) p.img.src = f.still;
      p.img.classList.remove("is-out");
      p.img.parentElement.classList.toggle("is-engine", f.crop === "engine");
      p.video.className = "is-out" + (f.crop === "engine" ? " crop-engine" : "");
      p.video.dataset.src = f.clip;
      if (!f.clip) {
        p.video.removeAttribute("src");
        p.video.load();
      } else if (p.video.getAttribute("src") || (loaded && p.video.dataset.inview)) {
        p.video.src = f.clip;
        if (p.video.dataset.inview) p.video.play().catch(function () {});
      }
    }
    if (!animate || reduce) return swap();
    p.img.classList.add("is-out");
    p.video.classList.add("is-out");
    setTimeout(swap, 200);
  }
  function refreshPhones() {
    Object.keys(phones).forEach(function (k) {
      if (k === "hero") return heroScreen();
      showScreen(phones[k], phones[k].key, false);
    });
  }
  // The hero's first frame is the small capture written in index.html; the sharp one follows after load,
  // ready for the camera push.
  function heroScreen() {
    var img = phones.hero && phones.hero.img;
    if (!img) return;
    var small = "img/screen-home-" + currentTheme() + "-660.webp";
    var big = "img/screen-home-" + currentTheme() + ".webp";
    if (!loaded) {
      if (img.getAttribute("src") !== small) img.src = small;
      return;
    }
    var pre = new Image();
    pre.onload = function () {
      img.src = big;
    };
    pre.src = big;
  }
  window.addEventListener("load", heroScreen);

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

  /* ---------- the nav: shown only near the top (or while it holds focus), so it never sits on text ---------- */
  var nav = document.querySelector(".nav");
  var sheet = document.getElementById("sheet");
  function placeNav() {
    var near = window.scrollY < 120;
    nav.classList.toggle(
      "is-hidden",
      !near && sheet.hidden && !nav.contains(document.activeElement)
    );
  }
  window.addEventListener("scroll", placeNav, { passive: true });
  nav.addEventListener("focusin", function () {
    nav.classList.remove("is-hidden");
  });
  nav.addEventListener("focusout", function () {
    setTimeout(placeNav, 0);
  });
  placeNav();

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
    placeNav();
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

  /* ---------- in-page links: jump, then focus the section ---------- */
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
    if (!glide || !tab || !tab.offsetHeight) return;
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
    if (platformPhone.key !== key || !platformPhone.img.getAttribute("src"))
      showScreen(platformPhone, key, !!focus || platformPhone.key !== key);
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

  /* ---------- the live question (try.js) ---------- */
  if (window.KarmanTry)
    window.KarmanTry(t, function (e) {
      engine = e;
      syncEngineTheme();
    });

  applyTheme(currentTheme(), false);
  Object.keys(phones).forEach(function (k) {
    if (k !== "hero" && k !== "platform") showScreen(phones[k], phones[k].key, false);
  });
  selectTab(tabs[0], false);
  window.addEventListener("load", function () {
    placeGlide(document.querySelector('.tab[aria-selected="true"]'));
  });

  // For motion.js.
  window.KarmanPortal = { phones: phones, reduce: reduce };
})();
