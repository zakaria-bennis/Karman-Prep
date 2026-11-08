/* Karman, Quiet direction. Reads every word from copy.js and runs the few things that move. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var store = {
    get: function (k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
        /* private mode: fine */
      }
    },
  };

  /* ---------- copy ---------- */
  var COPY = {};
  (function parse(src) {
    var section = "";
    String(src || "")
      .split("\n")
      .forEach(function (line) {
        var s = line.trim();
        if (!s) return;
        if (s.indexOf("## ") === 0) {
          section = s.slice(3).trim();
          return;
        }
        var i = s.indexOf(":");
        if (i < 1) return;
        COPY[section + "." + s.slice(0, i).trim()] = s.slice(i + 1).trim();
      });
  })(window.KARMAN_COPY);
  var t = function (k) {
    return COPY[k] != null ? COPY[k] : "";
  };

  if (t("meta.title")) document.title = t("meta.title");
  var md = document.querySelector('meta[name="description"]');
  if (md && t("meta.description")) md.setAttribute("content", t("meta.description"));
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-copy"));
  });
  document.querySelectorAll("[data-copy-alt]").forEach(function (el) {
    el.setAttribute("alt", t(el.getAttribute("data-copy-alt")));
  });
  document.querySelectorAll("[data-copy-label]").forEach(function (el) {
    el.setAttribute("aria-label", t(el.getAttribute("data-copy-label")));
  });
  document.querySelectorAll("[data-copy-title]").forEach(function (el) {
    el.setAttribute("title", t(el.getAttribute("data-copy-title")));
  });
  document.querySelectorAll("[data-mailto]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + el.textContent.trim());
  });
  document.querySelectorAll("p.note, p.lead").forEach(function (el) {
    if (!el.textContent.trim()) el.hidden = true;
  });

  /* ---------- theme (rule 33: device, else dark; a visible toggle that is remembered) ---------- */
  function setLabels() {
    var dark = root.getAttribute("data-theme") === "dark";
    document.querySelectorAll("[data-theme-label]").forEach(function (el) {
      el.textContent = dark ? t("header.theme_to_light") : t("header.theme_to_dark");
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", dark ? t("header.theme_to_light") : t("header.theme_to_dark"));
    });
    syncEngine();
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store.set("karman-theme", next);
      setLabels();
    });
  });

  /* ---------- phone menu (port of 21st.dev 27229: wipe, focus trap, Escape) ---------- */
  var sheet = document.getElementById("sheet");
  var openBtn = document.getElementById("menu-open");
  var closeBtn = document.getElementById("menu-close");
  function focusables() {
    return Array.prototype.filter.call(
      sheet.querySelectorAll("a[href], button:not([disabled])"),
      function (el) {
        return el.offsetParent !== null;
      }
    );
  }
  function openMenu() {
    sheet.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        sheet.classList.add("is-open");
      });
    });
    openBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }
  function closeMenu(restore) {
    sheet.classList.remove("is-open");
    openBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(
      function () {
        if (!sheet.classList.contains("is-open")) sheet.hidden = true;
      },
      reduce.matches ? 200 : 550
    );
    if (restore) openBtn.focus();
  }
  openBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", function () {
    closeMenu(true);
  });
  sheet.querySelectorAll(".sheet__nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      closeMenu(false);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (sheet.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
      return;
    }
    if (e.key !== "Tab") return;
    var f = focusables();
    if (!f.length) return;
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
  window.addEventListener("resize", function () {
    if (!sheet.hidden && window.innerWidth >= 768) closeMenu(false);
  });

  /* ---------- the live question: the real QuizEngine, in its own frame (live/) ---------- */
  var frame = document.getElementById("engine");
  var poster = document.getElementById("stage-poster");
  var stageEl = document.getElementById("stage");
  function engineTheme() {
    return root.getAttribute("data-theme") === "dark" ? "observatory" : "ivory";
  }
  function syncEngine() {
    var dark = root.getAttribute("data-theme") === "dark";
    if (poster)
      poster.querySelectorAll("[data-light]").forEach(function (el) {
        var src = el.getAttribute(dark ? "data-dark" : "data-light");
        if (el.tagName === "SOURCE") el.setAttribute("srcset", src);
        else el.setAttribute("src", src);
      });
    if (frame && frame.contentWindow && frame.getAttribute("src")) {
      try {
        frame.contentWindow.postMessage({ karmanTheme: engineTheme() }, location.origin);
      } catch (e) {
        /* not loaded yet */
      }
    }
  }
  function loadEngine() {
    if (!frame || frame.getAttribute("src")) return;
    frame.setAttribute("src", frame.getAttribute("data-src") + "&theme=" + engineTheme());
  }
  if (frame) {
    frame.addEventListener("load", function () {
      syncEngine();
      // "Start the question again" appears only once the question has been touched (Hick).
      try {
        frame.contentWindow.document.addEventListener(
          "pointerdown",
          function () {
            document.getElementById("again").hidden = false;
          },
          { once: true }
        );
        frame.contentWindow.document.addEventListener(
          "keydown",
          function () {
            document.getElementById("again").hidden = false;
          },
          { once: true }
        );
      } catch (e) {
        document.getElementById("again").hidden = false;
      }
      setTimeout(function () {
        stageEl.classList.add("is-live");
      }, 350);
    });
    if ("IntersectionObserver" in window) {
      var eio = new IntersectionObserver(
        function (es) {
          if (
            es.some(function (e) {
              return e.isIntersecting;
            })
          ) {
            loadEngine();
            eio.disconnect();
          }
        },
        { rootMargin: "600px 0px" }
      );
      eio.observe(stageEl);
    } else loadEngine();
  }
  document.getElementById("again").addEventListener("click", function () {
    if (!frame.getAttribute("src")) {
      loadEngine();
      return;
    }
    stageEl.classList.remove("is-live");
    document.getElementById("again").hidden = true;
    frame.setAttribute(
      "src",
      frame.getAttribute("data-src") + "&theme=" + engineTheme() + "&r=" + Date.now()
    );
  });

  /* ---------- prices: every plan in one plain list ---------- */
  var plans = document.getElementById("plans");
  for (var i = 1; t("prices.plan" + i + "_name"); i++) {
    var row = document.createElement("div");
    row.className = "plan";
    var dt = document.createElement("dt");
    dt.className = "plan__name";
    dt.textContent = t("prices.plan" + i + "_name");
    var dd = document.createElement("dd");
    dd.className = "plan__price";
    dd.textContent = t("prices.plan" + i + "_price");
    var db = document.createElement("dd");
    db.className = "plan__body";
    db.textContent = t("prices.plan" + i + "_body");
    row.appendChild(dt);
    row.appendChild(dd);
    row.appendChild(db);
    plans.appendChild(row);
  }

  /* ---------- faq (port of 21st.dev 29230) ---------- */
  var acc = document.getElementById("acc");
  var faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [] };
  for (var q = 1; t("faq.q" + q); q++) {
    var d = document.createElement("details");
    d.setAttribute("name", "faq");
    var s = document.createElement("summary");
    var qs = document.createElement("span");
    qs.textContent = t("faq.q" + q);
    var plus = document.createElement("span");
    plus.className = "plus";
    plus.setAttribute("aria-hidden", "true");
    s.appendChild(qs);
    s.appendChild(plus);
    var a = document.createElement("p");
    a.textContent = t("faq.a" + q);
    d.appendChild(s);
    d.appendChild(a);
    acc.appendChild(d);
    faqLd.mainEntity.push({
      "@type": "Question",
      name: t("faq.q" + q),
      acceptedAnswer: { "@type": "Answer", text: t("faq.a" + q) },
    });
  }
  document.getElementById("faq-ld").textContent = JSON.stringify(faqLd);

  /* ---------- results: the slow crossfade (signature move) ---------- */
  var frames = Array.prototype.slice.call(document.querySelectorAll(".fade__frame img"));
  var at = 0,
    timer = null;
  function next() {
    frames[at].classList.remove("is-on");
    at = (at + 1) % frames.length;
    frames[at].classList.add("is-on");
  }
  function startFade() {
    if (!timer && !reduce.matches && !document.hidden) timer = setInterval(next, 5600);
  }
  function stopFade() {
    clearInterval(timer);
    timer = null;
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopFade();
    else startFade();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) startFade();
          else stopFade();
        });
      },
      { threshold: 0.2 }
    ).observe(document.getElementById("fade"));
  }

  /* ---------- entrances: heading, then text, then picture ---------- */
  var risers = Array.prototype.slice.call(document.querySelectorAll(".rise"));
  function reveal(el) {
    el.classList.add("is-in");
  }
  if ("IntersectionObserver" in window) {
    var groups = new Map();
    risers.forEach(function (el) {
      var sec = el.closest("section") || document.body;
      var list = groups.get(sec) || [];
      el.style.setProperty("--d", Math.min(list.length, 5) * 80 + "ms");
      list.push(el);
      groups.set(sec, list);
    });
    var io = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            reveal(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
    );
    risers.forEach(function (el) {
      io.observe(el);
    });
  } else risers.forEach(reveal);
  setTimeout(function () {
    risers.forEach(function (el) {
      if (el.getBoundingClientRect().top < innerHeight) reveal(el);
    });
  }, 2500);

  /* ---------- opening: the K forms, the word wipes in, the logo lands in the header ----------
     First visit only, under 1.3 s, any input skips it. The ground stays opaque until the logo has
     landed, so nothing moves over the hero text (rule 34). */
  var intro = document.getElementById("intro");
  var seen = store.get("karman-intro-seen");
  var canStore = (function () {
    try {
      localStorage.setItem("karman-probe", "1");
      localStorage.removeItem("karman-probe");
      return true;
    } catch (e) {
      return false;
    }
  })();
  if (seen || !canStore) root.classList.remove("first-visit");
  if (!seen && canStore) {
    store.set("karman-intro-seen", "1");
    root.classList.add("is-intro");
    intro.hidden = false;
    var logo = document.getElementById("intro-logo");
    var done = false;
    var t0 = performance.now();
    var inputs = ["pointerdown", "keydown", "wheel", "touchstart"];
    var finish = function () {
      if (done) return;
      done = true;
      inputs.forEach(function (ev) {
        removeEventListener(ev, skip, true);
      });
      root.classList.remove("is-intro", "first-visit");
      intro.hidden = true;
      window.__introMs = Math.round(performance.now() - t0);
    };
    var skip = function () {
      finish();
    };
    inputs.forEach(function (ev) {
      addEventListener(ev, skip, { capture: true, passive: true });
    });
    if (reduce.matches) {
      intro.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], {
        duration: 700,
        easing: "ease",
      }).onfinish = finish;
    } else {
      intro.classList.add("is-playing");
      setTimeout(function () {
        if (done) return;
        var mark = logo.querySelector(".wordmark");
        var from = mark.getBoundingClientRect();
        var to = document.querySelector("#brand .wordmark").getBoundingClientRect();
        var k = to.width / from.width;
        mark.style.transformOrigin = "0 0";
        var fly = mark.animate(
          [
            { transform: "none" },
            {
              transform:
                "translate(" +
                (to.left - from.left) +
                "px," +
                (to.top - from.top) +
                "px) scale(" +
                k +
                ")",
            },
          ],
          { duration: 440, easing: "cubic-bezier(0.65, 0, 0.2, 1)", fill: "forwards" }
        );
        fly.onfinish = function () {
          if (done) return;
          root.classList.remove("is-intro");
          var out = intro.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 160,
            easing: "ease-out",
            fill: "forwards",
          });
          out.onfinish = finish;
        };
      }, 600);
      setTimeout(finish, 1290);
    }
  }

  setLabels();
})();
