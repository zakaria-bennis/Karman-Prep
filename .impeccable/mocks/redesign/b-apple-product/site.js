// Karman, direction "b-apple-product" (2026-11-01, fix round 2026-11-01). Shared by index.html and
// pricing.html: the copy parser, the header, the phone menu, the theme toggle (rule 33), the logo opening
// (../logo/intro.js), the film behind the page, the reveal on scroll (21st.dev 19240), the segmented
// control (21st.dev 23552), the switch (21st.dev 37311) and the live question from the real quiz engine.

import { wordmark, LOCKUP_CSS } from "../logo/marks.js";
import { startIntro, sessionSeen } from "../logo/intro.js";

// ---- the one-line switch for the mark: any id from ../logo/marks.js (ascent, threshold, answer, fullstop) ----
export const MARK = "ascent";

const FILM = "../../decision/film/";
const ENGINE = "../engine/";
const ROUTES = {
  home: "index.html",
  pricing: "pricing.html",
  test: FILM + "free-test.html",
  program: FILM + "program.html",
  private: FILM + "private.html",
  guarantee: FILM + "guarantee.html",
  faq: FILM + "faq.html",
  about: FILM + "about.html",
  signIn: "https://karmanprep.com/auth/sign-in",
  signUp: "https://karmanprep.com/auth/sign-up",
  terms: "https://karmanprep.com/terms",
  privacy: "https://karmanprep.com/privacy",
  cookies: "https://karmanprep.com/cookies",
};

// ---- copy.js: "## section" then "label: text" ----
const C = {};
{
  let sec = "";
  (window.KARMAN_B_COPY || "").split("\n").forEach((line) => {
    if (line.startsWith("## ")) { sec = line.slice(3).trim(); C[sec] = C[sec] || {}; return; }
    if (!sec || line.startsWith("#") || !line.includes(":")) return;
    const i = line.indexOf(":");
    C[sec][line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
}
export const S = (sec) => C[sec] || {};
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const list = (s) => String(s || "").split(" | ").map((x) => x.trim()).filter(Boolean);
export const pairs = (s) => list(s).map((x) => x.split(" = ").map((y) => y.trim()));
const site = S("Site");
export { site, ROUTES, FILM, ENGINE };

const html = document.documentElement;
html.classList.add("js");
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);

// ---- icons, drawn for Karman (one stroke, one weight) ----
export const ICON = {
  arrow: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h11M10.5 5l5 5-5 5"/></svg>',
  check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.2 2.6a9.6 9.6 0 1 0 7.2 13.6 8 8 0 0 1-7.2-13.6z"/></svg>',
};

// ---- theme (rule 33): set in <head> before paint; the button flips and remembers ----
export function themeButton() {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon-btn theme";
  const paint = () => {
    const dark = html.getAttribute("data-theme") === "dark";
    b.innerHTML = dark ? ICON.sun : ICON.moon;
    b.setAttribute("aria-label", dark ? site["light mode"] : site["dark mode"]);
    b.title = dark ? site["light mode"] : site["dark mode"];
  };
  b.addEventListener("click", () => {
    const t = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", t);
    try { localStorage.setItem("karman-theme", t); } catch {}
    document.dispatchEvent(new CustomEvent("karman:theme"));
    document.querySelectorAll(".theme").forEach((x) => x.dispatchEvent(new Event("paint")));
  });
  b.addEventListener("paint", paint);
  paint();
  return b;
}

// ---- header, menu, footer ----
export function chrome({ page }) {
  const style = document.createElement("style");
  style.textContent = LOCKUP_CSS;
  document.head.appendChild(style);

  // the header scrolls with the page (rule 34: nothing fixed over the text); the named sections, then Sign in
  const hd = document.createElement("header");
  hd.className = "hd";
  hd.innerHTML = `<div class="in">
    <span id="site-lockup">${wordmark(MARK, { size: 23, href: ROUTES.home })}</span>
    <span class="spacer"></span>
    <nav aria-label="Site">
      <a href="${ROUTES.program}">${esc(site["program link"])}</a>
      <a href="${ROUTES.private}">${esc(site["private link"])}</a>
      <a href="${ROUTES.pricing}" ${page === "pricing" ? 'aria-current="page"' : ""}>${esc(site["pricing link"])}</a>
      <a href="${ROUTES.signIn}">${esc(site["sign in link"])}</a>
    </nav>
    <button class="menu-btn" type="button" aria-haspopup="dialog" aria-controls="menu">${esc(site.menu)}</button>
  </div>`;
  hd.querySelector("nav").prepend(themeButton());
  document.querySelector('[data-page="site"]').prepend(hd);
  const skip = document.createElement("a");
  skip.className = "skip";
  skip.href = "#main";
  skip.textContent = "Skip to the page";
  document.body.prepend(skip);

  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.id = "menu";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", site.menu);
  sheet.hidden = true;
  sheet.innerHTML = `<div class="top">${wordmark(MARK, { size: 23, href: ROUTES.home })}<button class="close" type="button">${esc(site.close)}</button></div>
    <nav aria-label="Menu">
      <a href="${ROUTES.pricing}">${esc(site["pricing link"])}</a>
      <a href="${ROUTES.test}">${esc(site["free test link"])}</a>
      <a href="${ROUTES.program}">${esc(site["program link"])}</a>
      <a href="${ROUTES.private}">${esc(site["private link"])}</a>
      <a href="${ROUTES.guarantee}">${esc(site["guarantee link"])}</a>
      <a href="${ROUTES.about}">${esc(site["about link"])}</a>
      <a href="${ROUTES.signIn}">${esc(site["sign in link"])}</a>
    </nav>
    <div class="foot"></div>`;
  sheet.querySelector(".foot").append(themeButton());
  document.body.append(sheet);
  const mbtn = hd.querySelector(".menu-btn");
  const shut = () => { sheet.hidden = true; mbtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; mbtn.focus(); };
  mbtn.addEventListener("click", () => { sheet.hidden = false; mbtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; sheet.querySelector(".close").focus(); });
  sheet.querySelector(".close").addEventListener("click", shut);
  sheet.addEventListener("click", (e) => e.target.closest("a") && shut());
  addEventListener("keydown", (e) => {
    if (sheet.hidden) return;
    if (e.key === "Escape") shut();
    if (e.key === "Tab") {
      const f = [...sheet.querySelectorAll("a, button")];
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });

  footer();
  intro();
}

function footer() {
  const ft = document.querySelector(".ft");
  if (!ft) return;
  const link = (href, label) => `<a href="${href}">${esc(label)}</a>`;
  ft.innerHTML = `<div class="in">
    <div class="cols">
      <div class="controls">
        <div class="row">${wordmark(MARK, { size: 23, href: ROUTES.home })}</div>
        <div class="row"><span class="small">${esc(site["footer line"])}</span></div>
        <div class="row" id="theme-row"><span class="small theme-word"></span></div>
        <div class="row">
          <button class="sw" id="motion" type="button" role="switch" aria-checked="true" aria-label="${esc(site["motion label"])}"><span class="thumb"></span></button>
          <span class="small"><span>${esc(site["motion label"])}</span>: <span id="motion-word"></span></span>
        </div>
        <div class="row"><a class="mail" href="mailto:${esc(site.email)}">${esc(site.email)}</a></div>
      </div>
      <nav aria-label="${esc(site["footer programs"])}"><h3>${esc(site["footer programs"])}</h3>
        ${link(ROUTES.program, site["program link"])}<br>${link(ROUTES.private, site["private link"])}<br>${link(ROUTES.pricing, site["pricing link"])}<br>${link(ROUTES.test, site["free test link"])}</nav>
      <nav aria-label="${esc(site["footer company"])}"><h3>${esc(site["footer company"])}</h3>
        ${link(ROUTES.guarantee, site["guarantee link"])}<br>${link(ROUTES.faq, site["faq link"])}<br>${link(ROUTES.about, site["about link"])}<br>${link(ROUTES.signIn, site["sign in link"])}</nav>
      <nav aria-label="${esc(site["footer legal"])}"><h3>${esc(site["footer legal"])}</h3>
        ${link(ROUTES.terms, site["terms link"])}<br>${link(ROUTES.privacy, site["privacy link"])}<br>${link(ROUTES.cookies, site["cookies link"])}</nav>
    </div>
    <p class="credits">${esc(site.credits)}</p>
    <div class="meta"><a href="#top" class="totop">${esc(site["back to top"])}</a></div>
    <div class="word" aria-hidden="true">${esc(site.logo)}</div>
  </div>`;
  const row = ft.querySelector("#theme-row");
  row.prepend(themeButton());
  const word = row.querySelector(".theme-word");
  const paintWord = () => { word.textContent = html.getAttribute("data-theme") === "dark" ? site["light mode"] : site["dark mode"]; };
  document.addEventListener("karman:theme", paintWord);
  paintWord();

  // the motion control (rule 38: nothing visible over the film itself; the control lives here)
  const sw = ft.querySelector("#motion");
  const wordM = ft.querySelector("#motion-word");
  let paused = false;
  try { paused = localStorage.getItem("karman-motion") === "off"; } catch {}
  const paint = () => {
    sw.setAttribute("aria-checked", String(!paused));
    wordM.textContent = paused ? site["motion off"] : site["motion on"];
    html.toggleAttribute("data-paused", paused);
    document.dispatchEvent(new CustomEvent("karman:motion", { detail: { paused } }));
  };
  sw.addEventListener("click", () => {
    paused = !paused;
    try { localStorage.setItem("karman-motion", paused ? "off" : "on"); } catch {}
    paint();
  });
  window.KARMAN_PAUSED = () => paused;
  paint();
}

// ---- the logo opening: once per session, into the header's mark slot ----
function intro() {
  const page = document.querySelector('[data-page="site"]');
  const done = (r) => { html.removeAttribute("data-intro"); window.__introResult = r; return r; };
  if (params.get("intro") === "0" || sessionSeen()) {
    window.__siteIntro = Promise.resolve({ ran: false, reason: "seen this session" }).then(done);
    return;
  }
  window.__siteIntro = startIntro(MARK, "#site-lockup [data-mark]", { page, ground: "var(--ground)" }).then(done);
}

// ---- the film behind the page: the day plays while a window is on screen; the orbit clip at the close ----
export function stage() {
  const st = document.querySelector(".stage");
  if (!st) return;
  const sfx = matchMedia("(max-width: 760px) and (orientation: portrait)").matches ? "-p" : "";
  const day = st.querySelector(".day"), edge = st.querySelector(".edge");
  const seen = new Set();
  let ending = false, dayLoaded = false, edgeLoaded = false;
  const want = () => !reduce && !window.KARMAN_PAUSED?.() && !document.hidden && seen.size > 0;
  const cur = () => (ending ? edge : day);
  let swapT = 0;
  const sync = () => {
    if (reduce) return;
    const on = cur(), off = ending ? day : edge;
    const loaded = ending ? edgeLoaded : dayLoaded;
    if (want() && loaded) { if (on.paused) on.play().catch(() => {}); }
    else on.pause();
    clearTimeout(swapT);
    swapT = setTimeout(() => off.pause(), 1500);
  };
  // the day film downloads only on a page with a window onto it, and only after the first paint
  const dayWindows = [...document.querySelectorAll(".window:not(.close)")];
  const startDay = () => {
    if (reduce || dayLoaded || !dayWindows.length) return;
    requestAnimationFrame(() => requestAnimationFrame(() => { day.src = `${FILM}day${sfx}.mp4`; dayLoaded = true; sync(); }));
  };
  if (document.readyState === "complete") startDay();
  else addEventListener("load", startDay, { once: true });
  const wio = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))); sync(); });
  document.querySelectorAll(".window").forEach((w) => wio.observe(w));
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("karman:motion", sync);
  const close = document.querySelector(".close");
  if (close) {
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting === ending) return;
      ending = e.isIntersecting;
      if (ending && edge.ended) edge.currentTime = 0;
      st.classList.toggle("ending", ending);
      sync();
    }), { threshold: 0.3 }).observe(close);
    new IntersectionObserver((es, io) => es.forEach((e) => {
      if (!e.isIntersecting || edgeLoaded) return;
      edgeLoaded = true;
      edge.poster = `${FILM}c9${sfx}.jpg`;
      if (!reduce) { edge.preload = "auto"; edge.src = `${FILM}c9${sfx}.mp4`; }
      io.disconnect();
      sync();
    }), { rootMargin: "100% 0px" }).observe(close);
  }
}

// ---- campus clips: load when the section comes near, play once as each comes on screen ----
export function campus() {
  const vids = [...document.querySelectorAll(".campus video")];
  if (!vids.length) return;
  const load = (v) => { if (!reduce && !v.src && v.dataset.src) v.src = v.dataset.src; };
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    clearTimeout(v._t);
    if (e.isIntersecting && !reduce && !window.KARMAN_PAUSED?.()) {
      load(v);
      if (v.ended) v.currentTime = 0;
      v._t = setTimeout(() => v.play().catch(() => {}), vids.indexOf(v) * 260);
    } else v.pause();
  }), { threshold: 0.45 });
  vids.forEach((v) => cio.observe(v));
  new IntersectionObserver((es, io) => es.forEach((e) => { if (!e.isIntersecting) return; vids.forEach(load); io.disconnect(); }), { rootMargin: "80% 0px" }).observe(document.querySelector(".campus"));
  document.addEventListener("karman:motion", () => vids.forEach((v) => {
    const r = v.getBoundingClientRect();
    if (window.KARMAN_PAUSED?.()) v.pause();
    else if (r.top < innerHeight && r.bottom > 0 && !v.ended) v.play().catch(() => {});
  }));
}

// ---- reveal on scroll (21st.dev 19240 Reveal, ported): once, 15% in view, staggered by --i ----
export function reveal() {
  const els = [...document.querySelectorAll("[data-rise]")].filter((el) => !el.closest(".karman-engine"));
  els.forEach((el) => [...el.children].forEach((c, i) => c.style.setProperty("--i", i)));
  if (reduce) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15, rootMargin: "0px 0px 60% 0px" });
  els.forEach((el) => io.observe(el));
  // anything already above the fold on load shows at once
  requestAnimationFrame(() => els.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 0.9) el.classList.add("in"); }));
}

// ---- segmented control (21st.dev 23552, ported): role=radiogroup, arrow keys, a thumb that slides ----
export function segmented(el, onChange) {
  const btns = [...el.querySelectorAll("button")];
  const set = (i) => {
    el.dataset.index = i;
    btns.forEach((b, j) => { b.setAttribute("aria-checked", String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    onChange?.(btns[i].dataset.value, i);
  };
  btns.forEach((b, i) => {
    b.addEventListener("click", () => set(i));
    b.addEventListener("keydown", (e) => {
      const n = btns.length;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); set((i + 1) % n); btns[(i + 1) % n].focus(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); set((i - 1 + n) % n); btns[(i - 1 + n) % n].focus(); }
    });
  });
  set(+el.dataset.index || 0);
}

// ---- the live thing: a real question from the real engine, answered on the page ----
// The order keeps data-4 last: its KaTeX stem wraps to a line that starts with a period (an engine fact).
const QUESTIONS = { "alg-1": "C", "adv-3": "C", "geo-5": "B", "data-4": "B" };
const ORDER = Object.keys(QUESTIONS);
// the engine's own classes for a submitted choice (src/components/learn/quiz/ActiveQuizScreen.tsx)
const CLS = {
  fresh: ["border-bronze", "bg-surface", "cursor-pointer", "hover:border-info/40", "hover:bg-info/5"],
  freshBadge: ["bg-surface-raised", "text-ivory/80"],
  correct: ["border-success/40", "bg-success/15"],
  correctBadge: ["bg-success", "text-night"],
  wrong: ["border-error/40", "bg-error/15"],
  wrongBadge: ["bg-error", "text-ivory"],
  other: ["border-bronze", "opacity-50"],
  otherBadge: ["bg-surface-raised", "text-taupe"],
};
export async function liveQuestion(host, note) {
  const hero = S("Hero");
  let idx = 0;
  const themeAttrs = (root) => {
    const dark = html.getAttribute("data-theme") === "dark";
    root.setAttribute("data-theme", dark ? "observatory" : "ivory");
    root.classList.toggle("dark", dark);
  };
  const show = async (id) => {
    host.innerHTML = `<div class="loading" aria-busy="true"><div class="skeleton"><span></span><span></span><span></span></div></div>`;
    let text;
    try { text = await (await fetch(`${ENGINE}fragments/${id}.html`)).text(); } catch { host.innerHTML = ""; return; }
    const doc = new DOMParser().parseFromString(text, "text/html");
    const root = doc.querySelector(".karman-engine");
    if (!root) { host.innerHTML = ""; return; }
    themeAttrs(root);
    root.style.width = "";
    root.style.height = "";
    root.setAttribute("data-ui", ""); // the taste inspector's mark for an interface fragment that keeps its own lines
    host.replaceChildren(root);
    host.classList.add("shutter");
    requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add("open")));
    note.innerHTML = `<p>${esc(hero.try)}</p>`;
    // the engine's controls that do nothing here are hidden by site.css; only the four choices answer the page
    const choices = [...root.querySelectorAll("[data-transfer-item] > button")];
    let answered = false;
    choices.forEach((btn) => {
      btn.classList.add("choice");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (answered) return;
        answered = true;
        const letter = btn.querySelector("span")?.textContent.trim();
        const right = QUESTIONS[id];
        choices.forEach((b) => {
          const l = b.querySelector("span")?.textContent.trim();
          const badge = b.querySelector("span");
          const state = l === right ? "correct" : l === letter ? "wrong" : "other";
          b.classList.remove(...CLS.fresh);
          b.classList.add(...CLS[state]);
          b.disabled = true;
          badge.classList.remove(...CLS.freshBadge);
          badge.classList.add(...CLS[state + "Badge"]);
          if (state === "correct") {
            badge.innerHTML = ICON.check;
            badge.firstChild.style.width = "14px";
            badge.firstChild.style.height = "14px";
          }
        });
        note.innerHTML = `<p>${esc(letter === right ? hero.right : hero.wrong)}</p><a class="lk" href="#q" data-another>${esc(hero.another)}${ICON.arrow}</a>`;
        note.querySelector("[data-another]").addEventListener("click", (ev) => { ev.preventDefault(); idx = (idx + 1) % ORDER.length; host.classList.remove("open", "shutter"); show(ORDER[idx]); });
      });
    });
  };
  document.addEventListener("karman:theme", () => { const r = host.querySelector(".karman-engine"); if (r) themeAttrs(r); });
  await show(ORDER[idx]);
}

// ---- pictures that follow the theme and the width: <img data-light data-dark [data-light-phone data-dark-phone]> ----
// A desktop capture (1200 x 800 CSS px) gives way to the phone capture of the same question under 768px,
// where the desktop one could no longer show at 0.6x (rule 44).
export function themedPictures() {
  const narrow = matchMedia("(max-width: 767px)");
  const paint = () => {
    const dark = html.getAttribute("data-theme") === "dark";
    document.querySelectorAll("img[data-light][data-dark]").forEach((img) => {
      const phone = narrow.matches && img.dataset.lightPhone && img.dataset.darkPhone;
      const src = phone ? (dark ? img.dataset.darkPhone : img.dataset.lightPhone) : dark ? img.dataset.dark : img.dataset.light;
      const [w, h] = (phone ? img.dataset.sizePhone : img.dataset.size || "").split("x");
      if (w && h) { img.width = +w; img.height = +h; }
      if (img.getAttribute("src") !== src) img.src = src;
    });
  };
  document.addEventListener("karman:theme", paint);
  narrow.addEventListener("change", paint);
  paint();
}

// ---- hooks for the overlap scan and the checks ----
window.__max = () => document.documentElement.scrollHeight - innerHeight;
window.__go = (y) => { scrollTo(0, y); };
