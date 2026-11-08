/* Karman, direction "One day, in colour" (round 2, fix round 2). Reads every word from copy.js, places the
   real Karman screens and the motion lab's clips inside the iPhone 17 Pro Max, runs the day's tabs, the
   theme switch, the menu, the floating nav and the scroll moves (GSAP 3.12.5 + ScrollTrigger).
   Nothing in the hero waits for this script: the headline, the button and the phone's Home screen are in
   the HTML and visible from the first paint. */

/* ---------- SLOT MAP: one line per picture ----------
   Founder rules (2026-11-01): no AI-drawn phones; every device is a real current product (iPhone 17/18 Pro Max,
   Sony WH-1000XM5 or AirPods Max 2, Space Black MacBook Pro). An empty slot ("") shows no picture and the
   layout closes up around it. Fill a slot by converting the approved file to WebP in img/ and pasting its path. */
var SLOTS = {
  calendar: "img/gemini-rehearsal-stage-1400.webp", //       GEMINI rehearsal-stage.jpg (fixed: dark MacBook, no logo)
  "class-student": "img/gemini-zoom-student-tile-800.webp", // GEMINI zoom-student-tile.jpg (fixed: Sony WH-1000XM5)
  "class-tutor": "", //                                       camera-off tile until zoom-tutor-loop.mp4 is downloaded and checked
  parent: "img/gemini-parent-clay-top-900.webp", //           GEMINI cast-parent-clay.jpg, cropped above the hand: its phone is not in frame
  "pine-floor": "img/gemini-cast-student-pine-floor-900.webp", // GEMINI cast-student-pine-floor.jpg (fixed: AirPods Max, dark MacBook)
  ava: "img/result-ava-800.webp", //                          October film stills (real, approved results; no device in frame)
  mateo: "img/result-mateo-800.webp",
  priya: "img/result-priya-800.webp",
  // no hero portrait: every marigold student shot so far was rejected (drawn phone). The hero is a marigold field.
};
var SLOT_ALT = {
  calendar: "calendar/alt",
  "class-student": "class/alt student",
  "class-tutor": "class/alt tutor",
  "pine-floor": "plans/alt",
};

/* ---------- the real product: captures and clips from the motion lab ----------
   {m} is the page's mode (light or dark). No screen names Zakaria or shows a Private student's hours. */
var MOTION = "../../motion/";
var ENGINE = "../../redesign/engine/renders/alg-1-phone-{m}-";
var SHOTS = {
  home: "img/home-{m}-720.webp", // the Home capture at 720 px wide (46 KB), so it paints first
  daily: ENGINE + "question.webp",
  calendar: MOTION + "shots/student-classes-cohort-phone-{m}.webp",
  rewards: MOTION + "shots/student-rewards-cohort-phone-{m}.webp",
  parent: MOTION + "shots/parent-update-cohort-phone-{m}.webp",
};
var TAB_KEYS = ["home", "daily", "calendar", "rewards", "parent"];
/* Long screens are scrolled in code: the capture's own top and bottom bars stay, and the band between them
   comes from the tall "-scroll-" capture (points from motion/shots/geometry.json). The parent's band starts
   below the update's first line, which names the demo student; the page's student is Maya. */
var SCROLLS = {
  classes: { base: "student-classes-cohort", top: 102, bottom: 865, h: 1203, from: 102, to: 349 },
  parent: { base: "parent-update-cohort", top: 102, bottom: 805, h: 1414, from: 160, to: 560 },
};
var CLIPS = {
  class: MOTION + "out/d10-right-16x9-night", //  the shared screen in the Zoom class (engine, dark only)
  rewards: MOTION + "out/d10-finish-9x16-{g}", // {g}: pine (light screens) or night (dark screens)
};
var ENGINE_BG = { light: "#f7f6f0", dark: "#101d18" };

(function () {
  "use strict";
  var doc = document.documentElement;
  var lightMq = window.matchMedia("(prefers-color-scheme: light)");
  function store(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  }
  function read(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function motionOn() {
    return doc.classList.contains("js-motion");
  }
  var q = function (s, root) {
    return (root || document).querySelector(s);
  };
  var qa = function (s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  };

  /* ---------- copy ---------- */
  var COPY = {};
  (window.KARMAN_COPY || "").split(/^## /m).forEach(function (block) {
    var lines = block.split("\n");
    var name = lines.shift().trim();
    if (!name) return;
    COPY[name] = {};
    lines.forEach(function (line) {
      var i = line.indexOf(":");
      if (i < 1 || line.charAt(0) === "#") return;
      COPY[name][line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  });
  function c(key) {
    var p = key.split("/");
    return (COPY[p[0]] && COPY[p[0]][p[1]]) || "";
  }
  function list(key) {
    var v = c(key);
    return v ? v.split(" | ") : [];
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  qa("[data-c]").forEach(function (n) {
    var v = c(n.getAttribute("data-c"));
    if (v) n.textContent = v;
  });
  qa("[data-alt]").forEach(function (n) {
    var v = c(n.getAttribute("data-alt"));
    if (v) n.alt = v;
  });
  qa("[data-alt-c]").forEach(function (n) {
    var v = c(n.getAttribute("data-alt-c"));
    if (v) n.setAttribute("aria-label", v);
  });
  qa("[data-list]").forEach(function (n) {
    var items = list(n.getAttribute("data-list"));
    if (!items.length) return;
    n.textContent = "";
    items.forEach(function (t) {
      n.appendChild(el("li", null, t));
    });
  });
  // the clock: the time, then "a.m." smaller
  qa("[data-clock]").forEach(function (n) {
    var v = c(n.getAttribute("data-clock")) || n.textContent;
    var m = v.match(/^([\d:]+)\s*(.*)$/);
    n.textContent = "";
    var holder = el("span", "w");
    var inner = el("span", "wi");
    holder.appendChild(inner);
    if (m) {
      inner.appendChild(el("span", "t", m[1]));
      if (m[2]) inner.appendChild(el("span", "ap", " " + m[2]));
    } else inner.appendChild(el("span", "t", v));
    n.appendChild(holder);
  });
  // headlines: [brackets] mark the one coloured phrase; every word is wrapped for the Rise
  var UNDERLINE =
    '<svg class="kw-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M1 6.5C22 3.2 46 7.4 66 4.6S90 3.6 99 5"/></svg>';
  function words(parent, text) {
    text.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        parent.appendChild(document.createTextNode(" "));
        return;
      }
      var w = el("span", "w");
      w.appendChild(el("span", "wi", part));
      parent.appendChild(w);
    });
  }
  qa("[data-k]").forEach(function (n) {
    var v = c(n.getAttribute("data-k"));
    if (!v) {
      var kwOld = n.querySelector(".kw");
      v = kwOld
        ? n.textContent.replace(kwOld.textContent, "[" + kwOld.textContent + "]")
        : n.textContent;
    }
    n.textContent = "";
    var segs = v.split(/(\[[^\]]+\])/);
    segs.forEach(function (seg, i) {
      if (!seg) return;
      if (seg.charAt(0) === "[") {
        // the phrase and the punctuation right after it never part across a line break
        var wrap = el("span", "kwrap");
        var k = el("span", "kw");
        words(k, seg.slice(1, -1));
        k.insertAdjacentHTML("beforeend", UNDERLINE);
        wrap.appendChild(k);
        var next = segs[i + 1] || "";
        var punct = next.match(/^[.,;:!?]+/);
        if (punct) {
          var pw = el("span", "w");
          pw.appendChild(el("span", "wi", punct[0]));
          wrap.appendChild(pw);
          segs[i + 1] = next.slice(punct[0].length);
        }
        n.appendChild(wrap);
      } else words(n, seg);
    });
  });
  if (c("site/title")) document.title = c("site/title");
  var md = q('meta[name="description"]');
  if (md && c("site/description")) md.content = c("site/description");
  var TEST_URL = "https://karmanprep.com/free-practice-test";
  var navItems = list("site/nav").map(function (x) {
    return x.split(" = ");
  });
  if (navItems.length) {
    ["nav-list", "sheet-list"].forEach(function (id) {
      var ul = document.getElementById(id);
      ul.textContent = "";
      navItems.forEach(function (it) {
        var li = el("li");
        var a = el("a", null, it[0]);
        a.href = it[1];
        li.appendChild(a);
        ul.appendChild(li);
      });
      if (id === "sheet-list") {
        var li2 = el("li");
        var t = el("a", null, c("site/nav test"));
        t.href = TEST_URL;
        li2.appendChild(t);
        ul.appendChild(li2);
      }
    });
  }

  /* ---------- plans: four cards, two more behind "See all plans" ---------- */
  function planCard(item, lead) {
    var p = item.split(" = ");
    var li = el("li", "plan" + (lead ? " lead" : ""));
    li.appendChild(el("span", "spot"));
    if (lead && c("plans/lead tag")) li.appendChild(el("span", "plan-tag", c("plans/lead tag")));
    li.appendChild(el("h3", "plan-name", p[0]));
    li.appendChild(el("p", "plan-price", p[1]));
    li.appendChild(el("p", "plan-detail", p[2] || ""));
    if (p[3] && p[4]) {
      var a = el("a", "textlink", p[3]);
      a.href = p[4];
      li.appendChild(a);
    }
    return li;
  }
  var planGrid = document.getElementById("plan-grid");
  list("plans/rows").forEach(function (r, i) {
    planGrid.appendChild(planCard(r, i === 0));
  });
  var planMore = document.getElementById("plan-more");
  list("plans/more rows").forEach(function (r) {
    planMore.appendChild(planCard(r, false));
  });
  var planToggle = document.getElementById("plan-toggle");
  planToggle.addEventListener("click", function () {
    var open = planMore.hidden;
    planMore.hidden = !open;
    planToggle.setAttribute("aria-expanded", open ? "true" : "false");
    planToggle.textContent = open
      ? c("plans/fewer") || "Show fewer plans"
      : c("plans/more") || "See all plans";
    if (open && window.gsap && motionOn())
      gsap.fromTo(
        planMore.children,
        { y: 16 },
        { y: 0, duration: 0.4, ease: "expo.out", stagger: 0.05 }
      );
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
  // spotlight on the plan cards: two CSS variables per frame, desktop pointer only (21st.dev 35180)
  qa(".plan").forEach(function (card) {
    var raf = 0;
    card.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var b = card.getBoundingClientRect();
        card.style.setProperty("--x", e.clientX - b.left + "px");
        card.style.setProperty("--y", e.clientY - b.top + "px");
      });
    });
  });

  /* ---------- results: Ava, Mateo and Priya, always with the source label beside them ---------- */
  var strip = document.getElementById("result-strip");
  list("close/results").forEach(function (r) {
    var p = r.split(" = ");
    var li = el("li");
    var img = el("img");
    img.src = SLOTS[p[0].toLowerCase()] || "";
    img.width = 64;
    img.height = 80;
    img.loading = "lazy";
    img.alt = p[0] + " on the " + p[2] + " campus.";
    li.appendChild(img);
    li.appendChild(el("span", "r-score", p[1]));
    var who = el("span", "r-who");
    who.appendChild(el("b", null, p[0]));
    who.appendChild(document.createTextNode(p[2]));
    li.appendChild(who);
    strip.appendChild(li);
  });

  // footer links
  var footLinks = list("footer/links");
  if (footLinks.length) {
    var fl = document.getElementById("foot-links");
    fl.textContent = "";
    footLinks.forEach(function (x) {
      var p = x.split(" = ");
      var li = el("li");
      var a = el("a", null, p[0]);
      a.href = p[1];
      li.appendChild(a);
      fl.appendChild(li);
    });
  }
  // picture slots: fill each host from SLOTS, or mark it empty so the layout closes up
  qa("[data-slot-host]").forEach(function (fig) {
    var slot = fig.getAttribute("data-slot-host");
    var path = SLOTS[slot];
    if (!path) {
      // a Zoom tile with its camera off keeps its place and its name; anything else closes up
      fig.classList.add(fig.getAttribute("data-empty") || "empty");
      if (!fig.getAttribute("data-empty")) fig.setAttribute("aria-hidden", "true");
      return;
    }
    var img = el("img");
    img.src = path;
    img.alt = c(SLOT_ALT[slot] || "") || "";
    img.decoding = "async";
    img.loading = "lazy";
    fig.insertBefore(img, fig.firstChild);
  });
  qa("img[data-slot]").forEach(function (img) {
    var want = SLOTS[img.getAttribute("data-slot")];
    if (want && img.getAttribute("src") !== want) {
      img.removeAttribute("srcset");
      img.src = want;
    }
  });

  /* ---------- theme: Auto (the device, dark when it says nothing), Dark, Light; remembered ---------- */
  var themeBtn = document.getElementById("theme");
  var themeLabel = document.getElementById("theme-label");
  var ORDER = ["auto", "dark", "light"];
  function current() {
    return doc.getAttribute("data-theme") || "auto";
  }
  function scheme() {
    var t = current();
    if (t !== "auto") return t;
    return lightMq.matches ? "light" : "dark";
  }
  // every product picture carries a template ({m}) and takes the page's mode
  function paintSrc(img) {
    var tpl = img.getAttribute("data-tpl");
    if (!tpl) return;
    var want = tpl.replace("{m}", scheme());
    if (img.getAttribute("src") !== want) img.src = want;
  }
  function paintAll() {
    qa("img[data-tpl]").forEach(paintSrc);
    qa(".eng").forEach(function (e) {
      e.style.background = ENGINE_BG[scheme()];
    });
    // the Home screen in the HTML follows the device; a remembered choice overrides it
    var pic = q('#hero-screens picture[data-key="home"]');
    if (pic) {
      var want = SHOTS.home.replace("{m}", scheme());
      pic.querySelector("source").srcset = want;
      var im = pic.querySelector("img");
      if (im.getAttribute("src") !== want) im.src = want;
    }
  }
  var lastScheme = null;
  function paintTheme() {
    var t = current();
    var label = c("site/theme " + t) || t;
    themeLabel.textContent = label;
    themeBtn.setAttribute("aria-label", (c("site/theme") || "Theme") + ": " + label);
    var meta = q('meta[name="theme-color"]');
    var s = scheme();
    if (meta) meta.content = s === "dark" ? "#151412" : "#f5f5f2";
    if (s !== lastScheme) {
      lastScheme = s;
      paintAll();
      paintClips();
    }
  }
  themeBtn.addEventListener("click", function () {
    var next = ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length];
    if (next === "auto") doc.removeAttribute("data-theme");
    else doc.setAttribute("data-theme", next);
    store("karman-theme", next === "auto" ? null : next);
    paintTheme();
  });
  if (lightMq.addEventListener) lightMq.addEventListener("change", paintTheme);

  /* ---------- screens built from real captures ---------- */
  function shotImg(tpl, alt, lazy) {
    var img = el("img", "shot");
    img.setAttribute("data-tpl", tpl);
    img.alt = alt || "";
    img.width = 440;
    img.height = 956;
    img.decoding = "async";
    if (lazy) img.loading = "lazy";
    return img;
  }
  // a long screen: its own top and bottom bars, the middle band from the tall capture, moved by yPercent
  function scrollScreen(key, alt, lazy) {
    var g = SCROLLS[key];
    var wrap = el("div", "scrolls");
    wrap.appendChild(shotImg(MOTION + "shots/" + g.base + "-phone-{m}.webp", alt, lazy));
    var band = el("div", "band");
    band.style.top = (g.top / 956) * 100 + "%";
    band.style.height = ((g.bottom - g.top) / 956) * 100 + "%";
    var tall = el("img", "tall");
    tall.setAttribute("data-tpl", MOTION + "shots/" + g.base + "-scroll-phone-{m}.webp");
    tall.alt = "";
    tall.decoding = "async";
    if (lazy) tall.loading = "lazy";
    tall.style.transform = "translateY(" + (-g.from / g.h) * 100 + "%)";
    band.appendChild(tall);
    wrap.appendChild(band);
    wrap._scroll = { img: tall, from: (-g.from / g.h) * 100, to: (-g.to / g.h) * 100 };
    return wrap;
  }
  function engineScreen(states, alt, lazy) {
    var e = el("div", "eng");
    states.forEach(function (st, i) {
      var img = shotImg(ENGINE + st + ".webp", i === 0 ? alt : "", lazy);
      if (i > 0) img.style.opacity = "0";
      e.appendChild(img);
    });
    return e;
  }

  /* ---------- the hero phone and the day's tabs ----------
     Ported from 21st.dev 26923 "Segmented Tabs" (micka_design): a sliding selected background measured from
     the active tab, arrow keys move and activate. Base UI, framer-motion and the fluid hover layer were
     dropped; the slide is a CSS transform (0.25 s, cubic-bezier(0.22, 1, 0.36, 1)), recoloured to Karman.
     Only the Home screen loads with the page; the others load on the first hover, focus or click. */
  var tabsEl = document.getElementById("tabs");
  var ind = q(".tab-ind", tabsEl);
  var screens = document.getElementById("hero-screens");
  var heroPhone = document.getElementById("hero-phone");
  tabsEl.setAttribute("aria-label", c("hero/tabs label") || "Her day in the Karman app");
  var tabDefs = list("hero/tabs").map(function (x) {
    return x.split(" = ");
  });
  var screenAlts = list("hero/screen alts");
  var tabs = [];
  var screenEls = [];
  var active = 0;
  function makeScreen(i) {
    if (screenEls[i]) return screenEls[i];
    var key = TAB_KEYS[i];
    var node;
    if (key === "home") node = q('picture[data-key="home"]', screens);
    else if (key === "daily") node = engineScreen(["question"], screenAlts[i], false);
    else if (key === "parent") node = scrollScreen("parent", screenAlts[i], false);
    else node = shotImg(SHOTS[key], screenAlts[i], false);
    if (!node.parentNode) {
      node.setAttribute("aria-hidden", "true");
      screens.appendChild(node);
      qa("img[data-tpl]", node).forEach(paintSrc);
      if (node.matches("img[data-tpl]")) paintSrc(node);
      if (key === "daily") node.style.background = ENGINE_BG[scheme()];
    }
    screenEls[i] = node;
    return node;
  }
  // the five tabs are in the HTML (so the tray never jumps in); their words come from copy.js
  TAB_KEYS.forEach(function (key, i) {
    var d = tabDefs[i] || ["", key];
    var b = document.getElementById("tab-" + i);
    q(".t", b).textContent = d[0];
    q(".n", b).textContent = d[1];
    tabs.push(b);
    ["pointerenter", "focus"].forEach(function (ev) {
      b.addEventListener(ev, function () {
        makeScreen(i);
      });
    });
  });
  makeScreen(0);
  function placeInd() {
    var b = tabs[active];
    if (!b) return;
    ind.style.width = b.offsetWidth + "px";
    ind.style.height = b.offsetHeight + "px";
    ind.style.transform = "translate(" + b.offsetLeft + "px," + b.offsetTop + "px)";
  }
  function select(i, focus) {
    if (i === active) return;
    var prev = screenEls[active];
    var next = makeScreen(i);
    tabs[active].setAttribute("aria-selected", "false");
    tabs[active].tabIndex = -1;
    prev.classList.remove("is-on");
    prev.setAttribute("aria-hidden", "true");
    active = i;
    tabs[i].setAttribute("aria-selected", "true");
    tabs[i].tabIndex = 0;
    // next frame, so a screen built just now still cross-fades in
    requestAnimationFrame(function () {
      next.classList.add("is-on");
    });
    next.removeAttribute("aria-hidden");
    heroPhone.setAttribute("aria-labelledby", tabs[i].id);
    if (focus) tabs[i].focus();
    placeInd();
  }
  tabs.forEach(function (b, i) {
    b.addEventListener("click", function () {
      select(i, false);
    });
    b.addEventListener("keydown", function (e) {
      var k = e.key;
      var n = tabs.length;
      var to = null;
      if (k === "ArrowRight" || k === "ArrowDown") to = (i + 1) % n;
      else if (k === "ArrowLeft" || k === "ArrowUp") to = (i - 1 + n) % n;
      else if (k === "Home") to = 0;
      else if (k === "End") to = n - 1;
      if (to != null) {
        e.preventDefault();
        select(to, true);
      }
    });
  });
  placeInd();
  window.addEventListener("resize", placeInd);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeInd);

  /* ---------- chapter demos: real captures moved in code (Demo move), played once in view ---------- */
  var demos = qa("[data-demo]").map(function (host) {
    var kind = host.getAttribute("data-demo");
    var scr = q(".scr", host);
    var node;
    if (kind === "daily") {
      scr.classList.add("on-engine");
      node = engineScreen(["question", "wrong", "correct-explain"], "", true);
    } else node = scrollScreen(kind, "", true);
    node.classList.add("is-on");
    scr.appendChild(node);
    return { host: host, kind: kind, node: node, played: false };
  });
  function demoFinal(d) {
    if (d.kind === "daily") {
      var imgs = qa("img", d.node);
      imgs.forEach(function (im, i) {
        im.style.opacity = i === imgs.length - 1 ? "1" : "0";
      });
    }
  }

  /* ---------- the chapter clips: poster first, video loads 1.5 screens ahead, plays once in view ---------- */
  var clipHosts = qa("[data-clip]");
  var videos = [];
  function clipBase(name) {
    return CLIPS[name].replace("{g}", scheme() === "dark" ? "night" : "pine");
  }
  function buildClip(host) {
    var kind = host.getAttribute("data-kind");
    var box = kind === "feature" ? q(".scr", host) : host;
    var cls = kind === "feature" ? "fv" : "dv";
    var poster = el("img", cls);
    poster.alt = "";
    poster.loading = "lazy";
    poster.decoding = "async";
    box.appendChild(poster);
    var v = null;
    if (motionOn()) {
      v = el("video", cls);
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.loop = false; // plays once and holds (each clip ends on its first frame)
      v.preload = "none";
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("aria-hidden", "true");
      v.style.opacity = "0";
      v.addEventListener("loadeddata", function () {
        v.style.transition = "opacity .6s ease";
        v.style.opacity = "1";
      });
      box.appendChild(v);
      videos.push(v);
    }
    host._clip = { poster: poster, video: v, name: host.getAttribute("data-clip"), played: false };
  }
  clipHosts.forEach(buildClip);
  function paintClips() {
    clipHosts.forEach(function (h) {
      var cl = h._clip;
      if (!cl) return;
      var base = clipBase(cl.name);
      if (cl.poster.getAttribute("src") !== base + ".webp") cl.poster.src = base + ".webp";
      if (
        cl.video &&
        cl.video.getAttribute("src") &&
        cl.video.getAttribute("src") !== base + ".mp4"
      ) {
        cl.video.style.opacity = "0";
        cl.video.src = base + ".mp4";
        cl.played = false;
      }
    });
  }
  if (motionOn() && "IntersectionObserver" in window) {
    var loadIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          var cl = en.target._clip;
          if (en.isIntersecting && cl.video && !cl.video.getAttribute("src")) {
            cl.video.preload = "auto";
            cl.video.src = clipBase(cl.name) + ".mp4";
          }
        });
      },
      { rootMargin: "150% 0px" }
    );
    var playIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          var cl = en.target._clip;
          if (!cl.video) return;
          if (en.isIntersecting && motionOn()) {
            if (!cl.played) {
              var p = cl.video.play();
              if (p && p.catch) p.catch(function () {});
            }
          } else cl.video.pause();
        });
      },
      { threshold: 0.4 }
    );
    clipHosts.forEach(function (h) {
      loadIo.observe(h);
      playIo.observe(h);
      h._clip.video.addEventListener("ended", function () {
        h._clip.played = true;
      });
    });
  }

  /* ---------- phone menu sheet ---------- */
  var sheet = document.getElementById("sheet");
  var menuBtn = document.getElementById("menu-btn");
  var closeBtn = document.getElementById("sheet-close");
  function openSheet() {
    sheet.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }
  function closeSheet(back) {
    sheet.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (back) menuBtn.focus();
  }
  menuBtn.addEventListener("click", openSheet);
  closeBtn.addEventListener("click", function () {
    closeSheet(true);
  });
  sheet.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeSheet(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !sheet.hidden) closeSheet(true);
    if (e.key === "Tab" && !sheet.hidden) {
      var f = sheet.querySelectorAll("button, a");
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });

  /* ---------- floating nav: hides going down, returns going up (200 ms) ----------
     Base: 21st.dev 18090 "Floating Navbar" (a pill inset from the edges); its icon buttons, dropdown and
     shadow-lg were dropped for a 56 px glass pill with text links (modern-UI 2.1).
     Its button is marigold only while no other marigold button is on screen (rule 35). */
  var bar = document.getElementById("bar");
  var barTest = document.getElementById("bar-test");
  var lastY = window.scrollY;
  var upFrom = lastY;
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    if (sheet.hidden) {
      if (y > lastY && y > 120) {
        bar.classList.add("away");
        upFrom = y;
      } else if (y < 120 || upFrom - y > 48) bar.classList.remove("away");
      if (y > upFrom) upFrom = y;
    }
    lastY = y;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  bar.addEventListener("focusin", function () {
    bar.classList.remove("away");
  });
  var mainBtns = qa(".btn-main");
  var seen = new Map();
  if ("IntersectionObserver" in window) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        seen.set(en.target, en.isIntersecting);
      });
      var any = mainBtns.some(function (b) {
        return seen.get(b);
      });
      barTest.classList.toggle("on", !any);
    });
    mainBtns.forEach(function (b) {
      bio.observe(b);
    });
  }

  paintTheme();

  // a link from another page with a #section lands on that section: the plans and results are built above,
  // after the browser's own jump, and the hero phone grows, so jump again once the page has loaded
  function landOnHash() {
    if (location.hash.length < 2) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
  }
  if (document.readyState === "complete") landOnHash();
  else window.addEventListener("load", landOnHash);

  /* ---------- motion control in the footer (remembered) ---------- */
  var motionBtn = document.getElementById("motion-btn");
  function paintMotionBtn() {
    var paused = read("karman-motion") === "paused";
    motionBtn.textContent = paused
      ? c("footer/play") || "Play motion"
      : c("footer/pause") || "Pause motion";
    motionBtn.setAttribute("aria-pressed", paused ? "true" : "false");
  }
  paintMotionBtn();
  motionBtn.addEventListener("click", function () {
    var paused = read("karman-motion") === "paused";
    if (paused) {
      store("karman-motion", null);
      location.reload();
      return;
    }
    store("karman-motion", "paused");
    videos.forEach(function (v) {
      v.pause();
    });
    finishAll();
    paintMotionBtn();
  });

  /* ---------- final states (reduced motion, paused, or no GSAP) ---------- */
  function finishAll() {
    if (window.ScrollTrigger)
      ScrollTrigger.getAll().forEach(function (st) {
        if (st.animation) st.animation.progress(1);
        st.kill();
      });
    if (window.gsap)
      gsap.globalTimeline.getChildren().forEach(function (t) {
        t.progress(1);
      });
    doc.classList.remove("js-motion");
    qa(".kw").forEach(function (k) {
      k.classList.add("landed");
    });
    demos.forEach(demoFinal);
  }

  /* ---------- motion: GSAP arrives after the page has loaded, then the scroll moves start ---------- */
  if (!motionOn()) {
    finishAll();
    return;
  }
  var LIBS = [
    [
      "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
      "sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt",
    ],
    [
      "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
      "sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d",
    ],
  ];
  function loadLib(i) {
    if (i >= LIBS.length) return startMotion();
    var sc = document.createElement("script");
    sc.src = LIBS[i][0];
    sc.integrity = LIBS[i][1];
    sc.crossOrigin = "anonymous";
    sc.onload = function () {
      loadLib(i + 1);
    };
    sc.onerror = function () {
      finishAll();
    };
    document.head.appendChild(sc);
  }
  if (document.readyState === "complete") loadLib(0);
  else
    window.addEventListener("load", function () {
      loadLib(0);
    });

  function startMotion() {
    if (!window.gsap || !window.ScrollTrigger || !motionOn()) {
      finishAll();
      return;
    }
    // the brief's tokens (motion-and-colour brief 4.2), shortened by the fix-round rule: content is never
    // invisible on screen. Reveals move only (y up to 16 px, 0.5 s at most) and start before the section
    // enters ("top 95%"); a jump or a fast scroll lands on finished content.
    var T = {
      out: "expo.out",
      inOut: "power3.inOut",
      settle: "power4.out",
      reveal: 0.5,
      count: 0.5,
      items: 0.05,
      start: "top 95%",
      fast: 1600, // px/s: faster than this and the section is shown finished
    };
    // ScrollTrigger is registered only when motion runs, so a paused or still page never refreshes triggers
    gsap.registerPlugin(ScrollTrigger);
    var mm = gsap.matchMedia();
    mm.add({ wide: "(min-width: 768px)", narrow: "(max-width: 767px)" }, function (ctx) {
      var wide = ctx.conditions.wide;
      var rise = wide ? 16 : 12;
      // Rise: the block moves up into place; it is fully opaque the whole time
      function lift(tl, nodes, at, stagger) {
        if (!nodes || (nodes.length === 0 && !nodes.nodeType)) return tl;
        tl.fromTo(
          nodes,
          { y: rise },
          { y: 0, duration: T.reveal, ease: T.out, stagger: stagger || 0 },
          at
        );
        return tl;
      }
      // Land, keyword form: the hand-drawn underline is revealed left to right (a clip, so the stroke never
      // breaks), then the phrase takes its colour. Idea from 21st.dev 18352 "Line Draw SVG" (pulkitxm).
      function landKw(tl, h, at) {
        var k = h && h.querySelector(".kw");
        if (!k) return tl;
        var line = k.querySelector(".kw-line");
        tl.fromTo(
          line,
          { clipPath: "inset(0% 100% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.4, ease: T.settle, immediateRender: false },
          at
        );
        tl.call(
          function () {
            k.classList.add("landed");
          },
          null,
          at + 0.1
        );
        return tl;
      }
      // play once when reached; on a jump past it (onLeave / onEnterBack) or a fast scroll, show it finished.
      // The trigger removes itself on the next tick, never inside ScrollTrigger's own refresh.
      function whenReached(trigger, start, play, finish) {
        var done = false;
        function go(self, jumped) {
          if (done) return;
          done = true;
          if (jumped || Math.abs(self.getVelocity()) > T.fast) finish();
          else play();
          gsap.delayedCall(0, function () {
            self.kill();
          });
        }
        ScrollTrigger.create({
          trigger: trigger,
          start: start,
          onEnter: function (self) {
            go(self, false);
          },
          onLeave: function (self) {
            go(self, true);
          },
          onEnterBack: function (self) {
            go(self, true);
          },
        });
      }
      function sectionTl(trigger) {
        var tl = gsap.timeline({ paused: true });
        whenReached(
          trigger,
          T.start,
          function () {
            tl.play();
          },
          function () {
            tl.progress(1);
          }
        );
        return tl;
      }
      // Demo: the real screens move once the phone is in view, then hold
      function playDemo(d) {
        if (d.played) return;
        d.played = true;
        var tl = gsap.timeline({ delay: 0.3 });
        if (d.kind === "daily") {
          var imgs = qa("img", d.node);
          tl.to(imgs[1], { opacity: 1, duration: 0.3, ease: T.inOut }, 0.8);
          tl.to(imgs[2], { opacity: 1, duration: 0.4, ease: T.inOut }, 2.4);
          tl.set(imgs[1], { opacity: 0 }, 2.8);
        } else {
          var sc = d.node._scroll;
          tl.fromTo(
            sc.img,
            { yPercent: sc.from },
            { yPercent: sc.to, duration: 4.2, ease: "power1.inOut" },
            0.4
          );
        }
      }
      demos.forEach(function (d) {
        whenReached(
          d.host,
          "top 70%",
          function () {
            playDemo(d);
          },
          function () {
            playDemo(d);
          }
        );
      });

      // the chapters: everything is visible; the copy and the phone settle up into place, the keyword lands
      ["#daily", "#calendar", "#class", "#rewards", "#parent"].forEach(function (id) {
        var sec = q(id);
        var card = q(".card", sec);
        var tl = sectionTl(card);
        lift(tl, [q(".clock", sec), q(".h2", sec)], 0, T.items);
        lift(tl, qa(".sub, .note, .textlink, .chips", card), 0.08, T.items);
        lift(tl, q(".ch-media", sec), 0.04);
        landKw(tl, q(".h2", sec), 0.35);
        // light parallax on the photographs only, desktop only (Hand-off move)
        var ph = q(".media-card img", sec);
        if (wide && ph)
          gsap.fromTo(
            ph,
            { yPercent: -4, scale: 1.08 },
            {
              yPercent: 4,
              scale: 1.08,
              ease: "none",
              scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
      });

      // plans: the cards settle up; the program's price lands last
      var pl = q("#plans");
      var pltl = sectionTl(q(".plans-head", pl));
      lift(pltl, [q(".h2", pl), q(".plans-head .sub", pl), q(".plans-photo", pl)], 0, T.items);
      lift(pltl, qa("#plan-grid > li", pl), 0.05, T.items);
      landKw(pltl, q(".h2", pl), 0.35);

      // the three results: each score counts up through real-looking values (never zeros or junk),
      // ending on the exact number; a jump shows the final number at once
      var cl = q("#close");
      var rtl = sectionTl(q(".results", cl));
      lift(rtl, qa(".result-strip li", cl), 0, T.items);
      qa(".r-score", cl).forEach(function (n, ni) {
        var target = Number(n.textContent.replace(/\D/g, ""));
        n.setAttribute("aria-label", n.textContent);
        n.setAttribute("role", "img");
        var o = { v: target - 60 };
        rtl.fromTo(
          o,
          { v: target - 60 },
          {
            v: target,
            duration: T.count,
            ease: T.settle,
            onUpdate: function () {
              n.textContent = String(Math.round(o.v));
            },
            onComplete: function () {
              n.textContent = String(target);
            },
            immediateRender: false,
          },
          0.05 + ni * 0.05
        );
      });
      var cc = q(".close-card", cl);
      var ctl = sectionTl(cc);
      lift(ctl, [q(".h2", cc), q(".sub", cc), q(".act", cc)], 0, T.items);
      ctl.call(
        function () {
          q(".kw", cc).classList.add("landed");
        },
        null,
        0.3
      );
    });
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(function () {
        ScrollTrigger.refresh();
      });
    ScrollTrigger.refresh();
  }
})();
