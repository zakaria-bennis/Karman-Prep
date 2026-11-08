/* Karman, editorial direction. Reads every word from copy.js, then wires the theme switch,
   the phone menu, the opening, the reveals and the live question. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) root.classList.add("motion");

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
  (function parse(src) {
    var section = "";
    (src || "").split("\n").forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      if (line.indexOf("## ") === 0) {
        section = line.slice(3).trim();
        return;
      }
      var i = line.indexOf(": ");
      if (i < 0) return;
      COPY[section + "." + line.slice(0, i).trim()] = line.slice(i + 2).trim();
    });
  })(window.EDITORIAL_COPY);
  function t(key) {
    if (!(key in COPY)) {
      console.warn("copy.js has no " + key);
      return "";
    }
    return COPY[key];
  }
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-copy"));
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
  if (desc && COPY["meta.description"]) desc.setAttribute("content", COPY["meta.description"]);

  /* ---------- theme: device first, dark when none, remembered toggle (rule 33) ---------- */
  // Two-option segmented switch, ported from 21st.dev component 37721 (zweiundeins, Theme Switch).
  var themeButtons = document.querySelectorAll("[data-theme-set]");
  function applyTheme(name, remember) {
    root.setAttribute("data-theme", name);
    themeButtons.forEach(function (b) {
      b.setAttribute("aria-checked", String(b.getAttribute("data-theme-set") === name));
    });
    if (remember) store("karman-theme", name);
    syncEngineTheme();
  }
  themeButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      applyTheme(b.getAttribute("data-theme-set"), true);
    });
  });
  var themeGroup = document.querySelector(".theme");
  if (themeGroup) {
    themeGroup.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next, true);
      themeGroup.querySelector('[data-theme-set="' + next + '"]').focus();
      e.preventDefault();
    });
  }
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function (e) {
    if (!store("karman-theme")) applyTheme(e.matches ? "light" : "dark", false);
  });

  /* ---------- phone menu: a full-height sheet ---------- */
  var sheet = document.getElementById("sheet");
  var opener = document.querySelector(".menu-open");
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
    if (e.key === "Escape") {
      closeSheet(true);
      return;
    }
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

  /* ---------- in-page links glide, unless motion is reduced ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.pushState(null, "", "#" + id);
    if (id !== "top") {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });

  /* ---------- the title, split into its real lines (21st.dev 19257, Text Reveal (Mask)) ---------- */
  var title = document.querySelector(".reveal-lines");
  function splitLines(el) {
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var words = text.split(/\s+/).map(function (w, i) {
      var s = document.createElement("span");
      s.textContent = w;
      if (i) el.appendChild(document.createTextNode(" "));
      el.appendChild(s);
      return s;
    });
    var lines = [],
      top = null;
    words.forEach(function (w) {
      if (top === null || w.offsetTop > top + 2) {
        lines.push([]);
        top = w.offsetTop;
      }
      lines[lines.length - 1].push(w.textContent);
    });
    el.textContent = "";
    lines.forEach(function (l) {
      var line = document.createElement("span");
      line.className = "line";
      line.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.textContent = l.join(" ");
      line.appendChild(inner);
      el.appendChild(line);
    });
  }
  var lastWidth = 0;
  function layoutTitle() {
    if (!title) return;
    var w = title.clientWidth;
    if (w === lastWidth) return;
    lastWidth = w;
    title.textContent = title.getAttribute("aria-label") || title.textContent;
    splitLines(title);
  }
  var hero = document.querySelector(".hero");
  function startHero() {
    requestAnimationFrame(function () {
      title.classList.add("is-in");
      hero.classList.add("is-in");
    });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(
    function () {
      layoutTitle();
      if (!root.classList.contains("is-opening")) startHero();
    }
  );
  layoutTitle();
  window.addEventListener("resize", function () {
    layoutTitle();
  });

  /* ---------- section entrances ---------- */
  var enters = document.querySelectorAll(".enter");
  document.querySelectorAll("section").forEach(function (s) {
    s.querySelectorAll(".enter").forEach(function (el, i) {
      el.style.setProperty("--i", String(Math.min(i, 6)));
    });
  });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px 6% 0px" }
    );
    enters.forEach(function (el) {
      io.observe(el);
    });
  } else {
    enters.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  /* ---------- one highlighted button on screen at a time (rule 35) ---------- */
  // The hero and closing buttons always show. A repeat further down the page (data-secondary) shows
  // only when no other button is on screen, so the reader always has one within reach and never two.
  var buttons = Array.prototype.slice.call(document.querySelectorAll("a.button"));
  var onScreen = new Set();
  function settleButtons() {
    buttons.forEach(function (btn) {
      if (!btn.hasAttribute("data-secondary")) return;
      var other = buttons.some(function (o) {
        if (o === btn || !onScreen.has(o)) return false;
        return !o.hasAttribute("data-secondary") || buttons.indexOf(o) < buttons.indexOf(btn);
      });
      var quiet = other && document.activeElement !== btn;
      btn.classList.toggle("is-quiet", quiet);
      if (quiet) onScreen.delete(btn);
    });
  }
  if ("IntersectionObserver" in window) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) onScreen.add(e.target);
        else onScreen.delete(e.target);
      });
      // A quiet button still intersects; count it again so the order check stays honest.
      buttons.forEach(function (btn) {
        var r = btn.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) onScreen.add(btn);
        else onScreen.delete(btn);
      });
      settleButtons();
    });
    buttons.forEach(function (btn) {
      bio.observe(btn);
    });
    buttons.forEach(function (btn) {
      btn.addEventListener("focus", settleButtons);
      btn.addEventListener("blur", settleButtons);
    });
  }

  /* ---------- opening: first visit only, under 1.3 s, any input skips it ---------- */
  var opening = document.querySelector(".opening");
  function finishOpening() {
    if (!root.classList.contains("is-opening")) return;
    root.classList.remove("is-opening");
    opening.className = "opening";
    opening.querySelector(".opening__logo").style.transform = "";
    store("karman-opening", "1");
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
      window.removeEventListener(ev, finishOpening, true);
    });
    startHero();
  }
  if (root.classList.contains("is-opening")) {
    window.__openingStart = performance.now();
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, finishOpening, true);
    });
    if (reduce) {
      setTimeout(function () {
        opening.classList.add("fade");
      }, 300);
      setTimeout(finishOpening, 720);
    } else {
      opening.classList.add("play");
      setTimeout(function () {
        if (!root.classList.contains("is-opening")) return;
        var logo = opening.querySelector(".opening__logo");
        var from = logo.getBoundingClientRect();
        var to = document.querySelector(".masthead-bar .brand").getBoundingClientRect();
        var s = to.height ? 28 / 72 : 1;
        var dx = to.left - from.left;
        var dy = to.top + to.height / 2 - (from.top + from.height / 2);
        opening.classList.add("land");
        logo.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + s + ")";
      }, 800);
      setTimeout(finishOpening, 1200);
    }
  }

  /* ---------- the live question: the real engine fragment ---------- */
  var frame = document.querySelector(".demo__frame");
  var engine = null;
  function syncEngineTheme() {
    if (!engine) return;
    var dark = root.getAttribute("data-theme") === "dark";
    engine.setAttribute("data-theme", dark ? "observatory" : "ivory");
    engine.classList.toggle("dark", dark);
  }
  applyTheme(root.getAttribute("data-theme") || "dark", false);

  var CORRECT = "C";
  var CHECK =
    '<svg class="k-check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.6l3.2 3.1L13 4.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>';
  var result = document.querySelector(".demo__result");
  var again = document.querySelector(".demo__again");
  var choices = [];
  var picked = null;
  var submitRow = null;

  // Exactly the classes ActiveQuizScreen.tsx applies in each state: choose, then Submit Answer, then graded.
  function select(letter) {
    picked = letter;
    choices.forEach(function (c) {
      var on = c.letter === letter;
      c.button.className =
        c.base +
        (on
          ? " cursor-pointer hover:border-info/40 hover:bg-info/5 border-info/40 bg-info/10"
          : " cursor-pointer hover:border-info/40 hover:bg-info/5 border-bronze bg-surface");
      c.badge.className =
        c.badgeBase + (on ? " bg-ivory text-night" : " bg-surface-raised text-ivory/80");
      c.button.setAttribute("aria-pressed", String(on));
    });
    submitRow.hidden = false;
  }
  function submit() {
    if (!picked) return;
    choices.forEach(function (c) {
      var isRight = c.letter === CORRECT;
      var isPicked = c.letter === picked;
      c.button.disabled = true;
      c.button.removeAttribute("aria-pressed");
      c.button.className =
        c.base +
        (isRight
          ? " border-success/40 bg-success/15"
          : isPicked
            ? " border-error/40 bg-error/15"
            : " border-bronze opacity-50");
      c.badge.className =
        c.badgeBase +
        (isRight
          ? " bg-success text-night"
          : isPicked
            ? " bg-error text-ivory"
            : " bg-surface-raised text-taupe");
      c.badge.innerHTML = isRight ? CHECK : c.letter;
    });
    submitRow.hidden = true;
    result.textContent = picked === CORRECT ? t("method.demo.right") : t("method.demo.wrong");
    again.hidden = false;
  }
  function resetQuestion() {
    picked = null;
    choices.forEach(function (c) {
      c.button.disabled = false;
      c.button.removeAttribute("aria-pressed");
      c.button.className = c.original;
      c.badge.className = c.badgeOriginal;
      c.badge.textContent = c.letter;
    });
    if (submitRow) submitRow.hidden = true;
    result.textContent = "";
    again.hidden = true;
    if (choices[0]) choices[0].button.focus();
  }
  again.addEventListener("click", resetQuestion);

  // The engine's timer runs and hides, as it does for a student. The other tools are shown, inert.
  function wireTools() {
    var timer = engine.querySelector('[class*="_timer_"]');
    var tools = timer ? timer.parentElement : null;
    if (tools) {
      tools.setAttribute("data-engine-tools", "");
      Array.prototype.forEach.call(tools.children, function (el) {
        if (el === timer) return;
        el.setAttribute("aria-hidden", "true");
        el.querySelectorAll("button, summary").forEach(function (b) {
          b.setAttribute("tabindex", "-1");
        });
        if (el.tagName === "BUTTON") el.setAttribute("tabindex", "-1");
      });
    }
    if (!timer) return;
    var out = timer.querySelector("output");
    var hide = timer.querySelector("button");
    var start = null;
    var shown = true;
    // The clock starts when the question first comes into view, as it would when a student opens it.
    if ("IntersectionObserver" in window) {
      var seenIo = new IntersectionObserver(
        function (es) {
          if (es[0].isIntersecting) {
            start = Date.now();
            seenIo.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      seenIo.observe(frame);
    } else {
      start = Date.now();
    }
    setInterval(function () {
      if (start === null) return;
      var sec = Math.floor((Date.now() - start) / 1000);
      out.textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); // taste-skill-ignore: a clock
    }, 1000);
    hide.addEventListener("click", function () {
      shown = !shown;
      out.style.visibility = shown ? "" : "hidden";
      hide.textContent = shown ? "Hide Timer" : "Show Timer";
      hide.setAttribute("aria-pressed", String(shown));
    });
  }

  if (frame) {
    fetch(frame.getAttribute("data-fragment"))
      .then(function (r) {
        if (!r.ok) throw new Error("fragment " + r.status);
        return r.text();
      })
      .then(function (html) {
        frame.innerHTML = html;
        engine = frame.querySelector(".karman-engine");
        engine.style.width = "100%";
        engine.style.height = "100%";
        syncEngineTheme();
        var flag = engine.querySelector('[aria-label="Flag question for tutor"]');
        if (flag && flag.parentElement) flag.parentElement.setAttribute("data-engine-bottom", "");
        wireTools();
        var list = engine.querySelector("[data-question-content] .space-y-3");
        engine.querySelectorAll("[data-question-content] .group > button").forEach(function (b) {
          var badge = b.querySelector("span");
          var letter = badge.textContent.trim();
          var c = {
            button: b,
            badge: badge,
            letter: letter,
            original: b.className,
            base: b.className
              .split(/\s+/)
              .filter(function (k) {
                return (
                  [
                    "cursor-pointer",
                    "hover:border-info/40",
                    "hover:bg-info/5",
                    "border-bronze",
                    "bg-surface",
                  ].indexOf(k) < 0
                );
              })
              .join(" "),
            badgeOriginal: badge.className,
            badgeBase: badge.className
              .split(/\s+/)
              .filter(function (k) {
                return ["bg-surface-raised", "text-ivory/80"].indexOf(k) < 0;
              })
              .join(" "),
          };
          var tex = b.querySelector("annotation");
          b.setAttribute("aria-label", "Choice " + letter + ": " + (tex ? tex.textContent : ""));
          b.addEventListener("click", function () {
            select(letter);
          });
          choices.push(c);
        });
        // The engine's own Submit Answer row (ActiveQuizScreen.tsx), shown once a choice is made.
        submitRow = document.createElement("div");
        submitRow.className = "mt-6 flex justify-end";
        submitRow.hidden = true;
        var sb = document.createElement("button");
        sb.type = "button";
        sb.className =
          "rounded-xl bg-ivory px-8 py-3 text-sm font-bold text-night transition-colors hover:bg-ivory/90";
        sb.textContent = t("method.demo.submit");
        sb.addEventListener("click", submit);
        submitRow.appendChild(sb);
        if (list) list.parentElement.insertBefore(submitRow, list.nextSibling);
      })
      .catch(function (err) {
        console.warn(err);
        frame.innerHTML = '<p class="body" style="padding:24px">' + t("method.demo.intro") + "</p>";
      });
  }

  /* ---------- FAQPage structured data follows copy.js ---------- */
  var ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      var data = JSON.parse(ld.textContent);
      data["@graph"].forEach(function (node) {
        if (node["@type"] !== "FAQPage") return;
        node.mainEntity = [1, 2, 3]
          .filter(function (n) {
            return COPY["questions.q" + n];
          })
          .map(function (n) {
            return {
              "@type": "Question",
              name: COPY["questions.q" + n],
              acceptedAnswer: { "@type": "Answer", text: COPY["questions.a" + n] },
            };
          });
      });
      ld.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      console.warn("structured data", e);
    }
  }
})();
