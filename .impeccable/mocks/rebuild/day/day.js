/* Karman, direction "One day, in colour", round 2. Reads every word from copy.js, places the real
   Karman screens and the motion lab's clips inside the iPhone 17 Pro Max, runs the day's tabs, the
   theme switch, the menu, the floating nav, the first-visit opening and the scroll moves
   (GSAP 3.12.5 + ScrollTrigger). */

/* ---------- SLOT MAP: one line per picture ----------
   Each slot names the file the page shows. When a Gemini picture arrives in assets/gemini-inbox/,
   convert it to WebP into img/ and change the path on its line (see NOTES.md, "Slot map"). */
var SLOTS = {
  // Founder rules (2026-11-01): no AI-drawn phones; every device is a real current product (iPhone 17/18 Pro Max,
  // Sony WH-1000XM5 or AirPods Max 2, Space Black MacBook Pro). An empty slot ("") shows no picture and the
  // layout closes up around it. Fill a slot by converting the approved file to WebP in img/ and pasting its path.
  hero: "", //            was the flux stand-in (generic headphones and a drawn phone): dropped. Gemini cast-student-marigold.jpg REJECTED.
  calendar: "", //        Gemini pool-bleachers.jpg: dropped, the phone in her hands is not an iPhone 17 Pro Max.
  "class-student": "", // Gemini zoom-student-tile.jpg: in needs-fix (wired earphones). Was the flux stand-in (earbuds): dropped.
  "class-tutor": "", //   flux stand-in (wired earphones): dropped. Gemini zoom-tutor-loop.mp4 not in yet.
  parent: "img/gemini-parent-clay-top-900.webp", // GEMINI cast-parent-clay.jpg (founder), cropped above the hand and phone
  "pine-floor": "", //    Gemini cast-student-pine-floor.jpg: in needs-fix (laptop).
  ava: "img/result-ava-800.webp", //                 October film still (real result, approved; no device in frame)
  mateo: "img/result-mateo-800.webp",
  priya: "img/result-priya-800.webp",
  // not used: rehearsal-stage.jpg (in needs-fix; no chapter of this day is at a rehearsal)
};
var SLOT_ALT = {
  hero: "hero/alt",
  calendar: "calendar/alt",
  "class-student": "class/alt student",
  "class-tutor": "class/alt tutor",
  "pine-floor": "plans/alt",
};

/* ---------- the real product: captures and clips from the motion lab ----------
   {m} is the page's mode (light or dark). Feature clips use the pine render for light screens and the
   night render for dark screens; only the phone's screen is shown, cropped from the clip. */
var MOTION = "../../motion/";
var SHOTS = {
  home: MOTION + "shots/student-home-cohort-phone-{m}.webp",
  daily: "../../redesign/engine/renders/alg-1-phone-{m}-question.webp",
  calendar: MOTION + "shots/student-booking-slot-phone-{m}.webp",
  rewards: MOTION + "shots/student-rewards-cohort-phone-{m}.webp",
  parent: MOTION + "shots/parent-update-cohort-phone-{m}.webp",
};
var TAB_KEYS = ["home", "daily", "calendar", "rewards", "parent"];
var CLIPS = {
  daily: MOTION + "out/d10-wrong-9x16-night", //         the question engine (dark captures only)
  calendar: MOTION + "out/calendar-9x16-{g}", //          {g}: pine (light screens) or night (dark screens)
  class: MOTION + "out/d10-right-16x9-night", //          the shared screen in the Zoom class
  rewards: MOTION + "out/d10-finish-9x16-{g}",
  parent: MOTION + "out/parent-update-9x16-{g}",
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
    '<svg class="kw-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M1 6.5C22 3.2 46 7.4 66 4.6S90 3.6 99 5"/></svg>';
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
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, ease: "expo.out", stagger: 0.08 }
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
      fig.classList.add("empty");
      fig.setAttribute("aria-hidden", "true");
      return;
    }
    var img = el("img");
    img.src = path;
    img.alt = c(SLOT_ALT[slot] || "") || "";
    img.decoding = "async";
    if (slot !== "hero") img.loading = "lazy";
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
      paintScreens();
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

  /* ---------- the hero phone and the day's tabs ----------
     Ported from 21st.dev 26923 "Segmented Tabs" (micka_design): a sliding selected background measured from
     the active tab, arrow keys move and activate. Base UI, framer-motion and the fluid hover layer were
     dropped; the slide is a CSS transform (0.25 s, cubic-bezier(0.22, 1, 0.36, 1)), recoloured to Karman. */
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
  TAB_KEYS.forEach(function (key, i) {
    var d = tabDefs[i] || ["", key];
    var b = el("button", "tab");
    b.type = "button";
    b.id = "tab-" + i;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", "hero-phone");
    b.setAttribute("aria-selected", i === 0 ? "true" : "false");
    b.tabIndex = i === 0 ? 0 : -1;
    b.appendChild(el("span", "t", d[0]));
    b.appendChild(el("span", "n", d[1]));
    tabsEl.appendChild(b);
    tabs.push(b);
    var img = el("img", "shot");
    img.alt = screenAlts[i] || d[1];
    img.decoding = "async";
    img.width = 440;
    img.height = 956;
    var node = img;
    if (key === "daily") {
      node = el("div", "eng");
      node.appendChild(img);
    }
    if (i === 0) node.classList.add("is-on");
    else img.setAttribute("aria-hidden", "true");
    screens.appendChild(node);
    screenEls.push({ node: node, img: img, key: key });
  });
  function paintScreens() {
    var m = scheme();
    screenEls.forEach(function (s) {
      var want = SHOTS[s.key].replace("{m}", m);
      if (s.img.getAttribute("src") !== want) s.img.src = want;
      if (s.key === "daily") s.node.style.background = ENGINE_BG[m];
    });
    screens.classList.toggle("on-engine", screenEls[active].key === "daily");
    screens.style.background = screenEls[active].key === "daily" ? ENGINE_BG[m] : "";
  }
  function placeInd() {
    var b = tabs[active];
    if (!b) return;
    ind.style.width = b.offsetWidth + "px";
    ind.style.height = b.offsetHeight + "px";
    ind.style.transform = "translate(" + b.offsetLeft + "px," + b.offsetTop + "px)";
  }
  function select(i, focus) {
    if (i === active) return;
    tabs[active].setAttribute("aria-selected", "false");
    tabs[active].tabIndex = -1;
    screenEls[active].node.classList.remove("is-on");
    screenEls[active].img.setAttribute("aria-hidden", "true");
    active = i;
    tabs[i].setAttribute("aria-selected", "true");
    tabs[i].tabIndex = 0;
    screenEls[i].node.classList.add("is-on");
    screenEls[i].img.removeAttribute("aria-hidden");
    heroPhone.setAttribute("aria-labelledby", tabs[i].id);
    if (focus) tabs[i].focus();
    placeInd();
    paintScreens();
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

  /* ---------- the chapter clips: poster first, video loads 1.5 screens ahead, plays once in view ---------- */
  var clipHosts = qa("[data-clip]");
  var videos = [];
  function clipBase(name) {
    return CLIPS[name].replace("{g}", scheme() === "dark" ? "night" : "pine");
  }
  function buildClip(host) {
    var kind = host.getAttribute("data-kind");
    var box = host;
    var cls = "fv";
    if (kind === "feature") box = q(".scr", host);
    if (kind === "engine") {
      var scr = q(".scr", host);
      scr.classList.add("on-engine");
      box = el("div", "eng");
      scr.appendChild(box);
      cls = "ev";
    }
    if (kind === "desktop") cls = "dv";
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
            if (!cl.played || !cl.video.ended) {
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
  function finishAll(keepIntro) {
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
    if (!keepIntro) endIntro();
  }

  /* ---------- the opening: first visit only, under 1.3 s, skipped by any key, tap, click or wheel ---------- */
  var intro = document.getElementById("intro");
  var introDone = !doc.classList.contains("intro-on");
  var introTl = null;
  function endIntro() {
    if (introDone) return;
    introDone = true;
    doc.classList.remove("intro-on");
    store("karman-day-opened", "1");
    ["keydown", "pointerdown", "wheel", "touchstart"].forEach(function (t) {
      window.removeEventListener(t, skipIntro, true);
    });
  }
  function skipIntro() {
    if (introTl) introTl.progress(1);
    else if (window.gsap) gsap.to(intro, { opacity: 0, duration: 0.16, onComplete: endIntro });
    else endIntro();
  }
  if (!introDone)
    ["keydown", "pointerdown", "wheel", "touchstart"].forEach(function (t) {
      window.addEventListener(t, skipIntro, { capture: true, passive: true });
    });

  /* ---------- motion ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    finishAll();
    return;
  }
  // the brief's tokens (motion-and-colour brief 4.2); "settle" is its CustomEase 0.2,0.8,0.2,1, whose
  // named stand-in power4.out saves loading CustomEase
  var T = {
    out: "expo.out",
    inOut: "power3.inOut",
    settle: "power4.out",
    quick: 0.2,
    base: 0.6,
    reveal: 0.9,
    count: 1.2,
    words: 0.06,
    items: 0.08,
    reveal0: "top 82%",
    focus: "top 55%",
  };

  if (!motionOn()) {
    finishAll(true);
    if (!introDone)
      gsap.to(intro, { opacity: 0, duration: 0.4, delay: 0.4, ease: "none", onComplete: endIntro });
    return;
  }

  // ScrollTrigger is registered only when motion runs, so a paused or still page never refreshes triggers
  gsap.registerPlugin(ScrollTrigger);
  var mm = gsap.matchMedia();
  mm.add({ wide: "(min-width: 768px)", narrow: "(max-width: 767px)" }, function (ctx) {
    var wide = ctx.conditions.wide;
    var rise = wide ? 24 : 16;
    // Rise: words from a mask, in reading order
    function riseWords(tl, node, at) {
      if (!node) return tl;
      tl.set(node, { opacity: 1 }, at);
      tl.fromTo(
        qa(".wi", node),
        { yPercent: 105 },
        { yPercent: 0, duration: T.reveal, ease: T.out, stagger: T.words },
        at
      );
      return tl;
    }
    function lift(tl, nodes, at, stagger) {
      if (!nodes || (nodes.length === 0 && !nodes.nodeType)) return tl;
      tl.fromTo(
        nodes,
        { opacity: 0, y: rise },
        { opacity: 1, y: 0, duration: T.reveal, ease: T.out, stagger: stagger || 0 },
        at
      );
      return tl;
    }
    function fade(tl, nodes, at) {
      tl.fromTo(nodes, { opacity: 0 }, { opacity: 1, duration: T.base, ease: T.out }, at);
      return tl;
    }
    // Land, keyword form: the underline draws, then the phrase takes its colour.
    // Stroke draw ported from 21st.dev 18352 "Line Draw SVG" (pulkitxm): dashoffset from full length to 0,
    // once, never scrubbed; pathLength="1" stands in for getTotalLength(); recoloured per chapter.
    function landKw(tl, h, at) {
      var k = h && h.querySelector(".kw");
      if (!k) return tl;
      var p = k.querySelector(".kw-line path");
      tl.fromTo(
        p,
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.5, ease: T.settle, immediateRender: false },
        at
      );
      tl.call(
        function () {
          k.classList.add("landed");
        },
        null,
        at + 0.12
      );
      return tl;
    }
    // Land, settle form: arrives 8 px low at 0.98 and settles
    function settle(tl, node, at) {
      tl.fromTo(
        node,
        { opacity: 0, y: 8, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: T.base, ease: T.settle },
        at
      );
      return tl;
    }
    function sectionTl(trigger) {
      return gsap.timeline({ scrollTrigger: { trigger: trigger, start: T.reveal0, once: true } });
    }

    /* Arrive: the hero. The stage and Maya's photo are there from the first paint; the pill, the clock,
       the headline and its chip, the line, the phone rises over the photo, the tabs, and the button
       lands last. */
    var hero = q("#top");
    var arrive = gsap.timeline({ paused: true });
    fade(arrive, q(".hero-photo"), 0);
    lift(arrive, q(".pill-link", hero), 0.05);
    riseWords(arrive, q(".clock", hero), 0.1);
    riseWords(arrive, q(".h1", hero), 0.16);
    arrive.fromTo(
      q(".h1 .kw", hero),
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: T.out },
      0.3
    );
    arrive.fromTo(
      q(".sub", hero),
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: T.reveal, ease: T.out },
      0.45
    );
    arrive.fromTo(
      heroPhone,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1, ease: T.out },
      0.3
    );
    lift(arrive, q(".tabs", hero), 0.6);
    arrive.set(q(".act", hero), { opacity: 1 }, 0.7);
    settle(arrive, q("#hero-btn"), 0.75);
    arrive.fromTo(q(".act .note", hero), { opacity: 0 }, { opacity: 1, duration: T.base }, 0.9);
    arrive.call(placeInd, null, 0.6);

    /* the chapters: the block arrives, then the clock, the headline, the line; the phone rises a beat
       later and its clip starts; the keyword lands last */
    ["#daily", "#calendar", "#class", "#rewards", "#parent"].forEach(function (id) {
      var sec = q(id);
      var card = q(".card", sec);
      var tl = sectionTl(card);
      riseWords(tl, q(".clock", sec), 0);
      riseWords(tl, q(".h2", sec), 0.12);
      lift(tl, qa(".sub, .note, .textlink", card), 0.42, T.items);
      lift(tl, qa(".chips li", card), 0.55, T.items);
      tl.fromTo(
        q(".ch-media", sec),
        { opacity: 0, y: rise * 2 },
        { opacity: 1, y: 0, duration: 1, ease: T.out },
        0.2
      );
      landKw(tl, q(".h2", sec), 1.1);
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

    // plans: headline, line, cards; the program's price settles last
    var pl = q("#plans");
    var pltl = sectionTl(q(".plans-head", pl));
    riseWords(pltl, q(".h2", pl), 0);
    lift(pltl, q(".plans-head .sub", pl), 0.3);
    lift(pltl, q(".plans-photo", pl), 0.15);
    lift(pltl, qa("#plan-grid > li", pl), 0.25, T.items);
    lift(pltl, q("#plan-toggle"), 0.6);
    landKw(pltl, q(".h2", pl), 0.9);
    settle(pltl, q("#plan-grid .lead .plan-price"), 1.05);

    // next fall: the clock, the three results (each score rolls once), the source; then the night card
    var cl = q("#close");
    var rtl = sectionTl(q(".results", cl));
    riseWords(rtl, q(".results .clock", cl), 0);
    lift(rtl, qa(".result-strip li", cl), 0.1, T.items);
    lift(rtl, q(".source", cl), 0.35);
    // Count: an odometer, right to left, once. Ported from 21st.dev 20068 "Count Up" (unlumen), its
    // "slide" digit effect: one 0-9 column per place moved by a transform; spring, blur and fade dropped.
    qa(".r-score", cl).forEach(function (n, ni) {
      var target = n.textContent;
      n.setAttribute("role", "img");
      n.setAttribute("aria-label", target);
      n.textContent = "";
      var odo = el("span", "odo");
      var reels = [];
      target.split("").forEach(function (ch) {
        var col = el("span", "col");
        col.setAttribute("aria-hidden", "true");
        var reel = el("span", "reel");
        var seq = [];
        if (/\d/.test(ch)) {
          var d = Number(ch);
          for (var i = 0; i <= 10 + d; i++) seq.push(String(i % 10));
          reels.push({ reel: reel, steps: 10 + d, len: 11 + d });
        } else seq.push(ch);
        reel.setAttribute("data-seq", seq.join("\n"));
        col.appendChild(reel);
        odo.appendChild(col);
      });
      n.appendChild(odo);
      reels
        .slice()
        .reverse()
        .forEach(function (r, i) {
          rtl.fromTo(
            r.reel,
            { yPercent: 0 },
            { yPercent: (-100 * r.steps) / r.len, duration: T.count, ease: T.settle },
            0.3 + ni * 0.08 + i * 0.06
          );
        });
    });
    var cc = q(".close-card", cl);
    var ctl = sectionTl(cc);
    riseWords(ctl, q(".h2", cc), 0);
    lift(ctl, q(".sub", cc), 0.3);
    ctl.set(q(".act", cc), { opacity: 1 }, 0.6);
    settle(ctl, q("#close-btn"), 0.65);
    ctl.fromTo(q(".act .note", cc), { opacity: 0 }, { opacity: 1, duration: T.base }, 0.8);
    ctl.call(
      function () {
        q(".kw", cc).classList.add("landed");
      },
      null,
      0.5
    );

    // start the hero once the opening has gone (or at once)
    if (introDone) arrive.play();
    else {
      var iq = function (s) {
        return intro.querySelector(s);
      };
      introTl = gsap.timeline({
        onComplete: function () {
          endIntro();
          introTl = null;
        },
      });
      introTl
        .fromTo(
          iq(".i-ring"),
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.45, ease: T.settle },
          0
        )
        .fromTo(
          [iq(".i-stem"), iq(".i-leg")],
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.35, ease: T.settle, stagger: 0.08 },
          0.1
        )
        .fromTo(
          iq(".i-hand"),
          { rotation: -95, svgOrigin: "12.6 16.4" },
          { rotation: 0, svgOrigin: "12.6 16.4", duration: 0.45, ease: T.settle },
          0.2
        )
        .fromTo(
          iq(".intro-word"),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4, ease: T.out },
          0.3
        )
        .to(intro, { opacity: 0, duration: 0.2, ease: T.inOut }, 0.8)
        .call(
          function () {
            arrive.play();
          },
          null,
          0.82
        );
    }
  });
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () {
      ScrollTrigger.refresh();
    });
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
})();
