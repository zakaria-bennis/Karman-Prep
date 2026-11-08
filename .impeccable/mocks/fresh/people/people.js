/* Karman, "people" direction: words from copy.js, theme, opening, the split stage, the live
   question, results, questions and the menu. Plain JS, no libraries. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- words ---------- */
  var COPY = {};
  (function parse(src) {
    var section = "";
    String(src || "")
      .split("\n")
      .forEach(function (line) {
        var l = line.trim();
        if (!l) return;
        if (l.indexOf("## ") === 0) {
          section = l.slice(3).trim();
          return;
        }
        var i = l.indexOf(":");
        if (i < 1) return;
        // dates never break across lines ("December 12", "March 6")
        COPY[section + "." + l.slice(0, i).trim()] = l
          .slice(i + 1)
          .trim()
          .replace(
            /\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d)/g,
            "$1\u00a0$2"
          );
      });
  })(window.KARMAN_PEOPLE_COPY);
  function t(key) {
    return Object.prototype.hasOwnProperty.call(COPY, key) ? COPY[key] : "";
  }
  document.querySelectorAll("[data-c]").forEach(function (el) {
    el.textContent = t(el.dataset.c);
  });
  document.querySelectorAll("[data-c-label]").forEach(function (el) {
    el.setAttribute("aria-label", t(el.dataset.cLabel));
  });
  document.querySelectorAll("[data-c-alt]").forEach(function (el) {
    el.setAttribute("alt", t(el.dataset.cAlt));
  });
  if (t("meta.title")) document.title = t("meta.title");
  var md = document.querySelector('meta[name="description"]');
  if (md && t("meta.description")) md.setAttribute("content", t("meta.description"));

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {
      return null;
    }
    return null;
  }

  /* ---------- theme ---------- */
  var THEME_KEY = "karman-people-theme";
  var ICONS = {
    device:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="9.5" rx="0.5"/><path d="M7.5 16.5h5M10 13.5v3"/></svg>',
    light:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.4"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.8 12.4A6.5 6.5 0 0 1 7.6 4.2a6.5 6.5 0 1 0 8.2 8.2Z"/></svg>',
  };
  function chosen() {
    var v = store(THEME_KEY);
    return v === "light" || v === "dark" ? v : "device";
  }
  function scheme() {
    var c = chosen();
    if (c !== "device") return c;
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  var themeName = 0;
  function buildSwitch(slot, compact) {
    var g = document.createElement("div");
    g.className = "theme" + (compact ? " compact" : "");
    g.setAttribute("role", "radiogroup");
    g.setAttribute("aria-label", t("header.theme"));
    var name = "theme-" + themeName++;
    ["device", "light", "dark"].forEach(function (v) {
      var lab = document.createElement("label");
      lab.title = t("header.theme " + v);
      lab.innerHTML =
        '<input type="radio" name="' +
        name +
        '" value="' +
        v +
        '">' +
        ICONS[v] +
        '<span class="t-text">' +
        t("header.theme " + v) +
        "</span>";
      var input = lab.querySelector("input");
      input.checked = chosen() === v;
      input.addEventListener("change", function () {
        setTheme(v);
      });
      g.appendChild(lab);
    });
    slot.appendChild(g);
  }
  function setTheme(v) {
    if (v === "device") {
      try {
        localStorage.removeItem(THEME_KEY);
      } catch (e) {}
      doc.removeAttribute("data-theme");
    } else {
      store(THEME_KEY, v);
      doc.setAttribute("data-theme", v);
    }
    document.querySelectorAll('.theme input[value="' + v + '"]').forEach(function (i) {
      i.checked = true;
    });
    paintEngine();
  }
  document.querySelectorAll(".theme-slot").forEach(function (s) {
    buildSwitch(s, s.classList.contains("theme-slot-top"));
  });
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", paintEngine);

  /* ---------- opening (first visit only, under 1.3 s, any input skips) ---------- */
  function opening() {
    if (!doc.classList.contains("intro")) return;
    store("karman-people-opened", "1");
    var layer = document.querySelector(".intro-layer");
    var logo = layer.querySelector(".intro-logo");
    var target = document.querySelector(".top .brand");
    var anims = [];
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      anims.forEach(function (a) {
        try {
          a.cancel();
        } catch (e) {}
      });
      doc.classList.remove("intro", "intro-out");
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (e) {
        removeEventListener(e, finish, true);
      });
    }
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (e) {
      addEventListener(e, finish, { capture: true, passive: true });
    });
    if (!layer.animate) return finish();
    if (reduce.matches) {
      anims.push(
        layer.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 350,
          delay: 250,
          fill: "forwards",
        })
      );
      anims[0].onfinish = finish;
      return;
    }
    var stem = logo.querySelector(".mark-stem");
    var arms = logo.querySelector(".mark-arms");
    var strokes = logo.querySelectorAll(".word-strokes > *");
    var ease = "cubic-bezier(0.22, 0.8, 0.24, 1)";
    anims.push(
      stem.animate(
        [
          { transform: "translateY(18px)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: ease, fill: "both" }
      )
    );
    anims.push(
      arms.animate(
        [
          { transform: "translateX(14px)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, delay: 90, easing: ease, fill: "both" }
      )
    );
    strokes.forEach(function (p, i) {
      p.style.strokeDasharray = "1";
      anims.push(
        p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: 300,
          delay: 220 + i * 34,
          easing: "ease-out",
          fill: "both",
        })
      );
    });
    // Land in the header. The header is measured at landing time (after fonts and layout have
    // settled), so the logo ends exactly where the real one sits. The layer stays opaque until the
    // logo has landed, so it never crosses the page's text; then it fades in 160 ms (about 1.14 s in all).
    var t0 = performance.now();
    var landAt = function () {
      if (done) return;
      var a = logo.getBoundingClientRect();
      var am = logo.querySelector(".mark").getBoundingClientRect();
      var bm = target.querySelector(".mark").getBoundingClientRect();
      var s = bm.height / am.height;
      var dx = bm.left - a.left - (am.left - a.left) * s;
      var dy = bm.top - a.top - (am.top - a.top) * s;
      var land = logo.animate(
        [
          { transform: "none" },
          { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")" },
        ],
        { duration: 380, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "both" }
      );
      anims.push(land);
      land.onfinish = function () {
        if (done) return;
        doc.classList.add("intro-out");
        var fade = layer.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 160,
          easing: "ease-out",
          fill: "both",
        });
        anims.push(fade);
        fade.onfinish = finish;
      };
    };
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var cap = new Promise(function (r) {
      setTimeout(r, 600);
    });
    Promise.race([ready, cap]).then(function () {
      setTimeout(landAt, Math.max(0, 600 - (performance.now() - t0)));
    });
  }

  /* ---------- the split stage: the panel follows the step being read ---------- */
  var scenes = document.querySelectorAll(".panel .scene");
  if ("IntersectionObserver" in window && scenes.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var n = e.target.dataset.shot;
          scenes.forEach(function (s) {
            s.classList.toggle("is-on", s.dataset.shot === n);
          });
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    document.querySelectorAll(".step[data-shot]").forEach(function (s) {
      io.observe(s);
    });
  }

  /* ---------- entrances: heading, then text, then picture ---------- */
  var rises = document.querySelectorAll(".rise");
  if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var group = e.target.closest("section, .step") || document.body;
          var list = Array.prototype.slice.call(group.querySelectorAll(".rise:not(.in)"));
          list.forEach(function (el, i) {
            el.style.setProperty("--d", i * 80 + "ms");
            el.classList.add("in");
            ro.unobserve(el);
          });
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    rises.forEach(function (r) {
      ro.observe(r);
    });
  } else
    rises.forEach(function (r) {
      r.classList.add("in");
    });

  /* ---------- the live question (real engine DOM, graded with the engine's own classes) ---------- */
  var box = document.querySelector(".engine-box");
  var picks = document.querySelectorAll(".demo-pick");
  var verdict = document.querySelector(".demo-verdict");
  var explain = document.querySelector(".demo-explain");
  var after = document.querySelector(".demo-after");
  var again = document.querySelector(".demo-again");
  var cache = {};
  var current = picks[0];
  function paintEngine() {
    var root = box && box.querySelector(".karman-engine");
    if (!root) return;
    var dark = scheme() === "dark";
    root.setAttribute("data-theme", dark ? "observatory" : "ivory");
    root.classList.toggle("dark", dark);
  }
  function fit() {
    var qc = box.querySelector("[data-question-content]");
    if (!qc) return;
    box.style.height = "";
    var h = 56 + qc.scrollHeight;
    box.style.height = Math.min(Math.max(h, 320), 900) + "px";
  }
  addEventListener("resize", function () {
    if (box) fit();
  });
  function clearResult() {
    verdict.textContent = "";
    explain.textContent = "";
    after.textContent = "";
    again.hidden = true;
  }
  function load(pick) {
    current = pick;
    picks.forEach(function (p) {
      p.setAttribute("aria-pressed", p === pick ? "true" : "false");
    });
    clearResult();
    var id = pick.dataset.q;
    var put = function (html) {
      if (current !== pick) return;
      box.innerHTML = html;
      var root = box.querySelector(".karman-engine");
      if (root) {
        root.style.width = "";
        root.style.height = "";
      }
      paintEngine();
      fit();
      wire(pick);
    };
    if (cache[id]) return put(cache[id]);
    box.setAttribute("aria-busy", "true");
    fetch("../../redesign/engine/fragments/" + id + ".html")
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (h) {
        cache[id] = h;
        box.removeAttribute("aria-busy");
        put(h);
      })
      .catch(function () {
        box.removeAttribute("aria-busy");
        verdict.textContent = "";
      });
  }
  var KEEP = [
    "cursor-pointer",
    "hover:border-info/40",
    "hover:bg-info/5",
    "border-bronze",
    "bg-surface",
  ];
  function wire(pick) {
    var answer = pick.dataset.answer;
    var choices = box.querySelectorAll("[data-question-content] .space-y-3 > div > button");
    choices.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.hasAttribute("data-graded")) return;
        var chosenLetter = btn.firstElementChild.textContent.trim();
        choices.forEach(function (b) {
          var letter = b.firstElementChild.textContent.trim();
          var badge = b.firstElementChild;
          KEEP.forEach(function (c) {
            b.classList.remove(c);
          });
          badge.classList.remove("bg-surface-raised", "text-ivory/80");
          b.setAttribute("data-graded", "");
          b.setAttribute("aria-disabled", "true");
          if (letter === answer) {
            b.classList.add("border-success/40", "bg-success/15");
            badge.classList.add("bg-success", "text-night");
          } else if (letter === chosenLetter) {
            b.classList.add("border-error/40", "bg-error/15");
            badge.classList.add("bg-error", "text-night");
          } else {
            b.classList.add("border-bronze");
            badge.classList.add("bg-surface-raised", "text-taupe");
          }
        });
        var right = chosenLetter === answer;
        verdict.textContent = t(right ? "demo.right" : "demo.wrong");
        explain.textContent = t(pick.dataset.explain);
        after.textContent = right ? "" : t("demo.after wrong");
        again.hidden = false;
      });
    });
  }
  if (box) {
    picks.forEach(function (p) {
      p.addEventListener("click", function () {
        if (p !== current || again.hidden === false) load(p);
      });
    });
    again.addEventListener("click", function () {
      load(current);
    });
    var started = false;
    var start = function () {
      if (!started) {
        started = true;
        load(current);
      }
    };
    if ("IntersectionObserver" in window) {
      var eo = new IntersectionObserver(
        function (e) {
          if (e[0].isIntersecting) {
            start();
            eo.disconnect();
          }
        },
        { rootMargin: "600px 0px" }
      );
      eo.observe(box);
    } else start();
  }

  /* ---------- results ---------- */
  var scores = document.querySelectorAll(".score");
  var shots = document.querySelectorAll(".results-pic img");
  scores.forEach(function (s) {
    s.addEventListener("click", function () {
      scores.forEach(function (o) {
        var on = o === s;
        o.classList.toggle("is-on", on);
        o.setAttribute("aria-pressed", on ? "true" : "false");
      });
      shots.forEach(function (i) {
        i.classList.toggle("is-on", i.dataset.r === s.dataset.r);
      });
    });
  });

  /* ---------- questions: one open at a time, arrow keys move ---------- */
  var qs = Array.prototype.slice.call(document.querySelectorAll(".acc-q"));
  qs.forEach(function (q, i) {
    q.addEventListener("click", function () {
      var open = q.getAttribute("aria-expanded") === "true";
      qs.forEach(function (o) {
        var on = o === q && !open;
        o.setAttribute("aria-expanded", on ? "true" : "false");
        document.getElementById(o.getAttribute("aria-controls")).classList.toggle("open", on);
      });
    });
    q.addEventListener("keydown", function (e) {
      var n =
        e.key === "ArrowDown"
          ? (i + 1) % qs.length
          : e.key === "ArrowUp"
            ? (i - 1 + qs.length) % qs.length
            : e.key === "Home"
              ? 0
              : e.key === "End"
                ? qs.length - 1
                : -1;
      if (n >= 0) {
        e.preventDefault();
        qs[n].focus();
      }
    });
  });

  /* ---------- menu sheet ---------- */
  var sheet = document.getElementById("sheet");
  var opener = document.querySelector(".menu-open");
  var closer = document.querySelector(".sheet-close");
  function openSheet() {
    sheet.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closer.focus();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.hidden = true;
    opener.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    opener.focus();
  }
  opener.addEventListener("click", openSheet);
  closer.addEventListener("click", closeSheet);
  sheet.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      sheet.hidden = true;
      opener.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });
  document.addEventListener("keydown", function (e) {
    if (sheet.hidden) return;
    if (e.key === "Escape") return closeSheet();
    if (e.key !== "Tab") return;
    var f = sheet.querySelectorAll("a, button, input");
    var first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  opening();
})();
