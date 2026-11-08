/* The home page, direction C: the test itself. Sections in order, each from copy.js by its number: 1 the opening
   (the real quiz engine with a real Karman question the parent can answer), 4 Your Daily 10, what every student
   gets (2 the tutors, 5 parent updates, 3 full-length tests, 6 between sets, four flat sections), 9 the campus
   trio, 8 the guarantee, 7 the dates, 11 the close. */
import { shell, C, esc, list, pairs, lk, action, ROUTES, reduce } from "./shell.js";
import { startFilm } from "./film.js";

const FILM = "../../decision/film/", ENGINE = "../engine/";
const sec = (n) => { const k = Object.keys(C).find((x) => x.split(" ")[0] === String(n)); return k ? C[k] : {}; };
const mode = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

function build(main) {
  const o = sec(1), d = sec(4), st = C.Stack || {}, campus = sec(9), g = sec(8), dates = sec(7), end = sec(11);
  const features = [
    { f: sec(2), photo: "p-teacher" },
    { f: sec(5), photo: "p-guarantee" },
    { f: sec(3), photo: "p-test" },
    { f: sec(6), photo: "p-about" },
  ];
  /* the campus clips, by name (assets/manifest.json: c8a Mateo, c8b Priya, c8c Ava), never by position */
  const CLIP = { ava: "c8c", mateo: "c8a", priya: "c8b" };
  const tabIds = ["question", "wrong", "correct-explain"];
  const tabs = list(d.tabs), notes = list(d["tab notes"]);

  main.innerHTML = `
  <section class="window hero" id="opening" aria-labelledby="h1">
    <div class="wrap">
      <div class="words">
        <h1 id="h1">${esc(o.headline)}</h1>
        <p class="lede">${esc(o.text)}</p>
        ${action(o, ROUTES.test)}
        ${o.proof ? `<p class="proof">${esc(o.proof)}</p>` : ""}
      </div>
      <div class="live">
        <p class="try">${esc(o.try)}</p>
        <div class="panel-ui" data-ui id="engine-slot">
          <img src="${ENGINE}renders/alg-1-desktop-${mode()}-question.webp" width="1200" height="800" alt="The Karman quiz engine: Math, Linear equations. If 3x + 5 = 26, what is the value of x? A 5, B 6, C 7, D 8." fetchpriority="high">
        </div>
        <p class="result" id="result" role="status" hidden></p>
        <p class="after" id="after" hidden>${esc(o.after)}</p>
      </div>
    </div>
  </section>

  <section class="panel sec daily" id="daily" aria-labelledby="h-daily">
    <div class="wrap">
      <div class="words">
        <div>
          <h2 class="rv" id="h-daily">${esc(d.headline)}</h2>
          <p class="lede rv" style="--d:.08s; margin-top: 18px">${esc(d.text)}</p>
        </div>
        <div class="side">
          <div class="tabs rv" id="daily-tabs" style="--d:.1s">
            <div role="tablist" aria-label="${esc(d.headline)}"><span class="tab-ind" aria-hidden="true"></span>
              ${tabs.map((t, i) => `<button role="tab" type="button" data-tab="${tabIds[i]}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t)}</button>`).join("")}
            </div>
          </div>
          <p class="note rv" id="daily-note" style="--d:.14s" aria-live="polite">${esc(notes[0] || "")}</p>
          <div class="rv" style="--d:.18s">${lk(d.link, ROUTES.pricing)}</div>
        </div>
      </div>
      <figure class="pic rv" data-ui style="--d:.12s"><picture>
        <source id="daily-src-phone" media="(max-width: 760px)" srcset="${ENGINE}renders/adv-3-phone-${mode()}-question.webp">
        <img id="daily-pic" src="${ENGINE}renders/adv-3-desktop-${mode()}-question.webp" width="1200" height="800" alt="${esc(d.alt)}" loading="lazy">
      </picture></figure>
    </div>
  </section>

  <section class="panel sec features" id="shared" aria-labelledby="h-stack">
    <div class="wrap">
      <h2 class="rv" id="h-stack">${esc(st.headline)}</h2>
      ${features.map(({ f, photo }) => `<article class="feature rv">
        <div class="words"><h3>${esc(f.headline)}</h3><p class="lede">${esc(f.text)}</p>${f["card title"] ? `<p class="card"><b>${esc(f["card title"])}</b>${esc(f["card text"])}</p>` : ""}</div>
        <div class="pic"><img src="${FILM}photos/${photo}.webp" srcset="${FILM}photos/${photo}-800.webp 800w, ${FILM}photos/${photo}.webp 1400w" sizes="(max-width: 760px) 100vw, 420px" width="1400" height="1750" alt="${esc(f.alt)}" loading="lazy"></div>
      </article>`).join("")}
    </div>
  </section>

  <section class="panel night sec campus" id="campus" aria-labelledby="h-campus">
    <div class="wrap">
      <h2 class="rv" id="h-campus">${esc(campus.headline)}</h2>
      <div class="trio rv" style="--d:.1s">${pairs(campus.captions).map(([name, rest]) => {
        const id = CLIP[name.toLowerCase()];
        return `<figure><div class="fr"><video muted playsinline preload="none" data-src="${FILM}${id}-r.mp4" data-poster="${FILM}${id}-r${reduce ? "" : "0"}.jpg" aria-label="${esc(name)}, on campus"></video></div><figcaption><b>${esc(name)}</b>, ${esc(rest)}</figcaption></figure>`;
      }).join("")}</div>
      <p class="cline rv" style="--d:.2s">${esc(campus.line)}</p>
      <div class="record rv" style="--d:.25s"><p>${esc(campus.record)}</p>${lk(campus.link, ROUTES.private)}</div>
    </div>
  </section>

  <section class="panel night sec guarantee" id="guarantee" aria-labelledby="h-g">
    <div class="wrap">
      <h2 class="rv" id="h-g">${esc(g.headline)}</h2>
      <p class="lede rv" style="--d:.08s">${esc(g.text)}</p>
      <div class="slip rv" style="--d:.1s">
        <div class="col">
          <p class="promise">${esc(g.promise)}</p>
          <p class="promise-note">${esc(g["promise note"])}</p>
          <h3>${esc(g["outcomes title"])}</h3>
          <dl>${pairs(g.outcomes).map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl>
        </div>
        <div class="col">
          <h3 class="first">${esc(g["we do title"])}</h3>
          <ul class="rows">${list(g["we do"]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <h3>${esc(g["you do title"])}</h3>
          <ul class="rows">${list(g["you do"]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>
        <p class="final">${esc(g.covers)}</p>
      </div>
      <div class="g-link rv" style="--d:.12s">${lk(g.link, ROUTES.guarantee)}</div>
    </div>
  </section>

  <section class="panel sec dates" id="dates" aria-labelledby="h-dates">
    <div class="wrap">
      <h2 class="rv" id="h-dates">${esc(dates.headline)}</h2>
      <p class="lede rv" style="--d:.06s">${esc(dates.text)}</p>
      <div class="ticket rv" id="ticket" style="--d:.12s">
        <div class="main"><h3>${esc(dates.name)}</h3><ul class="rows">${list(dates.rows).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="stub"><p class="price">${esc(dates.price)}</p><p class="price-note">${esc(dates["price note"])}</p><p class="later">${esc(dates.later)}</p>${lk(dates.link, ROUTES.pricing)}</div>
      </div>
    </div>
  </section>

  <section class="window close" id="close" aria-labelledby="h-close">
    <div class="wrap">
      <div class="card rv">
        <h2 id="h-close">${esc(end.headline)}</h2>
        <p class="lede">${esc(end.text)}</p>
        <p class="honest">${esc(end["honest note"])}</p>
        ${action(end, ROUTES.test)}
        <p class="aside">${esc(end["line note"])}</p>
      </div>
    </div>
  </section>`;

  /* the showcase tabs: three real states of the same question, light and dark */
  const pic = main.querySelector("#daily-pic"), srcPhone = main.querySelector("#daily-src-phone"), note = main.querySelector("#daily-note");
  let state = "question";
  const paintPic = () => { pic.src = `${ENGINE}renders/adv-3-desktop-${mode()}-${state}.webp`; srcPhone.srcset = `${ENGINE}renders/adv-3-phone-${mode()}-${state}.webp`; };
  window.karmanTabs(main.querySelector("#daily-tabs"), (id, i) => { state = id; paintPic(); note.textContent = notes[i] || ""; });
  document.addEventListener("karman:theme", () => { paintPic(); const h = main.querySelector("#engine-slot > img"); if (h) h.src = `${ENGINE}renders/alg-1-desktop-${mode()}-question.webp`; });

  window.karmanTicket(main.querySelector("#ticket"));
  liveQuestion(main.querySelector("#engine-slot"), o);
}

/* ---- the live thing: the real engine, the real question, answerable ----
   The fragment is the engine's own DOM. hero-panel.css hides the controls that do nothing on this page; here the
   stem (an h2 inside the app) becomes a paragraph so the page keeps its heading order, and a tap on a choice
   grades it with the engine's own classes. The result and the after line are the page's, under the panel. */
function liveQuestion(slot, o) {
  fetch(`${ENGINE}fragments/alg-1.html`).then((r) => r.text()).then((html) => {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const eng = tpl.content.querySelector(".karman-engine");
    if (!eng) return;
    eng.querySelectorAll("[data-animate]").forEach((e) => e.removeAttribute("data-animate"));
    const stem = eng.querySelector("h2");
    if (stem) { const p = document.createElement("p"); p.className = stem.className; p.innerHTML = stem.innerHTML; stem.replaceWith(p); }
    slot.replaceChildren(eng);
    window.KARMAN_THEME.paint();
    const choices = [...eng.querySelectorAll(".group.relative > button")];
    const letter = (b) => b.querySelector("span")?.textContent.trim();
    const paint = (b, cls) => { b.classList.remove("border-bronze", "bg-surface"); b.classList.add(...cls); };
    const result = document.getElementById("result"), after = document.getElementById("after");
    let done = false;
    choices.forEach((b) => {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        if (done) return;
        done = true;
        const chosen = letter(b), right = chosen === "C";
        choices.forEach((c) => {
          const l = letter(c);
          c.setAttribute("aria-pressed", String(c === b));
          if (l === "C") { paint(c, ["border-success/40", "bg-success/15"]); c.insertAdjacentHTML("beforeend", `<span class="k-mark" aria-hidden="true">${CHECK}</span>`); }
          else if (l === chosen) paint(c, ["border-error/40", "bg-error/15"]);
        });
        result.textContent = `${right ? o.right : o.wrong} ${o.explanation}`;
        result.hidden = false;
        after.hidden = false;
      });
    });
  }).catch(() => { /* the render stays as the plain fallback */ });
}

shell("home", build, { film: true });
startFilm();
