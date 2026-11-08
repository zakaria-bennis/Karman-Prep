// The home page of direction A "Ascent": one calm climb from a real question to orbit.
// Sections, top to bottom: the first screen (21st.dev 38090 "Hero Section", ported: statement, lede, one
// action, the media figure is the real quiz engine), the ground window, Your Daily 10, the tutors, the
// calendar and tools, the weekly update, the guarantee, the campus trio (21st.dev 29767 "Features With
// Panel", ported: an index of names with one view that swaps the clip), the close (21st.dev 18475 "Call to
// Action", ported: title, text, one button, here as the orbit window).
import { init, M, esc, list, pairs, btn, tlink, I, R, reduce, motionOff, themeNow } from "./site.js";

const F = "../../decision/film/"; // the existing film and photos, referenced in place, copied nowhere
const E = "../engine/";            // the real quiz engine renders and fragments
const main = document.getElementById("main");

const photo = (file, alt, cls, w = 1400, h = 1750) =>
  `<figure class="cut ${cls}" data-rise style="--d:60ms"><img src="${F}photos/${file}.webp" srcset="${F}photos/${file}-800.webp 800w, ${F}photos/${file}.webp ${w}w" sizes="(max-width: 900px) 100vw, 46vw" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async"></figure>`;
const head = (n, id) => `<div class="stage-head"><h2 id="${id}" data-rise>${esc(M(n).headline)}</h2></div>`;
const bullets = (xs) => `<ul>${list(xs).map((x) => `<li>${I.bullet}<span>${esc(x)}</span></li>`).join("")}</ul>`;

/* ---- 1. the first screen ---- */
const O = M(1);
const C0 = M(0);
main.innerHTML = `
<section class="panel hero" aria-labelledby="h1">
  <div class="wrap grid split"><div class="words">
    <h1 id="h1" data-rise>${esc(O.headline)}</h1>
    <p class="lede" data-rise style="--d:60ms">${esc(O.text)}</p>
    <div class="act" data-rise style="--d:120ms">${btn(O.button, R.test)}<p class="note">${esc(O["button note"])}</p></div>
  </div>
  <div class="hero-field" data-rise style="--d:60ms">
    <p class="qlabel">${esc(O["question label"])}</p>
    <div class="k-engine" id="live" data-ui><i class="k-sk" aria-hidden="true"></i></div>
    <p class="verdict" id="verdict" aria-live="polite" data-state="wait">${esc(O["answer wait"])}</p>
  </div></div>
</section>
<section class="window ground" aria-labelledby="h0">
  <div class="cap"><div class="inner"><h2 id="h0" data-rise>${esc(C0.headline)}</h2><p class="lede" data-rise style="--d:60ms">${esc(C0.text)}</p></div></div>
</section>`;

/* ---- 4. Your Daily 10: the engine's own phone screen at its own size, no frame drawn over it ---- */
const D = M(4);
main.insertAdjacentHTML("beforeend", `
<section class="panel" aria-labelledby="h4"><div class="wrap grid split even">
  <div class="rail">${head(4, "h4")}<p class="lede" data-rise style="--d:60ms">${esc(D.text)}</p></div>
  <div class="bleed" data-ui data-rise style="--d:120ms"><figure class="shot phone-shot"><img id="dailyshot" src="${E}renders/conv-2-phone-light-question.webp" alt="${esc(D["screen label"])}" width="880" height="1912" loading="lazy" decoding="async"></figure></div>
</div></section>`);

/* ---- 2. the tutors: the deep panel, the photograph cut by the rise ---- */
const T = M(2);
main.insertAdjacentHTML("beforeend", `
<section class="panel" aria-labelledby="h2"><div class="deep">
  <div class="rail">${head(2, "h2")}<p class="lede" data-rise style="--d:60ms">${esc(T.text)}</p>
    ${photo("p-teacher", T["photo alt"], "")}</div>
  <div class="right blocks">
    <div data-rise><h3>${esc(T["feature title"])}</h3><p>${esc(T["feature text"])}</p></div>
    <div data-rise style="--d:60ms"><h3>${esc(T["card title"])}</h3><p>${esc(T["card text"])}</p></div>
    <div data-rise style="--d:120ms">${tlink(T.link, R.test)}</div>
  </div>
</div></section>`);

/* ---- 3. the calendar and tools: a menu, the mark as the bullet, no calendar drawn ---- */
const L = M(3);
main.insertAdjacentHTML("beforeend", `
<section class="panel" aria-labelledby="h3"><div class="wrap grid split wide">
  <div class="rail">${head(3, "h3")}<p class="lede" data-rise style="--d:60ms">${esc(L.text)}</p></div>
  <ul class="menu-list" data-rise style="--d:60ms">${pairs(L.tools).map(([n, t]) => {
    const i = t.lastIndexOf(". ");
    const body = i > 0 ? `${esc(t.slice(0, i + 1))} <span class="inplan">${esc(t.slice(i + 2))}</span>` : esc(t);
    return `<li>${I.bullet}<div><b>${esc(n)}</b><span>${body}</span></div></li>`;
  }).join("")}</ul>
  ${photo("p-test", L["photo alt"], "tools-photo")}
</div></section>`);

/* ---- 5. the weekly update: the four things it holds ---- */
const U = M(5);
main.insertAdjacentHTML("beforeend", `
<section class="panel" aria-labelledby="h5"><div class="wrap grid split">
  <div class="rail">${head(5, "h5")}<p class="lede" data-rise style="--d:60ms">${esc(U.text)}</p>
    <ul class="items" data-rise style="--d:120ms">${list(U.items).map((x) => `<li>${I.bullet}<span>${esc(x)}</span></li>`).join("")}</ul></div>
  ${photo("p-guarantee", U["photo alt"], "update-photo")}
</div></section>`);

/* ---- 8. the guarantee: the summit rules, in full, as plain headed text ---- */
const G = M(8);
main.insertAdjacentHTML("beforeend", `
<section class="panel" aria-labelledby="h8"><div class="wrap">
  <div class="rail">${head(8, "h8")}<p class="lede" data-rise style="--d:60ms">${esc(G.text)}</p></div>
  <div class="guar" data-rise style="--d:120ms">
    <div><p class="promise">${esc(G.promise)}</p><p class="promise-note small">${esc(G["promise note"])}</p>
      <dl class="outs">${pairs(G.outcomes).map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl></div>
    <div class="lists">
      <div><h3>${esc(G["we do title"])}</h3>${bullets(G["we do"])}</div>
      <div><h3>${esc(G["you do title"])}</h3>${bullets(G["you do"])}</div>
    </div>
    <div class="covers"><p>${esc(G.covers)}</p>${tlink(G.link, R.guarantee)}</div>
  </div>
</div></section>`);

/* ---- 9. the campus trio: the view from the top (rule 47; never removed). Clip ids from assets/manifest.json,
        mapped by the student's name, never by position: c8a Mateo (Harvard), c8b Priya (Stanford), c8c Ava
        (UC Berkeley). The landscape clip and its still (c8x.mp4, c8x.jpg) fill the 16:9 view with no crop. ---- */
const K = M(9);
const CLIP = { mateo: "c8a", priya: "c8b", ava: "c8c" };
const CLIP_SIZE = { c8a: [1440, 808], c8b: [1440, 808], c8c: [1280, 720] };
const CLIPS = pairs(K.captions).map(([name, cap]) => ({ name, cap, id: CLIP[name.toLowerCase()] })).filter((c) => c.id);
main.insertAdjacentHTML("beforeend", `
<section class="panel" aria-labelledby="h9"><div class="wrap">
  <div class="campus">
    <div>${head(9, "h9")}
      <ul class="names" data-rise style="--d:60ms">${CLIPS.map((c, i) => `<li><button type="button" aria-pressed="${i === 0}" data-clip="${i}">${esc(c.name)}<span>${esc(c.cap)}</span></button></li>`).join("")}</ul>
      <p class="line" data-rise style="--d:120ms">${esc(K.line)}</p></div>
    <div class="view" data-rise style="--d:60ms">${CLIPS.map((c, i) => `<figure class="clip ${i === 0 ? "on" : ""}" data-clip="${i}" data-id="${c.id}"><div class="frame"><img src="${F}${c.id}.jpg" alt="${esc(c.name)}, ${esc(c.cap)}" width="${CLIP_SIZE[c.id][0]}" height="${CLIP_SIZE[c.id][1]}" loading="lazy" decoding="async"><video muted playsinline loop preload="none" poster="${F}${c.id}.jpg" data-src="${F}${c.id}.mp4" aria-hidden="true"></video></div><figcaption>${esc(c.name)}, ${esc(c.cap)}</figcaption></figure>`).join("")}</div>
  </div>
</div></section>`);

/* ---- 11. the close: orbit ---- */
const Z = M(11);
main.insertAdjacentHTML("beforeend", `
<section class="window close" aria-labelledby="h11" id="close">
  <div class="cap"><div class="inner">
    <div class="words"><h2 id="h11" data-rise>${esc(Z.headline)}</h2><p class="lede" data-rise style="--d:60ms">${esc(Z.text)}</p>
      <div data-rise style="--d:120ms">${btn(Z.button, R.test)}</div><p class="honest" data-rise style="--d:120ms">${esc(Z["honest note"])}</p></div>
    <ul class="facts" data-rise style="--d:120ms">${pairs(Z.facts).map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join("")}</ul>
  </div></div>
</section>`);

/* ---- the film: fixed behind the page, poster first, the day after first paint, orbit near the close,
        never driven by the scroll, nothing under reduced motion, the footer's control remembered ---- */
const stage = document.querySelector(".stage");
const portrait = matchMedia("(max-width: 760px) and (orientation: portrait)").matches;
const sfx = portrait ? "-p" : "";
let day, orbit, started = false;
function film() {
  if (reduce || motionOff() || started) return;
  started = true;
  day = document.createElement("video"); day.muted = true; day.playsInline = true; day.loop = true; day.preload = "auto";
  day.className = "day"; day.setAttribute("aria-hidden", "true"); day.poster = `${F}day${sfx}.jpg`;
  stage.appendChild(day);
  const wait = setTimeout(() => stage.classList.add("waiting"), 400);
  day.addEventListener("playing", () => { clearTimeout(wait); stage.classList.remove("waiting"); day.classList.add("on"); document.querySelector(".page").classList.add("filming"); }, { once: true });
  day.src = `${F}day${sfx}.mp4`;
  day.play().catch(() => { clearTimeout(wait); stage.classList.remove("waiting"); });
  orbit = document.createElement("video"); orbit.muted = true; orbit.playsInline = true; orbit.loop = true; orbit.preload = "none";
  orbit.className = "edge"; orbit.setAttribute("aria-hidden", "true"); orbit.poster = `${F}c9${sfx}.jpg`;
  stage.appendChild(orbit);
  const io = new IntersectionObserver((es) => {
    const near = es.some((e) => e.isIntersecting);
    if (near && !orbit.src) { orbit.src = `${F}c9${sfx}.mp4`; }
    if (near) { orbit.play().then(() => { orbit.classList.add("on"); day.classList.remove("on"); }).catch(() => {}); }
    else if (orbit.src) { orbit.classList.remove("on"); day.classList.add("on"); }
  }, { rootMargin: "60% 0px 0px 0px" });
  io.observe(document.getElementById("close"));
}
function stopFilm() {
  started = false;
  [day, orbit].forEach((v) => { if (v) { v.pause(); v.remove(); } });
  stage.classList.remove("waiting");
  document.querySelector(".page").classList.remove("filming");
  document.querySelectorAll(".campus video").forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
}
document.addEventListener("karman-motion", (e) => (e.detail ? stopFilm() : (film(), campusPlay())));
if (!reduce && !motionOff()) addEventListener("load", () => requestAnimationFrame(() => requestAnimationFrame(film)));

/* ---- the campus clips: the index with preview; the chosen name's clip plays, the others hold their still ---- */
const view = document.querySelector(".campus .view");
function show(i) {
  document.querySelectorAll(".campus .names button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.clip === i)));
  view.querySelectorAll(".clip").forEach((c) => c.classList.toggle("on", +c.dataset.clip === i));
  campusPlay();
}
function campusPlay() {
  if (reduce || motionOff()) return;
  view.querySelectorAll(".clip").forEach((c) => {
    const v = c.querySelector("video");
    if (c.classList.contains("on")) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
  });
}
document.querySelectorAll(".campus .names button").forEach((b) => {
  b.addEventListener("click", () => show(+b.dataset.clip));
  b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") show(+b.dataset.clip); });
});
new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) campusPlay(); else view.querySelectorAll("video").forEach((v) => v.pause()); }), { rootMargin: "40% 0px" }).observe(view);

/* ---- the engine's phone capture follows the theme ---- */
const shot = document.getElementById("dailyshot");
function setShot() { shot.src = `${E}renders/conv-2-phone-${themeNow() === "dark" ? "dark" : "light"}-question.webp`; }
setShot();
document.addEventListener("karman-theme", setShot);

/* ---- the live thing: the real engine fragment, answered by the parent. The engine's controls that do nothing
        here are hidden by ascent.css; what stays tappable is the four choices, and they grade with the engine's
        own state classes. The box takes the height of the question so choice D is never clipped. ---- */
const live = document.getElementById("live");
const verdict = document.getElementById("verdict");
const ANSWER = "C";
async function question() {
  const html = await (await fetch(`${E}fragments/alg-1.html`)).text();
  live.insertAdjacentHTML("beforeend", html.replace(/<!--[\s\S]*?-->/, ""));
  const root = live.querySelector(".karman-engine");
  const content = root.querySelector("[data-question-content]");
  const theme = () => { const d = themeNow() === "dark"; root.classList.toggle("dark", d); root.setAttribute("data-theme", d ? "observatory" : "ivory"); };
  theme();
  document.addEventListener("karman-theme", theme);
  const fit = () => {
    live.classList.toggle("narrow", live.clientWidth < 768);
    const cs = getComputedStyle(content);
    live.style.height = `${Math.ceil(content.firstElementChild.getBoundingClientRect().height + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) + content.offsetTop}px`;
  };
  fit(); addEventListener("resize", fit);
  if (document.fonts?.ready) document.fonts.ready.then(fit);
  live.classList.add("ready");
  const choices = [...root.querySelectorAll("button.rounded-xl")];
  const letter = (b) => b.querySelector("span")?.textContent.trim();
  const SEL = ["border-info/40", "bg-info/10"], OK = ["border-success/40", "bg-success/15"], NO = ["border-error/40", "bg-error/15"], REST = ["border-bronze", "bg-surface"];
  const reset = (b) => { b.classList.remove(...SEL, ...OK, ...NO); b.classList.add(...REST); };
  choices.forEach((b) => b.addEventListener("click", (e) => {
    if (e.target.closest("button") !== b) return;
    choices.forEach(reset);
    b.classList.remove(...REST); b.classList.add(...SEL);
    verdict.dataset.state = "chosen"; verdict.textContent = "";
    setTimeout(() => {
      const right = letter(b) === ANSWER;
      b.classList.remove(...SEL); b.classList.add(...(right ? OK : NO));
      if (!right) { const c = choices.find((x) => letter(x) === ANSWER); c.classList.remove(...REST); c.classList.add(...OK); }
      verdict.dataset.state = right ? "right" : "wrong";
      verdict.textContent = right ? O["answer right"] : O["answer wrong"];
    }, 320);
  }));
}
question().catch(() => { live.classList.add("ready"); });

init({ page: "home", withFilm: true });
