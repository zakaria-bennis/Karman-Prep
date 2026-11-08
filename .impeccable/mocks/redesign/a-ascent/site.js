// Shared by the home and pricing pages of direction A "Ascent": the words (copy.js), the header
// (21st.dev 28290 "Navbar with Theme Toggle", ported to plain HTML: wordmark, links, sign in, a theme
// button and a phone sheet; it sits in the flow, never over the words, design rule 34), the theme (device first, dark when it states dark, the toggle remembered:
// design rule 33), the theme toggle icon (21st.dev 37503 "Theme Toggle" by Cojeev, the morphing sun and
// moon, redrawn by hand), the footer (21st.dev 29773 "Footer with Suite", ported: the mark built large,
// link columns, a last row), the logo intro (../logo/intro.js) and the one entrance motion.
import { mark, wordmark, ORDER } from "../logo/marks.js";

// The one-line switch: any id from ../logo/marks.js (ascent, threshold, answer, fullstop).
export const MARK = ORDER[0];

const Q = new URLSearchParams(location.search);
export const reduce = Q.has("rec") || matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- the words ---- */
const msgs = {};
const site = {};
let m = null;
(window.KARMAN_COPY || "").split("\n").forEach((line) => {
  const h2 = line.match(/^##\s+(\d+|Site)\s*(.*)$/);
  if (h2) { m = h2[1] === "Site" ? null : (msgs[+h2[1]] = { name: h2[2].trim(), f: {} }); return; }
  if (/^###/.test(line)) return;
  const kv = line.match(/^\s*([a-z0-9 ]+):\s*(.*)$/i);
  if (!kv) return;
  (m ? m.f : site)[kv[1].trim().toLowerCase()] = kv[2].trim();
});
export const M = (n) => (msgs[n] || { f: {} }).f;
export const S = site;
export const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const list = (s) => (s || "").split("|").map((x) => x.trim()).filter(Boolean);
export const pairs = (s) => list(s).map((x) => x.split("=").map((y) => y.trim()));

/* ---- routes: the other pages are the decision mock's inner pages, served by the same server ---- */
export const R = {
  home: "index.html", pricing: "pricing.html",
  test: "/decision/film/free-test.html", program: "/decision/film/program.html", private: "/decision/film/private.html",
  guarantee: "/decision/film/guarantee.html", faq: "/decision/film/faq.html", about: "/decision/film/about.html",
  signIn: "https://karmanprep.com/auth/sign-in", signUp: "https://karmanprep.com/auth/sign-up",
  terms: "https://karmanprep.com/terms", privacy: "https://karmanprep.com/privacy", cookies: "https://karmanprep.com/cookies",
};

/* ---- icons: drawn for Karman, one stroke, never a stock set ---- */
export const I = {
  arrow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // the mark at bullet size
  bullet: mark(MARK, { size: 14 }),
  // the sun and the moon in one glyph: the disc, and a crescent cut that appears in dark mode
  theme: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" class="k-theme"><circle class="sun" cx="12" cy="12" r="5" fill="currentColor"/><g class="rays" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/></g><path class="moon" d="M14.5 3.5a8.5 8.5 0 1 0 6 13.2 7 7 0 0 1-6-13.2z" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  chevron: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  yes: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  no: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>',
};

export const btn = (label, href, cls = "btn") => `<a class="${cls}" href="${href}"><span>${esc(label)}</span>${I.arrow}</a>`;
export const tlink = (label, href) => `<a class="tlink" href="${href}"><span>${esc(label)}</span>${I.arrow}</a>`;

/* ---- theme (rule 33): the device's setting first, the choice remembered ---- */
export function themeNow() { return document.documentElement.getAttribute("data-theme"); }
function setTheme(t, remember) {
  document.documentElement.setAttribute("data-theme", t);
  if (remember) try { localStorage.setItem("karman-theme", t); } catch {}
  document.querySelectorAll("[data-theme-btn]").forEach((b) => {
    b.setAttribute("aria-label", t === "dark" ? S["light mode"] : S["dark mode"]);
    b.title = t === "dark" ? S["light mode"] : S["dark mode"];
    const w = b.querySelector(".tw");
    if (w) w.textContent = t === "dark" ? S["light mode"] : S["dark mode"];
  });
  document.dispatchEvent(new CustomEvent("karman-theme", { detail: t }));
}
function toggleTheme() { setTheme(themeNow() === "dark" ? "light" : "dark", true); }

/* ---- the film control: remembered, read by the home page's stage ---- */
export function motionOff() { try { return localStorage.getItem("karman-motion") === "off"; } catch { return false; } }
function setMotion(off) {
  try { localStorage.setItem("karman-motion", off ? "off" : "on"); } catch {}
  document.querySelectorAll("[data-motion-btn]").forEach((b) => {
    b.innerHTML = `${off ? I.play : I.pause}<span>${esc(off ? S.play : S.pause)}</span>`;
    b.setAttribute("aria-pressed", off ? "true" : "false");
  });
  document.dispatchEvent(new CustomEvent("karman-motion", { detail: off }));
}

/* ---- header ---- */
const NAV = [
  ["program", "program link"], ["private", "private link"], ["pricing", "pricing link"],
];
function header(page) {
  const links = (cls) => NAV.map(([k, l]) => `<a href="${R[k]}" ${page === k ? 'aria-current="page"' : ""}>${esc(S[l])}</a>`).join("");
  return `<header class="hd"><div class="wrap">
    ${wordmark(MARK, { size: 23, href: R.home })}
    <nav class="links" aria-label="Site">${links()}<a href="${R.signIn}">${esc(S["sign in link"])}</a></nav>
    <div class="right">
      <button class="tb icon" type="button" data-theme-btn>${I.theme}</button>
      <button class="tb menu" type="button" aria-expanded="false" aria-controls="sheet">${I.menu}<span>${esc(S.menu)}</span></button>
    </div>
  </div></header>
  <div class="sheet" id="sheet" hidden role="dialog" aria-modal="true" aria-label="${esc(S.menu)}">
    <div class="top">${wordmark(MARK, { size: 23, href: R.home, tag: "span" })}<button class="tb" type="button" data-close>${I.close}<span>${esc(S.close)}</span></button></div>
    <nav aria-label="Site">
      ${NAV.map(([k, l]) => `<a href="${R[k]}">${esc(S[l])}</a>`).join("")}
      <a href="${R.test}">${esc(S["free test link"])}</a>
      <a href="${R.guarantee}">${esc(S["guarantee link"])}</a>
      <a href="${R.about}">${esc(S["about link"])}</a>
      <a href="${R.signIn}">${esc(S["sign in link"])}</a>
    </nav>
    <div class="foot"><button class="tb" type="button" data-theme-btn>${I.theme}<span class="tw"></span></button></div>
  </div>`;
}

/* ---- footer: the mark built large (21st.dev 29773, ported) ---- */
function footer(withFilm) {
  const col = (title, items) => `<div><h3>${esc(title)}</h3><ul>${items.map(([l, h]) => `<li><a href="${h}">${esc(l)}</a></li>`).join("")}</ul></div>`;
  return `<footer class="ft"><div class="wrap">
    ${mark(MARK, { size: "100%", cls: "bigmark", label: S.logo }).replace('viewBox="0 0 64 64"', 'viewBox="0 14 64 36" preserveAspectRatio="xMinYMid meet"')}
    <div class="cols">
      ${col(S["footer programs"], [[S["free test link"], R.test], [S["program link"], R.program], [S["private link"], R.private], [S["pricing link"], R.pricing]])}
      ${col(S["footer company"], [[S["guarantee link"], R.guarantee], [S["faq link"], R.faq], [S["about link"], R.about], [S.email, `mailto:${S.email}`]])}
      ${col(S["footer legal"], [[S["terms link"], R.terms], [S["privacy link"], R.privacy], [S["cookies link"], R.cookies]])}
      <div class="controls"><h3>${esc(S.logo)}</h3>
        <button class="tb" type="button" data-theme-btn>${I.theme}<span class="tw"></span></button>
        ${withFilm ? `<button class="tb" type="button" data-motion-btn></button>` : ""}
      </div>
    </div>
    <div class="last"><span>${esc(S["footer line"])}</span>${withFilm ? `<span>${esc(S.credits)}</span>` : ""}</div>
  </div></footer>`;
}

/* ---- the phone sheet: Escape, a link tap and Close all close it; focus stays inside ---- */
function sheet() {
  const sh = document.getElementById("sheet");
  const open = document.querySelector(".hd .menu");
  const close = () => { sh.hidden = true; open.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; open.focus(); };
  open.addEventListener("click", () => { sh.hidden = false; open.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; sh.querySelector("[data-close]").focus(); });
  sh.querySelector("[data-close]").addEventListener("click", close);
  sh.querySelectorAll("nav a").forEach((a) => a.addEventListener("click", close));
  sh.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const f = [...sh.querySelectorAll("a, button")];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ---- entrances: once, starting 150 px before a part reaches the fold, so nothing arrives grey ---- */
function rises() {
  const els = [...document.querySelectorAll("[data-rise]")];
  if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px 150px 0px", threshold: 0 });
  els.forEach((e) => io.observe(e));
  // the first screen arrives on the clock, not on the scroll
  requestAnimationFrame(() => document.querySelectorAll(".hero [data-rise], .p-hero [data-rise]").forEach((e) => e.classList.add("in")));
}

/* ---- the opening: the mark forms, holds, flies to the header; once per session ---- */
async function intro() {
  if (reduce && Q.has("rec")) { document.documentElement.removeAttribute("data-intro"); return { ran: false, reason: "rec" }; }
  const { startIntro, sessionSeen } = await import("../logo/intro.js");
  if (Q.has("intro")) try { sessionStorage.removeItem("karman-intro"); } catch {}
  if (sessionSeen() && !Q.has("intro")) { document.documentElement.removeAttribute("data-intro"); window.__intro = { ran: false, reason: "seen" }; return window.__intro; }
  document.documentElement.removeAttribute("data-intro");
  const r = await startIntro(MARK, `.hd [data-mark]`, { page: document.querySelector(".page"), ground: "var(--ground)", reducedMotion: reduce });
  window.__intro = r;
  return r;
}

export function init({ page, withFilm }) {
  document.documentElement.classList.add("js");
  document.body.insertAdjacentHTML("afterbegin", `<a class="skip" href="#main">${esc(S["skip link"])}</a>` + header(page));
  document.body.insertAdjacentHTML("beforeend", footer(withFilm));
  let t = null;
  try { t = localStorage.getItem("karman-theme"); } catch {}
  setTheme(t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), false);
  document.querySelectorAll("[data-theme-btn]").forEach((b) => b.addEventListener("click", toggleTheme));
  if (withFilm) { setMotion(motionOff()); document.querySelectorAll("[data-motion-btn]").forEach((b) => b.addEventListener("click", () => setMotion(!motionOff()))); }
  sheet();
  rises();
  if (reduce) document.documentElement.classList.add("still");
  // scroll hooks for the overlap scan
  window.__max = () => document.documentElement.scrollHeight - innerHeight;
  window.__go = async (y) => { scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 420)); };
  document.querySelectorAll("[data-rise]").length && Q.has("rec") && document.querySelectorAll("[data-rise]").forEach((e) => e.classList.add("in"));
  return intro();
}
