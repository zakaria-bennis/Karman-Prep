/* Karman, direction "One morning". Reads every word from copy.js, runs the theme switch, the menu,
   the live practice question, the entrances and the first-visit opening. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- copy ---------- */
  var COPY = {};
  (window.KARMAN_COPY || "").split(/^## /m).forEach(function (block) {
    var lines = block.split("\n");
    var name = lines.shift().trim();
    if (!name) return;
    COPY[name] = {};
    lines.forEach(function (line) {
      var i = line.indexOf(": ");
      if (i < 1 || line.charAt(0) === "#") return;
      COPY[name][line.slice(0, i).trim()] = line.slice(i + 2).trim();
    });
  });
  function c(key) {
    var p = key.split("/");
    return (COPY[p[0]] && COPY[p[0]][p[1]]) || "";
  }
  var list = function (key) {
    var v = c(key);
    return v ? v.split(" | ") : [];
  };
  var pair = function (item) {
    return item.split(" = ");
  };
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  document.querySelectorAll("[data-c]").forEach(function (n) {
    var v = c(n.getAttribute("data-c"));
    if (v) n.textContent = v;
    else n.hidden = true;
  });
  document.querySelectorAll("[data-alt]").forEach(function (n) {
    n.alt = c(n.getAttribute("data-alt"));
  });
  document.querySelectorAll("[data-list]").forEach(function (n) {
    list(n.getAttribute("data-list")).forEach(function (t) {
      n.appendChild(el("li", null, t));
    });
  });
  if (c("site/title")) document.title = c("site/title");
  var md = document.querySelector('meta[name="description"]');
  if (md && c("site/description")) md.content = c("site/description");

  // navigation, in the header and the phone sheet
  var navItems = list("site/nav").map(pair);
  navItems.push([c("site/nav test"), "#free-test", "test"]);
  ["nav-list", "sheet-list"].forEach(function (id) {
    var ul = document.getElementById(id);
    navItems.forEach(function (it) {
      var li = el("li");
      var a = el("a", it[2] || null, it[0]);
      a.href = it[1];
      li.appendChild(a);
      ul.appendChild(li);
    });
  });

  // results: name, score, college, nothing else
  var pics = { Ava: "img/ava.webp", Mateo: "img/mateo.webp", Priya: "img/priya.webp" };
  var sizes = { Ava: [432, 540], Mateo: [576, 720], Priya: [576, 720] };
  var rl = document.getElementById("results-list");
  list("results/rows").forEach(function (row) {
    var r = pair(row);
    var li = el("li");
    var fr = el("div", "frame");
    var img = el("img");
    img.src = pics[r[0]] || "";
    img.width = (sizes[r[0]] || [576])[0];
    img.height = (sizes[r[0]] || [0, 720])[1];
    img.loading = "lazy";
    img.alt = r[0] + ", " + r[2];
    fr.appendChild(img);
    var who = el("div", "who");
    who.appendChild(el("h3", null, r[0]));
    who.appendChild(el("p", "college", r[2]));
    li.appendChild(fr);
    li.appendChild(who);
    li.appendChild(el("p", "score", r[1]));
    rl.appendChild(li);
  });

  // plans
  var pt = document.querySelector("#plans-table tbody");
  list("plans/rows").forEach(function (row) {
    var r = pair(row);
    var tr = el("tr");
    if (/guarantee/i.test(r[2])) tr.className = "guarantee";
    var th = el("th", null, r[0]);
    th.scope = "row";
    tr.appendChild(th);
    tr.appendChild(el("td", "p-price", r[1]));
    tr.appendChild(el("td", null, r[2]));
    pt.appendChild(tr);
  });

  // guarantee outcomes
  var ot = document.querySelector("#outcomes tbody");
  list("guarantee/rows").forEach(function (row) {
    var r = pair(row);
    var tr = el("tr");
    var th = el("th", null, r[0]);
    th.scope = "row";
    tr.appendChild(th);
    tr.appendChild(el("td", null, r[1]));
    ot.appendChild(tr);
  });
  var PLUS = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2.5v13M2.5 9h13"/></svg>';
  var rs = document.querySelector(".rules summary");
  if (rs) rs.insertAdjacentHTML("beforeend", PLUS);

  // footer links
  var fl = document.getElementById("foot-links");
  list("footer/links").forEach(function (it) {
    var p = pair(it);
    var li = el("li");
    var a = el("a", "textlink", p[0]);
    a.href = p[1];
    li.appendChild(a);
    fl.appendChild(li);
  });

  /* ---------- FAQ: single open, keyboard Arrow/Home/End (after 21st.dev 37545) ---------- */
  var faq = document.getElementById("faq-list");
  var qa = list("faq/qa").map(pair);
  var faqButtons = [];
  qa.forEach(function (item, i) {
    var wrap = el("div", "faq-item");
    var h = el("h3");
    var b = el("button");
    b.type = "button";
    b.id = "faq-q-" + i;
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-controls", "faq-a-" + i);
    b.appendChild(el("span", null, item[0]));
    b.insertAdjacentHTML("beforeend", PLUS);
    h.appendChild(b);
    var a = el("div", "a");
    a.id = "faq-a-" + i;
    a.setAttribute("role", "region");
    a.setAttribute("aria-labelledby", b.id);
    var inner = el("div");
    inner.appendChild(el("p", null, item[1]));
    a.appendChild(inner);
    wrap.appendChild(h);
    wrap.appendChild(a);
    faq.appendChild(wrap);
    faqButtons.push(b);
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") === "true";
      faqButtons.forEach(function (o) {
        o.setAttribute("aria-expanded", "false");
        o.closest(".faq-item").classList.remove("open");
      });
      if (!open) {
        b.setAttribute("aria-expanded", "true");
        wrap.classList.add("open");
      }
    });
    b.addEventListener("keydown", function (e) {
      var n = faqButtons.length;
      var next =
        e.key === "ArrowDown"
          ? (i + 1) % n
          : e.key === "ArrowUp"
            ? (i - 1 + n) % n
            : e.key === "Home"
              ? 0
              : e.key === "End"
                ? n - 1
                : -1;
      if (next >= 0) {
        e.preventDefault();
        faqButtons[next].focus();
      }
    });
  });

  /* ---------- theme: auto, dark, light; remembered (after 21st.dev 37721) ---------- */
  var themeBox = document.getElementById("theme");
  themeBox.setAttribute("aria-label", c("site/theme"));
  var names = list("site/theme options");
  themeBox.querySelectorAll("label").forEach(function (l, i) {
    if (names[i]) {
      l.title = names[i];
      l.querySelector(".vh").textContent = names[i];
    }
  });
  var stored = null;
  try {
    stored = localStorage.getItem("karman-theme");
  } catch (e) {}
  var current = stored === "light" || stored === "dark" ? stored : "auto";
  var darkMq = window.matchMedia("(prefers-color-scheme: light)");
  function scheme() {
    var t = doc.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return darkMq.matches ? "light" : "dark"; // no stated preference: dark
  }
  function syncEngine() {
    var k = document.querySelector("#demo-box .karman-engine");
    if (!k) return;
    var dark = scheme() === "dark";
    k.setAttribute("data-theme", dark ? "observatory" : "ivory");
    k.classList.toggle("dark", dark);
  }
  themeBox.querySelectorAll("input").forEach(function (inp) {
    inp.checked = inp.value === current;
    inp.addEventListener("change", function () {
      var v = inp.value;
      if (v === "auto") doc.removeAttribute("data-theme");
      else doc.setAttribute("data-theme", v);
      try {
        if (v === "auto") localStorage.removeItem("karman-theme");
        else localStorage.setItem("karman-theme", v);
      } catch (e) {}
      syncEngine();
    });
  });
  if (darkMq.addEventListener) darkMq.addEventListener("change", syncEngine);

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
  function closeSheet(focusBack) {
    sheet.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (focusBack) menuBtn.focus();
  }
  menuBtn.addEventListener("click", openSheet);
  closeBtn.addEventListener("click", function () {
    closeSheet(true);
  });
  sheet.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeSheet(false);
  });
  document.addEventListener("keydown", function (e) {
    if (sheet.hidden) return;
    if (e.key === "Escape") closeSheet(true);
    if (e.key === "Tab") {
      var f = sheet.querySelectorAll("button, a");
      var first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------- the live question: the real engine fragment, run through the engine's own states ----------
     question -> selected (Submit Answer) -> graded (Show explanations) -> explanation. Every class string
     and every button label below is copied from ActiveQuizScreen.tsx and QuizTools.tsx as they are. */
  var box = document.getElementById("demo-box");
  var msg = document.getElementById("demo-msg");
  var again = document.getElementById("demo-again");
  var CHECK =
    '<svg class="k-check" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.4 5.6 10.4 11.5 3.8"/></svg>';
  var CORRECT = "C";
  var EXPLANATION = "$3x = 21$, so $x = 7$."; // src/data/diagnostic-questions.ts, alg-1, as written
  var KATEX = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
  var state = { selected: null, submitted: false, explain: false };
  var panel = null,
    row = null,
    explainEl = null;
  function choiceButtons() {
    return Array.prototype.slice.call(
      box.querySelectorAll("[data-question-content] .space-y-3 > .group > button")
    );
  }
  // taste-skill-ignore: engine class strings, kept as they are
  var BASE =
    "w-full rounded-xl border py-3.5 pl-5 pr-24 text-left transition-all flex items-start gap-4"; // taste-skill-ignore
  var BADGE =
    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"; // taste-skill-ignore
  var PRIMARY =
    "rounded-xl bg-ivory px-8 py-3 text-sm font-bold text-night transition-colors hover:bg-ivory/90"; // taste-skill-ignore
  var SECONDARY =
    "rounded-xl border border-bronze bg-surface-raised px-6 py-3 text-sm font-semibold text-ivory transition-colors hover:bg-surface-raised"; // taste-skill-ignore
  function engineButton(cls, label, fn) {
    var b = el("button", cls, label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }
  function paint() {
    var sub = state.submitted;
    choiceButtons().forEach(function (b, i) {
      var letter = "ABCD".charAt(i);
      var badge = b.querySelector("span");
      var isSel = state.selected === letter,
        isCor = letter === CORRECT;
      var cls = BASE,
        bcls = BADGE;
      if (!sub) cls += " cursor-pointer hover:border-info/40 hover:bg-info/5";
      if (isSel && !sub) cls += " border-info/40 bg-info/10";
      if (!isSel && !sub) cls += " border-bronze bg-surface";
      if (sub && isCor) cls += " border-success/40 bg-success/15";
      if (sub && isSel && !isCor) cls += " border-error/40 bg-error/15";
      if (sub && !isSel && !isCor) cls += " border-bronze opacity-50";
      if (!sub && !isSel) bcls += " bg-surface-raised text-ivory/80";
      if (!sub && isSel) bcls += " bg-ivory text-night";
      if (sub && isCor) bcls += " bg-success text-night";
      if (sub && isSel && !isCor) bcls += " bg-error text-ivory";
      if (sub && !isSel && !isCor) bcls += " bg-surface-raised text-taupe";
      b.className = cls;
      b.disabled = sub;
      badge.className = bcls;
      badge.innerHTML = sub && isCor ? CHECK : letter;
      b.setAttribute("aria-pressed", isSel ? "true" : "false");
    });
    // the buttons row under the choices, as the engine draws it
    if (row) {
      row.remove();
      row = null;
    }
    if (!state.selected) {
      /* no row */
    } else if (!sub) {
      row = el("div", "mt-6 flex justify-end");
      row.appendChild(engineButton(PRIMARY, "Submit Answer", submit));
    } else if (!state.explain) {
      row = el("div", "mt-6 flex flex-wrap justify-end gap-3");
      row.appendChild(
        engineButton(SECONDARY, "Show explanations", function () {
          toggleExplain(true);
        })
      );
    }
    if (row && panel) panel.appendChild(row);
    if (explainEl) explainEl.hidden = !state.explain;
  }
  function select(letter) {
    if (state.submitted) return;
    state.selected = letter;
    paint();
  }
  function submit() {
    state.submitted = true;
    paint();
    msg.textContent = state.selected === CORRECT ? c("daily/right") : c("daily/wrong");
    again.hidden = false;
    var show = row && row.querySelector("button");
    if (show) show.focus();
  }
  function mathHTML(text) {
    // MathText's output: plain runs and KaTeX runs, in the order written
    return text
      .split(/(\$[^$]+\$)/)
      .filter(Boolean)
      .map(function (part) {
        if (part.charAt(0) === "$" && window.katex) {
          return (
            '<span class="align-baseline">' +
            window.katex.renderToString(part.slice(1, -1), { throwOnError: false }) +
            "</span>"
          );
        }
        var t = document.createElement("span");
        t.textContent = window.katex ? part : part.replace(/\$/g, "");
        return t.outerHTML;
      })
      .join("");
  }
  var katexLoading = null;
  function loadKatex() {
    if (window.katex) return Promise.resolve();
    if (katexLoading) return katexLoading;
    katexLoading = new Promise(function (res) {
      var sc = document.createElement("script");
      sc.src = KATEX;
      sc.crossOrigin = "anonymous";
      sc.onload = res;
      sc.onerror = res; // falls back to plain text
      document.head.appendChild(sc);
    });
    return katexLoading;
  }
  function toggleExplain(on) {
    state.explain = on;
    if (on && !explainEl) {
      return loadKatex().then(function () {
        explainEl = el("div", "k-explain border-t border-bronze"); // taste-skill-ignore: the engine's own separator
        var inner = el("div", "mx-auto max-w-xl");
        inner.appendChild(
          el(
            "h3",
            "mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe",
            "Explanation"
          )
        );
        var tx = el("div", "k-explain-text mb-6 text-ivory");
        tx.innerHTML =
          '<span class="block whitespace-pre-wrap">' + mathHTML(EXPLANATION) + "</span>";
        inner.appendChild(tx);
        var r = el("div", "mt-6 flex flex-wrap justify-end gap-3 border-t border-bronze/60 pt-2"); // taste-skill-ignore: the engine's own separator
        r.appendChild(
          engineButton(SECONDARY, "Hide explanations", function () {
            toggleExplain(false);
          })
        );
        inner.appendChild(r);
        explainEl.appendChild(inner);
        box.querySelector("[data-question-content]").appendChild(explainEl);
        paint();
        var hide = explainEl.querySelector("button");
        if (hide) hide.focus();
      });
    }
    paint();
    if (!on) {
      var s2 = row && row.querySelector("button");
      if (s2) s2.focus();
    } else if (explainEl) {
      var h = explainEl.querySelector("button");
      if (h) h.focus();
    }
  }
  again.addEventListener("click", function () {
    state = { selected: null, submitted: false, explain: false };
    paint();
    msg.textContent = "";
    again.hidden = true;
    var first = choiceButtons()[0];
    if (first) first.focus();
  });
  // the engine's elapsed timer: counts from when the question is first on screen; Hide Timer works
  function startTimer(k) {
    var wrap = k.querySelector('[class*="_timer_"]');
    if (!wrap) return;
    var out = wrap.querySelector("output");
    var tbtn = wrap.querySelector("button");
    var start = null,
      visible = true;
    function tick() {
      if (start === null || !out) return;
      var sec = Math.floor((Date.now() - start) / 1000);
      out.textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); // taste-skill-ignore: a clock
    }
    if (tbtn)
      tbtn.addEventListener("click", function () {
        visible = !visible;
        if (out) out.hidden = !visible;
        tbtn.textContent = visible ? "Hide Timer" : "Show Timer";
        tbtn.setAttribute("aria-pressed", visible ? "true" : "false");
      });
    if ("IntersectionObserver" in window) {
      var tio = new IntersectionObserver(
        function (en) {
          if (en[0].isIntersecting && start === null) {
            start = Date.now();
            setInterval(tick, 1000);
            tio.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      tio.observe(box);
    }
  }
  fetch("../../redesign/engine/fragments/alg-1.html")
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(function (html) {
      var holder = document.createElement("div");
      holder.innerHTML = html;
      var k = holder.querySelector(".karman-engine");
      k.removeAttribute("style");
      var skel = document.getElementById("demo-skeleton");
      if (skel) skel.remove();
      box.appendChild(k);
      panel = k.querySelector("[data-question-content] .mx-auto.max-w-xl");
      syncEngine();
      choiceButtons().forEach(function (b, i) {
        b.addEventListener("click", function () {
          if (!b.disabled) select("ABCD".charAt(i));
        });
      });
      startTimer(k);
    })
    .catch(function () {
      var skel = document.getElementById("demo-skeleton");
      if (skel) skel.remove();
      var img = el("img");
      img.src =
        "../../redesign/engine/renders/alg-1-desktop-" +
        (scheme() === "dark" ? "dark" : "light") +
        "-question.webp";
      img.alt =
        "The Karman practice screen: If 3x + 5 = 26, what is the value of x? Choices 5, 6, 7 and 8.";
      img.width = 1200;
      img.height = 800;
      box.appendChild(img);
    });

  /* ---------- entrances ---------- */
  var watch = document.querySelectorAll(".rise, .shutter, .results li");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var t = en.target;
          t.classList.add("in");
          if (t.classList.contains("shutter"))
            setTimeout(function () {
              t.classList.add("done");
            }, 1400);
          io.unobserve(t);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );
    watch.forEach(function (n) {
      io.observe(n);
    });
  } else {
    watch.forEach(function (n) {
      n.classList.add("in", "done");
    });
  }
  document.querySelectorAll(".results li").forEach(function (li, i) {
    li.style.transitionDelay = i * 90 + "ms";
  });

  /* ---------- opening: line, sun, name, then the logo lands in the header (first visit only) ---------- */
  function runIntro() {
    var intro = document.getElementById("intro");
    if (!doc.classList.contains("intro-on") || !intro) return;
    var logo = document.getElementById("intro-logo");
    var line = logo.querySelector(".mark-line");
    var sun = logo.querySelector(".mark-sun");
    var word = logo.querySelector(".word");
    var target = document.querySelector(".bar .logo");
    var anims = [];
    var finished = false;
    intro.style.animation = "none";
    function done() {
      if (finished) return;
      finished = true;
      anims.forEach(function (a) {
        try {
          a.cancel();
        } catch (e) {}
      });
      doc.classList.remove("intro-on");
      intro.remove();
      try {
        localStorage.setItem("karman-intro-seen", "1");
      } catch (e) {}
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
        window.removeEventListener(ev, skip, true);
      });
    }
    function skip() {
      if (finished) return;
      anims.forEach(function (a) {
        try {
          a.pause();
        } catch (e) {}
      });
      var out = intro.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 140,
        easing: "linear",
        fill: "forwards",
      });
      out.onfinish = done;
      setTimeout(done, 220);
    }
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, skip, { capture: true, passive: true });
    });
    if (reduce.matches || !logo.animate) {
      var f = intro.animate([{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], {
        duration: 700,
        easing: "linear",
        fill: "forwards",
      });
      anims.push(f);
      f.onfinish = done;
      return;
    }
    var ease = "cubic-bezier(0.16, 1, 0.3, 1)";
    line.style.transformBox = "fill-box";
    line.style.transformOrigin = "0 50%";
    sun.style.transformBox = "fill-box";
    anims.push(
      line.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration: 340,
        easing: ease,
        fill: "both",
      })
    );
    anims.push(
      sun.animate(
        [
          { transform: "translateY(70%)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        { duration: 380, delay: 140, easing: ease, fill: "both" }
      )
    );
    anims.push(
      word.animate(
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 300, delay: 300, easing: ease, fill: "both" }
      )
    );
    // land in the header
    var from = logo.getBoundingClientRect();
    var fm = logo.querySelector(".mark").getBoundingClientRect();
    var tm = target.querySelector(".mark").getBoundingClientRect();
    var s = tm.width / fm.width;
    logo.style.transformOrigin =
      fm.left - from.left + "px " + (fm.top - from.top + fm.height / 2) + "px";
    var dx = tm.left - fm.left;
    var dy = tm.top + tm.height / 2 - (fm.top + fm.height / 2);
    var land = logo.animate(
      [
        { transform: "none" },
        { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")" },
      ],
      { duration: 400, delay: 640, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" }
    );
    anims.push(land);
    var ground = intro.animate(
      [
        { backgroundColor: getComputedStyle(intro).backgroundColor },
        { backgroundColor: "transparent" },
      ],
      { duration: 180, delay: 1040, easing: "linear", fill: "forwards" }
    );
    anims.push(ground);
    ground.onfinish = done;
  }
  // start on the first painted frame, so the whole opening is seen
  if (doc.classList.contains("intro-on"))
    requestAnimationFrame(function () {
      requestAnimationFrame(runIntro);
    });
})();
