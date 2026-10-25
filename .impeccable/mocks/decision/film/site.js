/* Shared by every page of the mock (home, pricing, students map): reads copy.js, fills the header, menu and
   footer, the small pause button, the header's colour over white or dark surfaces, the button press orb and
   the one reveal. A page script builds its own sections, then calls KARMAN.init(). */
(function () {
  // pages of the real site; the pricing page and the students map are pages of this mock for now
  const ROUTES = {
    test: "/free-practice-test",
    program: "/program",
    private: "/private-tutoring",
    pricing: "pricing.html",
    students: "map.html",
    home: "index.html",
    cookies: "/cookies",
    signIn: "/auth/sign-in",
    guarantee: "/guarantee",
    faq: "/faq",
    about: "/about",
    terms: "/terms",
    privacy: "/privacy",
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* words: copy.js, or the copy editor's unsaved draft with ?draft=1 */
  const Q = new URLSearchParams(location.search);
  let draft = null;
  try {
    draft = Q.has("draft") ? localStorage.getItem("karman-copy-draft") : null;
  } catch (e) {}
  const msgs = {};
  const site = {};
  let m = null;
  (draft ?? window.KARMAN_COPY ?? "").split("\n").forEach((line) => {
    const h2 = line.match(/^##\s+(\d+|Site)\s*(.*)$/);
    if (h2) {
      m = h2[1] === "Site" ? null : (msgs[+h2[1]] = { name: h2[2].trim(), f: {} });
      return;
    }
    if (/^###/.test(line)) return;
    const kv = line.match(/^\s*([a-z ]+):\s*(.*)$/i);
    if (!kv) return;
    (m ? m.f : site)[kv[1].trim().toLowerCase()] = kv[2].trim();
  });
  const M = (n) => (msgs[n] || { f: {} }).f;
  const esc = (s) =>
    (s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
  const list = (s) =>
    (s || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

  const ARROW =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const btn = (label, href, cls = "btn") =>
    `<a class="${cls}" href="${href}"><span class="lb">${esc(label)}</span><span class="go">${ARROW}</span></a>`;

  /* the iPhone 18 Pro Max in Glacier, drawn in CSS (phone.css): front, glass, the narrow Dynamic Island,
     and its aluminium edge with the buttons when it is turned */
  const phone = (screen, cls = "") =>
    `<div class="iphone ${cls}"><span class="rim" aria-hidden="true"></span><span class="side" aria-hidden="true"></span><div class="glass">${screen}<span class="island" aria-hidden="true"></span></div></div>`;

  /* ---------- header, menu and footer words and links ---------- */
  function fill(root = document) {
    root.querySelectorAll("[data-t]").forEach((el) => {
      const v = site[el.dataset.t];
      if (v != null) el.textContent = v;
    });
    root.querySelectorAll("[data-route]").forEach((a) => (a.href = ROUTES[a.dataset.route]));
    root.querySelectorAll("[data-mail]").forEach((a) => (a.href = `mailto:${site.email || ""}`));
  }

  /* ---------- the pause button: small, bottom right; stops every film on the page, remembered ---------- */
  let paused = false;
  try {
    paused = localStorage.getItem("karman-motion") === "off";
  } catch (e) {}
  const PAUSE =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="2.6" height="10" rx="1"/><rect x="9.4" y="3" width="2.6" height="10" rx="1"/></svg>';
  const PLAY =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6c0 .6.6.9 1.1.6l7.2-4.8a.7.7 0 0 0 0-1.2L6.1 2.6C5.6 2.3 5 2.6 5 3.2Z"/></svg>';
  function motionButton() {
    const b = document.querySelector(".motion");
    if (!b) return;
    const label = () => {
      b.innerHTML = paused ? PLAY : PAUSE;
      b.setAttribute("aria-label", paused ? site.play || "Play" : site.pause || "Pause");
      b.title = b.getAttribute("aria-label");
      b.setAttribute("aria-pressed", String(paused));
    };
    b.hidden = reduce;
    label();
    b.addEventListener("click", () => {
      paused = !paused;
      try {
        localStorage.setItem("karman-motion", paused ? "off" : "on");
      } catch (e) {}
      label();
      document.dispatchEvent(new CustomEvent("karman:motion", { detail: paused }));
    });
  }

  /* ---------- header: white words over film or black, black words over white ---------- */
  function header() {
    const hd = document.querySelector(".hd");
    if (!hd) return;
    let ticking = false;
    const surfaces = () => [
      ...document.querySelectorAll(".panel:not(.dark), .datecard, [data-light]"),
    ];
    const run = () => {
      ticking = false;
      const y = 36;
      const light = surfaces().some((p) => {
        const r = p.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      });
      const down = scrollY > 40;
      hd.classList.toggle("light", light);
      hd.classList.toggle("dim", down && !light);
      document.documentElement.classList.toggle("scrolled", down);
    };
    const ask = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(run);
      }
    };
    addEventListener("scroll", ask, { passive: true });
    addEventListener("resize", ask);
    run();
  }

  /* ---------- phone menu ---------- */
  function menu() {
    const sheet = document.getElementById("menu"),
      mbtn = document.querySelector(".hd .menu");
    if (!sheet || !mbtn) return;
    sheet.querySelectorAll(".btn").forEach((a) => {
      a.innerHTML = `<span class="lb">${esc(a.textContent)}</span><span class="go">${ARROW}</span>`;
    });
    const shut = () => {
      sheet.hidden = true;
      document.documentElement.classList.remove("lock");
      mbtn.setAttribute("aria-expanded", "false");
      mbtn.focus();
    };
    mbtn.addEventListener("click", () => {
      sheet.hidden = false;
      document.documentElement.classList.add("lock");
      mbtn.setAttribute("aria-expanded", "true");
      sheet.querySelector(".close").focus();
    });
    sheet.querySelector(".close").addEventListener("click", shut);
    sheet.addEventListener("click", (e) => e.target.closest("a") && shut());
    addEventListener("keydown", (e) => e.key === "Escape" && !sheet.hidden && shut());
  }

  /* ---------- buttons answer the press at once; a 20 px orb only if the next page takes over 400 ms ---------- */
  function buttons() {
    addEventListener("touchstart", () => {}, { passive: true }); // lets :active show on iOS
    document.addEventListener("click", (e) => {
      const a = e.target.closest(".btn");
      if (!a || !a.href || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const go = a.querySelector(".go");
      setTimeout(() => {
        if (!document.body.contains(a) || !window.karmanOrb || !go) return;
        a.setAttribute("aria-busy", "true");
        const c = document.createElement("canvas");
        go.replaceChildren(c);
        a._stop = window.karmanOrb(c, {
          state: "working",
          size: 20,
          dark: true,
          tint: { r: 235, g: 162, b: 31 },
        });
      }, 400);
    });
    addEventListener("pageshow", () =>
      document.querySelectorAll('.btn[aria-busy="true"]').forEach((a) => {
        a._stop?.();
        a.removeAttribute("aria-busy");
        a.querySelector(".go").innerHTML = ARROW;
      })
    );
  }

  /* ---------- one reveal everywhere: rise a little and fade in, once ---------- */
  function reveal() {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));
    if (Q.has("rec")) document.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
    requestAnimationFrame(() => document.documentElement.classList.add("ready"));
  }

  function init() {
    fill();
    motionButton();
    header();
    menu();
    buttons();
    reveal();
    window.__max = () => document.documentElement.scrollHeight - innerHeight;
    window.__go = async (y) => {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    };
  }

  window.KARMAN = {
    ROUTES,
    Q,
    reduce,
    site,
    M,
    esc,
    list,
    ARROW,
    btn,
    phone,
    init,
    get paused() {
      return paused;
    },
  };
})();
