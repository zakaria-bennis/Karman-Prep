/* Karman, direction "Scoreboard": every word comes from copy.js (window.KARMAN_COPY). */
(function () {
  "use strict";
  const doc = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- copy ---------- */
  const C = {};
  let sec = null;
  for (const raw of String(window.KARMAN_COPY || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      sec = line.slice(3).trim();
      C[sec] = {};
      continue;
    }
    const i = line.indexOf(":");
    if (sec && i > 0)
      C[sec][line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/(\d)-(?=[a-z])/g, "$1\u2011")
        .replace(/'/g, "\u2019");
  }
  const get = (key) => {
    const [s, ...l] = key.split(".");
    return (C[s] || {})[l.join(".")] || "";
  };
  const list = (key) =>
    get(key)
      .split(" | ")
      .map((x) => x.trim())
      .filter(Boolean);
  const pairs = (key) =>
    list(key).map((x) =>
      (x.startsWith("= ") ? ["", x.slice(2)] : x.split(" = ")).map((y) => y.trim())
    );
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  $$("[data-c]").forEach((n) => {
    const t = get(n.dataset.c);
    n.textContent = t;
    if (!t && !n.closest(".hero-title")) n.hidden = true;
  });
  $$("[data-c-alt]").forEach((n) => n.setAttribute("alt", get(n.dataset.cAlt)));
  $$("[data-c-label]").forEach((n) => n.setAttribute("aria-label", get(n.dataset.cLabel)));

  /* ---------- logo: drawn by hand on a 20-unit grid ----------
     The mark is the Karman line: a marigold line at cap height over a block that rises to the
     x-height. The wordmark is a geometric lowercase built from one 3.2-unit stroke. */
  function logo(extra = "") {
    const s = 'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="butt"';
    return `<svg viewBox="0 -0.5 124 21" role="img" aria-label="${get("site.logo")}" ${extra}>
      <defs><clipPath id="kclip${(logo.n = (logo.n || 0) + 1)}"><rect x="0" y="0" width="124" height="20"/></clipPath></defs>
      <rect class="mk-line" x="0" y="0" width="16" height="2.6" fill="var(--accent)"/>
      <rect class="mk-block" x="0" y="6" width="16" height="14" fill="currentColor"/>
      <g class="mk-word" clip-path="url(#kclip${logo.n})" ${s}>
        <path d="M25.6 0V20M26.4 13.2L38.6-1.8M30.6 9.4L40.4 21.8"/>
        <circle cx="49" cy="13" r="5.4"/><path d="M54.4 6V20"/>
        <path d="M60.8 6V20M60.8 13.8C60.8 9.6 63.2 7.6 67.8 7.6"/>
        <path d="M72 6V20M72 12.2A4.2 4.2 0 0 1 80.4 12.2V20M80.4 12.2A4.2 4.2 0 0 1 88.8 12.2V20"/>
        <circle cx="98" cy="13" r="5.4"/><path d="M103.4 6V20"/>
        <path d="M109.6 6V20M109.6 12.4A4.6 4.6 0 0 1 118.8 12.4V20"/>
      </g>
    </svg>`;
  }
  $("#headerLogo").innerHTML = logo();
  $("#sheetTitle").innerHTML = logo();
  $("#footMark").innerHTML = logo();

  /* ---------- navigation and the phone menu ---------- */
  const navItems = pairs("site.nav");
  for (const host of [$("#nav"), $("#sheetNav")]) {
    for (const [label, href] of navItems) {
      const a = el("a", null, label);
      a.href = href;
      host.appendChild(a);
    }
  }
  const sheet = $("#sheet"),
    menuBtn = $("#menuBtn");
  let lastFocus = null;
  function openSheet() {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    $("#sheetClose").focus();
  }
  function closeSheet(focusBack = true) {
    if (sheet.hidden) return;
    sheet.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (focusBack && lastFocus) lastFocus.focus();
  }
  menuBtn.addEventListener("click", openSheet);
  $("#sheetClose").addEventListener("click", () => closeSheet());
  $$("#sheetNav a").forEach((a) => a.addEventListener("click", () => closeSheet(false)));
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSheet();
      return;
    }
    if (e.key !== "Tab") return;
    const f = $$("a, button", sheet),
      first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  addEventListener("resize", () => {
    if (innerWidth >= 900) closeSheet(false);
  });

  /* ---------- colour mode ----------
     Ported from 21st.dev "Theme Switch" (id 37721, zweiundeins, MIT): segmented auto / light / dark
     radios that set an attribute on <html> and keep every switch on the page in sync. Rewritten as
     plain JS, remembered in localStorage instead of a cookie, with Karman's own drawn icons. */
  const ICON = {
    auto: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 3a7 7 0 0 0 0 14z" fill="currentColor"/></svg>',
    light:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    dark: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="currentColor"/></svg>',
  };
  const mql = matchMedia("(prefers-color-scheme: light)");
  const saved = () => {
    try {
      return localStorage.getItem("karman-theme");
    } catch (e) {
      return null;
    }
  };
  const choice = () => (saved() === "light" || saved() === "dark" ? saved() : "auto");
  const scheme = () => doc.getAttribute("data-scheme") || "dark";
  function applyTheme(t) {
    try {
      if (t === "auto") localStorage.removeItem("karman-theme");
      else localStorage.setItem("karman-theme", t);
    } catch (e) {}
    doc.setAttribute("data-scheme", t === "auto" ? (mql.matches ? "light" : "dark") : t);
    syncTheme();
  }
  const modeBtn = $("#modeBtn");
  const opts = list("site.theme options");
  const sw = $("#themeSwitch");
  sw.setAttribute("aria-label", get("site.theme label"));
  ["auto", "light", "dark"].forEach((v, i) => {
    const lab = el("label");
    lab.innerHTML = `<input type="radio" name="karman-theme" value="${v}">${ICON[v]}<span>${opts[i] || v}</span>`;
    lab.querySelector("input").addEventListener("change", () => applyTheme(v));
    sw.appendChild(lab);
  });
  modeBtn.addEventListener("click", () => applyTheme(scheme() === "dark" ? "light" : "dark"));
  mql.addEventListener("change", () => {
    if (choice() === "auto") applyTheme("auto");
  });
  function syncTheme() {
    const s = scheme();
    modeBtn.innerHTML = s === "dark" ? ICON.dark : ICON.light;
    modeBtn.setAttribute(
      "aria-label",
      `${get("site.theme label")}: ${s === "dark" ? opts[2] : opts[1]}`
    );
    modeBtn.setAttribute("aria-pressed", String(s === "dark"));
    $$("input", sw).forEach((r) => (r.checked = r.value === choice()));
    document.dispatchEvent(new CustomEvent("karman-scheme", { detail: s }));
  }
  syncTheme();

  /* ---------- hero facts ---------- */
  const facts = $("#heroFacts");
  for (const [k, v] of pairs("hero.facts")) {
    const d = el("div");
    d.append(el("dt", null, k), el("dd", null, v));
    facts.appendChild(d);
  }

  /* ---------- daily axis ---------- */
  const axis = $("#axis");
  pairs("daily.axis").forEach(([lab, n], i) => {
    const li = el("li");
    li.style.setProperty("--at", String(Number(n) / 21));
    li.style.setProperty("--i", String(i));
    li.append(el("span", "num", n), el("span", "lab", lab));
    axis.appendChild(li);
  });

  /* ---------- AnimateDigits ----------
     Ported from 21st.dev "Animate Digits" (id 20071, unlumen): each digit sits in its own cell and
     blur-slides in, one cell after another. Plain JS with the Web Animations API, critically damped
     (no bounce, apple-design), and skipped under reduced motion. */
  function digits(host, value) {
    host.textContent = "";
    host.setAttribute("aria-label", value);
    const cells = [...value].map((ch) => {
      const c = el("span", "digit", ch);
      c.setAttribute("aria-hidden", "true");
      host.appendChild(c);
      return c;
    });
    return () => {
      if (reduce) return;
      cells.forEach((c, i) =>
        c.animate(
          [
            { transform: "translateY(0.12em) scale(0.92)", filter: "blur(10px)", opacity: 0 },
            { transform: "none", filter: "blur(0)", opacity: 1 },
          ],
          {
            duration: 650,
            delay: 120 + i * 80,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "backwards",
          }
        )
      );
    };
  }

  /* ---------- results ---------- */
  const scores = $("#scores");
  const rolls = new Map();
  pairs("results.rows").forEach(([n, who]) => {
    const li = el("li", "score");
    const num = el("p", "n");
    num.style.margin = "0";
    rolls.set(li, digits(num, n));
    const [name, ...college] = who.split(",");
    const w = el("p", "who", name.trim());
    w.appendChild(el("span", null, college.length ? college.join(",").trim() : ""));
    li.append(num, w);
    scores.appendChild(li);
  });

  /* ---------- program facts ---------- */
  for (const [k, v] of pairs("program.facts")) {
    const d = el("div");
    d.append(el("dt", null, k), el("dd", null, v));
    $("#programFacts").appendChild(d);
  }

  /* ---------- guarantee table ---------- */
  const terms = $("#terms");
  const [h1, h2] = (get("guarantee.table head") || " = ").split(" = ");
  terms.innerHTML = `<thead><tr><th scope="col"></th><th scope="col"></th></tr></thead><tbody></tbody>`;
  const ths = $$("th", terms);
  ths[0].textContent = h1;
  ths[1].textContent = h2;
  for (const [a, b] of pairs("guarantee.rows")) {
    const tr = el("tr");
    tr.append(el("td", null, a), el("td", null, b));
    $("tbody", terms).appendChild(tr);
  }

  /* ---------- plans table, ported from 21st.dev "Feature Comparison Table" (id 21218,
     olewandowski1): a real table with a header row and tone-stepped rows, answers in words
     instead of ticks, no badges, no buttons in cells. Stacks into blocks on a phone. ---------- */
  const ladder = $("#ladder");
  const head = get("plans.head").split(" = ");
  ladder.innerHTML = "<thead><tr></tr></thead><tbody></tbody>";
  head.forEach((h) => {
    const th = el("th", null, h);
    th.scope = "col";
    $("thead tr", ladder).appendChild(th);
  });
  for (const [name, price, what] of pairs("plans.rows")) {
    const tr = el("tr");
    tr.append(el("td", "pn", name), el("td", "pp", price), el("td", "pw", what));
    $("tbody", ladder).appendChild(tr);
  }

  /* ---------- faq ---------- */
  for (const [q, a] of pairs("faq.items")) {
    const p = el("p");
    p.append(el("b", null, q + " "), document.createTextNode(a));
    $("#faqText").appendChild(p);
  }

  /* ---------- footer ---------- */
  const mail = get("footer.contact");
  const fm = $("#footMail");
  fm.textContent = mail;
  fm.href = `mailto:${mail}`;
  for (const [label, href] of pairs("footer.legal")) {
    const li = el("li");
    const a = el("a", null, label);
    a.href = href;
    li.appendChild(a);
    $("#footLinks").appendChild(li);
  }

  /* ---------- the countdown to the free test (10:00 a.m. ET on December 12, 2026) ---------- */
  const TEST = Date.UTC(2026, 11, 12, 15, 0, 0);
  const days = Math.ceil((TEST - Date.now()) / 86400000);
  let countRoll = null;
  if (days > 0) {
    $("#count").hidden = false;
    countRoll = digits($("#countDigits"), String(days));
  }

  /* ---------- the live question: a Karman original in the real quiz engine ---------- */
  const live = $("#live"),
    verdict = $("#verdict"),
    vText = $("#verdictText"),
    again = $("#again");
  const ANSWER = "C";
  async function question() {
    const res = await fetch("../../redesign/engine/fragments/adv-3.html");
    if (!res.ok) throw new Error("fragment " + res.status);
    const html = (await res.text()).replace(/<!--[\s\S]*?-->/, "");
    live.insertAdjacentHTML("beforeend", html);
    const root = $(".karman-engine", live);
    const content = $("[data-question-content]", root);
    const bar = $$("div", root).find(
      (d) => /\bbottom-0\b/.test(d.className) && /\bh-16\b/.test(d.className)
    );
    if (bar) bar.setAttribute("data-bottom-bar", "");
    content.style.bottom = "0";
    content.style.overflow = "visible";
    const theme = () => {
      const dark = scheme() === "dark";
      root.classList.toggle("dark", dark);
      root.setAttribute("data-theme", dark ? "observatory" : "ivory");
    };
    theme();
    document.addEventListener("karman-scheme", theme);
    const topBar = $$("div", root).find(
      (d) => /\btop-0\b/.test(d.className) && /z-\[72\]/.test(d.className)
    );
    const fit = () => {
      if (topBar) content.style.top = topBar.offsetHeight + "px";
      const cs = getComputedStyle(content);
      const h =
        content.firstElementChild.getBoundingClientRect().height +
        parseFloat(cs.paddingTop) +
        parseFloat(cs.paddingBottom) +
        content.offsetTop;
      live.style.height = Math.ceil(h) + "px";
    };
    fit();
    addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    live.classList.add("ready");

    const choices = $$("button.rounded-xl", root);
    const letter = (b) => (b.querySelector("span") || {}).textContent.trim();
    const badge = (b) => b.querySelector("span");
    const SEL = ["border-info/40", "bg-info/10"],
      OK = ["border-success/40", "bg-success/15"],
      NO = ["border-error/40", "bg-error/15"],
      REST = ["border-bronze", "bg-surface"];
    const BADGE = ["bg-surface-raised", "text-ivory/80"],
      BOK = ["bg-success", "text-night"],
      BNO = ["bg-error", "text-ivory"];
    let done = false;
    const reset = () => {
      choices.forEach((b) => {
        b.classList.remove(...SEL, ...OK, ...NO);
        b.classList.add(...REST);
        badge(b).classList.remove(...BOK, ...BNO);
        badge(b).classList.add(...BADGE);
        b.removeAttribute("aria-pressed");
      });
      done = false;
      verdict.dataset.state = "";
      vText.textContent = "";
      again.hidden = true;
    };
    choices.forEach((b) => {
      b.setAttribute(
        "aria-label",
        `Answer ${letter(b)}: ${b.textContent.replace(letter(b), "").trim()}`
      );
      b.addEventListener("click", () => {
        if (done) return;
        done = true;
        b.classList.remove(...REST);
        b.classList.add(...SEL);
        b.setAttribute("aria-pressed", "true");
        setTimeout(() => {
          const right = letter(b) === ANSWER;
          b.classList.remove(...SEL);
          b.classList.add(...(right ? OK : NO));
          badge(b).classList.remove(...BADGE);
          badge(b).classList.add(...(right ? BOK : BNO));
          if (!right) {
            const c = choices.find((x) => letter(x) === ANSWER);
            c.classList.remove(...REST);
            c.classList.add(...OK);
            badge(c).classList.remove(...BADGE);
            badge(c).classList.add(...BOK);
          }
          verdict.dataset.state = right ? "right" : "wrong";
          vText.textContent = get(right ? "practice.right" : "practice.wrong");
          again.hidden = false;
          fit();
        }, 260);
      });
    });
    again.addEventListener("click", () => {
      reset();
      choices[0].focus();
    });
  }
  question().catch(() => live.classList.add("ready"));

  /* ---------- entrances ---------- */
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              e.target.classList.add("in");
              const roll = rolls.get(e.target);
              if (roll) roll();
              if (e.target.id === "test" && countRoll) countRoll();
              io.unobserve(e.target);
            }
          },
          { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
        )
      : null;
  const watch = [
    ...$$("[data-reveal]"),
    ...$$(".score"),
    ...$$(".tally div"),
    $("#axis"),
    $("#test"),
  ];
  if (io) watch.forEach((n) => io.observe(n));
  else watch.forEach((n) => n.classList.add("in"));

  /* ---------- the dock: the free test button follows the reader ----------
     It slides up when the reader scrolls back up (looking for the next step) and slides away as
     soon as they scroll down to read, so it never sits on text being read (rule 34). It only
     shows while no other button is on screen, so there is one highlighted button at most
     (rule 35). ---------- */
  const dock = $("#dock");
  const inView = new Set();
  let lastY = scrollY,
    wantUp = false;
  function dockState() {
    const show = wantUp && inView.size === 0 && scrollY > innerHeight * 0.6;
    if (show === !dock.hidden) return;
    if (show) {
      dock.hidden = false;
      requestAnimationFrame(() => dock.classList.add("on"));
    } else {
      dock.classList.remove("on");
      dock.hidden = true;
    }
    document.body.classList.toggle("docked", show);
  }
  // ?dock=off is for reviews only
  if ("IntersectionObserver" in window && !/[?&]dock=off\b/.test(location.search)) {
    const dio = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.isIntersecting ? inView.add(e.target) : inView.delete(e.target);
        dockState();
      },
      { threshold: 0 }
    );
    $$("[data-cta]").forEach((c) => dio.observe(c));
    addEventListener(
      "scroll",
      () => {
        const y = scrollY;
        if (y < lastY - 6) wantUp = true;
        else if (y > lastY + 6) wantUp = false;
        else return;
        lastY = y;
        dockState();
      },
      { passive: true }
    );
  }

  function heroIn() {
    $(".hero").classList.add("hero-ready");
    requestAnimationFrame(() => $(".hero-title").classList.add("in"));
  }

  /* ---------- the opening: the mark rises, the line draws, the word wipes in, then it lands in
     the header. First visit only, under 1.3 s, any input skips it, a plain fade under reduced
     motion. ---------- */
  const opening = $("#opening");
  let seen = false;
  try {
    seen = localStorage.getItem("karman-opening") === "seen";
    localStorage.setItem("karman-opening", "seen");
  } catch (e) {
    seen = false;
  }
  if (/[?&]opening=off\b/.test(location.search)) seen = true; // for screenshots and reviews
  if (seen) {
    heroIn();
    return;
  }

  const lockup = $("#openingLockup");
  lockup.innerHTML = logo();
  opening.hidden = false;
  document.body.classList.add("opening-on");
  const t0 = performance.now();
  let finished = false;
  const timers = [];
  function cleanup() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) =>
      removeEventListener(t, skip, true)
    );
    opening.hidden = true;
    document.body.classList.remove("opening-on");
    window.__openingMs = Math.round(performance.now() - t0);
  }
  function skip() {
    if (finished) return;
    timers.forEach(clearTimeout);
    window.__openingSkipped = true;
    opening.classList.add("fade");
    opening.style.transitionDuration = "160ms";
    heroIn();
    timers.push(setTimeout(cleanup, 170));
  }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) =>
    addEventListener(t, skip, { capture: true, passive: true })
  );
  $(".opening-skip").addEventListener("click", skip);

  if (reduce) {
    timers.push(
      setTimeout(() => {
        opening.classList.add("fade");
        heroIn();
      }, 450)
    );
    timers.push(setTimeout(cleanup, 850));
    return;
  }
  requestAnimationFrame(() => opening.classList.add("go"));
  timers.push(
    setTimeout(() => {
      // land: move the lockup onto the header logo
      const from = lockup.getBoundingClientRect();
      const to = $("#headerLogo svg").getBoundingClientRect();
      const sx = to.width / from.width;
      lockup.style.transition = "transform 420ms cubic-bezier(0.16, 1, 0.3, 1)";
      lockup.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${sx})`;
      opening.classList.add("land");
      heroIn();
    }, 780)
  );
  timers.push(setTimeout(cleanup, 1240));
})();
