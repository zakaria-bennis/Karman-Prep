/* The shell shared by the home and pricing pages: the words (copy.js), the routes, the header and phone menu
   (21st.dev 28290, components/navbar.css), the footer (21st.dev 28291) with the theme toggle (21st.dev 554) and
   the film switch (21st.dev 37311), the lockup and the opening from ../logo/ (marks.js, intro.js), the reveal
   and the header that hides while reading down. A page module imports shell() and passes the function that
   builds its sections. The mark is chosen in one line in each page's <html data-mark="...">. */
import { wordmark, LOCKUP_CSS, ORDER } from "../logo/marks.js";
import { startIntro, sessionSeen } from "../logo/intro.js";

const Q = new URLSearchParams(location.search);
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const MARK = document.documentElement.dataset.mark || ORDER[0]; // the one-line switch: ascent, threshold, answer or fullstop

/* pages of this mock; the inner pages are the October 31 mock's (served by the same server), sign-in and the
   legal pages are the live site's */
export const ROUTES = {
  home: "index.html",
  pricing: "pricing.html",
  test: "/decision/film/free-test.html",
  program: "/decision/film/program.html",
  private: "/decision/film/private.html",
  guarantee: "/decision/film/guarantee.html",
  faq: "/decision/film/faq.html",
  about: "/decision/film/about.html",
  cookies: "https://karmanprep.com/cookies",
  signIn: "https://karmanprep.com/auth/sign-in",
  signUp: "https://karmanprep.com/auth/sign-up",
  terms: "https://karmanprep.com/terms",
  privacy: "https://karmanprep.com/privacy",
};

/* ---- words: "## section" then "label: text" ---- */
export const C = {};
{
  let sec = "";
  (window.KARMAN_COPY || "").split("\n").forEach((line) => {
    if (line.startsWith("## ")) { sec = line.slice(3).trim(); C[sec] = C[sec] || {}; return; }
    if (!sec || line.startsWith("#") || !line.includes(":")) return;
    const i = line.indexOf(":");
    C[sec][line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
}
export const S = C.Site || {};
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const list = (s) => (s ? String(s).split(" | ").map((x) => x.trim()).filter(Boolean) : []);
export const pairs = (s) => list(s).map((x) => x.split(" = ").map((y) => y.trim()));
export const ARROW = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12.5 6.5 18 12l-5.5 5.5"/></svg>';
export const btn = (label, href, cls = "") => `<a class="btn ${cls}" href="${href}">${esc(label)}</a>`;
export const lk = (label, href, cls = "") => `<a class="lk ${cls}" href="${href}">${esc(label)}${ARROW}</a>`;
export const action = (f, href, cls = "") =>
  f.button ? `<div class="act ${cls}">${btn(f.button, href)}${f["button note"] ? `<small>${esc(f["button note"])}</small>` : ""}</div>` : "";

/* ---- the shell ---- */
const MENU_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>';
const CLOSE_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const navLinks = (cur) =>
  [["program", "program link"], ["private", "private link"], ["pricing", "pricing link"]]
    .map(([r, l]) => `<a href="${ROUTES[r]}"${cur === r ? ' aria-current="page"' : ""}>${esc(S[l])}</a>`)
    .join("");

function header(cur) {
  return `<a class="skip" href="#main">${esc(S.skip)}</a>
  <header class="hd">
    <div class="wrap">
      <span id="site-lockup">${wordmark(MARK, { size: 23, href: ROUTES.home })}</span>
      <span class="spacer"></span>
      <nav aria-label="Pages">${navLinks(cur)}</nav>
      <a class="signin" href="${ROUTES.signIn}">${esc(S["sign in link"])}</a>
      <button class="theme" type="button" data-theme-toggle data-dark="${esc(S["dark mode"])}" data-light="${esc(S["light mode"])}"></button>
      <button class="menu" type="button" aria-expanded="false" aria-controls="menu">${MENU_ICON}${esc(S.menu)}</button>
    </div>
  </header>
  <div class="sheet" id="menu" role="dialog" aria-modal="true" aria-label="${esc(S.menu)}" hidden>
    <div class="top">${wordmark(MARK, { size: 23, href: ROUTES.home })}<button class="shut" type="button">${esc(S.close)}</button></div>
    <nav aria-label="Pages">${navLinks(cur)}<a href="${ROUTES.test}">${esc(S["free test link"])}</a><a href="${ROUTES.guarantee}">${esc(S["guarantee link"])}</a><a href="${ROUTES.about}">${esc(S["about link"])}</a><a href="${ROUTES.signIn}">${esc(S["sign in link"])}</a></nav>
    <div class="row"><button class="theme" type="button" data-theme-toggle data-words="yes" data-dark="${esc(S["dark mode"])}" data-light="${esc(S["light mode"])}"></button></div>
  </div>`;
}

function footer(hasFilm) {
  const col = (title, links) => `<div><h3>${esc(S[title])}</h3><ul>${links.map(([r, l]) => `<li><a href="${ROUTES[r]}">${esc(S[l])}</a></li>`).join("")}</ul></div>`;
  const film = hasFilm
    ? `<span class="sw"><button class="sw-control" id="film-switch" type="button" role="switch" aria-checked="true" aria-labelledby="film-switch-label"><span class="sw-thumb"></span></button><span id="film-switch-label">${esc(S["footer film"])}</span></span>`
    : "";
  return `<footer class="ft" id="footer">
    <div class="wrap">
      <div class="top">
        <div class="sign">${wordmark(MARK, { size: 34, href: ROUTES.home })}<p>${esc(S["footer line"])}</p><a data-mail href="mailto:${esc(S.email)}">${esc(S.email)}</a></div>
        ${col("footer programs", [["program", "program link"], ["private", "private link"], ["pricing", "pricing link"], ["test", "free test link"]])}
        ${col("footer company", [["guarantee", "guarantee link"], ["faq", "faq link"], ["about", "about link"], ["signIn", "sign in link"]])}
        ${col("footer legal", [["terms", "terms link"], ["privacy", "privacy link"], ["cookies", "cookies link"]])}
      </div>
      <div class="bottom">
        <div class="ctl"><button class="theme" type="button" data-theme-toggle data-words="yes" data-dark="${esc(S["dark mode"])}" data-light="${esc(S["light mode"])}"></button>${film}</div>
        <p class="credit">${esc(S.credits)}</p>
      </div>
    </div>
  </footer>`;
}

/* ---- the film control: remembered, every film on the page follows it ---- */
export let paused = false;
try { paused = localStorage.getItem("karman-motion") === "off"; } catch (e) {}
function filmControl() {
  const b = document.getElementById("film-switch");
  if (!b) return;
  if (reduce) { b.closest(".sw").hidden = true; return; } // with reduced motion no film loads
  const paint = () => b.setAttribute("aria-checked", String(!paused));
  b.addEventListener("click", () => {
    paused = !paused;
    try { localStorage.setItem("karman-motion", paused ? "off" : "on"); } catch (e) {}
    paint();
    document.dispatchEvent(new CustomEvent("karman:motion", { detail: paused }));
  });
  paint();
}
export const isPaused = () => paused;

/* ---- the phone menu: closes on Escape, a link or Close; focus stays inside ---- */
function menu() {
  const sheet = document.getElementById("menu"), mbtn = document.querySelector(".hd .menu");
  const shut = () => { sheet.hidden = true; mbtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; mbtn.focus(); };
  mbtn.addEventListener("click", () => {
    sheet.hidden = false; mbtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden";
    sheet.querySelector(".shut").focus();
  });
  sheet.querySelector(".shut").addEventListener("click", shut);
  sheet.addEventListener("click", (e) => e.target.closest("a") && shut());
  addEventListener("keydown", (e) => {
    if (sheet.hidden) return;
    if (e.key === "Escape") shut();
    if (e.key === "Tab") {
      const f = [...sheet.querySelectorAll("a, button")];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

/* ---- the header hides while reading down, returns on the way up or when the menu is open ---- */
function hideHeader() {
  const hd = document.querySelector(".hd");
  let last = scrollY;
  addEventListener("scroll", () => {
    const d = scrollY - last; last = scrollY;
    const away = d > 0 && scrollY > 40 && document.getElementById("menu").hidden;
    hd.classList.toggle("away", away);
  }, { passive: true });
}

/* ---- the reveal: the parts of a section rise once as it enters ---- */
function reveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".rv").forEach((el) => io.observe(el));
}

/* ---- the opening: once per session, the mark forms and flies into the header (../logo/intro.js) ---- */
function intro() {
  const page = document.querySelector('[data-page="site"]');
  const done = (r) => { document.documentElement.removeAttribute("data-intro"); window.__introResult = r; return r; };
  if (Q.has("rec") || sessionSeen()) { window.__siteIntro = Promise.resolve(done({ ran: false, reason: "seen this session" })); return; }
  window.__siteIntro = startIntro(MARK, "#site-lockup [data-mark]", { page }).then(done);
}

export function shell(cur, build, { film = false } = {}) {
  document.documentElement.classList.add("js");
  const style = document.createElement("style");
  style.textContent = LOCKUP_CSS;
  document.head.appendChild(style);
  const page = document.querySelector('[data-page="site"]');
  page.insertAdjacentHTML("afterbegin", header(cur));
  build(document.getElementById("main"));
  page.insertAdjacentHTML("beforeend", footer(film));
  window.KARMAN_THEME.paint();
  filmControl();
  menu();
  hideHeader();
  reveal();
  intro();
}
