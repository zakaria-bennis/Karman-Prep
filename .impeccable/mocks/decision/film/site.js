/* Shared by every page of the mock (home, pricing, students map): reads copy.js, fills the header, menu and
   footer, the small pause button, the header's colour over white or dark surfaces, the button press orb and
   the one reveal. A page script builds its own sections, then calls KARMAN.init(). */
(function () {
  // pages of this mock; sign-in and the legal pages are pages of the live site (karmanprep.com)
  const ROUTES = {
    pricing: "pricing.html",
    students: "map.html",
    home: "index.html",
    test: "free-test.html",
    program: "program.html",
    private: "private.html",
    guarantee: "guarantee.html",
    faq: "faq.html",
    about: "about.html",
    cookies: "https://karmanprep.com/cookies",
    signIn: "https://karmanprep.com/auth/sign-in",
    terms: "https://karmanprep.com/terms",
    privacy: "https://karmanprep.com/privacy",
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

  /* the iPhone 17 Pro Max in Cosmic Orange, drawn in CSS (phone.css): front, glass, the Dynamic Island,
     and its aluminium edge with the buttons when it is turned */
  const phone = (screen, cls = "") =>
    `<div class="iphone ${cls}"><span class="rim" aria-hidden="true"></span><span class="side" aria-hidden="true"></span><div class="glass">${screen}<span class="island" aria-hidden="true"></span></div></div>`;

  /* the guarantee, as one block both the home page and the pricing page use: the promise, what the family
     gets for each result, both sides' obligations and who it covers, all on the page, nothing in small print */
  /* A people photo (copy section 90 holds its alt text and caption). Until the file exists the figure
     marks itself missing and hides, and the section keeps its drawing instead. */
  function photo(key, cls = "") {
    const P = M(90),
      alt = P[`${key} alt`] || "",
      cap = P[`${key} caption`];
    return `<figure class="k-photo ${cls}" data-photo="${key}"><div class="fr"><img src="photos/p-${key}.webp" srcset="photos/p-${key}-800.webp 800w, photos/p-${key}.webp 1400w" sizes="(max-width: 900px) 100vw, 560px" alt="${esc(alt)}" width="1400" height="1750" loading="${/ph-hero/.test(cls) && !/only-wide/.test(cls) ? "eager" : "lazy"}" decoding="async" onerror="this.closest('figure').dataset.missing='1'" onload="this.closest('figure').dataset.ready='1'"></div>${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`;
  }

  function guarantee(g, headId) {
    const pairs = list(g.outcomes).map((x) => x.split(" = "));
    const side = (title, items, cls) =>
      items.length
        ? `<div class="side-list ${cls} rv"><h3>${esc(title)}</h3><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`
        : "";
    return `<div class="g-top">
        <div class="g-words">
          ${g.eyebrow ? `<p class="eyebrow rv">${esc(g.eyebrow)}</p>` : ""}
          ${g.headline ? `<h2 class="rv" id="${headId}">${esc(g.headline)}</h2>` : ""}
          ${g.text ? `<p class="lede rv">${esc(g.text)}</p>` : ""}
          ${g.promise ? `<p class="g-promise rv"${g.headline ? "" : ` id="${headId}"`}>${esc(g.promise)}</p>` : ""}
          ${g["promise note"] ? `<p class="g-note rv">${esc(g["promise note"])}</p>` : ""}
        </div>
        ${
          pairs.length
            ? `<dl class="outcomes rv">${pairs.map(([r, w]) => `<div><dt>${esc(r)}</dt><dd>${esc(w || "")}</dd></div>`).join("")}</dl>`
            : ""
        }
      </div>
      <div class="sides">
        ${side(g["we do title"], list(g["we do"]), "")}
        ${side(g["you do title"], list(g["you do"]), "you")}
      </div>
      <div class="g-foot rv">
        ${
          list(g.covers).length
            ? `<p class="covers">${list(g.covers)
                .map((x) => `<span>${esc(x)}</span>`)
                .join("")}</p>`
            : ""
        }
        ${g.claim ? `<p class="claim">${esc(g.claim)}</p>` : ""}
        ${g.link ? `<a class="lk" href="${ROUTES.guarantee}">${esc(g.link)}${ARROW}</a>` : ""}
      </div>`;
  }

  /* ---------- the shell: skip link, header, phone menu, pause button and footer, the same on every page ---------- */
  (function shell() {
    const b = document.body;
    if (document.querySelector(".hd")) return;
    const r = (k, t) => `<a data-route="${k}" data-t="${t}"></a>`;
    b.insertAdjacentHTML(
      "afterbegin",
      `<a class="skip" href="#main">Skip to content</a>
      <header class="hd">
        <a class="mark" data-route="home" data-t="logo"></a>
        <nav aria-label="Main">
          <a class="nl" data-route="program" data-t="program link"></a><a class="nl" data-route="private" data-t="private link"></a><a class="nl" data-route="pricing" data-t="pricing link"></a><a class="nl" data-route="signIn" data-t="sign in link"></a>
          <button class="theme" type="button"></button>
          <a class="cta" data-route="test" data-t="free test link"></a>
          <button class="menu" type="button" aria-expanded="false" aria-controls="menu" data-t="menu"></button>
        </nav>
      </header>
      <div class="sheet" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
        <div class="top"><span class="mark" data-t="logo"></span><button class="close" type="button" data-t="close"></button></div>
        <nav aria-label="Menu links">${r("program", "program link")}${r("private", "private link")}${r("pricing", "pricing link")}${r("guarantee", "guarantee link")}${r("students", "students link")}${r("about", "about link")}${r("faq", "faq link")}${r("signIn", "sign in link")}</nav>
        <button class="theme labeled" type="button"></button>
        <a class="btn" data-route="test" data-t="free test link"></a>
      </div>`
    );
    if (!document.getElementById("main")) {
      const m = document.createElement("main");
      m.id = "main";
      document.querySelector(".sheet").after(m);
    }
    const main = document.getElementById("main");
    if (document.querySelector(".stage"))
      main.insertAdjacentHTML("afterend", '<button class="motion" type="button"></button>');
    const col = (h, items) => `<div class="col"><p class="h" data-t="${h}"></p>${items}</div>`;
    (document.querySelector(".motion") || main).insertAdjacentHTML(
      "afterend",
      `<footer class="ft">
        <div class="cols">
          <span class="mark" data-t="logo"></span>
          <nav aria-label="Footer">
            ${col("footer programs", r("program", "program link") + r("private", "private link") + r("pricing", "pricing link") + r("test", "free test link"))}
            ${col("footer company", r("guarantee", "guarantee link") + r("students", "students link") + r("faq", "faq link") + r("about", "about link") + r("signIn", "sign in link"))}
            ${col("footer legal", r("terms", "terms link") + r("privacy", "privacy link") + r("cookies", "cookies link") + '<a data-t="email" data-mail></a>')}
          </nav>
        </div>
        <p class="credit" data-t="credits"></p>
      </footer>`
    );
  })();

  /* ---------- header, menu and footer words and links ---------- */
  function fill(root = document) {
    root.querySelectorAll("[data-t]").forEach((el) => {
      const v = site[el.dataset.t];
      if (v != null) el.textContent = v;
    });
    root.querySelectorAll("[data-route]").forEach((a) => (a.href = ROUTES[a.dataset.route]));
    root.querySelectorAll("[data-mail]").forEach((a) => (a.href = `mailto:${site.email || ""}`));
  }

  /* ---------- light and dark (design rule 33): a switch in the header and the phone menu, remembered ---------- */
  const SUN =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>';
  const MOON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z"/></svg>';
  function themeSwitch() {
    const root = document.documentElement;
    const btns = document.querySelectorAll(".theme");
    const paint = () => {
      const dark = root.dataset.theme === "dark";
      btns.forEach((b) => {
        const word = dark ? site["light mode"] || "Light mode" : site["dark mode"] || "Dark mode";
        b.innerHTML =
          (dark ? SUN : MOON) +
          (b.classList.contains("labeled") ? `<span>${esc(word)}</span>` : "");
        b.setAttribute("aria-label", word);
        b.title = word;
      });
    };
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        root.classList.add("theming"); // colours cross-fade once, then transitions go back to normal
        root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("karman-theme", root.dataset.theme);
        } catch (e) {}
        paint();
        setTimeout(() => root.classList.remove("theming"), 600);
        document.dispatchEvent(new CustomEvent("karman:theme"));
      })
    );
    paint();
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

  /* ---------- buttons answer the press at once; the orb (kit.js) only if the next page takes over 400 ms;
     any other link to a page starts the line, which itself stays hidden for the first 400 ms ---------- */
  function buttons() {
    addEventListener("touchstart", () => {}, { passive: true }); // lets :active show on iOS
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || !window.KIT || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const url = new URL(a.href, location.href);
      if (
        url.origin !== location.origin ||
        url.protocol === "mailto:" ||
        (url.pathname === location.pathname && url.hash)
      )
        return;
      if (a.classList.contains("btn")) KIT.busy(a, true);
      else KIT.line.start(700);
    });
    addEventListener("pageshow", () => {
      document.querySelectorAll('.btn[aria-busy="true"]').forEach((a) => KIT.busy(a, false));
      window.KIT?.line.done();
    });
  }

  /* ---------- phones: the dock. One button at the bottom, in thumb reach, only while no other main button is on
     screen (design rule 35). A page names its own action with KARMAN.dock(label, href); the default is the
     free practice test. ---------- */
  let dockWant = null;
  function dock() {
    if (!matchMedia("(max-width: 760px)").matches) return;
    const [label, href] = dockWant || [site["free test link"], ROUTES.test];
    const el = document.createElement("div");
    el.className = "dock";
    el.innerHTML = btn(label, href);
    document.body.append(el);
    const mine = el.querySelector(".btn");
    const onScreen = new Set();
    // it shows on the way back up (when the reader is looking for something), never while reading down,
    // so it never covers the line being read (design rule 34), and only while no other main button is on screen
    let lastY = scrollY,
      up = false;
    const sync = () => {
      const show = up && onScreen.size === 0 && scrollY > innerHeight * 0.6;
      el.classList.toggle("on", show);
      document.documentElement.classList.toggle("docked", show);
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      sync();
    });
    document
      .querySelectorAll(".btn")
      .forEach((b) => b !== mine && !b.closest(".sheet") && io.observe(b));
    addEventListener(
      "scroll",
      () => {
        const y = scrollY;
        if (Math.abs(y - lastY) > 6) {
          up = y < lastY;
          lastY = y;
          sync();
        }
      },
      { passive: true }
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
    themeSwitch();
    motionButton();
    header();
    menu();
    dock();
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
    guarantee,
    photo,
    init,
    dock: (label, href) => (dockWant = [label, href]),
    get paused() {
      return paused;
    },
  };
})();
